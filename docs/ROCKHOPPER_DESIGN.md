# Rockhopper — redo design (2026-09-29)

> **Superseded in part (2026-09-30):** routing, belts and smelters are now defined by the logistics revision in [ROCKHOPPER_LOGISTICS.md](ROCKHOPPER_LOGISTICS.md), which wins wherever the two disagree (R5, R6, belt speed, smelter splicing, auto-link, slot heights and prices).

The user asked for a complete redo because the Asteroid Works prototype "feels terrible to play". The requested loop: a tiny ship/robot mines asteroids, by hand at first and then with machinery. It should play as a cross between an automation game and an incremental game, and read clearly in a silent 20-second portrait clip, like a typical mobile "fake game ad" (their readability, not their deception). It should be touch-first, with as few buttons and panels as possible. The visual identity comes from a Claude Design canvas.

## What was wrong with Asteroid Works (observed)

- **Friction before payoff.** Time stopped whenever a tool was selected. Construction needed a tool, then a site, then confirmation. Conveyors were drawn cell by cell on a grid. Undo snapshots, planning mode and tender extensions were rules the player had to learn before the game got going.
- **Unreadable at phone scale.** The factory was a horizontal line in a portrait frame. Cargo was 3–5 px. Most of the screen was chrome and text.
- **Small, slow feedback.** One cell broke at a time, grey on grey, with a counter at the top.
- **Progression by exception.** Special-case sectional drills, pockets, tenders and caps stood in for an open incremental curve.

## The new game in one line

You are **Hop**, a tiny mining robot at a space station. **Hold on an asteroid to laser it apart.** Chunks stream home and turn into credits. Spend credits to **drag drills onto asteroids** that eat them automatically. Belts carry the chunks, and **smelters** triple their value. Then **unlock more of the asteroid field**: the camera pulls back and bigger, richer rocks drift in.

## Decisions (revision 3, after two adversarial reviews)

The first review (2026-09-29) passed R10, R12 and R13 and asked for revisions on everything else, and on the clip. Every "must fix" item is folded in below. The second review passed R2, R4, R7, R8 and R10–R13, and asked for small revisions to R1, R3, R5, R6, R9 and the clip. Those are applied here as revision 3.

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Top-down portrait world, stacked tiers.** The hub station sits at the bottom. Asteroid _slots_ are fixed and arranged in tiers that climb upward: T1 has 3 slots at y −230; T2 has 2 at y −460; T3 has 2 at y −720; T4 has 1 giant at y −990 (world units, hub at the origin; the world is about 1180 units tall). A fresh save has only the T1 centre slot unlocked. Machines and belts sit in continuous space, with no grid. **Default framing** fits the hub plus the unlocked tiers, with a zoom floor of 0.55 so cells stay at 5.5 px or more on a 390 px-wide phone. When content overflows, **the hub stays pinned to the bottom edge** and the top tier clips; the player drags empty space to pan. Unlocking a tier plays a short, temporary zoom-out reveal. Pinch is optional. |
| R2  | **Voxel-cell asteroids of capped size.** Cells are 10 units. Asteroid radius is 6/8/10/11 cells for T1–T4 (about 110/200/310/380 cells). Tiers get richer through **composition**, not size. Each slot has a fixed seeded _ore signature_ (e.g. copper-heavy or ice-heavy). Each ore has a colour, a lightness step **and a shape**, so ore reads in greyscale too. Chunks and bars keep that shape.                                                                                                                                                                                                                                                                                                                                                                                         |

Ore types:

Ore types (hardness as implemented; the design-stage values were 1/2/2/4/6):

| Ore     | Value | Hardness (work) | Chunk shape    |
| ------- | ----- | --------------- | -------------- |
| Rock    | 1     | 0.5             | rounded square |
| Copper  | 3     | 1               | round nugget   |
| Ice     | 5     | 1.2             | triangle shard |
| Gold    | 12    | 2.5             | diamond        |
| Crystal | 30    | 4               | hexagon        |

