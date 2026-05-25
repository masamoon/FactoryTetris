#!/usr/bin/env node

/*
 * Engagement simulator for Gridforge.
 *
 * This is not a headless Phaser playthrough. It is a deterministic pacing model
 * that mirrors the round, quota, demand, supply, board, and shop formulas closely
 * enough to identify likely friction spikes before playtests.
 */

const DEFAULTS = {
  sessions: 4000,
  rounds: 12,
  seed: 'gridforge-engagement',
};

const GAME = {
  initialNodeCount: 3,
  roundBaseQuota: 320,
  roundQuotaGrowth: 1.34,
  roundQuotaFlatGrowth: 115,
  roundSourceBaseInventory: 24,
  roundSourceInventoryGrowth: 5,
  roundSourceInventoryVariance: 2,
  roundBaseMoney: 28,
  roundMoneyGrowth: 8,
  roundClearBonus: 18,
  deliveryNodeCompletionScoreBase: 420,
  deliveryNodeCompletionScorePerTier: 160,
  deliveryNodeCompletionScorePerItem: 85,
  deliveryNodeCompletionScrapBase: 2,
  deliveryNodeCompletionScrapPerTier: 0.5,
  deliveryNodeCompletionScrapPerItem: 0.35,
  maxDeliveryNodesPerRound: 7,
  shopRoundClearScrap: 6,
  shopOverkillScorePerScrap: 250,
  sourceColorCycle: ['blue', 'yellow', 'red', 'green'],
  itemColors: {
    blue: { name: 'Blue', scoreMultiplier: 1.05 },
    yellow: { name: 'Yellow', scoreMultiplier: 1.1 },
    red: { name: 'Red', scoreMultiplier: 1.15 },
    green: { name: 'Green', scoreMultiplier: 1.05 },
    purple: { name: 'Purple', scoreMultiplier: 1.2 },
  },
  machinePlacementCosts: {
    conveyor: 1,
    splitter: 4,
    merger: 4,
    underground: 5,
    painter: 3,
    refiner: 8,
    booster: 11,
    adder: 15,
    divider: 16,
    multiplier: 26,
  },
  pacingConfig: {
    roundsPerAct: 4,
    eliteRoundInAct: 3,
    bossRoundInAct: 4,
    eliteQuotaMultiplier: 1.04,
    eliteSourceMultiplier: 1.05,
    eliteCompletionScoreMultiplier: 1.1,
    eliteCompletionScrapBonus: 1,
    bossQuotaMultiplier: 1.1,
    bossSourceMultiplier: 1.16,
    bossRequiredCountBonus: 1,
    bossCompletionScoreMultiplier: 1.25,
    bossCompletionScrapBonus: 3,
    bossRoundClearScrapBonus: 4,
  },
};

const BOARD_TEMPLATES = {
  OPEN_FLOOR: {
    id: 'open-floor',
    name: 'Open Floor',
    quotaMultiplier: 0.9,
    sourceInventoryMultiplier: 1.1,
  },
  SPLIT_LANES: {
    id: 'split-lanes',
    name: 'Split Lanes',
    quotaMultiplier: 1,
    sourceInventoryMultiplier: 1,
  },
  CROSSFLOW_GATE: {
    id: 'crossflow-gate',
    name: 'Crossflow Gate',
    quotaMultiplier: 1.08,
    sourceInventoryMultiplier: 1.12,
  },
  FACTORY_ISLANDS: {
    id: 'factory-islands',
    name: 'Factory Islands',
    quotaMultiplier: 1.12,
    sourceInventoryMultiplier: 1.18,
  },
};

const BOARD_TEMPLATE_SEQUENCE = [
  BOARD_TEMPLATES.SPLIT_LANES.id,
  BOARD_TEMPLATES.CROSSFLOW_GATE.id,
  BOARD_TEMPLATES.FACTORY_ISLANDS.id,
];

const OPERATION_TAGS = ['op:add-one', 'op:add-two', 'op:add'];

const PROFILES = [
  {
    id: 'newcomer',
    label: 'Newcomer',
    planningSkill: 0.46,
    routingSkill: 0.44,
    economySkill: 0.42,
    learningRate: 0.055,
    noveltyNeed: 0.76,
    failureTolerance: 0.36,
    shopDiscipline: 0.4,
  },
  {
    id: 'casual',
    label: 'Casual',
    planningSkill: 0.58,
    routingSkill: 0.58,
    economySkill: 0.54,
    learningRate: 0.045,
    noveltyNeed: 0.62,
    failureTolerance: 0.52,
    shopDiscipline: 0.56,
  },
  {
    id: 'optimizer',
    label: 'Optimizer',
    planningSkill: 0.74,
    routingSkill: 0.72,
    economySkill: 0.68,
    learningRate: 0.032,
    noveltyNeed: 0.46,
    failureTolerance: 0.72,
    shopDiscipline: 0.78,
  },
];

