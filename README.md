# Splitr — Expense Settlement & Debt Tracking

> **Splitr** is a graph-based expense settlement system that computes the *minimum number of transactions* needed to settle all shared debts within a group. Add people, log expenses, record IOUs, and let the algorithm do the math.

---

## 📁 Repository Structure

```
Splitr/
├── Splitr/               # Web Application (React + Vite + TailwindCSS)
│   ├── src/
│   │   ├── routes/       # TanStack Router file-based routes
│   │   ├── components/   # UI components (DebtGraph, shadcn/ui)
│   │   ├── lib/          # Core settlement algorithm
│   │   └── hooks/        # Custom React hooks
│   ├── public/
│   └── package.json
│
├── splitr_warpper/       # Flutter Android App (WebView Wrapper)
│   ├── lib/
│   │   └── main.dart     # Flutter entry point with WebView
│   ├── assets/
│   │   └── icons/
│   │       ├── splitr.png          # App icon (with background)
│   │       └── splitr_no_bg.png    # App icon (transparent background)
│   └── pubspec.yaml
│
└── CASE-STUDIES.md       # Algorithm case studies & edge cases (A–O)
```

---

## ✨ Features

### Core Algorithm
- **Graph-based debt modeling** — each person is a node; each debt is a directed weighted edge
- **Bidirectional edge reduction** (Case C) — cancels mutual debts, leaving only the net difference
- **Behalf / transitive reduction** (Case D, L) — collapses debt chains (A→B→C becomes A→C)
- **Circular debt elimination** (Case K) — removes zero-sum debt loops automatically
- **Net settlement optimizer** (Case O) — produces the globally minimum transaction set

### Web App
| Feature | Description |
|---|---|
| 👥 People Management | Add / remove group members dynamically |
| 🧾 Expense Logging | Single payer or multiple payers per expense |
| ⚖️ Flexible Splitting | Equal split, per-bill amounts, or fully custom shares |
| 💬 Expense Comments | Label each expense with a note (e.g. "Dinner at Taj") |
| 🔗 Manual IOUs / Loans | Record one-off debts between any two people |
| 📊 Debt Graph Visualization | Live interactive graph — raw, settled, and history snapshots |
| 📋 Balance Table | Per-person paid / share / net balance in real-time |
| ✅ Mark as Paid | Partial or full settlement tracking per transaction |
| 📤 Export | Download results as JSON or CSV |
| 📱 Responsive UI | Mobile drawer + desktop side panel layout |

### Flutter App
- Native Android WebView wrapper around the deployed Splitr web app
- Portrait-only, edge-to-edge display
- Zero JS restrictions — full app functionality inside the native shell

---

## 🚀 Getting Started

### Web App

**Prerequisites:** Node.js ≥ 18, [Bun](https://bun.sh/) (recommended) or npm

```bash
cd Splitr

# Install dependencies
bun install
# or: npm install

# Start development server
bun run dev
# or: npm run dev

# Build for production
bun run build
# or: npm run build
```

The dev server starts at `http://localhost:5173`.

**Deployment:** The app is deployed on [Vercel](https://vercel.com/) and accessible at:
```
https://splitr-umber.vercel.app
```

---

### Flutter Android App

**Prerequisites:** Flutter SDK ≥ 3.12, Android Studio / SDK

```bash
cd splitr_warpper

# Fetch dependencies
flutter pub get

# Run on connected device / emulator
flutter run

# Build release APK
flutter build apk --release
```

> The Flutter app loads `https://splitr-umber.vercel.app` inside a WebView with JavaScript unrestricted and zoom disabled.

---

## 🧠 Algorithm Overview

The settlement algorithm operates in three phases:

```
1. BUILD  → Convert all expenses & IOUs into directed debt edges (A owes B: ₹X)
2. REDUCE → Apply graph reductions:
             - Bidirectional cancellation (net mutual debts)
             - Transitive chain reduction (A→B→C ⟹ A→C)
             - Circular loop elimination (A→B→C→A = 0)
3. SETTLE → Compute minimum-transaction net settlement using a greedy
             creditor/debtor matching algorithm
```

For detailed case-by-case examples covering 15 scenarios (equal split, partial groups, multiple payers, overpayment, loans, circular debts, etc.), see [CASE-STUDIES.md](./CASE-STUDIES.md).

---

## 🛠️ Tech Stack

### Web App
| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build Tool | [Vite 7](https://vitejs.dev/) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |
| Package Manager | [Bun](https://bun.sh/) |

### Flutter App
| Layer | Technology |
|---|---|
| Framework | [Flutter](https://flutter.dev/) ≥ 3.12 (Dart ^3.12.1) |
| WebView | [webview_flutter](https://pub.dev/packages/webview_flutter) ^4.13.1 |
| Target Platform | Android |

---

## 📐 Case Studies Summary

| Case | Scenario |
|------|----------|
| A | Multiple payers, equal per-person share |
| B | Single payer for entire group |
| C | Bidirectional edge reduction (mutual debts) |
| D | Behalf reduction (transitive/indirect debt) |
| E | Partial group expense sharing |
| F | Unequal amounts, single payer |
| G | Unequal amounts, multiple payers |
| H | Multiple independent expense groups |
| I | Overpayment by a participant |
| J | Advance payment / loan tracking |
| K | Circular debt elimination |
| L | Multi-hop transitive reduction chain |
| M | Participant added mid-session |
| N | Settlement marked as completed |
| O | Final net settlement (minimum transactions) |

---

## 📸 App Icon

<img src="splitr_warpper/assets/icons/splitr_no_bg.png" alt="Splitr Icon" width="120" />

---

## 📄 License

This project is private and not published to pub.dev or npm registries.

---

<p align="center">Built with ❤️ — Splitr makes group finances fair and simple.</p>
