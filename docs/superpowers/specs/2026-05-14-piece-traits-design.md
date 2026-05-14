# Piece Traits — Design Spec

**Status:** Approved (brainstorm), ready for implementation plan
**Date:** 2026-05-14
**Author:** brainstorming pass (Claude + André)
**Successor spec:** Dual-Axis Delivery Contracts (🅐) — TBD

---

## 1. Problem Statement

Gridforge has a mathematically rich tiered piece system (recipes from L1→L12+ across eras) and an independent purity/chain system, but player-facing the two axes never collide as a deliberate decision. Drafts already exist (PieceGenerator returns 3 options with usability guarantees), yet drafts feel like utility choices, not identity choices. Same recipe pieces feel functionally identical; placement is purely a routing puzzle. This is the root of the "shallow choices / not addicting" feel the game currently has.

**Piece Traits** add a per-instance ability to higher-tier pieces, rolled at draft time. Drafts become identity decisions; placement becomes a trait-positioning puzzle on top of routing; the same recipe plays differently every run.

This spec covers the trait system core, a curated starter library of 10 traits, and the visual/integration plan. It explicitly defers dual-axis delivery contracts, Surge Cycle pacing, and cross-run meta to later specs.

## 2. System Overview

**Player loop change:**

> _Before:_ draft 3 shapes → pick one → place it where it routes resources
> _After:_ draft 3 shape+recipe+trait combos → pick the one whose trait suits my plan → place it where its trait AND its routing both pay off

**Key properties:**

- Trait gate: any piece whose recipe `output ≥ L3` rolls a trait at draft time
- L1→L2 pieces (the workhorse early-game pieces) remain plain — preserves the gentle ramp
- Trait pool is fully unlocked from Era 1 (no era-gating)
- Trait is locked once placed; removing the piece destroys the trait
- Random trait per draft option; rolls are independent across the hand (duplicates allowed in v1)
- One-time "draft-2 trait introduction" guarantee ensures every run meets traits within ~30s

## 3. Architecture

### 3.1 Tier Gate

Implemented in `PieceGenerator`:

- After `selectWeightedConfig` returns a recipe, if `recipe.output ≥ 3`, call `rollTrait()` and attach the resulting trait id to the option
- Plain pieces (`output < 3`) skip the trait roll
- Trait pool: all 10 traits eligible from Era 1

### 3.2 Trait Data Shape

All traits live in `src/config/traits.js`:

```js
{
  id: 'catalyst',
  name: 'Catalyst',
  category: 'stat' | 'rule' | 'adjacency' | 'run-wide',
  icon: 'trait-catalyst',
  bandColor: 0x4488ff,
  description: 'Resources gain +2 purity through this machine instead of +1.',
  hooks: {
    onAttach: (machine, scene) => { /* setup */ } | null,
    onProcess: (resource, machine, scene) => { /* mutate or extend */ } | null,
    onDeliver: (resource, machine, scene) => { /* run-wide effect */ } | null,
    onRemove: (machine, scene) => { /* teardown */ } | null,
  }
}
```

Three primary hooks (`onAttach`, `onProcess`, `onDeliver`) plus `onRemove` for symmetry on Adjacency teardown. Adjacency is implemented as neighbor-scan inside `onAttach` and `onProcess` — no dedicated `onAdjacencyChange` hook in v1.

### 3.3 Trait Roll & Draft-2 Guarantee

```text
PieceGenerator.generatePieceOptions(scene, count):
  for each i in 0..count-1:
    recipe = selectWeightedConfig(...)   // existing
    trait = (recipe.output >= 3) ? rollTrait() : null   // new
    option = { ...recipe, trait, isUsable }
    options.push(option)

  // Draft-2 guarantee (fires once per run)
  if scene.hasIntroducedTrait === false
     and scene.firstL2Placed === true
     and no option in options is { usable && trait }:
    replace options[0] with a forced usable L3 piece + trait

  // Mark introduction as done if ANY usable trait piece is now in the hand
  // (whether it appeared naturally or was forced above)
  if any option in options is { usable && trait }:
    scene.hasIntroducedTrait = true

  return options
```

Scene-level flags:

- `hasIntroducedTrait: boolean` — set true the first time a usable trait piece appears in a draft (naturally or forced). Prevents the guarantee from re-firing in later drafts.
- `firstL2Placed: boolean` — set true the first time a L2-output piece is placed on the grid. Arms the guarantee for the _next_ draft.

