import { ARITHMETIC_OPERATION_TYPES } from './resourceLevels';
import { GAME_CONFIG } from './gameConfig';

function getDefaultMachineColorForIndex(index = 0) {
  const colorCycle = GAME_CONFIG.sourceColorCycle || [GAME_CONFIG.defaultItemColor || 'blue'];
  return colorCycle[index % colorCycle.length] || GAME_CONFIG.defaultItemColor || 'blue';
}

const CLASSIC_SINGLE_INPUT_BODIES = [
  { bodyId: 'operator-elbow', suffix: 'elbow-end', shortPrefix: 'L' },
  { bodyId: 'operator-elbow-tip-output', suffix: 'elbow-tip', shortPrefix: 'L Tip' },
  { bodyId: 'operator-hook', suffix: 'hook-end', shortPrefix: 'J' },
  { bodyId: 'operator-hook-tip-output', suffix: 'hook-tip', shortPrefix: 'J Tip' },
  { bodyId: 'operator-tee', suffix: 'tee-end', shortPrefix: 'T' },
  { bodyId: 'operator-tee-stem-output', suffix: 'tee-stem', shortPrefix: 'T Stem' },
  { bodyId: 'operator-s', suffix: 's-end', shortPrefix: 'S' },
  { bodyId: 'operator-s-center-output', suffix: 's-center', shortPrefix: 'S Mid' },
  { bodyId: 'operator-z', suffix: 'z-end', shortPrefix: 'Z' },
  { bodyId: 'operator-z-center-output', suffix: 'z-center', shortPrefix: 'Z Mid' },
];

const BLOCK_BODIES = [
  { bodyId: 'operator-block', suffix: 'block-corner', shortPrefix: 'O' },
  { bodyId: 'operator-block-edge-output', suffix: 'block-edge', shortPrefix: 'O Edge' },
];

const LINE_BODIES = [
  { bodyId: 'operator-line', suffix: 'line-end', shortPrefix: 'Line' },
  { bodyId: 'operator-line-center-output', suffix: 'line-center', shortPrefix: 'Line Mid' },
  { bodyId: 'operator-i', suffix: 'i-end', shortPrefix: 'I' },
  { bodyId: 'operator-i-center-output', suffix: 'i-center', shortPrefix: 'I Mid' },
];

const STARTER_PIECE_TEMPLATES = [
  {
    id: 'starter-refiner-elbow',
    name: 'Refiner',
    shortName: '+1',
    bodyVariants: [...CLASSIC_SINGLE_INPUT_BODIES, ...BLOCK_BODIES, ...LINE_BODIES.slice(0, 2)],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
    suppressTrait: true,
  },
  {
    id: 'starter-booster-line',
    name: 'Booster',
    shortName: '+2',
    bodyVariants: [...LINE_BODIES, ...CLASSIC_SINGLE_INPUT_BODIES.slice(0, 6)],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
    suppressTrait: true,
  },
];

const STANDARD_PIECE_TEMPLATES = [
  {
    id: 'standard-refiner-left',
    name: 'Refiner',
    shortName: '+1',
    bodyVariants: [...CLASSIC_SINGLE_INPUT_BODIES, ...BLOCK_BODIES, ...LINE_BODIES],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
  },
  {
    id: 'standard-booster-line',
    name: 'Booster',
    shortName: '+2',
    bodyVariants: [...LINE_BODIES, ...CLASSIC_SINGLE_INPUT_BODIES],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
  },
  {
    id: 'standard-mixer-block',
    name: 'Adder',
    shortName: 'Add',
    bodyVariants: [...BLOCK_BODIES, ...CLASSIC_SINGLE_INPUT_BODIES.slice(0, 6)],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD },
  },
  {
    id: 'standard-mixer-u',
    name: 'Complex Adder',
    shortName: 'Add',
    bodyVariants: [
      { bodyId: 'operator-u', suffix: 'u-end', shortPrefix: 'U' },
      { bodyId: 'operator-u-bridge-output', suffix: 'u-bridge', shortPrefix: 'U Bridge' },
      { bodyId: 'operator-s', suffix: 's-end', shortPrefix: 'S' },
      { bodyId: 'operator-z', suffix: 'z-end', shortPrefix: 'Z' },
    ],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD },
  },
  {
    id: 'standard-multiplier-cross',
    name: 'Multiplier',
    shortName: 'Mult',
    bodyVariants: [
      { bodyId: 'operator-cross', suffix: 'cross-end', shortPrefix: 'X' },
      { bodyId: 'operator-cross-top-output', suffix: 'cross-top', shortPrefix: 'X Top' },
      { bodyId: 'operator-tee', suffix: 'tee-end', shortPrefix: 'T' },
      { bodyId: 'operator-tee-stem-output', suffix: 'tee-stem', shortPrefix: 'T Stem' },
    ],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.MULTIPLY },
  },
  {
    id: 'standard-divider-long',
    name: 'Divider',
    shortName: 'Divide',
    bodyVariants: [
      { bodyId: 'operator-long-hook', suffix: 'long-hook-end', shortPrefix: 'Long J' },
      {
        bodyId: 'operator-long-hook-inner-output',
        suffix: 'long-hook-inner',
        shortPrefix: 'Long J In',
      },
      { bodyId: 'operator-i', suffix: 'i-end', shortPrefix: 'I' },
      { bodyId: 'operator-i-center-output', suffix: 'i-center', shortPrefix: 'I Mid' },
    ],
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.DIVIDE },
  },
];

export const STARTER_PIECE_DECK = expandBodyVariantTemplates(STARTER_PIECE_TEMPLATES);

export const STANDARD_PIECE_LIBRARY = expandBodyVariantTemplates(STANDARD_PIECE_TEMPLATES);

export function createPieceDeckForRound() {
  return expandPieceDeck(STARTER_PIECE_DECK);
}

export function getPieceDeckEntryById(pieceId) {
  return [...STARTER_PIECE_DECK, ...STANDARD_PIECE_LIBRARY].find((entry) => entry.id === pieceId);
}

export function expandPieceDeck(library) {
  return library.flatMap((entry, entryIndex) => {
    const copies = Math.max(1, Math.floor(entry.copies || 1));
    return Array.from({ length: copies }, (_unused, copyIndex) => ({
      ...entry,
      outputItemColor:
        entry.outputItemColor ||
        entry.machineColor ||
        getDefaultMachineColorForIndex(entryIndex + copyIndex),
      instanceId: `${entry.id}-${copyIndex + 1}`,
    }));
  });
}

function expandBodyVariantTemplates(templates) {
  return templates.flatMap((template) => {
    if (!Array.isArray(template.bodyVariants) || template.bodyVariants.length === 0) {
      return [template];
    }

    return template.bodyVariants.map((variant, index) => {
      const { bodyVariants: _bodyVariants, ...entry } = template;
      return {
        ...entry,
        id: index === 0 ? template.id : `${template.id}-${variant.suffix}`,
        name: `${variant.shortPrefix} ${template.name}`,
        shortName: `${variant.shortPrefix} ${template.shortName || template.name}`,
        bodyId: variant.bodyId,
        outputItemColor:
          variant.outputItemColor ||
          variant.machineColor ||
          entry.outputItemColor ||
          entry.machineColor ||
          getDefaultMachineColorForIndex(index),
      };
    });
  });
}
