import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deliveryCountsForRound,
  getFactoryEditPermissions,
  getRoundCompletionState,
  isTimedRound,
} from '../src/rules/roundPerformance.mjs';

test('unfinished orders never clear a round', () => {
  assert.deepEqual(
    getRoundCompletionState({
      primaryOrdersComplete: false,
    }),
    {
      cleared: false,
      primaryOrdersComplete: false,
    }
  );
});

test('finishing every primary order clears the round', () => {
  assert.deepEqual(
    getRoundCompletionState({
      primaryOrdersComplete: true,
    }),
    {
      cleared: true,
      primaryOrdersComplete: true,
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

test('completed docks cannot advance round delivery rewards', () => {
  assert.equal(deliveryCountsForRound({ phase: 'ROUND_ACTIVE' }), true);
  assert.equal(
    deliveryCountsForRound({ phase: 'ROUND_ACTIVE', filledDelivery: true }),
    false
  );
  assert.equal(
    deliveryCountsForRound({ phase: 'ROUND_ACTIVE', countsForQuota: false }),
    false
  );
});
