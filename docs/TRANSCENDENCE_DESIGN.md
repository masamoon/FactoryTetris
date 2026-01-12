# Transcendence System Design Document

> **Concept:** A recursive zoom-out mechanic inspired by circuit design, where the player's factory becomes an abstracted "chip" that serves as a passive resource source in a higher-level factory, creating an infinite progression loop with escalating logistics complexity.

## Core Philosophy

The game captures the journey of building electronic circuits:

- Start with simple logic gates (basic processors)
- Compose them into functional units
- Abstract away internals → trust the black box
- Build higher, repeat forever

**Key Feeling:** "My little factory became the foundation for something bigger."

---

## Resource Tier System

### Never-Resetting Tiers (Big Number Fantasy)

Resource tiers **never reset** across eras. Players see continuous escalation:

| Era | Input Tier | Mid Tier | Output Tier |
| --- | ---------- | -------- | ----------- |
| 1   | L1         | L2       | L3          |
| 2   | L4         | L5       | L6          |
| 3   | L7         | L8       | L9          |
| N   | L(3N-2)    | L(3N-1)  | L(3N)       |

**Formula:** Era N produces tiers `3N-2`, `3N-1`, and `3N`.

### Point Scaling

Points should scale exponentially with tier to create RPG-style power fantasy:

- Higher tiers = exponentially more points
- Era 5 L15 resources feel MASSIVE compared to Era 1 L3

---

## Grid & Chip Scaling

### Aggressive Grid Expansion

Grid grows by **+4 per era** to ensure it always feels BIGGER, not cramped:

| Era | Grid Size | Grid Cells | Free Space |
| --- | --------- | ---------- | ---------- |
| 1   | 10×10     | 100        | 100%       |
| 2   | 14×14     | 196        | 95%        |
| 3   | 18×18     | 324        | 94%        |
| 4   | 22×22     | 484        | 94%        |
| 5   | 26×26     | 676        | 95%        |

**Formula:** Era N has grid size `10 + 4*(N-1)`.

### Fixed Chip Size

All chips are **3×3** regardless of era. Chips accumulate but don't grow:

| Era | Chips on Grid | Total Chip Cells |
| --- | ------------- | ---------------- |
| 2   | 1             | 9                |
| 3   | 2             | 18               |
| 4   | 3             | 27               |
| N   | N-1           | 9\*(N-1)         |

---

## Chip as Resource Source (Not Processor)

### Core Design Change

Chips are **passive resource emitters**, not processors in the chain:

- Chips require NO input
- Chips emit resources automatically at a fixed rate
- L1 resource nodes STILL spawn normally
- Player has multiple income streams to manage

### Era 2+ Resource Sources

```
Era 2 Grid:
[L1 Nodes] ──┐
             ├──→ [Player builds here] ──→ [Delivery]
[Chip₁ L4]───┘

Era 3 Grid:
[L1 Nodes] ──┐
[Chip₁ L4]───┼──→ [Player builds here] ──→ [Delivery]
[Chip₂ L7]───┘

Era 4 Grid:
[L1 Nodes] ──┐
[Chip₁ L4]───┤
[Chip₂ L7]───┼──→ [Player builds here] ──→ [Delivery]
[Chip₃ L10]──┘
```

### Difficulty Curve

| Era | Sources to Manage        | Tiers Available | Logistics Challenge   |
| --- | ------------------------ | --------------- | --------------------- |
| 1   | L1 nodes only            | L1-L3           | "Learn the basics"    |
| 2   | L1 + 1 chip (L4)         | L1-L6           | "Two income streams"  |
| 3   | L1 + 2 chips (L4, L7)    | L1-L9           | "Juggling three"      |
| 4   | L1 + 3 chips (L4,L7,L10) | L1-L12          | "Full plate"          |
| 5   | L1 + 4 chips             | L1-L15          | "Air traffic control" |

---

## Multi-Output Chip Pins (Option A)

### Chips Have Dedicated Output Pins Per Tier

Each chip has **one output cell per resource tier** it emits:

