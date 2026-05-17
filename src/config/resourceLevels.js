/**
 * Resource Level System Configuration
 * Defines the tiered resource levels and valid piece configurations
 * Extended for Era/Transcendence system with dynamic tier generation
 */

import {
  getPointsForTier,
  getColorForTier,
  getNameForTier,
  getTiersForEra,
  getTranscendTier,
} from './eraConfig.js';

// Static resource level definitions (Era 1 base tiers)
export const RESOURCE_LEVELS = {
  1: { name: 'Raw', color: 0x888888, points: 10 },
  2: { name: 'Refined', color: 0x22cc22, points: 25 },
  3: { name: 'Processed', color: 0x2288ff, points: 50 },
  4: { name: 'Premium', color: 0xffcc00, points: 100 },
};

// Helper to get level color - supports dynamic tiers beyond L4
export function getLevelColor(level) {
  if (RESOURCE_LEVELS[level]) {
    return RESOURCE_LEVELS[level].color;
  }
  // Dynamic tier from eraConfig
  return getColorForTier(level);
}

// Helper to get level name - supports dynamic tiers beyond L4
export function getLevelName(level) {
  if (RESOURCE_LEVELS[level]) {
    return RESOURCE_LEVELS[level].name;
  }
  // Dynamic tier from eraConfig
  return getNameForTier(level);
}

// Helper to get level points - supports dynamic tiers beyond L4
export function getLevelPoints(level) {
  if (RESOURCE_LEVELS[level]) {
    return RESOURCE_LEVELS[level].points;
  }
  // Dynamic tier from eraConfig
  return getPointsForTier(level);
}

export const ARITHMETIC_OPERATION_TYPES = {
  ADD_CONSTANT: 'add-constant',
  ADD: 'add',
  MULTIPLY: 'multiply',
  DIVIDE: 'divide',
};

export const ARITHMETIC_OPERATION_TAGS = {
  ADD_CONSTANT: 'op:add-constant',
  ADD_ONE: 'op:add-one',
  ADD_TWO: 'op:add-two',
  ADD: 'op:add',
  MULTIPLY: 'op:multiply',
  DIVIDE: 'op:divide',
  BINARY: 'op:binary',
};

export function getArithmeticOperationTags(operation) {
  if (!operation) return [];

  const tags = [];
  switch (operation.type) {
    case ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT:
      tags.push(ARITHMETIC_OPERATION_TAGS.ADD_CONSTANT);
      if (operation.value === 1) tags.push(ARITHMETIC_OPERATION_TAGS.ADD_ONE);
      if (operation.value === 2) tags.push(ARITHMETIC_OPERATION_TAGS.ADD_TWO);
      break;
    case ARITHMETIC_OPERATION_TYPES.ADD:
      tags.push(ARITHMETIC_OPERATION_TAGS.ADD, ARITHMETIC_OPERATION_TAGS.BINARY);
      break;
    case ARITHMETIC_OPERATION_TYPES.MULTIPLY:
      tags.push(ARITHMETIC_OPERATION_TAGS.MULTIPLY, ARITHMETIC_OPERATION_TAGS.BINARY);
      break;
    case ARITHMETIC_OPERATION_TYPES.DIVIDE:
      tags.push(ARITHMETIC_OPERATION_TAGS.DIVIDE, ARITHMETIC_OPERATION_TAGS.BINARY);
      break;
    default:
      break;
  }

  return tags;
}

export function getArithmeticOperationTagLabel(tag) {
  switch (tag) {
    case ARITHMETIC_OPERATION_TAGS.ADD:
      return 'mix';
    case ARITHMETIC_OPERATION_TAGS.ADD_TWO:
      return '+2';
    case ARITHMETIC_OPERATION_TAGS.ADD_ONE:
      return '+1';
    case ARITHMETIC_OPERATION_TAGS.MULTIPLY:
      return 'multiply';
    case ARITHMETIC_OPERATION_TAGS.DIVIDE:
      return 'divide';
    case ARITHMETIC_OPERATION_TAGS.BINARY:
      return 'combine';
    default:
      return null;
  }
}

