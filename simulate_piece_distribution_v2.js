// Simulation of piece generation for Era 2 - VERSION 2 (Modified Threshold)
// Run with: node simulate_piece_distribution_v2.js

// --- CONFIG MOCKS ---

const FOUR_BLOCK_CONFIGS = [
  { inputs: [1], output: 2, notation: '1/2' },
  { inputs: [2], output: 3, notation: '2/3' },
  { inputs: [3], output: 4, notation: '3/4' },
];

const FIVE_BLOCK_CONFIGS = [
  { inputs: [1, 2], output: 3, notation: '1/2/3' },
  { inputs: [1, 3], output: 4, notation: '1/3/4' },
  { inputs: [2, 2], output: 4, notation: '2/2/4' },
];

function getTiersForEra(era) {
  return {
    input: 3 * era - 2,
    mid: 3 * era - 1,
    output: 3 * era,
  };
}

function getPieceConfigsForEra(era) {
  const tiers = getTiersForEra(era);
  if (era === 1) return { fourBlock: [], fiveBlock: [] };

  const prevEraTiers = getTiersForEra(era - 1);
  const prevOutput = prevEraTiers.output;
  const chipTier = tiers.input;

  const configs = {
    fourBlock: [
      {
        inputs: [prevOutput, chipTier],
        output: tiers.mid,
        notation: `${prevOutput}+${chipTier}/${tiers.mid}`,
      },
      {
        inputs: [chipTier, tiers.mid],
        output: tiers.output,
        notation: `${chipTier}+${tiers.mid}/${tiers.output}`,
      },
    ],
    fiveBlock: [
      {
        inputs: [prevOutput, chipTier, tiers.mid],
        output: tiers.output,
        notation: `${prevOutput}+${chipTier}+${tiers.mid}/${tiers.output}`,
      },
    ],
  };

  return configs;
}

// --- GENERATOR LOGIC ---

function isPieceUsable(config, producibleLevels) {
  if (!config || !config.inputs) return false;
  for (const inputLevel of config.inputs) {
    if (!producibleLevels.has(inputLevel)) return false;
  }
  return true;
}

// V3 LOGIC
function selectWeightedConfig(configs, producibleLevels, currentEra) {
  if (configs.length === 0) return FOUR_BLOCK_CONFIGS[0];

  // FORMULAIC BALANCE
  // We want a pyramid distribution: Common > Uncommon > Rare.
  // Issue: Higher tiers often have MORE recipe combinations (ways to make them),
  // boosting their frequency artificially.
  // Solution: Weight scales inversely with level.
  // Formula: Weight = Base * RarityFactor ^ (EvaMax - Level)

  const eraMax = currentEra * 3;
  const rarityFactor = 3.0; // Very steep drop to ensure L5 > L6

  const weights = configs.map((config) => {
    // Calculate distance from the top tier
    const rawDist = eraMax - config.output;

    // Cap the distance at 1.3.
    // This effectively "squashes" the weights of L4, L3, L2 so they don't dominate too hard.
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

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < configs.length; i++) {
    random -= weights[i];
    if (random <= 0) return configs[i];
  }
  return configs[configs.length - 1];
}

function generatePieceOptions(currentEra, producibleLevels, count = 3) {
  const options = [];

  let allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    allConfigs = [...allConfigs, ...eraConfigs.fourBlock, ...eraConfigs.fiveBlock];
  }

  const usableConfigs = allConfigs.filter((config) => isPieceUsable(config, producibleLevels));

  const higherTierThreshold = 2; // Fixed at 2 for all eras

  const higherTierConfigs = allConfigs.filter((config) => config.output > higherTierThreshold);
  const usableHigherTierConfigs = higherTierConfigs.filter((config) =>
    isPieceUsable(config, producibleLevels)
  );

  let guaranteedUsable = false;
  let guaranteedHigherTier = false;

  for (let i = 0; i < count; i++) {
    let selectedConfig;

    if (i === 0 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra);
      guaranteedUsable = true;
      if (selectedConfig.output > higherTierThreshold) guaranteedHigherTier = true;
    } else if (!guaranteedHigherTier && higherTierConfigs.length > 0) {
      const pool = usableHigherTierConfigs.length > 0 ? usableHigherTierConfigs : higherTierConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra);
      guaranteedHigherTier = true;
      if (isPieceUsable(selectedConfig, producibleLevels)) guaranteedUsable = true;
    } else if (!guaranteedUsable && i === count - 1 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels, currentEra);
      guaranteedUsable = true;
    } else {
      const pool = Math.random() < 0.7 && usableConfigs.length > 0 ? usableConfigs : allConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels, currentEra);
    }

    options.push(selectedConfig);
  }
  return options;
}

// --- SIMULATION ---

function runSimulation(label, currentEra, producibleLevelsArr) {
  const producibleLevels = new Set(producibleLevelsArr);
  console.log(`\n--- Simulation V2 (Lower Threshold): ${label} ---`);
  console.log(`Era: ${currentEra}`);

  const higherTierThreshold = currentEra > 1 ? currentEra * 3 - 2 : 2;
  console.log(`Higher Tier Threshold (>): ${higherTierThreshold} (Includes Level 5 and 6)`);

  const counts = {};
  const rounds = 3333;
  for (let r = 0; r < rounds; r++) {
    const pieces = generatePieceOptions(currentEra, producibleLevels, 3);
    pieces.forEach((p) => {
      counts[p.output] = (counts[p.output] || 0) + 1;
    });
  }

  const total = rounds * 3;
  const sortedLevels = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  console.log('\nDistribution by Output Level:');
  sortedLevels.forEach((lvl) => {
    const percent = ((counts[lvl] / total) * 100).toFixed(1);
    console.log(`Level ${lvl}: ${counts[lvl]} (${percent}%)`);
  });
}

runSimulation('Era 2 Start (Has L1-L4)', 2, [1, 2, 3, 4]);
runSimulation('Era 2 Mid (Has L1-L5)', 2, [1, 2, 3, 4, 5]);