```
Era 3 Chip Layout (3×3):
┌───┬───┬───┐
│   │   │L4→│  (top-right emits L4)
├───┼───┼───┤
│   │ ● │L7→│  (mid-right emits L7)
├───┼───┼───┤
│   │   │   │
└───┴───┴───┘

Era 4 Chip (with 3 outputs):
┌───┬───┬───┐
│   │   │L4→│
├───┼───┼───┤
│   │ ● │L7→│
├───┼───┼───┤
│   │   │L10→│
└───┴───┴───┘
```

### Benefits

- Clear visual: each tier has a dedicated output location
- Routing challenge: player must connect from multiple pins
- Scales naturally: more eras = more pins to route
- Matches circuit "pinout" metaphor

---

## Transcendence Trigger

### Conditions (Both Required)

1. **Level Threshold:** Reach a specific level (e.g., every 5 levels)
2. **Output Throughput:** Outputting ≥ X resources of the era's highest tier per minute

### Suggested Starting Values

- Era 1 → 2: Level 5 + delivering 50 L3 resources total
- Era 2 → 3: Level 10 + delivering 100 L6 resources total
- Era 3 → 4: Level 15 + delivering 200 L9 resources total

_These values need playtesting and balancing._

### UI Behavior

- When conditions are met: **"TRANSCEND"** button pulses/glows
- If player delays: momentum drain could increase (optional pressure)
- Clicking Transcend triggers the transition

---

## Transcendence Transition

### What Happens

1. **Snapshot:** Game calculates factory's output rate (for chip emission rate)

2. **Compression:** Factory visually shrinks into a glowing 3×3 chip

3. **Placement Phase:** Player places their new chip on the grid (left side preferred)

4. **Grid Reset:** New larger grid appears with:
   - All previous chips already placed
   - New L1 resource nodes on left edge
   - New delivery nodes on right edge
   - The new chip ready to emit

5. **Momentum Reset:** Resets to healthy level (reward for transcending)

### Chip Placement Rules

- Player places chip at start of new era
- Chips should be placed on left side (source side)
- Previous chips remain in their positions

---

## Flow Pattern (Constant Across Eras)

```
[L1 Nodes + Chips]  →  [Player Machines]  →  [Delivery Nodes]
     (left edge)                               (right edge)
```

The left-to-right flow remains consistent. Each era:

- L1 nodes + accumulated chips on the LEFT
- Player builds machines to process/combine them
- Outputs delivered on the RIGHT

---

## Failure Condition

**Momentum = 0 → Game Over** (unchanged from current game)

- Applies in all eras
- No era-specific penalty/bonus
- Run ends, player sees their peak era reached

---

## Visual Design

### Era Aesthetic Progression

| Era | Visual Feel                                 |
| --- | ------------------------------------------- |
| 1   | Clean, simple, everything visible           |
| 2   | One chip glows softly on the left           |
| 3   | Multiple chips, production lines everywhere |
| 4+  | Dense, intricate, controlled chaos          |

### Chip Appearance

- 3×3 glowing block
- Distinct output pins per tier (colored circles on edge cells)
- Subtle inner pulse (represents activity)
- Color matches the tier it emits
- **Cannot be opened or modified** - black box trust

---

## Future Considerations (Not in Scope)

- **Meta-progression:** Chips from previous runs usable in new runs
- **Chip library:** Collection of player-designed chips
- **Chip trading/sharing:** Community features
- **Multi-output processors:** Regular machines with multiple output types

---

## Implementation Priority

### Phase 1: Core Transcendence

1. Era tracking system
2. Resource tier continuation (no reset, tiers keep incrementing)
3. Chip entity as passive resource emitter
4. Multi-output pin system for chips
5. Transcend trigger detection (level + throughput)
6. Grid reset with chip placement

### Phase 2: Scaling

7. Aggressive grid expansion (+4 per era)
8. Accumulating chips (preserve all previous chips)
9. Chip placement UI at era start

### Phase 3: Polish

10. Chip visual design (glowing, pulsing, pins visible)
11. Transition animation (zoom-out effect)
12. Throughput calculation and display
13. Balance transcendence thresholds
