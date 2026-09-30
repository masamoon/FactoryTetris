# Rockhopper logistics revision: adversarial reviews (2026-09-30)

User feedback: the game should lean harder into automation and logistics, with the player having more say in logistics decisions. Separately, it is hard to see whether a smelter has been placed or is still hovering over the belts. The proposal is [../ROCKHOPPER_LOGISTICS.md](../ROCKHOPPER_LOGISTICS.md). Every verdict below comes from an independent adversarial agent. None of it is evidence of enjoyment or balance for human players.

## Round 1: revision 1

| #    | Verdict | Main finding                                                                                                                                                                                                                                                                     |
| ---- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1   | REVISE  | Host traffic always wins at a junction, so once the host is saturated, feeders starve in an order the player cannot see. "A belt" is undefined once it has joins. Selling the host cascades "no link". Joins over rocks cannot be tapped.                                        |
| L2   | REVISE  | Pricing tiers by length is exploitable: widen a short link, then re-route it for free (about 25× cheaper). Late in the game it becomes a chore. Drill upgrades from level 4 are silently capped by a tier-1 belt. Belts near the hub are 11 px apart, too close to tap reliably. |
| L3   | REVISE  | With no input cap, together with L5 and L6, one layout always wins (a smelter per rock), and the game routes again. A level-1 smelter (4 chunks/s) jams a tier-1 line (8.5/s). The "6 guarantees a pair" rule is fragile.                                                        |
| L4   | REVISE  | Crossings, the hub fan (almost every point there is on a belt), moving a spliced smelter, and selling one are all unspecified.                                                                                                                                                   |
| L5   | REVISE  | Auto-link to docks only. The first dock-less machine is the smelter at about 1:24, not a fourth drill at one minute.                                                                                                                                                             |
| L6   | REVISE  | Free layout is fine once the L2 exploit and the sell rules are fixed.                                                                                                                                                                                                            |
| L7   | REVISE  | A belt that ends at a dock never stalls. "Saturated" and "blocked" need separate signatures. Coral and amber clash with copper and gold, so a non-hue cue is needed.                                                                                                             |
| P1   | REVISE  | A mint hologram gets lost on mint belt dashes. Pops hide the ghost. The crosshair must be the exact splice point.                                                                                                                                                                |
| P2   | PASS    | Notes: a light rim on the pad, and visible in-ports.                                                                                                                                                                                                                             |
| P3   | PASS    | Note: pair the status colour with a shape.                                                                                                                                                                                                                                       |
| Clip | REVISE  | Segment B contradicts the simulation: a dock-bound belt can't stall, the splice doesn't clear the jam, and a doubled-bundle flush is presented as a sustained gain.                                                                                                              |

Conditions for a PASS:

- fair junctions, one owner per segment, and loop checks;
- global tier pricing that follows the belt, with a test that re-routing gains nothing;
- auto-link to docks only;
- a smelter input cap, and level-1 smelter intake at least one tier-1 belt;
- a bot run showing raw joins are still built;
- splice rules covered by tests;
- onboarding on the first dock-less machine;
- separate L7 signatures with non-hue cues;
- a cream ghost, with pops dimmed while placing;
- save migration that preserves credits;
- a clip staged from real numbers, with an uncut witness;
- a small human playtest, recorded separately.

## Round 2: revision 2 (junctions as machines)

| #         | Verdict | Main finding                                                                                                                                                                             |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1        | REVISE  | Drills have no input cap, so a star into one collector always wins. A chain would freeze on every crumble and tow. The zipper pointer isn't specified, and neither is the target matrix. |
| L2        | REVISE  | `n` must count tiers currently owned. Migrated tiers must not inflate it. Smelters need Widen too.                                                                                       |
| L3        | REVISE  | Intake of one chunk per tick caps a smelter at 30/s, below a tier-4 belt. Pacing must be re-derived.                                                                                     |
| L4        | REVISE  | 8 u is 4.4 px at zoom 0.55: tolerances must be in screen space, with a snap. Clearances need numbers. A recovery hand is needed.                                                         |
| L5        | PASS    | —                                                                                                                                                                                        |
| L6        | PASS    | Depends on the L2 rule for `n`.                                                                                                                                                          |
| L7        | REVISE  | Distinct glyphs for saturated and blocked, 1 s hysteresis, and the chip on the machine that loads the belt.                                                                              |
| P1        | PASS    | —                                                                                                                                                                                        |
| Clip      | REVISE  | In B1 all three drills pile up. B2 runs past the rock's life and must treat depletion honestly.                                                                                          |
| Migration | REVISE  | Keep old smelter links over the new caps. Tier baseline for `n`. Keep a v1 backup.                                                                                                       |

