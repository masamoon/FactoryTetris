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

## Round 2: revision 2 (prototyped behind a switch)

The reviewer re-ran the witness (reproduced exactly) and the tests (all passing), then stress-tested random factories built with legal commands, measured the lane rule on the bot's saves, and checked the 390 px screenshots.

| #    | Verdict            | Main finding                                                                                                                                                                                                                            |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | REVISE             | The cost is angle-independent now, but two drills 6–10° apart feeding one smelter get a plate, contradicting "inputs of one smelter never cross". Plates at a belt's start are cut to 8.5 u.                                            |
| C2   | REVISE (blocking)  | **Permanent deadlock**: a bundle held for room behind a crossing wasn't marked held, so the bundles bunched behind it inside an earlier plate kept it claimed. About 20 of 150 random factories locked; the smallest case had 3 drills. |
| C3   | PASS               | 3.75 / 3.75 at 47°, 32° and 28°; widening cancels the loss, as stated.                                                                                                                                                                  |
| C4   | PASS (conditional) | In a hub knot the ⇄ chips pile up under smelters and pops.                                                                                                                                                                              |
| C5   | PASS               | Auto-link ranks docks by plate count; leftovers measured.                                                                                                                                                                               |
| C6   | PASS (conditional) | The label sat over the smelters and a pop covered it.                                                                                                                                                                                   |
| C7   | PASS (minor)       | v1 saves got crossings with no notice.                                                                                                                                                                                                  |
| C8   | PASS (conditional) | No spot was left unlinkable, but lanes cut the options (seed 1 at 12 min: 210 vs 256 placeable rim spots, 9.6 vs 16 legal targets per new drill), and the skill-gap evidence used layouts C8 forbids.                                   |
| Clip | REVISE             | B1 depends on C2; the prepared tangled save contains links a player can no longer build.                                                                                                                                                |

Conditions for a PASS: fix the lock and stress it (500+ seeds, with and without mid-run moves, saturated chains and smelters, no wait over 4 s); re-run the witness with C8-legal tangles and a less tidy bot, and log how often lanes refuse; fix or document the smelter-input case and give v1 saves the notice; a 390 px screenshot with the label clear; a settled-rate log for the clip's B2 move.

Resolution (revision 3): see the design doc.

## Round 3: revision 3

The reviewer reproduced the tests and the witness, then wrote its own generator beyond the stress tool: tier-2 rims too, 5–14 drills, level-5 smelters with 4 inputs, chains of junction drills, random widening, and a "chaos" variant (moves, re-routes, sells, new drills, the switch off for 3 s, save/load mid-run every 7 s). It flagged any bundle still for 20 s outside a machine backlog, since the stress tool's checks miss a lock on one belt. **1,432 runs with plates, 0 locks, worst wait 1.63 s**; every flag traced was a real backlog.

| #    | Verdict            | Main finding                                                                                                                                               |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | PASS               | Condition met (0 of 13 input pairs 6–10° apart got a plate). The doc and comment gave the chord, not the exact 10 / sin θ; harmless inside the 7 u margin. |
| C2   | PASS               | Condition met: lock fixed, no lock in 1,600+ adversarial runs.                                                                                             |
| C3   | PASS               | Met in round 2.                                                                                                                                            |
| C4   | PASS (conditional) | The ⇄ chips in the hub knot are still covered by pops and smelters.                                                                                        |
| C5   | PASS               | Met in round 2.                                                                                                                                            |
| C6   | PASS               | Label clear of hub, pops and bubbles.                                                                                                                      |
| C7   | PASS               | v1 saves get the notice.                                                                                                                                   |
| C8   | PASS (conditional) | A splice up to 40 u off a belt can leave a new belt under a machine (17 of 300 random seeds; not reachable by the in-game drag).                           |
| Clip | REVISE             | No save a player could build exists for B1; the screenshot save has links that fail "belt blocked".                                                        |

Conditions: lane-check spliced belts, with a test; build B1's save as a legal shuffle and label it prepared; draw the ⇄ chips above pops, with a hub screenshot; add a still-bundle check to the stress tool; fix the C1 wording; record that the switch lets links under machines survive. Open for the playtest: skill or one-time sort (the bot's own layout sits within 3 % of tidy), whether refusing about 37 % of link targets frustrates, whether ⇄ reads at the hub.

Resolution (revision 4): see the design doc.

## Round 4: revision 4, plus a play-through check

The reviewer re-ran the tests, reproduced the prepared save, probed splices (400 random factories, half with grandfathered links; 669 splices up to 42 u off the belt: 0 new belts under a machine, 106 with the check removed), put the round-2 lock back to test the stress tool's new check, and played the build with Playwright at 390 px (headless, not a phone).

| #    | Verdict            | Main finding                                                                                                                                                                                               |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | PASS               | Wording now correct.                                                                                                                                                                                       |
| C2   | PASS               | The still-bundle check flags the reinstated lock (9 of 11 runs the wait check flags); the plate-gap allowance hides nothing. It is a backstop, not a new detector.                                         |
| C3   | PASS               | No regressions.                                                                                                                                                                                            |
| C4   | PASS (conditional) | Chips are above pops but tile edge to edge at the hub (4–8 in a column), and one drew over the teaching label.                                                                                             |
| C5   | PASS               | No regressions.                                                                                                                                                                                            |
| C6   | PASS               | The notice clears after 8 s; the switch survives reload.                                                                                                                                                   |
| C7   | PASS               | No regressions.                                                                                                                                                                                            |
| C8   | PASS               | Splices lane-checked. The UI's splice refusal said "no room here" or "already smelted", never "belt blocked".                                                                                              |
| Clip | REVISE (minor)     | The save is legal, but it holds a hub knot, not B1's trunk X; B2's drill move doesn't help in it (best: 1 plate less, ±2 %). Three re-routes through a temporary junction do: +41 % in the reviewer's run. |

Play-through findings: re-routing onto a lane-blocked target was silent (no snap, nothing on release); a Move could jump the drill to a neighbouring rock instead of saying "belt blocked"; smelter moves are refused at 63 % of open spots in a developed factory; misleading splice refusal text; the rim glow cost about 10 ms per frame at 25 machines while dragging a drill; the hint's ring could hop between plates. No save/load or switch bugs, no console errors.

Resolution (revision 5): see the design doc.

## Round 5: revision 5 (narrow)

Only revision 5's changes were checked (Playwright at 390 px and headless scripts, not a playtest). **Every item passed; no bugs found.**

- **C4: PASS.** Across about 2,400 recorded frames, at most 3 chips showed at default zoom and 5 at 2.2×. The closest two chips came was 2.17 chip widths apart. No chip was drawn over the teaching label. The hint ring moves only when its plate cools below the heat threshold, which a player may see happen once.
- **Clip: PASS.** The tool's log matches the doc. B2's three re-routes, done as real drags, were each accepted; the knot dropped to 2 plates and income to about 270/s over 30 s.
- **"belt blocked" while dragging: PASS.** The label shows only for lane refusals. When a blocked target is nearer the finger than a legal one, the refusal wins (3 % of random drags near machines at 0.67× zoom, 0.02 % at 2.2×; never with the finger on a legal machine's body).
- **Splice text: PASS.** "belt blocked" shows only when lanes refuse. A loop refusal still reads "no room here" (older, not new).
- **Nearest rock only: PASS (as designed).** In 8 % of finger positions between close rocks, a crowded nearer rock now refuses instead of the ghost jumping; the 14 u gaps between tier-1 rocks need more precise aim.
- **Rim-glow cache: PASS.** It was never stale across respawns, a sell, an unlock, a committed move, the switch, or a level-up.