export const ARITHMETIC_PIECE_CONFIGS = [
  {
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
    inputCount: 1,
    notation: 'a+1',
  },
  {
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
    inputCount: 1,
    notation: 'a+2',
  },
  {
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD },
    inputCount: 2,
    notation: 'a+b',
  },
  {
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.MULTIPLY },
    inputCount: 2,
    notation: 'a*b',
  },
  {
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.DIVIDE },
    inputCount: 2,
    notation: 'a/b',
  },
];

export function isArithmeticConfig(config) {
  return Boolean(config && config.arithmeticOperation);
}

export function getArithmeticInputCount(configOrOperation) {
  if (!configOrOperation) return 1;
  if (typeof configOrOperation.inputCount === 'number') return configOrOperation.inputCount;

  const operation = configOrOperation.arithmeticOperation || configOrOperation;
  return operation.type === ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT ? 1 : 2;
}

export function calculateArithmeticOutput(operation, inputLevels) {
  if (!operation || !Array.isArray(inputLevels) || inputLevels.length === 0) {
    return null;
  }

  const levels = inputLevels
    .map((level) => Math.max(1, Math.floor(Number(level) || 1)))
    .filter((level) => level > 0);

  if (levels.length === 0) {
    return null;
  }

  const a = levels[0];
  const b = levels.length > 1 ? levels[1] : 1;

  switch (operation.type) {
    case ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT:
      return a + (operation.value || 0);
    case ARITHMETIC_OPERATION_TYPES.ADD:
      return a + b;
    case ARITHMETIC_OPERATION_TYPES.MULTIPLY:
      return a * b;
    case ARITHMETIC_OPERATION_TYPES.DIVIDE: {
      const high = Math.max(a, b);
      const low = Math.max(1, Math.min(a, b));
      return Math.max(1, Math.floor(high / low));
    }
    default:
      return null;
  }
}

export function estimateArithmeticOutput(config, producibleLevels = new Set([1])) {
  if (!isArithmeticConfig(config)) {
    return config?.output ?? null;
  }

  const levels = Array.from(producibleLevels)
    .filter((level) => typeof level === 'number' && level > 0)
    .sort((a, b) => b - a);
  const strongest = levels[0] || 1;
  const second = levels[1] || strongest;

  return calculateArithmeticOutput(config.arithmeticOperation, [strongest, second]);
}

