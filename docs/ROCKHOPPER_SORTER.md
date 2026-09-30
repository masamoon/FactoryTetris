# Rockhopper: the sorter (proposal, 2026-09-30)

Status: **draft, pending review.** The user picks the review level. No runtime code is written until the design passes. Factories come after this, on top of it (see [Next: factories](#next-factories)).

## Why

The user, 2026-09-30: "what more logistics can we add? factories? tunnels?" They picked the sorter first and factories second from the proposal in the project thread. The goal they set earlier is that tidy routing is how a player shows skill ([ROCKHOPPER_CROSSINGS.md](ROCKHOPPER_CROSSINGS.md)).

What the build does today (observed in code):

- **Every machine has exactly one output belt** (`MachineBase.out`, `src/rockhopper/sim.ts`). The factory is a tree whose root is the dock arc, so every trunk converges on the hub. Posts and dock swaps tidy the approach, but the shape is always "many lines → hub".
- **Most of what a belt carries is plain rock.** T1 rocks are 26 % ore (`TIER_ORE`), so about three quarters of a T1 line's chunks are rock worth 1, against copper at 3 and ice at 5. By value, rock is about 45 % of a T1 line (0.74 × 1 against 0.26 × 3.5; estimated from config, not measured). On T4 rock is half the chunks but about 3 % of the value.
- **Smelters spend most of their time on rock.** A smelter pairs any two chunks of one ore (`smeltersTick`), rock included, and a level-1 smelter takes in about 8.7 chunks/s. On a T1 line, about 74 % of that capacity turns rock into ×6 rock bars.
- **Belts spend most of their capacity on rock too.** A tier-1 belt carries 7.5 chunks/s whatever they are.

So "what is on the belt" is never a decision. The sorter makes it one, and it is the first machine with two outputs, which gives routing a branch instead of only a merge.

## Rules

| #   | Rule |
| --- | ---- |
| S1  | **A sorter splits one ore off a line.** It takes up to 2 input belts (like a drill junction) and has two output belts: the **main** belt, which carries everything else, and the **side** belt, which carries only its **filter ore**. The filter starts as **Rock**. Tapping the sorter opens its bubble, and the filter chip there cycles Rock → Copper → Ice → Gold → Crystal. The chosen ore is shown as a coloured chip on the sorter. Bars (from smelters) are never sorted; they always take the main belt. |
| S2  | **It is placed like a smelter.** Drag from the tray and drop on a belt to splice it in (same snapping, clearances and "belt blocked" refusals as smelters, `canSplice`), or into open space and link a drill to it. After a splice, the upstream belt feeds the sorter, and the sorter's main belt takes the old belt's target and the posts after the splice point. |
| S3  | **Target matrix.** Inputs: drills and sorters (a smelter's bars need no sorting, so smelter → sorter is refused as "already smelted"). Main belt and side belt: a free dock, a smelter with a free input, a drill with a free input, or another sorter. No loops, checked through both belts. The two belts of one sorter may not end on the same machine. |
| S4  | **An unlinked side belt vents.** When the side belt has no target, the filtered ore is thrown off the sorter as a small grey puff and earns nothing. So a sorter works the moment it lands, and linking the side belt is an upgrade the player chooses. The main belt never vents: unlinked, it backs up like any belt. Auto-link gives the main belt a free dock like any machine, and never links the side belt. |
| S5  | **Flow.** The sorter keeps two stocks of 6 chunks (main and side). Intake is round-robin over its inputs, one chunk at a time, as many per tick as the matching stock has room for, so it is never the throughput limit on its own. A chunk whose stock is full waits on its input belt, so a backed-up side belt holds up the line (the side belt's "‖" and frozen dashes show it). Each stock loads its own belt with the usual 4-tick cadence. |
| S6  | **Both belts are ordinary belts.** Each has its own tier, widened separately from the bubble (the bubble shows "Widen main" and "Widen side"), priced by the global tier count. Each can take up to 2 bend posts, is re-routed by dragging from its end on the sorter, takes part in crossings and must keep clear lanes. A dock swap works on either. |
| S7  | **Price and unlock.** Price 400 × 2ⁿ for n sorters owned (to be tuned with the bot). Selling refunds 50 %, and heals the line the way selling a smelter does, using the main belt's target; the side belt's target loses that input. **Unlock:** the sorter joins the tray as a third item once the player owns a smelter. This is one predicate (`sorterUnlocked(s)`), kept separate so the tech tree being discussed in the project can replace it. |
| S8  | **Saves.** A new machine kind `sorter` with an optional `side` belt and a `filter` ore. Saves without sorters load unchanged. No migration and no new save key; old builds refuse a save that contains a sorter (checked by the v2 validator test). |
| S9  | **No switch.** Unlike the earlier experiments, the sorter changes nothing that already exists: a player who never buys one plays the current game. |

Invariants that change in AGENTS.md: "each machine has exactly one output" becomes "each machine has one output, except a sorter, which has a main and a side output". Every loop over belts (`beltPath`, crossings' `segmentsOf`, lanes, relayout, rendering, `inTransitValue`) walks both belts of a sorter.

## The decisions it gives the player

- **Sort before a smelter, or not.** A sorter in front of a smelter sends it only ore, so one smelter can serve about three T1 lines' copper instead of one line's rock and copper (estimate; to be measured). Rock goes to a dock raw or is vented.
- **Where on a line to sort.** Sorting near the drills frees capacity on the whole trunk (a tier-1 trunk carrying only T1 ore holds about four times as many drills' worth of ore). Sorting near the hub saves nothing on the trunk.
- **What to do with the rock.** Vent it (free, loses about 45 % of a T1 line's value), spend a scarce dock on a rock belt, or merge several rock belts through a junction onto one dock. Late in the game, T3/T4 rock is worth so little that venting is nearly free, so sorting becomes the default there.
- **Routing the branch.** Each linked side belt is one more belt to fit through the factory, across the trunks it just split from. This is where posts, dock swaps and crossing plates start to matter in a way that a pure tree towards the hub never asks for.
- **Against Widen.** Widening a belt doubles its rate for a step price; a sorter can raise how much ore a belt carries by up to about four times on T1 but costs a machine and the rock's value. Neither dominates for every line; the bot will show where the crossover is.

## Clip scenario

- **0–10 s (developed save, disclosed).** One T1 line of three drills runs into a smelter that shows "‖" (blocked). The belt is mostly lilac rock with a few orange copper chunks, and the smelter spits out lilac rock bars.
- **10–20 s.** The player drags a sorter from the tray and drops it on the line near the drills. It lands, the chip shows Rock, and lilac chunks start puffing off the side while the main belt goes orange. The smelter's "‖" clears, and it starts turning out orange copper bars.
- **20–30 s.** The player drags the sorter's side belt to a free dock. The puffs stop, a lilac belt runs to the hub, and the counter's rate goes up again. The trunk now has room for a fourth drill: the next decision.

Numbers for each beat come from a witness script before the clip is claimed (like `tools/rockhopper-clip-b.ts`).

## Evidence to collect before building

- **Sim witness:** the clip line (three T1 drills → smelter) with no sorter, a sorter venting, and a sorter with a docked side belt; income over 120 s before the rock crumbles, and smelter utilisation on ore.
- **Bot:** a bot variant that buys sorters, to check pace (first sorter time, 20-minute income) and that raw chains and smelters still get built.
- **Stress:** `tools/rockhopper-crossings-stress.ts` with sorters, posts and plates; 0 locks or stalls.

## Questions for the reviewer

- Is venting (S4) a dominant choice that makes the side belt pointless, or a fair trade?
- Is the filter cycle (S1) worth its UI before factories exist, or should v1 filter rock only?
- Does a third tray item cost too much on a 390 px screen?
- Should the two belts share one tier to keep the bubble simple?

## Rejected or deferred

- **Tunnels or bridges:** deferred. Bend posts already make most crossings avoidable (11 plates → 2 in the prepared save), and a free underpass would remove the crossing puzzle. Revisit only if the playtest shows the hub knot can't be untangled.
- **A splitter by ratio (half and half):** deferred; the sorter covers the useful case and reads better in a clip.
- **A collector (3–4 inputs into one trunk):** deferred; drill junctions already merge two.

## Next: factories

After the sorter lands, a **factory** takes bars of two different ores and makes an alloy worth more than both bars together (for example copper + ice). Because each rock mixes its ores on one belt, feeding a factory means sorting one ore off a line and routing it to meet another, often from a different rock. That gives the layout a destination other than the hub. It gets its own design doc and review after the sorter.
