# Piece Traits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-instance traits to pieces with recipe output ≥ L3, rolled at draft time, so drafts become identity decisions and placement becomes a trait-positioning puzzle on top of routing.

**Architecture:** Trait definitions live in `src/config/traits.js`. A `TraitRegistry` holds run-scoped state (Beacon counter, Hoarder counters). `PieceGenerator` rolls a trait id whenever a recipe with `output ≥ 3` is assigned. `MachineFactory` pipes the trait through to `BaseMachine`, which fires `onAttach`, `onProcess`, `onRemove` hooks. `DeliveryNode` walks `resource.traitTags` and fires `onDeliver` hooks.

**Tech Stack:** Phaser 3.60, JavaScript (ESM), Webpack 5. Project has no test framework — verification is manual in the browser. Each task ends by running `npm start` and confirming a specific observation in the running game or browser console.

**Spec:** [docs/superpowers/specs/2026-05-14-piece-traits-design.md](../specs/2026-05-14-piece-traits-design.md)

**Verification convention (no TDD):**

- Where pure logic can be exercised standalone (trait roll, registry state), verify by opening the browser console at `http://localhost:8084` and running expressions against scene-attached objects.
- Where logic affects gameplay (process hooks, delivery bonuses), verify in-game by placing the relevant trait piece and confirming a `console.log` line matches the expected output.
- The plan adds explicit `console.log` statements during early tasks; these are reviewed and either kept (matching the existing codebase's heavy-log style) or removed before final commit.

---

## File Structure

**Created:**

- `src/config/traits.js` — Trait definitions, `rollTrait()`, `getTraitById()`, `getAllTraits()`
- `src/objects/traits/TraitRegistry.js` — Run-wide state for Beacon, Hoarder

**Modified:**

- `src/utils/PurityUtils.js` — Add `traitTags: []` to resources
- `src/utils/PieceGenerator.js` — Roll trait on L3+ recipes; draft-2 guarantee
- `src/objects/MachineFactory.js` — Pipe `trait` through processor type → createMachine config
- `src/objects/machines/BaseMachine.js` — Store `this.trait`, fire hook lifecycle, render icon
- `src/objects/DeliveryNode.js` — Walk `resource.traitTags`, fire `onDeliver`
- `src/scenes/GameScene.js` — Init `TraitRegistry`, scene flags, HUD chip

**Unchanged:**

- All individual machine subclasses (ProcessorAMachine etc.) — trait is on BaseMachine
- `FactoryAnalyzer.js`, `eraConfig.js`, `resourceLevels.js`

---

## Task 1: Trait config skeleton with all 10 traits (hooks stubbed)

**Files:**

- Create: `src/config/traits.js`

- [ ] **Step 1: Create the trait definitions file**

Create `src/config/traits.js` with the full content below. Hooks are stubbed (return without doing anything) — they will be filled in starting at Task 8.

```javascript
/**
 * Piece Traits — definitions and roll utilities.
 *
 * Traits attach to pieces whose recipe outputs L3 or higher. Each trait has
 * a category for visual band coloring and a hooks object whose handlers are
 * fired by BaseMachine / DeliveryNode at the appropriate lifecycle point.
 *
 * See docs/superpowers/specs/2026-05-14-piece-traits-design.md for the
 * design context.
 */

export const TRAIT_CATEGORIES = {
  STAT: 'stat',
  RULE: 'rule',
  ADJACENCY: 'adjacency',
  RUN_WIDE: 'run-wide',
};

export const TRAIT_BAND_COLORS = {
  [TRAIT_CATEGORIES.STAT]: 0x4488ff,
  [TRAIT_CATEGORIES.RULE]: 0xff8800,
  [TRAIT_CATEGORIES.ADJACENCY]: 0xaa44ff,
  [TRAIT_CATEGORIES.RUN_WIDE]: 0xffcc00,
};

// Defined as an array so tests can iterate; lookup by id via getTraitById.
export const TRAITS = [
  {
    id: 'catalyst',
    name: 'Catalyst',
    category: TRAIT_CATEGORIES.STAT,
    description: 'Resources gain +2 purity through this machine instead of +1.',
    hooks: {},
  },
  {
    id: 'overclocked',
    name: 'Overclocked',
    category: TRAIT_CATEGORIES.STAT,
    description: 'Processing time is halved.',
    hooks: {},
  },
  {
    id: 'tycoon',
    name: 'Tycoon',
    category: TRAIT_CATEGORIES.STAT,
    description: 'Resources processed by this machine deliver for +50% score.',
    hooks: {},
  },
  {
    id: 'polarized',
    name: 'Polarized',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Refuses resources with purity below 3. Accepted resources output 2x value.',
    hooks: {},
  },
  {
    id: 'twin',
    name: 'Twin',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Emits a duplicate output resource on each successful process.',
    hooks: {},
  },
  {
    id: 'bypass',
    name: 'Bypass',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Accepts wrong-tier inputs at 75% delivered value.',
    hooks: {},
  },
  {
    id: 'resonant',
    name: 'Resonant',
    category: TRAIT_CATEGORIES.ADJACENCY,
    description: '+50% output if an orthogonally adjacent machine shares its output tier.',
    hooks: {},
  },
  {
    id: 'conductor',
    name: 'Conductor',
    category: TRAIT_CATEGORIES.ADJACENCY,
    description: 'Adjacent orthogonal machines process 30% faster while this is placed.',
    hooks: {},
  },
  {
    id: 'hoarder',
    name: 'Hoarder',
    category: TRAIT_CATEGORIES.RUN_WIDE,
    description: 'Every 5th delivery touching this machine doubles in delivered score.',
    hooks: {},
  },
  {
    id: 'beacon',
    name: 'Beacon',
    category: TRAIT_CATEGORIES.RUN_WIDE,
    description: 'Adds +0.1 to the global chain multiplier while placed. Stacks per Beacon.',
    hooks: {},
  },
];

const TRAITS_BY_ID = new Map(TRAITS.map((t) => [t.id, t]));

export function getTraitById(id) {
  return TRAITS_BY_ID.get(id) || null;
}

export function getAllTraits() {
  return TRAITS;
}

/**
 * Roll a random trait from the full pool and return its id.
 * Returns null if the pool is empty.
 */
export function rollTrait() {
  if (TRAITS.length === 0) return null;
  const index = Math.floor(Math.random() * TRAITS.length);
  return TRAITS[index].id;
}

/**
 * Color helper used by visual code.
 */
export function getTraitBandColor(traitId) {
  const trait = getTraitById(traitId);
  if (!trait) return 0xffffff;
  return TRAIT_BAND_COLORS[trait.category] || 0xffffff;
}
```

- [ ] **Step 2: Verify the file loads and rollTrait returns valid ids**

Run: `npm start`

In the browser console at `http://localhost:8084`, run:

```javascript
// Imports aren't directly available; use a temporary scene reference instead.
// Easiest verification: edit src/scenes/GameScene.js create() and add:
//   import { rollTrait, getTraitById } from '../config/traits';
//   console.log('Trait roll:', rollTrait(), 'Resolves:', getTraitById('catalyst'));
// Reload and confirm the console shows a random trait id and the catalyst object.
```

Expected: a random id like `'twin'` and a resolved Catalyst object printed in the console. After verifying, revert the temporary import — Task 4 will use these imports for real.

- [ ] **Step 3: Commit**

```bash
git add src/config/traits.js
git commit -m "feat(traits): add trait definitions config and rollTrait helper

Defines the 10 starter traits (Catalyst, Overclocked, Tycoon, Polarized,
Twin, Bypass, Resonant, Conductor, Hoarder, Beacon) with stubbed hooks.
Hook bodies land in later tasks."
```

---

## Task 2: TraitRegistry for run-wide state

**Files:**

- Create: `src/objects/traits/TraitRegistry.js`

- [ ] **Step 1: Create the registry**

Create `src/objects/traits/TraitRegistry.js`:

```javascript
/**
 * TraitRegistry — holds run-scoped state for run-wide traits.
 *
 * One instance is attached to the GameScene as scene.traitRegistry. State
 * here MUST be cleared on game over / scene restart so runs are independent.
 */
export default class TraitRegistry {
  constructor() {
    this.beaconCount = 0;
    this.hoarderCounters = new Map(); // machineId -> integer delivery count
  }

  // --- Beacon ---

  incrementBeacon() {
    this.beaconCount += 1;
  }

  decrementBeacon() {
    this.beaconCount = Math.max(0, this.beaconCount - 1);
  }

  getBeaconCount() {
    return this.beaconCount;
  }

  // Additive bonus the chain multiplier formula adds in.
  getBeaconChainBonus() {
    return 0.1 * this.beaconCount;
  }

  // --- Hoarder ---

  incrementHoarder(machineId) {
    const next = (this.hoarderCounters.get(machineId) || 0) + 1;
    this.hoarderCounters.set(machineId, next);
    return next;
  }

  getHoarderCount(machineId) {
    return this.hoarderCounters.get(machineId) || 0;
  }

  resetHoarder(machineId) {
    this.hoarderCounters.delete(machineId);
  }

  // --- Lifecycle ---

  resetAll() {
    this.beaconCount = 0;
    this.hoarderCounters.clear();
  }
}
```

- [ ] **Step 2: Wire it into GameScene**

Modify `src/scenes/GameScene.js`. Near the top of the file with the other imports, add:

```javascript
import TraitRegistry from '../objects/traits/TraitRegistry';
```

Find the GameScene `create()` method. Near the top of `create()` (before machines or factory are created), add:

```javascript
this.traitRegistry = new TraitRegistry();
console.log('[GameScene] TraitRegistry initialized');
```

Find where the scene is shutdown / restarted (search for `shutdown` or scene-end handlers). If a shutdown handler exists, add `this.traitRegistry.resetAll()` to it. If none exists, no action — the new GameScene instance creates a fresh registry on restart.

- [ ] **Step 3: Verify the registry is reachable from the scene**

Run: `npm start`

In the browser console after the game loads:

```javascript
// Access the active scene; key is 'GameScene' per src/index.ts
const scene = game.scene.getScene('GameScene');
console.log(scene.traitRegistry);
console.log(scene.traitRegistry.getBeaconCount()); // expect 0
scene.traitRegistry.incrementBeacon();
console.log(scene.traitRegistry.getBeaconCount()); // expect 1
scene.traitRegistry.resetAll();
console.log(scene.traitRegistry.getBeaconCount()); // expect 0
```

If `game` is not in window scope, edit `src/index.ts` and add `window.game = game;` temporarily. Revert after verification.

- [ ] **Step 4: Commit**

```bash
git add src/objects/traits/TraitRegistry.js src/scenes/GameScene.js
git commit -m "feat(traits): add TraitRegistry for run-wide state

Tracks Beacon count and per-machine Hoarder delivery counters. Wired
into GameScene as scene.traitRegistry, cleared on scene reset."
```

---

## Task 3: Add traitTags to resource lineage

**Files:**

- Modify: `src/utils/PurityUtils.js`

- [ ] **Step 1: Extend createPurityResource and processResource**

Open `src/utils/PurityUtils.js`. Find `createPurityResource` (around line 118) and modify it to include `traitTags`:

```javascript
export function createPurityResource(purity = 1) {
  return {
    type: 'purity-resource',
    purity: purity,
    chainCount: 0,
    visitedMachines: new Set(),
    traitTags: [], // ordered list of trait ids picked up along the chain
    amount: 1,
  };
}
```

Find `processResource` (around line 134). Update it so traitTags carry through and append the machine's trait if it has one:

```javascript
export function processResource(resource, machineId, machineTrait = null) {
  const maxChain = GAME_CONFIG.purityConfig.maxChain;

  const newResource = {
    ...resource,
    purity: resource.purity + 1,
    visitedMachines: new Set(resource.visitedMachines),
    traitTags: Array.isArray(resource.traitTags) ? [...resource.traitTags] : [],
  };

  if (!newResource.visitedMachines.has(machineId)) {
    newResource.chainCount = Math.min(maxChain, newResource.chainCount + 1);
    newResource.visitedMachines.add(machineId);
  }

  if (machineTrait) {
    newResource.traitTags.push(machineTrait);
  }

  return newResource;
}
```

- [ ] **Step 2: Update BaseMachine's level-system branch to carry traitTags forward**

Open `src/objects/machines/BaseMachine.js`. Find `completeProcessing` (around line 1511). Locate the block that constructs `nextItem` when `this.outputLevel` is set (around line 1567). Change it to preserve and append `traitTags`:

```javascript
if (this.outputLevel) {
  nextItem = {
    ...processedItem,
    type: 'purity-resource',
    purity: this.outputLevel,
    visitedMachines: new Set(processedItem.visitedMachines || []),
    traitTags: Array.isArray(processedItem.traitTags) ? [...processedItem.traitTags] : [],
  };
  if (!nextItem.visitedMachines.has(this.id)) {
    nextItem.chainCount = Math.min(10, (processedItem.chainCount || 0) + 1);
    nextItem.visitedMachines.add(this.id);
  }
  if (this.trait) {
    nextItem.traitTags.push(this.trait);
  }
  console.log(
    `[${this.id}] Set output to level ${this.outputLevel} (was ${processedItem.purity}), tags: [${nextItem.traitTags.join(',')}]`
  );
} else {
  nextItem = processResource(processedItem, this.id, this.trait || null);
}
```

Note: `this.trait` is set in Task 5. It will be `undefined` until then, which the conditional handles safely.

- [ ] **Step 3: Verify traitTags is preserved through delivery**

Run: `npm start`. Play until a resource is delivered. Check the browser console — you should see at least one log line containing `tags: []` (empty for plain pieces). After Task 5 the same log will start showing trait ids.

- [ ] **Step 4: Commit**

```bash
git add src/utils/PurityUtils.js src/objects/machines/BaseMachine.js
git commit -m "feat(traits): add traitTags lineage on resources

Resources now carry an ordered list of trait ids of every traited
machine they pass through. Empty for plain pieces."
```

---

## Task 4: Roll trait in PieceGenerator

**Files:**

- Modify: `src/utils/PieceGenerator.js`

- [ ] **Step 1: Import rollTrait at the top**

In `src/utils/PieceGenerator.js`, add to the imports near the top of the file:

```javascript
import { rollTrait } from '../config/traits';
```

- [ ] **Step 2: Attach trait in `assignLevelsToShape`**

Find `assignLevelsToShape` (around line 160). Modify the `return` block at the bottom of the function (around line 220):

```javascript
return {
  inputLevels: [...config.inputs],
  outputLevel: config.output,
  notation: config.notation,
  isUsable: isPieceUsable(config, producibleLevels),
  trait: config.output >= 3 ? rollTrait() : null,
};
```

- [ ] **Step 3: Attach trait in `generatePieceOptions`**

Find `generatePieceOptions` (around line 22). Modify the `options.push` block (around line 85):

```javascript
options.push({
  ...selectedConfig,
  isUsable: isPieceUsable(selectedConfig, producibleLevels),
  trait: selectedConfig.output >= 3 ? rollTrait() : null,
});
```

- [ ] **Step 4: Verify trait is rolled on higher-tier pieces**

Run: `npm start`. In the browser console after the game loads:

```javascript
const scene = game.scene.getScene('GameScene');
console.log(scene.machineFactory.availableProcessors);
```

You should see processor entries; those with `outputLevel >= 3` must have a non-null `trait` string. Lower-tier ones must have `trait: null`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/PieceGenerator.js
git commit -m "feat(traits): roll a trait on every L3+ piece option

Both assignLevelsToShape and generatePieceOptions now attach a random
trait id when the recipe output is L3 or higher. Lower-tier pieces
remain trait-less."
```

---

## Task 5: Pipe trait through MachineFactory and BaseMachine

**Files:**

- Modify: `src/objects/MachineFactory.js`
- Modify: `src/objects/machines/BaseMachine.js`

- [ ] **Step 1: Include trait when storing initial processor type**

Open `src/objects/MachineFactory.js`. Find `initializeProcessorTypes` (around line 220). Where the processor entry is being constructed from `levelConfig` (around line 235), add `trait` to the object:

```javascript
inputLevels: levelConfig.inputLevels,
outputLevel: levelConfig.outputLevel,
notation: levelConfig.notation,
trait: levelConfig.trait || null,
```

- [ ] **Step 2: Include trait in rotated processors too**

In the same file, find `rotateProcessor` (around line 280). The new processor entry created around line 293 should also include trait:

```javascript
inputLevels: levelConfig.inputLevels,
outputLevel: levelConfig.outputLevel,
notation: levelConfig.notation,
trait: levelConfig.trait || null,
```

- [ ] **Step 3: Pipe trait into createMachine config**

In `src/objects/MachineFactory.js`, find `createMachine` (around line 1199) and the block that copies level system properties to the config (around line 1249):

```javascript
if (typeOrId.inputLevels && typeOrId.inputLevels.length > 0) {
  config.inputLevels = [...typeOrId.inputLevels];
}
if (typeOrId.outputLevel) {
  config.outputLevel = typeOrId.outputLevel;
}
if (typeOrId.notation) {
  config.notation = typeOrId.notation;
}
if (typeOrId.trait) {
  config.trait = typeOrId.trait;
}
```

- [ ] **Step 4: Initialize this.trait on BaseMachine**

Open `src/objects/machines/BaseMachine.js`. Find `initBaseProperties` (around line 143). Add `this.trait = null` at the end of the method, after `this.notation = null`:

```javascript
this.inputLevels = [];
this.outputLevel = null;
this.notation = null;
this.trait = null;
```

In the constructor (around line 75, just after `this.initMachineProperties()` is called), add:

```javascript
// Allow config to provide trait id (set by MachineFactory for higher-tier pieces).
// Read AFTER initMachineProperties so child classes can override defaults but
// the runtime trait (from draft) always wins.
if (config && config.trait) {
  this.trait = config.trait;
}
```

- [ ] **Step 5: Verify trait reaches the placed machine**

Run: `npm start`. Place a piece whose draft card shows an L3-or-higher recipe (look for `notation` containing `/3`, `/4`, `/5`, etc.). In the browser console:

```javascript
const scene = game.scene.getScene('GameScene');
// machines is the array of placed machines; find the most recently placed one.
const m = scene.machines[scene.machines.length - 1];
console.log('trait:', m.trait, 'outputLevel:', m.outputLevel);
```

Expected: `trait` is a string like `'twin'`, `outputLevel` is `>= 3`. Place an L1→L2 piece; verify its trait is `null`.

- [ ] **Step 6: Commit**

```bash
git add src/objects/MachineFactory.js src/objects/machines/BaseMachine.js
git commit -m "feat(traits): pipe trait id from draft through to placed machine

MachineFactory now stores trait on each processor type entry and passes
it via createMachine config. BaseMachine reads it into this.trait."
```

---

## Task 6: Hook lifecycle — onAttach and onRemove

**Files:**

- Modify: `src/objects/machines/BaseMachine.js`

- [ ] **Step 1: Import trait registry helper**

At the top of `src/objects/machines/BaseMachine.js`, add:

```javascript
import { getTraitById } from '../../config/traits';
```

- [ ] **Step 2: Fire onAttach at end of construction**

In the constructor, after `this.addInteractivity()` / `this.initKeyboardControls()` block (the existing code around line 117), add:

```javascript
// Fire trait onAttach hook now that the machine is fully constructed and
// on the grid. Preview-mode machines never fire trait hooks.
if (!this.isPreview && this.trait) {
  const def = getTraitById(this.trait);
  if (def && def.hooks && def.hooks.onAttach) {
    try {
      def.hooks.onAttach(this, this.scene);
    } catch (err) {
      console.error(`[${this.id}] trait onAttach failed for ${this.trait}:`, err);
    }
  }
}
```

- [ ] **Step 3: Fire onRemove on destroy**

Search for the `destroy` method in `BaseMachine.js` (use grep). If it exists, add at the top of the method:

```javascript
if (!this.isPreview && this.trait) {
  const def = getTraitById(this.trait);
  if (def && def.hooks && def.hooks.onRemove) {
    try {
      def.hooks.onRemove(this, this.scene);
    } catch (err) {
      console.error(`[${this.id}] trait onRemove failed for ${this.trait}:`, err);
    }
  }
}
```

If no `destroy` method exists in `BaseMachine.js`, add one:

```javascript
destroy() {
  if (!this.isPreview && this.trait) {
    const def = getTraitById(this.trait);
    if (def && def.hooks && def.hooks.onRemove) {
      try {
        def.hooks.onRemove(this, this.scene);
      } catch (err) {
        console.error(`[${this.id}] trait onRemove failed for ${this.trait}:`, err);
      }
    }
  }
  if (this.container) {
    this.container.destroy();
  }
}
```

Search the codebase for where machines are removed (`scene.machines.splice`, `removeMachine`, etc.) and make sure `.destroy()` is being called. If a removal path bypasses destroy(), add a call there.

- [ ] **Step 4: Verify by temporarily logging in a hook**

Edit `src/config/traits.js` temporarily — set the Catalyst trait's hooks to:

```javascript
hooks: {
  onAttach: (machine) => console.log(`[trait] Catalyst onAttach on ${machine.id}`),
  onRemove: (machine) => console.log(`[trait] Catalyst onRemove on ${machine.id}`),
},
```

Run `npm start`. Place pieces until one with `trait: 'catalyst'` lands. Confirm the onAttach log. Remove the machine (right-click or whatever the remove input is). Confirm the onRemove log.

Revert the temporary console.logs to `hooks: {}` after the verification. Real trait bodies land in Task 8+.

- [ ] **Step 5: Commit**

```bash
git add src/objects/machines/BaseMachine.js
git commit -m "feat(traits): fire trait onAttach / onRemove lifecycle hooks

BaseMachine now invokes the trait's onAttach hook at end of construction
and onRemove hook at destroy. Hooks are guarded with try/catch so a bad
trait can't crash the game."
```

---

## Task 7: Hook lifecycle — onProcess at completeProcessing

**Files:**

- Modify: `src/objects/machines/BaseMachine.js`

- [ ] **Step 1: Call onProcess after nextItem is constructed**

Open `src/objects/machines/BaseMachine.js`. Find `completeProcessing` again, the block around lines 1561–1592 where `nextItem` is built and pushed to `outputQueue`. Right before `this.outputQueue.push(nextItem);`, add:

```javascript
// Fire trait onProcess hook. Hook may MUTATE nextItem or return a
// replacement value. Returning explicit null aborts the output (used
// by Polarized when it rejects a resource).
if (this.trait) {
  const def = getTraitById(this.trait);
  if (def && def.hooks && def.hooks.onProcess) {
    try {
      const result = def.hooks.onProcess(nextItem, this, this.scene);
      if (result === null) {
        console.log(`[${this.id}] trait ${this.trait} aborted output`);
        nextItem = null;
      } else if (result && typeof result === 'object') {
        nextItem = result;
      }
    } catch (err) {
      console.error(`[${this.id}] trait onProcess failed for ${this.trait}:`, err);
    }
  }
}
```

And wrap the existing `outputQueue.push` in a null-check:

```javascript
if (nextItem) {
  this.outputQueue.push(nextItem);
  console.log(
    `[${this.id}] Processed purity item: Purity ${processedItem.purity} -> ${nextItem.purity}, Chain ${processedItem.chainCount} -> ${nextItem.chainCount}`
  );
}
```

- [ ] **Step 2: Verify with a stub log**

Temporarily set Catalyst's `onProcess` in `src/config/traits.js` to:

```javascript
hooks: {
  onProcess: (resource, machine) => {
    console.log(`[trait] Catalyst onProcess: ${machine.id} purity=${resource.purity}`);
  },
},
```

Run `npm start`. Place a Catalyst piece, route a resource through it. Confirm the onProcess log fires each time the machine completes processing.

Revert the stub.

- [ ] **Step 3: Commit**

```bash
git add src/objects/machines/BaseMachine.js
git commit -m "feat(traits): fire trait onProcess hook with mutation/abort support

After nextItem is constructed in completeProcessing, the trait's
onProcess hook can mutate or replace it. Returning null aborts the
output (used by Polarized rejection)."
```

---

## Task 8: Implement Catalyst, Overclocked, Tycoon (stat traits)

**Files:**

- Modify: `src/config/traits.js`
- Modify: `src/objects/DeliveryNode.js`

- [ ] **Step 1: Implement Catalyst (+1 extra purity)**

In `src/config/traits.js`, replace Catalyst's `hooks: {}` with:

```javascript
hooks: {
  // BaseMachine.completeProcessing has already set purity to outputLevel.
  // Catalyst adds +1 more on top, modeling the "+2 purity instead of +1" effect.
  onProcess: (resource) => {
    resource.purity = (resource.purity || 1) + 1;
    return resource;
  },
},
```

- [ ] **Step 2: Implement Overclocked (½ processing time)**

Replace Overclocked's `hooks: {}` with:

```javascript
hooks: {
  onAttach: (machine) => {
    if (typeof machine.processingTime === 'number') {
      machine._traitOriginalProcessingTime = machine.processingTime;
      machine.processingTime = Math.max(50, Math.floor(machine.processingTime * 0.5));
      console.log(
        `[trait:overclocked] ${machine.id} processingTime: ${machine._traitOriginalProcessingTime} -> ${machine.processingTime}`
      );
    }
  },
  onRemove: (machine) => {
    if (typeof machine._traitOriginalProcessingTime === 'number') {
      machine.processingTime = machine._traitOriginalProcessingTime;
      delete machine._traitOriginalProcessingTime;
    }
  },
},
```

- [ ] **Step 3: Implement Tycoon (delivery-side bonus)**

Replace Tycoon's `hooks: {}` with:

```javascript
hooks: {
  // The trait id is already appended to traitTags by Task 3's processResource.
  // Tycoon needs no onProcess body — DeliveryNode reads the tag.
},
```

In `src/objects/DeliveryNode.js`, find `acceptItem`. Inside the `if (itemType === 'level-resource')` block (around line 103), after `const totalPoints = getLevelPoints(level);` and before `this.scene.addScore(totalPoints);`, add:

```javascript
// Apply trait-tag delivery modifiers.
const tags = Array.isArray(itemData.traitTags) ? itemData.traitTags : [];
let modifier = 1.0;
if (tags.includes('tycoon')) modifier *= 1.5;
const adjustedPoints = Math.floor(totalPoints * modifier);
if (modifier !== 1.0) {
  console.log(
    `[DeliveryNode] trait-adjusted score: ${totalPoints} -> ${adjustedPoints} (tags: ${tags.join(',')})`
  );
}
this.scene.addScore(adjustedPoints);
```

Then **remove or comment out** the existing `this.scene.addScore(totalPoints);` line directly below — `adjustedPoints` replaces it.

- [ ] **Step 4: Verify all three traits**

Run `npm start`. Test scenarios:

1. **Catalyst:** place a Catalyst piece; route a purity-1 resource through it. The output should have `purity = outputLevel + 1` (e.g., if it's a `2/3` piece, expect purity 4 not 3). Watch the console log line `purity X -> Y`.
2. **Overclocked:** look in console for the `[trait:overclocked] ${machine.id} processingTime: ${old} -> ${new}` log on placement. Confirm the machine visibly processes faster than an identical untraited one.
3. **Tycoon:** route a resource through a Tycoon machine to delivery. Watch console for `trait-adjusted score: X -> Y (tags: tycoon)`. Confirm Y = floor(X × 1.5).

- [ ] **Step 5: Commit**

```bash
git add src/config/traits.js src/objects/DeliveryNode.js
git commit -m "feat(traits): implement Catalyst, Overclocked, Tycoon

- Catalyst: onProcess adds +1 purity on top of base.
- Overclocked: onAttach halves processingTime, onRemove restores.
- Tycoon: tagged at process time, +50% score read by DeliveryNode."
```

---

## Task 9: Implement Polarized, Twin, Bypass (rule bends)

**Files:**

- Modify: `src/config/traits.js`
- Modify: `src/objects/DeliveryNode.js`

- [ ] **Step 1: Polarized — reject low-purity + 2x on delivery**

In `src/config/traits.js`, set Polarized's hooks:

```javascript
hooks: {
  onProcess: (resource) => {
    // The hook fires AFTER the machine has already set output purity.
    // We need to check the INPUT purity — which is one less than the current.
    // (processResource and the level-system branch both bump purity by 1 from input.)
    const inputPurity = (resource.purity || 1) - 1;
    if (inputPurity < 3) {
      return null; // abort output
    }
    return resource; // mutation handled by tag-read at delivery
  },
},
```

In `src/objects/DeliveryNode.js`, extend the modifier block from Task 8:

```javascript
if (tags.includes('tycoon')) modifier *= 1.5;
if (tags.includes('polarized')) modifier *= 2.0;
```

- [ ] **Step 2: Twin — duplicate output**

In `src/config/traits.js`, set Twin's hooks:

```javascript
hooks: {
  onProcess: (resource, machine) => {
    // Prevent exponential compounding: a resource already marked twinned
    // does not produce another duplicate.
    if (resource && resource.twinned) return resource;
    // Build the duplicate, mark it, queue it via the machine's outputQueue.
    const dup = {
      ...resource,
      visitedMachines: new Set(resource.visitedMachines),
      traitTags: Array.isArray(resource.traitTags) ? [...resource.traitTags] : [],
      twinned: true,
    };
    if (Array.isArray(machine.outputQueue)) {
      machine.outputQueue.push(dup);
      console.log(`[trait:twin] ${machine.id} duplicated output, queue size now ${machine.outputQueue.length}`);
    }
    return resource;
  },
},
```

- [ ] **Step 3: Bypass — soft accept + 0.75x on delivery**

For v1, Bypass operates as a tag-read penalty: the machine still requires its declared input tier (we don't rewrite the input gate). Instead, when a resource is processed AND tagged `bypass`, the delivered value is 0.75x — modeling the trait as "this machine takes anything but pays less."

A future task can extend the input check to actually accept off-tier inputs. Document this clearly so the engineer doesn't think this is the whole feature.

In `src/config/traits.js`, set Bypass's hooks:

```javascript
hooks: {
  // V1: tag-only. Delivery applies 0.75x. A follow-up plan can extend
  // BaseMachine.canAcceptInput() to accept off-tier inputs for Bypass.
  // For now the trait id is appended via processResource lineage.
},
```

In `src/objects/DeliveryNode.js`, extend the modifier block:

```javascript
if (tags.includes('tycoon')) modifier *= 1.5;
if (tags.includes('polarized')) modifier *= 2.0;
if (tags.includes('bypass')) modifier *= 0.75;
```

- [ ] **Step 4: Verify**

Run `npm start`.

1. **Polarized:** drop a Polarized piece on top of a chain producing low-purity resources. The Polarized machine's outputQueue should not advance until purity-3+ inputs reach it. Verify via the existing per-machine log lines.
2. **Twin:** route a resource through a Twin machine. After completion, console shows `[trait:twin] ... duplicated output, queue size now 2`. Confirm the next conveyor receives two items.
3. **Bypass:** route a resource through a Bypass machine and deliver it. Console shows `tags: ...bypass...` and adjusted score 0.75x base.

- [ ] **Step 5: Commit**

```bash
git add src/config/traits.js src/objects/DeliveryNode.js
git commit -m "feat(traits): implement Polarized, Twin, Bypass

- Polarized: aborts output when input purity < 3; 2x delivery bonus.
- Twin: pushes a duplicate output (one-step compound guard via twinned flag).
- Bypass: 0.75x delivery penalty (input-gate rewrite deferred)."
```

---

## Task 10: Implement Resonant, Conductor (adjacency)

**Files:**

- Modify: `src/config/traits.js`

- [ ] **Step 1: Add a small neighbor-scan helper to traits.js**

At the bottom of `src/config/traits.js`, add:

```javascript
/**
 * Return the orthogonal-neighbor machines for a given machine on the grid.
 * Reads from scene.machines and uses each machine's gridX/gridY + shape footprint.
 * O(machines.length); fine for current grid sizes.
 */
function getOrthogonalNeighborMachines(machine, scene) {
  if (!scene || !Array.isArray(scene.machines)) return [];
  const cells = footprintCells(machine);
  if (cells.length === 0) return [];
  const result = new Set();
  for (const other of scene.machines) {
    if (other === machine || other.isPreview) continue;
    const otherCells = footprintCells(other);
    for (const a of cells) {
      for (const b of otherCells) {
        if (
          (Math.abs(a.x - b.x) === 1 && a.y === b.y) ||
          (a.x === b.x && Math.abs(a.y - b.y) === 1)
        ) {
          result.add(other);
        }
      }
    }
  }
  return Array.from(result);
}

function footprintCells(machine) {
  if (!machine || !machine.shape || machine.gridX == null) return [];
  const cells = [];
  for (let r = 0; r < machine.shape.length; r++) {
    for (let c = 0; c < machine.shape[r].length; c++) {
      if (machine.shape[r][c]) {
        cells.push({ x: machine.gridX + c, y: machine.gridY + r });
      }
    }
  }
  return cells;
}
```

- [ ] **Step 2: Resonant**

Replace Resonant's `hooks: {}` with:

```javascript
hooks: {
  onProcess: (resource, machine, scene) => {
    if (!resource) return resource;
    const neighbors = getOrthogonalNeighborMachines(machine, scene);
    const sameTier = neighbors.some(
      (n) => n.outputLevel != null && n.outputLevel === machine.outputLevel
    );
    if (sameTier) {
      resource.traitTags = Array.isArray(resource.traitTags) ? resource.traitTags : [];
      // Inject a synthetic 'resonant' tag so DeliveryNode applies the +50%.
      // (Already appended by processResource if machine.trait is 'resonant', but
      // we only want the bonus to apply when adjacency was satisfied. So we
      // explicitly REMOVE the trait's own tag first, then conditionally add.)
      resource.traitTags = resource.traitTags.filter((t) => t !== 'resonant');
      resource.traitTags.push('resonant');
      console.log(`[trait:resonant] ${machine.id} adjacency satisfied; +50% queued`);
    } else {
      // Adjacency NOT satisfied — strip the auto-appended tag so DeliveryNode
      // doesn't bonus this resource.
      if (Array.isArray(resource.traitTags)) {
        resource.traitTags = resource.traitTags.filter((t) => t !== 'resonant');
      }
    }
    return resource;
  },
},
```

In `src/objects/DeliveryNode.js`, extend the modifier block:

```javascript
if (tags.includes('resonant')) modifier *= 1.5;
```

- [ ] **Step 3: Conductor**

Replace Conductor's `hooks: {}` with:

```javascript
hooks: {
  onAttach: (machine, scene) => {
    machine._traitConductedNeighbors = [];
    const neighbors = getOrthogonalNeighborMachines(machine, scene);
    for (const n of neighbors) {
      if (typeof n.processingTime === 'number') {
        n._traitConductorOriginalTime = n._traitConductorOriginalTime || n.processingTime;
        n._traitConductorStack = (n._traitConductorStack || 0) + 1;
        // Apply the multiplicative speed-up over the original time
        n.processingTime = Math.max(
          50,
          Math.floor(n._traitConductorOriginalTime * Math.pow(0.7, n._traitConductorStack))
        );
        machine._traitConductedNeighbors.push(n);
        console.log(
          `[trait:conductor] ${machine.id} sped up neighbor ${n.id} to ${n.processingTime}ms (stack ${n._traitConductorStack})`
        );
      }
    }
  },
  onRemove: (machine) => {
    if (!Array.isArray(machine._traitConductedNeighbors)) return;
    for (const n of machine._traitConductedNeighbors) {
      n._traitConductorStack = Math.max(0, (n._traitConductorStack || 1) - 1);
      if (n._traitConductorStack === 0) {
        n.processingTime = n._traitConductorOriginalTime;
        delete n._traitConductorOriginalTime;
        delete n._traitConductorStack;
      } else if (typeof n._traitConductorOriginalTime === 'number') {
        n.processingTime = Math.max(
          50,
          Math.floor(n._traitConductorOriginalTime * Math.pow(0.7, n._traitConductorStack))
        );
      }
    }
    delete machine._traitConductedNeighbors;
  },
},
```

Note: Conductor only updates neighbors at attach/remove. If a neighbor is placed _next to_ an existing Conductor, the new neighbor will NOT pick up the speedup. Acceptable v1 limitation — call out in the commit message.

- [ ] **Step 4: Verify**

Run `npm start`.

1. **Resonant:** place a Resonant L3 piece next to another machine that also outputs L3. Route a resource through Resonant to delivery. Confirm `tags: resonant` and 1.5× score in the DeliveryNode log. Then move the Resonant away (or remove the neighbor) and verify the bonus stops.
2. **Conductor:** place a Conductor next to a slow machine. Watch the `[trait:conductor]` log and confirm the neighbor's processingTime drops. Remove the Conductor; verify processingTime restores.

- [ ] **Step 5: Commit**

```bash
git add src/config/traits.js src/objects/DeliveryNode.js
git commit -m "feat(traits): implement Resonant and Conductor (adjacency)

Resonant only applies bonus when an orthogonal neighbor shares output
tier (checked at process time). Conductor mutates neighbors'
processingTime on attach/remove, with stack-aware restore.

Known v1 limitation: new neighbors placed near an existing Conductor
do not retroactively pick up the speedup."
```

---

## Task 11: Implement Hoarder, Beacon (run-wide) + DeliveryNode onDeliver dispatch

**Files:**

- Modify: `src/config/traits.js`
- Modify: `src/objects/DeliveryNode.js`

- [ ] **Step 1: Beacon — registry-tracked**

In `src/config/traits.js`, replace Beacon's `hooks: {}` with:

```javascript
hooks: {
  onAttach: (machine, scene) => {
    if (scene && scene.traitRegistry) {
      scene.traitRegistry.incrementBeacon();
      console.log(`[trait:beacon] count -> ${scene.traitRegistry.getBeaconCount()}`);
    }
  },
  onRemove: (machine, scene) => {
    if (scene && scene.traitRegistry) {
      scene.traitRegistry.decrementBeacon();
      console.log(`[trait:beacon] count -> ${scene.traitRegistry.getBeaconCount()}`);
    }
  },
},
```

- [ ] **Step 2: Wire Beacon into chain multiplier**

Open `src/utils/PurityUtils.js`. Find `calculateDeliveryScore` (around line 107). Add an optional `scene` parameter and read the Beacon bonus:

```javascript
export function calculateDeliveryScore(purity, chainCount, streakBonus = 1, scene = null) {
  const basePoints = getPurityPoints(purity);
  const baseMultiplier = getChainMultiplier(chainCount);
  const beaconBonus =
    scene && scene.traitRegistry && typeof scene.traitRegistry.getBeaconChainBonus === 'function'
      ? scene.traitRegistry.getBeaconChainBonus()
      : 0;
  const chainMultiplier = baseMultiplier + beaconBonus;
  return Math.floor(basePoints * chainMultiplier * streakBonus);
}
```

This function isn't currently used in the level-system delivery path (DeliveryNode uses `getLevelPoints` directly), so also extend the DeliveryNode modifier block to apply Beacon bonus to level-resource deliveries:

In `src/objects/DeliveryNode.js`, just before the modifier multiplications:

```javascript
const beaconBonus =
  this.scene.traitRegistry && typeof this.scene.traitRegistry.getBeaconChainBonus === 'function'
    ? this.scene.traitRegistry.getBeaconChainBonus()
    : 0;
let modifier = 1.0 + beaconBonus;
```

(Replace the existing `let modifier = 1.0;` line with the above.)

- [ ] **Step 3: Hoarder — increment + apply on delivery**

In `src/config/traits.js`, replace Hoarder's `hooks: {}` with:

```javascript
hooks: {
  // Per-machine delivery counter is incremented at delivery time.
  // We need to know which machine the resource came from — we use a
  // dedicated tag string of the form 'hoarder@<machineId>'.
  onProcess: (resource, machine) => {
    if (!resource) return resource;
    resource.traitTags = Array.isArray(resource.traitTags) ? resource.traitTags : [];
    // Replace any prior hoarder tag with this machine's specific one
    // (only the LAST hoarder machine in a chain "owns" the delivery).
    resource.traitTags = resource.traitTags.filter((t) => !t.startsWith('hoarder@'));
    resource.traitTags.push(`hoarder@${machine.id}`);
    return resource;
  },
},
```

Note that processResource appended the plain `'hoarder'` tag earlier — that one is informational; the `hoarder@<id>` tag is what DeliveryNode acts on.

In `src/objects/DeliveryNode.js`, just before applying `modifier` to `totalPoints`, add:

```javascript
// Hoarder: per-machine running counter; every 5th delivery doubles.
const hoarderTag = tags.find((t) => typeof t === 'string' && t.startsWith('hoarder@'));
if (hoarderTag && this.scene.traitRegistry) {
  const machineId = hoarderTag.substring('hoarder@'.length);
  const count = this.scene.traitRegistry.incrementHoarder(machineId);
  if (count % 5 === 0) {
    modifier *= 2.0;
    console.log(
      `[trait:hoarder] ${machineId} hit ${count}-th delivery, doubling this delivery's score`
    );
  }
}
```

- [ ] **Step 4: Verify**

Run `npm start`.

1. **Beacon:** place 2 Beacons. Console shows count incrementing to 2. Deliver any resource — the modifier in the log is +0.2 above baseline (Beacon bonus). Remove one Beacon; verify bonus reduces.
2. **Hoarder:** place a Hoarder piece in a chain. Deliver 5 resources from that chain. The 5th should log `[trait:hoarder] ... hit 5-th delivery, doubling this delivery's score`. Confirm the 5th delivery's adjustedPoints is 2× the others.

- [ ] **Step 5: Commit**

```bash
git add src/config/traits.js src/objects/DeliveryNode.js src/utils/PurityUtils.js
git commit -m "feat(traits): implement Hoarder and Beacon (run-wide)

Beacon increments scene.traitRegistry.beaconCount on attach, adding
+0.1 per beacon to delivered chain multipliers. Hoarder tags resources
with hoarder@<machineId> and doubles every 5th delivery via the
registry's per-machine counter."
```

---

## Task 12: Draft-2 trait guarantee

**Files:**

- Modify: `src/utils/PieceGenerator.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `src/objects/MachineFactory.js`

- [ ] **Step 1: Add scene flags**

Open `src/scenes/GameScene.js`. In `create()` near where `traitRegistry` was initialized (Task 2), add:

```javascript
this.hasIntroducedTrait = false;
this.firstL2Placed = false;
```

- [ ] **Step 2: Set firstL2Placed when first L2-output piece placed**

In `src/objects/MachineFactory.js`, find `createMachine` (around line 1199). After the `machineRegistry.createMachine(...)` call returns a valid instance, add:

```javascript
if (this.scene && this.scene.firstL2Placed === false && instance && instance.outputLevel === 2) {
  this.scene.firstL2Placed = true;
  console.log('[traits] firstL2Placed armed; next draft will guarantee a trait');
}
```

(Adjust the variable name `instance` to whatever the local variable is named in that function — based on line 1266 it's `const machine = ...`.)

- [ ] **Step 3: Engineer the next draft in PieceGenerator**

Open `src/utils/PieceGenerator.js`. In `generatePieceOptions`, replace the `for` loop's final mutation (the `return options;` line at the bottom) with:

```javascript
  }

  // Draft-2 trait guarantee:
  // If the scene is armed (player has placed an L2) and no usable trait
  // option exists naturally, replace slot 0 with a usable L3+ + trait.
  if (
    scene &&
    scene.hasIntroducedTrait === false &&
    scene.firstL2Placed === true &&
    !options.some((o) => o.isUsable && o.trait)
  ) {
    const usableL3Plus = allConfigs.filter(
      (c) => c.output >= 3 && isPieceUsable(c, producibleLevels)
    );
    if (usableL3Plus.length > 0) {
      const forced = selectWeightedConfig(usableL3Plus, producibleLevels, currentEra);
      options[0] = {
        ...forced,
        isUsable: true,
        trait: rollTrait(),
      };
      console.log('[traits] Forced trait piece into draft slot 0:', options[0]);
    }
  }

  // Once a usable trait option is in the hand (naturally or forced), mark
  // introduction done so the guarantee never re-fires this run.
  if (scene && options.some((o) => o.isUsable && o.trait)) {
    scene.hasIntroducedTrait = true;
  }

  return options;
}
```

- [ ] **Step 4: Verify**

Run `npm start`. Start a fresh run. Confirm draft 1 may or may not have a trait piece (random). Place an L1→L2 piece. The NEXT draft should include a usable trait piece. Watch console for `[traits] Forced trait piece...` if needed.

Edge case: start a run where the first draft already has a usable trait piece (more likely given the existing higher-tier guarantee). Confirm `hasIntroducedTrait` becomes true and the guarantee doesn't re-fire later.

- [ ] **Step 5: Commit**

```bash
git add src/utils/PieceGenerator.js src/scenes/GameScene.js src/objects/MachineFactory.js
git commit -m "feat(traits): guarantee a trait piece by draft 2

