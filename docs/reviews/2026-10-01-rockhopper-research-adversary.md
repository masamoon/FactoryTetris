# Rockhopper research: adversarial reviews (2026-10-01)

The user asked "Should we also have a tech tree?" and chose the full review process. The proposal is [../ROCKHOPPER_RESEARCH.md](../ROCKHOPPER_RESEARCH.md). Every verdict below comes from an independent adversarial agent. None of it is evidence of enjoyment or balance for human players.

## Round 1: revision 1

The reviewer read the code and docs, then patched copies of `sim.ts` and the bot (untracked scratch) with a Lab, the nodes and research gates. It ran 60-minute bot games with factories on (seeds 1–3, laser on, crossings on). With research off, the patched bot reproduced `npm run bot:rockhopper -- --factories` exactly.

| #       | Verdict              | Main finding                                                                                                                                                                                                                                                                                  |
| ------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TT1     | REVISE               | "Never blocks" holds and is cheap to build. But the Lab is a timer, not a choice: everything it took was worth 1.0–3.4 % of earnings. Lone bars (mult 3) don't fit "a bar counts 2", and hand-laser and crumble chunks never reach a belt.                                                    |
| TT2     | REVISE               | Free moves plus per-ore progress make "bring two ores together" optional. Holding a belt already drops a bend post, so "hold-drag the Lab" collides with it. The anchor is specified twice, in contradictory ways.                                                                            |
| TT3     | REVISE               | Progress is kept per ore, so a player fills copper on one belt and then drags the Lab to a crystal belt; node 5 never needs a route. The bot re-clamped up to 40–57 times in a single node.                                                                                                   |
| TT4     | REVISE               | "2–4 min on the best line" holds only for node 1. Nodes 4–5 took 3:35 to 25 min, and node 5 didn't finish within 60 min in 5 of 9 runs. Two recipes that exist today (Cu + Au, Ice + Cr) were dropped without saying so. "A gold rock" is ambiguous.                                          |
| TT5     | PASS with conditions | Works in a patched sim. Conditions: a bar with no researched recipe passes at once; the `LONE_WAIT` "any partner" path respects research; the removed recipes are listed.                                                                                                                     |
| TT6     | REVISE               | Today's bot buys its first tier-3 belt at 2:48–3:12. The gate moves that to 16:32–43:21, delaying cheap T1-era content by 20–40 min.                                                                                                                                                          |
| TT7     | PASS with conditions | Older v3 builds keep the extra field. Conditions: reconcile grants on every load; validate `research` (a bad one resets research); handle the off → build → on toggle exploit; define Factories off with research on; gate factories in the sim command, App and bot, not just one predicate. |
| TT8     | REVISE               | A 28 u dome is not larger than a drill (32 u), and at T3 zoom (about 0.58) it is about 16 px. It needs a 390 px mock and a sim "skim" event for the arcs.                                                                                                                                     |
| TT9     | REVISE               | "Re-clamp when a better belt appears" already gets around the copper + crystal requirement. The bot must enforce the rule, route copper, and report Lab moves.                                                                                                                                |
| Clip    | REJECT (as written)  | It shows routing as necessary when one free Lab drag does the job, "40–90 s" is really 1.7–5.5 min, and the premium alloy almost never forms downstream (0–0.1 % of copper bars).                                                                                                             |
| Overall | **REVISE**           | The research adds no logistics decisions, doesn't get the copper-to-crystal route built, and its counts rest on a supply table that is mostly hand-laser output.                                                                                                                              |

### Measured by the reviewer (simulation)

- **The supply table counted flights.** Delivered by belt only (seed 1, factories off): copper about 233 chunk-equivalents/min at 5–10 min (not 370), gold 53/min at 10–15 min (not 90), crystal **2/min** at 30–35 min and 44/min at 55–60 min. The "50–150 crystal/min" was almost all hand laser and crumbles, which a Lab on a belt can never take.
- **Node times, literal policy, counts as proposed (seeds 1 / 2 / 3).** Node 1: 3:10 / 2:51 / 2:15 (the best line carried 50–65 Cu/min and 15–48 Ice/min). Node 2: 3:30 / 6:31 / 5:32. Node 3: 7:00 / 4:55 / 8:13. Node 4: 10:28 / 17:57 / 20:42. Node 5: 13:43 / 9:58 / not done. At node 5's start the best belt carried 23 / 59 / 78 Cr/min.
- **A "together" rule** (progress only on a belt carrying every needed ore): seed 2 formed a mixed line by itself and node 5 took 25 min; seeds 1 and 3, with a forced copper route into a T3 junction, didn't finish node 5 in 60 min. Crystal on belts is the binding limit, not the route.
- **Copper bars reaching a crystal factory:** 0.0–0.2 % in all 27 research runs, against 0–0.6 % without research.
- **Value the Lab took:** 36.9 k / 39.4 k / 36.6 k credits against 1.32–1.47 M earned.
- **Order:** nodes 2 and 3 finished at nearly the same times in either order.
- **Pacing (noisy):** T3 at 29:33 / 30:44 / 34:58 without research, 32:35 / 32:03 / 33:29 with it. Income at 60 min: 854 / 693 / 658 without, 701 / 711 / 617 with. The bot is path-dependent; treat ±20 % as noise.

