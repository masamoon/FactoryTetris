/**
 * TraitRegistry — holds run-scoped state for run-wide traits.
 *
 * One instance is attached to the GameScene as scene.traitRegistry. State
 * here MUST be cleared on game over / scene restart so runs are independent.
 */
export default class TraitRegistry {
  constructor() {
    this.beaconCount = 0;
    this.hoarderCounters = new Map(); // machineId -> integer delivery count
  }

  // --- Beacon ---

  incrementBeacon() {
    this.beaconCount += 1;
  }

  decrementBeacon() {
    this.beaconCount = Math.max(0, this.beaconCount - 1);
  }

  getBeaconCount() {
    return this.beaconCount;
  }

  // Additive bonus the chain multiplier formula adds in.
  getBeaconChainBonus() {
    return 0.1 * this.beaconCount;
  }

  // --- Hoarder ---

  incrementHoarder(machineId) {
    const next = (this.hoarderCounters.get(machineId) || 0) + 1;
    this.hoarderCounters.set(machineId, next);
    return next;
  }

  getHoarderCount(machineId) {
    return this.hoarderCounters.get(machineId) || 0;
  }

  resetHoarder(machineId) {
    this.hoarderCounters.delete(machineId);
  }

  // --- Lifecycle ---

  resetAll() {
    this.beaconCount = 0;
    this.hoarderCounters.clear();
  }
}
