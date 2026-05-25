/**
 * Resource tier helpers.
 * Defines point, color, and name scaling for open-ended resource levels.
 */

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
