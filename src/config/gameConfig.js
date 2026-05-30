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

  metaProgression: {
    undergroundBeltsUnlockedByDefault: false,
    advancedLogisticsUnlockRound: 4,
    freeDraftRedrawsPerRound: 1,
  },

  specialLogistics: {
    painter: {
      id: 'painter',
      name: 'Painter Cell',
      dropName: 'Painter Cell Kit',
      blueprintName: 'Stabilized Painter Blueprint',
      description: 'Recolors passing items by direction. Rotate before placement to pick color.',
      shopDropCost: 4,
      blueprintCost: 11,
      temporaryPlacementCost: 0,
      permanentPlacementCost: 34,
      shopWeight: 3,
    },
    'filter-splitter': {
      id: 'filter-splitter',
      name: 'Filter Splitter',
      dropName: 'Filter Splitter Kit',
      blueprintName: 'Stabilized Filter Splitter Blueprint',
      description: 'Routes high-level or warm-colored items to its alternate output.',
      shopDropCost: 5,
      blueprintCost: 13,
      temporaryPlacementCost: 0,
      permanentPlacementCost: 42,
      shopWeight: 2,
    },
  },

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
  wildcardItemColor: 'wild',
  sourceColorCycle: ['blue', 'yellow', 'red', 'green'],
  itemColors: {
    blue: { name: 'Blue', color: 0x3f8cff, textColor: '#3f8cff', scoreMultiplier: 1.05 },
    yellow: { name: 'Yellow', color: 0xffd166, textColor: '#ffd166', scoreMultiplier: 1.1 },
    red: { name: 'Red', color: 0xff5f57, textColor: '#ff5f57', scoreMultiplier: 1.15 },
    green: { name: 'Green', color: 0x4dd47e, textColor: '#4dd47e', scoreMultiplier: 1.05 },
    purple: { name: 'Purple', color: 0xb56cff, textColor: '#b56cff', scoreMultiplier: 1.2 },
    wild: { name: 'Wild', color: 0xf4fbff, textColor: '#f4fbff', scoreMultiplier: 1 },
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
      inputTypes: ['level-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['level-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
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
  roundBaseTimeLimit: 70,
  roundTimeGrowth: 8,
  roundTimePerDeliveryNode: 12,
  roundBossTimeBonus: 18,
  roundTimeBonusPointsPerSecond: 6,
  starterDraftRounds: 1,
  shopRoundClearScrap: 6,
  shopOverkillScorePerScrap: 250,
  shopTimeBonusScorePerScrap: 180,
  shopOfferCount: 3,
  shopRerollCost: 2,
  shopSpecialLogisticsDropChance: 0.32,
  shopSpecialLogisticsBlueprintChance: 0.08,
  shopPieceTraitChance: 0.3,
  shopPieceTraitCost: 3,
  shopWildcardOperatorChance: 0.04,
  shopSourceLifespan: 180,
  overlevelScoreBonusPerLevel: 0.06,
  overlevelScoreBonusCap: 1.3,
  overlevelBudgetPerLevel: 1,
  overlevelBudgetCap: 6,
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
  boardQualityLevelBonus: 1,
  boardTaxedCellSurcharge: 3,
  pacingConfig: {
    roundsPerAct: 4,
    eliteRoundInAct: 3,
    bossRoundInAct: 4,
    earlyRoundTimeLimits: {
      1: 48,
      2: 56,
      3: 82,
      4: 82,
      5: 76,
    },
    earlyRoundQuotaMultipliers: {
      1: 2.0,
      2: 1.24,
      3: 1.12,
      4: 1.12,
      5: 1.05,
    },
    earlyRoundCompletionScoreMultipliers: {
      1: 0.65,
      2: 0.72,
      3: 1.0,
      4: 0.86,
      5: 0.92,
    },
    earlyRoundMinRequiredCounts: {
      1: 2,
    },
    firstExactDemandRound: 5,
    firstColorDemandRound: 7,
    firstOperationDemandRound: 10,
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
  economy: {
    interest: {
      cashPerInterest: 100,
      interestPerStep: 10,
      maxInterest: 50,
    },
    capitalEdge: {
      firstRounds: 5,
      minInterest: 3,
      edgePerStep: 1,
      edgePerDividend: 4,
      maxEdge: 24,
      maxDividend: 6,
    },
  },
  startingMoney: 90,
  roundBaseMoney: 90,
  roundMoneyGrowth: 18,
  shopCostMultiplier: 10,
  budgetCarryoverCapBase: 0,
  budgetCarryoverCapGrowth: 0,
  deliveryNodeCompletionScoreBase: 420,
  deliveryNodeCompletionScorePerTier: 160,
  deliveryNodeCompletionScorePerItem: 85,
  deliveryNodeCompletionScrapBase: 2,
  deliveryNodeCompletionScrapPerTier: 0.5,
  deliveryNodeCompletionScrapPerItem: 0.35,
  filledDeliveryNodeRewardMultiplier: 0.35,
  maxDeliveryNodesPerRound: 7,
  machinePlacementCosts: {
    conveyor: 4,
    logisticsBeltPiece: 0,
    splitter: 4,
    'filter-splitter': 42,
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
