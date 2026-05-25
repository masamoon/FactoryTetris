import { getProcessingPieceMachineConfigs } from './pieceBodies';

// Grid configuration
export const GRID_CONFIG = {
  cellSize: 32,
  factoryWidth: 10,
  factoryHeight: 10,
  x: 200, // Update x position to center in the factory area (width*0.05 + width*0.4/2)
  y: 220, // Adjusted Y center to align logical grid top (startY=60) with visual background top (Y=60)
  width: 10, // Initial width in cells
  height: 10, // Initial height in cells
  growthPerRound: 1, // How many cells to add in each dimension per round
  maxWidth: Infinity, // No artificial cap - let the game engine be the limit
  maxHeight: Infinity, // No artificial cap - let the game engine be the limit
};

// Game configuration
export const GAME_CONFIG = {
  // Canvas dimensions
  width: 800,
  height: 600,

  // No time limit - infinite arcade mode
  gameTimeLimit: Infinity,

  // Resource generation
  resourceGenerationRate: 2000, // ms
  resourceTypes: [
    {
      id: 'basic-resource',
      name: 'Basic Resource',
      color: 0x3f8cff,
      points: 10,
      itemColor: 'blue',
    },
    {
      id: 'advanced-resource',
      name: 'Advanced Resource',
      color: 0xffd166,
      points: 50,
      itemColor: 'yellow',
    },
    {
      id: 'mega-resource',
      name: 'Mega Resource',
      color: 0xb56cff,
      points: 300,
      itemColor: 'purple',
    },
  ],

  // Color identity: easy-to-read lanes that can later grow into archetypes.
  defaultItemColor: 'blue',
  mixedItemColor: 'purple',
  sourceColorCycle: ['blue', 'yellow', 'red', 'green'],
  itemColors: {
    blue: { name: 'Blue', color: 0x3f8cff, textColor: '#3f8cff', scoreMultiplier: 1.05 },
    yellow: { name: 'Yellow', color: 0xffd166, textColor: '#ffd166', scoreMultiplier: 1.1 },
    red: { name: 'Red', color: 0xff5f57, textColor: '#ff5f57', scoreMultiplier: 1.15 },
    green: { name: 'Green', color: 0x4dd47e, textColor: '#4dd47e', scoreMultiplier: 1.05 },
    purple: { name: 'Purple', color: 0xb56cff, textColor: '#b56cff', scoreMultiplier: 1.2 },
  },

  // Purity system configuration
  purityConfig: {
    // Base points per purity level: purity 1 = 5, purity 2 = 15, etc.
    basePoints: [5, 15, 40, 100, 250],
    // For purity 6+: points = 250 * 2^(purity - 5)

    // Colors for each purity level (index 0 = purity 1)
    colors: [
      0x8b4513, // Purity 1: Brown (Raw Ore)
      0xcd853f, // Purity 2: Orange (Refined)
      0xffd700, // Purity 3: Gold (Purified)
      0xfffacd, // Purity 4: White Gold (Crystal)
      0xffffff, // Purity 5: White (Prismatic)
      // Purity 6+: Rainbow shimmer (handled dynamically)
    ],

    // Glow settings per purity level
    glowStart: 4, // Purity level at which glow begins

    // Scale multiplier per purity level: 0.85 + (purity - 1) * 0.05
    baseScale: 0.85,
    scaleIncrement: 0.05,

    // Trail types per purity level
    trailStart: 3, // Purity level at which trails begin

    // Soft chain cap to prevent exploits
    maxChain: 20,
  },

  // Chain multiplier configuration
  chainConfig: {
    // Multipliers for chain counts
    multipliers: [1.0, 1.2, 1.5, 2.0, 3.0], // chain 1-5
    // For chain 6+: 3.0 + (chain - 5) * 0.5
    baseMultiplierAfter5: 3.0,
    incrementAfter5: 0.5,
  },

  // Resource nodes
  initialNodeCount: 3,
  nodeSpawnRate: 15000, // ms
  nodeLifespan: 60, // Seconds before a node despawns

  // Machine types
  machineTypes: [
    ...getProcessingPieceMachineConfigs(),
    {
      id: 'conveyor',
      name: 'Conveyor Belt',
      shape: [[1, 1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 1000, // ms
      direction: 'right', // Default direction, can be rotated
      description: 'Transports resources between machines',
    },
    {
      id: 'painter',
      name: 'Color Painter',
      shape: [[1]],
      inputTypes: ['purity-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['purity-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 700,
      direction: 'right',
      description: 'Recolors passing items based on facing direction',
    },
    {
      id: 'splitter',
      name: 'Splitter',
      shape: [[1, 1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 500,
      direction: 'right',
      description: 'Distributes items between two output paths',
    },
    {
      id: 'merger',
      name: 'Merger',
      shape: [[1], [1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 500,
      direction: 'right',
      description: 'Combines items from multiple paths',
    },
    {
      id: 'underground-belt',
      name: 'Underground Belt',
      shape: [[1, 0, 0, 1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 1000,
      direction: 'right',
      description: 'Transports resources under other machines',
    },
  ],

  // Resource colors for visualization
  resourceColors: {
    'basic-resource': 0x3f8cff,
    'advanced-resource': 0xffd166,
    'mega-resource': 0xb56cff,
  },

  // *** ADDED: Resource value map for scoring ***
  resourceValueMap: {
    'basic-resource': 10, // Corresponds to points in resourceTypes
    'advanced-resource': 50, // Corresponds to points in resourceTypes
    'mega-resource': 300, // Corresponds to points in resourceTypes
  },

  // Round / resource pacing
  roundBaseQuota: 320,
  roundQuotaGrowth: 1.34,
  roundQuotaFlatGrowth: 115,
  finiteResourceRounds: true,
  roundSourceBaseInventory: 24,
  roundSourceInventoryGrowth: 5,
  roundSourceInventoryVariance: 2,
  roundExhaustionGraceMs: 6500,
  starterDraftRounds: 1,
  shopRoundClearScrap: 6,
  shopOverkillScorePerScrap: 250,
  shopOfferCount: 3,
  shopRerollCost: 2,
  shopPieceTraitChance: 0.3,
  shopPieceTraitCost: 3,
  shopSourceLifespan: 180,
  yellowScorePerScrap: 120,
  draftCycleCost: 2,
  draftRedrawCost: 4,
  fastForwardSpeedMultiplier: 3,
  flowConfig: {
    deliveryWindowMs: 5200,
    maxStreak: 12,
    multiplierPerStep: 0.035,
    maxMultiplier: 1.35,
    milestoneStreaks: [3, 6, 10],
  },
  boardPowerProcessingMultiplier: 0.78,
  boardQualityScoreMultiplier: 1.15,
  boardTaxedCellSurcharge: 3,
  pacingConfig: {
    roundsPerAct: 4,
    eliteRoundInAct: 3,
    bossRoundInAct: 4,
    eliteQuotaMultiplier: 1.04,
    eliteSourceMultiplier: 1.05,
    eliteCompletionScoreMultiplier: 1.1,
    eliteCompletionScrapBonus: 1,
    bossQuotaMultiplier: 1.1,
    bossSourceMultiplier: 1.16,
    bossRequiredCountBonus: 1,
    bossCompletionScoreMultiplier: 1.25,
    bossCompletionScrapBonus: 3,
    bossRoundClearMoneyBonus: 14,
    bossRoundClearScrapBonus: 4,
  },
  shopRemoveBlockersCost: 4,
  shopInstallPowerCellCost: 5,
  shopInstallQualityCellCost: 5,
  shopFundingGrantCost: 3,
  shopFundingGrantAmount: 18,

  // Round / economy loop
  startingMoney: 45,
  roundBaseMoney: 28,
  roundMoneyGrowth: 8,
  roundClearBonus: 18,
  deliveryNodeCompletionScoreBase: 420,
  deliveryNodeCompletionScorePerTier: 160,
  deliveryNodeCompletionScorePerItem: 85,
  deliveryNodeCompletionScrapBase: 2,
  deliveryNodeCompletionScrapPerTier: 0.5,
  deliveryNodeCompletionScrapPerItem: 0.35,
  filledDeliveryNodeRewardMultiplier: 0.35,
  maxDeliveryNodesPerRound: 7,
  machinePlacementCosts: {
    conveyor: 1,
    splitter: 4,
    merger: 4,
    'underground-belt': 5,
    painter: 3,
    operator: 8,
    refiner: 8,
    booster: 11,
    adder: 15,
    divider: 16,
    multiplier: 26,
    complexBodyPremium: 3,
    expensiveOperatorThreshold: 20,
  },
  machineRefundRate: 0.5,

  // --- REMOVED CLEAR FACTORY COOLDOWN CONFIG ---
  initialClearCooldown: 60000, // 1 minute
  /*
    clearCooldownIncreaseFactor: 100 // ms added to cooldown per second of game time
*/
};
