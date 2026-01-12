/**
 * Resource Level System Configuration
 * Defines the tiered resource levels and valid piece configurations
 * Extended for Era/Transcendence system with dynamic tier generation
 */

import { getPointsForTier, getColorForTier, getNameForTier, getTiersForEra } from './eraConfig.js';

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

// Get piece configs for a specific era
// Era 1: L1→L2, L2→L3, Era 2: L4→L5, L5→L6, etc.
export function getPieceConfigsForEra(era) {
  const tiers = getTiersForEra(era);
  return {
    fourBlock: [
      { inputs: [tiers.input], output: tiers.mid, notation: `${tiers.input}/${tiers.mid}` },
      { inputs: [tiers.mid], output: tiers.output, notation: `${tiers.mid}/${tiers.output}` },
    ],
    fiveBlock: [
      {
        inputs: [tiers.input, tiers.mid],
        output: tiers.output,
        notation: `${tiers.input}/${tiers.mid}/${tiers.output}`,
      },
    ],
  };
}

// Valid piece configurations for 4-block pieces (single input)
export const FOUR_BLOCK_CONFIGS = [
  { inputs: [1], output: 2, notation: '1/2' },
  { inputs: [2], output: 3, notation: '2/3' },
  { inputs: [3], output: 4, notation: '3/4' },
];

// Valid piece configurations for 5-block pieces (dual input)
// Rule: sum of inputs equals output level
export const FIVE_BLOCK_CONFIGS = [
  { inputs: [1, 2], output: 3, notation: '1/2/3' },
  { inputs: [1, 3], output: 4, notation: '1/3/4' },
  { inputs: [2, 2], output: 4, notation: '2/2/4' },
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
export function getConfigsForBlockCount(count) {
  if (count === 4) return FOUR_BLOCK_CONFIGS;
  if (count >= 5) return FIVE_BLOCK_CONFIGS;
  return FOUR_BLOCK_CONFIGS; // Default fallback
}
