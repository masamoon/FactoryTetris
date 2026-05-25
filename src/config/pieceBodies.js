const DEFAULT_PROCESSING_BODY_ID = 'operator-block';

const CARDINAL_DIRECTIONS = ['right', 'down', 'left', 'up'];

function rotatePos(pos, shape, direction) {
  const height = shape.length;
  const width = shape[0].length;

  switch (direction) {
    case 'down':
      return { x: height - 1 - pos.y, y: pos.x };
    case 'left':
      return { x: width - 1 - pos.x, y: height - 1 - pos.y };
    case 'up':
      return { x: pos.y, y: width - 1 - pos.x };
    case 'right':
    default:
      return { x: pos.x, y: pos.y };
  }
}

function buildDirectionalIo(shape, inputPos, outputPos) {
  return Object.fromEntries(
    CARDINAL_DIRECTIONS.map((direction) => [
      direction,
      {
        inputPos: rotatePos(inputPos, shape, direction),
        outputPos: rotatePos(outputPos, shape, direction),
      },
    ])
  );
}

function createBodyWithIo({
  id,
  variantOf = null,
  name,
  label,
  description,
  shape,
  defaultDirection = 'right',
  processingTime = 3000,
  coreColor,
  coreShape = 'circle',
  isComplexBody = false,
  inputPos,
  outputPos,
}) {
  return {
    id,
    ...(variantOf ? { variantOf } : {}),
    name,
    label,
    description,
    shape,
    defaultDirection,
    processingTime,
    coreColor,
    coreShape,
    isComplexBody,
    io: buildDirectionalIo(shape, inputPos, outputPos),
  };
}