function parseArgs(argv) {
  return argv.reduce(
    (args, part) => {
      const match = part.match(/^--([^=]+)=(.+)$/);
      if (!match) return args;
      const [, key, rawValue] = match;
      if (key === 'sessions' || key === 'rounds') {
        args[key] = Math.max(1, Math.floor(Number(rawValue) || args[key]));
      } else if (key === 'seed') {
        args.seed = rawValue;
      }
      return args;
    },
    { ...DEFAULTS }
  );
}

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let seed = hashSeed(seedText);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function pick(items, rng) {
  return items[randomInt(rng, 0, items.length - 1)];
}

function getRoundPacing(round) {
  const config = GAME.pacingConfig;
  const roundsPerAct = config.roundsPerAct;
  const act = Math.floor((Math.max(1, round) - 1) / roundsPerAct) + 1;
  const roundInAct = ((Math.max(1, round) - 1) % roundsPerAct) + 1;
  const isBoss = roundInAct === config.bossRoundInAct;
  const isElite = !isBoss && roundInAct === config.eliteRoundInAct;
  return {
    act,
    roundInAct,
    isBoss,
    isElite,
    stage: isBoss ? 'BOSS' : isElite ? 'SURGE' : 'BUILD',
    quotaMultiplier: isBoss
      ? config.bossQuotaMultiplier
      : isElite
        ? config.eliteQuotaMultiplier
        : 1,
    sourceMultiplier: isBoss
      ? config.bossSourceMultiplier
      : isElite
        ? config.eliteSourceMultiplier
        : 1,
    requiredCountBonus: isBoss ? config.bossRequiredCountBonus : 0,
    completionScoreMultiplier: isBoss
      ? config.bossCompletionScoreMultiplier
      : isElite
        ? config.eliteCompletionScoreMultiplier
        : 1,
    completionScrapBonus: isBoss
      ? config.bossCompletionScrapBonus
      : isElite
        ? config.eliteCompletionScrapBonus
        : 0,
  };
}

function createRoundBoard(round, runSeed) {
  if (round <= 1) {
    return {
      ...BOARD_TEMPLATES.OPEN_FLOOR,
      round,
      blockerCount: 0,
      specialTileCount: 1,
      laneComplexity: 0.06,
    };
  }

  const rng = createRng(`${runSeed}:board:${round}`);
  const pacing = getRoundPacing(round);
  if (pacing.isBoss) {
    const template =
      Object.values(BOARD_TEMPLATES).find(
        (entry) =>
          entry.id === BOARD_TEMPLATE_SEQUENCE[(pacing.act - 1) % BOARD_TEMPLATE_SEQUENCE.length]
      ) || BOARD_TEMPLATES.SPLIT_LANES;
    const complexity =
      template.id === BOARD_TEMPLATES.SPLIT_LANES.id
        ? 0.18
        : template.id === BOARD_TEMPLATES.CROSSFLOW_GATE.id
          ? 0.26
          : 0.31;
    return {
      ...template,
      round,
      blockerCount: template.id === BOARD_TEMPLATES.FACTORY_ISLANDS.id ? 8 : 7,
      specialTileCount: template.id === BOARD_TEMPLATES.FACTORY_ISLANDS.id ? 4 : 3,
      laneComplexity: complexity,
    };
  }
  const unlocked =
    round <= 3
      ? [BOARD_TEMPLATES.SPLIT_LANES.id, BOARD_TEMPLATES.CROSSFLOW_GATE.id]
      : BOARD_TEMPLATE_SEQUENCE;
  const fallback = BOARD_TEMPLATE_SEQUENCE[(round - 2) % BOARD_TEMPLATE_SEQUENCE.length];
  const templateId = rng() < 0.55 ? pick(unlocked, rng) : fallback;
  const template = Object.values(BOARD_TEMPLATES).find((entry) => entry.id === templateId);

  if (templateId === BOARD_TEMPLATES.SPLIT_LANES.id) {
    return { ...template, round, blockerCount: 5, specialTileCount: 3, laneComplexity: 0.18 };
  }
  if (templateId === BOARD_TEMPLATES.CROSSFLOW_GATE.id) {
    return { ...template, round, blockerCount: 7, specialTileCount: 3, laneComplexity: 0.26 };
  }
  return { ...template, round, blockerCount: 8, specialTileCount: 4, laneComplexity: 0.31 };
}

function getRoundQuota(round, board) {
  return Math.round(
    (GAME.roundBaseQuota * Math.pow(GAME.roundQuotaGrowth, Math.max(0, round - 1)) +
      GAME.roundQuotaFlatGrowth * (round - 1)) *
      board.quotaMultiplier *
      getRoundPacing(round).quotaMultiplier
  );
}