Scene tracks firstL2Placed and hasIntroducedTrait. After the first L2
piece is placed, the next draft is force-engineered to include at
least one usable L3+ piece with a trait. Fires once per run."
```

---

## Task 13: Visual layer — trait icon and band on placed machines

**Files:**

- Modify: `src/objects/machines/BaseMachine.js`
- Modify: `src/config/traits.js` (color helper already added in Task 1)

- [ ] **Step 1: Add a method to render trait overlay**

Open `src/objects/machines/BaseMachine.js`. Find `createVisuals()` (or where visuals are added to the container). At the end of that method, after the existing visual elements are added, append:

```javascript
this.renderTraitOverlay();
```

Then add the new method (place it near other rendering methods):

```javascript
/**
 * Render a small trait icon and colored band over the machine if it has a trait.
 * Uses a placeholder (text initial in a circle) until real icon sprites exist.
 */
renderTraitOverlay() {
  if (!this.trait || !this.container) return;
  // getTraitById is already imported at the top of this file in Task 6.
  // Add getTraitBandColor to that same import line:
  //   import { getTraitById, getTraitBandColor } from '../../config/traits';
  const def = getTraitById(this.trait);
  if (!def) return;

  const bandColor = getTraitBandColor(this.trait);

  // Footprint width/height in pixels (cellSize * shape dims)
  const cellSize = this.grid ? this.grid.cellSize : 32;
  let w = cellSize;
  let h = cellSize;
  if (Array.isArray(this.shape) && this.shape.length > 0) {
    h = this.shape.length * cellSize;
    w = (this.shape[0] || [1]).length * cellSize;
  }

  // Colored band: 2px stroked rectangle slightly larger than footprint
  const band = this.scene.add.rectangle(w / 2 - cellSize / 2, h / 2 - cellSize / 2, w, h);
  band.setStrokeStyle(2, bandColor, 0.9);
  this.container.add(band);

  // Pulse the band gently to read at a glance
  this.scene.tweens.add({
    targets: band,
    alpha: { from: 0.4, to: 1.0 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Placeholder icon: small circle with the trait's initial
  const iconX = w - cellSize / 2;
  const iconY = -cellSize / 4;
  const iconBg = this.scene.add.circle(iconX, iconY, 8, bandColor);
  iconBg.setStrokeStyle(1, 0xffffff, 0.9);
  this.container.add(iconBg);

  const iconText = this.scene.add
    .text(iconX, iconY, def.name.charAt(0).toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: 11,
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  this.container.add(iconText);

  // Store handles for cleanup on destroy
  this._traitOverlay = { band, iconBg, iconText };
}
```

- [ ] **Step 2: Clean up the overlay on destroy**

In `BaseMachine.destroy` (added/modified in Task 6), add at the top of the method:

```javascript
if (this._traitOverlay) {
  this._traitOverlay.band.destroy();
  this._traitOverlay.iconBg.destroy();
  this._traitOverlay.iconText.destroy();
  this._traitOverlay = null;
}
```

- [ ] **Step 3: Verify**

Run `npm start`. Place pieces with various traits. Confirm:

- Each trait-bearing machine has a colored pulsing border
- A small colored circle with the trait's initial letter (C, O, T, P, etc.) overlays the top-right
- The band color matches the category (stat=blue, rule=orange, adjacency=purple, run-wide=gold)
- Removing the machine cleans up the overlay (no orphaned graphics)

- [ ] **Step 4: Commit**

```bash
git add src/objects/machines/BaseMachine.js
git commit -m "feat(traits): render trait icon and category band on placed machines

Placeholder visuals (colored circle + first letter) until real icon
sprites exist. Pulsing band reads category at a glance."
```

---

## Task 14: Visual layer — trait info on draft preview cards

**Files:**

- Modify: `src/objects/MachineFactory.js`

- [ ] **Step 1: Add trait info to the processor preview**

Open `src/objects/MachineFactory.js`. Find the block where processor previews are rendered (around lines 380–425). Locate the `notationLabel` text creation (around line 410). After that block, add:

```javascript
// Trait display on the preview card (if the processor type has one).
if (machineType.trait) {
  // Imports at top of file may need to grow:
  //   import { getTraitById, getTraitBandColor } from '../config/traits';
  const def = getTraitById(machineType.trait);
  const bandColor = getTraitBandColor(machineType.trait);
  if (def) {
    const traitNameLabel = this.scene.add
      .text(itemX, itemY + 42, def.name, {
        fontFamily: 'Arial',
        fontSize: 11,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const traitDescLabel = this.scene.add
      .text(itemX, itemY + 56, def.description, {
        fontFamily: 'Arial',
        fontSize: 9,
        color: '#cccccc',
        wordWrap: { width: 120 },
        align: 'center',
      })
      .setOrigin(0.5);
    // A small color band beneath the card (rect with stroke)
    const bandWidth = 80;
    const band = this.scene.add.rectangle(itemX, itemY + 72, bandWidth, 3, bandColor);
    this.processorPreviewContainer.add(traitNameLabel);
    this.processorPreviewContainer.add(traitDescLabel);
    this.processorPreviewContainer.add(band);

    machinePreview.traitNameLabel = traitNameLabel;
    machinePreview.traitDescLabel = traitDescLabel;
    machinePreview.traitBand = band;
  }
}
```

Also add the import at the top of the file:

```javascript
import { getTraitById, getTraitBandColor } from '../config/traits';
```

- [ ] **Step 2: Verify**

Run `npm start`. Inspect the draft preview area. Pieces whose recipe is L3+ should show:

- The recipe notation (existing)
- Trait name in bold
- Description in smaller text below
- A horizontal color band matching the trait category

Plain L1/L2 pieces should show only the notation.

- [ ] **Step 3: Commit**

```bash
git add src/objects/MachineFactory.js
git commit -m "feat(traits): show trait info on draft preview cards

Higher-tier pieces in the processor selection panel now display trait
name, description, and a category-colored band — letting players see
what they're drafting before placement."
```

---

## Task 15: Visual layer — HUD chip for active run-wide traits

**Files:**

- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add a HUD chip container**

In `src/scenes/GameScene.js` `create()` method, near where other HUD elements are positioned (search for score display or upgrade indicators), add:

```javascript
// Active run-wide traits HUD
this.runWideHud = this.add.container(this.cameras.main.width - 12, 8);
this.runWideHud.setScrollFactor(0);
this.runWideHud.setDepth(1000);
this.runWideHudLabel = this.add
  .text(0, 0, '', {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: { x: 6, y: 4 },
  })
  .setOrigin(1, 0);
this.runWideHud.add(this.runWideHudLabel);
```

- [ ] **Step 2: Add a method to refresh the HUD**

Add to GameScene:

```javascript
refreshRunWideHud() {
  if (!this.traitRegistry || !this.runWideHudLabel) return;
  const lines = [];
  const beaconCount = this.traitRegistry.getBeaconCount();
  if (beaconCount > 0) {
    lines.push(`Beacon x${beaconCount} (+${(beaconCount * 0.1).toFixed(1)} chain)`);
  }
  // Hoarder: list machines with a non-zero counter
  for (const [id, count] of this.traitRegistry.hoarderCounters.entries()) {
    const next = 5 - (count % 5);
    lines.push(`Hoarder@${id}: next x2 in ${next}`);
  }
  this.runWideHudLabel.setText(lines.join('\n'));
}
```

- [ ] **Step 3: Call refreshRunWideHud at key moments**

Search for the GameScene `update` method and call once per second (avoid every frame for cost):

```javascript
update(time, delta) {
  // ... existing update code ...

  // Trait HUD refresh
  this._traitHudAccum = (this._traitHudAccum || 0) + delta;
  if (this._traitHudAccum >= 500) {
    this.refreshRunWideHud();
    this._traitHudAccum = 0;
  }
}
```

Also call it explicitly in addScore (or wherever score is added) so Hoarder counters update immediately on delivery. Search for `addScore` in GameScene.js and add at the end:

```javascript
if (typeof this.refreshRunWideHud === 'function') {
  this.refreshRunWideHud();
}
```

- [ ] **Step 4: Verify**

Run `npm start`.

1. Place a Beacon. Within ~½ second, top-right HUD shows `Beacon x1 (+0.1 chain)`. Add a second; updates to `Beacon x2 (+0.2 chain)`. Remove one; reverts.
2. Route resources through a Hoarder machine and deliver. HUD shows `Hoarder@<id>: next x2 in N` and counts down each delivery.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(traits): HUD chip for active run-wide traits

Top-right HUD lists active Beacon stack with current chain bonus and
each Hoarder machine's countdown to next x2 delivery. Updates every
500ms and on every score change."
```

---

## Self-Review (run before handing off to executor)

After implementing all 15 tasks, do a pass:

1. **Spec coverage:**
   - All 10 traits implemented? (Catalyst, Overclocked, Tycoon, Polarized, Twin, Bypass, Resonant, Conductor, Hoarder, Beacon) ✓
   - Tier gate (output ≥ 3) wired in PieceGenerator? ✓
   - Permanence (no re-roll, destroyed on remove) — Task 6 onRemove cleans up; trait re-roll explicitly out of scope ✓
   - Draft-2 guarantee? ✓ (Task 12)
   - Visual: icon + band on placed machine ✓ (Task 13)
   - Visual: trait info on draft card ✓ (Task 14)
   - Visual: HUD chip for run-wide ✓ (Task 15)
   - Ghost preview trait display — **NOT covered in this plan.** Spec Section 5.3 mentions this. Add as follow-up task or note as deferred polish.
   - Particle flash on trigger — **NOT covered in this plan.** Spec Section 5.5 mentions this. Mark as polish for a follow-up.
   - Trigger feedback for adjacency activations — also deferred polish.

2. **Known gaps deferred to a follow-up plan:**
   - Ghost preview trait + adjacency highlight rings
   - Particle flashes on trait triggers
   - Bypass's actual input-gate rewrite (v1 is delivery-side penalty only)
   - Conductor's "new neighbor doesn't pick up speedup" limitation

3. **Type/name consistency:** Check that `scene.traitRegistry`, `machine.trait`, `resource.traitTags`, and trait ids match exactly between tasks. Cross-reference Tasks 2, 5, 7, 9, 10, 11, 12.

4. **Run all 10 traits end-to-end one more time** before declaring the plan complete.
