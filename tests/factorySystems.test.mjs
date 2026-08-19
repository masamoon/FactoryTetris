import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveShapeTopology,
  evaluateFactoryBatch,
  getBatchCycleState,
  getFunctionalOutputPorts,
  isBinaryArithmeticOperation,
  shouldOfferPlayerTunnel,
} from '../src/rules/factorySystems.mjs';
import {
  createFactoryPuzzle,
  FACTORY_PUZZLE_TEMPLATES,
} from '../src/config/factoryPuzzleTemplates.mjs';

test('tee geometry creates an adaptive output manifold', () => {
  const shape = [
    [0, 1, 0],
    [1, 1, 1],
  ];
  const topology = deriveShapeTopology(shape, { x: 0, y: 1 });

  assert.equal(topology.kind, 'manifold');
  assert.deepEqual(topology.outputPorts, [
    { x: 1, y: 0 },
    { x: 2, y: 1 },
  ]);
});

test('closed block geometry creates a reservoir', () => {
  const topology = deriveShapeTopology(
    [
      [1, 1],
      [1, 1],
    ],
    { x: 0, y: 0 }
  );

  assert.equal(topology.kind, 'reservoir');
  assert.equal(topology.bufferBonus, 3);
});

test('Open Manifolds exposes boundary cells without exposing the input cell', () => {
  const ports = getFunctionalOutputPorts({
    shape: [[1, 1, 1]],
    inputPos: { x: 0, y: 0 },
    configuredOutputPos: { x: 2, y: 0 },
    openManifolds: true,
  });

  assert.deepEqual(ports, [
    { x: 2, y: 0 },
    { x: 1, y: 0 },
  ]);
});

test('authored orders share a routing group and require tier branches', () => {
  const puzzle = createFactoryPuzzle({
    round: 4,
    boardId: 'split-lanes',
    orderCount: 2,
  });

  assert.equal(puzzle.templateId, 'split-lane-fork');
  assert.equal(puzzle.orders.length, 2);
  assert.equal(puzzle.orders[0].routingGroup, puzzle.orders[1].routingGroup);
  assert.equal(puzzle.orders[0].exact, true);
  assert.equal(puzzle.orders[1].tier, puzzle.orders[0].tier + 1);
  assert.equal(puzzle.orders[1].exact, false);
  assert.ok(puzzle.batch.cycleLimit >= puzzle.benchmarks.cycles);
});

test('every procedural board family resolves to an authored puzzle premise', () => {
  const puzzles = Object.keys(FACTORY_PUZZLE_TEMPLATES).map((boardId) =>
    createFactoryPuzzle({ round: 8, boardId, orderCount: 3 })
  );

  assert.equal(new Set(puzzles.map((puzzle) => puzzle.templateId)).size, puzzles.length);
  assert.ok(puzzles.every((puzzle) => puzzle.boardId in FACTORY_PUZZLE_TEMPLATES));
  assert.ok(puzzles.every((puzzle) => puzzle.instruction.length > 20));
  assert.ok(
    puzzles.every(
      (puzzle) => new Set(puzzle.orders.map((order) => order.tier)).size === puzzle.orders.length
    )
  );
});

test('finite batch state advances in simulation cycles', () => {
  assert.deepEqual(getBatchCycleState({ elapsedMs: 7400, cycleMs: 1000, cycleLimit: 10 }), {
    used: 7,
    remaining: 3,
    limit: 10,
    complete: false,
  });
  assert.equal(
    getBatchCycleState({ elapsedMs: 12000, cycleMs: 1000, cycleLimit: 10 }).complete,
    true
  );
});

test('factory grading measures cost, waste, and cycles against authored par', () => {
  const grade = evaluateFactoryBatch({
    cost: 40,
    waste: 1,
    cycles: 22,
    benchmarks: { cost: 40, waste: 0, cycles: 20 },
  });

  assert.equal(grade.rank, 'A');
  assert.equal(grade.dimensions.cost.medal, 'gold');
  assert.equal(grade.dimensions.waste.medal, 'silver');
  assert.equal(grade.dimensions.cycles.medal, 'silver');
});

test('mergers enter the toolset only with a binary Operator', () => {
  assert.equal(isBinaryArithmeticOperation({ type: 'add-constant', value: 2 }), false);
  assert.equal(isBinaryArithmeticOperation({ type: 'add' }), true);
  assert.equal(isBinaryArithmeticOperation({ type: 'multiply' }), true);
  assert.equal(isBinaryArithmeticOperation({ type: 'divide' }), true);
});

test('player tunnels require both late progression and a crossing board', () => {
  assert.equal(
    shouldOfferPlayerTunnel({ round: 5, boardId: 'tunnel-works', unlocked: true, unlockRound: 6 }),
    false
  );
  assert.equal(
    shouldOfferPlayerTunnel({ round: 8, boardId: 'open-floor', unlocked: true, unlockRound: 6 }),
    false
  );
  assert.equal(
    shouldOfferPlayerTunnel({ round: 8, boardId: 'tunnel-works', unlocked: false, unlockRound: 6 }),
    false
  );
  assert.equal(
    shouldOfferPlayerTunnel({ round: 8, boardId: 'tunnel-works', unlocked: true, unlockRound: 6 }),
    true
  );
});
