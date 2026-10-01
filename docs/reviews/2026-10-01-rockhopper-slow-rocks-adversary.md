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

See the "Revision 2" section of the proposal.
