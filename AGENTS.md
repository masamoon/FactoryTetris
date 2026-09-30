# AGENTS.md

## Project

Rockhopper is the default runtime (redone on 2026-09-29 after the user found Asteroid Works "terrible to play"). It is a top-down, portrait asteroid-mining game that crosses automation with incremental play. Hop, a tiny robot, lasers rocks by hand (press/hold/drag). Drills snap to rim sockets on fixed asteroid slots and mine inward with no reach cap. Straight belts carry every chunk to a limited set of hub docks (3 to start, 9 max). Since the 2026-09-30 logistics revision (`docs/ROCKHOPPER_LOGISTICS.md`, a reversible experiment for the user's playtest), the player routes the factory: a drill can take up to two other belts and forward them as a fair zipper (a junction), belts have tiers 1–4 that are widened per machine at a global price, smelters pair two chunks into one ×6 bar (×3 per chunk, half the items) with 2/3/4 inputs by level, and dropping a smelter on a belt splices it into that line. New machines auto-link only to free docks. Rocks crumble below 20 % and are towed back in after a delay. Locked slots in four tiers climb upward and are unlocked in-world with two taps. The HUD is a counter, a two-item tray and a menu; everything else is in-world bubbles. The design and its reviews are in `docs/ROCKHOPPER_DESIGN.md` and `docs/ROCKHOPPER_LOGISTICS.md`. The visual identity lives on the Claude Design canvas "Rockhopper — Visual Identity": ink outlines, candy ores on deep violet space, Lilita One numbers and Fredoka words.

The earlier prototypes remain playable with independent saves: the side-view Asteroid Works at `?mode=works` and the ten-level tile workshop at `?mode=tiles`.

## Short-form product constraint

The product direction must make the real experience of building and improving an automated factory intelligible and appealing in a silent, portrait 30-second clip. Every design and gameplay decision must support this direction at the portfolio level through the hook, readability, truth, accessibility/recovery or durable play. Every major gameplay direction and material gameplay change must also be reviewed against a representative clip scenario. The scenario must show a visible player action causing a genuine change in an automatically operating production system, followed by a meaningful consequence or next decision.

Clipability is a product-direction gate, not a requirement that every low-level decision be individually photogenic. A decision may create the short-form hook, improve its mobile readability, preserve simulation truth, support accessibility or recovery, or provide the durable agency, progression and replayability behind it. Reject changes that improve only the clip while harming ordinary play, factory agency, truthful pacing, mobile usability or long-term depth.

Real-time capture is preferred. Abridged footage is permitted only when prepared-save starts, cuts, speed changes and time compression are plainly disclosed. Editing must not fabricate or reorder causality, hide required costs or interactions, imply false production rates, conceal imminent failure or depletion, or substitute scripted effects for simulation. Retain an uncut real-time capture or replay as the verification witness. Label developed-factory footage as such; do not present it as the new-player opening.

Use successful or viral mobile-game clips only as explicit references for portrait framing, silent legibility, visual hierarchy and action-to-payoff cadence. Virality is not evidence of fun, retention, monetization or fit for this game. Do not adopt deceptive playable-ad conventions.

A truthful-clip PASS authorizes the communication hypothesis only. It does not prove enjoyment, balance, retention or commercial viability. Apply the full gate in `docs/SHORT_FORM_PRODUCT_CONSTRAINT.md`.

## Commands

- `npm start` — Webpack dev server at http://localhost:8084 (`?fresh` ignores the save, `?seed=N`)
- `npm run build` — production static site in `dist/`
- `npm run typecheck` — TypeScript validation
- `npm test` — deterministic simulation and persistence tests for all three modes
- `npm run bot:rockhopper` — greedy scripted pacing bot (an upper bound on pace, not a playtest)
- `npm run clip:rockhopper` — real-time 10 s capture from a fresh save with scripted touch input (needs `npm start`)
- `npx tsx tools/rockhopper-clip-b.ts [log]` — headless witness for the staged segment B (junction saturation, widen, splice)
- `npm run replay:asteroid` / `npm run replay` — witnesses for the older prototypes
- `npm run test:browser` — Playwright UI, touch, responsive and save/resume tests (`CHROMIUM_PATH` reuses a local Chromium)
- `npm run lint` — ESLint
- `npm run format` — Prettier

Node.js 22.

## Architecture

Rockhopper (`src/rockhopper/`):

- `config.ts`: every tuning number (ores, slots, prices, rates, geometry).
- `sim.ts`: the pure, deterministic 30 Hz simulation: seeded rock generation, laser/drill mining, belts, smelters, flights, crumble and tow, auto-link/splice and commands. It emits events for presentation only.
- `save.ts`: the `rockhopper.save.v1` namespace and settings, with validation. Saves include belts, buffers, flights, crumbles and cell work.
- `render.ts` and `sprites.ts`: Canvas 2D camera, cached rock bitmaps, vector sprites from the identity canvas, particles and pops. Nothing here changes game state.
- `App.ts`, `audio.ts` and `style.css`: the gesture map, in-world bubbles, tray, menu, fixed-step loop, autosave and the `window.__rockhopper` test hook.
- `tools/rockhopper-bot.ts` and `tools/rockhopper-clip.ts`: the pacing witness and the clip witness.

Older prototypes: `src/asteroid/` (Asteroid Works), and `src/game/`, `src/view/` and `src/ui/` (tile workshop). See `docs/ARCHITECTURE.md` for those.

## Invariants

Rockhopper: the simulation owns production and credits, never the renderer. Credits change only when a chunk or bar actually arrives, or through purchases and sales. Every particle, "+N" pop and counter tick maps to a real event, and pops aggregate real arrivals only. Cells are finite: never created or refilled. A rock is replaced only after it is fully spent, with the slot's seeded ore signature; richness depends on the tier, never on the respawn count. Manual mining is at most one cell of work per tick, from a laser capped at six levels. Belts reserve spacing and back up; a full drill buffer stops the drill. A belt's capacity comes only from its tier (bundle size), never from machine levels, and the widen price depends only on tier steps bought and owned, never on length. Junctions and smelter intake are round-robin. Each machine has exactly one output; the target matrix forbids loops and smelter → smelter; unlinked machines retry only free docks (smelters first). Selling heals a line only where the target matrix allows it. Time runs only while the page is visible and the menu is closed. There is no offline catch-up and no undo; selling refunds 50 %. Saves live under `rockhopper.save.v2`, migrated from `rockhopper.save.v1`, which the build never writes or deletes (`?restore=pre-logistics` re-migrates it). Keep both loadable.

Older prototypes keep their own invariants: see `docs/ASTEROID_PROTOTYPE.md` and `docs/DESIGN_AND_VALIDATION.md`. Preserve all three save namespaces.

Test browser screenshots as well as DOM assertions when changing rendering or layout. Do not report bot runs or scripted captures as proof of engagement or of a human session's length.

## Gameplay decision review

The user requires adversarial agent review for every brainstormed gameplay decision. Before adopting or implementing a new gameplay decision, spawn an independent adversarial agent to challenge it. A batch review must give an explicit verdict for each individual decision. Ask for concrete failure cases, dominant strategies, mobile usability costs, balance risks, and the evidence needed to resolve objections.

Treat proposals as pending until they receive PASS. REVISE or REJECT blocks adoption; revise and resubmit rather than overruling the reviewer. A conditional verdict does not pass until its conditions are resolved. Passing a design review authorizes only the stated scope (for example, an experiment), and is not evidence of player enjoyment or balance. Record unresolved questions and distinguish simulation evidence from human playtest findings. The user may explicitly override this workflow.

## Adversarial product review brief — 2026-09-19

The product goal is to compress the experience of building and improving an automated factory into a mobile game whose appeal is visible in a silent 10–30 second clip. Automation/factory gameplay is mandatory. Tetromino footprints, folding, action budgets, exact-product contracts, and separate levels are hypotheses, not protected requirements. The user is dissatisfied with the current format; evaluate the core loop before proposing more content or cosmetic polish.

For full design reviews:

- Inspect the current code, real replays, and actual phone-size gameplay/screenshots. Separate observed behavior, design inference, external references, and untested hypotheses. Earlier scoped PASS verdicts do not prove the current direction is fun or commercially sound.
- Challenge the opening ten seconds, input-to-payoff delay, visible production, player agency, spatial/routing decisions, dominant strategies, failure/recovery, mobile readability, progression, replayability, and content-production costs.
- Compare retaining, simplifying, and removing shaped pieces. Compare level-based and persistent structures without assuming either is required. Every candidate must preserve automatic production and consequential player control over the production system.
- Ask independent adversaries for concrete counterexamples and an explicit verdict for each proposed gameplay decision. Record revisions and verdict scope. A PASS for a prototype permits only that experiment; it does not select a permanent product direction.
- Specify a truthful 10-second hook and a 30-second extension for candidate directions, showing an actual player action causing a visible production change. Do not substitute scripted spectacle, manual tapping, or passive number growth for automation.
- Explain how early satisfaction could develop into long-term decisions. Attack universal optimal layouts, repetitive rebuilds, compulsory chores, and progression that only increases quantities.
- End with a ranked recommendation, rejected/deferred alternatives, unresolved questions, and a small falsifiable prototype/playtest plan. Treat all numeric playtest targets as provisional decision rules, not industry benchmarks or measured results.

Review work may update documentation and capture evidence. Do not rewrite the runtime or treat a proposed redesign as implemented unless the user requests implementation. Preserve unrelated working-tree changes.
