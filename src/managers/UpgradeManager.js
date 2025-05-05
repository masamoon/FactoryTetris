import { upgradesConfig, UPGRADE_TYPES, TIER_THRESHOLDS } from '../config/upgrades.js';

export class UpgradeManager {
    constructor() {
        // Stores the current level of each acquired upgrade type
        // e.g., { 'processor_efficiency': 1, 'resource_bounty': 2 }
        this.currentUpgrades = {};
        this.upgradesDelivered = 0;
    }

    // --- Getters for current modifiers ---

    getModifier(upgradeType) {
        const level = this.currentUpgrades[upgradeType] || 0;
        if (level === 0) {
            return 1; // Default modifier if upgrade not acquired
        }
        // Find the tier object for the current level
        const tierInfo = upgradesConfig[upgradeType]?.tiers.find(t => t.level === level);
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

    // --- Upgrade Application Logic ---

    applyUpgrade(upgradeType) {
        const currentLevel = this.currentUpgrades[upgradeType] || 0;
        const maxLevel = upgradesConfig[upgradeType]?.tiers.length || 0;

        if (currentLevel < maxLevel) {
            this.currentUpgrades[upgradeType] = currentLevel + 1;
            console.log(`Applied upgrade: ${upgradeType}, New Level: ${this.currentUpgrades[upgradeType]}`);
        } else {
            console.warn(`Upgrade ${upgradeType} already at max level.`);
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

        for (const type in upgradesConfig) {
            const config = upgradesConfig[type];
            const currentLevel = this.currentUpgrades[type] || 0;
            const nextLevel = currentLevel + 1;

            // Check if the next tier exists and is within the currently allowed max tier
            const nextTierInfo = config.tiers.find(t => t.level === nextLevel);
            if (nextTierInfo && nextLevel <= maxTierAvailable) {
                availableUpgrades.push({
                    type: type,
                    level: nextLevel,
                    name: config.name,
                    description: nextTierInfo.description, // Show description of the *next* level
                    // icon: config.icon // Add icon later
                });
            }
        }

        // Shuffle and pick 'count' upgrades
        Phaser.Utils.Array.Shuffle(availableUpgrades);
        return availableUpgrades.slice(0, count);
    }
} 