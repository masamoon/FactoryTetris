// Simulation of piece generation for Era 2
// Run with: node simulate_piece_distribution.js

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
  if (era === 1) return { fourBlock: [], fiveBlock: [] }; // Base handled by constants

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

  if (era >= 3) {
    // Simulating Era 3+ simplified for now as we focus on Era 2
  }
  return configs;
}

// --- GENERATOR LOGIC (Adapted from PieceGenerator.js) ---

function isPieceUsable(config, producibleLevels) {
  if (!config || !config.inputs) return false;
  for (const inputLevel of config.inputs) {
    if (!producibleLevels.has(inputLevel)) return false;
  }
  return true;
}

function selectWeightedConfig(configs, producibleLevels) {
  if (configs.length === 0) return FOUR_BLOCK_CONFIGS[0];

  const weights = configs.map((config) => {
    let weight = 1;
    weight += config.output * 0.5;
    if (!producibleLevels.has(config.output)) {
      weight += 2;
    }
    if (config.output === 3) {
      weight *= 1.5;
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

  // 1. Get All Configs
  let allConfigs = [...FOUR_BLOCK_CONFIGS, ...FIVE_BLOCK_CONFIGS];
  if (currentEra > 1) {
    const eraConfigs = getPieceConfigsForEra(currentEra);
    allConfigs = [...allConfigs, ...eraConfigs.fourBlock, ...eraConfigs.fiveBlock];
  }

  // 2. Filter Usable
  const usableConfigs = allConfigs.filter((config) => isPieceUsable(config, producibleLevels));

  // 3. Filter Higher Tier
  // Era 1: > 2. Era 2: > 5.
  const higherTierThreshold = currentEra > 1 ? currentEra * 3 - 1 : 2;
  const higherTierConfigs = allConfigs.filter((config) => config.output > higherTierThreshold);
  const usableHigherTierConfigs = higherTierConfigs.filter((config) =>
    isPieceUsable(config, producibleLevels)
  );

  let guaranteedUsable = false;
  let guaranteedHigherTier = false;

  for (let i = 0; i < count; i++) {
    let selectedConfig;

    // First piece: Guarantee Usable
    if (i === 0 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels);
      guaranteedUsable = true;
      if (selectedConfig.output > higherTierThreshold) guaranteedHigherTier = true;
    }
    // Guarantee Higher Tier
    else if (!guaranteedHigherTier && higherTierConfigs.length > 0) {
      const pool = usableHigherTierConfigs.length > 0 ? usableHigherTierConfigs : higherTierConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels);
      guaranteedHigherTier = true;
      if (isPieceUsable(selectedConfig, producibleLevels)) guaranteedUsable = true;
    }
    // Last chance Usable
    else if (!guaranteedUsable && i === count - 1 && usableConfigs.length > 0) {
      selectedConfig = selectWeightedConfig(usableConfigs, producibleLevels);
      guaranteedUsable = true;
    }
    // Random
    else {
      const pool = Math.random() < 0.7 && usableConfigs.length > 0 ? usableConfigs : allConfigs;
      selectedConfig = selectWeightedConfig(pool, producibleLevels);
    }

    options.push(selectedConfig);
  }
  return options;
}

// --- SIMULATION ---

function runSimulation(label, currentEra, producibleLevelsArr) {
  const producibleLevels = new Set(producibleLevelsArr);
  console.log(`\n--- Simulation: ${label} ---`);
  console.log(`Era: ${currentEra}`);
  console.log(`Producible Levels: {${Array.from(producibleLevels).join(', ')}}`);

  // Determine thresholds for context
  const higherTierThreshold = currentEra > 1 ? currentEra * 3 - 1 : 2;
  console.log(`Higher Tier Threshold (>): ${higherTierThreshold}`);

  const iterations = 10000; // 10k pieces (approx 3333 sets of 3)
  const counts = {};
  const notationCounts = {};

  for (let i = 0; i < iterations; i++) {
    // We simulate generating 1 piece at a time effectively by calling generatePieceOptions and taking all 3
    // Actually, let's call it 3333 times to get ~10k pieces
  }

  // Better: Run 3333 rounds of 3 pieces
  const rounds = 3333;
  for (let r = 0; r < rounds; r++) {
    const pieces = generatePieceOptions(currentEra, producibleLevels, 3);
    pieces.forEach((p) => {
      counts[p.output] = (counts[p.output] || 0) + 1;
      notationCounts[p.notation] = (notationCounts[p.notation] || 0) + 1;
    });
  }

  const total = rounds * 3;
  console.log(`Total generated: ${total}`);

  // Sort by Level
  const sortedLevels = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  console.log('\nDistribution by Output Level:');
  sortedLevels.forEach((lvl) => {
    const percent = ((counts[lvl] / total) * 100).toFixed(1);
    console.log(`Level ${lvl}: ${counts[lvl]} (${percent}%)`);
  });

  // Sort by Notation
  console.log('\nDistribution by Piece Type:');
  const sortedNotations = Object.keys(notationCounts).sort(
    (a, b) => notationCounts[b] - notationCounts[a]
  ); // Descending
  sortedNotations.forEach((not) => {
    const percent = ((notationCounts[not] / total) * 100).toFixed(1);
    console.log(`${not}: ${notationCounts[not]} (${percent}%)`);
  });
}

// Scenario 1: Start of Era 2.
// Player has Era 1 basics (L1, L2, L3) and Chips (L4).
// Can produce: 1, 2, 3, 4.
// Cannot produce 5 yet (needs 3+4).
runSimulation('Era 2 Start (Has L1-L4)', 2, [1, 2, 3, 4]);

// Scenario 2: Mid Era 2.
// Player unlocked L5.
// Can produce: 1, 2, 3, 4, 5.
runSimulation('Era 2 Mid (Has L1-L5)', 2, [1, 2, 3, 4, 5]);