### 3.4 Hook Lifecycle on the Machine

In `BaseMachine`:

- `this.trait` — resolved trait object from registry, or `null`
- On construction (post-placement): `trait.hooks.onAttach?.(this, scene)`
- On every resource processed: `trait.hooks.onProcess?.(resource, this, scene)` runs _before_ purity is incremented, allowing traits to mutate purity gain (Catalyst), gate inputs (Polarized), spawn duplicates (Twin), etc.
- On destroy: `trait.hooks.onRemove?.(this, scene)`

In `DeliveryNode`:

- When a resource is delivered, iterate `resource.traitTags` (list of trait ids picked up along the way) and fire each definition's `onDeliver(resource, originatingMachine, scene)`
- Order: first-tagged to last-tagged (chronological through the chain)

### 3.5 Resource Lineage Tracking

Small extension to `PurityUtils.createPurityResource()` and `processResource()`:

- Add `traitTags: []` field to the resource shape
- In `processResource()`, if the machine has a trait, append its id to `traitTags`

This is the breadcrumb trail that lets run-wide traits (Hoarder, Tycoon) fire at delivery time.

### 3.6 Run-Wide Trait State

The `TraitRegistry` holds run-scoped state for run-wide traits:

- Beacon: a counter of placed Beacons; chain multiplier formula reads this
- Hoarder: per-machine delivery counters keyed by machine id; resets on machine remove
- Tycoon: stateless (acts at delivery time via `traitTags`)

State is cleared on era transcend reset and on game over.

## 4. The Starter Library (10 Traits)

### Stat Tweaks — band: blue `0x4488ff`

1. **Catalyst** — Resources gain +2 purity through this machine instead of +1. _Hook: `onProcess`._
2. **Overclocked** — Processing time × 0.5. _Hook: `onAttach` mutates `processingTime`._
3. **Tycoon** — Resources processed by this machine deliver for +50% score. _Hooks: `onProcess` tags resource; `onDeliver` reads the tag._

### Rule Bends — band: orange `0xff8800`

4. **Polarized** — Refuses resources with purity < 3. Accepted resources: output value ×2. _Hook: `onProcess` (early-return reject + bonus on accept)._
5. **Twin** — Spawns a duplicate output resource on every successful process. _Hook: `onProcess` (spawns extra). Cap: duplicates carry a `twinned` flag so they cannot be re-duplicated, preventing exponential compounding._
6. **Bypass** — Accepts wrong-tier inputs at 75% output instead of refusing. _Hook: `onProcess` overrides standard input-check._

### Adjacency — band: purple `0xaa44ff`

7. **Resonant** — +50% output if any orthogonally-adjacent machine shares its output tier. _Hook: `onProcess` performs a neighbor scan at process time._
8. **Conductor** — Adjacent orthogonal machines process 30% faster while this is placed. _Hooks: `onAttach` decrements neighbors' `processingTime`; `onRemove` restores it. Must be idempotent under multiple Conductors._

### Run-Wide — band: gold `0xffcc00`

9. **Hoarder** — Every 5th resource delivered with this machine's id in `traitTags` doubles its delivered score. _Hooks: `onProcess` tags; `onDeliver` increments per-machine counter, doubles on multiples of 5._
10. **Beacon** — While placed, adds +0.1 (additive) to the global chain multiplier. Stacks linearly per Beacon on the grid: N Beacons → effective `chainMultiplier(chain) + 0.1 × N`. _Hooks: `onAttach` increments registry counter; `onRemove` decrements._

### Why this set covers the "full chaos" effect surface

- Each trait answers a different play question (more output / different output / placement matters / run-wide significance)
- No two are strictly better than each other — every trait has a layout or planning prerequisite to be optimal
- Twin and Hoarder are the "spike" traits that create big-moment dopamine
- Bypass is the v1 expression of the broader "graded mismatch" idea (option 🅒) — keeps the door open without rebalancing every machine

## 5. Visual & Communication Design

### 5.1 On the Draft Card

- Shape preview (existing)
- Recipe notation (existing)
- NEW: trait icon (16×16) anchored upper-right
- NEW: trait name + 1-line description below the recipe notation
- NEW: card border tinted with `bandColor`

### 5.2 On the Placed Machine

- Trait icon (12×12) overlaid on the top-right cell of the machine footprint
- 1–2px colored outline (`bandColor`), softly pulsing
- Hover tooltip: name, category, full description, live state if applicable (e.g., Hoarder "next double in 3 deliveries")

