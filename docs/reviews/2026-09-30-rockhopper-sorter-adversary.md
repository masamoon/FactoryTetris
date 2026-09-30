# Rockhopper sorter: adversarial reviews (2026-09-30)

The user asked "what more logistics can we add? factories? tunnels?" and picked the sorter first, factories second. The proposal is [../ROCKHOPPER_SORTER.md](../ROCKHOPPER_SORTER.md). Every verdict below comes from an independent adversarial agent. None of it is evidence of enjoyment or balance for human players.

## Round 1: draft of 2026-09-30

The reviewer checked each factual claim against `src/rockhopper/sim.ts` and `config.ts`, then ran a throwaway headless script (`/tmp/claude-0/sorter-review/line.ts`, not kept in the repo) on the clip line: seed 1–3, slot 0 (T1, copper signature), three drills chained into the middle one, a smelter spliced onto the junction's tier-1 belt, auto-linked to a dock. A sorter was emulated by deleting rock chunks from the junction's belt every tick ("vent"), or by deleting them and crediting 1 each ("side docked", which ignores the side belt's own capacity and so flatters the sorter). All numbers below are **simulation**, not playtest.

| #       | Verdict              | Main finding                                                                                                                                                                                                                                                      |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | REVISE               | Before factories, no filter except Rock does anything useful: smelters triple every ore alike, so splitting copper from ice has no payoff. The five-step cycle is UI with no decision behind it.                                                                  |
| S2      | REVISE               | The clip's own action is illegal under S2 as written: `canSplice` refuses any belt whose target is a smelter, and any owner that isn't a drill. Splicing onto a sorter's main or side belt is undefined.                                                          |
| S3      | PASS with conditions | Sound, but `reaches` walks one `out`; it must walk both belts. "Already smelted" refusal is inconsistent with smelter → drill → sorter, which the current matrix allows.                                                                                          |
| S4      | REVISE (blocking)    | Venting with a Rock default, unlocked at the first smelter, is a trap early (−46 to −57 % income on the clip line) and a no-brainer late (−3 % on T4). It is the "rock sifter" the logistics review deferred until the 390 px playtest, which is still open.      |
| S5      | PASS with conditions | Stocks must keep each item's `mult` (bars pass through main). Head-of-line blocking from a full side stock stalls ore too; state it and test it.                                                                                                                  |
| S6      | REVISE               | All per-belt state (tier, tierBought, cd, rr, full, wait, heldAgo, crossT) lives on the machine, and crossing segments, post ids and the "one belt never plates itself" rule are keyed by machine id. Two belts from one centre make the re-route drag ambiguous. |
| S7      | REVISE               | Unlock at the first smelter (bot: 1:35) puts a value-destroying default in front of the newest players. Doubling price fights "sort every line", its own late-game use. Heal-on-sell when the heir feeds via its side belt is unspecified.                        |
| S8      | REVISE               | "Old builds refuse the save" means rolling the build back bricks the save. Every earlier experiment kept a restore path.                                                                                                                                          |
| S9      | REVISE               | A third tray item appears for everyone who owns a smelter, so it does change the existing game. The project's pattern for experiments is a menu switch; "no switch" drops reversibility.                                                                          |
| Clip    | REJECT (as written)  | The premise is impossible and the payoff is backwards: a tier-1 line can't block a level-1 smelter (queue full 0 % of ticks), and the sort lowers income. The rock crumbles at about 9.5 s, inside beat 1.                                                        |
| Overall | **REVISE**           | Before factories the sorter has no positive-sum use on T1–T2: a 90-credit smelter upgrade beats it, and venting only pays where rock is nearly worthless, where it becomes a universal rule rather than a decision.                                               |

### Measured by the reviewer (simulation)

Claims that check out: T1 ore share 26 % (`TIER_ORE`); measured rock share of mined chunks 0.69–0.79 across seeds. Rock ≈ 45 % of a raw T1 line's value (copper-signature slot: ores are C,C,C,I plus C,C, average 3.33, so rock is 0.74 / 1.61 = 46 %). Level-1 smelter 2 / 0.23 s = 8.7 chunks/s. Tier-1 belt 7.5 chunks/s. T4 rock ≈ 3.6 % of value.

Claims that don't: "smelters spend most of their time on rock" is framed as waste, but a rock bar is `BAR_VALUE` 6 for two chunks, so smelting rock earns 3 per chunk, the same as raw copper. Rock is not wasted smelter time unless the smelter is the bottleneck, and one tier-1 line (7.5/s) can never saturate a level-1 smelter (8.7/s).

Clip line, three level-1 drills → tier-1 junction belt → level-1 smelter → dock, one rock until it crumbles:

| Seed | Cells | Crumbles at | No sorter (value/s, total) | Vent rock    | Side docked (optimistic) | Smelter queue full |
| ---- | ----- | ----------- | -------------------------- | ------------ | ------------------------ | ------------------ |
| 1    | 97    | 9.3 s       | 28.4 /s, 264               | 12.3 /s, 114 | 18.1 /s, 168             | 0 %                |
| 2    | 104   | 9.8 s       | 28.7 /s, 282               | 13.4 /s, 132 | 19.3 /s, 190             | 0 %                |
| 3    | 99    | 9.6 s       | 30.0 /s, 288               | 16.3 /s, 156 | 21.5 /s, 206             | 0 %                |

Same line over 120 s with respawns, whole-factory income (crumble flights included, identical across modes): no sorter 24.2–26.2 /s, vent 13.2–16.6 /s, side docked 16.9–19.9 /s. Mining averages only 4.6–4.7 chunks/s because the rock is spent in ~9.5 s and the tow takes 8 s: an early T1 line is **supply-limited, not belt-limited**, so freeing belt capacity buys nothing there.

The case the sorter is meant for (smelter saturated): the same line with level-3 drills and the junction belt widened to tier 2, so up to 15 chunks/s reach a level-1 smelter (queue full 71 % of ticks):

| Seed | No sorter | Vent    | Side docked (optimistic) | Smelter L2 (+90 cr) | Smelter L3 (+288 cr) |
| ---- | --------- | ------- | ------------------------ | ------------------- | -------------------- |
| 1    | 31.1 /s   | 18.0 /s | 29.6 /s                  | 41.1 /s             | 46.3 /s              |
| 2    | 35.5 /s   | 26.6 /s | 38.3 /s                  | 47.5 /s             | 54.4 /s              |
| 3    | 34.2 /s   | 28.8 /s | 39.0 /s                  | 42.6 /s             | 53.8 /s              |

The "side docked" column is an upper bound: rock arrives at about 12.9 chunks/s, more than a tier-1 side belt carries (7.5), so a real side belt would back up and hold the line (S5) unless the player also widens it. A 90-credit smelter upgrade beats a 400-credit sorter in every seed. The "‖" flag stayed off here too, despite the full queue (the smelter's own "full" output sample suppresses it: `refused && !sm.full`), which is worth a separate look.

Later tiers, three level-6 drills and a level-3 smelter on a tier-1 line (not belt-limited), 120 s, cost of venting: T2 −17 to −23 %, T3 −8 %, T4 −3 %. Where a trunk _is_ belt-limited on T3/T4, venting halves the chunks for about 4–8 % of the value, which beats any widen price once the global tier count is high. That is the dominant rule: **never vent on T1, always vent on T3/T4.**

## Findings by rule

### S1 (REVISE): the filter cycle

- **No decision behind four of the five filters.** With `BAR_VALUE` the same for every ore, splitting copper from ice or gold from crystal changes nothing until factories want a specific ore. Filters for ores the line doesn't carry (Gold on T1) silently do nothing.
- **Cost:** a 5-step cycle on a small chip at 390 px, 4 taps to get back to Rock, and a coloured chip per sorter in an already busy hub fan.
- **Required:** v1 filters Rock only (or "rock / ore"). The cycle ships with factories, where it has a use.
- **Evidence to resolve:** none needed if cut; if kept, a use case that earns more with a non-rock filter than without, measured.

### S2 (REVISE): splicing

- `canSplice` returns false when `owner.out.to.kind === 'smelter'` and when the owner isn't a drill. The clip drops a sorter on a drill → smelter belt, which S2 ("same refusals as smelters") refuses.
- Undefined: splicing a sorter onto another sorter's main or side belt, onto a smelter's output, or a smelter onto a sorter's belts; which belt the "belt blocked" lane check covers for the new side belt (it doesn't exist at splice time, so it is unchecked until linked).
- **Required:** a splice table for sorters (owner kinds × old target kinds), with `spliceLanesBlocked` applied to the main belt, and a test for each row.

### S3 (PASS with conditions): target matrix

- `reaches` follows a single `out` chain; with two outputs, the loop check becomes a DFS over both belts. A sorter's side feeding a drill whose line re-enters the sorter's input must be refused.
- "Smelter → sorter refused as already smelted" is harmless but inconsistent: smelter → drill is allowed, so bars already reach a sorter via a junction (and S1 passes them to main). Either drop the refusal or say it is a UI nudge, not a rule.
- The "two belts not on the same machine" rule doesn't stop reconvergence one step later (side → drill A → drill B ← main). That's fine, but say so.
- **Condition:** a randomised test of the matrix over sorter chains with both belts, no loops.

### S4 (REVISE, blocking): venting

- **Trap early.** The filter defaults to Rock and the side vents, so the first sorter a player buys (right after the first smelter) cuts that line's income by 46–57 % on the clip line, and a docked side belt still leaves it 28–36 % below no sorter. The smelter was not the limit, so nothing was gained.
- **Rule late.** On T3/T4 venting costs 3–8 % and halves belt load: every line gets a sorter at the rock, with no trade-off to think about. That is a chore, not a decision (the brief's "universal optimal layout").
- **Process.** This is the "rock sifter (drop rock filler to save belt capacity)" that `ROCKHOPPER_LOGISTICS.md` deferred until L1–L7 are playtested. That playtest is still listed as open.
- **Required:** pick one and justify it with numbers. (a) An unlinked side belt merges back into main (the sorter does nothing until you link the side), so linking the side is the decision and nothing is thrown away; venting becomes a later upgrade, if ever. (b) Keep venting, but unlock the sorter where venting is a real trade (T2 or later) and make the vented value visible (a "−N/s" on the puff, from real events). Either way, the vent must emit a real event, and `inTransitValue` and the credits invariant must say that vented chunks leave without earning.
- **Evidence to resolve:** the bot variant's income at 20 min with and without sorters, per tier, and the share of lines where the sorter raised income.

### S5 (PASS with conditions): flow

- The stocks must hold `{ore, mult}`, not `Ore[]`: bars (mult 6 or 3) arrive from junctions and go to main, and a bundle never mixes values.
- A full side stock stops the input belt even when the next chunk is ore (head-of-line blocking): with two tier-1 inputs on T1, rock (≈11 /s) exceeds a tier-1 side (7.5 /s), so the whole line runs at the side's pace. That is legible ("‖" on the side) and a good widen prompt, but it must be stated and tested.
- **Conditions:** the stock type in the spec; a test that bars pass through main unsorted; a test that a blocked side holds the input and shows "‖".

### S6 (REVISE): two ordinary belts

- **Sim cost is larger than the doc implies.** `tier`, `tierBought`, `cd`, `rr`, `fullT/full`, `wait/heldAgo`, `crossT/cross` are on `MachineBase`, so every one needs a second copy or a move onto `Belt`. `segmentsOf` keys a belt by `m.id`, posts by `-1000 - m.id * 3 - k`, and "pieces of one belt never plate each other" would then exempt a sorter's main and side from each other, including two belts running side by side to adjacent docks. `inputsOf`, `feeds`, `pressureTick`, `sell` and `relinkAll` all read one `out`.
- **Gesture ambiguity.** Re-routing starts by dragging from a machine; with two belts leaving one 16–22 u centre, the game can't tell which belt the finger means. Needs a visible side port (offset from the centre) with its own hit area, tested at 390 px.
- **Bubble.** "Widen main" and "Widen side" plus the filter chip, Move and Sell: five controls, two of them near-identical. At 390 px that bubble needs a screenshot and a mis-tap check.
- **Required:** a data-model sketch (per-belt state on `Belt`, a belt id distinct from the machine id), a statement of whether main and side plate each other, and the side-port gesture.

### S7 (REVISE): price, unlock, heal

- Unlock at the first smelter is exactly when S4 hurts most (see above).
- 400 × 2ⁿ means the eighth sorter costs 51 200: fine as a limiter, but it contradicts the late-game "sorting becomes the default" line; say which is intended.
- Heal-on-sell: when a machine fed by a sorter's **side** belt is sold, and that sorter is the heir, which of its belts takes the target? If the side takes a target equal to the main's target, S3's "not on the same machine" breaks. Specify, and test with sorter → drill → sorter.
- A sorter has no level, so its bubble has no Upgrade; say so.

### S8 (REVISE): saves

- "Old builds refuse a save that contains a sorter" means a player who rolls the build back loses their save. The logistics experiment wrote a pre-migration backup and never touched v1. Required: a restore path (for example strip sorters on load in the old shape, healing through main, or a backup key written before the first sorter), and a validator test for a sorter with a missing, malformed or self-targeting side.

### S9 (REVISE): no switch

- A third tray item appears for anyone with a smelter, so the game does change for players who never buy one. Crossings and drill prices both shipped behind menu switches as reversible experiments; this should too, with "off" hiding the tray item (existing sorters keep working or are sold at full refund, stated).

## Clip scenario (REJECT as written)

- **Beat 1 is impossible.** A three-drill line on a tier-1 belt carries at most 7.5 chunks/s; a level-1 smelter takes 8.7/s. Measured: the smelter queue was full 0 % of ticks, so "‖" can't show.
- **Beat 2 lowers income.** Venting cut the rate from 28–30 /s to 12–16 /s. The smelter was never blocked, so there is nothing to clear.
- **Beat 3 still below the start.** Side docked: 18–22 /s against 28–30 /s with no sorter, and it spends a free dock the developed save must have. "The counter's rate goes up again" is true only relative to beat 2.
- **Depletion.** The rock (97–104 cells) crumbles at 9.3–9.8 s with three level-1 drills, then an 8 s tow. The 30 s clip spans at least one crumble, and the income swings 10–40 /s with the rock cycle, which would swamp any sorter effect. The evidence item "income over 120 s before the rock crumbles" is impossible on T1.
- **Beat 2's splice** is refused by `canSplice` (S2).
- **"Room for a fourth drill."** The sorter sits after the junction, so the belt into it is still full; a fourth drill only helps if it joins the sorter's second input or the main belt downstream. The clip must show where it goes.
- **What a truthful clip could be:** a disclosed developed save with a belt-limited T3 or T4 trunk (rock 4–8 % of value); dropping a sorter near the drills vents rock, the trunk's ore rate roughly doubles, the counter rises, and the next decision is widening the main or linking the side. It must be witnessed like segment B: settled rates before and after, cells remaining, and the crumble logged.

## Questions for the reviewer

- **Is venting a dominant choice or a fair trade?** Neither. Early it is a trap (it only destroys value while T1 lines are supply-limited and smelters have spare capacity); late it is a free, universal rule. The trade exists roughly on T2 (−17 to −23 % value for half the chunks) when a trunk is belt-limited. Make an unlinked side merge back into main, or unlock the sorter where the trade is real.
- **Is the filter cycle worth its UI before factories?** No. Filter Rock only in v1; add the cycle with factories.
- **Does a third tray item cost too much at 390 px?** Width is probably fine but unproven: needs a 390 px screenshot with three items, prices and tap targets of at least 44 px. The bigger cost is when it appears (at 1:35, as a trap), not where.
- **Should the two belts share one tier?** No. On T1 the side carries about three times the main's chunks, so a shared tier makes players pay for main capacity they don't need, or leaves the side as the permanent bottleneck. Keep separate tiers, but select the belt by tapping it (or its port) so the bubble shows one Widen for the chosen belt.

## Required changes (for Round 2)

1. Resolve S4: no silent value destruction at unlock. Either the side merges into main until linked, or venting unlocks where it is a real trade, with the vented value shown from real events.
2. Move the unlock (and justify its timing with the bot), or show with the bot that the first sorter bought raises income.
3. Filter Rock only in v1 (S1).
4. A splice table and matrix DFS (S2, S3), with tests.
5. A data model for per-belt state and belt ids; the crossings rule between a sorter's own belts; the side-port gesture and bubble at 390 px (S6).
6. Heal-on-sell rules for side-belt heirs (S7).
7. A switch and a restore path for saves (S8, S9).
8. A new clip on a belt-limited later-tier trunk, witnessed with settled rates and crumble logged; drop the 120 s pre-crumble T1 measurement.
9. Correct the doc: rock bars earn ×3 like any ore (not waste), and a single tier-1 line can't saturate a level-1 smelter.
10. Answer, with numbers, whether the sorter should wait for factories, where ore identity finally matters.

## Open questions

- Whether sorting and routing a branch feels like skill at 390 px can only come from a human playtest; the logistics playtest it depends on is still open.
- Whether the "‖" suppression under a full smelter output (seen in the widened case) is intended.

## Round 2: revision 2 (sorter + factories)

The reviewer checked each factual claim in revision 2 against `sim.ts`, `config.ts`, `save.ts`, `App.ts` and `style.css`, ran the greedy bot (seeds 1–3, 20 min) for pacing, and wrote throwaway scripts in `/tmp/claude-0/sorter-review-r2/` (not kept in the repo). All numbers are **simulation**, not playtest.

- `comp.ts`, `ratio.ts`: whole-rock ore counts (seeds 1–5) and the first 30 cells a lone drill reaches at 16 rim angles, with the value an ideal factory would add.
- `line.ts`: the real sim builds three drills chained into a junction on one slot, splices a smelter onto the junction belt and auto-links it to a dock, then runs 180 s with respawns. The bar stream arriving at that dock is replayed through an **emulated factory**: 1.5× on a paired recipe bar (×6 bars only), pass-through for everything else, a stock of 6 recipe bars, unpaired bars released after `LONE_WAIT` (2 s), the best of the four recipes per run. The emulation ignores the factory's own output belt, so it slightly flatters the factory where flow is high.
- `meet.ts`: two lines in one state, with a factory at the end of each line (two factories) or both lines meeting at one factory (streams merged by arrival time).

| #                | Verdict              | Main finding                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1               | REVISE               | "Cu + Au, Ice + Cr and Au + Cr need ores from different tiers" is false: T2 has Cu and Au, T3 has Ice, Au and Cr, T4 has Au and Cr. Cu + Ice and Au + Cr come balanced off one rock. The alloy has no representation in `BeltItem`, and lone bars give fractional credits.                                              |
| F2               | REVISE               | Pass-through makes "a factory at the end of every smelted line" the universal rule: +8 to +23 % on a lone T1 line and +14 to +40 % on a lone T3 line, with no line meeting anything. "Can't lower income" is false once the inflow outruns the factory's tier-1 output belt.                                            |
| F3               | REVISE               | The arithmetic is wrong: one item per tick is 30 items/s, not 15. The intake never binds anyway: one line's bars arrive at 2.4–5.1 items/s, so "cleaning its input (sorting)" never pays. Factory levels, upgrade prices and the third input have no numbers.                                                           |
| F4               | PASS with conditions | Workable. `canSplice` must be rewritten (it accepts only drill owners today). Say whether a raw drill may feed a factory (raw chunks pass through unchanged, a quiet trap), what tier the output belt starts at, and where a factory sits in `relinkAll`'s order.                                                       |
| F5               | PASS with conditions | The default must be the recipe that would pair the most (the smaller of its two ores, rock excluded), not the ores "carried most". Say what happens to held bars when the recipe changes (they pass through). The chip needs a 44 px target.                                                                            |
| F6               | PASS with conditions | The bot owns 2 smelters at 3:20–3:33, when income is 36–43 /s, so 2 400 is about a minute of income. A T1 line pays it back in 5–23 min (+1.7 to +7.5 /s), a weak but positive buy. Needs the bot variant. The fourth tray item overflows 390 px (see below).                                                           |
| S1               | PASS with conditions | The five filters now have a use, but only Cu/Ice/Au/Cr. With no venting and an intake that never binds, the Rock filter does nothing useful. Stocks need the alloy representation.                                                                                                                                      |
| S2               | PASS with conditions | Resolves round-1 change 1. But an unlinked sorter is a free-standing two-input merger for 300 credits, the only one that takes two smelter belts (smelter → smelter is refused). Expect it to be bought as a merger that saves docks. Say whether that is intended ("a collector" is deferred).                         |
| S3               | PASS with conditions | DFS over both belts is right. smelter → sorter → smelter and factory → sorter → factory get round "smelter never feeds a smelter" and F4's "never another factory". That is harmless (bars and alloys pass through) but should be stated as allowed, or the rule written about items, not topology.                     |
| S4               | PASS with conditions | The table is complete. `canSplice` and `spliceLanesBlocked` assume a drill owner and one output belt; each row needs a test, including a splice onto a sorter's side while that side is merging into main.                                                                                                              |
| S5               | PASS with conditions | Must say whether a full **main** stock also blocks side-bound items (symmetric head-of-line), and where the zipper pointer `rr` lives with two inputs and two outputs. Needs the alloy representation.                                                                                                                  |
| S6               | PASS with conditions | The right model, but the largest change in the proposal: `loadBelts`, `moveBelts`, `arbitrate`, `pressureTick`, `segmentsOf`, the post keys, `sell`, `relinkAll`, the validator and the renderer all key on the machine. Needs round-trip migration tests and the crossings stress tool rerun with two-output machines. |
| S7               | PASS with conditions | Today a tap on a belt closes the bubble, and belts within 12 px of each other are common at the hub. "Tap selects a belt" needs a rule for several belts under the finger, and a way to close the bubble. A 44 px port next to a 16–22 u body needs its zoom range stated. Screenshot required.                         |
| S8               | REVISE               | Unlocking after the first factory (about 3:30 by the bot) shows a sorter whose only use on T1–T2 is merging (below). 300 × 1.6ⁿ is cheaper than every dock from the fifth on (780, 2 028, 5 273, …). Justify it with the bot or move it.                                                                                |
| S9               | PASS with conditions | Specified. Tests as stated, plus selling a factory whose two smelter inputs can't chain (smelter → smelter), so the second one unlinks.                                                                                                                                                                                 |
| Switch and saves | REVISE               | Same failure as round 1's S8. `deserialize` rejects any machine kind but drill and smelter. An older build then starts fresh and its autosave overwrites `rockhopper.save.v2`. It never reads `…pre-factories`, and has no `?restore=pre-factories`. Use a new key, as the logistics experiment did.                    |
| Clip             | REVISE               | 62–83 % of the bars on the "orange" and "yellow" lines are lilac rock bars, and an alloy forms every 3–4 s. Beat 3 is illegal at level 1 (a factory has 2 inputs, both used), and it adds **gold**, the abundant side: copper limits Cu + Au, so the rate can't rise.                                                   |
| Overall          | **REVISE**           | Factories are positive-sum, but the stated decision ("lines from different rocks have to meet") mostly isn't there: a factory per line captures most of the value. On T1–T2 the sorter's only positive-sum use is as a merger. Fix the facts, pick recipes from the vein data, and fix the save key.                    |

### Measured by the reviewer (simulation)

**Ore mix is already balanced on single rocks.** `generateRock` uses `TIER_ORE[tier].ores` plus the signature twice, placed by a smooth noise field `t` that clusters around its middle. On the copper-signature T1 slots, ice holds the band `t` ∈ [0.5, 0.67), so it is much more common than the nominal 1 in 6.

| Slot (whole rock, seeds 1–5) | Ore cells                                                           |
| ---------------------------- | ------------------------------------------------------------------- |
| 0, T1 Cu (free)              | Cu12 Ice13 · Cu20 Ice7 · Cu17 Ice9 · Cu18 Ice7 · Cu23 Ice2          |
| 2, T1 Ice                    | Cu13 Ice13 · Cu11 Ice16 · Cu18 Ice7 · Cu10 Ice16 · Cu8 Ice19        |
| 3, T2 Ice                    | Cu3 Ice36 Au20 · Cu13 Ice33 Au16 · Cu10 Ice38 Au10 · Ice36 Au26 · … |
| 4, T2 Au                     | Cu7 Ice20 Au35 · Cu2 Ice6 Au55 · Cu6 Ice20 Au31 · Cu2 Ice4 Au57 · … |
| 5, T3 Au                     | Ice9 Au73 Cr37 · Ice10 Au68 Cr37 · Ice14 Au71 Cr33 · Au81 Cr32 · …  |
| 7, T4 Cr                     | Au11 Cr156 · Au32 Cr139 · Au17 Cr153 · Au13 Cr155 · Au11 Cr163      |

For a lone drill (first 30 cells, 16 angles × 5 seeds), the two ores of the best recipe are within 1:2 of each other at 31–33 of 80 spots on each T1 slot, 26 of 80 on T3 slot 5, 3–7 of 80 on T2 and 5 of 80 on T4. The natural T2 pair, **Ice + Au**, isn't a recipe; with it, T2 slot 3 whole rocks would gain 19–36 %.

**A factory at the end of one line, no meeting (`line.ts`, 180 s):**

| Line                    | Base value/s | Factory adds          | Payback at 2 400 | Bars/s into it |
| ----------------------- | ------------ | --------------------- | ---------------- | -------------- |
| Slot 0 (T1 Cu), 3 × L1  | 21.2–23.3    | +13 to +22 % (Cu+Ice) | 462–857 s        | 2.4            |
| Slot 0, 3 × L3          | 28.3–31.9    | +13 to +23 %          | 327–667 s        | 3.2            |
| Slot 2 (T1 Ice), 3 × L1 | 20.9–23.3    | +8 to +19 %           | 581–1 385 s      | 2.4            |
| Slot 2, 3 × L3          | 29.3–32.2    | +11 to +23 %          | 321–720 s        | 3.2            |
| Slot 3 (T2 Ice), 3 × L3 | 62.0–64.1    | 0 to +15 % (Cu+Au)    | 259 s – never    | 3.6–3.9        |
| Slot 4 (T2 Au), 3 × L3  | 78.8–81.7    | +2 to +7 % (Cu+Au)    | 457–1 200 s      | 3.3–3.6        |
| Slot 5 (T3 Au), 3 × L5  | 209–212      | +32 to +38 % (Au+Cr)  | 30–35 s          | 4.7–4.9        |
| Slot 6 (T3 Cr), 3 × L5  | 229–291      | +14 to +40 % (Au+Cr)  | 27–60 s          | 4.4–4.6        |
| Slot 7 (T4), 3 × L6     | 410–466      | +5 to +16 % (Au+Cr)   | 38–114 s         | 4.7–5.1        |

**Meeting two lines at one factory, against a factory on each (`meet.ts`):**

| Lines                      | Meeting adds, over two factories |
| -------------------------- | -------------------------------- |
| T1 Cu-sig + T1 Ice-sig, L1 | +0.7 to +2.1 /s (1.6–5.2 %)      |
| T1 Cu-sig + T1 Ice-sig, L3 | +0.0 to +3.2 /s (0–5.5 %)        |
| T1 Cu-sig + T2 Ice-sig, L3 | +0.6 to +2.1 /s (0.7–2.3 %)      |
| T1 Cu-sig + T2 Au-sig, L3  | +2.9 to +10.9 /s (2.7–10 %)      |

Only the T2 gold rock, which carries almost no copper, makes meeting matter. Elsewhere the reason to meet is the second factory's price (4 800), not the recipe.

**Other checks:**

- **Pacing.** The bot owns a second smelter at 3:20, 3:33 and 3:20 (seeds 1–3), with income of 36–43 /s. Slot 2 (T1 ice) opens only at 6:10–6:24, and T2 at 10:50–10:58.
- **Tray.** `.rh-tool` is 78 px (border-box) with a 28 px gap. Four items take 4 × 78 + 3 × 28 = **396 px**, over a 390 px viewport before any side gutter.
- **Claims that check out:** bar arithmetic (Cu 18, Ice 30, Au 72, Cr 180); ×3 per chunk for rock; the round-1 corrections; "most spots mix two ores and all are mostly rock" (rock is about 70 % of cells).

### Findings by rule

#### F1 (REVISE): recipes

- **Wrong tier claim.** `TIER_ORE`:
  - T2: Cu, Ice, Au.
  - T3: Ice, Au, Cr.
  - T4: Au, Cr, Cr.
  - Only **Cu + Cr** never shares a rock. Cu + Au shares T2 (though gold rocks carry 1–7 Cu cells), and Ice + Cr and Au + Cr share T3.
  - "Lines from different rocks have to meet" holds only for Cu + Au on the T2 gold slot.
- **Recipes against the veins.** Ice + Au, the pair T2 actually yields, is missing. Au + Cr comes off T3 slot 5 at a gain of 29–36 % without leaving the rock.
- **Alloy representation.** An item's value is `ORES[ore].value × mult` for a single `ore`. Neither 72 (Cu + Ice) nor 135 (Cu + Au) can be written that way with the two ores and a shared `mult`. The spec needs an alloy item: new ore ids with their own value and colour, or `{ores: [a, b]}` with an explicit value. That touches:
  - `BeltItem`, `Bar` and the sorter stocks;
  - the `deliver` event (it carries one `ore`) and the pops;
  - `inTransitValue`;
  - the validator's `isOre`;
  - the junction rule "bundles never mix values";
  - smelter bypass (`mult > 1`) and sorter routing (alloys take main).
- **Lone bars** (mult 3, and pre-logistics bars) paired into an alloy give fractions: a lone Cu bar (9) with an Ice bar (30) makes 58.5. Exclude them or round, and say which.
- **Is an alloy one item?** Two bars → one alloy halves the item count, which matters for the output belt (F2). Say so.

#### F2 (REVISE): pass-through

- **Dominant rule.** A factory never loses value and its recipe picks itself (F5), so every smelted line wants one; the 2ⁿ price only sets the order. `meet.ts` says a factory per line captures 74–100 % of the one-factory value on T1 pairs (and T1 + T2 ice), and 35–79 % with the T2 gold line. That is the "universal optimal layout" the brief warns about: "put a factory after every smelter, best line first".
- **It can lower income.** A new machine's belt is tier 1 (`base()`), 7.5 items/s. Two T3 lines bring 8.8–10.2 bars/s, and alloys remove only about 1.3 items/s, so the output backs up into both smelters and then the drills. Splicing a factory onto a smelter belt that was widened to tier 2 also cuts it back to tier 1. State this, show "full"/"‖", or have the factory take the old belt's tier.
- **Raw pass-through.** With a drill → factory link allowed, raw chunks go through a 2 400-credit machine unchanged. A newcomer who expects a factory to "make things" gets nothing, and nothing says so. Refuse raw inputs, or show "needs bars".
- **Stock.** The spec gives no stock size. Say what happens when the stock is full of one ore: does the next bar pass at once, or wait?
- **Evidence:** the bot variant's share of smelted lines that end in a factory at 20 and 30 min, and the gain per factory.

#### F3 (REVISE): intake

- One item per tick at 30 Hz is **30 items/s**, not 15. Pick one.
- **Intake never binds.** One line delivers 2.4–5.1 bars/s, and two tier-1 inputs carry at most 15. With two inputs at level 1, a factory can't be intake-limited unless both inputs are widened and carry more than 15 bars/s, which means four or more T3 lines. So "cleaning its input (sorting) pays only once it is busy" never happens before T4. Either drop this sorter job, or make the intake bind, for example with a work time per item.
- **Levels.** The spec gives no level prices, no maximum level and no Upgrade in the bubble, yet F4 relies on "3 inputs at level 3".

#### F4, F5, F6 (PASS with conditions)

- **F4:**
  - Generalise `canSplice` (owner kinds and old-target kinds) and `spliceLanesBlocked`.
  - Refuse or flag raw drill → factory (F2).
  - Give the output belt's starting tier.
  - Say where factories go in `relinkAll`'s "smelters first" order.
- **F5:**
  - The default is the recipe with the largest min(ore A bars, ore B bars) over the last 10 s, rock excluded, else Cu + Ice.
  - Held bars pass through when the recipe changes.
  - A cycle over at most four recipes is fine.
  - Recipes whose ores the inputs never carry could be shown dim.
- **F6:**
  - Price and timing are plausible. At 3:20–3:33 the factory is a slow buy (a T1 line pays back in 5–23 min); from T3 on it pays back in under a minute at n = 0, but n counts every factory ever bought, so by then it is 2 400 × 2ⁿ with n around 3–6.
  - Required: the bot variant (first factory, income at 20 and 30 min against the current 317–408 /s at 20 min, raw chains and smelters still built).
  - A tray that fits 390 px with four items.

#### S1 (PASS with conditions): filter

- **Positive-sum uses now exist**, but they are weaker than the doc implies. Pulling the scarce ore off line B into line A's factory adds exactly what merging all of line B would add, because pass-through keeps everything else. The sorter beats merging only where belt capacity binds: two T3 lines exceed a tier-1 belt (see F2). There it saves a widen step. On T1–T2 it isn't measured to beat merging anywhere.
- **Rock** is now an option with no job: no venting, and an intake that never binds. Keep it only if a dock split of rock is wanted, or drop it from the cycle.
- **Default.** "The least common ore other than rock" is the scarce side, which is right for feeding a factory.

#### S2 (PASS with conditions): merge until linked

- It resolves the round-1 trap: nothing is destroyed.
- **Hidden use.** An unlinked sorter is a free-standing two-input merger. Smelter → smelter is refused, and drill junctions sit on rims, so the sorter is the cheapest way to merge two smelter belts in open space and save a dock. From the fifth dock on, docks cost 780, 2 028, 5 273, 13 709 and 35 643. Expect players (and a greedy bot) to buy sorters mostly as mergers.
  - That may be good play, but it is the "collector" the doc defers.
  - An idle sorter will also look broken (the doc's own question).
  - State it and measure it.

#### S3 to S6 (PASS with conditions)

- **S3:** smelter → sorter → smelter and factory → sorter → factory are legal under S3 and harmless (bars and alloys pass through). Either allow them explicitly, or enforce the item rule by DFS. Add a randomised no-loop test over two-output graphs with factories.
- **S4:**
  - One test per row.
  - A splice onto a sorter's side belt while the side is unlinked: the side merges into main, so the spliced machine would get nothing. Refuse the splice, or it links the side.
- **S5:**
  - Say whether a full main stock also blocks side-bound items.
  - Say where `rr` lives.
  - Test that alloys go to main and that bars keep `mult`.
- **S6:**
  - S6's list leaves out `rr`, `fullT` and `crossT`. Post ids are keyed `-1000 - m.id * 3 - k`, and they need belt ids.
  - The "full" and "belt-limited" chips need a per-belt home.
  - Migration: belt id = machine id for old saves.
  - Rerun `tools/rockhopper-crossings-stress.ts` with sorters and factories (0 locks, 0 stalls).

#### S7 (PASS with conditions): gestures

- **A tap on empty space or a belt currently closes the bubble** (`App.ts`, the `tap` branch). "Tap selects a belt" needs:
  - a rule for two or more belts within the 12 px hit (common at the hub and at the sorter itself, where main and side start together);
  - another way to close the bubble.
- **Hit areas.** The 44 px port and the body's hit area overlap at zoomed-out levels; give the zoom range where both work.
- **Screenshot.** The required 390 px screenshot and mis-tap check stand.

#### S8 (REVISE): price and unlock

- Unlocked with the first factory (about 3:30), the sorter has no filtering use on T1–T2 that merging doesn't match, and it is cheap as a merger (S2).
- Either unlock it where capacity binds (T3, or the first factory whose input or output shows "full"), or show with the bot that the first sorter bought raises income as a filter and not only as a merger.

#### Switch and saves (REVISE)

- **The rollback path doesn't exist.**
  - `deserialize` returns `null` for any machine kind but drill and smelter (`save.ts`).
  - The current build then calls `freshState` and its autosave writes `rockhopper.save.v2`.
  - So rolling the build back **silently replaces the player's save with a fresh game**.
  - The `…pre-factories` copy survives, but only the new build reads it.
- **Fix.** Do what logistics did: save under a new key (`rockhopper.save.v3`), migrate v2 on first load, and never write or delete v2. `?restore=pre-factories` then deletes v3. Test it with the current validator.
- **The switch.** It is fine, but with factories off an existing sorter stays reachable in the bubble. Say whether its filter can still be changed.

### Clip (REVISE)

- **Colour.** Rock bars are 62–83 % of the bars on these lines (seed 1 slot 0: 330 rock, 54 Cu, 41 Ice bars in 180 s), so the "orange" and "yellow" lines are mostly lilac.
- **Alloys are rare.** One every 3–4 s on T1 + T2 Au, where copper limits the pairs to 0.1–0.4 alloys/s. The whole-factory rate rises by 3–11 /s on about 110 /s (+2.7 to +10 %), which is hard to see on the counter.
- **Beat 3 is illegal.** A level-1 factory has 2 inputs, both taken by the smelter belts. It also sends **gold** to a factory that already has more gold than copper, so the rate can't rise. A truthful beat 3 pulls the **scarce** ore (copper here), into a legal input.
- **Depletion.** T1 and T2 rocks crumble every 9–25 s, so a 30 s clip spans crumbles on both lines. The witness must log them, as the doc says.
- **A stronger, truthful candidate** (disclosed developed save): a T3 slot-5 line (Au + Cr on one rock). Dropping a factory at its end adds +32 to +38 % (about +70–80 /s on about 210 /s), with alloys every 1–2 s. Next decision: its tier-1 output belt shows "full" when a second T3 line joins, so widen, or sort off only the crystal. This shows the factory truthfully, but it doesn't show lines from different rocks meeting, because on the measured data that decision is weak.

### Round-1 required changes

| #   | Status     | Note                                                                                                                                 |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Resolved   | Merge until linked (S2); venting cut.                                                                                                |
| 2   | Open       | The unlock moved behind a factory, but there is no bot evidence, and on T1–T2 the sorter's only positive-sum use is merging (S8).    |
| 3   | Superseded | The full filter is kept because factories give ore identity a use. That is acceptable, but Rock is now an option with no job (S1).   |
| 4   | Resolved   | In the spec (S3, S4); tests are pending, and the gaps are in S3/S4 above.                                                            |
| 5   | Mostly     | S6 and S7 are specified. The alloy item, `rr`, and tap conflicts remain, and the screenshot is deferred to round 3.                  |
| 6   | Resolved   | S9.                                                                                                                                  |
| 7   | Open       | The switch is fine. The restore path fails on rollback: same key, fresh start, overwrite.                                            |
| 8   | Open       | The new clip is a factory clip. Its colour, input count and scarce-ore problems are listed above; no witness yet.                    |
| 9   | Resolved   | The doc now says rock bars earn ×3 and early lines are supply-limited. New errors: F1's tiers and F3's intake arithmetic.            |
| 10  | Partly     | Pairing with factories is argued, not measured. Measured here: meeting adds 0–10 %, and sorting beats merging only where belts bind. |

## Required changes (for Round 3)

1. **Fix F1's facts and choose recipes from the vein data.** Either make meeting real (for example Cu + Cr, the only pair that never shares a rock, plus Cu + Au; measure again), or drop "lines from different rocks have to meet". In that case, state the decision as it is: which smelted line gets the next factory.
2. **Decide on the per-line rule (F2).** Accept "a factory after every smelter" and say why it is still a decision, or give pass-through a cost. Either way, report the bot's share of smelted lines ending in a factory.
3. **Specify the alloy item end to end:** representation, value, colour, deliver event, `inTransitValue`, validator, junction rule, smelter and sorter routing, lone bars and fractions, and item count.
4. **Fix F3:** correct the intake numbers; define factory levels and prices; drop or rework "sorting pays once the factory is busy", which the measured rates never reach before T4.
5. **Output belt tier (F2, F4).** Say how a factory's tier-1 output can lower income, and how that shows. Say whether raw drill → factory is allowed.
6. **Measure the sorter's positive-sum use against merging whole lines, and its use as a merger (S1, S2, S8).** Then set the unlock and price from that, with the bot.
7. **Save under a new key** (`rockhopper.save.v3`), never writing or deleting v2, so a rolled-back build finds its save. Test it with the current validator.
8. **Fit the tray at 390 px** (four items take 396 px today). Specify belt selection when several belts are under the finger, and how to close a bubble.
9. **Rewrite the clip** with legal input counts, the scarce ore as the sorter's target, and rock-bar colour disclosed or avoided (for example T3). Witness it with settled rates and crumbles logged.
10. **Evidence before build:** the bot variant (factories and sorters: time of the first, income at 20 and 30 min, balanced share, raw chains and smelters still built), and the crossings stress tool with two-output machines.

## Open questions (round 2)

- Is a 1.5× that scales with ore value (+2.7 /s on a T1 line, +80 /s on a T3 line) the intended curve? Or should late recipes pay less?
- Is "one factory for two lines" (saving the 2ⁿ price) a sufficient reason to route lines together? Only a playtest can say whether it reads as a decision.
- Whether an idle, merging sorter looks broken at 390 px needs the screenshot and a human.
