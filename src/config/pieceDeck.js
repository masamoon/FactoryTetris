import { ARITHMETIC_OPERATION_TYPES } from './resourceLevels';

export const STARTER_PIECE_DECK = [
  {
    id: 'starter-refiner-elbow',
    name: 'Elbow Refiner',
    shortName: 'Elbow +1',
    bodyId: 'processor-a',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
    suppressTrait: true,
  },
  {
    id: 'starter-refiner-block',
    name: 'Block Refiner',
    shortName: 'Block +1',
    bodyId: 'processor-c',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
    suppressTrait: true,
  },
  {
    id: 'starter-booster-line',
    name: 'Line Booster',
    shortName: 'Line +2',
    bodyId: 'processor-d',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
    suppressTrait: true,
  },
];

export const STANDARD_PIECE_LIBRARY = [
  {
    id: 'standard-refiner-left',
    name: 'Left Refiner',
    shortName: 'Left +1',
    bodyId: 'processor-a',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
  },
  {
    id: 'standard-refiner-tee',
    name: 'Tee Refiner',
    shortName: 'Tee +1',
    bodyId: 'processor-b',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 1 },
  },
  {
    id: 'standard-booster-line',
    name: 'Line Booster',
    shortName: 'Line +2',
    bodyId: 'processor-d',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
  },
  {
    id: 'standard-booster-elbow',
    name: 'Elbow Booster',
    shortName: 'Elbow +2',
    bodyId: 'processor-e',
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, value: 2 },
  },
  {
    id: 'standard-mixer-block',
    name: 'Block Mixer',
    shortName: 'Mix',
    bodyId: 'processor-c',
    copies: 2,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD },
  },
  {
    id: 'standard-mixer-u',
    name: 'U Mixer',
    shortName: 'U Mix',
    bodyId: 'advanced-processor-1',
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.ADD },
  },
  {
    id: 'standard-multiplier-cross',
    name: 'Multiplier',
    shortName: 'Mult',
    bodyId: 'advanced-processor',
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.MULTIPLY },
  },
  {
    id: 'standard-divider-long',
    name: 'Divider',
    shortName: 'Divide',
    bodyId: 'advanced-processor-2',
    copies: 1,
    arithmeticOperation: { type: ARITHMETIC_OPERATION_TYPES.DIVIDE },
  },
];

export function createPieceDeckForRound(round = 1, starterRounds = 1) {
  const library =
    round <= starterRounds
      ? STARTER_PIECE_DECK
      : [...STARTER_PIECE_DECK, ...STANDARD_PIECE_LIBRARY];
  return expandPieceDeck(library);
}

export function getPieceDeckEntryById(pieceId) {
  return [...STARTER_PIECE_DECK, ...STANDARD_PIECE_LIBRARY].find((entry) => entry.id === pieceId);
}

export function expandPieceDeck(library) {
  return library.flatMap((entry) => {
    const copies = Math.max(1, Math.floor(entry.copies || 1));
    return Array.from({ length: copies }, (_unused, copyIndex) => ({
      ...entry,
      instanceId: `${entry.id}-${copyIndex + 1}`,
    }));
  });
}
