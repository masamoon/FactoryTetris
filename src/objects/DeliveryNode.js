import { GAME_CONFIG } from '../config/gameConfig';
import { UPGRADE_PACKAGE_TYPE } from '../config/upgrades.js';
import {
  calculateDeliveryScore,
  getItemColorHex,
  getItemColorName,
  getItemColorText,
  getPurityColor,
  getPurityName,
} from '../utils/PurityUtils';
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
    this.condition = config.condition || {
      tier: 1,
      exact: false,
      requiredCount: 3,
      payout: GAME_CONFIG.deliveryNodeBasePayout || 18,
      label: 'L1+ x3',
    };
    this.deliveredCount = 0;
    this.completed = false;
    this.lifespan = config.lifespan || GAME_CONFIG.nodeLifespan; // Use default lifespan if not provided

    console.log(
      `Created delivery node at (${this.gridX}, ${this.gridY}) with condition ${this.condition.label}`
    );

    // Create visual representation
    this.createVisuals();

    // Output nodes are permanent and don't expire
    // (lifespan timer removed)
  }

  createVisuals() {
    // Create container for node parts
    this.container = this.scene.add.container(this.x, this.y);

    // Delivery nodes are small contracts on the board.
    const nodeColor = this.getConditionColor();
    const borderColor = 0xffffff;

    // Create node background (square instead of circle)
    this.background = this.scene.add.rectangle(0, 0, 24, 24, nodeColor);
    this.container.add(this.background);

    // Create node border
    this.border = this.scene.add.rectangle(0, 0, 24, 24);
    this.border.setStrokeStyle(2, borderColor);
    this.container.add(this.border);

    this.conditionText = this.scene.add
      .text(0, -20, this.getConditionShortLabel(), {
        fontFamily: 'Arial Black',
        fontSize: 9,
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(this.conditionText);

    this.progressText = this.scene.add
      .text(0, 0, `${this.deliveredCount}/${this.condition.requiredCount}`, {
        fontFamily: 'Arial Black',
        fontSize: 9,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.progressText);

    this.progressBarBg = this.scene.add.rectangle(0, 17, 24, 4, 0x111111, 0.85);
    this.progressBarBg.setOrigin(0.5);
    this.container.add(this.progressBarBg);

    this.progressBar = this.scene.add.rectangle(-12, 17, 0, 4, 0x88ffcc);
    this.progressBar.setOrigin(0, 0.5);
    this.container.add(this.progressBar);

    if (this.condition.itemColor) {
      const swatchColor = this.getConditionItemColor();
      this.colorSwatch = this.scene.add.circle(10, -10, 5, swatchColor, 1);
      this.colorSwatch.setStrokeStyle(1.5, 0xffffff, 0.95);
      this.container.add(this.colorSwatch);
    }

    // Lifespan bar removed - output nodes are permanent

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

    this.updateProgressVisuals();
  }

  getConditionColor() {
    const colors = [0x888888, 0x22cc66, 0x2288ff, 0xffcc00, 0xff66cc, 0xffffff];
    const tier = Math.max(1, Math.min(colors.length, this.condition.tier || 1));
    return colors[tier - 1];
  }

  getConditionItemColor() {
    return getItemColorHex(this.condition.itemColor, this.getConditionColor());
  }

  getConditionColorName() {
    return this.condition.itemColor ? getItemColorName(this.condition.itemColor) : null;
  }

  getConditionShortLabel() {
    const tier = this.condition.tier || 1;
    const tierLabel = `${this.condition.exact ? '=' : ''}L${tier}${this.condition.exact ? '' : '+'}`;
    const colorName = this.getConditionColorName();
    return colorName ? `${colorName.charAt(0).toUpperCase()} ${tierLabel}` : tierLabel;
  }

  getHudLabel() {
    return `${this.getConditionShortLabel()} ${this.deliveredCount}/${this.condition.requiredCount}  +$${this.condition.payout}`;
  }

  updateProgressVisuals() {
    const required = Math.max(1, this.condition.requiredCount || 1);
    const progress = Math.min(1, this.deliveredCount / required);
    if (this.progressText) {
      this.progressText.setText(`${this.deliveredCount}/${required}`);
    }
    if (this.progressBar) {
      this.progressBar.displayWidth = 24 * progress;
    }
  }

  getItemTier(itemData) {
    if (!itemData) return 1;
    if (typeof itemData.level === 'number') return itemData.level;
    if (typeof itemData.purity === 'number') return itemData.purity;
    return 1;
  }

  matchesCondition(itemData) {
    if (this.completed) return false;
    const tier = this.getItemTier(itemData);
    const requiredTier = this.condition.tier || 1;
    const tierMatches = this.condition.exact ? tier === requiredTier : tier >= requiredTier;
    const colorMatches =
      !this.condition.itemColor || (itemData && itemData.itemColor === this.condition.itemColor);
    return tierMatches && colorMatches;
  }

  /**
   * Apply trait-tag-based delivery score modifiers.
   *
   * Single extension point for ALL delivery-time trait effects. Called from
   * both the level-resource and purity-resource scoring branches so traits
   * work regardless of which resource type the game actually delivers
   * (machine output is purity-resource; level-resource is a legacy path).
   *
   * Downstream tasks add their tag checks here:
   *   - Task 9: 'polarized' (x2), 'bypass' (x0.75)
   *   - Task 10: 'resonant' (x1.5)
   *   - Task 11: 'hoarder@<id>' (x2 every 5th via scene.traitRegistry),
   *              Beacon additive via scene.traitRegistry.getBeaconChainBonus()
   *
   * @param {number} basePoints - Pre-modifier score for this delivery.
   * @param {object} itemData - The delivered item (carries traitTags).
   * @returns {number} Adjusted (floored) score.
   */
  applyTraitDeliveryModifiers(basePoints, itemData) {
    const tags = Array.isArray(itemData.traitTags) ? itemData.traitTags : [];
    const reg = this.scene && this.scene.traitRegistry;
    // Beacon: each placed Beacon adds +0.1 to the base delivery modifier.
    const beaconBonus =
      reg && typeof reg.getBeaconChainBonus === 'function' ? reg.getBeaconChainBonus() : 0;
    // Accumulate ALL modifiers multiplicatively, then floor ONCE below.
    let modifier = 1.0 + beaconBonus;
    if (tags.includes('tycoon')) modifier *= 1.5;
    if (tags.includes('polarized')) modifier *= 2.0;
    if (tags.includes('bypass')) modifier *= 0.75;
    if (tags.includes('resonant')) modifier *= 1.5;
    // Hoarder: per-machine running counter; every 5th delivery doubles.
    const hoarderTag = tags.find((t) => typeof t === 'string' && t.startsWith('hoarder@'));
    if (hoarderTag && reg && typeof reg.incrementHoarder === 'function') {
      const machineId = hoarderTag.substring('hoarder@'.length);
      const count = reg.incrementHoarder(machineId);
      if (count % 5 === 0) {
        modifier *= 2.0;
        console.log(
          `[trait:hoarder] ${machineId} hit ${count}-th delivery, doubling this delivery's score`
        );
      }
    }
    const adjusted = Math.floor(basePoints * modifier);
    if (modifier !== 1.0) {
      console.log(
        `[DeliveryNode] trait-adjusted score: ${basePoints} -> ${adjusted} (tags: ${tags.join(',')})`
      );
    }
    return adjusted;
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
    if (this.completed) {
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
      if (!this.matchesCondition(itemData)) {
        return false;
      }
      const level = itemData.level || 1;
      const totalPoints = getLevelPoints(level);
      const adjustedPoints = this.applyTraitDeliveryModifiers(totalPoints, itemData);
      const reward = { points: adjustedPoints, countsForFlow: true };

      // Add score
      this.scene.addScore(reward.points, { countsForFlow: reward.countsForFlow });

      if (this.scene.recordDeliveryFlow) {
        this.scene.recordDeliveryFlow(itemData, level, reward);
      }

      this.recordSatisfiedDelivery(level);

      // Visual feedback for level resource
      const levelName = getLevelName(level);
      this.createLevelAcceptEffect(level, reward.points, levelName, itemData);

      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted Level ${level} (${levelName}) resource, +${reward.points} points${reward.countsForFlow ? '' : ' (off-contract salvage)'}`
      );
      return true;
    }

    // --- Handle purity resources ---
    if (itemType === 'purity-resource') {
      if (!this.matchesCondition(itemData)) {
        return false;
      }
      const purity = itemData.purity || 1;
      const chainCount = itemData.chainCount || 1;
      const totalPoints = calculateDeliveryScore(purity, chainCount);
      const adjustedPoints = this.applyTraitDeliveryModifiers(totalPoints, itemData);
      const reward = { points: adjustedPoints, countsForFlow: true };

      // Add score
      this.scene.addScore(reward.points, { countsForFlow: reward.countsForFlow });

      if (this.scene.recordDeliveryFlow) {
        this.scene.recordDeliveryFlow(itemData, purity, reward);
      }

      this.recordSatisfiedDelivery(purity);

      // Visual feedback for purity resource
      const purityName = getPurityName(purity);
      this.createPurityAcceptEffect(purity, chainCount, reward.points, purityName, itemData);

      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${purityName} (Purity ${purity}, Chain x${chainCount}), +${reward.points} points${reward.countsForFlow ? '' : ' (off-contract salvage)'}`
      );
      return true;
    }

    // --- Handle regular resources (legacy) ---
    const resourceType = itemType;
    if (!this.matchesCondition({ ...itemData, purity: 1 })) {
      return false;
    }

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
    this.scene.addScore(totalPoints, { countsForFlow: false });
    this.recordSatisfiedDelivery(1);

    // Visual feedback for accepted resource
    this.createAcceptEffect(resourceType, totalPoints);

    console.log(
      `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${amount}x ${resourceType}, +${totalPoints} points`
    );
    return true;
  }

  recordSatisfiedDelivery(tier) {
    if (this.completed) return;
    this.deliveredCount++;
    this.updateProgressVisuals();
    this.createFillPulse(tier);

    if (this.scene && typeof this.scene.updateRoundUI === 'function') {
      this.scene.updateRoundUI();
    }

    if (this.deliveredCount >= (this.condition.requiredCount || 1)) {
      this.completeDeliveryNode();
    }
  }

  createFillPulse(tier) {
    const itemColor = this.getConditionItemColor();
    if (this.background) {
      this.scene.tweens.add({
        targets: this.background,
        scaleX: 1.45,
        scaleY: 1.45,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
    if (this.colorSwatch) {
      this.scene.tweens.add({
        targets: this.colorSwatch,
        scaleX: 1.65,
        scaleY: 1.65,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    const ring = this.scene.add.circle(this.container.x, this.container.y, 15, itemColor, 0);
    ring.setStrokeStyle(2, itemColor, 0.9);
    ring.setDepth(this.container.depth + 2);
    if (this.scene.addToWorld) this.scene.addToWorld(ring);
    this.scene.tweens.add({
      targets: ring,
      radius: 26 + tier * 2,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  completeDeliveryNode() {
    if (this.completed) return;
    this.completed = true;
    this.deliveredCount = this.condition.requiredCount || this.deliveredCount;
    this.updateProgressVisuals();
    this.createCompletionBurst();

    if (this.progressText) {
      this.progressText.setText('FULL');
      this.progressText.setFontSize(8);
    }
    if (this.conditionText) {
      this.conditionText.setText('DONE');
    }

    if (this.scene && typeof this.scene.onDeliveryNodeCompleted === 'function') {
      this.scene.onDeliveryNodeCompleted(this);
    }
  }

  createCompletionBurst() {
    const tierColor = this.getConditionColor();
    const itemColor = this.getConditionItemColor();
    this.scene.cameras.main.shake(120, 0.004);
    this.scene.cameras.main.flash(90, 255, 255, 255, true);

    const burstText = this.scene.add
      .text(this.container.x, this.container.y - 24, `+$${this.condition.payout}`, {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#88ffcc',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    burstText.setDepth(this.container.depth + 4);
    if (this.scene.addToWorld) this.scene.addToWorld(burstText);

    this.scene.tweens.add({
      targets: burstText,
      y: this.container.y - 60,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 900,
      ease: 'Power2',
      onComplete: () => burstText.destroy(),
    });

    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(
        this.container.x,
        this.container.y,
        18 + i * 4,
        itemColor,
        0
      );
      ring.setStrokeStyle(2, i % 2 === 0 ? itemColor : tierColor, 0.95 - i * 0.2);
      ring.setDepth(this.container.depth + 3);
      if (this.scene.addToWorld) this.scene.addToWorld(ring);
      this.scene.tweens.add({
        targets: ring,
        radius: 44 + i * 14,
        alpha: 0,
        duration: 520 + i * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', {
      color: [itemColor, tierColor, 0xffffff, 0x88ffcc],
      lifespan: 700,
      speed: { min: 90, max: 210 },
      scale: { start: 1.1, end: 0 },
      gravityY: 120,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.setDepth(this.container.depth + 3);
    if (this.scene.addToWorld) this.scene.addToWorld(particles);
    particles.explode(34);
    this.scene.time.delayedCall(800, () => particles.destroy());

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 130,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Checks if the Delivery Node can accept a given item type.
   * @param {string} itemType - The type ID of the item (e.g., 'basic-resource', 'upgrade_package').
   * @returns {boolean} True if the type is acceptable, false otherwise.
   */
  canAcceptInput(itemType, itemData = null) {
    if (this.completed) {
      return false;
    }
    // Allow upgrade packages
    if (itemType === UPGRADE_PACKAGE_TYPE) {
      return true;
    }
    // Allow level-based resources (new dynamic level system)
    if (itemType === 'level-resource') {
      return itemData ? this.matchesCondition(itemData) : true;
    }
    // Allow purity resources (legacy system)
    if (itemType === 'purity-resource') {
      return itemData ? this.matchesCondition(itemData) : true;
    }
    // Allow any resource type defined in the game config (legacy)
    if (GAME_CONFIG.resourceTypes.some((r) => r.id === itemType)) {
      return itemData ? this.matchesCondition({ ...itemData, purity: 1 }) : true;
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
  createPurityAcceptEffect(purity, chainCount, points, purityName, itemData = null) {
    const color = getItemColorHex(itemData?.itemColor, this.getConditionItemColor());
    const purityColor = getPurityColor(purity, this.scene.time.now);
    const colorName = itemData?.itemColor ? getItemColorName(itemData.itemColor) : null;

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
      .text(
        this.container.x,
        this.container.y + 5,
        colorName ? `${colorName} ${purityName}` : purityName,
        {
          fontFamily: 'Arial',
          fontSize: 10,
          color: getItemColorText(itemData?.itemColor, `#${color.toString(16).padStart(6, '0')}`),
          stroke: '#000000',
          strokeThickness: 2,
        }
      )
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
      color: [color, purityColor],
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
  createLevelAcceptEffect(level, points, levelName, itemData = null) {
    // Level colors: Gray (1), Green (2), Blue (3), Gold (4)
    const colors = [0x888888, 0x22cc22, 0x2288ff, 0xffcc00];
    const tierColor = level <= colors.length ? colors[level - 1] : 0xffffff;
    const color = getItemColorHex(itemData?.itemColor, tierColor);
    const colorName = itemData?.itemColor ? getItemColorName(itemData.itemColor) : null;

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
      .text(
        this.container.x,
        this.container.y + 5,
        `${colorName ? `${colorName} ` : ''}L${level} ${levelName}`,
        {
          fontFamily: 'Arial',
          fontSize: 10,
          color: getItemColorText(itemData?.itemColor, `#${color.toString(16).padStart(6, '0')}`),
          stroke: '#000000',
          strokeThickness: 2,
        }
      )
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
      color: [color, tierColor],
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
    // Output nodes are permanent - no lifespan update needed
  }

  // updateLifespan removed - output nodes are permanent

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

    // No lifespan timer to stop - output nodes are permanent

    // Destroy visuals
    if (this.container) {
      this.container.destroy();
    }
  }
}
