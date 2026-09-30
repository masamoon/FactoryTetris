# Rockhopper — logistics revision (proposal, 2026-09-30)

Status: **pending adversarial review.** Nothing here is adopted until it passes.

## User feedback (2026-09-30)

> I really love the art and visual identity of the new version. However it needs to lean more heavily into automation and logistics. Right now it feels more like an incremental game which is fine but the player needs to have more of a say in logistics decisions. Another thing I noticed is that it's very hard to see when a smelter is actually placed and not just hovering over the belts.

## What is wrong now (observed in the build)

Evidence: [12-minute bot save](reviews/evidence/rockhopper-before-logistics-12min.png) and [placing a smelter in it](reviews/evidence/rockhopper-before-logistics-placing-smelter.png). Both are developed-save stills from the greedy bot, not a human session.

- **The game routes for the player.** New machines auto-link to the nearest free dock or smelter; a smelter placed at a full hub splices itself into a line; unlinked machines relink themselves. The only routing input is the optional drag-to-reroute, and the bot barely needs it.
- **Belts never bind.** Every belt carries one machine's output, and its capacity scales with that machine's level. A belt can never be the bottleneck, so a belt is never a decision.
- **Smelters are ×3 multipliers with an input cap.** They don't change how much has to be moved, so where a smelter sits doesn't matter; only how many inputs it has.
- **So the decisions are purchases.** The factory is "buy the best-value upgrade", and the layout is automatic spaghetti that converges on the hub.
- **Placed and hovering smelters look alike.** The ghost is the same sprite at 75 % opacity. Placed smelters sit on top of unrelated belts with no footprint, so they also look like they float. Nothing marks the moment of landing.

## Proposed decisions

Every decision keeps the art, the laser opening, slot-anchored drills, fixed slots and tiers, docks, crumble and tow, and the truthful-juice rules.

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Merge onto belts.** Drag from a machine and drop on any belt to join that belt at the nearest point; a small junction node appears. Everything downstream of the junction carries both streams. A join cannot create a loop (checked by walking downstream). At a junction, a waiting bundle tops up a passing bundle that has room, or drops into a gap of at least one spacing; otherwise it waits, so the feeder backs up. Joins are stored as a fraction of the host belt and follow it when things move.                                                                                                                 |
| L2  | **Belts have capacity, and the player buys it per line.** Belt speed becomes a constant 110 u/s (readable; spacing 13 u, so about 8.5 slots/s). A belt's **tier** (1–4) is the most chunks a slot can hold, so capacity is about 8.5 / 17 / 25 / 34 chunks/s. Machine levels no longer change belts. **Tap a belt** for its bubble: tier, load, and _Upgrade_. The cost scales with the belt's length (≈ 2 × length/10 × 3^(tier−1) credits, tuned with the bot), so long trunks are expensive to widen. For scale: a level-1 drill on a T1 rock makes about 3 chunks/s, so three merged level-1 drills saturate a tier-1 belt. |
| L3  | **Smelters compress.** A smelter turns **2 chunks of the same ore into 1 bar worth 6×** one chunk (still ×3 per chunk, but half the items to move). Bars that reach a smelter pass straight through. The input cap is removed: any number of belts may end at a smelter, taken round-robin into a 6-chunk queue (6 guarantees a pair among 5 ores). Smelting time is per bar. So _where_ a smelter sits matters: before a long shared trunk it halves the load, and that trunk is cheaper to leave narrow.                                                                                                                      |
| L4  | **Drop a smelter on a belt to put it in that line.** While placing or moving a smelter, the belt under the drop point highlights and shows the cut. Dropping there splices the smelter into that belt: upstream now ends at the smelter, and the smelter's output takes over the rest of the line, including any junctions downstream of the cut. Dropped in open space, the smelter's output auto-links to the nearest free dock, or shows "no link". The old automatic splice at a full hub is removed.                                                                                                                       |
| L5  | **Auto-link only to free docks and smelters, never to belts.** A new drill still auto-links to the nearest free dock or smelter, so the first three drills need no routing. The fourth drill (about one minute in) finds the docks full, shows "no link", and a tutorial hand shows dragging its output onto a belt. Unlinked machines still retry when a dock frees up.                                                                                                                                                                                                                                                        |
| L6  | **Layout is free; capacity costs.** Laying a link (auto or dragged), re-routing, joining and moving are free, so experimenting costs nothing. Only belt tiers, docks, machines and upgrades cost credits. Selling still refunds 50 %; selling a machine drops the items on its belt, and machines joined to it become unlinked.                                                                                                                                                                                                                                                                                                 |
| L7  | **Bottlenecks are visible where they happen.** A drill with a full buffer stops its bit and shows its waiting chunks piled beside it. A backed-up belt's dashes stop and turn coral from the stall point upstream. A junction that is waiting pulses coral. A belt running at over 90 % of capacity shows a thin amber edge.                                                                                                                                                                                                                                                                                                    |

Presentation, for the smelter-placement complaint:

| #   | Decision                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **The ghost reads as floating.** While placing or moving, the machine is drawn as a flat tinted hologram (no ink outline, mint for valid, coral with an ✕ for invalid), lifted about 14 u above its footprint and bobbing, with a shadow ellipse and a crosshair on the footprint. When over a belt, that belt glows yellow with inward arrows at the cut (L4). |
| P2  | **Placed machines read as bolted down.** Every smelter sits on a dark octagonal pad with bolts and a drop shadow, drawn above belts so unrelated belts visibly pass _under_ it. Build and move play a landing: a short drop, a squash, a dust ring and a thunk.                                                                                                 |
| P3  | **Status lights.** Each smelter has a light: grey idle, yellow working, coral blocked (output full).                                                                                                                                                                                                                                                            |

## Why this answers "more say in logistics"

After L1–L7, from about the fourth drill onward the player keeps making spatial decisions that the game no longer makes for them:

- Which line does this drill join? Merge nearby for free, or save up for a new dock.
- Where does this line get compressed: at the rock, or at the hub?
- Which segment gets widened? Upgrades are priced by length.
- Where is the jam, and is it the belt, the smelter or the dock?

Unlocking the upper tiers makes these problems harder rather than bigger. T2–T4 lines are long and cross the T1 field, so a player can widen one long trunk, compress at the rock, or merge into a T1 line and widen only its last segment.

## Clip scenario (for the short-form gate)

- **A, 0–10 s** (fresh save, real time): unchanged. Hold the rock, chunks stream in, drag the first drill onto it, and its belt links to a dock.
- **B, 10–25 s** (disclosed cut to a developed save):
  - Three drills merged on one line. The belt is coral and stalled, and the drills stand with chunk piles.
  - The player drags a smelter; the hologram floats over the line and the line glows at the cut.
  - Drop: the smelter thunks onto its pad, and the line now runs through it. Pairs of chunks go in and single bars come out. The stall clears from the smelter upstream, and the pops jump.
  - The player taps the trunk and widens it. The bundles on it visibly double.
  - Next decision: a new drill's "no link" badge.

## Rejected or deferred

- **A rock sifter** (drop rock filler to save belt capacity) is deferred until L1–L7 are playtested.
- **Hand-drawn polyline belts** are rejected: fiddly on a phone, and straight links already read well.
- **Charging per unit of belt length** is rejected: it makes experimenting costly (see L6).
- **Ore-specific recipes and alloys** are deferred: too much at once.
