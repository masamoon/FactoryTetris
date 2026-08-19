const DEFAULT_COLOR = 'blue';

export const FACTORY_PUZZLE_TEMPLATES = {
  'open-floor': {
    id: 'open-floor-trunk',
    name: 'Shared Trunk',
    instruction: 'Build one trunk, then branch exact intermediate goods before final refinement.',
    baseCycles: 24,
    baseCost: 18,
    costPerOrder: 8,
  },
  'split-lanes': {
    id: 'split-lane-fork',
    name: 'Gate Fork',
    instruction: 'Share production before the gate; send exact and refined goods into separate lanes.',
    baseCycles: 30,
    baseCost: 22,
    costPerOrder: 9,
  },
  'crossflow-gate': {
    id: 'crossflow-ladder',
    name: 'Crossflow Ladder',
    instruction: 'Route a common intermediate through the baffle, then split across offset exits.',
    baseCycles: 32,
    baseCost: 24,
    costPerOrder: 9,
  },
  'factory-islands': {
    id: 'island-bus',
    name: 'Island Bus',
    instruction: 'Choose which side carries the shared bus and where each order leaves it.',
    baseCycles: 34,
    baseCost: 26,
    costPerOrder: 10,
  },
  'toll-maze': {
    id: 'toll-spine',
    name: 'Toll Spine',
    instruction: 'Commit to one paid spine or a longer shared route before branching.',
    baseCycles: 38,
    baseCost: 30,
    costPerOrder: 10,
  },
  'tunnel-works': {
    id: 'tunnel-bus',
    name: 'Tunnel Bus',
    instruction: 'Use the fixed tunnels as a common bus and peel orders off at different depths.',
    baseCycles: 40,
    baseCost: 32,
    costPerOrder: 11,
  },
  'furnace-rows': {
    id: 'furnace-ladder',
    name: 'Furnace Ladder',
    instruction: 'Build one refinement ladder through the safe cells and tap each required tier.',
    baseCycles: 42,
    baseCost: 34,
    costPerOrder: 11,
  },
};

export function getFactoryPuzzleTemplate(boardId = 'open-floor') {
  return FACTORY_PUZZLE_TEMPLATES[boardId] || FACTORY_PUZZLE_TEMPLATES['open-floor'];
}

export function createFactoryPuzzle({
  round = 1,
  boardId = 'open-floor',
  orderCount = 1,
  colorCycle = [DEFAULT_COLOR],
  colorDemandRound = 7,
} = {}) {
  const template = getFactoryPuzzleTemplate(boardId);
  const safeRound = Math.max(1, Math.floor(round || 1));
  const safeOrderCount = Math.max(1, Math.min(3, Math.floor(orderCount || 1)));
  const highestUniqueBaseTier = Math.max(2, 7 - safeOrderCount);
  const baseTier = Math.min(
    highestUniqueBaseTier,
    2 + Math.floor(Math.max(0, safeRound - 1) / 3)
  );
  const baseCount = safeRound === 1 ? 1 : Math.min(4, 2 + Math.floor((safeRound - 1) / 4));
  const color =
    safeRound >= colorDemandRound
      ? colorCycle[(safeRound + boardId.length) % Math.max(1, colorCycle.length)] || DEFAULT_COLOR
      : null;
  const routingGroup = `${template.id}-L${baseTier}`;
  const orders = Array.from({ length: safeOrderCount }, (_unused, index) => {
    const tier = Math.min(6, baseTier + index);
    const exact = index < safeOrderCount - 1;
    const requiredCount = Math.max(1, baseCount + (index === 0 && safeOrderCount > 1 ? 1 : 0));
    return {
      tier,
      exact,
      requiredCount,
      itemColor: color,
      requiredItemColor: color,
      strictItemColor: Boolean(color),
      routingGroup,
      sharedStageTier: baseTier,
      branchIndex: index,
      branchCount: safeOrderCount,
    };
  });
  const totalDemand = orders.reduce((sum, order) => sum + order.requiredCount, 0);
  const highestTier = Math.max(...orders.map((order) => order.tier));
  const cycleLimit = Math.min(
    52,
    template.baseCycles + (safeOrderCount - 1) * 4 + Math.min(8, safeRound - 1)
  );
  const costBenchmark =
    template.baseCost + template.costPerOrder * safeOrderCount + (highestTier - 2) * 3;

  return {
    id: `${template.id}-r${safeRound}`,
    templateId: template.id,
    name: template.name,
    instruction: template.instruction,
    boardId,
    routingGroup,
    orders,
    batch: {
      cycleMs: 1000,
      cycleLimit,
      sourceUnitsPerSource: Math.max(4, Math.ceil(totalDemand * 1.35)),
    },
    benchmarks: {
      cost: costBenchmark,
      waste: 0,
      cycles: Math.max(8, Math.ceil(cycleLimit * 0.72)),
    },
  };
}
