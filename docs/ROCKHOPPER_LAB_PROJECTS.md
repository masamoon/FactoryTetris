# Rockhopper: Lab projects (late-game proposal, revision 3, 2026-10-05)

Status: **revision 3, pending round 3.** Round 1 gave revision 1 (bills of bars unlocking pad docks, belt tiers 5–6 and drill levels 8–9) REVISE; round 2 gave revision 2 (six researched bridges, one per plate) REVISE on the count (LB4) and on choosing a plate (LB5), with the rest PASS or PASS with conditions ([review](reviews/2026-10-04-rockhopper-lab-projects-adversary.md)). On 2026-10-05 the user chose to keep the Lab aimed at untangling the hub with routing pieces. How this revision answers round 2 is at the end. Nothing here is implemented. It extends the research Lab ([ROCKHOPPER_RESEARCH.md](ROCKHOPPER_RESEARCH.md), scoped PASS for a prototype, not built) and would ship behind the same off-by-default "Research" switch. A PASS would authorise only that prototype; it is not evidence of fun or balance.

## Why

The user, 2026-10-04: "What's the core loop after docks are full? Can we buy more stations?" They then chose the Lab over pad docks or a second hub, and the project found that the Lab as designed does not reach the late game: it skims about 1 % of output, and its five recipes are done by early T3. Its own doc says "18–30 min has nothing to research" and it "does nothing for the stretch after about 45 min".

What the greedy bot shows today (simulation, not a playtest; `npm run bot:rockhopper -- --slow`, fixed costs, crossings on, 60 min, seeds 1–2):

- All nine docks are bought before 25 min; T3 opens at about 13 min and T4 at about 39 min.
- Income stops growing at about 15 min and stays near 1.5 K/s to 60 min, even as T3 and T4 drills are added. The bot spends 83–85 % of the game in gaps over 30 s without a purchase and ends with 1.5–1.9 M unspent credits and nothing left to buy.
- Docks are not the limit: the bot uses 8 of 9, at about 40 % of belt capacity. With crossings off, income keeps climbing to 2.5–3 K/s and T4 comes about 9 min sooner, so the cap is (inferred) belts taking turns at plates near the hub.
- With factories on (research needs them), the same runs look alike: income flat near 1.4–1.7 K/s from about 15 min, 83–85 % of the game in gaps over 30 s, 1.45–1.71 M unspent at 60 min.
- Paired bars reaching the hub per minute, 40–60 min, seeds 1–3: rock 3 960–4 290, copper 620–810, ice 570–640, gold 270–300, crystal 65–270. Crystal stays scarce even with T4 open, because hard crystal (hardness 4) drills slowly.

So the late game lacks **things to build** once rocks, docks and belts are maxed, while **the knot of plates round the hub** holds dock belts at about half capacity, and nothing rewards fixing it bit by bit. Round 2 measured the knot's share: with every plate in the bot's late factory removed from 20 min, late income rises 20–30 %, against +70–90 % for crossings off from the start, so most of the on/off gap is layout and pace, not plates still waiting.

## The idea in one line

**The Lab researches lifts: a lifted belt piece runs one level up and no longer crosses belts on the ground.** Two lifted pieces that touch still share a plate, so lifting everything gains nothing; the player decides which belts go up and which stay down.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LL1 | **A lift raises one straight belt piece a level.** Plates form only between pieces on the same level (`crossings.ts` gets a level per segment). A lifted piece is drawn on short pylons with a shadow below, over ground belts, and under nothing. Everything else is unchanged: its bundles, its tier, its ends at machines, posts, joins and docks, and the rule that belts never run under machines. Plates against a shared machine are already excluded (`CROSS_SHARED_CLEAR`), so a lift needs no ramps.                                                                                                                                                    |
| LL2 | **Lifting is per piece, chosen by tapping the belt.** In the Lift tool (from the Lab bubble, once a lift is in stock), a tap selects the belt piece under the finger (belt hit test, 22 px, as for bend posts), and the ghost shows that piece raised: every plate it would leave goes dim, and every plate it would make with other lifted pieces lights coral. No projected income is shown. A belt with posts has several pieces, and each lifts on its own. Tapping a lifted piece in the tool lowers it back to stock for free.                                                                                                                              |
| LL3 | **A lift belongs to its piece and comes back when the piece changes.** It is stored as (owner machine, piece index). Re-targeting, re-bending, splicing, moving or selling the owner, or a join on that piece, returns the lift to stock, with a "lift returned" pop where it was. It never follows a belt to a new place.                                                                                                                                                                                                                                                                                                                                        |
| LL4 | **Each lift is researched, then bought.** After the three T1/T2 recipes (copper + ice, ice + gold, copper + gold), not the crystal ones, the Lab bubble gains a row "Lift n · ore 0 / count", a one-ore bill of paired bars taken by the clamp exactly as in revision 2 (TT1/TT2 placement; every owed bar taken, everything else passes, the belt never waits, taken bars earn nothing). When it is met, lift n can be bought, and the next row appears. Bills: ice 400, gold 300, copper 600, gold 500 (no crystal, protecting the copper + crystal premium). Target: 2–5 min each on the best legal belt (round 2: 1.2–4.4 min at revision 2's smaller bills). |
| LL5 | **Four lifts, priced as a stated credit sink.** Lift n costs 50 000 × 2.5ⁿ⁻¹: 50 K, 125 K, 313 K, 781 K, 1.27 M in all, against the 1.45–1.9 M the bot leaves unspent. They are a sink, not an investment (round 2: all plates gone pays about 420–570 /s, which takes longer than a session to repay this), and the doc says so. The count is fixed. It isn't tied to plates (that would reward making plates), and the layer rule, not scarcity, stops "lift everything". Prices are an exception to fixed costs, like docks (F2).                                                                                                                              |
| LL6 | **What stays out.** No reward multiplies throughput by itself (no wider belts, deeper drills or bigger bundles). Docks aren't gated (pad docks remain S5's own build). Research gates nothing else. Auto-links and new machines build on the ground, and `platesIf` counts only ground plates for them.                                                                                                                                                                                                                                                                                                                                                           |
| LL7 | **Switch and saves.** Behind "Research" (off by default, needs Factories on). The optional `research` field gains `lifts: { bill, counts, bought, raised: [owner, piece][] }`. A malformed field resets research (TT7(b)). A raised entry whose piece doesn't exist on load returns to stock. With research or crossings off, raised pieces are drawn and treated as ground (inert) and kept, and bought lifts stay bought. Lifts are never sold.                                                                                                                                                                                                                 |

