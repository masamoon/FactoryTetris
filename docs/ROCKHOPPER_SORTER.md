# Rockhopper: factories and the sorter (proposal, revision 2, 2026-09-30)

Status: **draft revision 2, pending round 2.** The user chose the full AGENTS.md review process for the sorter and one round for factories. Round 1 found that a sorter on its own has no positive-sum use (see [the review](reviews/2026-09-30-rockhopper-sorter-adversary.md)). This revision therefore pairs it with factories, which are what give ore identity a use. The user chose to design them together (2026-09-30), and the combined design goes through the full process. No runtime code is written until the design passes.

## Why

The user, 2026-09-30: "what more logistics can we add? factories? tunnels?" They picked a sorter first and factories second. The goal they set earlier is that tidy routing is how a player shows skill ([ROCKHOPPER_CROSSINGS.md](ROCKHOPPER_CROSSINGS.md)).

What round 1 established (simulation, not playtest):

- **A bar pays ×3 per chunk whatever the ore**, rock included (`BAR_VALUE` 6 for two chunks, and rock is worth 1). Smelting rock earns what shipping raw copper does, so there is nothing to gain from keeping rock out of a smelter unless the smelter is the bottleneck. When it is, a 90-credit upgrade beats a sorter.
- **Venting rock is a trap early and an automatic rule late.** It cut the clip line's income by 46–57 % on T1 and cost only 3–8 % on T3/T4.
- **Early T1 lines are limited by supply, not by belts.** A rock is spent in about 9.5 s, then the tow takes 8 s.

What this revision adds, measured for this draft (`generateRock`, seeds 1–3, the first 25 cells a drill at each of 8 rim angles reaches; `/tmp/claude-0/sorter-r2/veins.ts`, not kept in the repo):