function getRoundSourceInventory(round, board) {
  const wave = (round % 3) * GAME.roundSourceInventoryVariance;
  return Math.max(
    1,
    Math.floor(
      (GAME.roundSourceBaseInventory +
        Math.max(0, round - 1) * GAME.roundSourceInventoryGrowth +
        wave) *
        board.sourceInventoryMultiplier *
        getRoundPacing(round).sourceMultiplier
    )
  );
}

function getSourceCount(round) {
  return GAME.initialNodeCount + Math.floor((round - 1) / 2);
}

function getDeliveryNodeCount(round) {
  if (round <= 1) return 1;
  if (round === 2) return 1;
  if (round === 3) return 1;
  if (round <= 6) return 2;
  const pacing = getRoundPacing(round);
  if (pacing.isElite) return Math.min(GAME.maxDeliveryNodesPerRound, 1 + pacing.act);
  if (pacing.isBoss) return Math.min(GAME.maxDeliveryNodesPerRound, 1 + pacing.act);
  return Math.min(GAME.maxDeliveryNodesPerRound, 2 + Math.floor(Math.max(0, round - 5) / 3));
}

function createDeliveryCondition(round, index, runSeed) {
  const rng = createRng(`${runSeed}:delivery-${round}:${index}`);
  const pacing = getRoundPacing(round);
  const baseTier = 2 + Math.floor((round - 2 + Math.max(0, index)) / 3);
  const tierJitter = round >= 5 && rng() < 0.35 ? (rng() < 0.55 ? -1 : 1) : 0;
  const tier = round <= 2 ? 2 : Math.max(2, Math.min(6, baseTier + tierJitter));
  const exactOffset = round >= 3 ? randomInt(rng, 0, 1) : 0;
  const exact =
    (pacing.isBoss && (index === 0 || pacing.act >= 2)) ||
    (round >= 4 && !pacing.isBoss && (index + exactOffset) % 2 === 0);
  const countJitter = round >= 4 ? randomInt(rng, -1, 1) : 0;
  let requiredCount = Math.max(
    1,
    Math.min(7, round === 1 ? 1 : 2 + Math.floor((round - 1) / 3) + (index % 2) + countJitter)
  );
  if (round === 3) requiredCount = Math.min(requiredCount, 3);
  if (pacing.isBoss) requiredCount = Math.min(8, requiredCount + pacing.requiredCountBonus);
  const colorOffset = randomInt(rng, 0, GAME.sourceColorCycle.length - 1);
  const wantsColorDemand =
    (round === 3 && index === 1) ||
    (round > 3 && (!pacing.isBoss || pacing.act > 1 || index % 2 === 1));
  const itemColor = wantsColorDemand
    ? GAME.sourceColorCycle[(round + index + colorOffset - 2) % GAME.sourceColorCycle.length]
    : null;
  const requiredLastOperationTag =
    round >= 8 &&
    (index === getDeliveryNodeCount(round) - 1 ||
      (pacing.isBoss && pacing.act >= 2 && index % 2 === 0) ||
      (round >= 9 && index % 3 === 2))
      ? OPERATION_TAGS[
          (round + index + randomInt(rng, 0, OPERATION_TAGS.length - 1)) % OPERATION_TAGS.length
        ]
      : null;
  const completionScoreReward = Math.floor(
    (GAME.deliveryNodeCompletionScoreBase +
      tier * GAME.deliveryNodeCompletionScorePerTier +
      requiredCount * GAME.deliveryNodeCompletionScorePerItem +
      (itemColor ? 180 : 0) +
      (requiredLastOperationTag ? 260 : 0)) *
      pacing.completionScoreMultiplier
  );
  const completionScrapReward =
    Math.ceil(
      GAME.deliveryNodeCompletionScrapBase +
        tier * GAME.deliveryNodeCompletionScrapPerTier +
        requiredCount * GAME.deliveryNodeCompletionScrapPerItem
    ) +
    (itemColor ? 1 : 0) +
    (requiredLastOperationTag ? 1 : 0) +
    pacing.completionScrapBonus;

  return {
    tier,
    exact,
    requiredCount,
    itemColor,
    requiredLastOperationTag,
    pacingStage: pacing.stage,
    completionScoreReward,
    completionScrapReward,
  };
}

function getPurityPoints(purity) {
  const basePoints = [5, 15, 40, 100, 250];
  if (purity <= basePoints.length) return basePoints[purity - 1];
  return basePoints[4] * Math.pow(2, purity - 5);
}

