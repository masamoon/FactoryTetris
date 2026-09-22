# AGENTS.md

## Project

Gridforge defaults to Asteroid Works: a portrait-first, side-view mining/factory prototype. Players excavate finite blocks, automate sectional shaft drills, and route ore through conveyors, smelters and assemblers. After the first eight-cell shaft, one earned part can extend the fixed-base drill by eight cells through a visible tender, or the player can spend one part plus two ore on a second drill at a nearer rich face. It uses remote tap/hold input, not character locomotion. The earlier ten-level 8 × 9 tile workshop remains at `?mode=tiles`, with independent saves. The old FactoryTetris round/shop/trait runtime has been removed.

## Short-form product constraint

The product direction must make the real experience of building and improving an automated factory intelligible and appealing in a silent, portrait 30-second clip. Every design and gameplay decision must support this direction at the portfolio level through the hook, readability, truth, accessibility/recovery or durable play. Every major gameplay direction and material gameplay change must also be reviewed against a representative clip scenario. The scenario must show a visible player action causing a genuine change in an automatically operating production system, followed by a meaningful consequence or next decision.

Clipability is a product-direction gate, not a requirement that every low-level decision be individually photogenic. A decision may create the short-form hook, improve its mobile readability, preserve simulation truth, support accessibility or recovery, or provide the durable agency, progression and replayability behind it. Reject changes that improve only the clip while harming ordinary play, factory agency, truthful pacing, mobile usability or long-term depth.

Real-time capture is preferred. Abridged footage is permitted only when prepared-save starts, cuts, speed changes and time compression are plainly disclosed. Editing must not fabricate or reorder causality, hide required costs or interactions, imply false production rates, conceal imminent failure or depletion, or substitute scripted effects for simulation. Retain an uncut real-time capture or replay as the verification witness. Label developed-factory footage as such; do not present it as the new-player opening.

Use successful or viral mobile-game clips only as explicit references for portrait framing, silent legibility, visual hierarchy and action-to-payoff cadence. Virality is not evidence of fun, retention, monetization or fit for this game. Do not adopt deceptive playable-ad conventions.

A truthful-clip PASS authorizes the communication hypothesis only. It does not prove enjoyment, balance, retention or commercial viability. Apply the full gate in `docs/SHORT_FORM_PRODUCT_CONSTRAINT.md`.

## Commands

- `npm start` — Webpack dev server at http://localhost:8084
- `npm run build` — production static site in `dist/`
- `npm run typecheck` — TypeScript validation
- `npm test` — deterministic simulation and persistence tests
- `npm run replay:asteroid` — real manual-mining-to-machine-parts trajectory
- `npm run replay` — real winning replays for all ten levels and alternative strategies
- `npm run test:browser` — Playwright UI, touch, responsive, and save/resume tests
- `npm run lint` — ESLint
- `npm run format` — Prettier

Node.js 22. For browser tests, install Chromium with `npx playwright install chromium`.

## Architecture

Default asteroid prototype:

- `src/asteroid/simulation.ts`: finite terrain, exposed-face mining, fixed ticks, construction, material transport, full-state undo.
- `src/asteroid/persistence.ts`: separate save namespace and semantic validation.
- `src/asteroid/Scene.ts`: Phaser artwork, camera and pointer mapping; no production logic.
- `src/asteroid/App.ts` and `style.css`: responsive DOM controls, fixed-step controller, local saves and preview/inspection.
- `tools/asteroid-replay.ts`: honest full-chain simulation witness.

Earlier tile workshop:

- `src/game/types.ts`: serializable run state, commands, machines, ports, and events.
- `src/game/content.ts`: tile transformations, footprints, sources, ten levels, rotation, and initial state.
- `src/game/simulation.ts`: pure command reducer and previews; deterministic tick runner; folding graph invariants.
- `src/game/persistence.ts`: versioned save validation and settings migration.
- `src/view/BoardScene.ts`: disposable Phaser board drawing, pointer mapping, and effects.
- `src/view/audio.ts`: gesture-unlocked synthesized sound.
- `src/ui/App.ts`: DOM UI/controller, transient placement state, menus, saves, and input actions.
- `src/ui/style.css` and `icons.ts`: responsive theme and scalable icons. Fonts are copied from Fontsource packages during build.

## Invariants

The simulation owns production, never the renderer. Asteroid production uses 100 ms ticks and pauses during planning, dialogs, explicit pause and document hiding. No offline catch-up. Excavation removes real terrain; rail payload reserves drill buffer capacity; external cargo moves at most one cell per transfer phase. Never invent production for animation. Manual input is capped to one mining work per tick. Rails reserve their full corridor. Construction and empty-belt removal snapshot the complete state; keep up to 40 undo snapshots within a 2 MB JSON budget. Undo rewinds subsequent production and terrain as well as the edit. Preserve both save namespaces.

A drill extension is atomic: it is offered only after the current shaft and returning loads are clear, consumes one real part, reserves the next complete eight-cell corridor, and installs through a timed visible tender before mining resumes. One global extension and two drill bases are the current experiment caps. Do not allow loads to cross the tender during installation. Longer return distance, output capacity and backpressure remain real.

Tile workshop only: paid actions advance four ticks; thinking, selecting tools, folding, and previewing do not advance time. Undo restores one complete committed state, including manifests and production.

Folded modules retain their primitive graph and all buffers/work. Flatten them into the SAME tick phases and stable ID order as unfolded machines; never approximate their recipe or run them as separate sub-simulations. Preserve throughput, latency, material costs, and backpressure.

Keep canonical simulation coordinates for mirrored scenarios; reflect presentation and input together. Every scenario needs a real winning replay. Test browser screenshots as well as DOM assertions when changing rendering or layout.

See `docs/ASTEROID_PROTOTYPE.md`, `docs/ARCHITECTURE.md` and `docs/DESIGN_AND_VALIDATION.md`. Do not report automated wins as proof of engagement or a measured human session duration.

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
