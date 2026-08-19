export function getRoundCompletionState({ primaryOrdersComplete }) {
  return {
    cleared: primaryOrdersComplete === true,
    primaryOrdersComplete: primaryOrdersComplete === true,
  };
}

export function isTimedRound({ isElite = false, isBoss = false } = {}) {
  return isElite === true || isBoss === true;
}

export function getFactoryEditPermissions({
  phase = 'BUILD_PHASE',
  isRelocation = false,
  rewiresRemaining = 0,
} = {}) {
  const productionIsLive = phase === 'ROUND_ACTIVE';

  return {
    canPlace: !productionIsLive || isRelocation === true,
    canPickUp: !productionIsLive || rewiresRemaining > 0,
    canDelete: !productionIsLive,
    canQuickBuild: !productionIsLive,
  };
}

export function deliveryCountsForRound({
  phase = 'BUILD_PHASE',
  countsForQuota = true,
  filledDelivery = false,
} = {}) {
  return phase === 'ROUND_ACTIVE' && countsForQuota !== false && filledDelivery !== true;
}