## Why a layer instead of a bridge per plate

- **The tap target is a belt, not a plate.** Belts are long, while hub plates sit 23 u (13 px at zoom 0.58) apart (round 2).
- **One lift clears a whole chain.** Round 2 found single plates aren't additive: belt 16 waits at two hub plates, so bridging one gained −1 to +6 %. Lifting belt 16's piece clears both.
- **The decision can't be "all of them".** With four pieces up in a knot where they cross each other, the plates simply move up a level. The useful question is which belts to separate, and the ghost shows the plates gained and lost, so the player reads the answer rather than computing it.

## What it gives the player

- **A late loop that compounds.** Feed the Lab (one placement, 2–5 min), buy a lift, raise the piece that clears the most waiting, watch the line speed up; the next bill fills faster.
- **A credit sink sized to the surplus,** stated as a sink.
- **A reason to read the knot,** with the answer shown as plates lost and made, not as income.

## Honest scope

- The Lab's part is still a light placement (the busiest legal belt carrying the ore).
- Four purchases plus four bills over roughly 15–45 min is not "always something to build". It adds a goal and a spatial choice to each long wait.
- After the fourth lift there is nothing new again; a repeatable last project (hopping to a new sector) stays deferred.
- Whether four lifts reach most of round 2's +20–30 % is a simulation claim to measure.

## Evidence the prototype must produce (measure the first two before any UI)

- **Bot with real prices and bill times** (factories + research on, 60 min, seeds 1–3, classic and sectors, tidy and `--messy`), lifting at each purchase the piece whose lift removes the most waiting at that moment, against research alone: when each lift arrives, income at 20/30/45/60 min, T3/T4 times, purchases per minute, time in gaps over 30 s from 15 min on, value the Lab took, copper bars reaching a crystal factory. **Pass rule:** income at 45 min rises by at least 10 % on both fields without lowering the premium share; time in 30 s+ gaps is reported, not gated (round 2 doubts splitting gaps moves it).
- **The layer is a choice:** on the same saves, gain from the best four pieces against four random dock-belt pieces and against lifting every dock-belt piece.
- The legal Lab anchor length on every dock belt (owed since round 1).
- Tests: plates only within a level; a lift returns on re-target, bend, splice, move, sell and join; lowering is free; auto-links stay on the ground; inert with crossings or research off; bills take only owed paired bars of one ore; the belt never waits; save round-trip, missing piece on load, malformed field. The crossings stress tool with random lifts: 0 locks, 0 stalls.
- 390 px screenshots: a lifted piece over the hub knot at zoom 0.58, and the Lift ghost with dimmed and coral plates.

## Open questions

- Does a raised belt read as "up" on a small screen without a perspective cue?
- Is four the right count on sectors, where the hub knots more?
- Do players untangle less once lifts exist?

## Round 2 answered

1. LB4 count: four lifts, fixed; "lift everything" is no longer the answer because lifted pieces still cross each other (LL5, and a measurement against lifting everything).
2. LB5 choosing: the target is a belt piece, not a 13 px plate; the ghost shows the chain (plates lost and made) with no income figure (LL2).
3. LB1 key: a lift never follows its piece; any change returns it (LL3). Auto-link builds on the ground (LL6). Gates form per level, so merged gates need no special case.
4. LB2 timing: lifts start after the three T1/T2 recipes (LL4).
5. The "Why" now says what removing every plate is worth (+20–30 %), and the evidence covers sectors and `--messy`.
6. The pass rule runs with real prices and bill times, before any UI.
