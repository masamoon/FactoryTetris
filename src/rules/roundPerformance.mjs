const MEDAL_VALUES = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export function getRoundCompletionState({ primaryOrdersComplete, revenue, target }) {
  const revenueTargetMet = Math.max(0, revenue || 0) >= Math.max(0, target || 0);

  return {
    cleared: primaryOrdersComplete === true,
    primaryOrdersComplete: primaryOrdersComplete === true,
    revenueTargetMet,
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

function getMaterialMedal(remainingSupply, initialSupply) {
  const safeInitialSupply = Math.max(1, initialSupply || 0);
  const ratio = Math.max(0, remainingSupply || 0) / safeInitialSupply;

  if (ratio >= 0.35) return { medal: 'gold', ratio };
  if (ratio >= 0.2) return { medal: 'silver', ratio };
  if (ratio >= 0.05) return { medal: 'bronze', ratio };
  return { medal: 'none', ratio };
}

function getSpaceMedal(footprintCells, compactnessBudget) {
  const safeBudget = Math.max(1, compactnessBudget || 0);
  const ratio = Math.max(0, footprintCells || 0) / safeBudget;

  if (ratio <= 0.75) return { medal: 'gold', ratio };
  if (ratio <= 1) return { medal: 'silver', ratio };
  if (ratio <= 1.25) return { medal: 'bronze', ratio };
  return { medal: 'none', ratio };
}

function getFlowMedal(bestFlowStreak) {
  const streak = Math.max(0, Math.floor(bestFlowStreak || 0));

  if (streak >= 8) return { medal: 'gold', streak };
  if (streak >= 5) return { medal: 'silver', streak };
  if (streak >= 3) return { medal: 'bronze', streak };
  return { medal: 'none', streak };
}

export function evaluateRoundPerformance({
  remainingSupply = 0,
  initialSupply = 0,
  footprintCells = 0,
  compactnessBudget = 1,
  bestFlowStreak = 0,
} = {}) {
  const dimensions = {
    material: getMaterialMedal(remainingSupply, initialSupply),
    space: getSpaceMedal(footprintCells, compactnessBudget),
    flow: getFlowMedal(bestFlowStreak),
  };
  const score = Object.values(dimensions).reduce(
    (total, dimension) => total + MEDAL_VALUES[dimension.medal],
    0
  );
  const rank = score >= 8 ? 'S' : score >= 6 ? 'A' : score >= 4 ? 'B' : 'C';

  return { rank, score, dimensions };
}
