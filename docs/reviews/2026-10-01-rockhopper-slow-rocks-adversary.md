# Rockhopper slow-burn rocks: adversarial reviews (2026-10-01)

The user said the first asteroid drags, that tractor speed is the bottleneck, and that rocks should be
destroyed much more slowly, with the player hopping between them and the emptied space becoming room for
logistics and advanced machinery. The user chose the full review process. The proposal is
[../ROCKHOPPER_SLOW_ROCKS.md](../ROCKHOPPER_SLOW_ROCKS.md). Every verdict below comes from an
independent adversarial agent. None of it is evidence of enjoyment or balance for human players.

## Round 1: revision 1

The reviewer applied the evidence patches to a scratch copy and reproduced the doc's numbers (seed 1
today: slot empty 62 %, drills idle 69 %, T2 10:50; dense core at depth 60 with a 3 s tow: T2 3:57–4:48,
T3 16:59–19:24 over seeds 1–4). Its own scripts are in
`evidence/2026-10-01-slow-rocks-review1/` (run against the patched scratch copy).

| #       | Verdict              | Main finding                                                                                                                                                                                                                                                                                                                                |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | REVISE               | Meets 3–5 min (one T1 rock under 3 level-1 drills: 3.2–3.5 min; 11 drills: 0.8 min). But depth by radius spreads value by vein plan from ±2 % to 41–148 % of the tier mean (core 136–148 %, crust 41–66 %), breaking sectors fairness and drill-placement agency. On pace it ties instant tow. Sixty shades on a 6–7 px cell can't be read. |
| S2      | REVISE               | 20 % of cells is 28–39 % of the chunks, not 20 %; crumble chunks skip smelters at ×1; the largest single flight is 432–780 credits (30 today). The arc is fine.                                                                                                                                                                             |
| S3      | PASS with conditions | Removes the wait but turns respawn into a chore: 2.3–2.6 forced taps per minute after 10:00. Needs an auto-tow and the empty-berth time with the player away.                                                                                                                                                                               |
| S4      | REVISE               | The choice is trivial (take core or the bigger bar: +40 % against −50 %). Breaks "veins belong to the slot" and "richness depends only on the tier". Drills placed for one plan resume on another.                                                                                                                                          |
| S5      | REJECT as written    | Floor isn't scarce: about 250 smelter footprints of free floor; all pads add ~16 %, the T1 pads ~2 %. Keeping the copper T1 pad costs −30 to −35 % earned (slot 2: −2 to −10 %); factories barely pay, so "never keep a pad" dominates. Gating an off-by-default feature forces it on.                                                      |
| S6      | REVISE               | More candidates for a trivial choice is a passive upgrade, and it removes the tractor's automation role.                                                                                                                                                                                                                                    |
| S7      | PASS with conditions | Free 3 s re-tows mean moving drills is never right, so "hopping" is re-towing in place. Moving 12 drills one by one is a chore. Prices for drills on an empty berth are undefined.                                                                                                                                                          |
| S8      | PASS with conditions | Define the four combinations with "Next game"; factories is a live switch; amend AGENTS.md invariants; candidates stable across scanner levels; the rock cache key must include layers.                                                                                                                                                     |
| Clip    | REVISE               | The arc barely moves in 0–10 s and the shade is invisible; the ×2.5 alloy from a T1 pad factory has no support (0–1 % of copper meets crystal).                                                                                                                                                                                             |
| Overall | **REVISE**           |                                                                                                                                                                                                                                                                                                                                             |

### Measured by the reviewer (simulation)

- Instant tow vs dense core, seeds 1 and 3, 30 min: instant tow T2 4:05, T3 17:15–17:26, earned
  903–927k, longest no-buy gap after T2 4:47–4:53; dense core T2 4:22, T3 16:59–19:13, earned
  842k–1.03M, gap 3:55–5:08.
