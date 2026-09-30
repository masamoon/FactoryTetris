# Rockhopper: free drill placement

Status: built as a reversible experiment on 2026-09-30, after one quick adversarial review round (the user chose that level). It is not evidence of fun or balance; the human playtest is still to do.

## Why

The user, 2026-09-30: "I also am not a fan of drills having pre approved placing, I think there should be decision making in where to place them." Round 4 of the logistics review said the same thing from the other side: where things sit cost nothing, so the dominant play was one merge tree into one widened trunk.

## Rules

| #   | Rule                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Anywhere on the rim.** A drill sits on its rock's rim (rock radius + 18 u) at any angle. There are no sockets.                                                                                                                                         |
| F2  | **Spacing, not a count.** Drill centres stay at least 36 u apart, on one rock or across neighbours, and at least a smelter-and-drill gap from smelters. The rim's length decides how many fit (about 13 on a T1 rock). Crowding a rock drains it faster. |
| F3  | **Position decides what it mines.** A drill always digs the nearest remaining cell, so one aimed at a copper or ice vein brings that ore in first. While dragging, the ghost outlines the first six cells it would dig.                                  |
| F4  | **Veins stay put.** A slot's ore layout comes from a generation-free seed and a threshold over the slot's whole disc, so every respawn has its veins in the same places; only the outline changes. Richness still depends on the tier only.              |
| F5  | **The game finds the footing.** A drop slides along the rim by at most one drill spacing to clear a neighbour. With no room there it is refused, with "no room here" above the ghost.                                                                    |
| F6  | **Smelters.** Sockets are no longer reserved. A smelter can't land on a drill, and a drill can't land on a smelter.                                                                                                                                      |
| F7  | **Saves.** `rockhopper.save.v2` drills now store `angle`. A drill saved with the old `socket` index loads at that socket's angle, so nothing moves.                                                                                                      |

Position also sets the logistics, with no new rule: which side of the rock a drill sits on sets its belt's direction and length, which neighbours it can chain into, and where a smelter can be spliced.

## Pacing (greedy bot; an upper bound, not human evidence; seeds 1–3)

The bot keeps to the old socket spots and counts: it can't weigh crowding against the respawn wait, so it measures the same economy as before.

| Beat              | Time        |
| ----------------- | ----------- |
| First smelter     | 1:12–1:36   |
| First drill chain | 2:23–2:44   |
| T1 fully unlocked | 6:22–6:43   |
| T2                | 10:59–11:35 |

The earlier smelter comes from the relaxed smelter clearances and the new vein threshold, not from crowding.

## Open

- The human playtest: does aiming at veins read on a 390 px phone, and does crowding feel like a choice or a trap?
- The bot never crowds a rock, so the pace of a crowding strategy is unmeasured.
