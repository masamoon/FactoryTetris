# Mobile-first UI adversarial review and redesign — 2026-09-25

## Request and scope

The user asked for an adversarial review of design, compellingness, UI and flow against the north star — the appeal must be visible in a silent, portrait 30-second clip — and for the UI to be rebuilt mobile-first with as few fixed buttons as possible, without compromising usability or gameplay.

This pass changes presentation and input only (`src/asteroid/App.ts`, `Scene.ts`, `style.css`). Simulation rules, costs, rates, pockets, undo and persistence are unchanged; the deterministic tests and replays are unaffected. Two flow changes touch when planning ends (D6, D7 below) and are called out for that reason. An independent adversarial agent reviewed the implemented UI; its verdicts are recorded below. None of this is human playtest evidence.

## Review of the previous UI (observed)

Captured at 390×844 and 360×640 with the real app ([before, 390](evidence/2026-09-25-before-production-390.png); [before, inspector at 360](evidence/2026-09-25-before-inspector-360.png)).

1. **Critical — chrome owned the frame.** The fixed header (brand, sound, help, three counters, objective title and detail), camera bar, hint line, six tool buttons and a Pause/Undo/save/Restart row left a canvas of about 483 px of 844 (57%) at 390×844 and about 312 px of 640 (49%) at 360×640. Fourteen buttons were always on screen. In a silent clip nearly half of every frame was static text and controls.
2. **Critical — the 360×640 inspector bug still reproduced.** Opening the drill inspector expanded the footer and left most of the canvas blank white/black, as recorded on 2026-09-23. The layout assertions passed because they only checked document overflow.
3. **High — the payoff was too small to read.** Cargo on belts was drawn at about 3 px, drill loads at about 5 px, and a delivery only changed a counter in the header. A viewer could not see ore _arrive_.
4. **High — comprehension depended on reading 8–12 px text.** Tool costs, the persistent hint, the objective detail, the in-canvas “00 / SECTOR 07” and “PLANNING · PAUSED” labels are illegible in a phone-sized video and compete with the world.
5. **High — buttons duplicated gestures or default state.** “Mine” selected the default mode, “Remove” was a rarely used mode, and ←/Dock/→ duplicated drag panning. The only way to pan while drawing belts was the arrow buttons.
6. **Medium — planning was easy to miss and slow to leave.** Time stopped whenever a tool was selected, but the only indication was a 10 px canvas label; after drawing a route the player had to find “▶ Resume” in the bottom row before anything moved, which delays the key action-to-payoff moment.
7. **Medium — thumb travel.** Every build needed tool → world tap → a small Build button in the footer text area.
8. **Structural (not changed here) — a horizontal factory on a portrait screen.** Collection, drill and pocket span 15 columns; any readable zoom shows about ten. This is a gameplay-level constraint on the clip, not something UI can fully solve. Deferred to a gameplay review (see below).

## Decisions implemented

