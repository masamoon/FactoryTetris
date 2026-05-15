/**
 * PieceGenerator - Smart piece selection for the dynamic resource level system
 *
 * Ensures at least one offered piece is always usable to prevent soft-locks.
 * Uses the factory analyzer to determine which levels are producible.
 */

import {
  FOUR_BLOCK_CONFIGS,
  FIVE_BLOCK_CONFIGS,
  getConfigsForBlockCount,
  getPieceConfigsForEra,
} from '../config/resourceLevels';
import { getProducibleLevels, isPieceUsable } from './FactoryAnalyzer';
import { rollTrait } from '../config/traits';

/**
 * Generates a set of piece configurations for the player to choose from
 * @param {object} scene - The game scene
 * @param {number} count - Number of pieces to generate (default 3)
 * @returns {Array<object>} Array of piece configurations
 */
export function generatePieceOptions(scene, count = 3) {
  const producibleLevels = getProducibleLevels(scene);
  const options = [];

  // Get the current era from scene (default to Era 1)
  const currentEra = scene?.currentEra || 1;

  // Get all available configurations - include era-specific configs
  let allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];

  // Add era-specific configs if we're beyond Era 1
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    const eraFourBlock = eraConfigs.fourBlock || [];
    const eraFiveBlock = eraConfigs.fiveBlock || [];
    allConfigs = [...allConfigs, ...eraFourBlock, ...eraFiveBlock];
  }

  // Filter to usable configurations
  const usableConfigs = allConfigs.filter((config) => isPieceUsable(config, producibleLevels));

  // Filter higher tier configs for balance
  // Era 1: output > 2. Era 2+: Also output > 2 to include L3/L4/L5 in the "higher tier" pool
  // This prevents L6 dominance in Era 2 by diluting the pool with L3-L5
  const higherTierThreshold = 2;
  const higherTierConfigs = allConfigs.filter((config) => config.output > higherTierThreshold);
  const usableHigherTierConfigs = higherTierConfigs.filter((config) =>
    isPieceUsable(config, producibleLevels)
  );

  // Track guarantees
  let guaranteedUsable = false;
  let guaranteedHigherTier = false;

  for (let i = 0; i < count; i++) {
    let selectedConfig;

    // For the first piece, guarantee it's usable if possible
    if (i === 0 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra);
      guaranteedUsable = true;
      if (selectedConfig.output > higherTierThreshold) {
        guaranteedHigherTier = true;
      }
    } else if (!guaranteedHigherTier && higherTierConfigs.length > 0) {
      // Guarantee at least one higher tier piece for balance
      // Prefer usable higher tier, but include any higher tier for progression visibility
      const pool = usableHigherTierConfigs.length > 0 ? usableHigherTierConfigs : higherTierConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra);
      guaranteedHigherTier = true;
      if (isPieceUsable(selectedConfig, producibleLevels)) {
        guaranteedUsable = true;
      }
    } else if (!guaranteedUsable && i === count - 1 && usableConfigs.length > 0) {
      // Last chance to ensure at least one usable piece
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra);
      guaranteedUsable = true;
    } else {
      // Random selection from all configs (biased toward usable)
      const pool = Math.random() < 0.7 && usableConfigs.length > 0 ? usableConfigs : allConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra);
    }

    options.push({
      ...selectedConfig,
      isUsable: isPieceUsable(selectedConfig, producibleLevels),
      trait: selectedConfig.output >= 3 ? rollTrait() : null,
    });
  }

  // Draft-2 trait guarantee:
  // Once the player has placed their first L2 piece, ensure the very next
  // draft contains at least one usable trait piece (fires once per run).
  if (
    scene &&
    scene.hasIntroducedTrait === false &&
    scene.firstL2Placed === true &&
    !options.some((o) => o.isUsable && o.trait)
  ) {
    const usableL3Plus = allConfigs.filter(
      (c) => c.output >= 3 && isPieceUsable(c, producibleLevels)
    );
    if (usableL3Plus.length > 0) {
      const forced = selectWeightedConfig(usableL3Plus, producibleLevels, currentEra);
      options[0] = {
        ...forced,
        isUsable: true,
        trait: rollTrait(),
      };
      console.log('[traits] Forced trait piece into draft slot 0:', options[0]);
    }
  }

  // Once a usable trait option is in the hand (naturally or forced), mark
  // introduction done so the guarantee never re-fires this run.
  if (scene && options.some((o) => o.isUsable && o.trait)) {
    scene.hasIntroducedTrait = true;
  }

  return options;
}

/**
 * Selects a configuration with weighted probability
 * Prefers configurations that advance the player toward higher levels
 * @param {Array<object>} configs - Available configurations
 * @param {Set<number>} producibleLevels - Currently producible levels
 * @param {number} currentEra - The current game era (default 1)
 * @returns {object} Selected configuration
 */
function selectWeightedConfig(configs, producibleLevels, currentEra = 1) {
  if (configs.length === 0) {
    // Fallback to basic 1/2 config
    return FOUR_BLOCK_CONFIGS[0];
  }

  // FORMULAIC BALANCE (Pyramid Distribution)
  // We want a distribution where lower tiers are common and highest tiers are rare.
  // Formula: Weight = Base * RarityFactor ^ (EvaMax - Level)
  // We cap the distance at 1.3 to flatten the base (L1-L4) so they share similar commonality.
  // Factor 3.0 ensures L5 (dist 1) is more common than L6 (dist 0) despite L6 having more recipes.

  const eraMax = currentEra * 3;
  const rarityFactor = 3.0;

  // Calculate weights
  const weights = configs.map((config) => {
    // Calculate distance from the top tier
    const rawDist = eraMax - config.output;

    // Cap the distance at 1.3.
    // This effective "squashes" the weights of L4 and below so they don't dominate too hard.
    // They will be roughly 3^1.3 (~4.17) times more common than L6, rather than 3^2 (9x).
    const effectiveDist = Math.max(0, Math.min(rawDist, 1.3));

    // Weight formula: Base * Factor ^ Distance
    let weight = Math.pow(rarityFactor, effectiveDist);

    // Minor boosting for new levels to ensure they appear
    if (!producibleLevels.has(config.output)) {
      weight *= 1.2;
    }

    return weight;
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < configs.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return configs[i];
    }
  }

  return configs[configs.length - 1];
}