- Crumble share of chunks: 19 % today; 28–29 % dense core (single rocks 29–39 %).
- Rock arrivals after 10:00: 36–38 per minute today; 2.3–2.6 per minute with dense cores.
- Free smelter floor: 536–555k u² (302–310k within 600 of the hub); factory-centre room on all pads
  80–85k u², on the three T1 pads 11k u².
- Foreign belts over T1 berth interiors at 30 min: 0–2 per berth.
- Cell size at 390 px: 6–7 CSS px.

### Must-fix list for revision 2

1. Value by vein plan within ±10 % of the tier mean.
2. Crumble by remaining layers, with an honest share and the largest flight reported.
3. State S1's case honestly (feel, not pace) and attack the post-T2 wall separately.
4. Replace S5: give pads a job free floor can't do; drop factories-only-on-pads.
5. A real scanner choice, and keep veins per slot or amend the invariant.
6. Auto-tow and a group drill move.
7. Three or four depth shades, not sixty.
8. Retune the whole economy (earned doubles at 30 min).
9. Rewrite the clip around a beat the simulation supports.

### How revision 2 answers it

Uniform depth with a depth-1 starter rock (1, 7), crumble at 5 % of layers in flights of at most 4
chunks (2), an honest case and a separate price item S9 (3, 8), pad docks instead of factories-only
pads (4), equal-value candidates differing by signature and vein angle (5), auto-tow and a group move
(6), and a new clip (9).

## Round 2: revision 2

The reviewer patched revision 2's rules into a scratch copy (depth T1 40 / T2 60 / T3 80 / T4 100,
starter rock depth 1, crumble at 5 % in flights of at most 4, 3 s auto-tow, no tractor purchases, a pad
dock of 2 ports at the next hub dock's price) and a pad policy (from 15:00 the chosen berth becomes a pad
when it next runs dry, drills group-moved, the longest dock belts that can reach re-routed into the pad
dock). Greedy bot, 8 seeds, classic and sectors, 40 min. Scripts and the sim patch are in
`evidence/2026-10-01-slow-rocks-review2/`. Perturbing the bot moves it ±5–20 %.

| #       | Verdict              | Main finding                                                                                                                                                                                                                                                                                                      |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | PASS with conditions | Slot empty 3–5 %; starter rock spent at 14–16 s; laser share 9–18 % (today 13–29 %). A still finger stops carving outward on a deep rock; the starter rock crumbled at 5 %, not 20 %.                                                                                                                             |
| S2      | PASS                 | Crumble 3.9 % of chunks; largest flight 48 measured, 120 at most.                                                                                                                                                                                                                                                 |
| S3      | PASS                 | Slot empty about 3 %; no chore.                                                                                                                                                                                                                                                                                   |
| S4      | **REVISE**           | Value per unit of work differs by signature (T1 +5 %, T2 +14 %, T3 +18 %); raw signature totals differ 30–55 %. With factories off nothing wants an ore, so "take the richer" is the answer; the angle only changes when value arrives.                                                                           |
| S5      | PASS with conditions | Situational: earned at 40 min vs never a pad, sectors +2.6 to +8.0 % (wins 3–5 of 8), classic −5.4 to +2.2 %. Plates within 150 u of the hub on sectors 7.2 → 3.6–4.5; classic ~2 either way, and field plates rise. Hub docks never bind before 40 min. Level 2 doesn't pay. A T2 pad took 19:42–38:36 to clear. |
| S6      | PASS with conditions | All 3–4 drills moved in every run; refused moves need reasons; a 12-drill pad leaves some dry.                                                                                                                                                                                                                    |
| S7      | PASS with conditions | Late T1 berths are worth about 0, so hopping is mostly T1 berths becoming pads.                                                                                                                                                                                                                                   |
| S8      | PASS with conditions | Round-1 conditions, a per-mode price table, tractor level in the save.                                                                                                                                                                                                                                            |
| S9      | **REVISE**           | Today's longest T2→T3 no-buy gap over 40 min is 4:53–6:59 (classic) and 4:08–9:59 (sectors), not ~2 min. Prices alone: T1 ×2, T2 ×3, T3 ×2.5 gives T2 6:06–9:49, T3 28:33–32:56 (4 sectors miss), gap 4:54–11:55.                                                                                                 |
| Clip    | **REVISE**           | T1 rocks carry no gold; a T2 rock lives 5–20 min, so the beat needs a disclosed prepared save; hub docks never ran out in the bot.                                                                                                                                                                                |
| Overall | **REVISE**           |                                                                                                                                                                                                                                                                                                                   |