- **Where a drill sits already partly picks its ore.** Ore types lie in veins (`TIER_ORE` plus the slot's signature, placed by a noise field). Some spots are nearly pure (for example "Au14", "Au19" and "Ice12" on T2; "Cu12" and "Cu9+Ice2" on T1), but most spots mix two ores, and every spot is mostly rock.
- **Nothing in the game cares which ore arrives**, so vein placement changes only how much value arrives, never where a line should go.

So the missing piece is a machine that wants **specific ores**. That makes where a line goes a decision, and gives the sorter a job: pulling one ore off a mixed line and sending it somewhere else.

## Factories (F)

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **A factory joins two bars of different ores into an alloy.** Each factory has one recipe, a pair of ores, shown as two coloured pips on it. An alloy is worth **1.5×** its two bars together (Cu + Ice: 18 + 30 = 48 → 72). Recipes: **Cu + Ice** (available from T1), **Cu + Au**, **Ice + Cr** and **Au + Cr** (these need ores from different tiers, so lines from different rocks have to meet). |
| F2  | **Anything else passes through.** Raw chunks, rock bars, bars that aren't in the recipe, and recipe bars left unpaired for `LONE_WAIT` go on to the output unchanged. A factory never destroys value and never blocks on a wrong item, so dropping one can't lower income. It only raises income when both of its ores arrive, in about equal numbers.                                                |
| F3  | **The limit is intake.** A factory takes in at most one item per tick per level step (level 1: 15 items/s, matching a tier-2 belt), and items passing through use that intake too. So a factory fed rock bars and unmatched bars runs below its capacity, and cleaning its input (sorting) pays only once it is busy.                                                                                 |
| F4  | **Placement and links.** It is placed like a smelter (tray drag, splice onto a belt, or open space) with the same clearances and lane refusals. It has up to 2 inputs (3 at level 3) and one output. Inputs: smelters, drill junctions and sorters. Output: a dock, a drill junction or a sorter; never a smelter or another factory.                                                                 |
| F5  | **The recipe** is picked in the factory's bubble (a two-pip chip; tapping it cycles the unlocked recipes). It starts as the recipe whose ores its input belts carried most in the last 10 s, else Cu + Ice.                                                                                                                                                                                           |
| F6  | **Price and unlock.** 2 400 × 2ⁿ (to tune with the bot). Unlock: the tray shows it once the player owns 2 smelters, through one predicate `factoryUnlocked(s)` that the tech tree being discussed can replace. Recipes beyond Cu + Ice unlock with the slot that first offers their second ore.                                                                                                       |

## Sorter (S), revised

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **A sorter pulls one ore off a line onto a side belt.** It has up to 2 inputs, a **main** output and a **side** output. Its filter is an ore (Rock, Cu, Ice, Au, Cr; it starts as the ore its inputs carry least of, other than rock). Bars count by their ore, so a sorter works before or after smelting. Alloys always take main.                                                                                                                                  |
| S2  | **An unlinked side belt merges back into main** (round 1, S4 option a). A sorter does nothing until its side belt is linked, so it never destroys value and never becomes a trap. There is no venting.                                                                                                                                                                                                                                                                |
| S3  | **Target matrix.** Inputs: drills, smelters, factories and sorters. Main and side outputs: a free dock, a smelter or factory with a free input, a drill junction, or another sorter. Loops are checked through both belts (a depth-first search over every output). The two belts may not end on the same machine; converging again further down is allowed.                                                                                                          |
| S4  | **Splice table.** A sorter or factory may splice onto any belt a smelter may, and also onto a smelter's, factory's or sorter's output. A smelter may splice onto a sorter's main or side belt. The lane check covers every new belt. Each row gets a test.                                                                                                                                                                                                            |
| S5  | **Flow.** Two stocks of 6 items, each `{ore, mult}`. Intake is round-robin over the inputs, as much per tick as the matching stock has room for. A full side stock holds the input belt even if the next item is for main (head-of-line); the side belt shows "‖", and widening it is the fix. Tested.                                                                                                                                                                |
| S6  | **Data model.** Per-belt state (`tier`, `tierBought`, `cd`, `full`, `wait`, `heldAgo`, `cross`) moves from the machine onto `Belt`, and each belt gets an id separate from its machine's. Crossings key segments and posts by belt id. A sorter's main and side belts **do plate each other** when they touch away from the sorter (the shared-machine exemption near the sorter still applies). Save migration fills belt ids and state from the old machine fields. |
| S7  | **Gestures at 390 px.** The side belt leaves from a visible port on the sorter's rim, with its own 44 px hit area; dragging from the port re-routes the side, and dragging from the body re-routes main. Tapping a belt selects it, and the bubble shows one Widen for the selected belt. A 390 px screenshot with a mis-tap check is required before round 3.                                                                                                        |
| S8  | **Price and unlock.** 300 × 1.6ⁿ. Unlock: once the player owns a factory, through `sorterUnlocked(s)` (swappable for the tech tree). A sorter has no level.                                                                                                                                                                                                                                                                                                           |
| S9  | **Selling.** Heal-on-sell uses main's target, as for other machines. If the sold machine was fed by a sorter's side belt and that sorter is the heir, the side takes the target only if the matrix allows it (not the same machine as main); otherwise the side unlinks and merges into main. Tested with sorter → drill → sorter and with side → factory.                                                                                                            |

## Switch and saves

- A menu switch, **"Factories: on/off"**, on by default. Off hides both tray items; existing factories and sorters keep working.
- Saves: new machine kinds, optional fields. Before the first factory or sorter is saved, the untouched save text is copied to `rockhopper.save.v2.pre-factories`, and `?restore=pre-factories` restores it, the same pattern as the logistics experiment. A test covers loading, restoring, and a sorter whose side is missing, malformed or points at itself.

## The decisions it gives the player

- **Which lines meet.** A Cu + Au factory needs copper from T1 (or a copper spot on T2) and gold from a T2 gold vein, so two lines from different rocks have to cross the map to one spot, instead of each running straight to the hub.
- **Where to put drills on a rock.** A drill on a gold vein feeds the gold side of a recipe; one on a mixed spot needs a sorter.
- **What to sort.** Pull gold off a mixed T2 line towards the factory and let the rest go on to the hub; or pull rock off a line that feeds a busy factory.
- **Where the factory sits.** Close to the hub (short output, long inputs) or out in the field (short inputs, one long alloy belt); every added belt competes for crossing-free routes.
- **Against smelter upgrades and widening.** The factory's 1.5× is on top of smelting, but only for balanced pairs; a lopsided pair wastes most of it.

## Clip scenario (revision 2)

- **0–10 s (developed save, disclosed).** Two lines run straight to the hub: an orange copper line and a yellow gold line from a T2 vein, each through a smelter. The counter ticks steadily.
- **10–20 s.** The player drags a factory into the space between the lines and re-routes both smelter belts into it. Orange and yellow bars meet and fuse into alloys, bigger pops land at the hub, and the rate goes up.
- **20–30 s.** A third line (mixed ice and gold) runs past. The player drops a sorter on it, sets it to gold and drags the side port to the factory. Gold peels off, the factory's pips both light up, and the rate rises again. The next decision: a crossing plate where the side belt crosses the copper line.

Each beat's numbers come from a witness script (settled rates before and after, cells remaining and crumbles logged), like `tools/rockhopper-clip-b.ts`, before the clip is claimed.

## Evidence to collect before building

- A sim witness for the clip line, with and without the factory and the sorter, logging crumbles.
- A bot variant that buys factories and sorters: time of the first factory, income at 20 and 30 min, the share of factories whose pair is balanced, and whether raw chains and smelters are still built.
- The crossings stress tool with factories, sorters, two-output belts, posts and plates: 0 locks or stalls.

## Questions for round 2

- Does pass-through (F2) make "put a factory at the end of every line" a universal rule?
- Is 1.5× enough to pull lines across the map, or so much that nothing else matters?
- Should recipes be fixed per factory, or should a factory pair any two different ores?
- Is merge-until-linked (S2) clear on screen, or does an idle sorter just look broken?

## Rejected or deferred

- **Venting** (round 1, S4): cut.
- **Tunnels or bridges:** deferred. Bend posts already make most crossings avoidable, and a free underpass would remove the crossing puzzle.
- **A splitter by ratio**, **a collector** with 3–4 inputs: deferred.
