# Rockhopper: Lab projects (late-game proposal, revision 2, 2026-10-04)

Status: **revision 2, round 2 REVISE** (LB4 count and LB5 plate choice; the rest PASS or PASS with conditions). Round 1 gave revision 1 (bills of bars unlocking pad docks, belt tiers 5–6 and drill levels 8–9) an overall REVISE ([review](reviews/2026-10-04-rockhopper-lab-projects-adversary.md)); how this revision answers it is at the end. Nothing here is implemented. It extends the research Lab ([ROCKHOPPER_RESEARCH.md](ROCKHOPPER_RESEARCH.md), scoped PASS for a prototype, not built) and would ship behind the same off-by-default "Research" switch. A PASS would authorise only that prototype; it is not evidence of fun or balance.

## Why

The user, 2026-10-04: "What's the core loop after docks are full? Can we buy more stations?" They then chose the Lab over pad docks or a second hub, and the project found that the Lab as designed does not reach the late game: it skims about 1 % of output, and its five recipes are done by early T3. Its own doc says "18–30 min has nothing to research" and it "does nothing for the stretch after about 45 min".

What the greedy bot shows today (simulation, not a playtest; `npm run bot:rockhopper -- --slow`, fixed costs, crossings on, 60 min, seeds 1–2):

- All nine docks are bought before 25 min; T3 opens at about 13 min and T4 at about 39 min.
- Income stops growing at about 15 min and stays near 1.5 K/s to 60 min, even as T3 and T4 drills are added. The bot spends 83–85 % of the game in gaps over 30 s without a purchase and ends with 1.5–1.9 M unspent credits and nothing left to buy.
- Docks are not the limit: the bot uses 8 of 9, at about 40 % of belt capacity. With crossings off, income keeps climbing to 2.5–3 K/s and T4 comes about 9 min sooner, so the cap is (inferred) belts taking turns at plates near the hub.
- With factories on (research needs them), the same runs look alike: income flat near 1.4–1.7 K/s from about 15 min, 83–85 % of the game in gaps over 30 s, 1.45–1.71 M unspent at 60 min.
- Paired bars reaching the hub per minute, 40–60 min, seeds 1–3: rock 3 960–4 290, copper 620–810, ice 570–640, gold 270–300, crystal 65–270. Crystal stays scarce even with T4 open, because hard crystal (hardness 4) drills slowly.

So the late game lacks **things to build** once rocks, docks and belts are maxed, while **the knot of plates round the hub** quietly costs a third to half of late income and nothing rewards fixing it bit by bit. Round 1 confirmed both (dock belts sit full at about half capacity behind plates).

## The idea in one line

**The Lab researches bridges, one at a time, and the player places each one on the worst crossing.** A bridge lifts one belt over another at one plate, so that plate stops taking turns. Bridges are few and get dearer, so the player still untangles, and spends the late surplus on the plates that matter most.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LB1 | **A bridge removes one plate.** A bridge is placed on a plate (crossings on). The two belts there no longer take turns: both run through at full speed, the upper one drawn over the lower on a short arched deck. It removes only that plate; the same two belts touching elsewhere still make plates. A bridge sits on its plate's key (`crossings.ts`: the two owners and pieces), so it follows its plate while the same two pieces still touch; if a re-route, move, bend or splice makes that plate disappear, the bridge returns to the player's stock, free to place again. Bridges never make a belt pass under a machine. |
| LB2 | **Each bridge is researched, then bought.** The Lab's bubble gains one row after the five recipes: "Bridge n · ore 0 / count", a one-ore bill of paired bars. While it is active, the clamp (TT1/TT2 placement, anchor and move rules unchanged) takes every paired bar of that ore that passes until the bill is met; everything else passes, the belt never waits, taken bars earn nothing. When it is met, bridge n can be bought, and the next row appears.                                                                                                                                                                     |
| LB3 | **Bills are one ore, never crystal, and short.** Bridge 1–6 bills: ice 300, gold 200, copper 400, ice 500, gold 400, copper 600 (provisional). One ore means one belt always suffices; no crystal protects the copper + crystal premium. Target: the bot's median on the best legal belt is 2–5 min each (round 1's best-belt rates: copper 188–245, ice 145–197, gold 90–163 /min). A project done mid-bundle takes only what is owed and leaves the rest on the bundle.                                                                                                                                                           |
| LB4 | **Bridges cost credits that climb, and there are six.** Bridge n costs 40 000 × 2ⁿ⁻¹: 40 K, 80 K, 160 K, 320 K, 640 K, 1.28 M, 2.52 M in all, against the 1.45–1.9 M the bot leaves unspent. Six is fewer than the plates a tangled hub carries (the crossings clip save has 11), so untangling still pays and a bridge goes where untangling can't help. The bridge price is the one exception to fixed costs (F2: like docks, bridges are a shared cap on logistics, not a machine kind).                                                                                                                                         |
| LB5 | **Choosing the plate is the decision.** The ⇄ chips already mark hot plates (crossings C4). Placing a bridge shows, for every plate, a ghost that lights on the finger's plate with the two belts' wait shares. No projected income is shown; the player reads the knot.                                                                                                                                                                                                                                                                                                                                                            |
| LB6 | **What stays out.** No reward multiplies throughput by itself (no wider belts, no deeper drills, no bigger bundles). Docks are not gated: pad docks are a separate build of S5 as already passed, not a Lab reward. Research gates nothing else.                                                                                                                                                                                                                                                                                                                                                                                    |
| LB7 | **Switch and saves.** Behind "Research" (off by default, needs Factories on). Bills, bought bridges and placed bridges live in the optional `research` field: `bridges: { bill, counts, bought, placed: plateKey[] }`. A malformed field resets research (TT7(b)). With research or crossings off, placed bridges are kept but inert, and a placed bridge whose plate no longer exists on load returns to stock. Bridges are never sold (no refund exploit).                                                                                                                                                                        |