## Round 3: revision 3

| #         | Verdict        | Notes                                                                                                                                                               |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1        | PASS           | —                                                                                                                                                                   |
| L2        | PASS           | —                                                                                                                                                                   |
| L3        | PASS           | The pacing re-tune is an open condition of the experiment.                                                                                                          |
| L4        | REVISE → fixed | Heal could create smelter → smelter. The heir must now obey the target matrix and caps, with a test.                                                                |
| L7        | PASS           | —                                                                                                                                                                   |
| Clip      | PASS           | For the communication hypothesis only. The witness logs the cells remaining at the start of B1.                                                                     |
| Migration | REVISE → fixed | A rolled-back build would wipe a `version: 2` save. The experiment now uses a separate `rockhopper.save.v2` key and never writes v1, with `?restore=pre-logistics`. |

**Scoped experiment PASS granted** once the two fixes are written in (they are). Open, and not blocking:

1. The bot re-derives prices and pacing, and shows raw chains still being built by 20 minutes.
2. The segment-B capture, with an uncut witness and a cells-remaining log.
3. A human playtest at 390 px, which only the user can run. It stays unresolved, and its findings are reported separately from bot and clip results.

## Round 4: post-implementation review of the merged build (PR #14)

An independent adversarial agent drove the working build: sim probes, and Playwright at 390 and 360 px. `npm test` passed 76/76 and the browser spec 10/10, but most of its findings were cases those tests never exercised.

| #   | Implementation-time decision                    | Verdict | Resolution (PR #15)                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Belt capacity of 7.5/s per tier (the tick grid) | PASS    | Capacity is now length-independent: a per-belt load cooldown. Doc figures updated.                                                                                                                                                                                                                                                    |
| D2  | Tiers moved up to leave a yard                  | REVISE  | Migration refits every belt and moves any v1 smelter that now sits inside a rock or on a socket to the nearest legal spot.                                                                                                                                                                                                            |
| D3  | Relaxed smelter clearances                      | REVISE  | Every socket, free or not, is reserved for a drill. A splice must leave a feed belt of at least 17 u.                                                                                                                                                                                                                                 |
| D4  | Snapping slides along the belt                  | REVISE  | A drop on a belt that can't take a smelter is refused with a reason ("already smelted", "already linked", "inputs full", "no room here", "crossing – pick one"). The slide is capped at one smelter width, and the label sits above the ghost.                                                                                        |
| D5  | The "full" rule                                 | REVISE  | Signals are cause-based. "Full" is sampled at each load chance (bundle full and items still waiting) with smoothing and hysteresis. "Blocked" is sampled when a smelter refuses intake. A belt held downstream (front waiting longer than a load cycle within the last second) is not blamed. Tests cover the three reproduced cases. |
| D6  | A lone chunk becomes a ×3 bar after 2 s         | PASS    | —                                                                                                                                                                                                                                                                                                                                     |
| D7  | Move icon and short labels                      | PASS    | —                                                                                                                                                                                                                                                                                                                                     |
| D8  | Price retune                                    | PASS    | Retuned again for honest belts (see pacing below).                                                                                                                                                                                                                                                                                    |

Bugs found and fixed:

- **Belt items at negative positions** after a splice or move. Relayout now clamps items in order, and items never move backwards.
- **A smelter overlapping a free socket.** Sockets are reserved.
- **Short belts beat capacity by 45 %.** Fixed by the load cooldown.
- **v1 migration.** Stale belt lengths and smelters inside rocks are fixed. Grandfathered inputs now show as coral pips.
- **Frozen dashes flickering on every junction feeder.** Dashes freeze only after the front has waited about 0.4 s.
- **Hint hands drawn over an open bubble.** Fixed. The splice hand also gives up after 25 s, or once the player has dragged a smelter.
- **`?restore=pre-logistics` repeating on every refresh.** The parameter is stripped after use.

Structural finding, recorded and not fixed (it is a design question):

- The player now has real verbs: chain, splice, widen. But geometry is still free (straight, free belts of any length that cross anything), and the dominant play reduces to "merge tree → trunk → smelter → widen the trunk".
- The user has since asked separately for **free drill placement** (no fixed sockets). That is the next design step, and it would give position a consequence.
