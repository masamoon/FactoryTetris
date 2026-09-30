# Rockhopper: drill prices by rock tier

Status: experiment for the user's playtest (2026-09-30), behind the menu switch **"Drill prices: by rock / classic"**, on by default. One adversarial review round was chosen by the user.

## Problem

The user found that prices rising on every purchase "flatten the pace". A drill cost 14 × 1.55ⁿ, n = drills owned anywhere. Since free drills (`ROCKHOPPER_FREE_DRILLS.md`), rim length already sets how many drills fit on a rock (12 / 12 / 10 on T1, 16 / 16 on T2, 20 / 20 on T3, 21 on T4: 127 in all), and finite cells plus the respawn wait punish crowding. The ×1.55 price limits drills a second time and much harder: the 20th drill costs about 58 000, the 30th about 4.6 million, so every rock past the first few is priced out long before its rim is full.

## Rule (revision 2, after the review)

- **D1. Price by the rock the drill stands on.** A new drill on slot i costs `DRILL_BASE[tier] × 1.15^k`, where k is the number of drills currently on that slot's rock. Bases: T1 14, T2 400, T3 6 000, T4 60 000 (each about 2 to 4 % of that tier's slot prices). A full rock's last drill costs 4.6× its base on T1 (12 drills: 65), 8.1× on T2 (16: 3 250), 14× on T3 (20: 85 000) and 16× on T4 (21: 982 000), so rim space, not price, is what stops the player. On T1 and T2 the last drill stays below the next tier's base.
- **D2. Unlocking a rock gives a cheap burst.** A fresh rock starts at its tier's base, whatever stands elsewhere.
- **D3. A move costs what the destination is pricier by.** Moving a drill costs `max(0, price on the destination − price where it stands)`, both counted without the moved drill, in any direction. Moves within a rock, onto an emptier rock or down to a cheaper one stay free. Buying anywhere and dragging is therefore never cheaper than buying in place (a randomized test checks this). The cost is added to the drill's `spent`, so selling refunds half of it.
- **D4. The tray shows the cheapest price.** The tray shows the cheapest drill among unlocked rocks and dims only when even that is unaffordable. While dragging a drill, the ghost shows the price where it would land, above the ghost and clear of the finger, in yellow when affordable and coral when not; a move shows its cost only when there is one, and nothing is shown off the rim. An unaffordable drop flashes the counter as before.
- **D5. A playtest-only switch.** The menu switch flips back to the classic 14 × 1.55ⁿ with free moves, for comparison. It applies immediately, so flipping it mid-game can dodge either price (buy under classic, drag up for free, flip back). That is accepted for a playtest toggle and must be removed, or limited to new games, before the experiment is adopted. The save remembers it; old saves load with prices by rock.

Smelters, docks, belt tiers, upgrades and slot unlocks keep their geometric prices.

## Review

One adversarial round, as the user chose (2026-09-30). Verdicts on revision 1 (per-tier counting at ×1.18, only upward moves charged): D1 REVISE, D2 PASS conditional on D1, D3 REVISE, D4 PASS with conditions, D5 REVISE; overall REVISE. Findings and how revision 2 answers them:

- Counting per tier made the curve steep: filling T3 cost 25 M, and a crowded tier's next drill cost more than the next tier's base. **Now per rock at ×1.15**, with the numbers in D1.
- Moving down was free even onto a pricier tier: buying at T4's base and dragging down filled T3 20× cheaper. **Moves are now charged in any direction** (D3).
- The live switch lets a player dodge prices. **Accepted as playtest-only and documented** (D5).
- The ghost price must sit above the ghost and be absent off the rim; a refused move must still flash the counter. **Done** (D4).
- Risk logged: T1 is very cheap (a full first rock costs about 400 against 4 870 under classic), so the early "buy, wait, buy" rhythm goes away.

Revision 2 was not re-reviewed (one round was chosen).

## Evidence so far (simulation, not a playtest)

`npm run bot:rockhopper` keeps its old per-rock socket counts (3 / 3 / 3 / 4 / 4 / 5 / 5 / 6 drills), so it buys every allowed drill within seconds of each unlock under either pricing: its gaps are waits for the next slot unlock, not for drill prices. Income at 30 minutes over seven seeds, revision 2 against classic: −6 %, +4 %, −26 %, −17 %, +16 %, +9 %, +5 %, which is within the bot's path-dependent noise. A full-rim variant (`BOT_FULL_RIM=1`) places drills badly under both pricings, so it cannot measure crowding either. The question this experiment answers is a human one: whether cheaper crowding feels better or just drains rocks faster.

## Open questions for the playtest

- Does filling a fresh rock with cheap drills feel like a payoff, or like busywork?
- Does crowding a rock drain it into the respawn wait so fast that the extra drills feel useless?
- Is the ghost's price readable, and does the tray's "cheapest" price mislead once T2 is open?
- Is a move's cost noticed, or does it surprise?