### How revision 2 answers it

- **Progress counts matched pairs, not separate ores** (TT1, TT3), so a node needs both ores passing one point together and a free drag between two belts no longer works.
- **Every node is one alloy recipe, and all six recipes are in the tree** (TT4), so nothing that exists today is silently removed.
- **The Wide belts node is cut** (TT6).
- **Counts come from belt-only rates, and crystal counts are in the tens** (TT4).
- **The Lab moves through its bubble like a machine**, with a single anchor rule and gesture priority, and a move empties its hold (TT2).
- **Save, switch and gating conditions are written in** (TT7).
- **The dome is 36 u, with a 22 px hit radius and a sim `skim` event** (TT8).
- **The clip shows the counter starting**, which is immediate, and discloses the cut to completion.
- **Logged as a separate, pre-existing finding:** the bot's belts carry very little crystal at T3. That starves any premium route, whether or not a tree exists.

## Round 2: revision 2

The same reviewer re-ran its patched sim with revision 2's rules (one entry per ore, `LAB_HOLD` 10 s, recipes available once both ores are delivered by belt, the first recipe unlocks factories, reservation only after copper + crystal) and the TT9 policy (at most one Lab move per node; for copper + crystal, route a T1 copper smelter into a T3 drill junction). 60 min, seeds 1–3, factories on.

| #       | Verdict              | Main finding                                                                                                                                                                                                                              |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TT1     | PASS with conditions | Never blocks; 6–97 discards per game; 0.3–1.3 % of earnings taken. A bar counts the same as a chunk, so raw lines dominate (22 of 27 placements were on raw drill belts).                                                                 |
| TT2     | PASS with conditions | One anchor and bubble moves fix the gesture clash and the drag exploit; with or without the move limit, results were the same. The sell case (the heir belt) is underspecified.                                                           |
| TT3     | PASS with conditions | Works; up to 3–4 recipes listed at T3. The player can't see a belt's pairs before placing.                                                                                                                                                |
| TT4     | PASS with conditions | T1/T2 nodes took 1:59–4:11, crystal nodes 1:52–10:34; one copper + crystal run was unfinished. "Copper + crystal is the only node that needs a built route" is false and must be rewritten.                                               |
| TT5     | PASS                 | Round 1's conditions are written in.                                                                                                                                                                                                      |
| TT6     | PASS (cut accepted)  | —                                                                                                                                                                                                                                         |
| TT7     | PASS with conditions | (a) relies on "recipes the factories have already made", which nothing records.                                                                                                                                                           |
| TT8     | PASS with conditions | Size, `skim` event and hit radius are specified. The 390 px mock is still owed and is a gate.                                                                                                                                             |
| TT9     | REVISE               | Routing T1 copper into a T3 junction cut income at 60 min from 702 to 567 (seed 1) and 673 to 498 (seed 3), same seed, identical until the route; copper bars to crystal stayed 0.0 %. Picking by pair rate leaves copper + crystal last. |
| Clip    | REVISE               | Beats 1–2 are truthful. Beat 3 sells a payoff the sim doesn't give, hides the route's income cost and implies the route is required.                                                                                                      |
| Overall | **REVISE (narrow)**  | The mechanics are prototype-ready, but the stated purpose isn't met: five nodes are "place the Lab on the best belt" and the sixth is met by ordinary T3→T2 chaining (6:38 / 2:14 / 11:10 with no route at all). 18–30 min is empty.      |

### Measured by the reviewer (simulation)

- Node times from availability, seeds 1 / 2 / 3: copper + ice 4:01 / 2:55 / 2:48; ice + gold 2:06 / 2:29 / 1:59; copper + gold 4:11 / 3:53 / 4:02; ice + crystal 10:34 / 3:20 / 6:03; gold + crystal 10:28 / 1:52 / 4:17; copper + crystal 2:12 (routed) / 2:14 (no route) / not done after 15:30 (routed).
- Lab moves per node: 0–1.
- Value taken: 11.7 k / 5.7 k / 10.5 k credits, against 1.42 / 1.69 / 1.21 M earned.
- T3: 29:33 / 30:44 / 34:58 off, 30:31 / 30:15 / 33:36 with research. Income at 60 min: 854 / 693 / 658 off, 567 / 901 / 498 with research (±20 % noise, except the same-seed route effect).
- Copper + crystal learned at 38:19 / 54:27 / never, so the premium came much later than in the factories prototype.
- First factory: 12:05–12:15 with research, 11:45–11:53 without.
- The best belt's pair rate was 1.0–3.6× the second's (median about 1.6×).

### How revision 3 answers it