Cells are never created or refilled.

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3  | **Manual mining = press, hold or drag on an asteroid.** The laser fires **immediately from Hop's current position**. Hop flies toward a point **offset above the finger** so the thumb doesn't hide the action. Each tick, the beam **auto-seeks the nearest remaining cell** within 2.5 cells of the finger, so a still finger keeps carving outward. If nothing is left there, the beam **falls back to the nearest remaining cell anywhere on the touched asteroid**. Latency budget: a crack shows within 100 ms, the first rock cell breaks within 300 ms, and T1 chunks reach the hub within 0.6 s. Base laser power is 2.0 work/s, and a level-1 drill also does 2.0 work/s, so buying the first drill never feels like a downgrade. The laser has **6 levels, then it's maxed**, and its peak income is designed to stay well below a modest drill set (checked with the pacing bot). Chunks fly straight to the hub, skipping docks and belts. The per-tick laser target is recorded so replays can serve as clip witnesses. |
| R4  | _Superseded by free rim placement, `docs/ROCKHOPPER_FREE_DRILLS.md`._ **Drills are slot-anchored.** Drag a drill from the tray onto a slot; it snaps to the nearest free **rim socket** of that slot (T1–T4: 3/4/5/6 sockets, fixed angular spacing). Its telescoping bit mines the **nearest remaining cell to the drill with no reach cap**, so every drill works until the rock is spent. The rate is in cells-equivalent per second: level-1 drills do 2.0 work/s (at least the base laser), and hardness = work. Output goes to a 4-chunk buffer; when it's full the drill stops. **Upgrades raise the rate only.**                                                                                                                                                                                                                                                                                                                                                                                                              |
| R5  | **Belts are straight links with limited hub docks.** Every machine has exactly one output. **Valid targets:** a drill may feed a _smelter_ (3 inputs, 4 from smelter level 3) or a free _hub dock_; a smelter may feed only a free hub dock. The hub starts with **3 docks** (upgradable to 9). A new machine auto-links to the nearest free valid target. If there is none, it shows a red "no link" badge and fills up, which is visible backpressure. **Unlinked machines retry auto-linking whenever a target frees up** (after a re-route, sale or upgrade), smelters first, then drills in placement order. The ceiling is 9 docks × 4 inputs = 36 linked drills, which is more than the 33 sockets. Dragging from a machine to a target re-routes it. Chunks travel visibly at a fixed speed with minimum spacing and queue when the destination refuses. Belts are drawn above asteroids, and crossings are allowed.                                                                                                          |
| R6  | **Smelters are merge points.** A smelter is placed in open space (not on an asteroid, not overlapping). It accepts raw chunks of any type from its input belts, taking **round-robin, one chunk per belt in turn**, into a 4-chunk queue. It processes one per 0.5 s at level 1, and outputs a bar worth 3× the chunk. Because docks are scarce, a smelter is how several drills share one dock. Its throughput cap makes "which drills go through which smelter, and how many smelters versus dock upgrades" the core routing decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R7  | **Asteroid lifecycle.** When an asteroid falls below 20 % of its original cells, it _crumbles_: the remaining cells break loose over about 1.5 s. Each yields its chunk once and flies directly to the hub. After an arrival delay (8 s at level 1), a replacement generated **within the slot's fixed radius**, with the slot's ore signature (richness depends on the tier, never on the respawn count), is tractored in. Drills keep their sockets and resume.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R8  | **Two-tap unlock in the world.** A locked slot shows as a dashed outline with its price. The first tap opens a bubble with the price and the slot's ore-signature chips. Tapping the bubble buys, and the rock is tractored in. The next tier's slots appear when the current tier is fully unlocked (a short, temporary camera reveal).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R9  | **In-world bubbles.** Tapping a machine gives _Upgrade (cost)_ — hold it to repeat-buy — then _Move_ and _Sell_. Sell is set apart and needs a 0.6 s hold (a fill ring), refunding 50 %. Tapping the hub gives _Laser_ (6 levels), _Docks_ (+1 each, max 9) and _Tractor_ (arrival delay). There is no belt-speed upgrade: belts carry a single machine's output and never bind. Bubbles clamp to the safe area and sit above the touch point. Costs grow geometrically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R10 | **HUD** _(PASS)_ — One credit counter at the top, a two-item tray (Drill, Smelter) with prices at the bottom, and a small menu (sound, reset). The world insets to fit between them. Items dim when unaffordable and pulse the first time they become affordable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R11 | **Real time, no long-press.** Build by dragging from the tray (drop on the tray or an invalid spot to cancel for free), or tap the tray to arm it: the item lifts, valid spots glow and a ghost follows. The next world tap places it and disarms. Move happens through the bubble: pick Move, then tap or drag to a destination. There's no undo; Sell refunds 50 %.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| R12 | **Truthful juice** _(PASS)_ — Every effect maps to a real simulated event. "+N" appears only when a chunk arrives at the hub; a break site gets sparks, not a number. The sim runs at a fixed 30 Hz, deterministic, with seeded asteroids, and is independent of the renderer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| R13 | **Persistence** _(PASS)_ — Autosave to localStorage every 5 s and on page hide. The save includes chunks in flight, belt contents and crumbles in progress. There's no offline catch-up. A new save namespace; the old prototypes stay at `?mode=works` and `?mode=tiles`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### Gesture map (adopted from the review)

