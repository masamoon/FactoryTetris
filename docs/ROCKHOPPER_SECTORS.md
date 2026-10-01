# Rockhopper sectors (prototype, 2026-10-01)

**Status:** a reversible experiment. The menu's **Next game** switch is on by default, so a new game
(a first launch or a hold-to-restart) starts on a random sector. A running game never changes field,
and saves from before this change stay on the classic field. Switch to **Next game: classic** and
restart to compare.

## Why

Before this change, every player got the same map. The game started on seed 1, and slot positions,
sizes, ore signatures and prices were all fixed in `config.ts`. Across 200 seeds, the seed changed a
rock's total value by only 5–12 %, and the pacing bot built the same factory on seeds 1–8 (22 drills,
7 smelters). The user's goal: like a Factorio map, a new game should pose **new logistics problems**,
not just new numbers.

## What a sector changes

All of it comes from one seed (`sectorSlots(seed)` in `src/rockhopper/sector.ts`), so a sector can be
shared by its number and replays exactly.

- **Where the rocks sit.** Each tier keeps its band of heights, but rocks move within it, so belt
  lengths, which rock sits behind which and which docks are natural all change. In 46 % of sectors one
  first-tier rock sits **beside the hub**, below the docks, so its belts have to climb around. 56 % of
  rocks have another rock across their straight line to the hub (38 % on the classic field).
- **Which ore each slot favours.** Signatures swap only within a tier, so the second rock you buy is ice
  in about half of sectors. The free first rock stays copper so the opening plays the same.
- **Rock outlines.** Round, oval, peanut (a waist) or bitten (a bite out of one side). The outline still
  wobbles with every respawn.
- **Vein plans.** Scattered (classic), core (ore deep inside), crust (ore in the outer layer), side (one
  flank rich), seam (a band across) or pockets (2–3 lumps). Where the ore sits decides which side of the
  rock drills want, so it decides where belts start. The plan belongs to the slot, so veins stay put
  across respawns, as on the classic field.

What never changes: tiers, radii, prices, unlock order, the tier's ore share and the classic grid
each rock fits in. Rocks keep the classic clearance between rims (14 units), and every rim stays at
least 110 units clear of the hub.

## Fairness, measured

`npx tsx tools/rockhopper-sectors.ts` (2000 seeds, all legal):

| Slot | Tier | Distance to hub, p10–p90 (classic) | Value vs classic, mean (p10–p90) |
| ---- | ---- | ---------------------------------- | -------------------------------- |
| 0    | T1   | 237–305 (270)                      | 92 % (84–100 %)                  |
| 1    | T1   | 261–368 (319)                      | 103 % (92–115 %)                 |
| 2    | T1   | 265–375 (319)                      | 94 % (83–106 %)                  |
| 3    | T2   | 476–598 (512)                      | 111 % (88–138 %)                 |
| 4    | T2   | 484–606 (512)                      | 90 % (71–113 %)                  |
| 5    | T3   | 751–869 (769)                      | 110 % (85–140 %)                 |
| 6    | T3   | 754–875 (769)                      | 104 % (80–134 %)                 |
| 7    | T4   | 1043–1118 (1010)                   | 96 % (88–104 %)                  |

The wide T2/T3 spread is the signature swap (an ice-rich slot becomes gold-rich, or the reverse). Within
a tier the two slots trade value, so the tier's total holds.

Pacing bot, 40 minutes, crossings on (`npm run bot:rockhopper -- --sector --seed N --minutes 40`). The
bot is an upper bound on pace, not a playtest:

| Field               | T2 reached  | T3 reached  | Earned at 40 min | Factory at 40 min                     |
| ------------------- | ----------- | ----------- | ---------------- | ------------------------------------- |
| Classic, seeds 1–8  | 10:36–11:41 | 27:55–32:15 | 663k–896k        | always 22 drills, 7 smelters          |
| Sectors, seeds 1–10 | 9:36–11:56  | 24:29–33:39 | 524k–1.14M       | 22–27 drills, 5–7 smelters, 7–9 docks |

Pace stays in the classic band while the factory the bot ends up with differs from seed to seed. The
bot routes greedily and does not read veins, so these numbers say the sectors are playable and fair,
not that they are more fun. That needs a human playtest.

## Open questions for the playtest

1. Do different layouts make you route differently, or does every sector still end up in the same
   shape?
2. Is a rock beside the hub a fun problem or just an annoying one?
3. Are vein plans readable at a glance (a crust or a seam), and do they change where you drop drills?
4. Next levers, if layouts are not enough: rocks that belts cannot cross (terrain), and choosing which
   scanned rock the tractor tows in next (discovery).

## Rolling back

Switch **Next game: classic** and restart. Saves without `sector` load on the classic field, and the
classic field's rocks are generated exactly as before (the bot's seed-1 run is unchanged to the credit).
