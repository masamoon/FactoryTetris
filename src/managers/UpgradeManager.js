import Phaser from 'phaser';
import { upgradesConfig, UPGRADE_TYPES, TIER_THRESHOLDS } from '../config/upgrades.js';

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

  getProcessorSpeedModifier() {
    return this.getModifier(UPGRADE_TYPES.PROCESSOR_EFFICIENCY);
  }

  getResourceBountyModifier() {
    return this.getModifier(UPGRADE_TYPES.RESOURCE_BOUNTY);
  }

  getResourceRegenModifier() {
    return this.getModifier(UPGRADE_TYPES.RESOURCE_REGEN);
  }

  getConveyorSpeedModifier() {
    return this.getModifier(UPGRADE_TYPES.CONVEYOR_SPEED);
  }

  getNodeLongevityModifier() {
    return this.getModifier(UPGRADE_TYPES.NODE_LONGEVITY);
  }

  getInventoryCapacityModifier() {
    return this.getModifier(UPGRADE_TYPES.INVENTORY_CAPACITY);
  }

  getExtractionSpeedModifier() {
    return this.getModifier(UPGRADE_TYPES.EXTRACTION_SPEED);
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

  // Check if a procedural upgrade is active
  isProceduralUpgradeActive(upgradeType) {
    return this.activeProceduralUpgrades.has(upgradeType);
  }
}
