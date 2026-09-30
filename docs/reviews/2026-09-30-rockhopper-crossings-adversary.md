# Rockhopper belt crossings: adversarial reviews (2026-09-30)

User feedback: "Should players be able to build belts manually? Even if not I think being able to re-arrange them is important as right now the spaghetti looks quite messy and that organization would be an important skill expression layer." The user chose the full AGENTS.md review process. The proposal is [../ROCKHOPPER_CROSSINGS.md](../ROCKHOPPER_CROSSINGS.md). Every verdict below comes from an independent adversarial agent. None of it is evidence of enjoyment or balance for human players.

## Round 1: revision 1

The reviewer measured the greedy bot's layouts (seeds 1–3 at 6, 12 and 20 min) and ran a two-belt model of C2 under both readings of its entry rule.

| #    | Verdict            | Main finding                                                                                                                                                                                                                                            |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | REVISE             | The cost depends on the angle and jumps hard (the stretch is 14 / sin θ, about 81 u at 10°). The 7 u reach is narrower than the drawn belts (10–16 u), so visible overlaps are free. The shared-machine exemption hides full-length collinear overlaps. |
| C2   | REVISE             | Starvation: a saturated belt whose stretch is longer than one bundle spacing (14.7 u, any angle under about 72°) never leaves it empty. Modelled: 100 % / 0 %. Transitive all-or-nothing grouping can lock many belts near the hub.                     |
| C3   | REVISE             | "A third at 30°" is really about 25 %. "40 % × 40 % loses almost nothing" holds only at 90°. A throttled belt backs up, so every bundle leaves full and widening does raise chunk throughput.                                                           |
| C4   | REVISE             | Hiding "full" and Widen misleads, because widening helps. A plate at every crossing clutters the hub fan at 390 px.                                                                                                                                     |
| C5   | REVISE             | Auto-link to the nearest dock keeps creating crossings the player must undo: a chore, not skill.                                                                                                                                                        |
| C6   | PASS (conditional) | Needs a 390 px screenshot showing the label clear of the hub bubbles.                                                                                                                                                                                   |
| C7   | REVISE             | Existing saves lose output silently (bar trunks by about 60 %). Needs a switch and a notice.                                                                                                                                                            |
| Clip | REVISE             | B1 is a prepared layout and must be labelled so; B2 assumes a free dock developed saves rarely have. The witness must log settled rates for both trunks.                                                                                                |

Measured by the reviewer:

- A step is 3.67 u per tick and a belt loads every 4 ticks: 7.5 bundles/s, 14.7 u apart. Adjacent docks are 19.5 u apart (17.9 u at the ends of the fan).
- Bot crossings under the 7 u rule: 0 / 1 / 2–3 at 6 / 12 / 20 min, almost all shallow (about 24°, a 34 u stretch), on pairs loaded at 56–80 % each.
- Two-belt model with strict turns, share of the bundle rate each belt keeps: 90° 50 % (saturated) and no loss at 40 %; 30° 25 %; 24° 20 %; 10° 9 %.

Structural finding: the mess the user described (belts converging on the hub fan and running under smelters) is mostly not crossings, and untangling is close to a one-time sort (docks in the sources' angular order) unless the layout forces trade-offs.

Conditions for a PASS (reversible experiment only):

1. Crossing cost the same at any angle, near-parallel overlaps handled, reach matching the drawn belt.
2. The reservation and alternation rule spelled out, with starvation, deadlock and grouping tests.
3. Numbers re-derived, the widening interaction settled, and signals that match it.
4. Auto-link prefers a dock that crosses nothing; leftover crossings measured.
5. Before building: tangled vs tidy credits/min on the bot's 20-minute saves; the natural crossing rate from a less tidy bot; bot pace, accepted only if T2 moves by 10 % or less.
6. A switch, no silent change to v2 saves, and 390 px screenshots of plates, chip and label.
7. The clip labelled as a developed save, with an uncut witness logging settled rates.
8. The doc records honestly what is still unaddressed (hub convergence, belts under machines).
