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
