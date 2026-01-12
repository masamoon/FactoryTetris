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
} from '../config/resourceLevels';
import { getProducibleLevels, isPieceUsable } from './FactoryAnalyzer';

/**
 * Generates a set of piece configurations for the player to choose from
 * @param {object} scene - The game scene
 * @param {number} count - Number of pieces to generate (default 3)
 * @returns {Array<object>} Array of piece configurations
 */
export function generatePieceOptions(scene, count = 3) {
  const producibleLevels = getProducibleLevels(scene);
  const options = [];

  // Get all available configurations
  const allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];

  // Filter to usable configurations
  const usableConfigs = allConfigs.filter((config) => isPieceUsable(config, producibleLevels));

  // Ensure at least one usable piece
  let guaranteedUsable = false;

  for (let i = 0; i < count; i++) {
    let selectedConfig;

    // For the first piece, guarantee it's usable if possible
    if (i === 0 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels);
      guaranteedUsable = true;
    } else if (!guaranteedUsable && i === count - 1 && usableConfigs.length > 0) {
      // Last chance to ensure at least one usable piece
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels);
      guaranteedUsable = true;
    } else {
      // Random selection from all configs (biased toward usable)
      const pool = Math.random() < 0.7 && usableConfigs.length > 0 ? usableConfigs : allConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels);
    }

    options.push({
      ...selectedConfig,
      isUsable: isPieceUsable(selectedConfig, producibleLevels),
    });
  }

  return options;
}

/**
 * Selects a configuration with weighted probability
 * Prefers configurations that advance the player toward higher levels
 * @param {Array<object>} configs - Available configurations
 * @param {Set<number>} producibleLevels - Currently producible levels
 * @returns {object} Selected configuration
 */
function selectWeightedConfig(configs, producibleLevels) {
  if (configs.length === 0) {
    // Fallback to basic 1/2 config
    return FOUR_BLOCK_CONFIGS[0];
  }

  // Calculate weights based on strategic value
  const weights = configs.map((config) => {
    let weight = 1;

    // Higher output levels are slightly more valuable
    weight += config.output * 0.5;

    // Configs that produce new levels are more valuable
    if (!producibleLevels.has(config.output)) {
      weight += 2;
    }

    // Boost L3-outputting pieces (like 1/2/3) to ensure they appear more often
    // This helps progression since L3 is a key milestone
    if (config.output === 3) {
      weight *= 1.5;
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
 * @returns {object} Configuration with inputLevels, outputLevel, notation
 */
export function assignLevelsToShape(shape, scene) {
  // Count blocks in shape
  const blockCount = countBlocks(shape);

  // Get appropriate configs
  const configs = getConfigsForBlockCount(blockCount);

  if (configs.length === 0) {
    // Fallback for unknown shapes
    return {
      inputLevels: [1],
      outputLevel: 2,
      notation: '1/2',
    };
  }

  // Get producible levels for smart selection
  const producibleLevels = getProducibleLevels(scene);

  // Filter to usable configs
  const usableConfigs = configs.filter((config) => isPieceUsable(config, producibleLevels));

  // Prefer usable configs, but allow any if none are usable
  const pool = usableConfigs.length > 0 ? usableConfigs : configs;

  // Select a config
  const config = selectWeightedConfig(pool, producibleLevels);

  return {
    inputLevels: [...config.inputs],
    outputLevel: config.output,
    notation: config.notation,
    isUsable: isPieceUsable(config, producibleLevels),
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
  const allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];

  return allConfigs.some((config) => isPieceUsable(config, producibleLevels));
}

/**
 * Gets statistics about piece usability for the current factory state
 * @param {object} scene - The game scene
 * @returns {object} Usability statistics
 */
export function getPieceUsabilityStats(scene) {
  const producibleLevels = getProducibleLevels(scene);

  const fourBlockUsable = FOUR_BLOCK_CONFIGS.filter((c) => isPieceUsable(c, producibleLevels));
  const fiveBlockUsable = FIVE_BLOCK_CONFIGS.filter((c) => isPieceUsable(c, producibleLevels));

  return {
    producibleLevels: Array.from(producibleLevels),
    fourBlockTotal: FOUR_BLOCK_CONFIGS.length,
    fourBlockUsable: fourBlockUsable.length,
    fiveBlockTotal: FIVE_BLOCK_CONFIGS.length,
    fiveBlockUsable: fiveBlockUsable.length,
    totalUsable: fourBlockUsable.length + fiveBlockUsable.length,
    hasUsablePieces: fourBlockUsable.length + fiveBlockUsable.length > 0,
  };
}
