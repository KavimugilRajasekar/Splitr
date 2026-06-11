export type Edge = { from: string; to: string; amount: number };

export type Expense = {
  id: string;
  /** map of payer -> amount paid */
  payers: Record<string, number>;
  /** map of beneficiary -> share they owe. Sum equals sum of payers. */
  shares: Record<string, number>;
  note?: string;
  createdAt: number;
};

export type ManualEdge = Edge & { id: string; createdAt: number };

export type Settlement = {
  id: string;
  from: string;
  to: string;
  amount: number;
  createdAt: number;
};

/** Build raw edges from a single expense using net per-person balance within the expense.
 *  Each person's net = paid - share. Positive = creditor, negative = debtor.
 *  Then greedy-pair within the expense (whole numbers).
 */
export function expenseToEdges(e: Expense): Edge[] {
  const names = new Set<string>([...Object.keys(e.payers), ...Object.keys(e.shares)]);
  const net: { name: string; amt: number }[] = [];
  for (const n of names) {
    const v = Math.round((e.payers[n] ?? 0) - (e.shares[n] ?? 0));
    if (v !== 0) net.push({ name: n, amt: v });
  }
  const creditors = net.filter(x => x.amt > 0).sort((a, b) => b.amt - a.amt);
  const debtors = net.filter(x => x.amt < 0).map(x => ({ name: x.name, amt: -x.amt })).sort((a, b) => b.amt - a.amt);

  const edges: Edge[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) edges.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return edges;
}

/** Helper to build an equal-split expense. Distributes remainder deterministically. */
export function buildEqualSplit(
  payers: Record<string, number>,
  beneficiaries: string[],
): Record<string, number> {
  const total = Math.round(Object.values(payers).reduce((s, v) => s + v, 0));
  const n = beneficiaries.length;
  if (n === 0) return {};
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const shares: Record<string, number> = {};
  beneficiaries.forEach((p, idx) => {
    shares[p] = base + (idx < remainder ? 1 : 0);
  });
  return shares;
}

export function netBalances(edges: Edge[], people: string[]): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const p of people) bal[p] = 0;
  for (const e of edges) {
    bal[e.from] = (bal[e.from] ?? 0) - e.amount;
    bal[e.to] = (bal[e.to] ?? 0) + e.amount;
  }
  return bal;
}

/** Greedy minimum-transaction settlement from net balances. */
export function minimalSettlement(balances: Record<string, number>): Edge[] {
  const creditors: { name: string; amt: number }[] = [];
  const debtors: { name: string; amt: number }[] = [];
  for (const [name, amt] of Object.entries(balances)) {
    if (amt > 0) creditors.push({ name, amt });
    else if (amt < 0) debtors.push({ name, amt: -amt });
  }
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const edges: Edge[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) edges.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return edges;
}

/** Apply settlements (payments already made) to net balances. */
export function applySettlements(
  balances: Record<string, number>,
  settlements: Settlement[],
): Record<string, number> {
  const out = { ...balances };
  for (const s of settlements) {
    // s.from paid s.to amount, so debtor's balance increases, creditor's decreases
    out[s.from] = (out[s.from] ?? 0) + s.amount;
    out[s.to] = (out[s.to] ?? 0) - s.amount;
  }
  return out;
}

export function calculateAll(
  people: string[],
  expenses: Expense[],
  manualEdges: ManualEdge[],
  settlements: Settlement[],
): { rawEdges: Edge[]; balances: Record<string, number>; settled: Edge[] } {
  const rawEdges: Edge[] = [];
  for (const e of expenses) rawEdges.push(...expenseToEdges(e));
  for (const e of manualEdges) rawEdges.push({ from: e.from, to: e.to, amount: Math.round(e.amount) });
  let balances = netBalances(rawEdges, people);
  balances = applySettlements(balances, settlements);
  const settled = minimalSettlement(balances);
  return { rawEdges, balances, settled };
}
