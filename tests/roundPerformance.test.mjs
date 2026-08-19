import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateRoundPerformance,
  getFactoryEditPermissions,
  getRoundCompletionState,
  isTimedRound,
} from '../src/rules/roundPerformance.mjs';

test('revenue target alone never clears a round with unfinished orders', () => {
  assert.deepEqual(
    getRoundCompletionState({
      primaryOrdersComplete: false,
      revenue: 900,
      target: 500,
    }),
    {
      cleared: false,
      primaryOrdersComplete: false,
      revenueTargetMet: true,
    }
  );
});

test('finishing every primary order clears even below the revenue target', () => {
  assert.deepEqual(
    getRoundCompletionState({
      primaryOrdersComplete: true,
      revenue: 420,
      target: 500,
    }),
    {
      cleared: true,
      primaryOrdersComplete: true,
      revenueTargetMet: false,
    }
  );
});

test('only Surge and Boss pacing variants are timed', () => {
  assert.equal(isTimedRound({}), false);
  assert.equal(isTimedRound({ isElite: true }), true);
  assert.equal(isTimedRound({ isBoss: true }), true);
});

test('production locks construction but permits one picked-up relocation', () => {
  assert.deepEqual(getFactoryEditPermissions({ phase: 'ROUND_ACTIVE', rewiresRemaining: 1 }), {
    canPlace: false,
    canPickUp: true,
    canDelete: false,
    canQuickBuild: false,
  });
  assert.equal(
    getFactoryEditPermissions({ phase: 'ROUND_ACTIVE', isRelocation: true }).canPlace,
    true
  );
  assert.equal(
    getFactoryEditPermissions({ phase: 'ROUND_ACTIVE', rewiresRemaining: 0 }).canPickUp,
    false
  );
});

test('factory performance combines material, space, and flow medals', () => {
  assert.deepEqual(
    evaluateRoundPerformance({
      remainingSupply: 40,
      initialSupply: 100,
      footprintCells: 9,
      compactnessBudget: 12,
      bestFlowStreak: 5,
    }),
    {
      rank: 'S',
      score: 8,
      dimensions: {
        material: { medal: 'gold', ratio: 0.4 },
        space: { medal: 'gold', ratio: 0.75 },
        flow: { medal: 'silver', streak: 5 },
      },
    }
  );
});

test('a wasteful, sprawling, stop-start clear still earns a completion grade', () => {
  const result = evaluateRoundPerformance({
    remainingSupply: 0,
    initialSupply: 100,
    footprintCells: 20,
    compactnessBudget: 12,
    bestFlowStreak: 1,
  });

  assert.equal(result.rank, 'C');
  assert.equal(result.score, 0);
  assert.equal(result.dimensions.material.medal, 'none');
  assert.equal(result.dimensions.space.medal, 'none');
  assert.equal(result.dimensions.flow.medal, 'none');
});