function getChainMultiplier(chainCount) {
  const multipliers = [1.0, 1.2, 1.5, 2.0, 3.0];
  if (chainCount <= multipliers.length) return multipliers[chainCount - 1];
  return 3.0 + (chainCount - 5) * 0.5;
}

function getDeliveryItemScore(demand, state) {
  const tier = demand.tier;
  const chainCount = Math.max(1, Math.min(tier, 7));
  const colorMultiplier = demand.itemColor
    ? GAME.itemColors[demand.itemColor].scoreMultiplier
    : 1.05;
  const qualityMultiplier = state.qualityUseRate > 0 ? 1 + 0.15 * state.qualityUseRate : 1;
  return Math.floor(
    getPurityPoints(tier) * getChainMultiplier(chainCount) * colorMultiplier * qualityMultiplier
  );
}

function getFlowDeliveryMultiplier(streak) {
  return Math.min(1.35, 1 + Math.min(12, Math.max(0, streak)) * 0.035);
}

function getDemandComplexity(demand, round, state) {
  let complexity = 0.1 + Math.max(0, demand.tier - 2) * 0.075;
  if (demand.exact) complexity += 0.13;
  if (demand.itemColor) complexity += 0.12 * (1 - state.colorControl);
  if (demand.requiredLastOperationTag) {
    complexity += state.operationTags.has(demand.requiredLastOperationTag) ? 0.08 : 0.28;
  }
  if (demand.tier > state.maxTier) {
    complexity += 0.24 + (demand.tier - state.maxTier) * 0.12;
  }
  if (round === 3 && demand.exact) complexity += 0.06;
  return complexity;
}

function getRoundComplexity(round, board, demands, state) {
  const demandAverage =
    demands.reduce((sum, demand) => sum + getDemandComplexity(demand, round, state), 0) /
    Math.max(1, demands.length);
  const parallelPressure = Math.max(0, demands.length - 2) * 0.055;
  const boardPressure = board.laneComplexity || 0;
  const supplyPerDemand =
    (getSourceCount(round) * getRoundSourceInventory(round, board)) /
    Math.max(
      1,
      demands.reduce((sum, demand) => sum + demand.requiredCount, 0)
    );
  const supplyPressure = supplyPerDemand < 3.8 ? (3.8 - supplyPerDemand) * 0.06 : 0;
  return demandAverage + parallelPressure + boardPressure + supplyPressure;
}

function estimateBuildBudgetFit(round, demands) {
  const baseLogistics = 8 + demands.length * 4;
  const operators = demands.reduce((sum, demand) => {
    const tierCost =
      demand.tier <= 3 ? GAME.machinePlacementCosts.booster : GAME.machinePlacementCosts.adder;
    return sum + Math.min(3, Math.max(1, demand.tier - 1)) * tierCost * 0.48;
  }, 0);
  const colorCost = demands.some((demand) => demand.itemColor)
    ? GAME.machinePlacementCosts.painter * 1.5
    : 0;
  const operationCost = demands.some((demand) => demand.requiredLastOperationTag)
    ? GAME.machinePlacementCosts.adder * 0.7
    : 0;
  const estimatedCost = baseLogistics + operators + colorCost + operationCost;
  const budget = GAME.roundBaseMoney + Math.max(0, round - 1) * GAME.roundMoneyGrowth;
  return clamp((budget - estimatedCost) / 45 + 0.55, 0, 1);
}

function getMomentTags(round, board, demands, clear, state) {
  const pacing = getRoundPacing(round);
  const tags = [];
  if (round === 1) tags.push('first_delivery');
  if (pacing.isElite) tags.push(`act_${pacing.act}_surge`);
  if (pacing.isBoss) tags.push(`act_${pacing.act}_boss`);
  if (clear) tags.push('round_clear');
  if (board.name !== state.lastBoardName) tags.push(`board:${board.name}`);
  if (demands.some((demand) => demand.tier >= 4) && !state.seenL4) tags.push('first_L4_plus');
  if (demands.some((demand) => demand.requiredLastOperationTag) && !state.seenOperationDemand) {
    tags.push('first_operation_demand');
  }
  if (state.scrap >= 5) tags.push('shop_purchase_window');
  return tags;
}