| Touch                           | Starts on                        | Result                                                |
| ------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Press, hold or drag             | Asteroid (outside machine cores) | Mine immediately. Never pans.                         |
| Tap (under 10 px, under 300 ms) | Machine                          | Bubbles: Upgrade / Move / Sell (hold)                 |
| Drag (10 px or more)            | Machine                          | Re-route its output link                              |
| Tap                             | Hub                              | Global upgrade bubbles                                |
| Tap                             | Locked slot                      | Price and ore-signature bubble; tap the bubble to buy |
| Drag                            | Tray item                        | Place; drop on the tray or an invalid spot to cancel  |
| Tap, then tap                   | Tray, then world                 | Place once, then disarm                               |
| One-finger drag                 | Empty space                      | Pan (clamped to the world bounds)                     |
| Tap                             | Empty space                      | Dismiss bubbles                                       |
| Two fingers                     | Anywhere                         | Pinch or pan; cancels an active laser                 |
| Long-press                      | —                                | Not used                                              |

## Target 20-second clip (revised)

Capture plan: **segment A is real time from a fresh save with scripted, disclosed inputs. Segment B is a disclosed cut to a developed save.** A deterministic bot replay of each segment is kept as the uncut witness.

- **A, 0–10 s** _(fresh save, real time, scripted input)_
  - **0–5 s:** The finger holds the T1 asteroid. The laser carves, and chunks stream to the hub with "+1 +3" on arrival. The counter reaches the first drill price (10).
  - **5–10 s:** The Drill button pulses. It's dragged onto the rock and snaps to a socket. Its bit bites in, a belt links it to a hub dock, and chunks ride the belt. The finger leaves the screen and the counter keeps rising.
- **B, 10–20 s** _(cut, developed save)_
  - **10–14 s:** Three drills eat a T1 rock. It crumbles in a burst, and a new rock is tractored into the same slot. The drills resume.
  - **14–20 s:** The hub's docks are full, and a new drill shows its red "no link" badge. A smelter is dropped, and a drill belt is dragged onto it; the freed dock is picked up by the smelter automatically. Chunks go in, bars come out, and the pops jump ×3. The player taps a locked T2 slot, then its bubble: the camera briefly reveals the next tier.

Segment B's exact timing is to be re-derived from the bot witness after implementation. If the ×3 pops don't land inside the window, the clip discloses an extra cut. Each segment shows a player change, the automation's response, and the next decision. Human first sessions will be slower than scripted input. After implementation, a companion ordinary-play review (bot pacing, dominant strategies, chores) must accompany the capture.

## Pacing targets (provisional; checked with a scripted bot, not human evidence)

| Beat                                    | Target from fresh save       |
| --------------------------------------- | ---------------------------- |
| First drill (price 10) by manual mining | 3–6 s scripted, 5–15 s human |
| First smelter affordable                | 60–120 s                     |
| Docks become the constraint             | around the 4th machine       |
| T1 fully unlocked                       | 4–7 min                      |
| T2 reached                              | ~8–12 min                    |

## As implemented (2026-09-29)

The design passed review and is implemented in `src/rockhopper/`. A post-implementation adversarial review then ran on the working build. Where the implementation departs from the text above, this section wins.

### Tuning

- **Hardness.** Hardness is halved for common ores (see the ore table), so hand mining breaks about 4 rock cells/s.
- **Prices.**

