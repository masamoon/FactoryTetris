export const UPGRADE_TYPES = {
    RESOURCE_BOUNTY: 'resource_bounty',
    RESOURCE_REGEN: 'resource_regen',
    PROCESSOR_EFFICIENCY: 'processor_efficiency',
    CONVEYOR_SPEED: 'conveyor_speed',
    NODE_LONGEVITY: 'node_longevity',
};

export const upgradesConfig = {
    [UPGRADE_TYPES.RESOURCE_BOUNTY]: {
        name: 'Resource Bounty',
        description: 'Resource nodes spawn with more resources.',
        tiers: [
            { level: 1, modifier: 1.25, description: '+25% Starting Resources' },
            { level: 2, modifier: 1.60, description: '+60% Starting Resources' },
            { level: 3, modifier: 2.00, description: '+100% Starting Resources' },
        ],
        // Add visual representation info later if needed
        // icon: 'resource_bounty_icon'
    },
    [UPGRADE_TYPES.RESOURCE_REGEN]: {
        name: 'Resource Regeneration',
        description: 'Resource nodes replenish faster.',
        tiers: [
            { level: 1, modifier: 1.20, description: '+20% Replenish Rate' },
            { level: 2, modifier: 1.50, description: '+50% Replenish Rate' },
            { level: 3, modifier: 2.00, description: '+100% Replenish Rate' },
        ],
        // icon: 'resource_regen_icon'
    },
    [UPGRADE_TYPES.PROCESSOR_EFFICIENCY]: {
        name: 'Processor Efficiency',
        description: 'Processors work faster.',
        tiers: [
            { level: 1, modifier: 1.15, description: '+15% Processor Speed' },
            { level: 2, modifier: 1.40, description: '+40% Processor Speed' },
            { level: 3, modifier: 1.75, description: '+75% Processor Speed' },
        ],
        // icon: 'processor_efficiency_icon'
    },
    [UPGRADE_TYPES.CONVEYOR_SPEED]: {
        name: 'Conveyor Speed',
        description: 'Conveyors move items faster.',
        tiers: [
            { level: 1, modifier: 1.20, description: '+20% Conveyor Speed' },
            { level: 2, modifier: 1.50, description: '+50% Conveyor Speed' },
            { level: 3, modifier: 2.00, description: '+100% Conveyor Speed' },
        ],
        // icon: 'conveyor_speed_icon'
    },
    [UPGRADE_TYPES.NODE_LONGEVITY]: {
        name: 'Node Longevity',
        description: 'Resource nodes last longer.',
        tiers: [
            { level: 1, modifier: 1.15, description: '+15% Node Lifespan' },
            { level: 2, modifier: 1.40, description: '+40% Node Lifespan' },
            { level: 3, modifier: 2.00, description: '+100% Node Lifespan' },
        ],
        // icon: 'node_longevity_icon'
    },
};

export const UPGRADE_PACKAGE_TYPE = 'upgrade_package';

// Tier availability thresholds (example: number of upgrades delivered)
export const TIER_THRESHOLDS = {
    1: 0,
    2: 3, // Tier 2 available after 3 upgrades
    3: 8, // Tier 3 available after 8 upgrades
}; 