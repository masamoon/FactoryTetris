// Grid configuration
export const GRID_CONFIG = {
    cellSize: 32,
    factoryWidth: 10,
    factoryHeight: 10,
    x: 200, // Update x position to center in the factory area (width*0.05 + width*0.4/2)
    y: 220, // Adjusted Y center to align logical grid top (startY=60) with visual background top (Y=60)
    width: 10, // Add width in cells
    height: 10 // Add height in cells
};

// Game configuration
export const GAME_CONFIG = {
    // Canvas dimensions
    width: 800,
    height: 600,
    
    // Game time limit in seconds (30 minutes)
    gameTimeLimit: 1800,
    
    // Resource generation
    resourceGenerationRate: 2000, // ms
    resourceTypes: [
        { id: 'basic-resource', name: 'Basic Resource', color: 0x00aa44, points: 10 },
        { id: 'advanced-resource', name: 'Advanced Resource', color: 0xd2691e, points: 50 },
        { id: 'mega-resource', name: 'Mega Resource', color: 0xff00ff, points: 300 }
    ],
    
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
                [1, 0, 0]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000, // ms
            direction: 'right', // Default output direction
            description: 'Processes basic resources into advanced resources'
        },
        {
            id: 'processor-b',
            name: 'Processor B',
            shape: [
                [0, 1, 0],
                [1, 1, 1]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000, // ms
            direction: 'right', // Default output direction
            description: 'Processes basic resources into advanced resources'
        },
        {
            id: 'advanced-processor',
            name: 'Advanced Processor',
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ],
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: ['mega-resource'],
            processingTime: 5000, // ms
            direction: 'down', // Default output direction
            description: 'Combines basic and advanced resources'
        },
        {
            id: 'conveyor',
            name: 'Conveyor Belt',
            shape: [
                [1, 1]
            ],
            inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
            outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
            processingTime: 1000, // ms
            direction: 'right', // Default direction, can be rotated
            description: 'Transports resources between machines'
        },
        {
            id: 'processor-c',
            name: 'Processor C',
            shape: [
                [1, 1],
                [1, 1]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000,
            direction: 'right',
            description: 'Processes basic resources into advanced resources (Square)'
        },
        {
            id: 'processor-d',
            name: 'Processor D',
            shape: [[1, 1], [1, 0], [1, 0]],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3500,
            direction: 'right',
            description: 'Processes basic resources into advanced resources. (L-Shape)'
        },
        {
            id: 'processor-e',
            name: 'Processor E',
            shape: [[1], [1], [1], [1]],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3300,
            direction: 'right',
            description: 'Processes basic resources into advanced resources. (I-Shape)'
        },
        {
            id: 'advanced-processor-1',
            name: 'Advanced Processor 1',
            shape: [[1, 0, 1], [1, 1, 1]],
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: ['mega-resource'],
            processingTime: 5500,
            direction: 'down',
            description: 'Combines basic and advanced resources into mega resources. (U-Shape)'
        },
        {
            id: 'advanced-processor-2',
            name: 'Advanced Processor 2',
            shape: [[1, 1, 1, 1], [1, 0, 0, 0]],
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: ['mega-resource'],
            processingTime: 6000,
            direction: 'down',
            description: 'Combines basic and advanced resources into mega resources. (Long L-Shape)'
        }
    ],
    
    // Resource colors for visualization
    resourceColors: {
        'basic-resource': 0x00aa44,
        'advanced-resource': 0xd2691e,
        'mega-resource': 0xff00ff
    },

    // *** ADDED: Resource value map for scoring ***
    resourceValueMap: {
        'basic-resource': 10,    // Corresponds to points in resourceTypes
        'advanced-resource': 50, // Corresponds to points in resourceTypes
        'mega-resource': 300     // Corresponds to points in resourceTypes
    },

    // Round configuration
    roundScoreThresholds: [
        1000,  // Score needed to complete Round 1
        2500,  // Score needed to complete Round 2
        5000,  // Score needed to complete Round 3
        10000, // Score needed to complete Round 4
        // Add more thresholds for subsequent rounds
    ],
    // If rounds exceed defined thresholds, use a formula?
    // Example: lastThreshold + roundNumber * 100
    scoreIncreaseFactorPerRound: 1.5, // Or multiply previous threshold by 1.5?

    // --- REMOVED CLEAR FACTORY COOLDOWN CONFIG ---
    initialClearCooldown: 60000, // 1 minute
/*
    clearCooldownIncreaseFactor: 100 // ms added to cooldown per second of game time
*/
}; 