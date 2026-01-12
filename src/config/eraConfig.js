/**
 * Era Configuration
 * Defines era-specific constants for the Transcendence system
 */

// Grid size formula: 10 + 4*(era-1)
export function getGridSizeForEra(era) {
  return 10 + 4 * (era - 1);
}

// Chip configuration
export const CHIP_CONFIG = {
  size: 3, // 3x3 chip
  emissionInterval: 3000, // ms between emissions
};

// Resource tier formulas
// Era N produces tiers: 3N-2, 3N-1, 3N
export function getTiersForEra(era) {
  return {
    input: 3 * era - 2, // L1, L4, L7, L10...
    mid: 3 * era - 1, // L2, L5, L8, L11...
    output: 3 * era, // L3, L6, L9, L12...
  };
}

// Get all tiers a chip from a specific era emits
// Chips emit their era's input tier (the first tier of that era)
export function getChipOutputTier(chipEra) {
  return getTiersForEra(chipEra).input;
}

// Get all chip output tiers for current era
// Returns array of tiers from all previous era chips
export function getAllChipTiersForEra(currentEra) {
  const tiers = [];
  for (let era = 1; era < currentEra; era++) {
    tiers.push(getChipOutputTier(era + 1)); // Chip from era N emits era N+1's input tier
  }
  return tiers;
}

// Transcendence thresholds
export const TRANSCEND_THRESHOLDS = {
  // Level required to transcend (every 5 levels)
  // TESTING: Lowered from era*5 to era*2 for faster testing
  getLevelThreshold: (era) => era * 2,

  // Number of highest-tier resources that must be delivered
  // TESTING: Lowered thresholds for faster testing
  getDeliveryThreshold: (era) => {
    if (era === 1) return 5; // Was 50 L3 resources
    if (era === 2) return 10; // Was 100 L6 resources
    if (era === 3) return 15; // Was 200 L9 resources
    // Scale for higher eras
    return Math.floor(5 * Math.pow(1.5, era - 1));
  },
};

// Point scaling for resource tiers
// Higher tiers = exponentially more points
export function getPointsForTier(tier) {
  const basePoints = 10;
  const scaleFactor = 1.5;
  return Math.floor(basePoints * Math.pow(scaleFactor, tier - 1));
}

// Color palette for resource tiers
// Cycles through colors with increasing brightness
const TIER_COLORS = [
  0x888888, // L1: Gray
  0x22cc22, // L2: Green
  0x2288ff, // L3: Blue
  0xffcc00, // L4: Gold
  0xff6600, // L5: Orange
  0xff00ff, // L6: Magenta
  0x00ffff, // L7: Cyan
  0xff4444, // L8: Red
  0xaaffaa, // L9: Light Green
  0xaaaaff, // L10: Light Blue
  0xffaaff, // L11: Light Magenta
  0xffffaa, // L12: Light Yellow
];

export function getColorForTier(tier) {
  // Cycle through colors, with brightness increase for higher tiers
  const colorIndex = (tier - 1) % TIER_COLORS.length;
  return TIER_COLORS[colorIndex];
}

// Tier names
const TIER_NAMES = [
  'Raw',
  'Refined',
  'Processed',
  'Premium',
  'Elite',
  'Superior',
  'Ultra',
  'Mega',
  'Giga',
  'Tera',
  'Peta',
  'Exa',
];

export function getNameForTier(tier) {
  if (tier <= TIER_NAMES.length) {
    return TIER_NAMES[tier - 1];
  }
  return `Tier ${tier}`;
}
