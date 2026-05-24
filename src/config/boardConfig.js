export const BOARD_BLOCKER_CELL_STYLE = {
  color: 0x273847,
  borderColor: 0x8fb7c9,
};

export const BOARD_TEMPLATES = {
  OPEN_FLOOR: {
    id: 'open-floor',
    name: 'Open Floor',
    description: 'Starter layout with a direct center lane.',
    quotaMultiplier: 0.9,
    sourceInventoryMultiplier: 1.1,
  },
  SPLIT_LANES: {
    id: 'split-lanes',
    name: 'Split Lanes',
    description: 'A center divider leaves one gate between upper and lower lanes.',
    quotaMultiplier: 1,
    sourceInventoryMultiplier: 1,
  },
  CROSSFLOW_GATE: {
    id: 'crossflow-gate',
    name: 'Crossflow Gate',
    description: 'A vertical baffle forces routing through two offset gates.',
    quotaMultiplier: 1.08,
    sourceInventoryMultiplier: 1.12,
  },
  FACTORY_ISLANDS: {
    id: 'factory-islands',
    name: 'Factory Islands',
    description: 'Two dead zones break up the middle and reward edge routing.',
    quotaMultiplier: 1.12,
    sourceInventoryMultiplier: 1.18,
  },
};

export const BOARD_TEMPLATE_SEQUENCE = [
  BOARD_TEMPLATES.SPLIT_LANES.id,
  BOARD_TEMPLATES.CROSSFLOW_GATE.id,
  BOARD_TEMPLATES.FACTORY_ISLANDS.id,
];
