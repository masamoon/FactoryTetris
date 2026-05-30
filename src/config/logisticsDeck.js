const LOGISTICS_BELT_TEMPLATES = [
  {
    id: 'belt-line-3',
    name: 'Line Belt',
    shortName: 'I Belt',
    shape: [[1, 1, 1]],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-line-4',
    name: 'Long Belt',
    shortName: 'Long I',
    shape: [[1, 1, 1, 1]],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
    copies: 1,
    unlockRound: 1,
  },
  {
    id: 'belt-elbow',
    name: 'Elbow Belt',
    shortName: 'L Belt',
    shape: [
      [1, 1],
      [1, 0],
    ],
    path: [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
    copies: 3,
    unlockRound: 1,
  },
  {
    id: 'belt-block-turn',
    name: 'Block Turn Belt',
    shortName: 'O Turn',
    shape: [
      [1, 1],
      [1, 1],
    ],
    path: [
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-knee',
    name: 'Knee Belt',
    shortName: 'Knee',
    shape: [
      [1, 1, 1],
      [1, 0, 0],
    ],
    path: [
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-hook',
    name: 'Hook Belt',
    shortName: 'J Belt',
    shape: [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-s',
    name: 'Offset Belt',
    shortName: 'S Belt',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    path: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-z',
    name: 'Reverse Offset Belt',
    shortName: 'Z Belt',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-step-5',
    name: 'Step Belt',
    shortName: 'Step',
    shape: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-snake',
    name: 'Snake Belt',
    shortName: 'Snake',
    shape: [
      [1, 1, 1],
      [1, 1, 0],
    ],
    path: [
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-long-elbow',
    name: 'Long Elbow Belt',
    shortName: 'Big L',
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-u',
    name: 'U Belt',
    shortName: 'U Belt',
    shape: [
      [1, 1, 1],
      [1, 0, 1],
    ],
    path: [
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'belt-crook',
    name: 'Crook Belt',
    shortName: 'Crook',
    shape: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 1, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ],
    copies: 1,
    unlockRound: 1,
  },
  {
    id: 'belt-wide-hook',
    name: 'Wide Hook Belt',
    shortName: 'Wide J',
    shape: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    copies: 1,
    unlockRound: 1,
  },
];

const LOGISTICS_TOOL_TEMPLATES = [
  {
    id: 'free-splitter',
    machineId: 'splitter',
    name: 'Draft Splitter',
    shortName: 'SPLIT',
    shape: [[1], [1]],
    copies: 2,
    unlockRound: 1,
  },
  {
    id: 'free-merger',
    machineId: 'merger',
    name: 'Draft Merger',
    shortName: 'MERGE',
    shape: [[1], [1]],
    copies: 2,
    unlockRound: 1,
  },
];

function mirrorShape(shape) {
  return shape.map((row) => [...row].reverse());
}

function mirrorPath(path, width) {
  return path.map((cell) => ({
    x: width - 1 - cell.x,
    y: cell.y,
  }));
}

function shapeKey(shape) {
  return shape.map((row) => row.join('')).join('/');
}

function createMirroredTemplate(entry) {
  const width = Math.max(...entry.shape.map((row) => row.length));
  const mirroredShape = mirrorShape(entry.shape);
  if (shapeKey(mirroredShape) === shapeKey(entry.shape)) return null;

  return {
    ...entry,
    id: `${entry.id}-mirror`,
    name: `Inverted ${entry.name}`,
    shortName: `Inv ${entry.shortName || entry.name}`.slice(0, 10),
    shape: mirroredShape,
    path: mirrorPath(entry.path, width),
    unlockRound: 1,
  };
}

function createTunnelVariant(entry) {
  return {
    ...entry,
    id: `${entry.id}-tunnel`,
    machineId: 'tunnel',
    name: `${entry.name} Tunnel`,
    shortName: `TUN ${entry.shortName || entry.name}`.slice(0, 10),
    copies: 1,
    tunnelVariant: true,
    draftChance: 0.22,
  };
}

function createPathVariants(entry) {
  return [entry, createTunnelVariant(entry)];
}

export const LOGISTICS_BELT_LIBRARY = LOGISTICS_BELT_TEMPLATES.flatMap((entry) => {
  const normalizedEntry = {
    ...entry,
    machineId: 'conveyor',
    unlockRound: 1,
  };
  const mirroredEntry = createMirroredTemplate(normalizedEntry);
  return mirroredEntry
    ? [...createPathVariants(normalizedEntry), ...createPathVariants(mirroredEntry)]
    : createPathVariants(normalizedEntry);
}).concat(LOGISTICS_TOOL_TEMPLATES);

export function createLogisticsDeckForRound(round = 1) {
  const unlockedRound = Math.max(1, Math.floor(round || 1));
  return expandLogisticsDeck(
    LOGISTICS_BELT_LIBRARY.filter((entry) => (entry.unlockRound || 1) <= unlockedRound)
  );
}

function expandLogisticsDeck(library) {
  return library.flatMap((entry) => {
    if (entry.draftChance != null && Math.random() > entry.draftChance) {
      return [];
    }
    const copies = Math.max(1, Math.floor(entry.copies || 1));
    return Array.from({ length: copies }, (_unused, copyIndex) => ({
      ...entry,
      instanceId: `${entry.id}-${copyIndex + 1}`,
    }));
  });
}