// Get piece configs for a specific era
// Difficulty compounds: later eras require cross-era inputs and more complex recipes
// Era 1: Simple 1-2 input machines (L1→L2, L2→L3, L1+L2→L3)
// Era 2: Requires combining Era 1 output (L3) with chip output (L4) - 2-3 inputs
// Era 3+: Even more complex combinations across all previous eras
export function getPieceConfigsForEra(era) {
  const tiers = getTiersForEra(era);

  if (era === 1) {
    // Era 1: Simple single-input and dual-input machines
    return {
      fourBlock: [
        { inputs: [1], output: 2, notation: '1/2' },
        { inputs: [2], output: 3, notation: '2/3' },
      ],
      fiveBlock: [{ inputs: [1, 2], output: 3, notation: '1/2/3' }],
    };
  }

  // For Era 2+, get the previous era's output tier (what we need to combine with chip)
  const prevEraTiers = getTiersForEra(era - 1);
  const prevOutput = prevEraTiers.output; // L3 for Era 2, L6 for Era 3, etc.
  const chipTier = tiers.input; // L4 for Era 2, L7 for Era 3 (what the chip provides)
  const transcendTier = getTranscendTier(era); // L7 for Era 2, L10 for Era 3, etc.

  // Era 2+: Cross-era configs requiring previous era output + chip input
  const configs = {
    fourBlock: [
      // Combine previous era's output with chip tier → mid tier
      // E.g., Era 2: L3 + L4 → L5
      {
        inputs: [prevOutput, chipTier],
        output: tiers.mid,
        notation: `${prevOutput}+${chipTier}/${tiers.mid}`,
      },
      // Ratio recipe: double-feed the chip tier with the previous output to
      // create a compact high-pressure feeder puzzle.
      {
        inputs: [prevOutput, chipTier, chipTier],
        output: tiers.mid,
        notation: `${prevOutput}+${chipTier}+${chipTier}/${tiers.mid}`,
      },
      // Continue the ladder with a single-step refinement.
      // E.g., Era 2: L5 -> L6
      {
        inputs: [tiers.mid],
        output: tiers.output,
        notation: `${tiers.mid}/${tiers.output}`,
      },
      // Reach the next era's input tier, which is the current transcend target.
      // E.g., Era 2: L6 -> L7
      {
        inputs: [tiers.output],
        output: transcendTier,
        notation: `${tiers.output}/${transcendTier}`,
      },
      // Mid tier + chip tier → output tier
      // E.g., Era 2: L4 + L5 → L6
      {
        inputs: [chipTier, tiers.mid],
        output: tiers.output,
        notation: `${chipTier}+${tiers.mid}/${tiers.output}`,
      },
    ],
    fiveBlock: [
      // Three-input recipe: prev output + chip + mid → output
      // E.g., Era 2: L3 + L4 + L5 → L6 (requires full chain)
      {
        inputs: [prevOutput, chipTier, tiers.mid],
        output: tiers.output,
        notation: `${prevOutput}+${chipTier}+${tiers.mid}/${tiers.output}`,
      },
      {
        inputs: [chipTier, tiers.mid, tiers.mid],
        output: transcendTier,
        notation: `${chipTier}+${tiers.mid}+${tiers.mid}/${transcendTier}`,
      },
      // Reward a fuller chain with direct transcend-tier output.
      // E.g., Era 2: L3 + L4 + L6 -> L7
      {
        inputs: [prevOutput, chipTier, tiers.output],
        output: transcendTier,
        notation: `${prevOutput}+${chipTier}+${tiers.output}/${transcendTier}`,
      },
    ],
  };

  // For Era 3+, add even more complex recipes that span multiple eras
  if (era >= 3) {
    const prevPrevTiers = getTiersForEra(era - 2);
    // Add a recipe requiring output from 2 eras back
    // E.g., Era 3: L3 + L6 + L7 → L8
    configs.fiveBlock.push({
      inputs: [prevPrevTiers.output, prevOutput, chipTier],
      output: tiers.mid,
      notation: `${prevPrevTiers.output}+${prevOutput}+${chipTier}/${tiers.mid}`,
    });
  }

  return configs;
}

// Valid piece configurations for 4-block pieces (single input)
export const FOUR_BLOCK_CONFIGS = [
  { inputs: [1], output: 2, notation: '1/2' },
  { inputs: [1, 1], output: 2, notation: '1+1/2' },
  { inputs: [2], output: 3, notation: '2/3' },
  { inputs: [3], output: 4, notation: '3/4' },
];

// Valid piece configurations for 5-block pieces (dual input)
// Rule: sum of inputs equals output level
export const FIVE_BLOCK_CONFIGS = [
  { inputs: [1, 2], output: 3, notation: '1/2/3' },
  { inputs: [1, 3], output: 4, notation: '1/3/4' },
  { inputs: [2, 2], output: 4, notation: '2/2/4' },
  { inputs: [1, 1, 2], output: 4, notation: '1+1+2/4' },
];

// Count blocks in a shape to determine if it's 4-block or 5-block
export function countBlocks(shape) {
  if (!shape || !Array.isArray(shape)) return 0;
  let count = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell === 1) count++;
    }
  }
  return count;
}

// Get valid configs based on block count
// 4-block pieces get both single and dual input configs for more variety
export function getConfigsForBlockCount(count) {
  if (count === 4) return ARITHMETIC_PIECE_CONFIGS;
  if (count >= 5) return ARITHMETIC_PIECE_CONFIGS;
  return ARITHMETIC_PIECE_CONFIGS; // Default fallback for smaller pieces
}
