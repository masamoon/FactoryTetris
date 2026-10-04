# Rockhopper: Lab projects (late-game proposal, revision 1, 2026-10-04)

Status: **revision 1, round 1 REVISE** ([review](reviews/2026-10-04-rockhopper-lab-projects-adversary.md)); revision 2 in progress. Nothing here is implemented. It extends the research Lab ([ROCKHOPPER_RESEARCH.md](ROCKHOPPER_RESEARCH.md), scoped PASS for a prototype, not built) and would ship behind the same off-by-default "Research" switch. A PASS would authorise only that prototype; it is not evidence of fun or balance.

## Why

The user, 2026-10-04: "What's the core loop after docks are full? Can we buy more stations?" They then chose the Lab over pad docks or a second hub, and the project found that the Lab as designed does not reach the late game: it skims about 1 % of output, and its five recipes are done by early T3. Its own doc says "18–30 min has nothing to research" and it "does nothing for the stretch after about 45 min".

What the greedy bot shows today (simulation, not a playtest; `npm run bot:rockhopper -- --slow`, fixed costs, crossings on, 60 min, seeds 1–2):

- All nine docks are bought before 25 min; T3 opens at about 13 min and T4 at about 39 min.
- Income stops growing at about 15 min and stays near 1.5 K/s to 60 min, even as T3 and T4 drills are added. The bot spends 83–85 % of the game in gaps over 30 s without a purchase and ends with 1.5–1.9 M unspent credits and nothing left to buy.
- Docks are not the limit: the bot uses 8 of 9, at about 40 % of belt capacity. With crossings off, income keeps climbing to 2.5–3 K/s and T4 comes about 9 min sooner, so the cap is (inferred) belts taking turns at plates near the hub.
- Paired bars reaching the hub per minute, 40–60 min, seeds 1–3: rock 3 960–4 290, copper 620–810, ice 570–640, gold 270–300, crystal 65–270. Crystal stays scarce even with T4 open, because hard crystal (hardness 4) drills slowly.

So the late game lacks two things: **things to build** once rocks, docks and belts are maxed, and **a reason for output to matter** besides the next slot price.

## The idea in one line

**After the recipes, the Lab takes on projects: bills of bars that unlock new things to build.** The player feeds a bill by putting the Lab on a line that carries its ores, and speeds it up by building more drills and smelters on those ores.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LP1 | **Projects are bills of paired bars.** A project lists one or two ores and a count of paired bars (×6) of each, for example "Pad docks · ice 0 / 1 000 · gold 0 / 400". Raw chunks, lone bars, rock bars and alloys never count.                                                                                                                                                                                                                                   |
| LP2 | **The same clamp, taking every bar it still owes.** A project uses the Lab's existing clamp (TT1, TT2: same anchor, placement, move and ghost rules). While a project is active, every paired bar of an owed ore that passes the anchor is taken, until that ore's line on the bill is met; everything else passes untouched, and the belt never waits. Taken bars earn no credits (the project's real price). There is no hold and no `LAB_HOLD` in project mode. |
| LP3 | **One active thing at a time.** The bubble lists available recipes and projects together (TT3's rule): one is active, counts are kept per row, and switching loses nothing. A project is **available** once both its ores have been delivered as paired bars and every recipe whose ores are both known is learned, so recipes stay the tutorial.                                                                                                                  |
| LP4 | **Rewards are new things to build, never "+ %".** Four projects, in the order they become available:                                                                                                                                                                                                                                                                                                                                                               |
|     | **P1 Pad docks** (ice 1 000, gold 400; T2): unlocks the pad docks already designed in [ROCKHOPPER_SLOW_ROCKS.md](ROCKHOPPER_SLOW_ROCKS.md) S5 (keep a spent berth as a pad, build a two-belt dock on it that throws to the hub). This is the "more stations" answer: each pad dock is a purchase and a re-route. Slow-burn rocks only, as S5 is.                                                                                                                   |
|     | **P2 Belt tier 5** (copper 2 000, gold 800; T2): a fifth widening step at a fixed 6 400 per belt. Bundles carry 5 chunks, and a plate passes one bundle per turn, so wider belts are the purchase that loosens a knot of plates.                                                                                                                                                                                                                                   |
|     | **P3 Drill levels 8 and 9** (crystal 600, gold 800; T3): two more drill levels on every drill (`drillUpgradeCost` continues its curve: about 2 060 and 4 330), so hard T3/T4 rock gets something to spend on per drill.                                                                                                                                                                                                                                            |
|     | **P4 Belt tier 6** (crystal 1 200; T3): a sixth widening step at 25 600.                                                                                                                                                                                                                                                                                                                                                                                           |
| LP5 | **Bills are tuned by the bot, not by feel.** The counts above are provisional. Target: the bot's median time per project, on the best single belt and with no new building, is 6–12 min, so a player who builds for it beats that. Any project over 15 min median has its count cut before the prototype is shown.                                                                                                                                                 |
| LP6 | **What stays out.** No credits are paid for projects, no project gates rocks, docks, smelters, junctions, bend posts or crossings (the research doc's rejections hold), and the Lab never consumes rock.                                                                                                                                                                                                                                                           |
| LP7 | **Saves.** Project counts and unlocks live in the existing optional `research` field (`projects: { [id]: { counts, done } }`). A malformed field resets research as TT7(b) says. With research off, every project reward is off too: belts and drills above the old caps load capped (their spend is kept and refunded on sale as usual), and pad docks follow S5's switch.                                                                                        |

## What it gives the player

- **A goal in each long wait.** P1 and P2 fill the 15–30 min stretch after the T2 recipes; P3 and P4 fill the 30–45 min wait for T4.
- **Something to build for it.** A bill finishes faster with more drills on its ore (with ore picks on, picking that ore), a smelter on a raw line that carries it, or a junction that merges two such lines before the Lab.
- **A cost.** Bars the Lab takes earn nothing: P2's 2 000 copper and 800 gold bars are about 94 K credits, one minute of late income, so the cost is small; the gate is time.

## Honest scope

- The placement decision is light (as in the research doc): usually the busiest line carrying the bill's ores, near where lines merge.
- P2–P4 are more of an existing kind of purchase (widen, level up). They add purchases per machine, not new machines. P1 is the only new structure.
- After P4 there is nothing new again. A repeatable last project (for example hopping to a new sector, a prestige) is deferred: it changes the game's shape and needs its own review.
- Whether belt tiers 5–6 actually beat the plate cap is a simulation claim to measure, not a given.

## Evidence the prototype must produce

- Bot, 60 min, seeds 1–3, research + projects on, against research alone: each project's time, purchases per minute and the share of time in gaps over 30 s from 15 min on, income at 20/30/45/60 min, T3/T4 times, value the Lab took.
- Throughput through the bot's hub knot with belts at tier 4 against tiers 5–6 (crossings on).
- Tests: only owed paired bars are taken, the belt never waits, rewards appear only after completion, saves round-trip, a malformed field resets, research off caps belts and drills.
- A 390 px screenshot of the bubble with a project row.

## Open questions

- Is a bill of bars a goal, or a timer you wait out?
- Is "more widen steps, more drill levels" new enough, or more of the same?
- Should the last project repeat (a hop to a new sector)?
