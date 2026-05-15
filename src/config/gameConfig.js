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
    { id: 'basic-resource', name: 'Basic Resource', color: 0x00aa44, points: 10 },
    { id: 'advanced-resource', name: 'Advanced Resource', color: 0xd2691e, points: 50 },
    { id: 'mega-resource', name: 'Mega Resource', color: 0xff00ff, points: 300 },
  ],

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
  upgradeNodeSpawnDelay: 30000, // How often to try spawning an upgrade node (Changed to 30 seconds)

  // Machine types
  machineTypes: [
    {
      id: 'processor-a',
      name: 'Processor A',
      shape: [
        [1, 1, 1],
        [1, 0, 0],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3000, // ms
      direction: 'right', // Default output direction
      description: 'Processes basic resources into advanced resources',
    },
    {
      id: 'processor-b',
      name: 'Processor B',
      shape: [
        [0, 1, 0],
        [1, 1, 1],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3000, // ms
      direction: 'right', // Default output direction
      description: 'Processes basic resources into advanced resources',
    },
    {
      id: 'advanced-processor',
      name: 'Advanced Processor',
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      inputTypes: ['basic-resource', 'advanced-resource'],
      outputTypes: ['mega-resource'],
      processingTime: 5000, // ms
      direction: 'down', // Default output direction
      description: 'Combines basic and advanced resources',
    },
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
      id: 'processor-c',
      name: 'Processor C',
      shape: [
        [1, 1],
        [1, 1],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3000,
      direction: 'right',
      description: 'Processes basic resources into advanced resources (Square)',
    },
    {
      id: 'processor-d',
      name: 'Processor D',
      shape: [
        [1, 1],
        [1, 0],
        [1, 0],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3500,
      direction: 'right',
      description: 'Processes basic resources into advanced resources. (L-Shape)',
    },
    {
      id: 'processor-e',
      name: 'Processor E',
      shape: [[1], [1], [1], [1]],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3300,
      direction: 'right',
      description: 'Processes basic resources into advanced resources. (I-Shape)',
    },
    {
      id: 'advanced-processor-1',
      name: 'Advanced Processor 1',
      shape: [
        [1, 0, 1],
        [1, 1, 1],
      ],
      inputTypes: ['basic-resource', 'advanced-resource'],
      outputTypes: ['mega-resource'],
      processingTime: 5500,
      direction: 'down',
      description: 'Combines basic and advanced resources into mega resources. (U-Shape)',
    },
    {
      id: 'advanced-processor-2',
      name: 'Advanced Processor 2',
      shape: [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
      ],
      inputTypes: ['basic-resource', 'advanced-resource'],
      outputTypes: ['mega-resource'],
      processingTime: 6000,
      direction: 'down',
      description: 'Combines basic and advanced resources into mega resources. (Long L-Shape)',
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
    'basic-resource': 0x00aa44,
    'advanced-resource': 0xd2691e,
    'mega-resource': 0xff00ff,
  },

  // *** ADDED: Resource value map for scoring ***
  resourceValueMap: {
    'basic-resource': 10, // Corresponds to points in resourceTypes
    'advanced-resource': 50, // Corresponds to points in resourceTypes
    'mega-resource': 300, // Corresponds to points in resourceTypes
  },

  // Pacing / flow-state tuning
  startingMomentum: 40,
  placementMomentumGain: 2,
  connectionMomentumGain: 3,
  deliveryStreakWindow: 4000,
  deliveryStreakMomentumGain: 0.75,
  maxDeliveryStreakMomentumGain: 8,
  objectiveMomentumReward: 14,
  objectivesPerBonusUpgrade: 3,
  flowSurgeDuration: 12000,
  flowSurgeSpeedMultiplier: 1.35,

  // Milestone upgrade system (banked choices that the player can open when ready)
  firstUpgradeScore: 300,
  upgradeMilestoneInterval: 650,
  upgradeMilestoneGrowth: 225,

  // --- REMOVED CLEAR FACTORY COOLDOWN CONFIG ---
  initialClearCooldown: 60000, // 1 minute
  /*
    clearCooldownIncreaseFactor: 100 // ms added to cooldown per second of game time
*/
};
