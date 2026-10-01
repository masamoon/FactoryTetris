# Rockhopper slow-burn rocks (proposal, 2026-10-01)

**Status:** revision 2, after review round 1 (REVISE; see
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
moves between them. The post-T2 wall (the longest no-buy gap grows from about 2 min today to 4:30–5:35
with any fix that removes the wait) is a price problem and is handled separately (S9).

### Revision 2 measurements (scratch patch, seeds 1 and 3, 30 min, tow 3 s)

| Model                                   | Rock life (bot, T1) | Slot empty | T2        | T3          | Crumble share of chunks | Largest crumble flight |
| --------------------------------------- | ------------------- | ---------- | --------- | ----------- | ----------------------- | ---------------------- |
| Depth 1, crumble 20 % of cells (today)  | ~2 s                | 56–58 %    | 7:57–8:04 | 25:50–27:05 | 19.4 %                  | 30                     |
| Uniform depth 40, crumble at 5 % layers | 94–102 s            | 3 %        | 4:29–4:52 | 18:41–20:08 | 3.9 %                   | 480 (unsplit)          |
| Uniform depth 40, crumble at 2 % layers | 94–95 s             | 3 %        | 4:39–4:53 | 17:54–18:57 | 1.2–1.3 %               | 200–480 (unsplit)      |

Uniform depth keeps every vein plan's value where it is today (round 1: flat value is 97–102 % of the
tier mean for every plan), because every cell, ore or rock, crust or core, is multiplied alike.

## Decisions (revision 2)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Deep rocks, uniform depth.** Every cell of a rock holds `DEPTH[tier]` layers (prototype start: T1 40, T2 60, T3 80, T4 100). A layer costs the cell's full hardness in work and yields one chunk, so income per second is unchanged and a rock lasts `DEPTH` times longer; vein-plan values stay within today's ±3 %. **The starter rock** (generation 0 of the first berth) has depth 1, so the opening (laser carving, first drill, first crumble) plays exactly as today. A cell shows its remaining layers in **four shade bands** (100–75–50–25 %), not per layer.                                                                                                                                                                                                       |
| S2  | **Value arc and a small crumble.** One thin ring around each live rock shows the share of layers left. A rock crumbles when **5 % of its layers** remain (measured 3.9 % of chunks); each crumbling cell's layers fly home split into flights of at most 4 chunks, so no single pop exceeds 4 × the ore's value (120 for crystal). The pop marks them raw (no bar icon), as today.                                                                                                                                                                                                                                                                                                                                                                                              |
| S3  | **No timer; auto-tow.** A spent berth tows its next rock in by itself after 3 s (1.4 s of visible tow), unless the player marked it **Keep as pad**. Nobody has to tap to keep mining, so a player who looks away loses at most 3 s per rock (one per 1.5–2 min per berth in the bot). The tractor upgrade is gone in this mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S4  | **Pick the next rock.** Tapping a live or empty berth opens a bubble with the **two candidates** for its next rock. They have the same total value (within ±5 %, the tier's normal spread), and differ in **signature** (which of the tier's ores it favours) and in the **angle of the slot's vein plan** (a seam or side turned to face a different part of the rim). The default is the first. So the choice is fit, not size: the ore your smelter lines or factories want, against veins facing the drills you already have. On the classic field (scattered veins) only the signature differs. Candidates are a seeded sequence per berth and generation, independent of any upgrade. **Invariant amendment:** a slot keeps its vein-plan kind; a towed rock may turn it. |
| S5  | **Pads host pad docks.** A berth marked Keep as pad becomes a **pad** once it is empty. Any machine may stand on a pad, and one machine stands **only** on pads: the **pad dock**, which takes up to 2 belts (3 at level 2) and throws each bundle to the hub in a visible arc (a flight, 0.6–1.1 s, like crumble chunks; delivered at full value, bars stay bars). It is not a hub dock, so it does not count toward the 9-dock cap and its belts never reach the crowded ring of belts around the hub. Price: the next hub dock's price. A pad can also be un-marked: if it has no machine on it, it tows a rock in again. Factories are not gated.                                                                                                                           |
| S6  | **Group move.** When a berth becomes a pad, its drills show "dry". The pad bubble has **Move drills**: tap a live rock and they take its nearest free rim spots (as many as fit), each paying what that rock is pricier by, as a single move does today. The rest stay dry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S7  | **Hopping, as it really is.** In a field of fixed berths the rocks rotate under the player rather than the player travelling: each berth runs dry at its own time, the player picks what comes next, and now and then gives a berth up as a pad and hops its drills to a live rock. Drill prices on a berth count every drill on its rim, dry or not.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S8  | **Switch and saves.** A new-game menu switch, "Rocks: slow-burn / classic", next to "Next game: sector / classic"; all four combinations play (slow-burn on the classic field has scattered veins, so only signatures differ). A running game never changes. The v3 save gains optional `slowRocks`, per-rock `layers`, per-berth `next` (candidate index), `keepPad` and `gen`; a save without them is classic, bit-for-bit. The rock render cache key includes the shade bands. Factories stay a live switch and have no link to pads. AGENTS.md invariants are amended for this mode only.                                                                                                                                                                                   |
| S9  | **Prices.** Slot unlock prices and dock prices are retuned in this mode so the bot reaches T2 at 7–11 min and T3 within today's band (25–33 min), with the longest no-buy gap after T2 no worse than today's (about 2 min with tractor upgrades). The prototype reports every price it changed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Deferred

