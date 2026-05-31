import Phaser from 'phaser';
import { upgradesConfig, UPGRADE_TYPES, TIER_THRESHOLDS } from '../config/upgrades.js';
import { BOON_POOL } from '../config/boons.js';
import { BUILD_IDENTITIES, getBuildIdentityLevel } from '../config/buildIdentities.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

const WARM_ITEM_COLORS = new Set(['red', 'yellow']);
const COOL_ITEM_COLORS = new Set(['blue', 'green']);
const CHROMA_COUPLER_PAIRS = [
  ['red', 'yellow'],
  ['blue', 'green'],
];

export class UpgradeManager {
  constructor() {
    // Stores the current level of each acquired upgrade type
    // e.g., { 'processor_efficiency': 1, 'resource_bounty': 2 }
    this.currentUpgrades = {};
    this.upgradesDelivered = 0;
    // Track procedural upgrades (one-off, non-tiered)
    this.activeProceduralUpgrades = new Set();
  }

  // --- Getters for current modifiers ---

  getModifier(upgradeType) {
    const level = this.currentUpgrades[upgradeType] || 0;
    if (level === 0) {
      return 1; // Default modifier if upgrade not acquired
    }
    // Find the tier object for the current level
    const tierInfo = upgradesConfig[upgradeType]?.tiers.find((t) => t.level === level);
    return tierInfo ? tierInfo.modifier : 1;
  }

  getUpgradeTierInfo(upgradeType) {
    const level = this.currentUpgrades[upgradeType] || 0;
    if (level === 0) return null;
    return upgradesConfig[upgradeType]?.tiers?.find((t) => t.level === level) || null;
  }

  getProcessorSpeedModifier() {
    let modifier = this.getModifier(UPGRADE_TYPES.OPERATOR_EFFICIENCY);
    if (this.activeProceduralUpgrades.has('boon_heavy_haulers')) {
      modifier *= 0.85;
    }
    return modifier;
  }

  getResourceBountyModifier() {
    return this.getModifier(UPGRADE_TYPES.SUPPLY_BOUNTY);
  }

  getResourceRegenModifier() {
    return 1;
  }

  getConveyorSpeedModifier() {
    let modifier = this.getModifier(UPGRADE_TYPES.CONVEYOR_SPEED);
    if (this.activeProceduralUpgrades.has('boon_lean_lines')) {
      modifier *= 1.25;
    }
    return modifier;
  }

  getNodeLongevityModifier() {
    return 1;
  }

  getInventoryCapacityModifier() {
    return this.getModifier(UPGRADE_TYPES.INVENTORY_CAPACITY);
  }

  getExtractionSpeedModifier() {
    return this.getModifier(UPGRADE_TYPES.SHIFT_HANDOFF);
  }

