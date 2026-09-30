# Rockhopper: free drill placement

Status: built as a reversible experiment on 2026-09-30, with one quick adversarial review round after the build (the user chose that level; record below). It is not evidence of fun or balance; the human playtest is still to do.

## Why

The user, 2026-09-30: "I also am not a fan of drills having pre approved placing, I think there should be decision making in where to place them." Round 4 of the logistics review said the same thing from the other side: where things sit cost nothing, so the dominant play was one merge tree into one widened trunk.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Anywhere on the rim.** A drill sits on its rock's rim (rock radius + 18 u) at any angle. There are no sockets.                                                                                                                                                                        |
| F2  | **Spacing, not a count.** Drill centres stay at least 36 u apart, on one rock or across neighbours, and at least a smelter-and-drill gap from smelters. The rim's length decides how many fit (about 13 on a T1 rock). Crowding a rock drains it faster.                                |
| F3  | **Position decides what it mines.** A drill always digs the nearest remaining cell, so one aimed at a copper or ice vein brings that ore in first. While dragging, the ghost outlines the first six cells it would dig.                                                                 |
| F4  | **Veins stay put.** A slot's richness field comes from a generation-free seed, so veins stay in nearly the same places after every respawn; only the outline changes. Each rock still takes exactly its tier's ore share from its own cells.                                            |
| F5  | **The game finds the footing.** A drop slides along the rim by at most one drill spacing to clear a neighbour. With no room there it is refused, with "no room here" above the ghost.                                                                                                   |
| F6  | **Smelters.** Sockets are no longer reserved. A smelter can't land on a drill, and a drill can't land on a smelter.                                                                                                                                                                     |
| F7  | **Saves.** `rockhopper.save.v2` drills now store `angle`. A drill saved with the old `socket` index loads at that socket's angle, so nothing moves. A drill with no usable angle, or overlapping another machine, is re-seated at the nearest free rim spot instead of losing the save. |

Position also sets the logistics, with no new rule: which side of the rock a drill sits on sets its belt's direction and length, which neighbours it can chain into, and where a smelter can be spliced.

## Pacing (greedy bot; an upper bound, not human evidence; seeds 1–3)

The bot keeps to the old socket spots and counts: it can't weigh crowding against the respawn wait, so it measures the same economy as before.

| Beat              | Time        |
| ----------------- | ----------- |
| First smelter     | 1:12–1:36   |
| First drill chain | 2:23–2:44   |
| T1 fully unlocked | 6:22–6:43   |
| T2                | 10:59–11:35 |

These are slightly earlier than the logistics build (first smelter 1:35, T2 11:30–11:39), from the relaxed smelter clearances and the moved veins, not from crowding.

## Review (one quick round, 2026-09-30)

| Rule | Verdict | Resolution                                                                                                                                                                                                          |
| ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | PASS    | No rim reaches a neighbour's body or the hub.                                                                                                                                                                       |
| F2   | REVISE  | Open: crowding a rock may dominate (13 drills fit on a T1 rock; about 10 cells/s against 5.9 with 3). Needs a crowding bot and a tractor sweep.                                                                     |
| F3   | REVISE  | Open: a rock's total yield is fixed (the crumble sends the rest raw), so aiming changes order and belt-vs-crumble share only, and 6+ drills cover every direction. Needs best-vs-worst angle in credits per minute. |
| F4   | REVISE  | Fixed: the first build used a disc-wide threshold, which let the ore share drift per respawn (breaking "richness by tier only"). Ore is ranked within each rock again, on the fixed richness field.                 |
| F5   | PASS    | Only rim arcs with room glow now.                                                                                                                                                                                   |
| F6   | PASS    | Also fixed: a smelter can no longer be built on a hidden rock's body.                                                                                                                                               |
| F7   | PASS    | Fixed: a null angle re-seats the drill instead of dropping the save, and overlaps are pulled apart on load.                                                                                                         |

The segment-A command log predates this change (its `buildDrill` arguments are socket indexes) and is marked as such.

## Open

- The human playtest: does aiming at veins read on a 390 px phone, and does crowding feel like a choice or a trap?
- The bot never crowds a rock, so the pace of a crowding strategy is unmeasured (F2).
- How much aiming is worth (F3), and whether fixed veins make one layout per save solved forever.
