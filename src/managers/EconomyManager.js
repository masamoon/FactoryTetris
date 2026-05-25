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
