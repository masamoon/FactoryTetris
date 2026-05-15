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
// 4-block pieces get both single and dual input configs for more variety
export function getConfigsForBlockCount(count) {
  if (count === 4) return [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];
  if (count >= 5) return FIVE_BLOCK_CONFIGS;
  return FOUR_BLOCK_CONFIGS; // Default fallback for smaller pieces
}