function updateRunProgression(state, rng, profile, clear, overkillScore, completedDemands) {
  if (!clear) return;

  const bossClearBonus = completedDemands.some((demand) => demand.pacingStage === 'BOSS')
    ? GAME.pacingConfig.bossRoundClearScrapBonus
    : 0;
  const scrapGain =
    GAME.shopRoundClearScrap +
    bossClearBonus +
    Math.floor(Math.max(0, overkillScore) / GAME.shopOverkillScorePerScrap) +
    completedDemands.reduce((sum, demand) => sum + demand.completionScrapReward, 0);
  state.scrap += scrapGain;

  const spendChance = clamp(profile.shopDiscipline + profile.economySkill * 0.25, 0.1, 0.92);
  while (state.scrap >= 4 && rng() < spendChance) {
    const roll = rng();
    if (roll < 0.34) {
      state.maxTier = Math.min(7, state.maxTier + (rng() < 0.4 ? 1 : 0));
      state.operationTags.add(rng() < 0.55 ? 'op:add' : pick(OPERATION_TAGS, rng));
      state.scrap -= rng() < 0.5 ? 4 : 6;
    } else if (roll < 0.58) {
      state.colorControl = clamp(state.colorControl + 0.14, 0, 0.9);
      state.scrap -= 4;
    } else if (roll < 0.78) {
      state.qualityUseRate = clamp(state.qualityUseRate + 0.12, 0, 0.75);
      state.scrap -= 5;
    } else {
      state.economyLift = clamp(state.economyLift + 0.06, 0, 0.5);
      state.scrap -= 8;
    }
  }

  state.maxTier = Math.min(7, state.maxTier + (rng() < 0.2 ? 1 : 0));
  state.skill += profile.learningRate * (1 + completedDemands.length * 0.08);
}

function getVoluntaryStopRisk(round, clear, roundRecord, profile, state) {
  if (!clear) return 1;
  let risk = 0.035;
  if (round === 1 && roundRecord.firstDeliveryDelay > 50) risk += 0.09;
  if (roundRecord.complexityDelta > 0.18) risk += roundRecord.complexityDelta * 0.55;
  if (roundRecord.planConfidence < 0.52) risk += (0.52 - roundRecord.planConfidence) * 0.32;
  if (state.scrap < 4 && round >= 2) risk += 0.055;
  if (roundRecord.novelty < profile.noveltyNeed)
    risk += (profile.noveltyNeed - roundRecord.novelty) * 0.08;
  if (round >= 6 && roundRecord.demands.some((demand) => demand.requiredLastOperationTag))
    risk += 0.035;
  return clamp(risk * (1 - profile.failureTolerance * 0.28), 0.01, 0.65);
}

function getFlowStateSignal(record) {
  if (!record.clear) return 0;

  const confidenceBand = 1 - Math.min(1, Math.abs(record.planConfidence - 0.78) / 0.42);
  const complexityBand = 1 - Math.min(1, Math.abs(record.complexity - 0.58) / 0.58);
  const feedbackTempo = clamp((58 - record.firstDeliveryDelay) / 34, 0, 1);
  const rewardCadence = clamp(record.rewardSpikes / 3, 0, 1);
  const mastery = clamp(
    (record.completed / Math.max(1, record.totalDemands)) * 0.7 + rewardCadence * 0.3
  );

  return clamp(
    confidenceBand * 0.28 +
      complexityBand * 0.24 +
      feedbackTempo * 0.2 +
      rewardCadence * 0.16 +
      mastery * 0.12
  );
}

