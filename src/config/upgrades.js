export const UPGRADE_TYPES = {
  BUDGET: 'budget',
  SUPPLY_BOUNTY: 'supply_bounty',
  OPERATOR_EFFICIENCY: 'operator_efficiency',
  CONVEYOR_SPEED: 'conveyor_speed',
  INVENTORY_CAPACITY: 'inventory_capacity',
  PROCUREMENT_REBATE: 'procurement_rebate',
  COLOR_CALIBRATION: 'color_calibration',
  WILDCARD_LICENSING: 'wildcard_licensing',
  SHIFT_HANDOFF: 'shift_handoff',
  STAGING_RACKS: 'staging_racks',
  CLOSING_FLOAT: 'closing_float',
  MATCHED_DIES: 'matched_dies',
  SHADE_GAUGE: 'shade_gauge',
  SORTING_JIG: 'sorting_jig',
  INDEX_MARKS: 'index_marks',
  WARM_CONTRACTS: 'warm_contracts',
  COOLANT_LOOP: 'coolant_loop',
  CHROMA_COUPLERS: 'chroma_couplers',
  EVEN_CALIPERS: 'even_calipers',
  ODD_LOTS: 'odd_lots',
  PARITY_GEARBOX: 'parity_gearbox',
};

export const upgradesConfig = {
  [UPGRADE_TYPES.BUDGET]: {
    name: 'Starting Cash',
    description: 'Start each round with more cash.',
    tiers: [
      { level: 1, modifier: 10, description: '+$10 starting cash each round' },
      { level: 2, modifier: 22, description: '+$22 starting cash each round' },
      { level: 3, modifier: 38, description: '+$38 starting cash each round' },
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
    description: 'Completed delivery nodes refund cash.',
    tiers: [
      { level: 1, modifier: 2, description: '+$2 per completed delivery node' },
      { level: 2, modifier: 4, description: '+$4 per completed delivery node' },
      { level: 3, modifier: 7, description: '+$7 per completed delivery node' },
    ],
  },
  [UPGRADE_TYPES.COLOR_CALIBRATION]: {
    name: 'Color Calibration',
    description: 'Non-Wild deliveries that match a color demand earn more revenue.',
    tiers: [
      {
        level: 1,
        modifier: 1.1,
        description: '+10% revenue when a non-Wild item matches a color demand',
      },
      {
        level: 2,
        modifier: 1.22,
        description: '+22% revenue when a non-Wild item matches a color demand',
      },
      {
        level: 3,
        modifier: 1.38,
        description: '+38% revenue when a non-Wild item matches a color demand',
      },
    ],
  },
  [UPGRADE_TYPES.WILDCARD_LICENSING]: {
    name: 'Wildcard Licensing',
    description: 'Shop Operator cards are more likely to output Wild items.',
    tiers: [
      { level: 1, modifier: 0.08, description: '+8% Wild Operator chance in the shop' },
      { level: 2, modifier: 0.16, description: '+16% Wild Operator chance in the shop' },
      { level: 3, modifier: 0.28, description: '+28% Wild Operator chance in the shop' },
    ],
  },
  [UPGRADE_TYPES.SHIFT_HANDOFF]: {
    name: 'Shift Handoff',
    description: 'Sources hand items to belts more often.',
    tiers: [
      { level: 1, modifier: 0.88, description: 'Source pickup cooldown -12%' },
      { level: 2, modifier: 0.76, description: 'Source pickup cooldown -24%' },
      { level: 3, modifier: 0.62, description: 'Source pickup cooldown -38%' },
    ],
  },
  [UPGRADE_TYPES.STAGING_RACKS]: {
    name: 'Staging Racks',
    description: 'Operators and conveyors keep a little more work in reach.',
    tiers: [
      { level: 1, modifier: 1, description: '+1 queue slot on Operators and conveyors' },
      { level: 2, modifier: 2, description: '+2 queue slots on Operators and conveyors' },
      { level: 3, modifier: 3, description: '+3 queue slots on Operators and conveyors' },
    ],
  },
  [UPGRADE_TYPES.CLOSING_FLOAT]: {
    name: 'Closing Float',
    description: 'Raises the cash floor and interest payouts.',
    tiers: [
      { level: 1, modifier: 1, description: '+$1 interest; +$2 floor; +$4 carry cap' },
      { level: 2, modifier: 2, description: '+$2 interest; +$4 floor; +$8 carry cap' },
      { level: 3, modifier: 4, description: '+$4 interest; +$8 floor; +$16 carry cap' },
    ],
  },
  [UPGRADE_TYPES.MATCHED_DIES]: {
    name: 'Matched Dies',
    description: 'Operators that wait on more than one input complete work faster.',
    tiers: [
      { level: 1, modifier: 1.1, description: '+10% speed for multi-input Operators' },
      { level: 2, modifier: 1.22, description: '+22% speed for multi-input Operators' },
      { level: 3, modifier: 1.38, description: '+38% speed for multi-input Operators' },
    ],
  },
  [UPGRADE_TYPES.SHADE_GAUGE]: {
    name: 'Shade Gauge',
    description: 'Matched-color deliveries care more about item level.',
    tiers: [
      { level: 1, modifier: 0.02, description: '+2% color-match revenue per item level above L1' },
      {
        level: 2,
        modifier: 0.035,
        description: '+3.5% color-match revenue per item level above L1',
      },
      {
        level: 3,
        modifier: 0.055,
        description: '+5.5% color-match revenue per item level above L1',
      },
    ],
  },
  [UPGRADE_TYPES.SORTING_JIG]: {
    name: 'Sorting Jig',
    description: 'Mixed-color multi-input work can leave the line color-flexible.',
    tiers: [
      { level: 1, modifier: 7, description: 'Mixed-color recipes output Wild at L7+' },
      { level: 2, modifier: 5, description: 'Mixed-color recipes output Wild at L5+' },
      { level: 3, modifier: 4, description: 'Mixed-color recipes output Wild at L4+' },
    ],
  },
  [UPGRADE_TYPES.INDEX_MARKS]: {
    name: 'Index Marks',
    description: 'Color-marked output can climb toward waiting color orders.',
    tiers: [
      { level: 1, modifier: 1, description: '+1 output level toward active same-color orders' },
      { level: 2, modifier: 1, description: '+1 output level toward active same-color orders' },
      { level: 3, modifier: 2, description: '+2 output levels toward active same-color orders' },
    ],
  },
  [UPGRADE_TYPES.WARM_CONTRACTS]: {
    name: 'Warm Contracts',
    description: 'Red and Yellow deliveries pay extra.',
    tiers: [
      { level: 1, modifier: 1.08, description: '+8% revenue from Red or Yellow deliveries' },
      { level: 2, modifier: 1.18, description: '+18% revenue from Red or Yellow deliveries' },
      { level: 3, modifier: 1.32, description: '+32% revenue from Red or Yellow deliveries' },
    ],
  },
  [UPGRADE_TYPES.COOLANT_LOOP]: {
    name: 'Coolant Loop',
    description: 'Blue and Green Operators run faster.',
    tiers: [
      { level: 1, modifier: 1.1, description: '+10% speed for Blue or Green Operators' },
      { level: 2, modifier: 1.22, description: '+22% speed for Blue or Green Operators' },
      { level: 3, modifier: 1.38, description: '+38% speed for Blue or Green Operators' },
    ],
  },
  [UPGRADE_TYPES.CHROMA_COUPLERS]: {
    name: 'Chroma Couplers',
    description: 'Certain color pairs strengthen multi-input recipes.',
    tiers: [
      { level: 1, modifier: 1, description: 'Red+Yellow or Blue+Green recipes output +1 level' },
      { level: 2, modifier: 2, description: 'Red+Yellow or Blue+Green recipes output +2 levels' },
      { level: 3, modifier: 3, description: 'Red+Yellow or Blue+Green recipes output +3 levels' },
    ],
  },
  [UPGRADE_TYPES.EVEN_CALIPERS]: {
    name: 'Even Calipers',
    description: 'Even-level deliveries pay extra.',
    tiers: [
      { level: 1, modifier: 1.08, description: '+8% revenue from even-level deliveries' },
      { level: 2, modifier: 1.18, description: '+18% revenue from even-level deliveries' },
      { level: 3, modifier: 1.32, description: '+32% revenue from even-level deliveries' },
    ],
  },
  [UPGRADE_TYPES.ODD_LOTS]: {
    name: 'Odd Lots',
    description: 'Odd-level deliveries return cash to the line.',
    tiers: [
      { level: 1, modifier: 1, description: '+$1 cash on odd-level deliveries' },
      { level: 2, modifier: 2, description: '+$2 cash on odd-level deliveries' },
      { level: 3, modifier: 4, description: '+$4 cash on odd-level deliveries' },
    ],
  },
  [UPGRADE_TYPES.PARITY_GEARBOX]: {
    name: 'Parity Gearbox',
    description: 'Multi-input Operators like inputs with matching parity.',
    tiers: [
      {
        level: 1,
        modifier: 1.1,
        description: '+10% speed when recipe inputs are all even or all odd',
      },
      {
        level: 2,
        modifier: 1.22,
        description: '+22% speed when recipe inputs are all even or all odd',
      },
      {
        level: 3,
        modifier: 1.38,
        description: '+38% speed when recipe inputs are all even or all odd',
      },
    ],
  },
};

export const TIER_THRESHOLDS = {
  1: 0,
  2: 3,
  3: 8,
};