| #   | Decision                                                                                                                                                                                                                                                                | Why it serves the north star                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Full-bleed canvas; floating stock pill + menu, a one-line goal chip, and one floating bottom dock. The scene receives the HUD/dock heights as insets and keeps the world between them instead of resizing the canvas.                                                   | The world now fills 77% (390×844) and 70% (360×640) of the screen with the goal collapsed. The inspector can no longer shrink or blank the canvas. |
| D2  | Default framing fits ~10 columns (collection, starter row and rock face). Pinch or wheel zoom; two-finger pan in any mode; belt drags scroll at screen edges. Camera buttons removed; a recentre button appears only when collection is off-screen or the zoom changed. | Removes three permanent buttons without losing panning while drawing. Larger machines in the default frame.                                        |
| D3  | Tools stay hidden until any ore, stock or machine exists. No Mine tool (live mining is the default; re-tap the active tool or **Done**). No Remove tool: tapping a conveyor offers Rotate / Remove.                                                                     | The opening frame is the asteroid, “HOLD TO MINE”, the goal and the ore count — the hook, with nothing else.                                       |
| D4  | Pause, help, sound, reduced motion, restart and save status moved into a menu (opening it pauses). A **▶ Resume** pill appears only while paused.                                                                                                                       | Removes four permanent controls; pausing remains two taps (or Space).                                                                              |
| D5  | The objective is a one-line chip that expands its detail for ~7 s on each new step, with a glow, and on tap.                                                                                                                                                            | Guidance without a permanent paragraph; the step change is itself a visible beat.                                                                  |
| D6  | One contextual dock: planning bar with a “⏸ time stopped” badge and **Done**; preview bar with ✕ / **Build** (and rotate for conveyors); tapping the same ghost again builds it.                                                                                        | Planning is labelled in the interface a viewer looks at, and building can stay on the world.                                                       |
| D7  | After a successful conveyor **drag**, the clock resumes automatically. Single tapped conveyors stay in planning.                                                                                                                                                        | Drawing the route and seeing cargo move becomes one continuous action.                                                                             |
| D8  | Guidance overlays: drill sites whose shaft ends in a surveyed pocket glow (fallback: any valid face); processor modes highlight replaceable empty conveyors; the tool the goal needs pulses when affordable; unaffordable tools dim.                                    | Shows where the decision is, in the world, without text.                                                                                           |
| D9  | Payoff feedback tied to real events: “+1” above COLLECTION for each actual delivery event, counter bump on every stock increase, larger cargo on belts and rails, plate/part counters appear when relevant.                                                             | A silent viewer sees cargo arrive and the count rise. Nothing is shown for cargo that has not been delivered.                                      |
| D10 | Undo is an icon slot at the left of the tool row, invisible when there is nothing to undo, and hidden with the tools while a machine is inspected.                                                                                                                      | Recovery stays one tap away without a labelled permanent button.                                                                                   |

Before/after fixed controls: 14 always-visible buttons became 7 during play (menu, goal chip, undo slot and four tools) and 2 at cold start.

## Truthful 30-second clip (real time, scripted inputs)

[Uncut capture](evidence/2026-09-25-cold-start-realtime-scripted.webm), 390×844, real-time simulation, **scripted inputs** (faster and more precise than a new player), fresh save, no cuts or speed changes:

|    Time | Player action                                                   | Automatic consequence                                                                                                                       |
| ------: | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–6.4 s | Holds three rock faces                                          | Blocks crack, ore flies to COLLECTION, ore count bumps to 6; the build tools appear and the drill tool pulses.                              |
| 6.4–9 s | Picks Drill; three pocket-reaching sites glow; taps (7,6) twice | Time was stopped and labelled while planning; the drill appears and starts on its own.                                                      |
|  9–13 s | Picks Conveyor and drags 6→2                                    | The route is built and time resumes on release.                                                                                             |
| 13–19 s | —                                                               | The drill breaks rock; ore rides the rail and the belts; “+1” pops above COLLECTION for each arrival.                                       |
| 19–26 s | Picks Smelter; empty conveyors glow; taps (4,6) twice           | Eight ore are spent; the smelter joins the running line.                                                                                    |
| 26–31 s | —                                                               | Ore enters the smelter and the first plate reaches collection (plate counter shows 1). The goal now asks for six plates: the next decision. |

Stills: [opening](evidence/2026-09-25-after-opening-390.png), [drill sites](evidence/2026-09-25-after-drill-sites-390.png), [first deliveries](evidence/2026-09-25-after-first-delivery-390.png), [smelter at 31 s](evidence/2026-09-25-after-smelter-31s-390.png), [developed drill choice](evidence/2026-09-25-after-drill-choice-390.png) (prepared replay state; label as developed-factory footage), [inspector at 360](evidence/2026-09-25-after-inspector-360.png).

Disclosure: a human first session will be slower. The clip is evidence that the interface can show change → automation → next decision inside 30 s, not that players reach it in 30 s.

## Deferred gameplay questions (not changed)

These are gameplay decisions and need their own adversarial review before any change:

- **Portrait vs horizontal factory.** The core line runs left–right; the pocket at x15 and the extension at x23 are off-screen at a readable zoom. A vertical shaft/rail orientation, or a shorter first shaft, would fit a portrait clip better but changes terrain, pockets and every replay.
- **Extension payoff delay.** The 2026-09-23 review measured 84 simulation seconds between committing the first extension and new digging. No UI change makes that visible within 30 s truthfully.
- **Cheap second drill stockpiles ore.** It does not speed the first part; the clip-worthy consequence of that choice is weak.