- **Live rocks block belts.** Round 1 measured 0–2 foreign belts over a T1 berth, so lanes opened by a pad
  would matter little today.
- **Factories or the Lab only on pads** (round 1: floor is not scarce, so this only gates them).
- **Candidates of different sizes or tiers** in one berth.

## Positioning (Star Birds)

Star Birds builds on living asteroids and links them with trade rockets; its puzzle is pipes that may
not cross. Here a rock is still consumed, and only the hole a consumed rock leaves becomes floor. All
output still reaches one hub. The pad dock throws to that hub only, over a short arc, with no routes,
schedules or destinations to choose, so it is a dock in the field rather than a trade network. The
drift risk is pads turning into bases with upkeep or needs; pads have none.

## Clip scenario (30 s, portrait, silent)

- **0–10 s** _(fresh save, real time, disclosed scripted input)_: as today. The finger holds the starter
  rock (depth 1) and it carves; "+1 +3" on arrival; a drill is dragged onto the rim and its belt fills.
- **10–20 s** _(disclosed cut to a developed save)_: a T1 rock's arc is nearly empty and it crumbles. The
  player taps the berth: two candidates, an ice rock and a gold rock whose seam faces the drills already
  on that side. Tap gold: it is towed in, the drills on the seam side light up, and gold rides their
  belts.
- **20–30 s**: a second spent berth is marked as a pad. A pad dock is dragged onto it (only the pad
  glows), two long T2 belts are dragged into it, bundles arc to the hub, and two freed hub docks are
  picked up by drills that showed "no link". Each beat is a real sim event; the bot replay of the
  developed save is kept as the uncut witness.

## Evidence the prototype must bring

1. Bot over 8 seeds × {classic, sectors} × {today, slow-burn}, 40 min: slot-empty share before T2 under
   10 %; T2 at 7–11 min; T3 in 25–33 min; longest no-buy gap after T2 no worse than today; the price
   table.
2. Crumble share and the largest single flight, reported.
3. Vein-plan values over 400 sector seeds: every plan within ±10 % of the tier mean.
4. Pad policies: never a pad, against keeping one pad (each of the three T1 berths, and a T2 berth) for
   a pad dock fed by the longest belts; income at 40 min, docks bought and plates near the hub, both
   directions reported. The pad must win in at least one realistic situation or S5 goes back to review.
5. Candidate policies: always the first, against "match the drills" (the angle that faces the most rim
   drills) and "match the line" (signature wanted downstream); both reported.
6. Tests: layers, starter rock, crumble split, auto-tow and Keep as pad, candidate determinism, pad
   placement, pad dock delivery, group move, save round-trip with and without the fields, classic
   unchanged to the credit on seed 1.
7. 390 px screenshots: the four shade bands, the value arc, the candidate bubble, a pad dock ghost
   glowing only on a pad, and the clip's three beats.

## Open questions (for review and the playtest)

1. Does a rock that takes minutes still look alive with four shade bands, or does it look stalled?
2. Will players keep a pad at all, and which berth?
3. Do candidates' signature and angle change where players put drills?
