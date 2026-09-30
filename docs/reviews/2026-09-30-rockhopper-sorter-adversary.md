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
