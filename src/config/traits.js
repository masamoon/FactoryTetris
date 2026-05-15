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
    hooks: {
      // BaseMachine.completeProcessing has already set purity to outputLevel.
      // Catalyst adds +1 more on top, modeling the "+2 purity instead of +1" effect.
      onProcess: (resource) => {
        resource.purity = (resource.purity || 1) + 1;
        return resource;
      },
    },
  },
  {
    id: 'overclocked',
    name: 'Overclocked',
    category: TRAIT_CATEGORIES.STAT,
    description: 'Processing time is halved.',
    hooks: {
      onAttach: (machine) => {
        if (
          typeof machine.processingTime === 'number' &&
          typeof machine.setProcessingTimeModifier === 'function'
        ) {
          machine.setProcessingTimeModifier('overclocked', 0.5);
          console.log(
            `[trait:overclocked] ${machine.id} processingTime -> ${machine.processingTime}`
          );
        }
      },
      onRemove: (machine) => {
        if (typeof machine.clearProcessingTimeModifier === 'function') {
          machine.clearProcessingTimeModifier('overclocked');
        }
      },
    },
  },
  {
    id: 'tycoon',
    name: 'Tycoon',
    category: TRAIT_CATEGORIES.STAT,
    description: 'Resources processed by this machine deliver for +50% score.',
    hooks: {
      // The trait id is already appended to traitTags by processResource /
      // completeProcessing. Tycoon needs no onProcess body — DeliveryNode
      // reads the 'tycoon' tag and applies the +50% bonus.
    },
  },
  {
    id: 'polarized',
    name: 'Polarized',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Refuses resources with purity below 3. Accepted resources output 2x value.',
    hooks: {
      onProcess: (resource, machine, scene, ctx) => {
        // onProcess fires AFTER the machine overwrites purity to outputLevel
        // (absolute, NOT input+1), so resource.purity cannot tell us the
        // input purity. BaseMachine passes the true consumed-input purity in
        // ctx.inputPurity. Fall back defensively if ctx is absent.
        const inputPurity =
          ctx && typeof ctx.inputPurity === 'number' ? ctx.inputPurity : (resource.purity || 1) - 1;
        if (inputPurity < 3) {
          return null; // reject: abort this machine's output
        }
        return resource; // accepted — 2x bonus applied at delivery via 'polarized' tag
      },
    },
  },
  {
    id: 'twin',
    name: 'Twin',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Emits a duplicate output resource on each successful process.',
    hooks: {
      onProcess: (resource, machine) => {
        // Prevent exponential compounding: a resource already marked twinned
        // does not produce another duplicate.
        if (resource && resource.twinned) return resource;
        const dup = {
          ...resource,
          visitedMachines: new Set(resource.visitedMachines),
          traitTags: Array.isArray(resource.traitTags) ? [...resource.traitTags] : [],
          twinned: true,
        };
        if (Array.isArray(machine.outputQueue)) {
          machine.outputQueue.push(dup);
          console.log(
            `[trait:twin] ${machine.id} duplicated output, queue size now ${machine.outputQueue.length}`
          );
        }
        return resource;
      },
    },
  },
  {
    id: 'bypass',
    name: 'Bypass',
    category: TRAIT_CATEGORIES.RULE,
    description: 'Accepts wrong-tier inputs at 75% delivered value.',
    hooks: {
      // V1: tag-only. Delivery applies 0.75x via the 'bypass' tag (auto-added
      // to traitTags by completeProcessing since this machine's trait is
      // 'bypass'). A future plan can extend BaseMachine input acceptance to
      // actually accept off-tier inputs; for now this models "takes anything
      // but pays less" purely as a delivery-side penalty.
    },
  },
  {
    id: 'resonant',
    name: 'Resonant',
    category: TRAIT_CATEGORIES.ADJACENCY,
    description: '+50% output if an orthogonally adjacent machine shares its output tier.',
    hooks: {
      onProcess: (resource, machine, scene) => {
        if (!resource) return resource;
        const neighbors = getOrthogonalNeighborMachines(machine, scene);
        const sameTier = neighbors.some(
          (n) => n.outputLevel != null && n.outputLevel === machine.outputLevel
        );
        resource.traitTags = Array.isArray(resource.traitTags) ? resource.traitTags : [];
        // completeProcessing already auto-appended 'resonant'. Keep it ONLY if
        // adjacency is satisfied; strip it otherwise so DeliveryNode's +50%
        // applies exclusively when the adjacency condition holds.
        resource.traitTags = resource.traitTags.filter((t) => t !== 'resonant');
        if (sameTier) {
          resource.traitTags.push('resonant');
          console.log(`[trait:resonant] ${machine.id} adjacency satisfied; +50% queued`);
        }
        return resource;
      },
    },
  },
  {
    id: 'conductor',
    name: 'Conductor',
    category: TRAIT_CATEGORIES.ADJACENCY,
    description: 'Adjacent orthogonal machines process 30% faster while this is placed.',
    hooks: {
      // KNOWN V1 LIMITATION: Conductor only speeds neighbors that exist at
      // its own placement time. A machine placed adjacent to an already-
      // placed Conductor later is NOT sped up (no leak — Conductor never
      // recorded it). Accepted tradeoff per the implementation plan; a
      // future task can re-evaluate on grid changes.
      onAttach: (machine, scene) => {
        machine._traitConductedKeys = [];
        const key = `conductor:${machine.id}`;
        const neighbors = getOrthogonalNeighborMachines(machine, scene);
        for (const n of neighbors) {
          if (typeof n.setProcessingTimeModifier === 'function') {
            n.setProcessingTimeModifier(key, 0.7);
            machine._traitConductedKeys.push({ machine: n, key });
            console.log(
              `[trait:conductor] ${machine.id} sped up neighbor ${n.id} -> ${n.processingTime}ms`
            );
          }
        }
      },
      onRemove: (machine) => {
        if (!Array.isArray(machine._traitConductedKeys)) return;
        for (const entry of machine._traitConductedKeys) {
          if (entry.machine && typeof entry.machine.clearProcessingTimeModifier === 'function') {
            entry.machine.clearProcessingTimeModifier(entry.key);
          }
        }
        delete machine._traitConductedKeys;
      },
    },
  },
  {
    id: 'hoarder',
    name: 'Hoarder',
    category: TRAIT_CATEGORIES.RUN_WIDE,
    description: 'Every 5th delivery touching this machine doubles in delivered score.',
    hooks: {
      // completeProcessing already appended the plain 'hoarder' tag (informational).
      // We additionally tag with a machine-specific 'hoarder@<id>' tag so
      // DeliveryNode can attribute the delivery to the right machine's counter.
      // Only the LAST hoarder machine in a chain owns the delivery.
      onProcess: (resource, machine) => {
        if (!resource) return resource;
        resource.traitTags = Array.isArray(resource.traitTags) ? resource.traitTags : [];
        resource.traitTags = resource.traitTags.filter(
          (t) => typeof t !== 'string' || !t.startsWith('hoarder@')
        );
        resource.traitTags.push(`hoarder@${machine.id}`);
        return resource;
      },
    },
  },
  {
    id: 'beacon',
    name: 'Beacon',
    category: TRAIT_CATEGORIES.RUN_WIDE,
    description: 'Adds +0.1 to the global chain multiplier while placed. Stacks per Beacon.',
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

/**
 * Footprint cells (grid coords) occupied by a machine's shape.
 */
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

/**
 * Orthogonal-neighbor machines for a given machine, via scene.machines.
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