### 5.3 On the Ghost Preview

- Trait icon and band visible during placement
- For Conductor / Resonant: faint highlight rings on neighbors the trait would affect

### 5.4 Active-Effects HUD Chip

- Small bar (top-right of screen) lists each run-wide trait currently in effect
- Shows live state: "Hoarder ×3 (next: 5/5)", "Beacon ×2 (+20% chains)"

### 5.5 Trigger Feedback

Each trait fires a brief particle flash on its machine when it activates (Resonant bonus triggers, Conductor speeds up a neighbor's tick, Hoarder hits its 5th, etc.). Without this, adjacency traits feel invisible — the flash is what tells the player "your placement worked."

## 6. Integration / Code Touch-Points

**New files**

- `src/config/traits.js` — 10 trait definitions + hook implementations + `rollTrait()` + `getTraitPool()`
- `src/objects/traits/TraitRegistry.js` — registry pattern mirroring `MachineRegistry.js`; manages run-wide trait state

**Modified files**

- `src/utils/PieceGenerator.js` — trait roll on `output ≥ 3`; draft-2 guarantee flag handling
- `src/objects/machines/BaseMachine.js` — `this.trait` field, hook lifecycle, render overlay
- `src/objects/DeliveryNode.js` — walks `resource.traitTags`, fires `onDeliver`
- `src/scenes/GameScene.js` — wires `hasIntroducedTrait` and `firstL2Placed`; renders HUD chip
- `src/scenes/PreloadScene.js` — loads 10 trait icons + 1 band overlay sprite
- `src/utils/PurityUtils.js` — adds `traitTags: []` to resources; appends in `processResource`

**Unchanged**

- `FactoryAnalyzer.js` — trait math doesn't affect producibility analysis
- All Era / Chip / DeliveryNode threshold logic
- All non-trait machines (Conveyor, Splitter, Merger, Underground)

**Save/load:** game appears session-only (no persistence layer found in initial pass). If persistence is added later, `machine.trait.id` and `TraitRegistry` run-wide state must be serialized. Out of scope for this spec.

## 7. Risks & Mitigations

| Risk                                          | Symptom                                                      | Mitigation                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Twin compounding                              | Resources duplicate exponentially through trait-dense chains | `twinned` flag prevents re-duplication                                                      |
| Polarized soft-lock                           | Player drafts Polarized but can't produce purity ≥ 3 yet     | Treat Polarized's purity gate as part of usability in `isPieceUsable`                       |
| Adjacency invisible                           | Players miss Resonant/Conductor activations                  | Particle flash on every trigger; tooltip shows lifetime trigger count                       |
| Icon clutter on small machines                | 1-cell pieces have no top-right cell                         | Anchor icon to top-right of rotated bounding box, not footprint cell                        |
| Hoarder feels silent                          | Doubling lands without recognition                           | Big juice on the 5th: screen flash, larger score pop, distinct SFX (audio TBD)              |
| Conductor + Conductor edge case               | Two adjacent Conductors stacking speed reductions            | `onAttach` reads existing `processingTime` modifier and applies multiplicatively (not flat) |
| Trait pool needing balance tweaks post-launch | Some traits dominate, others ignored                         | Pool weights centralized in `traits.js` — easy single-file tune                             |

## 8. Out of Scope (Future Specs)

- Dual-axis delivery contracts (🅐) — next spec; will reuse trait infrastructure
- Surge Cycle pacing structure
- Cross-run trait unlocks / meta-progression
- Trait re-roll, removal, transfer, or upgrade mechanics
- Audio design for traits
- Trait-specific tutorials beyond in-card descriptions

## 9. Success Criteria

- Every run features at least one trait piece offered within draft #2 (or earlier)
- A player who picks the same recipe twice in a run sees mechanically distinct play (because traits differ)
- Adjacency-aware traits (Resonant, Conductor) measurably shift placement decisions in playtest
- No single trait dominates the meta after balance tuning
- Trait icon + band scheme readable on the grid at a glance without hover

## 10. Effort Envelope (Rough)

- Core (registry, hooks, BaseMachine wiring, 3 stat traits): ~1–2 days
- Remaining 7 traits with special-case logic: ~1–2 days
- Visual layer (icons, bands, ghost previews, HUD chip): ~1 day (depends on art pipeline)
- Polish, playtest, balance: open-ended

---

_This spec is the precursor to the Dual-Axis Delivery Contracts spec (🅐), which will land next and reference the trait system extensively._
