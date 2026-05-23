# Roguelite Board Structure Plan

## Direction

Shift the main loop away from an endless moving-contract stream and toward a
Balatro-like roguelite cadence:

1. The player receives a round board with constraints and opportunities.
2. The player drafts or buys machines for that board.
3. The player builds a factory around the board texture.
4. The factory converts a limited resource budget into score.
5. The player earns money, boons, chips, or rerolls between rounds.

In this model, the board is not empty placement space. It is the round's
primary tactical puzzle, similar to how a poker hand exists inside the blind,
table rules, jokers, and scoring modifiers.

## Core Loop

Each round should be defined by three generated pieces of state:

- Board: sources, outputs, blockers, bonus tiles, hazards, and preplaced
  fragments.
- Contract: score threshold, accepted tiers/colors/operations, payout, and
  resource-exhaustion fail condition.
- Draft: available machine pieces, shop offers, rerolls, and optional board
  manipulation tools.

The round flow should become:

1. Generate a board layout and contract.
2. Enter build phase with production paused.
3. Let the player place machines using money and draft options.
4. Start production when the player is ready.
5. Resolve the contract by turning finite source inventories into enough score.
6. Award money and long-term upgrades.
7. Advance to the next generated board.

The primary round limit should be resources, not time. Each source node starts
with a fixed inventory for the round. The player's challenge is to route,
combine, upgrade, color, and multiply those limited units efficiently enough to
cross the score threshold before the board runs dry.

## Board Features

Current implementation starts with four deterministic board templates:

- Open Floor: starter center lane with no blockers.
- Split Lanes: horizontal divider with a center gate.
- Crossflow Gate: vertical baffle with offset gates.
- Factory Islands: central blocked islands that reward edge routing.

Start with a small board feature set that creates meaningful decisions without
requiring a full content system immediately:

- Fixed source docks and delivery docks.
- Source nodes with visible remaining inventory.
- Blocker cells that cannot hold machines.
- Power cells that speed adjacent or placed machines.
- Quality cells that add delivery credit or tier bonuses.
- Taxed cells that cost extra to build on.
- Preplaced machine fragments that can be used, sold, or routed around.

Later board modifiers can add stronger roguelite texture:

- Conveyor-only lanes.
- Color conversion tiles.
- Splitter or merger bonus zones.
- Chip resonance zones.
- Temporary hazard cells.
- Optional challenge outputs for bonus rewards.

## Data Model

Introduce explicit round objects instead of letting `currentRound` drive every
system directly.

Suggested modules:

- `src/config/boardConfig.js`
  Static board feature definitions, tuning, and visual metadata.
- `src/managers/BoardGenerator.js`
  Creates deterministic board layouts from round, era, and run seed.
- `src/managers/RoundManager.js`
  Owns round state transitions: preview, build, active, cleared, failed.
- `src/objects/BoardTile.js`
  Optional visual and behavior wrapper for special cells.

Suggested scene state:

```javascript
this.roundState = {
  number,
  phase,
  board,
  contract,
  draft,
  score,
  quota,
  sourceInventories,
  exhausted,
};
```

Keep `currentRound` as a compatibility alias only while migrating.

## Migration Plan

### Phase 1: Separate Round Identity

- Stop using moving delivery docks as the source of round advancement.
- Make `currentRound` advance only after a full round clear or fail.
- Move quota, contract, source inventories, and node generation into a single
  round object.
- Keep the existing delivery node visuals, but make them serve the current
  contract instead of constantly refreshing.
- Remove timer pressure from the default round rules. Timed boards can return
  later as a special modifier.

Primary files:

- `src/scenes/GameScene.js`
- `src/objects/DeliveryNode.js`
- `src/config/gameConfig.js`

### Phase 2: Add Build Phase

- Restore a real build phase before production starts.
- Pause resource nodes, chips, conveyors, and processors during build.
- Show the incoming board and contract clearly.
- Let the player start the round manually.
- Give each resource node a per-round remaining count and stop emission when
  that count reaches zero.
- End the round when the quota is reached, or fail when all source inventories
  are exhausted and no in-flight items can still score enough.

Primary files:

- `src/scenes/GameScene.js`
- `src/objects/ResourceNode.js`
- `src/objects/ChipNode.js`
- `src/objects/machines/BaseMachine.js`
- `src/objects/machines/ConveyorMachine.js`

### Phase 3: Board Generator

- Add generated blocker, finite source, output, and bonus tile layouts.
- Start with hand-authored templates plus light procedural variation.
- Ensure every generated board has at least one plausible source-to-output path.
- Tune source inventory and score thresholds together so each board asks for an
  efficiency target rather than raw throughput.
- Add debug text or overlay support for board generation failures.

Primary files:

- `src/managers/BoardGenerator.js`
- `src/config/boardConfig.js`
- `src/objects/Grid.js`
- `src/scenes/GameScene.js`

### Phase 4: Board Synergies

- Implement power and quality cells first.
- Route special-cell effects through explicit helper methods instead of
  one-off checks scattered through machine classes.
- Make board effects visible through cell styling and hover text.

Primary files:

- `src/objects/Grid.js`
- `src/objects/BoardTile.js`
- `src/objects/machines/BaseMachine.js`
- `src/objects/DeliveryNode.js`

### Phase 5: Roguelite Rewards

- Move boons to a between-round reward cadence.
- Add board-aware boons such as choosing between boards, converting blockers,
  preserving one machine, or upgrading a bonus tile.
- Let chips interact with board generation instead of only era progression.

Primary files:

- `src/config/boons.js`
- `src/managers/UpgradeManager.js`
- `src/scenes/GameScene.js`
- `src/objects/ChipNode.js`

## First Playable Target

The first vertical slice should prove this question:

Can one generated board, one contract, and one draft create a satisfying
factory puzzle before any large content expansion?

Acceptance criteria:

- Starting a run shows a generated board with visible source/output constraints.
- Each source displays a finite remaining resource count.
- Production is paused until the player starts the round.
- The contract can be cleared by turning the limited source inventory into
  enough delivered score.
- Clearing the contract advances to a fresh board.
- Exhausting all sources without reaching the score threshold ends the run or
  consumes a limited fail resource.
- Existing moving-contract refresh behavior is disabled in this branch.
