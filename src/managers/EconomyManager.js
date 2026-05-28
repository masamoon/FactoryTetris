export default class EconomyManager {
  constructor(config = {}) {
    this.config = config;
  }

  getInterestForMoney(money) {
    const interestConfig = this.config.interest || {};
    const cashPerInterest = Math.max(1, Math.floor(interestConfig.cashPerInterest || 5));
    const interestPerStep = Math.max(0, Math.floor(interestConfig.interestPerStep || 1));
    const maxInterest = Math.max(0, Math.floor(interestConfig.maxInterest || 5));
    const savedMoney = Math.max(0, Math.floor(money || 0));

    return Math.min(maxInterest, Math.floor(savedMoney / cashPerInterest) * interestPerStep);
  }

  getCapitalEdgeGain(interest, round) {
    const edgeConfig = this.config.capitalEdge || {};
    const firstRounds = Math.max(0, Math.floor(edgeConfig.firstRounds || 0));
    const minInterest = Math.max(0, Math.floor(edgeConfig.minInterest || 0));
    const edgePerStep = Math.max(0, Math.floor(edgeConfig.edgePerStep || 1));
    const currentRound = Math.max(1, Math.floor(round || 1));
    const earnedInterest = Math.max(0, Math.floor(interest || 0));

    if (!firstRounds || currentRound > firstRounds || earnedInterest < minInterest) {
      return 0;
    }

    return Math.max(1, earnedInterest - minInterest + 1) * edgePerStep;
  }

  getCapitalEdgeDividend(edge) {
    const edgeConfig = this.config.capitalEdge || {};
    const edgePerDividend = Math.max(1, Math.floor(edgeConfig.edgePerDividend || 4));
    const maxDividend = Math.max(0, Math.floor(edgeConfig.maxDividend || 0));
    const savedEdge = Math.max(0, Math.floor(edge || 0));
    const dividend = Math.floor(savedEdge / edgePerDividend);

    return maxDividend > 0 ? Math.min(maxDividend, dividend) : dividend;
  }

  getMaxCapitalEdge() {
    const edgeConfig = this.config.capitalEdge || {};
    return Math.max(0, Math.floor(edgeConfig.maxEdge || 0));
  }

  getNextInterestBreakpoint(money) {
    const interestConfig = this.config.interest || {};
    const cashPerInterest = Math.max(1, Math.floor(interestConfig.cashPerInterest || 5));
    const maxInterest = Math.max(0, Math.floor(interestConfig.maxInterest || 5));
    const savedMoney = Math.max(0, Math.floor(money || 0));
    const currentInterest = this.getInterestForMoney(savedMoney);

    if (currentInterest >= maxInterest) {
      return null;
    }

    return (Math.floor(savedMoney / cashPerInterest) + 1) * cashPerInterest;
  }
}