function simulateSession(profile, sessionIndex, options) {
  const runSeed = `${options.seed}:${profile.id}:${sessionIndex}`;
  const rng = createRng(runSeed);
  const state = {
    skill:
      (profile.planningSkill + profile.routingSkill + profile.economySkill) / 3 +
      (rng() - 0.5) * 0.16,
    maxTier: 3,
    operationTags: new Set(['op:add-one', 'op:add-two']),
    colorControl: 0.18,
    qualityUseRate: 0,
    economyLift: 0,
    scrap: 0,
    lastComplexity: 0,
    lastBoardName: null,
    seenL4: false,
    seenOperationDemand: false,
  };
  const records = [];

  for (let round = 1; round <= options.rounds; round++) {
    const board = createRoundBoard(round, runSeed);
    const demands = Array.from({ length: getDeliveryNodeCount(round) }, (_unused, index) =>
      createDeliveryCondition(round, index, runSeed)
    );
    const quota = getRoundQuota(round, board);
    const complexity = getRoundComplexity(round, board, demands, state);
    const budgetFit = estimateBuildBudgetFit(round, demands);
    const capability = state.skill + budgetFit * 0.16 + state.economyLift;
    const planConfidence = clamp(sigmoid((capability - complexity) * 4.2), 0.02, 0.98);
    const completedDemands = [];
    let roundScore = 0;
    let deliveries = 0;
    let flowStreak = 0;
    let rewardSpikes = 0;
    let flowBonusScore = 0;
    const scoreDelivery = (baseScore) => {
      flowStreak++;
      if ([3, 6, 10].includes(flowStreak)) rewardSpikes++;
      const multiplier = getFlowDeliveryMultiplier(flowStreak);
      const scored = Math.floor(baseScore * multiplier);
      flowBonusScore += Math.max(0, scored - baseScore);
      return scored;
    };

    for (const demand of demands) {
      const demandComplexity = getDemandComplexity(demand, round, state);
      const demandConfidence = clamp(
        planConfidence - demandComplexity * 0.2 + state.skill * 0.08 + (rng() - 0.5) * 0.08,
        0.03,
        0.98
      );
      if (rng() <= demandConfidence) {
        completedDemands.push(demand);
        deliveries += demand.requiredCount;
        roundScore += demand.completionScoreReward;
        for (let delivery = 0; delivery < demand.requiredCount; delivery++) {
          roundScore += scoreDelivery(getDeliveryItemScore(demand, state));
        }
      } else {
        const partial = Math.floor(demand.requiredCount * clamp(demandConfidence * 0.8, 0, 0.85));
        deliveries += partial;
        for (let delivery = 0; delivery < partial; delivery++) {
          roundScore += scoreDelivery(getDeliveryItemScore(demand, state));
        }
      }
    }

    const sourceSupply = getSourceCount(round) * getRoundSourceInventory(round, board);
    const resourcePressure = deliveries / Math.max(1, sourceSupply);
    if (resourcePressure > 0.9) {
      roundScore = Math.floor(roundScore * clamp(1.05 - resourcePressure * 0.25, 0.65, 1));
    }

    const quotaMet = roundScore >= quota;
    const clear = quotaMet;
    const overkillScore = Math.max(0, roundScore - quota);
    const novelty =
      (board.name === state.lastBoardName ? 0.2 : 0.45) +
      (demands.some((demand) => demand.tier >= 4) ? 0.22 : 0) +
      (demands.some((demand) => demand.requiredLastOperationTag) ? 0.23 : 0) +
      (state.scrap >= 5 ? 0.18 : 0);
    const firstDeliveryDelay = Math.round(
      28 + complexity * 64 - profile.planningSkill * 22 - budgetFit * 10 + rng() * 18
    );

    const record = {
      round,
      board: board.name,
      quota,
      sourceSupply,
      demands,
      clear,
      quotaMet,
      completed: completedDemands.length,
      totalDemands: demands.length,
      roundScore,
      overkillScore,
      complexity,
      complexityDelta: Math.max(0, complexity - state.lastComplexity),
      planConfidence,
      novelty: clamp(novelty, 0, 1),
      firstDeliveryDelay,
      stopReason: null,
      moments: [],
      rewardSpikes,
      flowBonusScore,
      flowScore: 0,
    };
    record.flowScore = getFlowStateSignal(record);
    record.moments = getMomentTags(round, board, demands, clear, state);

    if (demands.some((demand) => demand.tier >= 4)) state.seenL4 = true;
    if (demands.some((demand) => demand.requiredLastOperationTag)) state.seenOperationDemand = true;
    state.lastBoardName = board.name;
    state.lastComplexity = complexity;

    if (!clear) {
      record.stopReason = 'hard_fail_quota_or_supply';
      records.push(record);
      return { profile, stoppedRound: round, stopType: 'hard', records };
    }

    updateRunProgression(state, rng, profile, clear, overkillScore, completedDemands);
    const stopRisk = getVoluntaryStopRisk(round, clear, record, profile, state);
    record.stopRisk = stopRisk;
    records.push(record);

    if (rng() < stopRisk) {
      record.stopReason = 'voluntary_stop_engagement_drop';
      return { profile, stoppedRound: round, stopType: 'voluntary', records };
    }
  }

  return { profile, stoppedRound: options.rounds + 1, stopType: 'retained', records };
}

function createBucket(rounds) {
  return Array.from({ length: rounds }, (_unused, index) => ({
    round: index + 1,
    reached: 0,
    stopped: 0,
    hardStops: 0,
    voluntaryStops: 0,
    clears: 0,
    quotaFails: 0,
    nodeFails: 0,
    confidence: 0,
    complexity: 0,
    scoreRatio: 0,
    sourcePressure: 0,
    firstDeliveryDelay: 0,
    rewardSpikes: 0,
    flowBonusScore: 0,
    flowScore: 0,
    moments: new Map(),
    boards: new Map(),
    operationDemands: 0,
    exactDemands: 0,
    colorDemands: 0,
  }));
}

