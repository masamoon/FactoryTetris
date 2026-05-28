import { GAME_CONFIG } from '../config/gameConfig';
import { getItemColorHex, getItemColorKey, getItemColorName } from '../utils/ResourceUtils';
import {
  getLevelPoints,
  getLevelName,
  getLevelColor as _getLevelColor,
} from '../config/resourceLevels';

const DELIVERY_SCORE_POPUP_DURATION = 1700;
const DELIVERY_DETAIL_POPUP_DURATION = 1450;
const DELIVERY_POPUP_STACK_SPACING = 22;
const DELIVERY_POPUP_COLUMN_SPACING = 28;
const DELIVERY_POPUP_ROWS = 5;
const DELIVERY_POPUP_COLUMNS = [-1, 0, 1];
const DELIVERY_NODE_PROGRESS_WIDTH = 24;
const DELIVERY_NODE_TAG_WIDTH = 58;
const DELIVERY_NODE_TAG_HEIGHT = 24;
const NEUTRAL_DELIVERY_COLOR = 0x6f7f8c;
const NEUTRAL_DELIVERY_BORDER_COLOR = 0xd6b46a;

export default class DeliveryNode {
  constructor(scene, config) {
    this.scene = scene;
    this.x = config.x;
    this.y = config.y;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.activeDeliveryPopups = [];
    this.condition = config.condition || {
      tier: 1,
      exact: false,
      requiredCount: 3,
      completionScoreReward: GAME_CONFIG.deliveryNodeCompletionScoreBase || 420,
      completionScrapReward: GAME_CONFIG.deliveryNodeCompletionScrapBase || 2,
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

  reserveDeliveryPopupSlot() {
    const now = this.scene?.time?.now || Date.now();
    this.activeDeliveryPopups = this.activeDeliveryPopups.filter((entry) => entry.expiresAt > now);

    const activeCount = this.activeDeliveryPopups.length;
    const row = activeCount % DELIVERY_POPUP_ROWS;
    const column =
      DELIVERY_POPUP_COLUMNS[
        Math.floor(activeCount / DELIVERY_POPUP_ROWS) % DELIVERY_POPUP_COLUMNS.length
      ];
    const slot = {
      x: this.container.x + column * DELIVERY_POPUP_COLUMN_SPACING,
      y: this.container.y - row * DELIVERY_POPUP_STACK_SPACING,
      expiresAt: now + DELIVERY_SCORE_POPUP_DURATION + 200,
    };

    this.activeDeliveryPopups.push(slot);
    return slot;
  }

  createVisuals() {
    // Create container for node parts
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setDepth(40);

    // Delivery nodes are small contracts on the board.
    const nodeColor = this.getConditionColor();
    const borderColor = this.getConditionBorderColor();

    this.sinkPlate = this.scene.add.rectangle(0, 0, 32, 32, 0x07111a, 0.78);
    this.sinkPlate.setStrokeStyle(1.5, borderColor, 0.8);
    this.container.add(this.sinkPlate);

    // Create node background (square instead of circle)
    this.background = this.scene.add.rectangle(0, 0, 24, 24, nodeColor, 0.86);
    this.container.add(this.background);

    // Create node border
    this.border = this.scene.add.rectangle(0, 0, 24, 24);
    this.border.setStrokeStyle(2, borderColor);
    this.container.add(this.border);

    this.inputChevronLeft = this.scene.add
      .triangle(-12, 0, -5, -5, -5, 5, 4, 0, 0xffffff, 0.92)
      .setOrigin(0.5);
    this.inputChevronRight = this.scene.add
      .triangle(12, 0, 5, -5, 5, 5, -4, 0, 0xffffff, 0.92)
      .setOrigin(0.5);
    this.container.add(this.inputChevronLeft);
    this.container.add(this.inputChevronRight);

    this.conditionText = this.scene.add
      .text(0, -6, 'IN', {
        fontFamily: 'Arial Black',
        fontSize: 8,
        color: '#ffd166',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.conditionText);

    this.progressText = this.scene.add
      .text(0, 5, this.getConditionBoardLabel(), {
        fontFamily: 'Arial Black',
        fontSize: 8,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.progressText);

    this.progressBarBg = this.scene.add.rectangle(
      0,
      13,
      DELIVERY_NODE_PROGRESS_WIDTH,
      3,
      0x111111,
      0.85
    );
    this.progressBarBg.setOrigin(0.5);
    this.container.add(this.progressBarBg);

    this.progressBar = this.scene.add.rectangle(
      -DELIVERY_NODE_PROGRESS_WIDTH / 2,
      13,
      0,
      3,
      nodeColor
    );
    this.progressBar.setOrigin(0, 0.5);
    this.container.add(this.progressBar);

    if (this.condition.itemColor) {
      const swatchColor = this.getConditionTierColor();
      this.colorSwatch = this.scene.add.circle(11, -11, 3.5, swatchColor, 1);
      this.colorSwatch.setStrokeStyle(1, 0xffffff, 0.95);
      this.container.add(this.colorSwatch);
    }

    this.createContractTag(borderColor);

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

  createContractTag(borderColor) {
    // Delivery nodes live on the right edge, so keep the contract tag outside
    // the playable grid instead of covering the routeable cells to the left.
    this.contractTag = this.scene.add.container(48, 0);
    this.contractTagBg = this.scene.add.rectangle(
      0,
      0,
      DELIVERY_NODE_TAG_WIDTH,
      DELIVERY_NODE_TAG_HEIGHT,
      0x07111a,
      0.9
    );
    this.contractTagBg.setStrokeStyle(1.5, borderColor, 0.9);
    this.contractTag.add(this.contractTagBg);

    this.contractTagText = this.scene.add
      .text(0, -5, this.getConditionShortLabel(), {
        fontFamily: 'Arial Black',
        fontSize: 8,
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.contractTag.add(this.contractTagText);

    this.contractProgressText = this.scene.add
      .text(0, 7, '', {
        fontFamily: 'Arial Black',
        fontSize: 8,
        color: '#ffd166',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.contractTag.add(this.contractProgressText);

    this.container.add(this.contractTag);
  }

  getConditionColor() {
    if (this.condition.itemColor) {
      return this.getConditionItemColor();
    }
    return NEUTRAL_DELIVERY_COLOR;
  }

  getConditionBorderColor() {
    return this.condition.itemColor ? this.getConditionTierColor() : NEUTRAL_DELIVERY_BORDER_COLOR;
  }

  getConditionTierColor() {
    const colors = [0x888888, 0x22cc66, 0x2288ff, 0xffcc00, 0xff66cc, 0xffffff];
    const tier = Math.max(1, Math.min(colors.length, this.condition.tier || 1));
    return colors[tier - 1];
  }

  getConditionItemColor() {
    if (!this.condition.itemColor) {
      return this.getConditionColor();
    }
    return getItemColorHex(this.condition.itemColor, this.getConditionTierColor());
  }

  getConditionColorName() {
    return this.condition.itemColor ? getItemColorName(this.condition.itemColor) : null;
  }

  getConditionShortLabel() {
    const tier = this.condition.tier || 1;
    const tierLabel = `${this.condition.exact ? '=' : ''}L${tier}${this.condition.exact ? '' : '+'}`;
    const colorName = this.getConditionColorName();
    const operationLabel = this.condition.operationLabel || null;
    return [colorName ? colorName.charAt(0).toUpperCase() : null, operationLabel, tierLabel]
      .filter(Boolean)
      .join(' ');
  }

  getConditionBoardLabel() {
    const tier = this.condition.tier || 1;
    return `${this.condition.exact ? '=' : ''}L${tier}${this.condition.exact ? '' : '+'}`;
  }

  getCompactHudLabel() {
    const required = Math.max(1, this.condition.requiredCount || 1);
    return `${this.getConditionShortLabel()}  ${this.deliveredCount}/${required}`;
  }

  getHudLabel() {
    const required = Math.max(1, this.condition.requiredCount || 1);
    const scoreReward = this.condition.completionScoreReward || this.condition.payout || 0;
    const scrapReward = this.condition.completionScrapReward || 0;
    const rewardText = scrapReward > 0 ? `+${scoreReward}/+${scrapReward}S` : `+${scoreReward}`;
    return `${this.getConditionShortLabel()} ${this.deliveredCount}/${required}  ${rewardText}`;
  }

  updateProgressVisuals() {
    const required = Math.max(1, this.condition.requiredCount || 1);
    const progress = Math.min(1, this.deliveredCount / required);
    if (this.progressText) {
      this.progressText.setText(this.getConditionBoardLabel());
    }
    if (this.contractProgressText) {
      this.contractProgressText.setText(`${this.deliveredCount}/${required}`);
    }
    if (this.progressBar) {
      this.progressBar.displayWidth = DELIVERY_NODE_PROGRESS_WIDTH * progress;
    }
  }

  getItemTier(itemData) {
    if (!itemData) return 1;
    if (typeof itemData.level === 'number') return itemData.level;
    if (typeof itemData.level === 'number') return itemData.level;
    return 1;
  }

  getItemColorKey(itemData) {
    return getItemColorKey(itemData, GAME_CONFIG.defaultItemColor || 'blue');
  }

  matchesCondition(itemData) {
    const tier = this.getItemTier(itemData);
    const requiredTier = this.condition.tier || 1;
    const tierMatches = this.condition.exact ? tier === requiredTier : tier >= requiredTier;
    const colorMatches =
      !this.condition.itemColor || this.getItemColorKey(itemData) === this.condition.itemColor;
    const operationMatches =
      !this.condition.requiredLastOperationTag ||
      itemData?.lastOperationTag === this.condition.requiredLastOperationTag;
    return tierMatches && colorMatches && operationMatches;
  }

  /**
   * Apply trait-tag-based delivery score modifiers.
   *
   * Single extension point for ALL delivery-time trait effects.
   *
   * Downstream tasks add their tag checks here:
   *   - Task 9: 'polarized' (x2)
   *   - Trait refresh: 'sequenced' (x1.75)
   *   - Task 10: 'resonant' (x1.5)
   *   - Beacon additive via scene.traitRegistry.getBeaconDeliveryBonus()
   *
   * @param {number} basePoints - Pre-modifier score for this delivery.
   * @param {object} itemData - The delivered item (carries traitTags).
   * @returns {number} Adjusted (floored) score.
   */
  applyTraitDeliveryModifiers(basePoints, itemData) {
    return this.getTraitDeliveryBreakdown(basePoints, itemData).points;
  }

  getTraitDeliveryBreakdown(basePoints, itemData) {
    const tags = Array.isArray(itemData.traitTags) ? itemData.traitTags : [];
    const reg = this.scene && this.scene.traitRegistry;
    const labels = [];
    const itemColor = this.getItemColorKey(itemData);
    const colorConfig = GAME_CONFIG.itemColors?.[itemColor];
    // Beacon: each placed Beacon adds +0.1 to the base delivery modifier.
    const beaconBonus =
      reg && typeof reg.getBeaconDeliveryBonus === 'function' ? reg.getBeaconDeliveryBonus() : 0;
    // Accumulate ALL modifiers multiplicatively, then floor ONCE below.
    let modifier = 1.0 + beaconBonus;
    if (colorConfig?.scoreMultiplier) {
      modifier *= colorConfig.scoreMultiplier;
      labels.push(colorConfig.name || getItemColorName(itemColor));
    }
    if (beaconBonus > 0) labels.push('Beacon');
    if (tags.includes('tycoon')) {
      modifier *= 1.5;
      labels.push('Tycoon');
    }
    if (tags.includes('polarized')) {
      modifier *= 2.0;
      labels.push('Polarized');
    }
    if (tags.includes('sequenced')) {
      modifier *= 1.75;
      labels.push('Sequenced');
    }
    if (tags.includes('resonant')) {
      modifier *= 1.5;
      labels.push('Resonant');
    }
    const adjusted = Math.floor(basePoints * modifier);
    if (modifier !== 1.0) {
      console.log(
        `[DeliveryNode] trait-adjusted score: ${basePoints} -> ${adjusted} (tags: ${tags.join(',')})`
      );
    }
    return {
      points: adjusted,
      multiplier: modifier,
      labels,
      itemColor,
    };
  }

  formatMultiplier(multiplier) {
    const rounded = Math.round((multiplier || 1) * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  }

  getScoreBreakdownText(resourceLabel, basePoints, multiplier, labels = []) {
    const multText = this.formatMultiplier(multiplier);
    const tagText = labels.length > 0 ? ` ${labels.slice(0, 2).join('+')}` : '';
    return `${resourceLabel}  ${basePoints} x${multText}${tagText}`;
  }

  getFilledRewardMultiplier() {
    const multiplier = GAME_CONFIG.filledDeliveryNodeRewardMultiplier ?? 0.35;
    return Math.max(0, Math.min(1, multiplier));
  }

  applyFilledRewardPenalty(reward, wasAlreadyFilled) {
    if (!wasAlreadyFilled) return reward;

    return {
      ...reward,
      points: Math.floor((reward?.points || 0) * this.getFilledRewardMultiplier()),
      filledDelivery: true,
    };
  }

  getDeliveryLabels(labels = [], wasAlreadyFilled = false) {
    return wasAlreadyFilled ? ['Overflow', ...labels] : labels;
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
    const wasAlreadyFilled = this.completed;

    // --- Handle level-based resources (new dynamic level system) ---
    if (itemType === 'level-resource') {
      if (!this.matchesCondition(itemData)) {
        this.scene?.recordDeliveryRejection?.(this, itemData);
        return false;
      }
      const level = itemData.level || 1;
      const totalPoints = getLevelPoints(level);
      const traitBreakdown = this.getTraitDeliveryBreakdown(totalPoints, itemData);
      const reward = this.applyFilledRewardPenalty(
        this.scene.getDeliveryReward?.(traitBreakdown.points, level, itemData) || {
          points: traitBreakdown.points,
          countsForFlow: true,
        },
        wasAlreadyFilled
      );

      // Add score
      const awardedPoints =
        this.scene.addScore(reward.points, { countsForFlow: reward.countsForFlow }) ||
        reward.points;

      if (this.scene.recordDeliveryFlow) {
        this.scene.recordDeliveryFlow(itemData, level, reward);
      }

      if (wasAlreadyFilled) {
        this.recordOverflowDelivery(level);
      } else {
        this.recordSatisfiedDelivery(level);
      }

      // Visual feedback for level resource
      const levelName = getLevelName(level);
      this.createLevelAcceptEffect(level, awardedPoints, levelName, {
        basePoints: totalPoints,
        multiplier: awardedPoints / Math.max(1, totalPoints),
        itemColor: traitBreakdown.itemColor,
        labels: this.getDeliveryLabels(traitBreakdown.labels, wasAlreadyFilled),
      });

      console.log(
        `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted Level ${level} (${levelName}) resource, +${reward.points} points${reward.countsForFlow ? '' : ' (off-contract salvage)'}${wasAlreadyFilled ? ' (filled-node overflow)' : ''}`
      );
      return true;
    }

    // --- Handle regular resources (legacy) ---
    const resourceType = itemType;
    if (!this.matchesCondition({ ...itemData, level: 1 })) {
      this.scene?.recordDeliveryRejection?.(this, { ...itemData, level: 1 });
      return false;
    }

    // Find the score for this resource type from the config
    const resourceConfig = GAME_CONFIG.resourceTypes.find((r) => r.id === resourceType);
    const pointsPerUnit = resourceConfig ? resourceConfig.points : 0; // Default to 0 if not found
    let totalPoints = pointsPerUnit * amount; // Calculate total points based on amount

    if (pointsPerUnit === 0) {
      // Check if it was a valid resource type
      console.warn(`DeliveryNode received unknown resource type: ${resourceType}`);
      // Optional: Create a different visual effect for unknown items?
      return false; // Reject unknown resource types
    }

    if (wasAlreadyFilled) {
      totalPoints = Math.floor(totalPoints * this.getFilledRewardMultiplier());
    }

    // Add score
    this.scene.addScore(totalPoints, { countsForFlow: false });
    if (wasAlreadyFilled) {
      this.recordOverflowDelivery(1);
    } else {
      this.recordSatisfiedDelivery(1);
    }

    // Visual feedback for accepted resource
    this.createAcceptEffect(resourceType, totalPoints);

    console.log(
      `DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${amount}x ${resourceType}, +${totalPoints} points${wasAlreadyFilled ? ' (filled-node overflow)' : ''}`
    );
    return true;
  }

  recordOverflowDelivery(tier) {
    this.createFillPulse(tier);
    if (this.scene && typeof this.scene.updateRoundUI === 'function') {
      this.scene.updateRoundUI();
    }
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
    const itemColor = this.getConditionColor();
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
    this.completionScoreReward =
      this.scene && typeof this.scene.getDeliveryNodeCompletionScore === 'function'
        ? this.scene.getDeliveryNodeCompletionScore(this)
        : this.condition.completionScoreReward || this.condition.payout || 0;
    this.completionScrapReward =
      this.scene && typeof this.scene.getDeliveryNodeCompletionScrap === 'function'
        ? this.scene.getDeliveryNodeCompletionScrap(this)
        : this.condition.completionScrapReward || 0;
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
    const tierColor = this.getConditionBorderColor();
    const itemColor = this.getConditionColor();
    this.scene.cameras.main.shake(120, 0.004);
    this.scene.cameras.main.flash(90, 255, 255, 255, true);

    const burstText = this.scene.add
      .text(
        this.container.x,
        this.container.y - 24,
        `+${this.completionScoreReward || 0}  +${this.completionScrapReward || 0}S`,
        {
          fontFamily: 'Arial Black',
          fontSize: 18,
          color: '#88ffcc',
          stroke: '#000000',
          strokeThickness: 4,
        }
      )
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
   * @param {string} itemType - The type ID of the item (e.g., 'basic-resource').
   * @returns {boolean} True if the type is acceptable, false otherwise.
   */
  canAcceptInput(itemType, itemData = null) {
    // Allow level-based resources (new dynamic level system)
    if (itemType === 'level-resource') {
      const accepted = itemData ? this.matchesCondition(itemData) : true;
      if (!accepted) this.scene?.recordDeliveryRejection?.(this, itemData);
      return accepted;
    }
    // Allow any resource type defined in the game config (legacy)
    if (GAME_CONFIG.resourceTypes.some((r) => r.id === itemType)) {
      const candidate = { ...itemData, level: 1 };
      const accepted = itemData ? this.matchesCondition(candidate) : true;
      if (!accepted) this.scene?.recordDeliveryRejection?.(this, candidate);
      return accepted;
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
    const popupSlot = this.reserveDeliveryPopupSlot();
    const color =
      itemType === 'upgrade' ? 0xcc00ff : GAME_CONFIG.resourceColors[itemType] || 0xaaaaaa;
    const textToShow = itemType === 'upgrade' ? 'Upgrade!' : `+${points}`;
    const textColor = itemType === 'upgrade' ? '#cc00ff' : '#ffd700';

    // Score/Upgrade popup text
    const popupText = this.scene.add
      .text(popupSlot.x, popupSlot.y - 15, textToShow, {
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
      y: popupSlot.y - 34,
      alpha: 0,
      duration: DELIVERY_SCORE_POPUP_DURATION,
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
   * Creates a visual effect for level-based resource delivery.
   * @param {number} level - The resource level (1-4).
   * @param {number} points - The points awarded.
   * @param {string} levelName - Display name for the level.
   */
  createLevelAcceptEffect(level, points, levelName, breakdown = null) {
    const popupSlot = this.reserveDeliveryPopupSlot();
    // Level colors: Gray (1), Green (2), Blue (3), Gold (4)
    const colors = [0x888888, 0x22cc22, 0x2288ff, 0xffcc00];
    const tierColor = level <= colors.length ? colors[level - 1] : 0xffffff;
    const color =
      breakdown?.itemColor != null
        ? getItemColorHex(breakdown.itemColor, colors[level - 1] || 0xffffff)
        : level <= colors.length
          ? colors[level - 1]
          : 0xffffff;

    // Main score popup
    const scoreText = this.scene.add
      .text(popupSlot.x, popupSlot.y - 15, `+${points}`, {
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
    const detailText = breakdown
      ? this.getScoreBreakdownText(
          `L${level} ${levelName}`,
          breakdown.basePoints,
          breakdown.multiplier,
          breakdown.labels
        )
      : `L${level} ${levelName}`;
    const levelText = this.scene.add
      .text(popupSlot.x, popupSlot.y + 5, detailText, {
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
      y: popupSlot.y - 38,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: DELIVERY_SCORE_POPUP_DURATION,
      ease: 'Power1',
      onComplete: () => scoreText.destroy(),
    });

    // Animate level text
    this.scene.tweens.add({
      targets: levelText,
      y: popupSlot.y - 16,
      alpha: 0,
      duration: DELIVERY_DETAIL_POPUP_DURATION,
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