const PROCESSING_PIECE_BODY_LIST = [
  {
    id: 'operator-elbow',
    legacyIds: ['processor-a'],
    name: 'Elbow Operator Body',
    label: 'E',
    description: 'Elbow-shaped operator body',
    shape: [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    defaultDirection: 'right',
    processingTime: 3000,
    coreColor: 0x4e79a7,
    coreShape: 'circle',
    isComplexBody: false,
    io: {
      right: { inputPos: { x: 0, y: 0 }, outputPos: { x: 0, y: 2 } },
      down: { inputPos: { x: 2, y: 1 }, outputPos: { x: 0, y: 0 } },
      left: { inputPos: { x: 0, y: 2 }, outputPos: { x: 1, y: 0 } },
      up: { inputPos: { x: 0, y: 0 }, outputPos: { x: 2, y: 1 } },
    },
  },
  {
    id: 'operator-tee',
    legacyIds: ['processor-b'],
    name: 'Tee Operator Body',
    label: 'T',
    description: 'T-shaped operator body',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    defaultDirection: 'right',
    processingTime: 3000,
    coreColor: 0x03fcfc,
    coreShape: 'circle',
    isComplexBody: false,
    io: {
      right: { inputPos: { x: 0, y: 1 }, outputPos: { x: 2, y: 1 } },
      down: { inputPos: { x: 1, y: 0 }, outputPos: { x: 1, y: 2 } },
      left: { inputPos: { x: 2, y: 1 }, outputPos: { x: 0, y: 1 } },
      up: { inputPos: { x: 1, y: 2 }, outputPos: { x: 1, y: 0 } },
    },
  },
  {
    id: 'operator-block',
    legacyIds: ['processor-c'],
    name: 'Block Operator Body',
    label: 'B',
    description: 'Block-shaped operator body',
    shape: [
      [1, 1],
      [1, 1],
    ],
    defaultDirection: 'right',
    processingTime: 3000,
    coreColor: 0xe15759,
    coreShape: 'square',
    isComplexBody: false,
    io: {
      right: { inputPos: { x: 0, y: 0 }, outputPos: { x: 1, y: 1 } },
      down: { inputPos: { x: 1, y: 0 }, outputPos: { x: 0, y: 1 } },
      left: { inputPos: { x: 1, y: 1 }, outputPos: { x: 0, y: 0 } },
      up: { inputPos: { x: 0, y: 1 }, outputPos: { x: 1, y: 0 } },
    },
  },
  {
    id: 'operator-line',
    legacyIds: ['processor-d'],
    name: 'Line Operator Body',
    label: 'L',
    description: 'Line-shaped operator body',
    shape: [[1, 1, 1]],
    defaultDirection: 'right',
    processingTime: 3000,
    coreColor: 0x76b7b2,
    coreShape: 'circle',
    isComplexBody: false,
    io: {
      right: { inputPos: { x: 0, y: 0 }, outputPos: { x: 2, y: 0 } },
      down: { inputPos: { x: 0, y: 0 }, outputPos: { x: 0, y: 2 } },
      left: { inputPos: { x: 2, y: 0 }, outputPos: { x: 0, y: 0 } },
      up: { inputPos: { x: 0, y: 2 }, outputPos: { x: 0, y: 0 } },
    },
  },
  {
    id: 'operator-hook',
    legacyIds: ['processor-e'],
    name: 'Hook Operator Body',
    label: 'H',
    description: 'Hook-shaped operator body',
    shape: [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
    defaultDirection: 'right',
    processingTime: 4000,
    coreColor: 0x59a14f,
    coreShape: 'circle',
    isComplexBody: false,
    io: {
      right: { inputPos: { x: 0, y: 0 }, outputPos: { x: 1, y: 2 } },
      down: { inputPos: { x: 2, y: 0 }, outputPos: { x: 0, y: 1 } },
      left: { inputPos: { x: 1, y: 2 }, outputPos: { x: 0, y: 0 } },
      up: { inputPos: { x: 0, y: 1 }, outputPos: { x: 2, y: 0 } },
    },
  },
  {
    id: 'operator-cross',
    legacyIds: ['advanced-processor'],
    name: 'Cross Operator Body',
    label: 'X',
    description: 'Cross-shaped operator body',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    defaultDirection: 'right',
    processingTime: 5000,
    coreColor: 0xedc948,
    coreShape: 'square',
    isComplexBody: true,
    io: {
      right: { inputPos: { x: 0, y: 1 }, outputPos: { x: 2, y: 1 } },
      down: { inputPos: { x: 1, y: 0 }, outputPos: { x: 1, y: 2 } },
      left: { inputPos: { x: 2, y: 1 }, outputPos: { x: 0, y: 1 } },
      up: { inputPos: { x: 1, y: 2 }, outputPos: { x: 1, y: 0 } },
    },
  },
  {
    id: 'operator-u',
    legacyIds: ['advanced-processor-1'],
    name: 'U Operator Body',
    label: 'U',
    description: 'U-shaped operator body',
    shape: [
      [1, 0, 1],
      [1, 1, 1],
    ],
    defaultDirection: 'down',
    processingTime: 5500,
    coreColor: 0xaa44aa,
    coreShape: 'circle',
    isComplexBody: true,
    io: {
      right: { inputPos: { x: 0, y: 0 }, outputPos: { x: 2, y: 0 } },
      down: { inputPos: { x: 1, y: 0 }, outputPos: { x: 1, y: 2 } },
      left: { inputPos: { x: 2, y: 0 }, outputPos: { x: 0, y: 0 } },
      up: { inputPos: { x: 0, y: 2 }, outputPos: { x: 0, y: 0 } },
    },
  },
  {
    id: 'operator-long-hook',
    legacyIds: ['advanced-processor-2'],
    name: 'Long Hook Operator Body',
    label: 'J',
    description: 'Long hook-shaped operator body',
    shape: [
      [1, 1, 1, 1],
      [1, 0, 0, 0],
    ],
    defaultDirection: 'down',
    processingTime: 6000,
    coreColor: 0xfc039d,
    coreShape: 'circle',
    isComplexBody: true,
    io: {
      right: { inputPos: { x: 0, y: 1 }, outputPos: { x: 3, y: 0 } },
      down: { inputPos: { x: 0, y: 0 }, outputPos: { x: 1, y: 3 } },
      left: { inputPos: { x: 3, y: 0 }, outputPos: { x: 0, y: 1 } },
      up: { inputPos: { x: 1, y: 3 }, outputPos: { x: 0, y: 0 } },
    },
  },
  createBodyWithIo({
    id: 'operator-elbow-tip-output',
    variantOf: 'operator-elbow',
    name: 'Elbow Operator Body - Tip Output',
    label: 'E',
    description: 'Elbow-shaped operator body with output on the short tip',
    shape: [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    processingTime: 3000,
    coreColor: 0x4e79a7,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-tee-stem-output',
    variantOf: 'operator-tee',
    name: 'Tee Operator Body - Stem Output',
    label: 'T',
    description: 'T-shaped operator body with output on the stem',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    processingTime: 3000,
    coreColor: 0x03fcfc,
    inputPos: { x: 0, y: 1 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-block-edge-output',
    variantOf: 'operator-block',
    name: 'Block Operator Body - Edge Output',
    label: 'B',
    description: 'Block-shaped operator body with output on the near edge',
    shape: [
      [1, 1],
      [1, 1],
    ],
    processingTime: 3000,
    coreColor: 0xe15759,
    coreShape: 'square',
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-line-center-output',
    variantOf: 'operator-line',
    name: 'Line Operator Body - Center Output',
    label: 'L',
    description: 'Line-shaped operator body with output in the center',
    shape: [[1, 1, 1]],
    processingTime: 3000,
    coreColor: 0x76b7b2,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-hook-tip-output',
    variantOf: 'operator-hook',
    name: 'Hook Operator Body - Tip Output',
    label: 'H',
    description: 'Hook-shaped operator body with output on the short tip',
    shape: [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
    processingTime: 4000,
    coreColor: 0x59a14f,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-cross-top-output',
    variantOf: 'operator-cross',
    name: 'Cross Operator Body - Top Output',
    label: 'X',
    description: 'Cross-shaped operator body with output on the upper arm',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    processingTime: 5000,
    coreColor: 0xedc948,
    coreShape: 'square',
    isComplexBody: true,
    inputPos: { x: 0, y: 1 },
    outputPos: { x: 1, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-u-bridge-output',
    variantOf: 'operator-u',
    name: 'U Operator Body - Bridge Output',
    label: 'U',
    description: 'U-shaped operator body with output on the bridge',
    shape: [
      [1, 0, 1],
      [1, 1, 1],
    ],
    defaultDirection: 'down',
    processingTime: 5500,
    coreColor: 0xaa44aa,
    isComplexBody: true,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 1 },
  }),
  createBodyWithIo({
    id: 'operator-long-hook-inner-output',
    variantOf: 'operator-long-hook',
    name: 'Long Hook Operator Body - Inner Output',
    label: 'J',
    description: 'Long hook-shaped operator body with output on the inner run',
    shape: [
      [1, 1, 1, 1],
      [1, 0, 0, 0],
    ],
    defaultDirection: 'down',
    processingTime: 6000,
    coreColor: 0xfc039d,
    isComplexBody: true,
    inputPos: { x: 0, y: 1 },
    outputPos: { x: 2, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-i',
    name: 'I Operator Body',
    label: 'I',
    description: 'Classic four-cell line operator body',
    shape: [[1, 1, 1, 1]],
    processingTime: 3500,
    coreColor: 0x86bcb6,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 3, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-i-center-output',
    variantOf: 'operator-i',
    name: 'I Operator Body - Center Output',
    label: 'I',
    description: 'Classic four-cell line operator body with output in the center',
    shape: [[1, 1, 1, 1]],
    processingTime: 3500,
    coreColor: 0x86bcb6,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 2, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-s',
    name: 'S Operator Body',
    label: 'S',
    description: 'Classic S-shaped operator body',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    processingTime: 3500,
    coreColor: 0x8cd17d,
    inputPos: { x: 0, y: 1 },
    outputPos: { x: 2, y: 0 },
  }),
  createBodyWithIo({
    id: 'operator-s-center-output',
    variantOf: 'operator-s',
    name: 'S Operator Body - Center Output',
    label: 'S',
    description: 'Classic S-shaped operator body with output in the center',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    processingTime: 3500,
    coreColor: 0x8cd17d,
    inputPos: { x: 0, y: 1 },
    outputPos: { x: 1, y: 1 },
  }),
  createBodyWithIo({
    id: 'operator-z',
    name: 'Z Operator Body',
    label: 'Z',
    description: 'Classic Z-shaped operator body',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    processingTime: 3500,
    coreColor: 0xf28e2b,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 2, y: 1 },
  }),
  createBodyWithIo({
    id: 'operator-z-center-output',
    variantOf: 'operator-z',
    name: 'Z Operator Body - Center Output',
    label: 'Z',
    description: 'Classic Z-shaped operator body with output in the center',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    processingTime: 3500,
    coreColor: 0xf28e2b,
    inputPos: { x: 0, y: 0 },
    outputPos: { x: 1, y: 0 },
  }),
];

export const PROCESSING_PIECE_BODIES = Object.fromEntries(
  PROCESSING_PIECE_BODY_LIST.map((body) => [body.id, body])
);

export const LEGACY_PROCESSING_PIECE_BODY_ALIASES = Object.fromEntries(
  PROCESSING_PIECE_BODY_LIST.flatMap((body) =>
    (body.legacyIds || []).map((legacyId) => [legacyId, body.id])
  )
);

export function normalizeProcessingPieceBodyId(bodyId) {
  if (PROCESSING_PIECE_BODIES[bodyId]) return bodyId;
  return LEGACY_PROCESSING_PIECE_BODY_ALIASES[bodyId] || DEFAULT_PROCESSING_BODY_ID;
}

export function getProcessingPieceBody(bodyId) {
  return PROCESSING_PIECE_BODIES[normalizeProcessingPieceBodyId(bodyId)];
}

export function getProcessingPieceBodies() {
  return [...PROCESSING_PIECE_BODY_LIST];
}

export function getProcessingPieceBodyAliases() {
  return Object.entries(LEGACY_PROCESSING_PIECE_BODY_ALIASES).map(([aliasId, bodyId]) => ({
    aliasId,
    bodyId,
  }));
}

export function isProcessingPieceBodyId(bodyId) {
  return Boolean(PROCESSING_PIECE_BODIES[bodyId] || LEGACY_PROCESSING_PIECE_BODY_ALIASES[bodyId]);
}

export function getProcessingPieceBodyColorEntries() {
  const canonicalEntries = PROCESSING_PIECE_BODY_LIST.map((body) => [body.id, body.coreColor]);
  const legacyEntries = getProcessingPieceBodyAliases().map(({ aliasId, bodyId }) => [
    aliasId,
    PROCESSING_PIECE_BODIES[bodyId].coreColor,
  ]);

  return [...canonicalEntries, ...legacyEntries];
}

export function getProcessingPieceMachineConfigs() {
  return getProcessingPieceBodies().map((body) => ({
    id: body.id,
    bodyId: body.id,
    category: 'operator',
    machineFamily: 'operator',
    isComplexBody: body.isComplexBody,
    name: body.name,
    shape: body.shape,
    inputTypes: ['purity-resource'],
    outputTypes: ['purity-resource'],
    processingTime: body.processingTime,
    direction: body.defaultDirection,
    defaultDirection: body.defaultDirection,
    requiredInputs: { 'purity-resource': 1 },
    description: body.description,
  }));
}
