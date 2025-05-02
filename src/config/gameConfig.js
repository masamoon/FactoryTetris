// Grid configuration
export const GRID_CONFIG = {
    cellSize: 32,
    factoryWidth: 10,
    factoryHeight: 10,
    cargoBayWidth: 6,
    cargoBayHeight: 10,
    x: 200, // Update x position to center in the factory area (width*0.05 + width*0.4/2)
    y: 250, // Update y position to center in the factory area (height*0.1 + height*0.6/2)
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
        { id: 'advanced-resource', name: 'Advanced Resource', color: 0xd2691e, points: 50 }
    ],
    
    // Resource nodes
    initialNodeCount: 3,
    nodeSpawnRate: 15000, // ms
    nodeLifespan: 60, // seconds
    
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
            outputTypes: ['advanced-resource'],
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
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: ['basic-resource', 'advanced-resource'],
            processingTime: 1000, // ms
            direction: 'right', // Default direction, can be rotated
            description: 'Transports resources between machines'
        },
        {
            id: 'cargo-loader',
            name: 'Cargo Loader',
            shape: [
                [1, 1],
                [1, 1]
            ],
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: [],
            processingTime: 2000, // ms
            direction: 'none', // No output direction, sends to cargo bay
            description: 'Loads products into the cargo bay'
        }
    ],
    
    // Product requirements for cargo bay
    productRequirements: [
        { type: 'basic-resource', count: 5, points: 50 },
        { type: 'advanced-resource', count: 3, points: 150 }
    ],
    
    // Combo multipliers for clearing multiple rows at once
    comboMultipliers: [
        { rows: 1, multiplier: 1 },
        { rows: 2, multiplier: 2.5 },
        { rows: 3, multiplier: 4 },
        { rows: 4, multiplier: 6 }
    ],
    
    // Resource colors for visualization
    resourceColors: {
        'basic-resource': 0x00aa44,
        'advanced-resource': 0xd2691e
    },

    // Round configuration
    roundScoreThresholds: [
        100,  // Score needed to complete Round 1
        250,  // Score needed to complete Round 2
        500,  // Score needed to complete Round 3
        1000, // Score needed to complete Round 4
        // Add more thresholds for subsequent rounds
    ],
    // If rounds exceed defined thresholds, use a formula?
    // Example: lastThreshold + roundNumber * 100
    scoreIncreaseFactorPerRound: 1.5, // Or multiply previous threshold by 1.5?

    // Clear Factory ability
    initialClearCooldown: 30000, // ms (30 seconds)
    clearCooldownIncreaseFactor: 100 // ms added to cooldown per second of game time
}; 