Must-fix for revision 3: (1) S4 equalise or drop candidates; (2) S9 restate the baseline and add
purchases or accept a stated gap; (3) S5 prices for level 2 and past 9 docks, scrapping a rock early, a
plate preview, a smarter routing policy and the time to a pad; (4) S1 laser behaviour on deep rocks and
the starter rock's crumble; (5) the clip on a T2 berth, disclosed, with chunk-flight throw art.

### How revision 3 answers it

Candidates are dropped (1). The baseline is restated and the target is "no worse than today" (2). Pad
dock prices, Scrap, a plate preview and pad art are specified, level 2 is cut (3). The laser sweeps the
deepest nearby cell and the starter rock crumbles at 20 % of cells (4). The clip is rebuilt around
Scrap → pad → pad dock untangling the hub on a disclosed prepared sector save (5).

## Round 3: revision 3

The reviewer copied round 2's scratch sim and bot, added the starter rock's 20 % crumble, the sweep
laser, three pad policies, price knobs and two standalone models built on the real `generateRock`
(scripts in `evidence/2026-10-01-slow-rocks-review3/`). It also found that round 2's bot imports the
sim by absolute path, so copies that edit their own `src` would silently run the old sim (round 2's
numbers are unaffected).

| #       | Verdict              | Main finding                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | **REVISE**           | The sweep lowers a 21-cell disc in lockstep: at laser level 1 on a T1 rock the first shade change takes 62–79 s and no hole opens in 120 s (nearest cell today: 3–6 s, hole 11–24 s); on T2 nothing changes in 120 s. Income per work shifts −13 to +7 % with aim. Laser share in the bot unchanged (13–25 % in minute 1, 8–14 % later).                                                                                  |
| S2      | PASS                 | Unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                |
| S3      | PASS                 | Tow time after unmarking a pad unspecified (assume 3 s).                                                                                                                                                                                                                                                                                                                                                                  |
| S4      | **REVISE**           | The 2-minute lock is bypassed by parking the drills on a neighbour with Move drills; Scrap-and-redraw then wins a median +6 to +8 % on T1 and T2 (25–28 of 30 seeds), up to +39 % on crust and side plans. The lock isn't saved.                                                                                                                                                                                          |
| S5      | PASS with conditions | Berth 2, 16 seeds, routing the belts with most plates near the hub: classic −0.7 % (7/16 won), sectors +8.0 % (13/16); with Scrap at 15:00 sectors +13.8 %. Plates near the hub: classic 5.0 → 2.7, sectors 7.4 → 3.2; total plates rise. Berths 0 and 3 still lose on classic. Without Scrap a pad takes 15–29 min. Conditions: whether a pad dock raises the next hub dock's price, and how many pad docks are allowed. |
| S6      | PASS                 |                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S7      | PASS                 |                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S8      | PASS with conditions | Save the Scrap state and the dry state.                                                                                                                                                                                                                                                                                                                                                                                   |
| S9      | **REVISE**           | T1 ×2, T2 ×3, T3 ×2.5: classic T2 6:06–7:13 (7/8 early), T3 27:34–32:20, T2→T3 gap 6:13–10:51 (7/8 worse); sectors T3 missed or late on 5/8, gaps up to 15:45. Scaling all ore value ×0.6 or ×0.5 still fails. Income about doubles because nothing waits.                                                                                                                                                                |
| Clip    | PASS with conditions | Sector save with a knotted hub, a measured before/after rate, a "developed factory" label, Scrap shown delivering nothing.                                                                                                                                                                                                                                                                                                |
| Overall | **REVISE**           |                                                                                                                                                                                                                                                                                                                                                                                                                           |

