import { GAME_CONFIG } from '../config/gameConfig';
import { UPGRADE_PACKAGE_TYPE } from '../config/upgrades.js';
import { calculateDeliveryScore, getPurityName } from '../utils/PurityUtils';
import {
  getLevelPoints,
  getLevelName,
  getLevelColor as _getLevelColor,
} from '../config/resourceLevels';

export default class DeliveryNode {
  constructor(scene, config) {
    this.scene = scene;
    this.x = config.x;
    this.y = config.y;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    // Delivery nodes might accept specific types later, for now generic
    // this.requiredResourceType = config.requiredResourceType;
    this.lifespan = config.lifespan || GAME_CONFIG.nodeLifespan; // Use default lifespan if not provided

    console.log(`Created delivery node at (${this.gridX}, ${this.gridY})`);

    // Create visual representation
    this.createVisuals();

    // Set up lifespan timer
    this.lifespanTimer = scene.time.addEvent({
      delay: 1000,
      callback: this.updateLifespan,
      callbackScope: this,
      loop: true,
    });
  }

  createVisuals() {
    // Create container for node parts
    this.container = this.scene.add.container(this.x, this.y);

    // Simple delivery node visuals - square, different color
    const nodeColor = 0x4a6fb5; // Blue color for delivery
    const borderColor = 0x3a5f95;

    // Create node background (square instead of circle)
    this.background = this.scene.add.rectangle(0, 0, 24, 24, nodeColor);
    this.container.add(this.background);

    // Create node border
    this.border = this.scene.add.rectangle(0, 0, 24, 24);
    this.border.setStrokeStyle(2, borderColor);
    this.container.add(this.border);

    // Maybe an icon instead of text? For now, just the shape.
    // Remove resource indicator text

    // Create lifespan indicator
    this.lifespanBar = this.scene.add.rectangle(0, 16, 24, 4, 0x00ff00); // Position below the square
    this.container.add(this.lifespanBar);

    // Optional: Add a different animation? Or keep pulsing?
    this.scene.tweens.add({
      targets: this.background,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1200, // Slightly slower pulse?
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Accept an item delivered to this node.
   * Handles both regular resources and upgrade packages.
   * @param {object} itemData - The item object being delivered { type: string, amount: number }.
   * @returns {boolean} - True if the item was accepted, false otherwise.
   */
  acceptItem(itemData) {
    // Parameter changed to itemData
    if (!itemData || !itemData.type) {
      // Check itemData
      console.warn('DeliveryNode received invalid itemData:', itemData);
      return false;
    }

    const itemType = itemData.type; // Get type from itemData
    const amount = itemData.amount || 1; // Get amount, default to 1 if missing

    // Check if it's an upgrade package
    if (itemType === UPGRADE_PACKAGE_TYPE) {
      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${amount} Upgrade Package(s)!`
      );
      // Increment upgrade counter for each package received
      for (let i = 0; i < amount; i++) {
        this.scene.upgradeManager.incrementUpgradesDelivered();
        // Trigger UI once per batch for now, could change later
        if (i === 0) {
          this.scene.events.emit('triggerUpgradeSelection');
          console.log('Triggering upgrade selection UI...');
        }
      }

      // Create a distinct effect for upgrade packages?
      this.createAcceptEffect('upgrade', 0); // Points aren't relevant for upgrades

      return true; // Upgrade package accepted
    }

    // --- Handle level-based resources (new dynamic level system) ---
    if (itemType === 'level-resource') {
      const level = itemData.level || 1;
      const totalPoints = getLevelPoints(level);

      // Add score
      this.scene.addScore(totalPoints);

      // Track delivery for transcendence system
      if (this.scene.onHighTierDelivery) {
        this.scene.onHighTierDelivery(level);
      }

      // Visual feedback for level resource
      const levelName = getLevelName(level);
      this.createLevelAcceptEffect(level, totalPoints, levelName);

      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted Level ${level} (${levelName}) resource, +${totalPoints} points`
      );
      return true;
    }

    // --- Handle purity resources ---
    if (itemType === 'purity-resource') {
      const purity = itemData.purity || 1;
      const chainCount = itemData.chainCount || 1;
      const totalPoints = calculateDeliveryScore(purity, chainCount);

      // Add score
      this.scene.addScore(totalPoints);

      // Track delivery for transcendence system
      // Purity 3+ counts as high-tier (L3 equivalent) for Era 1
      if (this.scene.onHighTierDelivery && purity >= 3) {
        this.scene.onHighTierDelivery(purity);
      }

      // Visual feedback for purity resource
      const purityName = getPurityName(purity);
      this.createPurityAcceptEffect(purity, chainCount, totalPoints, purityName);

      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${purityName} (Purity ${purity}, Chain x${chainCount}), +${totalPoints} points`
      );
      return true;
    }

    // --- Handle regular resources (legacy) ---
    const resourceType = itemType;

    // Find the score for this resource type from the config
    const resourceConfig = GAME_CONFIG.resourceTypes.find((r) => r.id === resourceType);
    const pointsPerUnit = resourceConfig ? resourceConfig.points : 0; // Default to 0 if not found
    const totalPoints = pointsPerUnit * amount; // Calculate total points based on amount

    if (pointsPerUnit === 0) {
      // Check if it was a valid resource type
      console.warn(`DeliveryNode received unknown resource type: ${resourceType}`);
      // Optional: Create a different visual effect for unknown items?
      return false; // Reject unknown resource types
    }

    // Add score
    this.scene.addScore(totalPoints);

    // Visual feedback for accepted resource
    this.createAcceptEffect(resourceType, totalPoints);

    console.log(
      `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${amount}x ${resourceType}, +${totalPoints} points`
    );
    return true;
  }

  /**
   * Checks if the Delivery Node can accept a given item type.
   * @param {string} itemType - The type ID of the item (e.g., 'basic-resource', 'upgrade_package').
   * @returns {boolean} True if the type is acceptable, false otherwise.
   */
  canAcceptInput(itemType) {
    // Allow upgrade packages
    if (itemType === UPGRADE_PACKAGE_TYPE) {
      return true;
    }
    // Allow level-based resources (new dynamic level system)
    if (itemType === 'level-resource') {
      return true;
    }
    // Allow purity resources (legacy system)
    if (itemType === 'purity-resource') {
      return true;
    }
    // Allow any resource type defined in the game config (legacy)
    if (GAME_CONFIG.resourceTypes.some((r) => r.id === itemType)) {
      return true;
    }
    // Reject unknown types
    console.warn(
      `DeliveryNode at (${this.gridX}, ${this.gridY}) rejecting unknown type: ${itemType}`
    );
    return false;
  }

  /**
   * Creates a visual effect when an item is accepted.
   * @param {string} itemType - The type of item accepted (resource ID or 'upgrade').
   * @param {number} points - The points awarded (0 for upgrades).
   */
  createAcceptEffect(itemType, points) {
    const color =
      itemType === 'upgrade' ? 0xcc00ff : GAME_CONFIG.resourceColors[itemType] || 0xaaaaaa;
    const textToShow = itemType === 'upgrade' ? 'Upgrade!' : `+${points}`;
    const textColor = itemType === 'upgrade' ? '#cc00ff' : '#ffd700';

    // Score/Upgrade popup text
    const popupText = this.scene.add
      .text(this.container.x, this.container.y - 15, textToShow, {
        fontFamily: 'Arial',
        fontSize: 12,
        color: textColor,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    popupText.setDepth(this.container.depth + 2);

    // Ensure text is on the world camera
    if (this.scene.addToWorld) {
      this.scene.addToWorld(popupText);
    }

    this.scene.tweens.add({
      targets: popupText,
      y: this.container.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power1',
      onComplete: () => {
        popupText.destroy();
      },
    });

    // Particle burst effect
    const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', {
      color: [color],
      colorEase: 'quad.out',
      lifespan: 400,
      speed: { min: 50, max: 100 },
      scale: { start: 0.7, end: 0 },
      gravityY: 150,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.setDepth(this.container.depth + 1);

    // Ensure particles are on the world camera
    if (this.scene.addToWorld) {
      this.scene.addToWorld(particles);
    }

    particles.explode(10);

    // Optional: Brief flash of the node
    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 0.5,
      duration: 100,
      yoyo: true,
    });
  }

  /**
   * Creates an enhanced visual effect for purity resources with chain info.
   * @param {number} purity - The purity level of the resource.
   * @param {number} chainCount - The chain count multiplier.
   * @param {number} points - The total points awarded.
   * @param {string} purityName - Display name for the purity level.
   */
  createPurityAcceptEffect(purity, chainCount, points, purityName) {
    // Get color based on purity
    const colors = [0x8b4513, 0xcd853f, 0xffd700, 0xfffacd, 0xffffff];
    const color = purity <= colors.length ? colors[purity - 1] : 0xffffff;

    // Main score popup
    const scoreText = this.scene.add
      .text(this.container.x, this.container.y - 15, `+${points}`, {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    scoreText.setDepth(this.container.depth + 3);
    if (this.scene.addToWorld) this.scene.addToWorld(scoreText);

    // Chain multiplier text (if chain > 1)
    if (chainCount > 1) {
      const chainText = this.scene.add
        .text(this.container.x + 30, this.container.y - 15, `x${chainCount}`, {
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#ff6600',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5);
      chainText.setDepth(this.container.depth + 3);
      if (this.scene.addToWorld) this.scene.addToWorld(chainText);

      // Animate chain text
      this.scene.tweens.add({
        targets: chainText,
        y: this.container.y - 50,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => chainText.destroy(),
      });
    }

    // Purity name text
    const purityText = this.scene.add
      .text(this.container.x, this.container.y + 5, purityName, {
        fontFamily: 'Arial',
        fontSize: 10,
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    purityText.setDepth(this.container.depth + 3);
    if (this.scene.addToWorld) this.scene.addToWorld(purityText);

    // Animate score text
    this.scene.tweens.add({
      targets: scoreText,
      y: this.container.y - 45,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 900,
      ease: 'Power1',
      onComplete: () => scoreText.destroy(),
    });

    // Animate purity text
    this.scene.tweens.add({
      targets: purityText,
      y: this.container.y - 20,
      alpha: 0,
      duration: 700,
      ease: 'Power1',
      onComplete: () => purityText.destroy(),
    });

    // Particle burst effect with purity color
    const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', {
      color: [color],
      colorEase: 'quad.out',
      lifespan: 500,
      speed: { min: 60, max: 120 },
      scale: { start: 0.8 + purity * 0.1, end: 0 },
      gravityY: 100,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.setDepth(this.container.depth + 1);
    if (this.scene.addToWorld) this.scene.addToWorld(particles);
    particles.explode(8 + purity * 2); // More particles for higher purity

    // Brief flash
    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 0.5,
      duration: 100,
      yoyo: true,
    });
  }

  /**
   * Creates a visual effect for level-based resource delivery.
   * @param {number} level - The resource level (1-4).
   * @param {number} points - The points awarded.
   * @param {string} levelName - Display name for the level.
   */
  createLevelAcceptEffect(level, points, levelName) {
    // Level colors: Gray (1), Green (2), Blue (3), Gold (4)
    const colors = [0x888888, 0x22cc22, 0x2288ff, 0xffcc00];
    const color = level <= colors.length ? colors[level - 1] : 0xffffff;

    // Main score popup
    const scoreText = this.scene.add
      .text(this.container.x, this.container.y - 15, `+${points}`, {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    scoreText.setDepth(this.container.depth + 3);
    if (this.scene.addToWorld) this.scene.addToWorld(scoreText);

    // Level name text
    const levelText = this.scene.add
      .text(this.container.x, this.container.y + 5, `L${level} ${levelName}`, {
        fontFamily: 'Arial',
        fontSize: 10,
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    levelText.setDepth(this.container.depth + 3);
    if (this.scene.addToWorld) this.scene.addToWorld(levelText);

    // Animate score text
    this.scene.tweens.add({
      targets: scoreText,
      y: this.container.y - 45,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 900,
      ease: 'Power1',
      onComplete: () => scoreText.destroy(),
    });

    // Animate level text
    this.scene.tweens.add({
      targets: levelText,
      y: this.container.y - 20,
      alpha: 0,
      duration: 700,
      ease: 'Power1',
      onComplete: () => levelText.destroy(),
    });

    // Particle burst effect with level color
    const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', {
      color: [color],
      colorEase: 'quad.out',
      lifespan: 500,
      speed: { min: 60, max: 120 },
      scale: { start: 0.8 + level * 0.15, end: 0 },
      gravityY: 100,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.setDepth(this.container.depth + 1);
    if (this.scene.addToWorld) this.scene.addToWorld(particles);
    particles.explode(8 + level * 3); // More particles for higher levels

    // Brief flash
    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 0.5,
      duration: 100,
      yoyo: true,
    });
  }

  /**
   * Update the node's visual representation
   */
  update() {
    // Update lifespan bar
    if (this.lifespanBar) {
      // Ensure GAME_CONFIG.nodeLifespan is accessible or store initial lifespan
      const initialLifespan = GAME_CONFIG.nodeLifespan; // Assuming it's constant
      this.lifespanBar.scaleX = Math.max(0, this.lifespan / initialLifespan);

      // Update color based on lifespan
      if (this.lifespan < initialLifespan * 0.25) {
        this.lifespanBar.fillColor = 0xff0000; // Red
      } else if (this.lifespan < initialLifespan * 0.5) {
        this.lifespanBar.fillColor = 0xffaa00; // Orange
      } else {
        this.lifespanBar.fillColor = 0x00ff00; // Green
      }
    }
  }

  updateLifespan() {
    this.lifespan--;

    if (this.lifespan <= 0) {
      this.destroy();
    }
  }

  destroy() {
    console.log(`Destroying delivery node at (${this.gridX}, ${this.gridY})`);
    // Remove from grid
    if (this.scene && this.scene.factoryGrid) {
      this.scene.factoryGrid.removeDeliveryNode(this);
    }

    // Remove from delivery nodes list in GameScene
    if (this.scene && this.scene.deliveryNodes) {
      const index = this.scene.deliveryNodes.indexOf(this);
      if (index !== -1) {
        this.scene.deliveryNodes.splice(index, 1);
      }
    }

    // Stop timer
    if (this.lifespanTimer) {
      this.lifespanTimer.remove();
    }

    // Destroy visuals
    if (this.container) {
      this.container.destroy();
    }
  }
}
