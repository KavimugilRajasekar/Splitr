import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  X, Plus, Calculator, Users, Receipt, ArrowRightLeft,
  RotateCcw, FileDown, FileUp, CheckCircle2, Menu, MessageSquare,
} from "lucide-react";

import { DebtGraph } from "@/components/DebtGraph";
import {
  calculateAll, buildEqualSplit, expenseToEdges,
  type Edge, type Expense, type ManualEdge, type Settlement,
} from "@/lib/settlement";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Splitr — Expense Settlement & Debt Tracking" },
      { name: "description", content: "Track shared expenses and compute optimized debt settlements with graph reductions." },
      { property: "og:title", content: "Splitr — Expense Settlement & Debt Tracking" },
      { property: "og:description", content: "Track shared expenses and compute optimized debt settlements." },
    ],
  }),
  component: Index,
});

const uid = () => Math.random().toString(36).slice(2, 9);
const NAME_RE = /^[A-Za-z0-9 _.-]{1,40}$/;

type SplitType = "equal" | "bill" | "custom";
type ExpenseMode = "simple" | "multi";

function Index() {
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualEdges, setManualEdges] = useState<ManualEdge[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // expense form
  const [mode, setMode] = useState<ExpenseMode>("simple");
  const [simplePayer, setSimplePayer] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [benef, setBenef] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});
  const [multiPayments, setMultiPayments] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  // manual IOU form
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeAmt, setEdgeAmt] = useState("");

  // settle form
  const [calculated, setCalculated] = useState(false);

  // mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // import ref
  const importRef = useRef<HTMLInputElement>(null);

  // ---- Android WebView bridge ----
  // Detect if running inside the Flutter WebView (JS channels are injected)
  const isAndroidWebView =
    typeof window !== "undefined" &&
    typeof (window as unknown as Record<string, unknown>).SplitrExport === "object";

  // Register the import callback so Flutter can send file content back
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__splitrImportCallback = (jsonStr: string) => {
      try {
        const data = JSON.parse(jsonStr);
        if (!Array.isArray(data.people)) throw new Error("Invalid format: missing people");
        setPeople(data.people ?? []);
        setExpenses(data.expenses ?? []);
        setManualEdges(data.manualEdges ?? []);
        setSettlements(data.settlements ?? []);
        setCalculated(false);
        toast.success("Imported successfully — ready to re-edit");
      } catch (err) {
        toast.error("Failed to import: " + (err instanceof Error ? err.message : "Invalid file"));
      }
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__splitrImportCallback;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- live computation ----
  const live = useMemo(
    () => calculateAll(people, expenses, manualEdges, settlements),
    [people, expenses, manualEdges, settlements],
  );

  // Separate snapshots — each expense's own debt graph (not cumulative)
  const snapshots = useMemo(() => {
    return expenses.map((e, i) => ({
      id: e.id,
      label: `Expense ${i + 1}`,
      note: e.note,
      total: Object.values(e.payers).reduce((s, v) => s + v, 0),
      payerStr: Object.entries(e.payers).map(([p, v]) => `${p}: ₹${v}`).join(", "),
      benefStr: Object.keys(e.shares).join(", "),
      edges: expenseToEdges(e),
    }));
  }, [expenses]);

  // ---- handlers ----
  const addPerson = () => {
    const n = newPerson.trim();
    if (!n) return toast.error("Enter a name");
    if (!NAME_RE.test(n)) return toast.error("Use 1–40 letters, digits, spaces, . _ -");
    if (people.includes(n)) return toast.error("Person already exists");
    setPeople([...people, n]);
    setNewPerson("");
  };

  const removePerson = (p: string) => {
    setPeople(people.filter(x => x !== p));
    setExpenses(expenses.filter(e => !(p in e.payers) && !(p in e.shares)));
    setManualEdges(manualEdges.filter(e => e.from !== p && e.to !== p));
    setSettlements(settlements.filter(e => e.from !== p && e.to !== p));
    toast.success(`Removed ${p} and associated edges`);
  };

  const toggleBenef = (p: string) => {
    setBenef(benef.includes(p) ? benef.filter(x => x !== p) : [...benef, p]);
  };

  const resetExpenseForm = () => {
    setSimplePayer(""); setTotalAmount(""); setBenef([]);
    setSplitType("equal"); setShareInputs({}); setMultiPayments({}); setNote("");
  };

  const addExpense = () => {
    if (benef.length === 0) return toast.error("Please select at least one beneficiary");

    let payers: Record<string, number> = {};
    if (mode === "simple") {
      if (!simplePayer) return toast.error("Select a payer");
      const amt = Math.round(Number(totalAmount));
      if (!Number.isFinite(amt) || amt <= 0) return toast.error("Amount must be a positive whole number");
      payers[simplePayer] = amt;
    } else {
      for (const [p, v] of Object.entries(multiPayments)) {
        const amt = Math.round(Number(v) || 0);
        if (amt < 0) return toast.error("No negative payments");
        if (amt > 0) payers[p] = amt;
      }
      if (Object.keys(payers).length === 0) return toast.error("Add at least one payer");
    }
    const totalPaid = Object.values(payers).reduce((s, v) => s + v, 0);

    let shares: Record<string, number> = {};
    if (splitType === "equal") {
      shares = buildEqualSplit(payers, benef);
    } else {
      for (const p of benef) {
        const v = Math.round(Number(shareInputs[p]) || 0);
        if (v < 0) return toast.error("No negative shares");
        shares[p] = v;
      }
      const totalShares = Object.values(shares).reduce((s, v) => s + v, 0);
      if (totalShares !== totalPaid) {
        return toast.error(`Sum of shares (₹${totalShares}) does not match total paid (₹${totalPaid})`);
      }
    }

    setExpenses([...expenses, {
      id: uid(), payers, shares, note: note || undefined, createdAt: Date.now(),
    }]);
    toast.success("Expense added");
    resetExpenseForm();
  };

  const updateExpenseNote = (id: string, value: string) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, note: value || undefined } : e));
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const addManualEdge = () => {
    if (!edgeFrom || !edgeTo) return toast.error("Select both people");
    if (edgeFrom === edgeTo) return toast.error("A person cannot owe money to themselves");
    const amt = Math.round(Number(edgeAmt));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Amount must be a positive whole number");
    setManualEdges([...manualEdges, { id: uid(), from: edgeFrom, to: edgeTo, amount: amt, createdAt: Date.now() }]);
    setEdgeAmt("");
    toast.success("IOU added");
  };

  const markPaid = (edge: Edge, amount: number) => {
    const amt = Math.round(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Invalid amount");
    if (amt > edge.amount) return toast.error(`Cannot exceed ₹${edge.amount}`);
    setSettlements([...settlements, {
      id: uid(), from: edge.from, to: edge.to, amount: amt, createdAt: Date.now(),
    }]);
    toast.success(`Marked ₹${amt} from ${edge.from} → ${edge.to} as paid`);
  };

  const resetAll = () => {
    if (!confirm("Reset all people, expenses and settlements?")) return;
    setPeople([]); setExpenses([]); setManualEdges([]); setSettlements([]);
    setCalculated(false);
    toast.success("Reset complete");
  };

  const exportJSON = () => {
    const data = { people, expenses, manualEdges, settlements, result: live };
    const jsonStr = JSON.stringify(data, null, 2);
    if (isAndroidWebView) {
      // Send to Flutter which saves it to Downloads
      (window as unknown as Record<string, { postMessage: (s: string) => void }>)
        .SplitrExport.postMessage(jsonStr);
    } else {
      download("settlement.json", "application/json", jsonStr);
    }
  };

  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data.people)) throw new Error("Invalid format: missing people");
        setPeople(data.people ?? []);
        setExpenses(data.expenses ?? []);
        setManualEdges(data.manualEdges ?? []);
        setSettlements(data.settlements ?? []);
        setCalculated(false);
        toast.success("Imported successfully — ready to re-edit");
      } catch (err) {
        toast.error("Failed to import: " + (err instanceof Error ? err.message : "Invalid JSON file"));
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    if (isAndroidWebView) {
      // Ask Flutter to open native file picker; result comes back via __splitrImportCallback
      (window as unknown as Record<string, { postMessage: (s: string) => void }>)
        .SplitrImport.postMessage("pick");
    } else {
      importRef.current?.click();
    }
  };

  const calculate = () => {
    if (people.length === 0) return toast.error("Add people first");
    setCalculated(true);
    toast.success(`Settlement: ${live.settled.length} transaction(s)`);
  };

  // ---- derived tables ----
  const liveBalanceRows = useMemo(() => people.map(p => {
    const paid = expenses.reduce((s, e) => s + (e.payers[p] ?? 0), 0);
    const share = expenses.reduce((s, e) => s + (e.shares[p] ?? 0), 0);
    return { person: p, paid, share, net: live.balances[p] ?? 0 };
  }), [people, expenses, live.balances]);

  const finalRows = useMemo(() => {
    const paysTo: Record<string, string[]> = {};
    const receivesFrom: Record<string, string[]> = {};
    for (const p of people) { paysTo[p] = []; receivesFrom[p] = []; }
    for (const e of live.settled) {
      paysTo[e.from].push(`${e.to}: ₹${e.amount}`);
      receivesFrom[e.to].push(`${e.from}: ₹${e.amount}`);
    }
    return people.map(p => ({
      person: p, net: live.balances[p] ?? 0,
      pays: paysTo[p], receives: receivesFrom[p],
    }));
  }, [people, live]);

  const leftPanel = (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" /> People</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Name"
              value={newPerson}
              maxLength={40}
              onChange={e => setNewPerson(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPerson()}
            />
            <Button onClick={addPerson} variant="secondary"><Plus className="size-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map(p => (
              <Badge key={p} variant="secondary" className="gap-1 py-1">
                {p}
                <button onClick={() => removePerson(p)} className="ml-1 rounded hover:text-destructive" aria-label={`Remove ${p}`}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {!people.length && <p className="text-sm text-muted-foreground">No people yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Receipt className="size-4" /> Add Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={mode} onValueChange={v => setMode(v as ExpenseMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="simple" className="flex-1">Simple Payer</TabsTrigger>
              <TabsTrigger value="multi" className="flex-1">Multiple Payers</TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Paid by</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={simplePayer} onChange={e => setSimplePayer(e.target.value)}>
                    <option value="">Select…</option>
                    {people.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Total amount (₹)</Label>
                  <Input type="number" min={1} value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="multi" className="mt-3 space-y-2">
              <Label>Payments per person</Label>
              <div className="space-y-1 rounded-md border border-input p-2">
                {people.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="w-24 text-sm">{p}</span>
                    <Input
                      type="number" min={0}
                      value={multiPayments[p] ?? ""}
                      onChange={e => setMultiPayments({ ...multiPayments, [p]: e.target.value })}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                ))}
                {!people.length && <span className="text-sm text-muted-foreground">Add people first.</span>}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-1">
            <Label>Beneficiaries</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
              {people.map(p => (
                <label key={p} className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={benef.includes(p)} onCheckedChange={() => toggleBenef(p)} />
                  {p}
                </label>
              ))}
              {!people.length && <span className="text-sm text-muted-foreground">Add people first.</span>}
            </div>
            {people.length > 0 && (
              <button
                onClick={() => setBenef(benef.length === people.length ? [] : [...people])}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {benef.length === people.length ? "Clear all" : "Select all"}
              </button>
            )}
          </div>

          <div className="space-y-1">
            <Label>Split type</Label>
            <RadioGroup value={splitType} onValueChange={v => setSplitType(v as SplitType)} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="equal" /> Equal</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="bill" /> By bill amounts</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="custom" /> Custom</label>
            </RadioGroup>
          </div>

          {splitType !== "equal" && benef.length > 0 && (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-dashed border-border p-3 sm:grid-cols-3">
              {benef.map(p => (
                <div key={p} className="space-y-1">
                  <Label className="text-xs">{p}</Label>
                  <Input type="number" min={0} value={shareInputs[p] ?? ""} onChange={e => setShareInputs({ ...shareInputs, [p]: e.target.value })} placeholder="0" className="h-8" />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs"><MessageSquare className="size-3" /> Comment</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} maxLength={120} placeholder="e.g. Dinner at Taj, Day 2 cab…" />
          </div>

          <Button onClick={addExpense} className="w-full gap-2" disabled={!people.length}><Plus className="size-4" /> Add expense</Button>
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" /> Expense Comments ({expenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenses.map((e, i) => {
              const total = Object.values(e.payers).reduce((s, v) => s + v, 0);
              const payerStr = Object.entries(e.payers).map(([p, v]) => `${p}: ₹${v}`).join(", ");
              return (
                <div key={e.id} className="space-y-1.5 rounded-md border border-border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-xs">
                      <span className="font-semibold">#{i + 1} · ₹{total}</span>
                      <span className="text-muted-foreground"> — {payerStr}</span>
                    </div>
                    <button onClick={() => removeExpense(e.id)} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Remove expense">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <Input
                    value={e.note ?? ""}
                    onChange={ev => updateExpenseNote(e.id, ev.target.value)}
                    maxLength={120}
                    placeholder="Add a comment…"
                    className="h-8 text-sm"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="size-4" /> Manual IOU / Loan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={edgeFrom} onChange={e => setEdgeFrom(e.target.value)}>
              <option value="">From…</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={edgeTo} onChange={e => setEdgeTo(e.target.value)}>
              <option value="">To…</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Input type="number" min={1} placeholder="₹" value={edgeAmt} onChange={e => setEdgeAmt(e.target.value)} />
          </div>
          <Button onClick={addManualEdge} variant="secondary" className="w-full gap-2" disabled={!people.length}><Plus className="size-4" /> Add IOU</Button>
          <p className="text-xs text-muted-foreground">An edge "A → B: ₹X" means A owes B ₹X.</p>
        </CardContent>
      </Card>
    </div>
  );


  return (
    <div className="flex h-screen flex-col bg-background">

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label="Open inputs">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-md overflow-y-auto p-4 sm:p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SheetHeader className="mb-4">
                  <SheetTitle>People & Expenses</SheetTitle>
                </SheetHeader>
                {leftPanel}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-5xl font-bold tracking-tight text-foreground">Splitr</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">Optimized expense settlement with graph reduction</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportJSON} variant="outline" size="sm" className="gap-2"><FileDown className="size-4" /> Export</Button>
            <Button onClick={() => triggerImport()} variant="outline" size="sm" className="gap-2">
              <FileUp className="size-4" /> Import
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) importJSON(file);
                e.target.value = "";
              }}
            />
            <Button onClick={resetAll} variant="outline" size="sm" className="gap-2"><RotateCcw className="size-4" /> Reset</Button>
            <Button onClick={calculate} size="sm" className="gap-2"><Calculator className="size-4" /> Calculate</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl min-h-0 flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[420px_1fr]">
        {/* LEFT: inputs — desktop only, mobile uses drawer */}
        <div className="hidden lg:block overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {leftPanel}
        </div>

        {/* RIGHT: visualization */}
        <div className="space-y-6 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debt Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="raw">
                <TabsList>
                  <TabsTrigger value="raw">Raw ({live.rawEdges.length})</TabsTrigger>
                  <TabsTrigger value="settled">Settled ({live.settled.length})</TabsTrigger>
                  <TabsTrigger value="history">History ({snapshots.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="raw" className="mt-3">
                  <DebtGraph people={people} edges={live.rawEdges} />
                  <p className="mt-2 text-xs text-muted-foreground">Edges from expenses + manual IOUs before optimization.</p>
                </TabsContent>
                <TabsContent value="settled" className="mt-3">
                  <DebtGraph people={people} edges={live.settled} />
                  <p className="mt-2 text-xs text-muted-foreground">Minimal optimized transactions after reductions.</p>
                </TabsContent>
                <TabsContent value="history" className="mt-3">
                  {snapshots.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      No expenses yet — each expense will appear here with its own debt graph.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {snapshots.map((s) => (
                        <div key={s.id} className="space-y-2 rounded-lg border border-border bg-card/40 p-2">
                          <div className="flex items-start justify-between gap-2 px-1">
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">{s.label}</span>
                                <span className="text-sm font-semibold text-muted-foreground">· ₹{s.total}</span>
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                <span className="font-medium">Paid:</span> {s.payerStr}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                <span className="font-medium">Split:</span> {s.benefStr}
                              </p>
                              {s.note && (
                                <p className="truncate text-xs italic text-muted-foreground">"{s.note}"</p>
                              )}
                            </div>
                            <button
                              onClick={() => { removeExpense(s.id); toast.success(`Deleted ${s.label}`); }}
                              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Delete ${s.label}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <DebtGraph people={people} edges={s.edges} />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Each card shows the debt graph for that individual expense only.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveBalanceRows.map(r => (
                    <TableRow key={r.person}>
                      <TableCell className="font-medium">{r.person}</TableCell>
                      <TableCell className="text-right">₹{r.paid}</TableCell>
                      <TableCell className="text-right">₹{r.share}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.net > 0 ? "text-emerald-600" : r.net < 0 ? "text-destructive" : ""}`}>
                        {r.net > 0 ? `+₹${r.net}` : r.net < 0 ? `−₹${-r.net}` : "₹0"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.net > 0 ? "Owed" : r.net < 0 ? "Owes" : "Settled"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!people.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Add people to begin</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {calculated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="size-4" /> Final Settlement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Pays to</TableHead>
                      <TableHead>Receives from</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalRows.map(r => (
                      <TableRow key={r.person}>
                        <TableCell className="font-medium">{r.person}</TableCell>
                        <TableCell className={r.net > 0 ? "text-emerald-600" : r.net < 0 ? "text-destructive" : ""}>
                          {r.net > 0 ? `+₹${r.net}` : r.net < 0 ? `−₹${-r.net}` : "₹0"}
                        </TableCell>
                        <TableCell className="text-sm">{r.pays.join(", ") || "—"}</TableCell>
                        <TableCell className="text-sm">{r.receives.join(", ") || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Transactions ({live.settled.length})</h4>
                  {live.settled.length === 0 && <p className="text-sm text-muted-foreground">Everyone is settled. 🎉</p>}
                  {live.settled.map((e, i) => (
                    <SettleRow key={i} edge={e} onPay={amt => markPaid(e, amt)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="size-4" /> Who Pays Whom</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {live.settled.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      {people.length === 0 ? "Add people to begin" : "Everyone is settled 🎉"}
                    </TableCell></TableRow>
                  ) : (
                    live.settled.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-destructive">{e.from}</TableCell>
                        <TableCell className="font-medium text-emerald-600">{e.to}</TableCell>
                        <TableCell className="text-right font-semibold">₹{e.amount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

function SettleRow({ edge, onPay }: { edge: Edge; onPay: (amount: number) => void }) {
  const [amt, setAmt] = useState(String(edge.amount));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2 text-sm">
      <span><strong>{edge.from}</strong> pays <strong>{edge.to}</strong> ₹{edge.amount}</span>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} max={edge.amount} value={amt} onChange={e => setAmt(e.target.value)} className="h-8 w-24" />
        <Button size="sm" variant="outline" onClick={() => onPay(Number(amt))}>Mark paid</Button>
      </div>
    </div>
  );
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
