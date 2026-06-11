# USE CASES: Expense Settlement and Debt Tracking System

## Application Idea

The main objective of this application is to simplify the process of tracking shared expenses and calculating how much each person owes to others within a group.

In this system, every person is represented as a node in a graph. A directed connection (edge) between two nodes represents a financial obligation. If Person A owes money to Person B, a directed edge is created from A to B with the corresponding amount attached to it.

---

## Case A: Multiple Payers with Equal Per-Person Share (Bus Trip)

**Scenario:**  
Consider a group of seven people represented as seven nodes: A, B, C, D, E, F, and G.

Assume Person A pays ₹60 and Person B pays ₹40 for a bus trip. The bus ticket cost per person is ₹13, so the total expense for all seven members is ₹91.

Since every person must first pay for their own ticket, Person A's and Person B's individual ticket costs (₹13 each) are considered their personal expenses and are not included in the settlement calculation.

**Calculation:**  
- Person A paid ₹60, out of which ₹13 is for themselves.  
  Amount paid on behalf of others = ₹47.
- Person B paid ₹40, out of which ₹13 is for themselves.  
  Amount paid on behalf of others = ₹27.

The total amount paid on behalf of others is ₹74, which is exactly equal to the ticket cost of the remaining five members (5 × ₹13 = ₹65) plus the excess amount that must be adjusted through settlement. The system must distribute these obligations among the remaining members using directed edges.

**One possible edge distribution:**  
- C → A : ₹13  
- D → A : ₹13  
- E → A : ₹13  
- F → A : ₹8  
  Total received by A = ₹47  

- G → B : ₹13 + ₹9  
- F → B : ₹5  

**Rules:**  
- Every edge represents the amount one person owes another person.
- All edge values must be whole numbers; fractional amounts are not allowed.
- A person's own share is never represented as an edge to themselves.
- The algorithm must ensure that the total incoming amount for each payer matches the amount they paid on behalf of others.
- Even if a person contributes a very small amount (e.g., ₹1), the settlement mechanism should still generate valid whole-number edges and balance all debts correctly.

---

## Case B: Single Payer for Entire Group (Equal Sharing)

**Scenario:**  
Consider a group of seven people represented as seven nodes: A, B, C, D, E, F, and G.

Assume Person A spends ₹180 on behalf of all the other members (B, C, D, E, F, and G). In this case, Person A is not included in the expense sharing, and the entire amount is paid for the remaining six members.

**Calculation & Edges:**  
₹180 ÷ 6 = ₹30  

- B → A : ₹30  
- C → A : ₹30  
- D → A : ₹30  
- E → A : ₹30  
- F → A : ₹30  
- G → A : ₹30  

Total amount received by A = ₹180.

**Rules:**  
- Person A is the sole payer.
- The expense is shared only among the beneficiaries (B, C, D, E, F, and G).
- Every beneficiary owes an equal share of the expense.
- All edge values must be whole numbers.
- The sum of all incoming edges to A must exactly equal the amount paid by A.
- Each directed edge represents the amount that a person has to repay to the person who made the payment on their behalf.

---

## Case C: Edge Reduction and Debt Simplification (Bidirectional)

**Scenario:**  
In some situations, two people may owe money to each other at the same time. Instead of creating two separate edges, the system should reduce the debts by calculating the net amount that needs to be transferred.

**Example:**  
- Person A → Person B : ₹10  
- Person B → Person A : ₹15  

Here, Person A owes ₹10 to Person B, and Person B owes ₹15 to Person A.

**After Reduction:**  
₹15 - ₹10 = ₹5  

- Person B → Person A : ₹5  

The original two edges are replaced with a single edge representing the net debt.

**Rules:**  
- If two nodes have edges in opposite directions, calculate the net difference.
- The smaller debt is cancelled against the larger debt.
- Only one edge should remain, pointing from the person who owes money to the person who should receive money.
- If both amounts are equal, both edges are removed.
- All resulting edge values must remain whole numbers.

---

## Case D: Behalf Reduction (Indirect Edge Reduction)

**Scenario:**  
A person acts as an intermediate node between two debts. The system reduces such intermediate transactions by transferring the obligation directly to the final receiver when possible.

**Example:**  
- Person A → Person B : ₹10  
- Person B → Person C : ₹15  

**After Reduction:**  
- Person A → Person C : ₹10  
- Person B → Person C : ₹5  

**Rules:**  
- If A owes B and B owes C, transfer as much debt as possible directly from A to C.
- The transferred amount is the minimum of the two edge values.
- The intermediate node's debt is reduced accordingly.
- Total owed and received by every person remains unchanged.
- All resulting edge values must remain whole numbers.

---

## Case E: Partial Group Expense Sharing

**Scenario:**  
Consider a group of seven people: A, B, C, D, E, F, and G.

Person A spends money for only five people, including themselves. Participants: A, B, C, D, and E. F and G are not included.

Cost per person = ₹15. Total spent by A = ₹15 × 5 = ₹75

**Calculation:**  
Amount paid by A on behalf of others = ₹75 - ₹15 = ₹60