function aggregate(results, options) {
  const byProfile = new Map();
  for (const profile of PROFILES) {
    byProfile.set(profile.id, {
      profile,
      sessions: 0,
      retained: 0,
      hardStops: 0,
      voluntaryStops: 0,
      buckets: createBucket(options.rounds),
      stopReasons: new Map(),
    });
  }

  for (const result of results) {
    const summary = byProfile.get(result.profile.id);
    summary.sessions++;
    if (result.stopType === 'retained') summary.retained++;
    if (result.stopType === 'hard') summary.hardStops++;
    if (result.stopType === 'voluntary') summary.voluntaryStops++;

    for (const record of result.records) {
      const bucket = summary.buckets[record.round - 1];
      bucket.reached++;
      bucket.clears += record.clear ? 1 : 0;
      bucket.confidence += record.planConfidence;
      bucket.complexity += record.complexity;
      bucket.scoreRatio += record.roundScore / Math.max(1, record.quota);
      bucket.sourcePressure +=
        record.demands.reduce((sum, demand) => sum + demand.requiredCount, 0) /
        Math.max(1, record.sourceSupply);
      bucket.firstDeliveryDelay += record.firstDeliveryDelay;
      bucket.rewardSpikes += record.rewardSpikes || 0;
      bucket.flowBonusScore += record.flowBonusScore || 0;
      bucket.flowScore += record.flowScore || 0;
      bucket.operationDemands += record.demands.filter(
        (demand) => demand.requiredLastOperationTag
      ).length;
      bucket.exactDemands += record.demands.filter((demand) => demand.exact).length;
      bucket.colorDemands += record.demands.filter((demand) => demand.itemColor).length;
      bucket.boards.set(record.board, (bucket.boards.get(record.board) || 0) + 1);
      for (const moment of record.moments) {
        bucket.moments.set(moment, (bucket.moments.get(moment) || 0) + 1);
      }
      if (record.stopReason) {
        bucket.stopped++;
        if (record.stopReason === 'hard_fail_quota_or_supply') bucket.quotaFails++;
        if (record.stopReason === 'hard_fail_unfinished_delivery_nodes') bucket.nodeFails++;
        if (record.stopReason.startsWith('hard')) bucket.hardStops++;
        if (record.stopReason.startsWith('voluntary')) bucket.voluntaryStops++;
        summary.stopReasons.set(
          record.stopReason,
          (summary.stopReasons.get(record.stopReason) || 0) + 1
        );
      }
    }
  }

  return [...byProfile.values()];
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function fixed(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function topMapEntries(map, limit = 2) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => `${key} (${count})`)
    .join(', ');
}

