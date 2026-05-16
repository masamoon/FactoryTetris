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
  emissionInterval: 2500, // ms between emissions
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

// Get the tier required to transcend from a given era
// This is the same tier the chip will output - creating continuity
// Era 1 requires L4, Era 2 requires L7, etc.
export function getTranscendTier(era) {
  return getChipOutputTier(era + 1);
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

// === Contract tuning (Era == Contract number) ===
// Contract tiers jump by three levels each era, so Contract 2 is much harder
// than a simple "+25% units" curve implies. Keep the first contract readable,
// then scale quantity gently while the tier ladder supplies the real pressure.
export const CONTRACT_N_BASE = 4;
export const CONTRACT_N_LATER_BASE = 3;
export const CONTRACT_N_GROWTH = 1.18;

// Time budget (seconds): includes rebuild/routing time after transcendence.
// Later contracts still need more throughput, but Contract 2 should be a
// ramp into the chip loop instead of a wall.
export const CONTRACT_T_BASE = 70;
export const CONTRACT_T_GROWTH = 1.08;
export const CONTRACT_REBUILD_BASE = 42;
export const CONTRACT_REBUILD_GROWTH = 18;

// Transcendence thresholds
export const TRANSCEND_THRESHOLDS = {
  // Units of qualifying resource a Contract demands. era == contract number.
  getDeliveryThreshold: (era) => {
    if (era <= 1) return CONTRACT_N_BASE;
    return Math.max(3, Math.round(CONTRACT_N_LATER_BASE * Math.pow(CONTRACT_N_GROWTH, era - 2)));
  },
};

// Per-Contract time budget in seconds.
export function getContractTimeBudget(era) {
  const throughputBudget = CONTRACT_T_BASE * Math.pow(CONTRACT_T_GROWTH, era - 1);
  const rebuildBudget = era <= 1 ? 0 : CONTRACT_REBUILD_BASE + (era - 2) * CONTRACT_REBUILD_GROWTH;
  return Math.round(throughputBudget + rebuildBudget);
}

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