**Edges:**  
- B → A : ₹15  
- C → A : ₹15  
- D → A : ₹15  
- E → A : ₹15  

Total received by A = ₹60

**Rules:**  
- Only selected participants are included.
- Non-participants (F, G) have no related edges.
- Payer's own share is excluded.
- Each participant owes only their share.
- All edge values must be whole numbers.

---

## Case F: Unequal Expense Sharing (Individual Bill Amounts - Single Payer)

**Scenario:**  
Eight people: A, B, C, D, E, F, G, H.

Person A pays entire shop bill of ₹270. Bill breakdown:  
- A: ₹35, B: ₹35, C: ₹35, D: ₹35, E: ₹35, F: ₹35, G: ₹50, H: ₹10

**Edges:**  
- B → A : ₹35  
- C → A : ₹35  
- D → A : ₹35  
- E → A : ₹35  
- F → A : ₹35  
- G → A : ₹50  
- H → A : ₹10  

Total received by A = ₹235

**Rules:**  
- Distribution based on actual bill amounts.
- Payer's own share excluded.
- All edge values whole numbers.

---

## Case G: Multiple Payers with Unequal Individual Bill Amounts

**Scenario:**  
Same bill as Case F (₹270 total). Payment split:  
- Person A pays ₹150 (own share ₹35)  
- Person B pays ₹120 (own share ₹35)

**Amounts paid on behalf of others:**  
- Person A: ₹150 - ₹35 = ₹115  
- Person B: ₹120 - ₹35 = ₹85  

Total owed by others = ₹200

**One valid edge distribution:**  
- C → A : ₹35  
- D → A : ₹35  
- E → A : ₹35  
- H → A : ₹10  
  Total to A = ₹115  

- F → B : ₹35  
- G → B : ₹50  
  Total to B = ₹85  

**Rules:**  
- Multiple payers allowed.
- Each payer's own share excluded.
- Debts can be distributed in multiple valid ways.
- All edge values whole numbers.

---

## Case H: Multiple Independent Expenses

**Scenario:**  
Group of seven people.

- Person A spends ₹100 for B, C, and D.
- Person E spends ₹150 for F and G.

**Edges (example):**  
- B → A : ₹33  
- C → A : ₹33  
- D → A : ₹34  

- F → E : ₹75  
- G → E : ₹75  

**Rule:**  
The system supports multiple disconnected expense groups within the same graph.

---

## Case I: Overpayment by a Participant

**Scenario:**  
Three people A, B, C. Each person's share = ₹30.

- A pays ₹50  
- B pays ₹20  
- C pays ₹20  
Total = ₹90

**After personal shares:**  
- A should receive ₹20  
- B should pay ₹10  
- C should pay ₹10  

**Edges:**  
- B → A : ₹10  
- C → A : ₹10  

**Rule:**  
System calculates net balances rather than directly connecting every participant to the payer.

---

## Case J: Advance Payment (Loan)

**Scenario:**  
Person A lends ₹200 to Person B before any expense.

**Initial Edge:**  
- B → A : ₹200

Later, B spends ₹50 for A:

- A → B : ₹50

**After Edge Reduction:**  
- B → A : ₹150

**Rule:**  
System supports loans and advances in addition to expense sharing.

---

## Case K: Circular Debt Reduction

**Scenario:**  
- A → B : ₹20  
- B → C : ₹20  
- C → A : ₹20  

**After Reduction:**  
No payment required. All edges removed.

**Rule:**  
System automatically detects and eliminates circular debt loops.

---

## Case L: Multiple Intermediate Reduction

**Scenario:**  
- A → B : ₹20  
- B → C : ₹20  
- C → D : ₹20  

**After Reduction:**  
- A → D : ₹20  

**Rule:**  
Extension of Case D (behalf reduction) along a chain.

---

## Case M: Participant Added Later

**Scenario:**  
Initially: A pays ₹60 for A, B, and C.

Later, D joins and pays their share separately.

**Rule:**  
System recalculates only the affected expense group without modifying settled transactions.

---

## Case N: Settlement Completed

**Scenario:**  
- B → A : ₹30

After B pays A:

**Rule:**  
Edge is marked as settled or removed. The graph shows only pending debts.

---

## Case O: Final Net Settlement (Most Important)

**Scenario:**  
After processing all expenses, reductions, circular debts, and behalf reductions, every person has a final balance.

**Example Balances:**  
- A should receive ₹120  
- B should receive ₹30  
- C should pay ₹70  
- D should pay ₹50  
- E should pay ₹30  

**Final Optimized Graph:**  
- C → A : ₹70  
- D → A : ₹50  
- E → B : ₹30  

**Output Requirements:**  
- Both Graph Representation and Tabular Representation
- No self-loops
- No bidirectional edges
- No transitive dependencies
- No recursive settlement chains
- Minimum possible number of transactions

**Final Output Format Example:**

| Payer | Receiver | Amount |
|-------|----------|--------|
| C     | A        | ₹70    |
| D     | A        | ₹50    |
| E     | B        | ₹30    |

This is the final stage of the algorithm — the optimized settlement result from all previous cases.