/**
 * Resource Level System Configuration
 * Defines the tiered resource levels and valid piece configurations
 */

// Resource level definitions with colors and point values
export const RESOURCE_LEVELS = {
  1: { name: 'Raw', color: 0x888888, points: 10 },
  2: { name: 'Refined', color: 0x22cc22, points: 25 },
  3: { name: 'Processed', color: 0x2288ff, points: 50 },
  4: { name: 'Premium', color: 0xffcc00, points: 100 },
};

// Helper to get level color
export function getLevelColor(level) {
  return RESOURCE_LEVELS[level]?.color || 0x888888;
}

// Helper to get level name
export function getLevelName(level) {
  return RESOURCE_LEVELS[level]?.name || 'Unknown';
}

// Helper to get level points
export function getLevelPoints(level) {
  return RESOURCE_LEVELS[level]?.points || 10;
}

// Valid piece configurations for 4-block pieces (single input)
export const FOUR_BLOCK_CONFIGS = [
  { inputs: [1], output: 2, notation: '1/2' },
  { inputs: [2], output: 3, notation: '2/3' },
  { inputs: [3], output: 4, notation: '3/4' },
];

// Valid piece configurations for 5-block pieces (dual input)
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