Must-fix for revision 4: (1) S1 back to the nearest-cell laser, with a first "scratched" band; (2) S4
Scrap must not redraw the rock (hold the scrapped rock and bring the same one back), saved; (3) S9 state
an accepted gap or name a purchase that fills it, and publish one price table that meets the targets
over 8 seeds on each field.

### How revision 4 answers it

The laser keeps today's nearest-cell rule, and the first shade band is "scratched" (1). A scrapped rock
is held and comes back unchanged when the pad is unmarked, and that state is saved (2). S9 names its
price table (T1 ×2.5, T2 ×4, T3 ×1.6) from a 24-combination search, accepts a gap of at most 1.5× today's
per seed, and reports that sectors miss some targets and why (3). Pad docks are capped at one per pad
and share the dock price ladder.

## Round 4: revision 4

The reviewer re-ran the S9 table and today's baseline over 8 seeds × {classic, sectors}, a 60-minute
T3 → T4 check and a nearest-cell laser model with the four bands (scripts and outputs in
`evidence/2026-10-01-slow-rocks-review4/`). Every per-seed number in the S9 table reproduced exactly.

| #       | Verdict                  | Main finding                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | PASS                     | Still finger, level-1 laser: T1 scratched in 0.2–0.6 s, half 5–12 s, first hole 11–24 s; T2 scratched 0.2–1.2 s, hole 16–76 s; T3 scratched 2 s, no hole in 120 s (fine at L3: 59 s). Income unchanged.                                                                                                                                                                                                                                                                   |
| S2      | PASS                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S3      | PASS                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S4      | PASS with conditions     | No exploit: the held rock makes Scrap a pause. "Scrap" says destroyed when the rock is kept: rename (Stow). Specify crumbling and towing rocks, unmarking with machines on the pad, dry drills resuming.                                                                                                                                                                                                                                                                  |
| S5      | PASS with conditions     | Round 3's conditions resolved; evidence item 4 still owed by the prototype.                                                                                                                                                                                                                                                                                                                                                                                               |
| S6      | PASS with conditions     | State the group-move pricing order.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S7      | PASS                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S8      | PASS                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S9      | PASS with conditions     | Numbers reproduce, but the text breaks its own per-seed bound (sectors 2.18×, 2.12×, 1.54×), keeps stale "no worse" lines, and misexplains the sector shortfall (seed 2 is today's strongest sector, 0.94× income, T3 +10:32). 6 of 8 sector seeds reach T3 later than today. The gap metric drops gaps open at 40:00. T3 ×1.4 holds the bound better (classic worst 1.08×, sectors 1.94×). Other prices and the T3 → T4 gap (13:24–14:43 vs 9:35–13:53) are not covered. |
| Clip    | PASS with conditions     | Round 3's conditions; show the rock is kept.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Overall | **PASS with conditions** | Prototype behind the new-game switch only, once the text fixes are in.                                                                                                                                                                                                                                                                                                                                                                                                    |

### How revision 5 answers it

S9 now takes T3 ×1.4, states a per-field bound that matches the measured table (classic every seed
≤ 1.5×; sectors ≥ 5 of 8 within 1.5×, worst under 2×), reports the seeds that reach T3 later than today,
corrects the sector explanation, and moves other prices and T3 → T4 into the prototype's evidence. The
stale "no worse" lines are gone. Scrap is renamed **Stow**, drawn as a parked rock, with the edge cases
written in. Group moves are priced one drill at a time. The starter rock is "the first rock the first
berth ever gets".
