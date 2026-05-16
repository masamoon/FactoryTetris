import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Purity System Utilities
 * Helper functions for the arcade-style purity and chain system
 */

/**
 * Get the base points for a given purity level
 * @param {number} purity - The purity level (1+)
 * @returns {number} Base points for that purity
 */
export function getPurityPoints(purity) {
  const config = GAME_CONFIG.purityConfig;
  const basePoints = config.basePoints;

  if (purity <= basePoints.length) {
    return basePoints[purity - 1];
  }
  // For purity 6+: 250 * 2^(purity - 5)
  return basePoints[4] * Math.pow(2, purity - 5);
}

/**
 * Get the color for a given purity level
 * @param {number} purity - The purity level (1+)
 * @param {number} time - Optional time for rainbow shimmer calculation
 * @returns {number} Hex color value
 */
export function getPurityColor(purity, time = 0) {
  const config = GAME_CONFIG.purityConfig;
  const colors = config.colors;

  if (purity <= colors.length) {
    return colors[purity - 1];
  }

  // Purity 6+: Rainbow shimmer (cycle through hue based on time)
  // Convert HSL to RGB for rainbow effect
  const hue = (time / 1000) % 1; // Cycle every second
  return hslToHex(hue, 1, 0.7);
}

/**
 * Get the scale multiplier for a given purity level
 * @param {number} purity - The purity level (1+)
 * @returns {number} Scale multiplier
 */
export function getPurityScale(purity) {
  const config = GAME_CONFIG.purityConfig;
  return config.baseScale + (purity - 1) * config.scaleIncrement;
}

/**
 * Check if a purity level should have a glow effect
 * @param {number} purity - The purity level
 * @returns {boolean} Whether to show glow
 */
export function shouldShowGlow(purity) {
  return purity >= GAME_CONFIG.purityConfig.glowStart;
}

/**
 * Check if a purity level should have a trail effect
 * @param {number} purity - The purity level
 * @returns {boolean} Whether to show trail
 */
export function shouldShowTrail(purity) {
  return purity >= GAME_CONFIG.purityConfig.trailStart;
}

/**
 * Get the glow intensity for a purity level
 * @param {number} purity - The purity level
 * @returns {number} Glow alpha (0-1)
 */
export function getGlowIntensity(purity) {
  if (!shouldShowGlow(purity)) return 0;
  const glowStart = GAME_CONFIG.purityConfig.glowStart;
  // 0.2 per level above glowStart, max 0.8
  return Math.min(0.8, (purity - glowStart + 1) * 0.2);
}

/**
 * Get the chain multiplier for a given chain count
 * @param {number} chainCount - The current chain count
 * @returns {number} Score multiplier
 */
export function getChainMultiplier(chainCount) {
  const config = GAME_CONFIG.chainConfig;
  const multipliers = config.multipliers;

  if (chainCount <= multipliers.length) {
    return multipliers[chainCount - 1];
  }
  // For chain 6+: 3.0 + (chain - 5) * 0.5
  return config.baseMultiplierAfter5 + (chainCount - 5) * config.incrementAfter5;
}

/**
 * Calculate the final score for a delivered resource
 * @param {number} purity - Resource purity level
 * @param {number} chainCount - Chain count
 * @param {number} streakBonus - Optional streak bonus multiplier (default 1)
 * @returns {number} Final score
 */
export function calculateDeliveryScore(purity, chainCount, streakBonus = 1) {
  const basePoints = getPurityPoints(purity);
  const chainMultiplier = getChainMultiplier(chainCount);
  return Math.floor(basePoints * chainMultiplier * streakBonus);
}

/**
 * Create a new resource item with purity and chain tracking
 * @param {number} purity - Initial purity level (default 1)
 * @returns {object} Resource item data
 */
export function createPurityResource(purity = 1) {
  return {
    type: 'purity-resource',
    purity: purity,
    chainCount: 0,
    visitedMachines: new Set(),
    machineUids: [],
    routeTags: [],
    traitTags: [], // ordered list of trait ids picked up along the chain
    amount: 1,
  };
}

/**
 * Process a resource through a machine, incrementing purity and chain
 * @param {object} resource - The resource item
 * @param {string} machineId - The ID of the processing machine
 * @param {string|null} machineTrait - Optional trait id contributed by this machine
 * @returns {object} Updated resource (new object)
 */
export function processResource(resource, machineId, machineTrait = null) {
  const maxChain = GAME_CONFIG.purityConfig.maxChain;

  const newResource = {
    ...resource,
    purity: resource.purity + 1,
    visitedMachines: new Set(resource.visitedMachines),
    machineUids: Array.isArray(resource.machineUids) ? [...resource.machineUids] : [],
    routeTags: Array.isArray(resource.routeTags) ? [...resource.routeTags] : [],
    traitTags: Array.isArray(resource.traitTags) ? [...resource.traitTags] : [],
  };

  if (!newResource.visitedMachines.has(machineId)) {
    newResource.chainCount = Math.min(maxChain, newResource.chainCount + 1);
    newResource.visitedMachines.add(machineId);
  }

  if (machineTrait) {
    newResource.traitTags.push(machineTrait);
  }

  return newResource;
}

/**
 * Get the purity name for display
 * @param {number} purity - The purity level
 * @returns {string} Human-readable name
 */
export function getPurityName(purity) {
  const names = ['Raw Ore', 'Refined', 'Purified', 'Crystal', 'Prismatic'];
  if (purity <= names.length) {
    return names[purity - 1];
  }
  return `Hyperpure Lv.${purity - 5}`;
}

/**
 * Convert HSL to Hex color
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {number} Hex color
 */
function hslToHex(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return parseInt(`${toHex(r)}${toHex(g)}${toHex(b)}`, 16);
}
