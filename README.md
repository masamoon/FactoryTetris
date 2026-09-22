# Gridforge — Asteroid Works

A playable side-view asteroid factory experiment. Hold exposed rock to mine your first ore, build a shaft drill, and route its output through conveyors, smelters and assemblers. The drill excavates finite terrain and brings ore back along its shaft; material actually travels through the factory. The first machine part creates a bounded expansion choice: send a visible eight-cell extension to the fixed drill head, or build a nearer second drill and its route.

```bash
npm install
npm start                 # http://localhost:8084
npm run typecheck
npm test
npm run replay:asteroid    # earned mining-to-parts trajectory plus both expansion branches
npm run replay            # earlier tile workshop solutions
npm run test:browser       # Chromium touch/UI/resume/layout tests for both modes
npm run lint
npm run build             # dist/
```

Node.js 22. Install the browser once with `npx playwright install chromium`.

Hold a rock block to excavate it. Drag the world to explore; **Dock** returns to collection. Select a tool, tap a clear square, and confirm its preview. Building pauses production; **Resume** starts it again after laying conveyors. Conveyors are free and can turn; processors take input from the right and output to the left. Tap COLLECTION and then a compatible processor to send one emergency recipe batch with the flying service drone. A completed drill shows exact extension and new-drill costs, disabled reasons, and **View head** / **View base** controls.

**Undo build** restores the whole outpost before that edit, including later courier deliveries, production and mining. Manual delivery does not consume undo slots. The game retains up to 40 recent edits within a 2 MB save budget. Saves are local, with no offline production. The service drone is a remote logistics tool, not a walking character.

The earlier ten-level tile workshop remains available at [/?mode=tiles](http://localhost:8084/?mode=tiles), with a separate save.

See [prototype scope and validation](docs/ASTEROID_PROTOTYPE.md), [architecture](docs/ARCHITECTURE.md), [design direction](docs/ASTEROID_AUTOMATION_DIRECTION.md), [base implementation review](docs/reviews/2026-09-20-implementation-review.md), and [drill-extension implementation review](docs/reviews/2026-09-20-drill-extension-implementation-review.md). This is an experiment in visible excavation and material flow, not a validated long-term incremental economy.
