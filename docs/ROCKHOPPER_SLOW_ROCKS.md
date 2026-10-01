# Rockhopper slow-burn rocks (proposal, 2026-10-01)

**Status:** revision 5. **PASS for a prototype behind a new-game switch** after five review rounds (rounds 1–3 REVISE, round 4 PASS with conditions, round 5 confirmed them met; see
[the review record](reviews/2026-10-01-rockhopper-slow-rocks-adversary.md)). The user chose the full
review process. Nothing here is implemented. A PASS would authorise only a prototype behind a new-game
switch.

## Why

The user, after playing: the pace flattens on the first asteroid and it takes a while to reach the
second; that is fine if there is something to automate, but "right now I spend too much time staring
at it, where the main bottleneck is tractor speed. I'm not sure I even like that mechanic. Asteroids
should much more slowly be destroyed and we need to keep hopping from one to another. That empty space
left behind also becomes a resource where we can do more logistics and advanced machinery."

### What the bot measures today (simulation, not a playtest)

An instrumented copy of `tools/rockhopper-bot.ts` (an `onTick` hook, scratch only) over seeds 1–4,
classic field and sectors, laser on, crossings on:

| Phase (seed 1 classic) | Length  | First rock's slot empty | Drill time idle (no rock) | Rock life, then tow |
| ---------------------- | ------- | ----------------------- | ------------------------- | ------------------- |
| First rock only        | 0–2:23  | 62 %                    | 69 %                      | ~4.5 s, then ~8 s   |
| Two or three T1 rocks  | → 10:50 | 67 %                    | 73 %                      | ~2.3 s, then ~5 s   |
| After T2               | → 20:00 | 65 %                    | 57 %                      | ~2 s, then ~4 s     |

Seeds 2–4 and sectors are within ±3 points. The bot keeps the old socket count per rock; a player who
crowds a rock drains it faster and waits more.

**Faster towing alone does not fix it.** With instant towing (`tractorLevel` forced to 99), T2 comes at
4:05–4:35 instead of 10:36–10:58, but T2 → T3 becomes ~13 min with 4:32–5:12 stretches in which the bot
buys nothing (today: about 2 min). The stare moves; it does not go away.

**Rocks that last longer** (exploratory patch, `docs/reviews/evidence/2026-10-01-slow-rocks-explore.patch`,
applied to a scratch copy of `sim.ts`; each cell yields several chunks before it disappears, the bot
re-tows at once, tow 3 s):

| Model (seeds 1, 3; 30 min)           | T1 rock life (bot) | Slot empty, 2–3 T1 rocks | T2          | T3          | Longest no-buy gap after T2 |
| ------------------------------------ | ------------------ | ------------------------ | ----------- | ----------- | --------------------------- |
| Today (tow 8 s, no tractor)          | ~3 s               | 76–77 %                  | 14:29–14:35 | > 30 min    | 3:08–3:28                   |
| Uniform depth 10                     | ~25 s              | 27 %                     | 5:20–5:28   | 21:01–23:02 | 5:31–6:04                   |
| Uniform depth 20                     | ~45 s              | 14–17 %                  | 4:44–4:52   | 19:00–21:32 | 4:54–5:35                   |
| Dense core, centre depth 60, crust 1 | ~50–70 s           | 4–6 %                    | 4:22        | 16:59–19:13 | 3:55–5:08                   |

Income per second while a rock is present is unchanged by depth (a layer is one chunk for one cell's
work), so depth removes the waiting, not the effort. Two consequences the prototype must handle: the
opening speeds up (T2 at ~4:20 against ~11 min), so slot prices need retuning; and the bot crowds rocks,
so even at depth 60 its rocks last about a minute, while a human with fewer drills sees several.

**What depth buys, honestly.** On pace, deep rocks and instant towing are the same in the bot (round 1:
instant tow T2 4:05, T3 17:15–17:26; dense core T2 4:22, T3 16:59–19:13). The case for slow-burn rocks is
not speed. It is what the user asked for: a rock you work for minutes instead of a rock that vanishes
every few seconds, no timer to stare at, and a field whose rocks run dry at different times so attention
moves between them. The post-T2 wall is not new: today the longest no-buy gap between T2 and T3 over 40
min is already 4:53–6:59 on the classic field and 4:08–9:59 on sectors (round 2). S9 bounds how much worse it may get, and on sectors it does get worse (see the S9 table).

### Revision 2 measurements (scratch patch, seeds 1 and 3, 30 min, tow 3 s)