| Item        | Price                          |
| ----------- | ------------------------------ |
| First drill | 14, then ×1.55 per drill owned |
| Smelter     | 320 × 2^n                      |
| Dock        | 300 × 2.6^k                    |
| T1 slots    | 0 / 400 / 2000                 |
| T2 slots    | 18k / 40k                      |
| T3 slots    | 160k / 360k                    |
| T4 slot     | 1.8M                           |

- **Stacked belts (readable at any level).** Belts move at 95 × 1.25^(L−1) u/s, capped at 135 u/s. That is about 5.4 u per frame in a 25 fps video, well under the 13 u bundle spacing. Upgraded machines instead ship **bundles** of up to 1 + ⌊(L−1)/2⌋ chunks or bars (1, 1, 2, 2, 3, 3, 4, 4), drawn as a small tumbling pile or an ingot stack.
  - Whatever is waiting at a loading slot leaves together.
  - Docks deliver a whole bundle at once.
  - Smelters peel one chunk per tick off the front bundle, round-robin across belts.
  - Capacity always exceeds the feeding machine's output, so an upgrade is never capped by its own belt.
- **No rounding.** Drills and smelters carry leftover work and time across ticks, so no level is rounded down to one break or one bar per tick. Drills top out at level 7 and smelters at level 8.
- **Old saves.** Saves from before bundles load: single items become one-chunk bundles.
- **Smelter splice.** A new smelter placed when every dock is taken takes over the nearest direct drill line's dock. That drill then feeds the smelter.
- **Docks.** All 9 docks sit on the hub's upper arc, facing the field.

### Presentation

- **Pops.** Deliveries collect into one "+N" above the dock arc for 0.45 s, then float away.
- **Belt flash.** Belts flash when automatically re-routed, so auto-links and splices are visible.
- **Camera framing.** The camera frames the hub and the unlocked slots, with a zoom floor of 0.55 even after pinching. Locked slots are not framed. Their price tags clamp to the screen edge, stay tappable, and anchor the unlock bubble.
- **Tray.** The tray is hidden until the player has credits. The smelter button appears after three drills, after the first smelter, or when a machine is unlinked.
- **Tutorial hands.** A "HOLD" hand shows until the first breaks, then a drag-a-drill hand shows until the first drill.
- **Levels.** Drill levels show only in the tap bubble.
- **Laser safety.** The laser is never saved. Hiding the page or losing focus ends every gesture.

### Witnesses

`tools/rockhopper-clip.ts` records segment A in capture mode (`?clip`). It sends real touch events, draws a dot under each real touch, and hides the tutorial hands. Every player command goes through `COMMANDS` in `sim.ts` and is logged with its tick. The tool replays the log headlessly and requires a byte-identical state.

Latest run ([log](reviews/evidence/rockhopper-clip-segment-a.log.txt), [video](reviews/evidence/rockhopper-clip-segment-a.webm), [commands](reviews/evidence/rockhopper-clip-segment-a.commands.json)): _(this log predates free drill placement: its `buildDrill` arguments are socket indexes, and it replays only on builds before that change)_

| Wall    | Sim     | Event                                |
| ------- | ------- | ------------------------------------ |
| 0.09 s  | 0.10 s  | touch down on the rock               |
| 4.38 s  | 4.37 s  | lifted with 15 credits               |
| 5.83 s  | 5.83 s  | drill dropped                        |
| 10.74 s | 10.73 s | hands off with 19 credits and rising |

Witness replay of 87 commands: identical. Stills: [4 s](reviews/evidence/rockhopper-clip-04s.png), [7 s](reviews/evidence/rockhopper-clip-07s.png), [10 s](reviews/evidence/rockhopper-clip-10s.png). Segment B still needs its developed-save capture. The bot-produced stills are labelled developed: [12 min](reviews/evidence/rockhopper-developed-12min.png) and [30 min](reviews/evidence/rockhopper-developed-30min.png).

### Pacing

These are scripted greedy-bot numbers, an upper bound and not human evidence (`npm run bot:rockhopper`).

| Beat              | Time  |
| ----------------- | ----- |
| First drill       | 0:03  |
| First smelter     | 1:24  |
| T1 fully unlocked | 4:39  |
| T2                | 11:13 |
| T3                | 25:08 |

Income rises steadily through about 30 minutes. Purchases thin out after about 45 minutes, and the bot does not reach T4 within 70 minutes. The late game (T4, and anything after it such as prestige) is still open.
