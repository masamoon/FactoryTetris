# Rockhopper: belt crossings (proposal, 2026-09-30)

Status: **pending adversarial review** (the user chose the full AGENTS.md process for this feature). Nothing here is implemented yet.

## Why

The user, 2026-09-30: "Should players be able to build belts manually? Even if not I think being able to re-arrange them is important as right now the spaghetti looks quite messy and that organization would be an important skill expression layer. Currently I think the game lacks that skill expression layer."

What the build does today (observed in code):

- A belt is one straight segment from a machine to its target (`beltEnds`, `src/rockhopper/sim.ts`). Throughput comes only from the tier, never from length or geometry.
- Belts cross each other, overlap and pass under machines for free. A tidy factory and a tangled one earn exactly the same.
- Rearranging already exists and is free: drag to re-route, Move on drills (`moveDrill`) and smelters (`moveSmelter`). Because it has no payoff, it is cosmetic.
- Round 4 of the logistics review recorded the same structural gap: "geometry is still free (straight, free belts of any length that cross anything), and the dominant play reduces to merge tree → trunk → smelter → widen the trunk". Free drill placement (PR #16) gave position a consequence for mining, not for logistics.

Evidence of current layouts (greedy bot, seeds 1–3, measured with a scratch probe; a bot is tidier than a person because it keeps the old socket spots and nearest docks): 0 true crossings at 6 min, 1 at 12 min, 2–3 at 20 min, among 8/15/21 belts. The [developed 12-minute still](reviews/evidence/rockhopper-logistics-developed-12min.png) shows the visual mess is mostly belts converging and overlapping near the hub and passing under smelters, more than clean X crossings.

**Decision already made with the user:** no hand-drawn belts (rejected in `ROCKHOPPER_LOGISTICS.md`: fiddly on a phone). The layer has to come from making the existing free rearranging matter.

## Proposal

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Touching belts share the space.** Wherever two belts' centre lines come within **7 u** of each other (the drawn belts overlap), that stretch is a **crossing**. At a right angle it is 14 u long on each belt; the shallower the angle, the longer it gets (7 u / sin θ each side, so about 28 u at 30°), and near-parallel overlaps give a long shared stretch. Pairs of belts that share a machine (two inputs of one smelter, a junction's input and its output) never form a crossing: straight belts from one machine only meet at that machine. Collinear pairs are treated as touching along their overlap.                                                                                                                                       |
| C2  | **Bundles take turns.** A bundle may enter a crossing only if (a) no bundle of the other belt is moving through that belt's stretch, and (b) its own belt has room for it to get all the way out (the bundle ahead is at least one spacing past the exit, or the belt ends at a dock). When bundles from both belts are waiting, the one that has waited longest goes first, then the lower machine id. Overlapping crossings on one belt are entered together, all or nothing. A bundle that can't move (the front waiting at a machine that won't take it, or a bundle left inside a stretch by a re-route or move) does not hold the crossing, so a crossing can never deadlock. A crossing that covers a belt's start holds back loading the same way. |
| C3  | **The cost scales with traffic and angle, and only layout removes it.** Estimates from the belt numbers (110 u/s, a bundle every 4 ticks): two saturated belts crossing at 90° each keep about **half** their bundle rate; at 30°, about a third. A belt at 40 % load crossing another at 40 % loses almost nothing (they rarely meet). Widening does not help, because the crossing limits bundles, not chunks per bundle. Re-routing, moving a drill round its rock, moving a smelter or picking another dock does. So the skill is not "never cross" but "keep the trunks clean and put the unavoidable crossings on light lines".                                                                                                                      |
| C4  | **Signals.** Every crossing is drawn as a small riveted plate where the belts meet, so crossings are countable at a glance. A plate where bundles have waited for most of the last second shows a **"take turns" chip** (two offset chevrons, a shape rather than a hue) and bundles visibly queue at its edge. A machine whose belt is held at a crossing shows **"waits at a crossing"** in its bubble instead of "belt-limited", and its "full" chip is not shown (like the held-downstream rule), so Widen is not suggested for a problem it can't fix.                                                                                                                                                                                                |
| C5  | **Nothing is refused.** Linking, re-routing, auto-link, moves and splices behave as today. Auto-link still takes the nearest free dock, even if that crosses something; untangling is the player's decision. The existing splice refusal at a crossing ("crossing – pick one") stays.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| C6  | **Teaching.** The first time a crossing chip stays on for 3 s, a one-time label sits beside that plate: "Belts take turns here. Move or re-route to untangle." It goes when the crossing is gone or after 20 s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| C7  | **Saves.** Crossings are derived from geometry every tick and never saved. A bundle's waiting time is saved as an optional field (default 0). No migration: a v2 save keeps its layout, but a tangled save earns less from the first tick. That is disclosed in the change notes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Clip scenario (C1–C4)

- **A, 0–10 s** (fresh save, real time): unchanged. A fresh factory has no crossings.
- **B, 10–30 s** (disclosed cut to a developed save, with a headless replay as the uncut witness):
  - **B1.** Two drill chains near their belt cap run to docks on the opposite side of the hub, so their trunks cross in an X above the hub. The plate shows the take-turns chip, bundles queue on both sides, and both feeding drills show piles.
  - **B2.** The player drags the left trunk from its dock to the free dock on its own side. The X and its plate vanish, the queues drain, and the pops speed up. The shot holds long enough to show the settled rate, measured from deliveries, not the flush of the backlog.
  - **B3.** A new drill auto-links across a light line: its plate shows no chip. The next decision is whether to widen the trunk now that it runs clean.

The witness has to log the chunks/s of both trunks before and after the re-route, on real numbers.

## Evidence to gather before and after implementing

- Unit tests: two saturated tier-1 belts at 90° each deliver 40–60 % of their cap; two belts at 40 % load lose under 10 %; widening a crossed trunk doesn't raise its bundle rate; no deadlock in randomised layouts (10 000 ticks, every bundle keeps moving or is waiting at a machine); shared-machine pairs never cross; save round-trip keeps bundles' waiting time.
- Bot pacing, seeds 1–3, against the free-drill numbers (first smelter 1:12–1:36, T2 10:59–11:35). The bot is tidy, so its pace should barely move; if it slows a lot, crossings are too harsh.
- **Tangled vs tidy** (the skill gap): take the bot's 20-minute saves, swap dock assignments to cross the trunks, and measure credits/min before and after; then untangle. The gap should be clearly visible (10–40 %) without making a tangled factory useless.
- Browser screenshots at 390 px of plates, the chip, the queue and the bubble text.

## Rejected or deferred

- **Hand-drawn belts:** rejected (earlier decision, phone usability).
- **Hard rule "belts may not cross":** rejected. It would refuse links and auto-links, block moves, and with straight belts and a fixed dock arc some networks can't be drawn at all.
- **Charging per unit of length:** rejected earlier (makes experimenting costly).
- **Paid bridges** that remove a crossing's cost: deferred. They would give credits a layout sink, but first see whether untangling alone is enough.
- **Bend posts** (a cheap node dropped on a belt and dragged to route around things): deferred until the playtest shows crossings that can't be avoided.
- **Belts passing under machines:** out of scope. Still free, and still part of the visual mess; revisit after this experiment.

## Open questions for the reviewer

- Does C3's cost make tidying a real decision, or is the untangled layout obvious and solved once per save?
- Is 7 u the right reach, given the hub fan (docks about 19 u apart)?
- Does ignoring shared-machine pairs open an exploit?
- Will players read a slowdown at a plate, or only see drills piling up?
