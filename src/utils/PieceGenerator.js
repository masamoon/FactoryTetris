/**
 * PieceGenerator - Smart piece selection for the dynamic resource level system
 *
 * Ensures at least one offered piece is always usable to prevent soft-locks.
 * Uses the factory analyzer to determine which levels are producible.
 */

import {
  ARITHMETIC_PIECE_CONFIGS,
  ARITHMETIC_OPERATION_TYPES,
  estimateArithmeticOutput,
  getConfigsForBlockCount,
  getArithmeticOperationTags,
  isArithmeticConfig,
} from '../config/resourceLevels';
import { getProducibleLevels, isPieceUsable } from './FactoryAnalyzer';
import { getTranscendTier } from '../config/eraConfig';
import { rollBuildAroundTrait, rollTrait } from '../config/traits';
import { GAME_CONFIG } from '../config/gameConfig';

// How much more likely a draft piece that outputs the era's transcend tier
// (the tier you must deliver to advance) is, relative to the pyramid baseline.
// The transcend tier is the run goal, so it must NOT be the rarest draw.
// Tunable: 1 = no boost (rarest), ~4 = on par with low/feeder tiers,
// 6 = clearly the most common era-relevant piece.
const TRANSCEND_TIER_WEIGHT_BOOST = 4.0;

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

  // Get all available arithmetic configurations.
  const allConfigs = getDraftConfigPool(scene);

  // Filter to usable configurations
  const usableConfigs = allConfigs.filter((config) => isPieceUsable(config, producibleLevels));

  // Filter higher tier configs for balance
  // Era 1: output > 2. Era 2+: Also output > 2 to include L3/L4/L5 in the "higher tier" pool
  // This prevents L6 dominance in Era 2 by diluting the pool with L3-L5
  const higherTierThreshold = 2;
  const higherTierConfigs = allConfigs.filter(
    (config) => getDraftOutputLevel(config, producibleLevels) > higherTierThreshold
  );
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
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra, scene);
      guaranteedUsable = true;
      if (getDraftOutputLevel(selectedConfig, producibleLevels) > higherTierThreshold) {
        guaranteedHigherTier = true;
      }
    } else if (!guaranteedHigherTier && higherTierConfigs.length > 0) {
      // Guarantee at least one higher tier piece for balance
      // Prefer usable higher tier, but include any higher tier for progression visibility
      const pool = usableHigherTierConfigs.length > 0 ? usableHigherTierConfigs : higherTierConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra, scene);
      guaranteedHigherTier = true;
      if (isPieceUsable(selectedConfig, producibleLevels)) {
        guaranteedUsable = true;
      }
    } else if (!guaranteedUsable && i === count - 1 && usableConfigs.length > 0) {
      // Last chance to ensure at least one usable piece
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra, scene);
      guaranteedUsable = true;
    } else {
      // Random selection from all configs (biased toward usable)
      const pool = Math.random() < 0.7 && usableConfigs.length > 0 ? usableConfigs : allConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra, scene);
    }

    options.push({
      ...selectedConfig,
      isUsable: isPieceUsable(selectedConfig, producibleLevels),
      trait: getDraftOutputLevel(selectedConfig, producibleLevels) >= 3 ? rollTrait() : null,
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
      (c) => getDraftOutputLevel(c, producibleLevels) >= 3 && isPieceUsable(c, producibleLevels)
    );
    if (usableL3Plus.length > 0) {
      const forced = selectWeightedConfig(usableL3Plus, producibleLevels, currentEra, scene);
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
 * @param {object} scene - The game scene, used for active contract pressure
 * @returns {object} Selected configuration
 */
function selectWeightedConfig(configs, producibleLevels, currentEra = 1, scene = null) {
  if (configs.length === 0) {
    // Fallback to the simplest arithmetic config
    return ARITHMETIC_PIECE_CONFIGS[0];
  }

  // FORMULAIC BALANCE (Pyramid Distribution)
  // We want a distribution where lower tiers are common and the apex is rarer.
  // Formula: Weight = RarityFactor ^ (eraMax - Level), distance capped at 1.3.
  //
  // The apex is the era's TRANSCEND tier (the tier you must deliver to advance),
  // not the era's output tier. Era N transcends on tier 3N+1, but its own
  // recipes top out at 3N — anchoring the pyramid at 3N (the old `currentEra*3`)
  // pushed the goal tier one step ABOVE the apex, flooring it to the rarest
  // weight and starving every era's transcend supply (the Era-2 "L7 cliff").
  const eraMax = getTranscendTier(currentEra);
  const rarityFactor = 3.0;

  // Calculate weights
  const contractOperationTags = getActiveContractOperationTags(scene);
  const weights = configs.map((config) => {
    const outputLevel = getDraftOutputLevel(config, producibleLevels);
    // Calculate distance from the apex (transcend) tier
    const rawDist = eraMax - outputLevel;

    // Cap the distance at 1.3 so the broad base of low tiers shares similar
    // commonality (~3^1.3 ≈ 4.17x the apex baseline) instead of exploding.
    const effectiveDist = Math.max(0, Math.min(rawDist, 1.3));

    // Weight formula: Factor ^ Distance
    let weight = Math.pow(rarityFactor, effectiveDist);

    // The transcend tier is the run goal — it must not be the rarest draw.
    // Boost it so it appears often enough to actually farm the threshold.
    if (outputLevel === eraMax) {
      weight *= TRANSCEND_TIER_WEIGHT_BOOST;
    }

    // Minor boosting for new levels to ensure they appear
    if (!producibleLevels.has(outputLevel)) {
      weight *= 1.2;
    }

    if (contractOperationTags.size > 0 && isArithmeticConfig(config)) {
      const operationTags = getArithmeticOperationTags(config.arithmeticOperation);
      if (operationTags.some((tag) => contractOperationTags.has(tag))) {
        weight *= 2.4;
      }
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
  const {
    forceHigherTier = false,
    forceTrait = false,
    suppressTrait = false,
    forcedArithmeticOperation = null,
  } = options;

  // Count blocks in shape
  const blockCount = countBlocks(shape);

  // Get the current era from scene (default to Era 1)
  const currentEra = scene?.currentEra || 1;

  // Build configs array. Recipes are operation-driven now; eras still matter
  // through scoring/objectives, not through a deterministic recipe ladder.
  let configs = getDraftConfigPool(scene, getConfigsForBlockCount(blockCount));

  if (forcedArithmeticOperation) {
    const forcedConfigs = configs.filter((config) =>
      doesArithmeticOperationMatch(config.arithmeticOperation, forcedArithmeticOperation)
    );
    if (forcedConfigs.length > 0) {
      configs = forcedConfigs;
    }
  }

  // Get producible levels for smart selection
  const producibleLevels = getProducibleLevels(scene);

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
    const higherTierConfigs = configs.filter(
      (config) => getDraftOutputLevel(config, producibleLevels) > higherTierThreshold
    );
    if (higherTierConfigs.length > 0) {
      configs = higherTierConfigs;
    }
  }

  // Filter to usable configs
  const usableConfigs = configs.filter((config) => isPieceUsable(config, producibleLevels));

  // Prefer usable configs, but allow any if none are usable
  const pool = usableConfigs.length > 0 ? usableConfigs : configs;

  // Select a config
  const config = selectWeightedConfig(pool, producibleLevels, currentEra, scene) || {
    inputs: [1],
    output: 2,
    notation: '1/2',
  };
  const inputLevels = Array.isArray(config?.inputs)
    ? config.inputs
    : Array.isArray(config?.inputLevels)
      ? config.inputLevels
      : [1];
  const outputLevel = config?.output || config?.outputLevel || Math.max(...inputLevels, 1) + 1;
  const previewOutputLevel = getDraftOutputLevel(config, producibleLevels) || outputLevel;

  const result = {
    inputLevels: isArithmeticConfig(config) ? [] : [...inputLevels],
    outputLevel: isArithmeticConfig(config) ? null : outputLevel,
    previewOutputLevel,
    notation: config?.notation || `${inputLevels.join('+')}/${outputLevel}`,
    isUsable: isPieceUsable(config, producibleLevels),
    trait:
      !suppressTrait && previewOutputLevel >= 3
        ? forceTrait
          ? rollBuildAroundTrait()
          : rollTrait()
        : null,
  };

  if (isArithmeticConfig(config)) {
    result.arithmeticOperation = { ...config.arithmeticOperation };
    result.arithmeticInputCount = config.inputCount;
  }

  return result;
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
  const allConfigs = [...ARITHMETIC_PIECE_CONFIGS];

  return allConfigs.some((config) => isPieceUsable(config, producibleLevels));
}

/**
 * Gets statistics about piece usability for the current factory state
 * @param {object} scene - The game scene
 * @returns {object} Usability statistics
 */
export function getPieceUsabilityStats(scene) {
  const producibleLevels = getProducibleLevels(scene);
  const allFourBlock = getDraftConfigPool(scene);
  const allFiveBlock = getDraftConfigPool(scene);

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

function getDraftOutputLevel(config, producibleLevels) {
  if (isArithmeticConfig(config)) {
    return estimateArithmeticOutput(config, producibleLevels) || 1;
  }
  return config?.output || 1;
}

function getDraftConfigPool(scene, baseConfigs = ARITHMETIC_PIECE_CONFIGS) {
  const round = scene?.currentRound || 1;
  const starterRounds = GAME_CONFIG.starterDraftRounds || 1;

  if (round <= starterRounds) {
    return baseConfigs.filter(
      (config) =>
        config.arithmeticOperation?.type === ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT &&
        [1, 2].includes(config.arithmeticOperation?.value)
    );
  }

  return [...baseConfigs];
}

function doesArithmeticOperationMatch(operation, forcedOperation) {
  if (!operation || !forcedOperation) return false;
  if (operation.type !== forcedOperation.type) return false;
  if (operation.type === ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT) {
    return operation.value === forcedOperation.value;
  }
  return true;
}

function getActiveContractOperationTags(scene) {
  const tags = new Set();
  if (!scene || scene.runState !== 'ROUND_ACTIVE' || !scene.contract) {
    return tags;
  }

  for (const demand of scene.contract.demands || []) {
    if (demand.delivered >= demand.quantity) continue;
    if (demand.requiredLastOperationTag) {
      tags.add(demand.requiredLastOperationTag);
    }
  }

  return tags;
}