function printReport(summaries, options) {
  console.log(`# Gridforge engagement simulation`);
  console.log(`sessions/profile=${options.sessions} rounds=${options.rounds} seed=${options.seed}`);
  console.log('');

  console.log(`## Retention summary`);
  console.log(`Profile     Retained   Hard stops   Voluntary stops   Peak stop rounds`);
  for (const summary of summaries) {
    const peakStops = summary.buckets
      .filter((bucket) => bucket.stopped > 0)
      .sort((a, b) => b.stopped - a.stopped)
      .slice(0, 3)
      .map((bucket) => `R${bucket.round} ${pct(bucket.stopped / summary.sessions)}`)
      .join(', ');
    console.log(
      `${summary.profile.label.padEnd(11)} ${pct(summary.retained / summary.sessions).padEnd(10)} ${pct(
        summary.hardStops / summary.sessions
      ).padEnd(12)} ${pct(summary.voluntaryStops / summary.sessions).padEnd(17)} ${peakStops}`
    );
  }
  console.log('');

  console.log(`## Round risk detail`);
  for (const summary of summaries) {
    console.log(`\n${summary.profile.label}`);
    console.log(`Round  Reach  Stop  Clear  Flow  Spikes  Conf  Cmplx  Score/Quota  Demand flags`);
    for (const bucket of summary.buckets) {
      if (bucket.reached === 0) continue;
      const reachRate = bucket.reached / summary.sessions;
      const stopRate = bucket.stopped / Math.max(1, bucket.reached);
      const clearRate = bucket.clears / Math.max(1, bucket.reached);
      const demandFlags = [
        bucket.exactDemands ? `exact:${fixed(bucket.exactDemands / bucket.reached, 1)}` : null,
        bucket.colorDemands ? `color:${fixed(bucket.colorDemands / bucket.reached, 1)}` : null,
        bucket.operationDemands ? `op:${fixed(bucket.operationDemands / bucket.reached, 1)}` : null,
      ]
        .filter(Boolean)
        .join(' ');
      console.log(
        `${String(bucket.round).padEnd(6)} ${pct(reachRate).padEnd(6)} ${pct(stopRate).padEnd(5)} ${pct(
          clearRate
        ).padEnd(6)} ${fixed(bucket.flowScore / bucket.reached).padEnd(5)} ${fixed(
          bucket.rewardSpikes / bucket.reached,
          1
        ).padEnd(7)} ${fixed(bucket.confidence / bucket.reached).padEnd(5)} ${fixed(
          bucket.complexity / bucket.reached
        ).padEnd(6)} ${fixed(bucket.scoreRatio / bucket.reached).padEnd(11)} ${demandFlags}`
      );
    }
  }
  console.log('');

  console.log(`## Compelling moments`);
  for (const summary of summaries) {
    const moments = new Map();
    for (const bucket of summary.buckets) {
      for (const [moment, count] of bucket.moments) {
        moments.set(moment, (moments.get(moment) || 0) + count);
      }
    }
    console.log(`${summary.profile.label}: ${topMapEntries(moments, 8)}`);
  }
  console.log('');

  console.log(`## Design read`);
  const globalBuckets = createBucket(options.rounds);
  for (const summary of summaries) {
    for (const bucket of summary.buckets) {
      const target = globalBuckets[bucket.round - 1];
      for (const key of [
        'reached',
        'stopped',
        'hardStops',
        'voluntaryStops',
        'clears',
        'quotaFails',
        'nodeFails',
        'confidence',
        'complexity',
        'scoreRatio',
        'sourcePressure',
        'firstDeliveryDelay',
        'rewardSpikes',
        'flowBonusScore',
        'flowScore',
        'operationDemands',
        'exactDemands',
        'colorDemands',
      ]) {
        target[key] += bucket[key];
      }
    }
  }

  const riskRounds = globalBuckets
    .filter((bucket) => bucket.reached > 0)
    .map((bucket) => ({
      round: bucket.round,
      stopRate: bucket.stopped / bucket.reached,
      hardRate: bucket.hardStops / bucket.reached,
      voluntaryRate: bucket.voluntaryStops / bucket.reached,
      clearRate: bucket.clears / bucket.reached,
      confidence: bucket.confidence / bucket.reached,
      complexity: bucket.complexity / bucket.reached,
      scoreRatio: bucket.scoreRatio / bucket.reached,
      delay: bucket.firstDeliveryDelay / bucket.reached,
      flowScore: bucket.flowScore / bucket.reached,
      rewardSpikes: bucket.rewardSpikes / bucket.reached,
    }))
    .sort((a, b) => b.stopRate - a.stopRate)
    .slice(0, 5);

  for (const round of riskRounds) {
    const likelyCause =
      round.hardRate > round.voluntaryRate
        ? 'quota/supply failure among struggling runs'
        : round.delay > 52
          ? 'slow first feedback'
          : 'complexity spike or weak shop payoff';
    console.log(
      `R${round.round}: stop ${pct(round.stopRate)}, clear ${pct(round.clearRate)}, confidence ${fixed(
        round.confidence
      )}, complexity ${fixed(round.complexity)}, score/quota ${fixed(round.scoreRatio)} -> ${likelyCause}`
    );
  }
  console.log('');

  const flowRounds = globalBuckets
    .filter((bucket) => bucket.reached > 0)
    .map((bucket) => ({
      round: bucket.round,
      flowScore: bucket.flowScore / bucket.reached,
      rewardSpikes: bucket.rewardSpikes / bucket.reached,
      clearRate: bucket.clears / bucket.reached,
      reached: bucket.reached,
    }))
    .sort((a, b) => b.flowScore - a.flowScore)
    .slice(0, 5);

  console.log(`## Flow-state windows`);
  for (const round of flowRounds) {
    console.log(
      `R${round.round}: flow ${fixed(round.flowScore)}, spikes ${fixed(
        round.rewardSpikes,
        1
      )}, clear ${pct(round.clearRate)}`
    );
  }
  console.log('');

  console.log(`## Healthy-retention recommendations`);
  console.log(
    `- Shorten the first-delivery loop: keep R1 focused on one visible L2 target and surface the first successful delivery as a bigger payoff moment.`
  );
  console.log(
    `- Use Act pacing deliberately: R3 is a Surge preview, R4/R8/R12 are Boss rounds, and the shop before each Boss should show at least one direct answer.`
  );
  console.log(
    `- R3 should be a readable Surge preview, with color pressure but no exact-tier wall. Exact demands land at the first Boss where the score target can still carry the round.`
  );
  console.log(
    `- R8 introduces operation-tag demands. Treat the first operation demand as a milestone with a guaranteed relevant shop/operator option beforehand.`
  );
  console.log(
    `- Make shop choices reliably actionable: if a player has 4-7 Scrap, guarantee at least one affordable card that solves the next round's color, tier, or operation pressure.`
  );
  console.log(
    `- Keep the compelling escalation, but avoid dark-pattern pressure: use mastery goals, build variety, and clear post-fail explanations rather than streak loss, FOMO timers, or manipulative compulsion loops.`
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = [];
  for (const profile of PROFILES) {
    for (let session = 0; session < options.sessions; session++) {
      results.push(simulateSession(profile, session, options));
    }
  }
  printReport(aggregate(results, options), options);
}

main();
