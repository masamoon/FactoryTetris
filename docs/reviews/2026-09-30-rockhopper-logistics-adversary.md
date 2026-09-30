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