## What it gives the player

- **A late loop that compounds.** Feed the Lab (one placement, 2–5 min), buy a bridge, put it on the worst plate, watch that line speed up; the next bill fills faster on a freer line.
- **A credit sink sized to the surplus.** The six bridges cost about 2.5 M, against 1.45–1.9 M the bot never spends.
- **A reason to read the knot.** Which plate costs most is visible but not computed for the player.

## Honest scope

- The Lab's part is still a light placement (the busiest legal belt carrying the ore); its job here is pacing and a visible goal, not a puzzle.
- Six bridges end around the time T4 is bought; after that there is nothing new again. A repeatable last project (hopping to a new sector) stays deferred.
- How much a bridge is worth is a simulation claim to measure: crossings off is +60–100 % for the whole hub, but one bridge may be worth little or a lot.

## Evidence the prototype must produce

- Bot (factories + research on, 60 min, seeds 1–3), placing each bridge on the plate with the highest combined wait share, against research alone: each bill's time on the best legal belt, purchases per minute and share of time in gaps over 30 s from 15 min on, income at 20/30/45/60 min, T3/T4 times, value the Lab took, copper bars reaching a crystal factory. **Pass rule:** from 15 min on, time in 30 s+ gaps falls by at least 10 points and income at 45 min rises, without lowering the crystal premium share.
- Income gain per bridge, in order, and with all six against crossings off, so bridges are shown not to close the whole on/off gap.
- The legal Lab anchor length on every dock belt (round 1, finding 4).
- Tests: a bridge removes exactly its plate; it returns to stock when its plate disappears; inert with crossings or research off; bills take only owed paired bars of one ore; the belt never waits; save round-trip and malformed field reset. The crossings stress tool with bridges placed: 0 locks, 0 stalls.
- 390 px screenshots: a bridge over a plate at zoom 0.58, the placing ghost, the bill row.

## Open questions

- Does a bridge read clearly at phone size next to plates and ⇄ chips?
- Is six right, or should the count follow the number of plates?
- Do players untangle more or less once bridges exist?

## Round 1 answered

1. Belt tiers 5–6 dropped (they did nothing, or became a multiplier). LB6 bans throughput multipliers outright.
2. Pad docks are no longer gated (LB6); bridges are the new placeable reward.
3. Drill levels 8–9 cut.
4. Bills are one ore, so one belt always suffices; crystal bills are gone.
5. The Lab placement is stated as "the busiest legal belt", and the anchor length is on the evidence list.
6. No crystal bills, and the premium share is part of the pass rule.
7. The pass rule now covers gaps and purchases, not project time alone.
8. The baseline now includes factories on.