/**
 * Assigns a level configuration to a piece shape
 * @param {Array<Array<number>>} shape - The piece shape (2D array)
 * @param {object} scene - The game scene for context
 * @param {object} options - Optional parameters
 * @param {boolean} options.forceHigherTier - If true, only select configs with output > 2
 * @returns {object} Configuration with inputLevels, outputLevel, notation
 */
export function assignLevelsToShape(shape, scene, options = {}) {
  const { forceHigherTier = false } = options;

  // Count blocks in shape
  const blockCount = countBlocks(shape);

  // Get the current era from scene (default to Era 1)
  const currentEra = scene?.currentEra || 1;

  // Build configs array: include base Era 1 configs plus current era configs
  let configs = getConfigsForBlockCount(blockCount);

  // Add era-specific configs if we're beyond Era 1
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    const eraFourBlock = eraConfigs.fourBlock || [];
    const eraFiveBlock = eraConfigs.fiveBlock || [];

    // Add era-specific configs based on block count
    if (blockCount === 4) {
      configs = [...configs, ...eraFourBlock, ...eraFiveBlock];
    } else if (blockCount >= 5) {
      configs = [...configs, ...eraFiveBlock];
    } else {
      configs = [...configs, ...eraFourBlock];
    }
  }

  if (configs.length === 0) {
    // Fallback for unknown shapes
    return {
      inputLevels: [1],
      outputLevel: 2,
      notation: '1/2',
    };
  }

  // If forcing higher tier, filter to configs with output > 2
  // For higher eras, we now keep the threshold at > 2 to allow mid-tier pieces (L3/L4/L5)
  // to count as "higher tier" relative to basic L2 production.
  const higherTierThreshold = 2;
  if (forceHigherTier) {
    const higherTierConfigs = configs.filter((config) => config.output > higherTierThreshold);
    if (higherTierConfigs.length > 0) {
      configs = higherTierConfigs;
    }
  }

  // Get producible levels for smart selection
  const producibleLevels = getProducibleLevels(scene);

  // Filter to usable configs
  const usableConfigs = configs.filter((config) => isPieceUsable(config, producibleLevels));

  // Prefer usable configs, but allow any if none are usable
  const pool = usableConfigs.length > 0 ? usableConfigs : configs;

  // Select a config
  const config = selectWeightedConfig(pool, producibleLevels, currentEra);

  return {
    inputLevels: [...config.inputs],
    outputLevel: config.output,
    notation: config.notation,
    isUsable: isPieceUsable(config, producibleLevels),
    trait: config.output >= 3 ? rollTrait() : null,
  };
}

/**
 * Counts the number of blocks in a shape
 * @param {Array<Array<number>>} shape - 2D shape array
 * @returns {number} Block count
 */
function countBlocks(shape) {
  if (!shape || !Array.isArray(shape)) {
    return 0;
  }

  let count = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell === 1) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Checks if any usable pieces exist for the current factory state
 * Used to determine if game is in a soft-lock scenario
 * @param {object} scene - The game scene
 * @returns {boolean} True if at least one piece type is usable
 */
export function hasUsablePieces(scene) {
  const producibleLevels = getProducibleLevels(scene);
  const currentEra = scene?.currentEra || 1;

  // Get all configs including era-specific ones
  let allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    allConfigs = [...allConfigs, ...(eraConfigs.fourBlock || []), ...(eraConfigs.fiveBlock || [])];
  }

  return allConfigs.some((config) => isPieceUsable(config, producibleLevels));
}

/**
 * Gets statistics about piece usability for the current factory state
 * @param {object} scene - The game scene
 * @returns {object} Usability statistics
 */
export function getPieceUsabilityStats(scene) {
  const producibleLevels = getProducibleLevels(scene);
  const currentEra = scene?.currentEra || 1;

  // Get all configs including era-specific ones
  let allFourBlock = [...FOUR_BLOCK_CONFIGS];
  let allFiveBlock = [...FIVE_BLOCK_CONFIGS];
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    allFourBlock = [...allFourBlock, ...(eraConfigs.fourBlock || [])];
    allFiveBlock = [...allFiveBlock, ...(eraConfigs.fiveBlock || [])];
  }

  const fourBlockUsable = allFourBlock.filter((c) => isPieceUsable(c, producibleLevels));
  const fiveBlockUsable = allFiveBlock.filter((c) => isPieceUsable(c, producibleLevels));

  return {
    producibleLevels: Array.from(producibleLevels),
    fourBlockTotal: allFourBlock.length,
    fourBlockUsable: fourBlockUsable.length,
    fiveBlockTotal: allFiveBlock.length,
    fiveBlockUsable: fiveBlockUsable.length,
    totalUsable: fourBlockUsable.length + fiveBlockUsable.length,
    hasUsablePieces: fourBlockUsable.length + fiveBlockUsable.length > 0,
  };
}
