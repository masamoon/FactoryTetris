export const UPGRADE_TYPES = {
  BUDGET: 'budget',
  SUPPLY_BOUNTY: 'supply_bounty',
  OPERATOR_EFFICIENCY: 'operator_efficiency',
  CONVEYOR_SPEED: 'conveyor_speed',
  INVENTORY_CAPACITY: 'inventory_capacity',
  PROCUREMENT_REBATE: 'procurement_rebate',
  HIGH_ROLLER: 'high_roller',
};

export const upgradesConfig = {
  [UPGRADE_TYPES.BUDGET]: {
    name: 'Budget Increase',
    description: 'Start each round with more Budget.',
    tiers: [
      { level: 1, modifier: 10, description: '+$10 starting Budget each round' },
      { level: 2, modifier: 22, description: '+$22 starting Budget each round' },
      { level: 3, modifier: 38, description: '+$38 starting Budget each round' },
    ],
  },
  [UPGRADE_TYPES.SUPPLY_BOUNTY]: {
    name: 'Supply Contract',
    description: 'Round sources begin with more finite supply.',
    tiers: [
      { level: 1, modifier: 1.2, description: '+20% source supply' },
      { level: 2, modifier: 1.45, description: '+45% source supply' },
      { level: 3, modifier: 1.75, description: '+75% source supply' },
    ],
  },
  [UPGRADE_TYPES.OPERATOR_EFFICIENCY]: {
    name: 'Operator Throughput',
    description: 'Operators process items faster.',
    tiers: [
      { level: 1, modifier: 1.15, description: '+15% Operator speed' },
      { level: 2, modifier: 1.35, description: '+35% Operator speed' },
      { level: 3, modifier: 1.6, description: '+60% Operator speed' },
    ],
  },
  [UPGRADE_TYPES.CONVEYOR_SPEED]: {
    name: 'Conveyor Speed',
    description: 'Conveyors move items faster.',
    tiers: [
      { level: 1, modifier: 1.2, description: '+20% Conveyor speed' },
      { level: 2, modifier: 1.5, description: '+50% Conveyor speed' },
      { level: 3, modifier: 2.0, description: '+100% Conveyor speed' },
    ],
  },
  [UPGRADE_TYPES.INVENTORY_CAPACITY]: {
    name: 'Buffer Expansion',
    description: 'Machines and conveyors hold more items.',
    tiers: [
      { level: 1, modifier: 1.25, description: '+25% Buffer capacity' },
      { level: 2, modifier: 1.5, description: '+50% Buffer capacity' },
      { level: 3, modifier: 2.0, description: '+100% Buffer capacity' },
    ],
  },
  [UPGRADE_TYPES.PROCUREMENT_REBATE]: {
    name: 'Procurement Engine',
    description: 'Completed delivery nodes refund Budget.',
    tiers: [
      { level: 1, modifier: 2, description: '+$2 per completed delivery node' },
      { level: 2, modifier: 4, description: '+$4 per completed delivery node' },
      { level: 3, modifier: 7, description: '+$7 per completed delivery node' },
    ],
  },
  [UPGRADE_TYPES.HIGH_ROLLER]: {
    name: 'High Roller',
    description: 'Deliveries touched by Operators costing $20+ score more.',
    tiers: [
      { level: 1, modifier: 1.2, description: '$20+ Operator deliveries score x1.2' },
      { level: 2, modifier: 1.4, description: '$20+ Operator deliveries score x1.4' },
      { level: 3, modifier: 1.7, description: '$20+ Operator deliveries score x1.7' },
    ],
  },
};

export const TIER_THRESHOLDS = {
  1: 0,
  2: 3,
  3: 8,
};