| Model                                   | Rock life (bot, T1) | Slot empty | T2        | T3          | Crumble share of chunks | Largest crumble flight |
| --------------------------------------- | ------------------- | ---------- | --------- | ----------- | ----------------------- | ---------------------- |
| Depth 1, crumble 20 % of cells (today)  | ~2 s                | 56–58 %    | 7:57–8:04 | 25:50–27:05 | 19.4 %                  | 30                     |
| Uniform depth 40, crumble at 5 % layers | 94–102 s            | 3 %        | 4:29–4:52 | 18:41–20:08 | 3.9 %                   | 480 (unsplit)          |
| Uniform depth 40, crumble at 2 % layers | 94–95 s             | 3 %        | 4:39–4:53 | 17:54–18:57 | 1.2–1.3 %               | 200–480 (unsplit)      |

Uniform depth keeps every vein plan's value where it is today (round 1: flat value is 97–102 % of the
tier mean for every plan), because every cell, ore or rock, crust or core, is multiplied alike.

### Round 2 measurements of pad docks (scratch, 8 seeds, 40 min)

Earned at 40 min, keeping one berth as a pad with a pad dock fed by re-routed dock belts, against never
keeping a pad (mean, seeds the pad won):

| Pad berth | Classic     | Sectors     |
| --------- | ----------- | ----------- |
| 0 (T1)    | −5.4 %, 0/8 | +4.8 %, 4/8 |
| 1 (T1)    | −3.8 %, 2/8 | +4.0 %, 5/8 |
| 2 (T1)    | +2.2 %, 4/8 | +8.0 %, 5/8 |
| 3 (T2)    | −3.2 %, 1/8 | +6.0 %, 5/8 |
| 4 (T2)    | −2.0 %, 0/8 | +2.6 %, 3/8 |

The gain is untangling: crossing plates within 150 u of the hub fall from 7.2 to 3.6–4.5 on sectors,
where belts knot round the hub, and stay about 2 on the classic field, where the re-routed belts add
plates in the field instead. So a pad dock is a situational answer to a knotted hub, not a must-have.
Hub docks never ran out before 40 min. The bot routed the longest belts, not the ones that cross most.

### S9 price search (scratch, revision-3 rules, 8 seeds per field, 40 min)

24 combinations of T1 {×2, ×2.5}, T2 {×3, ×3.5, ×4}, T3 {×1.4, ×1.6, ×1.8, ×2} were run against
today's per-seed baseline (today's T2 → T3 gap: classic 4:53–6:59, sectors 4:08–9:59). T3 ×1.4 and ×1.6 tied on the search's score; revision 5 takes **×1.4**, because it serves the
metric the user complained about (time spent waiting) at the cost of three classic seeds reaching T3
up to 1:26 early. Per seed, against today on the same seed:

| T1 ×2.5, T2 ×4, T3 ×1.4 | T2 at 7–11 min      | T3 at 25–33 min                        | T3 later than today     | Gap ≤ 1.5× today                                         | Worst gap ratio |
| ----------------------- | ------------------- | -------------------------------------- | ----------------------- | -------------------------------------------------------- | --------------- |
| Classic                 | 8 of 8 (7:27–8:14)  | 5 of 8 (23:34–28:36)                   | 0 of 8                  | 8 of 8                                                   | 1.08×           |
| Sectors                 | 6 of 8 (7:05–11:52) | 5 of 8 (25:07–37:25, one not by 40:00) | 5 of 8 (+2:39 to +8:59) | 6 of 8 (seed 5's gap still open at 40:00, at most 1.16×) | 1.94×           |

(With ×1.6: classic 7 of 8 in the T3 window, worst gap 1.25×; sectors worst gap 2.18×, 6 of 8 seeds
later to T3 than today; round 4 reproduced those numbers exactly.) The gap metric drops a gap still open
at 40:00; on sector seed 5 that gap is at least 10:41 at ×1.6.

**On the default field (sectors), the wait moves past T2 rather than shrinking on most seeds.** The
seeds that suffer are not simply the weak ones: sector seed 2 is today's strongest sector (651k at 30
min) and in slow-burn earns 609k (0.94×) and reaches T3 8:59 later at ×1.4 (10:32 at ×1.6). Weak seeds mine fewer chunks,
not poorer ones (seed 5: 47.8k drill chunks in 20 min against 100.7k on seed 4; value per chunk
1.73–1.95 on every seed). The prototype must explain the sector shortfall (layout, crossings or the
bot's socket placement) before tuning further. The search used revision 4's laser (today's
nearest-cell rule). Script: `docs/reviews/evidence/2026-10-01-slow-rocks-s9-search.sh.txt` with round 3's `s9.ts`.

## Decisions (revision 5)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Deep rocks, uniform depth.** Every cell of a rock holds `DEPTH[tier]` layers (prototype start: T1 40, T2 60, T3 80, T4 100). A layer costs the cell's full hardness in work and yields one chunk, so income per second is unchanged, a rock lasts `DEPTH` times longer, and every vein plan keeps today's value. **The starter rock** (the first rock the first berth ever gets) has depth 1 and today's rules, including the crumble at 20 % of cells, so the opening plays exactly as today. **The laser keeps today's rule** (the nearest remaining cell within 2.5 cells of the finger) and works it one layer at a time. A cell shows **four shade bands**: intact; **scratched** (from the first layer taken, so a held laser or a new drill bit shows a mark within a second or two); half; a quarter or less.                                                                        |
| S2  | **Value arc and a small crumble.** One thin ring around each live rock shows the share of layers left. A deep rock crumbles when 5 % of its layers remain (3.9 % of chunks in the bot); each crumbling cell's layers fly home in flights of at most 4 chunks (largest pop 120, for crystal). The pop marks them raw, as today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S3  | **No timer; auto-tow.** A spent berth tows the slot's next rock in by itself after 3 s (1.4 s of it visible), unless it is marked **Keep as pad**. The next rock is generated as today (same signature and vein plan, new outline), so "veins belong to the slot" still holds. The tractor upgrade is gone in this mode, and there is no candidate choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S4  | **Stow, for pads only.** A live rock on a berth marked Keep as pad gets **Stow** in its bubble (a 0.6 s hold, like Sell). The rock is towed aside whole, layers and crumble state kept, and delivers nothing while stowed; the berth is a pad 1.4 s later instead of up to 20 min later. A stowed rock is drawn as a small parked rock beside its berth with its value arc, so the clip shows it is kept, not destroyed. Unmarking the pad tows that same rock back (3 s); only a rock that ran dry is ever followed by a fresh one, so Stow can never trade a worked rock for a fresh one. Unmarking is refused while a machine stands on the pad ("clear the pad first"); belts may cross a pad or a returning rock, as they cross rocks today. Stow is not offered on a crumbling rock or one being towed in. Dry drills on a berth resume when its rock returns. The stowed rock is saved. |
| S5  | **Pads and pad docks.** A berth marked Keep as pad becomes a **pad** once empty (spent or stowed), drawn as a hole in the rock field (a dashed rim and a dark floor, never rock). Any machine may stand on a pad, and the **pad dock** stands only there: one level, 2 belts, each bundle thrown to the hub along a visible arc in the chunk-flight art (0.6–1.1 s, full value, bars stay bars). It is not a hub dock. At most one pad dock per pad. Price: `dockCost(docks + padDocks)`, so every hub dock or pad dock bought raises the price of the next of either (a pad dock is two ports, priced like one dock). While a belt is dragged toward a pad dock, the plates it would create or remove are previewed. Unmarking an empty pad with no machine on it tows a rock in again after 3 s (the held rock if there is one). Factories are not gated.                                    |
| S6  | **Group move.** When a berth becomes a pad its drills show "dry". The pad bubble has **Move drills**: tap a live rock and they take its free rim spots nearest the tap, one drill at a time, nearest the tap first, each paying what the destination is pricier by at that moment (so the source count falls and the destination count rises as they go), exactly as that many single moves would. A drill that can't be placed stays dry and its spot flashes the reason ("no room here", "belt blocked").                                                                                                                                                                                                                                                                                                                                                                                    |
| S7  | **Hopping, as it really is.** In a field of fixed berths the rocks rotate under the player rather than the player travelling: each berth runs dry at its own time and refills itself, and hopping in the literal sense happens when the player gives a berth up as a pad (usually a late T1 berth, worth little by then) and moves its drills to a live rock. Drill prices on a berth count every drill on its rim, dry or not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S8  | **Switch and saves.** A new-game menu switch, "Rocks: slow-burn / classic", next to "Next game: sector / classic"; all four combinations play. A running game never changes. The v3 save gains optional `slowRocks`, per-rock `layers`, per-berth `keepPad`, `held` (a stowed rock) and per-drill `dry`, and pad docks as a new machine kind; a save without them is classic, bit-for-bit (the tractor level stays saved for classic). The rock render cache key includes the shade bands. Each mode has its own price table (S9). AGENTS.md invariants are amended for this mode only.                                                                                                                                                                                                                                                                                                        |
| S9  | **Prices.** This mode has its own slot-unlock prices: **T1 ×2.5, T2 ×4, T3 ×1.4, T4 ×1** of today's; dock, machine, widening and drill prices unchanged. No new purchase fills the T2 → T3 stretch (that is the job of the factories and research experiments). The accepted bound, measured over 8 seeds per field: **classic**, T2 at 7–11 min on every seed, T3 within 1:30 of the 25–33 min window, and every seed's T2 → T3 gap at most 1.5× today's; **sectors**, at least 5 of 8 seeds within 1.5× today's gap, the worst under 2×, and the number of seeds that reach T3 later than today reported. Prices outside slot unlocks (now about half as costly relative to income) and the T3 → T4 gap (13:24–14:43 against 9:35–13:53 today, classic seeds 1–4) are measured by the prototype, not bounded here.                                                                           |

## Deferred

- **Choosing the next rock** (round 2: with factories off, equal-value candidates reduce to "take the
  richer one"). It may return when something downstream wants a particular ore.
- **Live rocks block belts.** Round 1 measured 0–2 foreign belts over a T1 berth.
- **Factories or the Lab only on pads** (round 1: floor is not scarce, so this only gates them).
- **A pad dock level 2** (round 2: −9.5 % classic, +6.6 % sectors against +8.0 % at level 1).

## Positioning (Star Birds)

Star Birds builds on living asteroids and links them with trade rockets; its puzzle is pipes that may
not cross. Here a rock is still consumed, and only the hole a consumed rock leaves becomes floor. All
output still reaches one hub. The pad dock throws to that hub only, in the same art as chunks flying
home from the laser, with no routes, schedules or destinations to choose. A pad is drawn as a hole, not
a rock, so the clip never shows a base standing on an asteroid. Pads have no upkeep or needs.

## Clip scenario (30 s, portrait, silent)

- **0–10 s** _(fresh save, real time, disclosed scripted input)_: as today. The finger holds the starter
  rock and it carves; "+1 +3" on arrival; a drill is dragged onto the rim and its belt fills.
- **10–20 s** _(disclosed cut to a prepared sector save in which belts knot round the hub)_: a T2 rock's
  arc is nearly empty and it crumbles; 3 s later the next rock is towed in and its drills bite again.
  Next to it, the player holds Stow on a T1 rock that is marked Keep as pad: it is parked beside the berth
  with its value arc, and a dark hole opens.
- **20–30 s**: a pad dock is dragged onto the hole (only the hole glows). Two long belts are dragged
  into it; the preview shows the plates by the hub going out; bundles arc to the hub, and the belts that
  were taking turns at those plates run full. Every beat is a real sim event, and the prepared save's
  bot replay is kept as the uncut witness.

## Evidence the prototype must bring

1. Bot over 8 seeds × {classic, sectors} × {today, slow-burn}, 40 min: slot-empty share before T2 under
   10 %; against S9's bound per field (classic: T2 at 7–11 min, T3 within 1:30 of 25–33 min;
   sectors: the counts in the S9 table); the T2 → T3 gap per seed against today, counting a gap still open at
   the end, with T3 ×1.4 and ×1.6 side by side; T3 time against today per seed; the T3 → T4 gap; whether
   dock, machine and drill prices still create decisions at doubled income; the price table.
2. Crumble share and the largest single flight.
3. Vein-plan values over 400 sector seeds within ±10 % of the tier mean.
4. Pad policies on 16 seeds: never a pad, against a pad dock fed by the belts that cross most near the
   hub (not the longest); earned at 40 min and plates near the hub and in the field, both directions
   reported; the time from deciding on a pad to having one, with and without Stow.
5. Tests: layers, starter rock, the scratched band, crumble split, auto-tow, Keep as pad, Stow delivers
   nothing and brings the same rock back with its layers and crumble state, unmark refused while a machine
   stands on the pad, dry drills resume, pad placement, pad dock delivery, group move and its refusals, save round-trip with and
   without the fields, classic unchanged to the credit on seed 1.
6. 390 px screenshots: shade bands under drills between 0:15 and 1:00, the value arc, a pad drawn as a
   hole, a pad dock ghost glowing only on a pad, the plate preview, and the clip's beats.
7. The clip's before/after belt rates on the re-routed belts, measured in the prepared save, a
   "developed factory" label on the cut, and Stow shown keeping the rock.
8. 390 px shots of the scratched band on T2 and T3 rocks.
9. Bot harness note: patched copies must import their own `src` (round 3 found the bot imported the sim
   by absolute path).

## Open questions (for the playtest)

1. Does a rock that takes minutes still look alive with four shade bands, or does it look stalled?
2. Will players keep a pad at all, and which berth?
3. Is the empty space a resource in the way the user meant, or only a fix for a knotted hub?