  getBudgetBonus() {
    const level = this.currentUpgrades[UPGRADE_TYPES.BUDGET] || 0;
    if (level === 0) return 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.BUDGET]?.tiers.find((t) => t.level === level);
    return tierInfo ? tierInfo.modifier : 0;
  }

  getProcurementRebate() {
    const level = this.currentUpgrades[UPGRADE_TYPES.PROCUREMENT_REBATE] || 0;
    if (level === 0) return 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.PROCUREMENT_REBATE]?.tiers.find(
      (t) => t.level === level
    );
    return tierInfo ? tierInfo.modifier : 0;
  }

  getColorCalibrationModifier() {
    const level = this.currentUpgrades[UPGRADE_TYPES.COLOR_CALIBRATION] || 0;
    if (level === 0) return 1;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.COLOR_CALIBRATION]?.tiers.find(
      (t) => t.level === level
    );
    return tierInfo ? tierInfo.modifier : 1;
  }

  getWildcardOperatorShopChance() {
    const baseChance = GAME_CONFIG.shopWildcardOperatorChance || 0;
    const level = this.currentUpgrades[UPGRADE_TYPES.WILDCARD_LICENSING] || 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.WILDCARD_LICENSING]?.tiers.find(
      (t) => t.level === level
    );
    const upgradeChance = tierInfo ? tierInfo.modifier : 0;
    const marketChance = this.activeProceduralUpgrades.has('boon_prism_market') ? 0.18 : 0;
    return Math.min(0.75, baseChance + upgradeChance + marketChance);
  }

  getClosingFloatBonus() {
    const level = this.currentUpgrades[UPGRADE_TYPES.CLOSING_FLOAT] || 0;
    if (level === 0) return 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.CLOSING_FLOAT]?.tiers.find(
      (t) => t.level === level
    );
    return tierInfo ? tierInfo.modifier : 0;
  }

  getColorDeliveryScoreModifier({ itemColor, conditionColor, wildcardColor = 'wild' } = {}) {
    if (!conditionColor || !itemColor || itemColor === wildcardColor) return 1;
    if (itemColor !== conditionColor) return 1;

    let modifier = this.getColorCalibrationModifier();
    if (this.activeProceduralUpgrades.has('boon_suit_streak')) {
      modifier *= 1.25;
    }
    return modifier;
  }

  getShadeGaugeModifier({ itemColor, conditionColor, itemLevel = 1, wildcardColor = 'wild' } = {}) {
    if (!conditionColor || !itemColor || itemColor === wildcardColor) return 1;
    if (itemColor !== conditionColor) return 1;

    const level = this.currentUpgrades[UPGRADE_TYPES.SHADE_GAUGE] || 0;
    if (level === 0) return 1;

    const tierInfo = upgradesConfig[UPGRADE_TYPES.SHADE_GAUGE]?.tiers.find(
      (t) => t.level === level
    );
    const perLevel = tierInfo ? tierInfo.modifier : 0;
    const extraLevels = Math.max(0, Math.floor(itemLevel || 1) - 1);
    return 1 + extraLevels * perLevel;
  }

  getColorSpecializationDeliveryModifier({ itemColor, wildcardColor = 'wild' } = {}) {
    if (!itemColor || itemColor === wildcardColor) return { modifier: 1, label: null };

    const warmTier = this.getUpgradeTierInfo(UPGRADE_TYPES.WARM_CONTRACTS);
    if (warmTier && WARM_ITEM_COLORS.has(itemColor)) {
      return { modifier: warmTier.modifier || 1, label: 'Warm Contract' };
    }

    return { modifier: 1, label: null };
  }

  getParityDeliveryScoreModifier({ itemLevel = 1 } = {}) {
    const level = Math.max(1, Math.floor(itemLevel || 1));
    if (level % 2 !== 0) return { modifier: 1, label: null };

    const evenTier = this.getUpgradeTierInfo(UPGRADE_TYPES.EVEN_CALIPERS);
    if (!evenTier) return { modifier: 1, label: null };

    return { modifier: evenTier.modifier || 1, label: 'Even Calipers' };
  }

  getLevelDeliveryScoreModifier({ itemLevel = 1, conditionTier = 1, exact = false } = {}) {
    if (exact) return 1;

    const perLevel = GAME_CONFIG.overlevelScoreBonusPerLevel ?? 0.06;
    const cap = GAME_CONFIG.overlevelScoreBonusCap ?? 1.3;
    const overage = Math.max(0, Math.floor(itemLevel || 1) - Math.floor(conditionTier || 1));
    return Math.min(cap, 1 + overage * perLevel);
  }

  getLevelDeliveryBudgetBonus({ itemLevel = 1, conditionTier = 1, exact = false } = {}) {
    if (exact) return 0;

    const perLevel = GAME_CONFIG.overlevelBudgetPerLevel ?? 1;
    const cap = GAME_CONFIG.overlevelBudgetCap ?? 6;
    const overage = Math.max(0, Math.floor(itemLevel || 1) - Math.floor(conditionTier || 1));
    return Math.min(cap, Math.floor(overage * perLevel));
  }

  getOddDeliveryBudgetBonus({ itemLevel = 1 } = {}) {
    const level = Math.max(1, Math.floor(itemLevel || 1));
    if (level % 2 === 0) return 0;

    const oddTier = this.getUpgradeTierInfo(UPGRADE_TYPES.ODD_LOTS);
    return oddTier ? Math.max(0, Math.floor(oddTier.modifier || 0)) : 0;
  }

  getColorMatchProcessingModifier(machine, scene) {
    let modifier = 1;
    const outputColor =
      machine?.outputItemColor || machine?.currentProcessingItems?.[0]?.itemColor || null;

    const coolantTier = this.getUpgradeTierInfo(UPGRADE_TYPES.COOLANT_LOOP);
    if (coolantTier && outputColor && COOL_ITEM_COLORS.has(outputColor)) {
      modifier *= coolantTier.modifier || 1;
    }

    if (!this.activeProceduralUpgrades.has('boon_chromatic_alignment')) return modifier;
    if (!outputColor || outputColor === 'wild') return modifier;
    return scene?.hasActiveDeliveryDemandColor?.(outputColor) ? modifier * 1.2 : modifier;
  }

  // --- Boon-derived modifiers ---
  getConveyorCapacityBonus() {
    return this.activeProceduralUpgrades.has('boon_heavy_haulers') ? 1 : 0;
  }

  getInventoryCapacityBonus() {
    const level = this.currentUpgrades[UPGRADE_TYPES.STAGING_RACKS] || 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.STAGING_RACKS]?.tiers.find(
      (t) => t.level === level
    );
    const stagingBonus = tierInfo ? tierInfo.modifier : 0;
    const leanPenalty = this.activeProceduralUpgrades.has('boon_lean_lines') ? -1 : 0;
    return stagingBonus + leanPenalty;
  }

  getArchetypeProcessingModifier(machine) {
    if (!machine) {
      return 1;
    }

    const isArithmeticRecipe =
      machine.arithmeticOperation &&
      typeof machine.getArithmeticRequiredInputCount === 'function' &&
      machine.getArithmeticRequiredInputCount() > 1;

    const levels = Array.isArray(machine.inputLevels) ? machine.inputLevels : [];
    const uniqueLevels = new Set(levels);
    const isLevelRecipe =
      levels.length >= 2 && (uniqueLevels.size > 1 || uniqueLevels.size < levels.length);
    const isRecipeMachine = isArithmeticRecipe || isLevelRecipe;

    if (!isRecipeMachine) return 1;

    const level = this.currentUpgrades[UPGRADE_TYPES.MATCHED_DIES] || 0;
    const tierInfo = upgradesConfig[UPGRADE_TYPES.MATCHED_DIES]?.tiers.find(
      (t) => t.level === level
    );
    const matchedDiesModifier = tierInfo ? tierInfo.modifier : 1;
    const latticeModifier = this.activeProceduralUpgrades.has('boon_recipe_lattice') ? 1.25 : 1;
    return matchedDiesModifier * latticeModifier;
  }

  getParityProcessingModifier(machine) {
    const parityTier = this.getUpgradeTierInfo(UPGRADE_TYPES.PARITY_GEARBOX);
    if (!parityTier) return 1;

    const items = Array.isArray(machine?.currentProcessingItems)
      ? machine.currentProcessingItems
      : [];
    if (items.length < 2) return 1;

    const parities = new Set(
      items.map((item) => Math.max(1, Math.floor(item?.level || 1)) % 2)
    );
    return parities.size === 1 ? parityTier.modifier || 1 : 1;
  }

  applyColorLevelProcessingUpgrades(nextItem, _machine, scene, ctx = {}) {
    if (!nextItem || nextItem.type !== 'level-resource') return nextItem;

    let adjustedItem = nextItem;
    const wildcardColor = GAME_CONFIG.wildcardItemColor || 'wild';
    const consumedItems = Array.isArray(ctx.consumedItems) ? ctx.consumedItems : [];
    const consumedColors = consumedItems
      .map((item) => item?.itemColor)
      .filter((itemColor) => itemColor && itemColor !== wildcardColor);
    const uniqueConsumedColors = new Set(consumedColors);

    const couplerTier = this.getUpgradeTierInfo(UPGRADE_TYPES.CHROMA_COUPLERS);
    const hasCoupledPair = CHROMA_COUPLER_PAIRS.some(([a, b]) => {
      return uniqueConsumedColors.has(a) && uniqueConsumedColors.has(b);
    });
    if (couplerTier && hasCoupledPair) {
      adjustedItem = {
        ...adjustedItem,
        level:
          Math.max(1, Math.floor(adjustedItem.level || 1)) +
          Math.max(0, couplerTier.modifier || 0),
      };
    }

    const sortingLevel = this.currentUpgrades[UPGRADE_TYPES.SORTING_JIG] || 0;
    const sortingTier = upgradesConfig[UPGRADE_TYPES.SORTING_JIG]?.tiers.find(
      (t) => t.level === sortingLevel
    );
    if (
      sortingTier &&
      uniqueConsumedColors.size >= 2 &&
      Math.floor(adjustedItem.level || 1) >= sortingTier.modifier
    ) {
      adjustedItem = {
        ...adjustedItem,
        itemColor: wildcardColor,
      };
    }

    const indexLevel = this.currentUpgrades[UPGRADE_TYPES.INDEX_MARKS] || 0;
    const indexTier = upgradesConfig[UPGRADE_TYPES.INDEX_MARKS]?.tiers.find(
      (t) => t.level === indexLevel
    );
    if (indexTier && adjustedItem.itemColor && adjustedItem.itemColor !== wildcardColor) {
      const targetTier =
        typeof scene?.getHighestActiveDeliveryDemandTierForColor === 'function'
          ? scene.getHighestActiveDeliveryDemandTierForColor(adjustedItem.itemColor)
          : 0;
      const currentLevel = Math.floor(adjustedItem.level || 1);
      const bonus = Math.min(
        Math.max(0, indexTier.modifier || 0),
        Math.max(0, targetTier - currentLevel)
      );
      if (bonus > 0) {
        adjustedItem = {
          ...adjustedItem,
          level: currentLevel + bonus,
        };
      }
    }

    return adjustedItem;
  }

  getBuildIdentityScores() {
    return BUILD_IDENTITIES.map((identity) => {
      let score = 0;

      for (const upgradeType of identity.upgradeTypes || []) {
        score += this.currentUpgrades[upgradeType] || 0;
      }

      for (const boonId of identity.boonIds || []) {
        if (this.activeProceduralUpgrades.has(boonId)) score += 2;
      }

      const level = getBuildIdentityLevel(score);
      return {
        ...identity,
        score,
        level,
      };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  getPrimaryBuildIdentity(minScore = 2) {
    const [best] = this.getBuildIdentityScores();
    return best && best.score >= minScore ? best : null;
  }

  getBuildIdentityFocusLevel(identityId) {
    const identity = this.getPrimaryBuildIdentity();
    return identity?.id === identityId ? identity.level || 0 : 0;
  }

  // --- Upgrade Application Logic ---

  applyUpgrade(upgradeType) {
    const config = upgradesConfig[upgradeType];
    if (!config) {
      console.warn(`Unknown upgrade type: ${upgradeType}`);
      return;
    }
    // If this is a tiered upgrade
    if (config.tiers) {
      const currentLevel = this.currentUpgrades[upgradeType] || 0;
      const maxLevel = config.tiers.length || 0;
      if (currentLevel < maxLevel) {
        this.currentUpgrades[upgradeType] = currentLevel + 1;
        console.log(
          `Applied upgrade: ${upgradeType}, New Level: ${this.currentUpgrades[upgradeType]}`
        );
      } else {
        console.warn(`Upgrade ${upgradeType} already at max level.`);
      }
    } else {
      // Procedural upgrade (one-off)
      if (!this.activeProceduralUpgrades.has(upgradeType)) {
        this.activeProceduralUpgrades.add(upgradeType);
        if (typeof config.effect === 'function') {
          config.effect(this); // Pass the manager or game context
        }
        console.log(`Applied procedural upgrade: ${upgradeType}`);
      } else {
        console.warn(`Procedural upgrade ${upgradeType} already active.`);
      }
    }
  }

  incrementUpgradesDelivered() {
    this.upgradesDelivered++;
  }

  // --- Generating Upgrade Choices ---

  getCurrentMaxTier() {
    let maxTier = 1;
    for (const tier in TIER_THRESHOLDS) {
      if (this.upgradesDelivered >= TIER_THRESHOLDS[tier]) {
        maxTier = Math.max(maxTier, parseInt(tier));
      }
    }
    return maxTier;
  }

  getUpgradeChoices(count = 3) {
    const availableUpgrades = [];
    const maxTierAvailable = this.getCurrentMaxTier();

    // Tiered upgrades
    for (const type in upgradesConfig) {
      const config = upgradesConfig[type];
      if (config.tiers) {
        const currentLevel = this.currentUpgrades[type] || 0;
        const nextLevel = currentLevel + 1;
        // Check if the next tier exists and is within the currently allowed max tier
        const nextTierInfo = config.tiers.find((t) => t.level === nextLevel);
        if (nextTierInfo && nextLevel <= maxTierAvailable) {
          availableUpgrades.push({
            type: type,
            level: nextLevel,
            name: config.name,
            description: nextTierInfo.description, // Show description of the *next* level
            // icon: config.icon // Add icon later
          });
        }
      } else {
        // Procedural upgrade (one-off)
        if (!this.activeProceduralUpgrades.has(type)) {
          availableUpgrades.push({
            type: type,
            name: config.name,
            description: config.description,
            rarity: config.rarity || 'common',
            // icon: config.icon // Add icon later
          });
        }
      }
    }

    // Shuffle and pick 'count' upgrades
    Phaser.Utils.Array.Shuffle(availableUpgrades);
    return availableUpgrades.slice(0, count);
  }

  getBoonChoices(count = 3) {
    const available = BOON_POOL.filter((b) => !this.activeProceduralUpgrades.has(b.id));
    Phaser.Utils.Array.Shuffle(available);
    return available.slice(0, count).map((b) => ({
      type: b.id,
      name: b.name,
      description: b.description,
      rarity: b.rarity || 'common',
    }));
  }

  applyBoon(boonId) {
    this.activeProceduralUpgrades.add(boonId);
    console.log(`[BOON] Applied ${boonId}`);
  }

  // Check if a procedural upgrade is active
  isProceduralUpgradeActive(upgradeType) {
    return this.activeProceduralUpgrades.has(upgradeType);
  }
}
