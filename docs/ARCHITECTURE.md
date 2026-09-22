# Gridforge architecture

## Asteroid Works (default)

The entry point chooses `AsteroidApp` and `asteroid.css` by default. `?mode=tiles` loads the earlier workshop and its stylesheet. Both use Phaser and the existing Webpack pipeline.

- `src/asteroid/simulation.ts`: serializable 36 × 12 world, finite terrain, exposed-face manual mining, machine construction, deterministic 100 ms ticks, material buffers, drill return loads, service-drone delivery, recipes and undo.
- `src/asteroid/persistence.ts`: `gridforge.asteroid.v1`, full-state validation including resource species, rail occupancy and in-flight courier state. Pre-courier saves receive an idle drone; older valid histories are trimmed to the current bounded undo budget.
- `src/asteroid/Scene.ts`: disposable procedural artwork, truthful belt/drill/drone cargo animation, horizontal/vertical camera and gesture mapping.
- `src/asteroid/App.ts`: fixed-step scheduling, DOM controls and previews, pause and visibility behavior, local persistence. No simulation elapsed-time catch-up.
- `tools/asteroid-replay.ts`: fully earned ore → plates → part trajectory; `tests/asteroid.test.ts` verifies conservation, backpressure, mining, editing and saves.

Each tick first applies eligible held mining, resolves courier arrivals, transfers belt cargo every third tick using a pre-transfer inventory snapshot, then advances returning drill loads and machine work. This prevents same-phase multi-cell transport and lets a delivered batch start real processing in its arrival tick. An outbound courier reserves its target slots, and belt acceptance counts those reservations so concurrent delivery cannot overflow a processor. Drills reserve output room for their entire return payload before excavation. Processors consume two inputs at work start and retain work until completion. All machine output is west except directional conveyors; processor belt inputs enter from the east.

Build previews pause time and remain transient. Committed builds and empty-belt removals checkpoint the entire state. Undo restores that checkpoint and rewinds later production. History is capped at 40 snapshots and trimmed oldest-first to keep serialized state plus history under 2 MB. Current state is never discarded to retain history. Identical empty-belt replacement is a no-op.

See [prototype scope](ASTEROID_PROTOTYPE.md) for current limitations and controls.

## Earlier tile workshop (`?mode=tiles`)

- `src/game/types.ts`: serializable version-2 RunState, tile resources, typed commands, orders and events.
- `src/game/content.ts`: four tile silhouettes, Punch/Cutter transformations, tool footprints/ports and ten fixed level definitions. Levels may declare processed source tiles and empty initial tool placements; createRun assigns stable IDs and initializes zero inventory and work.
- `src/game/simulation.ts`: pure command reducer, placement/fold previews, deterministic graph and tick processing. Every paid command advances four ticks. Each requested silhouette has its own finite delivery quota. Downstream consumers take priority over shipment collection.
- `src/game/persistence.ts`: new tile-save namespace, validation of state/geometry/buffers/graph endpoints, safe unavailable-storage behavior, compatible audio preferences.
- `src/ui/App.ts`: level selection/progression, toolbox, manifest, interaction previews, inspector, settings and result flow. UI selections/previews do not mutate simulation state.
- `src/ui/explain.ts`: predictions from connected inputs and buffered work, diversion warnings, named blockage explanations.
- `src/ui/icons.ts`: SVG tile silhouettes and footprints. `src/view/BoardScene.ts`: procedural Phaser artwork, visible tile transport, pointer input, fold effects.
- `src/view/audio.ts`: synthesized gesture-unlocked sound.
- `tools/replay.ts`: reference solutions and alternative operation/scheduling sequences executed by the real reducer.

All primitive machines, including those inside nested modules, share the same tick phases. A fold preserves the hidden graph, IDs, buffers and partial processing; it never approximates the graph as a faster recipe. Ports accept tile objects, and transformations preserve pre-existing geometric attributes. Products are never silently discarded; recycling is explicit destruction and is previewed.

Save/resume does not simulate elapsed wall time. `gridforge.tiles.poc.v2` is separate from old commodity-run saves. `gridforge.tiles.progress.v2` records completed commissions independently from the current undoable factory. All commissions remain selectable in this PoC. Audio preferences retain the compatible existing settings key.

Production validates before action exhaustion so the last action can win. Committed fold/undo are autosaved. Rotation/selection/cancellation are transient and free. The board stays 8 × 9 without a camera or scrolling.
