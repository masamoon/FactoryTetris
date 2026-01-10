# Dynamic Resource Level System - Design Specification

> **Purpose**: This document defines the design for a dynamic input/output resource level system for processor pieces, replacing the current static resource types.

---

## Overview

Pieces will have dynamic input/output resource levels using a notation system:

- **4-block pieces**: `X/Y` (1 input level → 1 output level)
- **5-block pieces**: `X/Y/Z` (2 input levels → 1 output level)

### Resource Levels

- **Level 1**: Raw/basic resources (from Resource Nodes)
- **Level 2**: First-tier processed
- **Level 3**: Second-tier processed
- **Level 4**: Final-tier (most valuable)

---

## Piece Notation Rules

### 4-Block Pieces (Single Input)

| Notation | Meaning                         | Formula   |
| -------- | ------------------------------- | --------- |
| `1/2`    | Takes Level 1 → Outputs Level 2 | Y = X + 1 |
| `2/3`    | Takes Level 2 → Outputs Level 3 | Y = X + 1 |
| `3/4`    | Takes Level 3 → Outputs Level 4 | Y = X + 1 |

### 5-Block Pieces (Dual Input)

| Notation | Meaning                    | Formula   |
| -------- | -------------------------- | --------- |
| `1/2/3`  | Takes L1 + L2 → Outputs L3 | Z = X + Y |
| `1/3/4`  | Takes L1 + L3 → Outputs L4 | Z = X + Y |
| `2/2/4`  | Takes L2 + L2 → Outputs L4 | Z = X + Y |

> **Note**: 5-block pieces CAN have duplicate inputs (e.g., `2/2/4`).

---

## Soft-Lock Prevention System

### Problem

Players could get stuck if offered pieces require resource levels they cannot produce.

### Solution: Smart Piece Generation

**Algorithm for piece selection:**

1. Scan all placed machines and resource nodes
2. Build a set of "producible levels" (what the player CAN currently output)
3. Track "free outputs" (outputs not yet connected to another machine's input)
4. When generating the 3 piece offers:
   - **At least 1 piece** must have ALL its inputs satisfiable by producible levels
   - For 5-block pieces, verify BOTH inputs have available free sources
   - Other 2 pieces can be "challenging" or require future planning

**Example:**

```
Player's producible levels: {1, 2, 3}
Free outputs: {Level 2: 1, Level 3: 1}

VALID offers (at least 1 required):
- 1/2 ✓ (Level 1 always available from nodes)
- 2/3 ✓ (has free Level 2)
- 1/2/3 ✓ (L1 from nodes + free L2)

RISKY offers (can appear in remaining slots):
- 3/4 (uses the only free L3)
- 2/2/4 (needs TWO L2s, only have one free)
```

---

## Skip Mechanic

When a player cannot or does not want to use any offered pieces:

### Behavior

- Player clicks "Skip" button
- All 3 current piece offers are discarded
- 3 new pieces are generated (following usability rules above)

### Penalty

- **Points**: Lose points (e.g., -100 or -200)
- **Momentum**: Reduce momentum/multiplier

### Limit

- **Maximum 3 skips per game**
- After 3 skips, button becomes disabled
- Running out of skips with unusable pieces = must place bad pieces → waste grid space

---

## Failure Paths (Not Hard Soft-Lock)

Bad planning leads to gradual failure, not instant stuck state:

1. **Grid Space Exhaustion**
   - Bad piece placement wastes valuable grid cells
   - Grid fills up → cannot place more → Game Over

2. **Skip Exhaustion**
   - Used all 3 skips → forced to place suboptimal pieces
   - Compounds the grid space problem

3. **Throughput Starvation**
   - Not enough mid-tier sources to feed high-tier processors
   - Processors sit idle → low score → eventual grid fill

---

## Game Over Screen Enhancements

Display stats to enable "one more run" feeling:

```
┌─────────────────────────────────────┐
│           FACTORY SHUTDOWN          │
├─────────────────────────────────────┤
│  Score: 2,450                       │
│  Pieces Placed: 24                  │
│  Pieces Skipped: 3/3                │
│  Efficiency: 67%                    │
│                                     │
│  ANALYSIS:                          │
│  "Factory bottlenecked at Level 3.  │
│   Consider more 2/3 pieces early."  │
│                                     │
│     [ PLAY AGAIN ]  [ MENU ]        │
└─────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Data Model Changes

- [ ] Add `inputLevels: number[]` property to machines (replaces `inputTypes`)
- [ ] Add `outputLevel: number` property to machines (replaces `outputTypes`)
- [ ] Update `BaseMachine` to use level-based processing
- [ ] Update `ResourceNode` to output Level 1
- [ ] Update `DeliveryNode` to accept configurable levels

### Phase 2: Piece Generation

- [ ] Create `PieceGenerator` class/module
- [ ] Implement piece pool with valid X/Y and X/Y/Z combinations
- [ ] Implement "producible levels" scanner (analyzes placed machines)
- [ ] Implement "free outputs" tracker
- [ ] Implement usability check for piece offers
- [ ] Ensure at least 1 of 3 offered pieces is always usable

### Phase 3: Skip Mechanic

- [ ] Add skip counter to game state (max 3)
- [ ] Add "Skip" button to UI
- [ ] Implement point penalty on skip
- [ ] Implement momentum penalty on skip
- [ ] Disable skip button when counter reaches 0

### Phase 4: UI Updates

- [ ] Display X/Y or X/Y/Z notation on piece previews
- [ ] Show resource level indicators (colors or numbers) on machines
- [ ] Update piece selection panel layout for notation display
- [ ] Add skip counter display near skip button

### Phase 5: Game Over Enhancements

- [ ] Track efficiency stat (productive vs wasted pieces)
- [ ] Track bottleneck analysis (which level caused problems)
- [ ] Update Game Over screen with new stats display
- [ ] Add contextual tips based on failure reason

---

## Technical Notes

### Existing Code to Modify

- `BaseMachine.js`: Add level properties, update processing logic
- `MachineFactory.js`: Update piece generation and display
- `MachineRegistry.js`: Update machine configs
- `ProcessorXMachine.js` files: Convert to level-based system
- `GameScene.js`: Add skip mechanic, track game state
- `GameOverScene.js`: Enhanced stats display

### New Files to Create

- `src/utils/PieceGenerator.js`: Smart piece generation logic
- `src/utils/FactoryAnalyzer.js`: Scans placed machines for producible levels

### Resource Level Colors (Suggested)

| Level | Color | Hex       |
| ----- | ----- | --------- |
| 1     | Gray  | `#888888` |
| 2     | Green | `#22cc22` |
| 3     | Blue  | `#2288ff` |
| 4     | Gold  | `#ffcc00` |

---

## Open Questions

1. Should delivery nodes require specific levels, or accept any level with different point values?
2. Should there be visual distinction between the two inputs on 5-block pieces?
3. What are the exact point/momentum penalty values for skipping?
4. Should the game show a warning when placing a piece that creates a bottleneck?
