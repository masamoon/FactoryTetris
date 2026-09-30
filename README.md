# Rockhopper

You are Hop, a tiny mining robot at a space station. You start by lasering asteroids by hand, then build machines that mine them for you. It is an automation game crossed with an incremental game, built for portrait touch screens.

- **Hold a rock** to laser it. Chunks burst out and stream home, and each chunk becomes credits when it lands.
- **Drag a drill** from the tray onto an asteroid. Drop it anywhere on the rock's rim: it eats the nearest cells first, so aim it at a vein. A belt links it to a hub dock, and you can watch every chunk ride in.
- **Rocks run out.** Below 20 % they crumble, and a new rock is towed into the same slot. Your drills stay put and carry on.
- **Docks are scarce.** A **smelter** merges up to three belts into one dock and turns each chunk into a bar worth three times as much. To re-route a belt, drag from a machine to a dock or a smelter.
- **Tap a locked slot's price** to unlock it. Higher tiers are bigger, richer rocks: copper, ice, gold, then crystal.
- **Tap a machine** to open its Upgrade, Move and Sell bubble. Sell only fires after a hold.
- **Tap the hub** to upgrade the Laser, Docks and Tractor (respawn speed).

On screen there is one counter, one two-item tray and a menu. Everything else lives in the world.

```bash
npm install
npm start                 # http://localhost:8084
npm run typecheck
npm test                  # simulation tests (all modes)
npm run bot:rockhopper    # greedy scripted pacing bot (upper bound, not a playtest)
npm run clip:rockhopper   # real-time 10 s capture from a fresh save (needs npm start)
npx tsx tools/rockhopper-clip-b.ts   # headless witness for the staged segment B
npm run test:browser      # Playwright touch/UI tests (set CHROMIUM_PATH to reuse a local Chromium)
npm run lint
npm run build             # dist/
```

Node.js 22. `?fresh` ignores the save and `?seed=N` picks the asteroid seed.

The visual identity (palette, type, cast and a 20-second storyboard) lives on the Claude Design canvas **Rockhopper — Visual Identity**. The design, its adversarial reviews and the evidence are in [docs/ROCKHOPPER_DESIGN.md](docs/ROCKHOPPER_DESIGN.md) and [docs/reviews/2026-09-29-rockhopper-redo-adversary.md](docs/reviews/2026-09-29-rockhopper-redo-adversary.md).

Older prototypes are still playable, each with its own save: [Asteroid Works](http://localhost:8084/?mode=works) at `?mode=works` and the [tile workshop](http://localhost:8084/?mode=tiles) at `?mode=tiles`.
