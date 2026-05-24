/**
 * Resource Level System Configuration
 * Defines the tiered resource levels and valid piece configurations
 * Extended with dynamic tier generation
 */

import { getPointsForTier, getColorForTier, getNameForTier } from './eraConfig.js';

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
      return 'add';
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
