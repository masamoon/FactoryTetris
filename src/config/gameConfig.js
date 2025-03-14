// Grid configuration
export const GRID_CONFIG = {
    cellSize: 32,
    factoryWidth: 10,
    factoryHeight: 10,
    cargoBayWidth: 6,
    cargoBayHeight: 10
};

// Game configuration
export const GAME_CONFIG = {
    // Game time limit in seconds (30 minutes)
    gameTimeLimit: 1800,
    
    // Resource generation
    resourceGenerationRate: 2000, // ms
    resourceTypes: [
        { id: 'raw-resource', name: 'Raw Resource', color: 0x00aa44 },
        { id: 'copper-ore', name: 'Copper Ore', color: 0xd2691e },
        { id: 'iron-ore', name: 'Iron Ore', color: 0xa19d94 },
        { id: 'coal', name: 'Coal', color: 0x36454f }
    ],
    
    // Resource nodes
    initialNodeCount: 3,
    nodeSpawnRate: 15000, // ms
    nodeLifespan: 60, // seconds
    
    // Machine types
    machineTypes: [
        {
            id: 'extractor',
            name: 'Resource Extractor',
            shape: [
                [1]
            ],
            inputTypes: [],
            outputTypes: ['raw-resource', 'copper-ore', 'iron-ore', 'coal'],
            processingTime: 2000, // ms
            direction: 'down', // Default output direction
            description: 'Extracts resources from nodes'
        },
        {
            id: 'processor-a',
            name: 'Processor A',
            shape: [
                [1, 1, 1],
                [1, 0, 0]
            ],
            inputTypes: ['raw-resource', 'copper-ore'],
            outputTypes: ['product-a'],
            processingTime: 3000, // ms
            direction: 'right', // Default output direction
            description: 'Processes raw resources into Product A'
        },
        {
            id: 'processor-b',
            name: 'Processor B',
            shape: [
                [0, 1, 0],
                [1, 1, 1]
            ],
            inputTypes: ['raw-resource', 'iron-ore'],
            outputTypes: ['product-b'],
            processingTime: 3000, // ms
            direction: 'right', // Default output direction
            description: 'Processes raw resources into Product B'
        },
        {
            id: 'advanced-processor',
            name: 'Advanced Processor',
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ],
            inputTypes: ['product-a', 'product-b', 'coal'],
            outputTypes: ['product-c'],
            processingTime: 5000, // ms
            direction: 'down', // Default output direction
            description: 'Combines Products A and B with coal to create Product C'
        },
        {
            id: 'conveyor',
            name: 'Conveyor Belt',
            shape: [
                [1, 1]
            ],
            inputTypes: ['raw-resource', 'copper-ore', 'iron-ore', 'coal', 'product-a', 'product-b', 'product-c'],
            outputTypes: ['raw-resource', 'copper-ore', 'iron-ore', 'coal', 'product-a', 'product-b', 'product-c'],
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
            inputTypes: ['product-a', 'product-b', 'product-c'],
            outputTypes: [],
            processingTime: 2000, // ms
            direction: 'none', // No output direction, sends to cargo bay
            description: 'Loads products into the cargo bay'
        }
    ],
    
    // Product requirements for cargo bay
    productRequirements: [
        { type: 'product-a', count: 3, points: 100 },
        { type: 'product-b', count: 3, points: 100 },
        { type: 'product-c', count: 1, points: 300 }
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
        'raw-resource': 0x00aa44,
        'copper-ore': 0xd2691e,
        'iron-ore': 0xa19d94,
        'coal': 0x36454f,
        'product-a': 0xff0000,
        'product-b': 0x0000ff,
        'product-c': 0xffaa00
    }
}; 