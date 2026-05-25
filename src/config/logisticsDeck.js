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
    copies: 3,
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
    copies: 2,
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
  },
];

export const LOGISTICS_BELT_LIBRARY = LOGISTICS_BELT_TEMPLATES;

export function createLogisticsDeckForRound() {
  return expandLogisticsDeck(LOGISTICS_BELT_LIBRARY);
}

function expandLogisticsDeck(library) {
  return library.flatMap((entry) => {
    const copies = Math.max(1, Math.floor(entry.copies || 1));
    return Array.from({ length: copies }, (_unused, copyIndex) => ({
      ...entry,
      instanceId: `${entry.id}-${copyIndex + 1}`,
    }));
  });
}
