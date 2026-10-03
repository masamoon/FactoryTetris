# Rockhopper: fixed costs

Status: experiment for the user's playtest (2026-10-03), the first setting of the menu switch **"Prices: fixed / rising, by rock / rising, classic"**, on by default for new games and old saves.

## Why

The user, after drill prices by rock ([ROCKHOPPER_DRILL_PRICES.md](ROCKHOPPER_DRILL_PRICES.md)): "I still think things should have fixed costs, because right now there's too much dead time waiting for resources to accumulate when that dead time should push players to build, like in Factorio."

## Rule (revision 2, after the review)

- **F1. One price per kind.** Every purchase of a kind costs the same however many are owned, like a Factorio recipe:

  | Item         | Fixed price                                    | Rising price it replaces                   |
  | ------------ | ---------------------------------------------- | ------------------------------------------ |
  | Drill        | by rock tier: 20 / 500 / 5 000 / 50 000        | by rock: base × 1.15 per drill on the rock |
  | Smelter      | 600                                            | 520 × 2ⁿ                                   |
  | Factory      | 2 400                                          | 2 400 × 2ⁿ                                 |
  | Widen a belt | by the step: 100 (1→2), 400 (2→3), 1 600 (3→4) | 90 × 1.7ⁿ, n = steps bought anywhere       |

  Each fixed price sits near what the first purchase cost under rising prices, so the opening keeps its beats (first smelter at 0:45–0:52 in the bot, against 0:41–0:48).

- **F2. What stays.** Levels keep their per-level price: a machine's level upgrades (each level is its own recipe, and its price does not depend on how many machines exist) and the hub's levels, the laser and the docks (300 × 2.6ᵏ, 3 to 9). Docks are one shared capacity, not a kind of machine you place, and cheap docks would remove a logistics limit (a review finding). Slot unlocks keep their prices (slow-burn S9 or classic).
- **F3. Moves within a tier are free; up a tier they pay the difference.** Moving a drill to a rock of a higher tier costs the difference between the two tier prices (a T1 → T4 move costs 49 980), added to the drill's `spent`; moving within a tier or down is free. Without it a drill bought for 20 could be dragged onto the T4 rock for nothing (a review finding). Selling refunds half of `spent`, so selling and rebuying always loses, with one exception: a save from before fixed costs carries `spent` at rising prices, so selling its crowded drills and rebuying can gain once (a T2 drill bought for about 1 600 refunds about 800 and rebuys for 500). That is accepted for a playtest.
- **F4. One cycling switch.** The menu's price button cycles fixed → rising, by rock → rising, classic. It applies immediately: a playtest toggle, like the drill-prices switch. Saves remember it, and old saves load with fixed costs. The drag ghost shows a new drill's price and any move charge.

## What the bot shows (simulation, not a playtest)

`npm run bot:rockhopper -- --slow` (the default slow-burn rocks), crossings on, seeds 1–4, 40 minutes; `--rising` gives the comparison. The bot now prints a dead-time line: purchases, the longest stretch with none, the total length of no-purchase stretches longer than 30 s (a coarse measure: a whole stretch counts once it passes 30 s), and what its best option was while it couldn't afford it.

| Seeds 1–4        | T2        | T3          | T4          | Earned by 40 min | Purchases | Longest gap | Time in gaps > 30 s |
| ---------------- | --------- | ----------- | ----------- | ---------------- | --------- | ----------- | ------------------- |
| Rising (by rock) | 7:29–8:02 | 24:39–28:38 | —           | 1.2–1.5 M        | 238–274   | 8:37–12:03  | 68–70 %             |
| Fixed            | 4:33–4:52 | 11:32–12:59 | 32:28–39:57 | 3.1–4.0 M        | 348–399   | 13:35–15:29 | 71–79 %             |

Fixed costs double the pace (T3 about 13 minutes sooner, about 2.5× the credits) and add half again as many purchases. **They do not cut the bot's dead time.** Under both, most of the bot's waiting is saving for the next slot unlock (rising: T3 38–46 %, T2 17–20 %; fixed: T4 43–51 %, T3 22–24 %), and slot unlocks were already fixed prices. Under fixed costs the bot ends with about 30 drills, 8 smelters, 9 docks and nearly every belt at tier 4, then waits 20–27 minutes from T3 to T4 with nothing left to buy. The bot keeps the old socket count per rock, so this partly reflects its cap.

A variant that places drills anywhere on the rim (`BOT_FULL_RIM=1`; it places them badly, so its totals are lower under any pricing) builds 79 drills under fixed costs against 63, reaches T3 at 23:35–25:38 (rising never does within 40 minutes) and spends 62–66 % of its time in gaps under both.

**Reading.** In the bot, dead time comes from running out of things worth building before the next rock, not from prices that climb. Fixed costs make every build affordable sooner, which is what the user asked for, but on their own they do not deliver the Factorio feel of always having something to build. The next levers are what there is to build per rock and the price of the later unlocks (224 K and 504 K for the T3 rocks and 1.8 M for T4 in the slow-burn game). The playtest decides whether fixed costs feel better even so.

## Review

One adversarial round (2026-10-03), as for drill prices. Verdicts on revision 1: F1 REVISE, F2 PASS, F3 REJECT as written, F4 PASS with a ghost fix; overall REVISE. How revision 2 answers:

- Drills could be dragged up a tier for free, voiding the tier prices. **Moves up a tier now pay the difference**, with a test (F3).
- Docks at 500 each made all nine cost 3 000 and stopped limiting logistics. **Docks keep their hub-level schedule** (F2).
- "Nothing can be bought cheaper by rearranging" was false. **F3 rewritten**, and the one-time old-save gain is stated.
- The move ghost hid move charges when cycled from classic. **It now shows them whenever fixed costs are on.**
- The doc should say plainly that fixed costs alone don't deliver the Factorio feel. **Done** (Reading).

Revision 2 was not re-reviewed (one round).

## Open questions for the playtest

- Do fixed prices make you build more, or do you just reach the next unlock sooner and wait there?
- Is the opening still paced well (first smelter, first dock, first widen)?
- With prices flat, do rim space, docks and belts feel like the limit, as in Factorio?
