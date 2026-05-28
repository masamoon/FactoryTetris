export const BOARD_BLOCKER_CELL_STYLE = {
  color: 0x273847,
  borderColor: 0x8fb7c9,
};

export const BOARD_OBSTACLE_TYPES = {
  WALL: 'wall',
  SCRAP: 'scrap',
  HEAT: 'heat',
  LOCKED: 'locked',
};

export const BOARD_OBSTACLE_STYLES = {
  [BOARD_OBSTACLE_TYPES.WALL]: {
    name: 'Barrier',
    color: 0x273847,
    borderColor: 0x8fb7c9,
    description: 'Blocks machine placement.',
  },
  [BOARD_OBSTACLE_TYPES.SCRAP]: {
    name: 'Scrap Heap',
    color: 0x3f3430,
    borderColor: 0xffb36b,
    description: 'Blocks machine placement.',
  },
  [BOARD_OBSTACLE_TYPES.HEAT]: {
    name: 'Heat Vent',
    color: 0x4b2630,
    borderColor: 0xff6b5f,
    description: 'Blocks machine placement.',
  },
  [BOARD_OBSTACLE_TYPES.LOCKED]: {
    name: 'Locked Bay',
    color: 0x222b3f,
    borderColor: 0x9aa7ff,
    description: 'Blocks machine placement.',
  },
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
    description: 'Machines built here cost extra Budget.',
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
  TOLL_MAZE: {
    id: 'toll-maze',
    name: 'Toll Maze',
    description: 'Taxed shortcuts and blocker teeth make cheap routing awkward.',
    quotaMultiplier: 1.16,
    sourceInventoryMultiplier: 1.18,
  },
  TUNNEL_WORKS: {
    id: 'tunnel-works',
    name: 'Tunnel Works',
    description: 'Broken lanes and loaner tunnels create forced crossings.',
    quotaMultiplier: 1.18,
    sourceInventoryMultiplier: 1.2,
  },
  FURNACE_ROWS: {
    id: 'furnace-rows',
    name: 'Furnace Rows',
    description: 'Heat vents form staggered rows with taxed pockets between them.',
    quotaMultiplier: 1.2,
    sourceInventoryMultiplier: 1.22,
  },
};

export const BOARD_TEMPLATE_SEQUENCE = [
  BOARD_TEMPLATES.SPLIT_LANES.id,
  BOARD_TEMPLATES.CROSSFLOW_GATE.id,
  BOARD_TEMPLATES.FACTORY_ISLANDS.id,
  BOARD_TEMPLATES.TOLL_MAZE.id,
  BOARD_TEMPLATES.TUNNEL_WORKS.id,
  BOARD_TEMPLATES.FURNACE_ROWS.id,
];