- **Copper + crystal is no longer a node.** The premium works as in the factories prototype. The routing claims are withdrawn, and the doc calls the Lab a light placement decision (TT4, "The idea in one line", "The decisions it gives the player").
- **The bot builds no research routes** and reports income against the no-research bot (TT9).
- **The clip shows a Lab move starting the counter on a T2 recipe,** with no route and no premium payoff.
- **Raw-line dominance is accepted** and stated in the Lab's first hint (TT1).
- **The sell case re-snaps to the heir belt** (TT2).
- **TT7 (a) grants from current availability and factory contents,** not from history.
- **The ghost shows which of the two ores a belt carries**, not its rate (TT2). The four-row bubble is added to the mock gate (TT8).
- **The 18–30 min gap is stated** as a property of the content (Pacing).

## Round 3: revision 3

The same reviewer re-ran its patched sim with revision 3's rules: five recipe nodes, copper + crystal always pairable and reserved as in the factories prototype, factories unlocked by the first learned recipe, no research routes, at most one Lab move per node. 60 min, seeds 1–3, factories on.

| #       | Verdict                                   | Main finding                                                                                                                                                                                                                                                                                |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TT1     | PASS                                      | Never blocks; 4.6–9.6 k credits taken against 1.25–1.73 M earned. The raw-line hint is true (12 of 16 placements on raw drill belts).                                                                                                                                                       |
| TT2     | PASS                                      | Heir re-snap is specified; the ghost chips need only a 30 s per-belt record. 0 moves on 13 of 15 nodes, 1 on the other 2.                                                                                                                                                                   |
| TT3     | PASS                                      | Works; the bot never saw more than two rows at T3.                                                                                                                                                                                                                                          |
| TT4     | PASS with conditions                      | Every median under 8 min. T1/T2 nodes always hit 2–5 min; crystal nodes went over 5 min in 3 of 6 runs. **Condition 1:** state the crystal times, and cut their counts or state the over-target cases.                                                                                      |
| TT5     | PASS                                      | Copper + crystal pairs without research; the premium share is unchanged (near zero either way).                                                                                                                                                                                             |
| TT6     | PASS (cut accepted)                       | —                                                                                                                                                                                                                                                                                           |
| TT7     | PASS                                      | (a) uses only data the state holds; (c) is honestly limited to the playtest.                                                                                                                                                                                                                |
| TT8     | PASS with conditions                      | **Condition 4:** the 390 px mock (dome, ghost chips, four-row bubble) is reviewed before any code is written.                                                                                                                                                                               |
| TT9     | PASS with conditions                      | **Condition 2:** put back the share of copper bars reaching a crystal factory, against the no-research bot.                                                                                                                                                                                 |
| Clip    | PASS with conditions                      | The first pair counted 0.6 / 2.0 / 5.4 s after placement. **Condition 3:** say "a T2 drill belt" (the bot learns ice + gold on the ice rock), and log the time from "learned" to the first alloy on a factory already on that line.                                                         |
| Overall | **PASS with conditions (prototype only)** | Low risk and honest. In the bot it moves T3 by −1:24 to +0:37 and the first factory by about +20 s, and leaves the premium share unchanged; income differences sit within the bot's noise. Whether short placement goals and one-at-a-time recipes are worth having is a playtest question. |

### Measured by the reviewer (simulation)

- Node times, seeds 1 / 2 / 3 (counts of 30 for the crystal nodes): copper + ice 4:01 / 2:55 / 2:48; ice + gold 2:06 / 2:29 / 1:59; copper + gold 4:11 / 3:22 / 4:02; gold + crystal 9:23 / 1:19 / 4:17; ice + crystal 7:56 / 1:35 / 6:03. The first pair came 0–8 s after placement, except two crystal placements at 18 s and 31.5 s.
- Research off → on: first factory 11:45 / 11:51 / 11:53 → 12:15 / 12:09 / 12:05; T3 29:33 / 30:44 / 34:58 → 30:10 / 29:20 / 33:36; income at 60 min 854 / 693 / 658 → 698 / 878 / 625; earned 1.70 / 1.50 / 1.23 M → 1.55 / 1.73 / 1.25 M; copper bars reaching a crystal factory 0.6 / 0.0 / 0.0 % → 0.0 / 1.0 / 0.0 %. T4 is not reached in any run.
- "None of the five nodes needs a new belt" held in all 15 node runs.

### How revision 4 answers it

All four conditions are written in: the crystal times are stated and their counts cut from 30 to 20, with over-target runs still expected (TT4); the copper-to-crystal share is back in the bot's reports and the evidence list (TT9); the clip says "a T2 drill belt" and logs the time to the first alloy on a factory already on the line; the mock is reviewed before any code (TT8, evidence). Revision 4 was not re-reviewed; the conditions were wording, a count change and report items.

Still open: the 390 px mock, the crossings stress tool with the Lab, and every human question in the proposal's open questions.
