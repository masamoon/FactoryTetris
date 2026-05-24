export const BOARD_BLOCKER_CELL_STYLE = {
  color: 0x273847,
  borderColor: 0x8fb7c9,
};

export const BOARD_TILE_TYPES = {
  POWER: 'power',
  QUALITY: 'quality',
  TAXED: 'taxed',
};

export const BOARD_TILE_STYLES = {
  [BOARD_TILE_TYPES.POWER]: {
    name: 'Power Cell',
    label: 'PWR',
    color: 0x164d3a,
    borderColor: 0x88ffcc,
    glowColor: 0x88ffcc,
    description: 'Machines built here process faster.',
  },
  [BOARD_TILE_TYPES.QUALITY]: {
    name: 'Quality Cell',
    label: 'QLT',
    color: 0x4d4320,
    borderColor: 0xffd166,
    glowColor: 0xffd166,
    description: 'Machines built here boost delivery score.',
  },
  [BOARD_TILE_TYPES.TAXED]: {
    name: 'Taxed Cell',
    label: '$',
    color: 0x4a2430,
    borderColor: 0xff7a90,
    glowColor: 0xff7a90,
    description: 'Machines built here cost extra Funds.',
  },
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
