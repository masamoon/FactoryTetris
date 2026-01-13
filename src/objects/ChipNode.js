import _Phaser from 'phaser';
import { CHIP_CONFIG, getChipOutputTier, _getTiersForEra } from '../config/eraConfig';
import { getLevelColor, _getLevelName } from '../config/resourceLevels';

/**
 * ChipNode - A 3×3 passive resource emitter representing a previous era's factory
 *
 * Chips are created when the player transcends. They occupy a 3×3 grid area
 * and automatically emit resources at their designated tier level(s).
 */
export default class ChipNode {
  constructor(scene, config) {
    this.scene = scene;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.chipEra = config.chipEra; // The era this chip was created from
    this.emissionRate = config.emissionRate || CHIP_CONFIG.emissionInterval;

    // Calculate world position from grid position
    const worldPos = scene.factoryGrid.gridToWorld(this.gridX + 1, this.gridY + 1); // Center of 3x3
    this.x = worldPos.x;
    this.y = worldPos.y;

    // Determine output tier(s) based on chip era
    // Chip from era N emits tiers for era N+1's input
    this.outputTier = getChipOutputTier(this.chipEra + 1);

    // All tiers this chip can emit (for multi-pin support)
    // A chip can emit accumulated tiers from previous eras
    this.emittableTiers = this.calculateEmittableTiers();

    // Internal resource buffer for each tier
    this.resources = {};
    this.maxResources = 5; // Buffer cap per tier
    for (const tier of this.emittableTiers) {
      this.resources[tier] = 0;
    }

    // Cooldowns for pushing resources
    this.pushCooldown = 800;
    this.lastPushTime = 0;

    // Create visuals
    this.createVisuals();

    // Set up emission timer
    this.emissionTimer = scene.time.addEvent({
      delay: this.emissionRate,
      callback: this.emitResources,
      callbackScope: this,
      loop: true,
    });

    console.log(
      `[ChipNode] Created chip from Era ${this.chipEra} at (${this.gridX}, ${this.gridY}), emitting tier L${this.outputTier}`
    );
  }

  /**
   * Calculate which tiers this chip emits based on its source era
   */
  calculateEmittableTiers() {
    // For simplicity, each chip emits one tier: the input tier of the next era
    // Era 1 chip → Era 2 input (L4)
    // Era 2 chip → Era 3 input (L7)
    return [this.outputTier];
  }

  /**
   * Get output pin positions for routing (right edge of 3x3)
   */
  getOutputPins() {
    const pins = [];
    // Output pins are on the right edge of the chip (gridX + 2)
    // For a 3x3 chip, the center row is gridY + 1
    const centerRow = this.gridY + 1;
    const tierCount = this.emittableTiers.length;
    const startRow = centerRow - Math.floor((tierCount - 1) / 2);

    for (let i = 0; i < this.emittableTiers.length; i++) {
      pins.push({
        gridX: this.gridX + 2, // Right edge
        gridY: startRow + i, // Centered vertically
        tier: this.emittableTiers[i],
      });
    }
    return pins;
  }

  createVisuals() {
    const cellSize = this.scene.factoryGrid.cellSize;

    // Create container at world position
    this.container = this.scene.add.container(this.x, this.y);

    // Main chip body (3x3 area)
    const chipSize = CHIP_CONFIG.size * cellSize - 4; // Slight padding
    this.body = this.scene.add.rectangle(0, 0, chipSize, chipSize, 0x1a1a2e);
    this.body.setStrokeStyle(3, 0x4444aa);
    this.container.add(this.body);

    // Inner glow effect
    this.innerGlow = this.scene.add.rectangle(0, 0, chipSize - 10, chipSize - 10, 0x2a2a4e, 0.6);
    this.container.add(this.innerGlow);

    // Label showing era
    this.label = this.scene.add
      .text(0, -20, `ERA ${this.chipEra}`, {
        fontFamily: 'Arial',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#aaaaff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.label);

    // Create output pin indicators on right edge
    this.outputPinVisuals = [];
    const pinStartY = -((this.emittableTiers.length - 1) * cellSize) / 2;

    for (let i = 0; i < this.emittableTiers.length; i++) {
      const tier = this.emittableTiers[i];
      const tierColor = getLevelColor(tier);
      const pinY = pinStartY + i * cellSize;

      // Pin circle
      const pin = this.scene.add.circle(chipSize / 2 - 5, pinY, 8, tierColor);
      pin.setStrokeStyle(2, 0xffffff);
      this.container.add(pin);

      // Tier label
      const tierLabel = this.scene.add
        .text(chipSize / 2 - 5, pinY, `L${tier}`, {
          fontFamily: 'Arial',
          fontSize: 8,
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.container.add(tierLabel);

      this.outputPinVisuals.push({ pin, tierLabel, tier });
    }

    // Pulsing animation for the inner glow
    this.scene.tweens.add({
      targets: this.innerGlow,
      alpha: 0.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtle breathing animation for the whole chip
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ensure visuals are on the world camera
    if (this.scene.addToWorld) {
      this.scene.addToWorld(this.container);
    }
  }

  /**
   * Generate resources at each emission tick
   */
  emitResources() {
    console.log(`[ChipNode] emitResources called, tiers: ${this.emittableTiers.join(', ')}`);
    for (const tier of this.emittableTiers) {
      if (this.resources[tier] < this.maxResources) {
        this.resources[tier]++;
        console.log(
          `[ChipNode] Generated L${tier} resource, buffer now: ${this.resources[tier]}/${this.maxResources}`
        );
        this.createEmissionEffect(tier);
      }
    }
  }

  /**
   * Visual effect when generating a resource
   */
  createEmissionEffect(tier) {
    const tierColor = getLevelColor(tier);

    // Small particle burst at center
    const particle = this.scene.add.circle(this.x, this.y, 4, tierColor);
    particle.setAlpha(0.8);

    if (this.scene.addToWorld) {
      this.scene.addToWorld(particle);
    }

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      y: this.y - 15,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 400,
      onComplete: () => particle.destroy(),
    });
  }

  /**
   * Update loop - push resources to adjacent machines
   */
  update() {
    this.pushResourcesToAdjacent();
  }

  /**
   * Push resources to adjacent machines on the output side (right edge)
   */
  pushResourcesToAdjacent() {
    const now = this.scene.time.now;
    if (now - this.lastPushTime < this.pushCooldown) {
      return;
    }

    const pins = this.getOutputPins();

    for (const pin of pins) {
      if (this.resources[pin.tier] <= 0) {
        // Log periodically to show resources are empty
        if (now % 5000 < 20) {
          console.log(
            `[ChipNode] No resources for tier L${pin.tier}, buffer: ${this.resources[pin.tier]}`
          );
        }
        continue;
      }

      // Check cell to the right of the pin
      const targetX = pin.gridX + 1;
      const targetY = pin.gridY;

      console.log(`[ChipNode] Trying to push L${pin.tier} to cell (${targetX}, ${targetY})`);

      // Bounds check
      if (targetX >= this.scene.factoryGrid.width) {
        console.log(
          `[ChipNode] Target cell (${targetX}, ${targetY}) out of bounds (grid width: ${this.scene.factoryGrid.width})`
        );
        continue;
      }

      const cell = this.scene.factoryGrid.getCell(targetX, targetY);
      if (!cell) {
        console.log(`[ChipNode] No cell at (${targetX}, ${targetY})`);
        continue;
      }
      if (cell.type !== 'machine') {
        console.log(
          `[ChipNode] Cell at (${targetX}, ${targetY}) is type '${cell.type}', not 'machine'`
        );
        continue;
      }
      if (!cell.object) {
        console.log(
          `[ChipNode] Cell at (${targetX}, ${targetY}) has type 'machine' but no machine object`
        );
        continue;
      }

      const targetMachine = cell.object;
      console.log(
        `[ChipNode] Found machine ${targetMachine.id || targetMachine.constructor.name} at (${targetX}, ${targetY})`
      );

      // Try to push purity-resource (matching rest of codebase)
      const itemToPush = {
        type: 'purity-resource',
        purity: pin.tier,
        amount: 1,
      };
      // Pass itemData to canAcceptInput for level-based validation
      if (
        targetMachine.canAcceptInput &&
        targetMachine.canAcceptInput('purity-resource', itemToPush)
      ) {
        console.log(`[ChipNode] Machine can accept purity-resource, attempting push...`);
        if (targetMachine.acceptItem(itemToPush)) {
          this.resources[pin.tier]--;
          this.lastPushTime = now;
          this.createTransferEffect(targetMachine, pin.tier);
          console.log(`[ChipNode] Successfully pushed L${pin.tier} to ${targetMachine.id}`);
          return; // One push per update cycle
        } else {
          console.log(`[ChipNode] Machine rejected item via acceptItem()`);
        }
      } else {
        console.log(`[ChipNode] Machine cannot accept purity-resource`);
      }
    }
  }

  /**
   * Visual effect when transferring a resource
   */
  createTransferEffect(targetMachine, tier) {
    const tierColor = getLevelColor(tier);
    const targetPos = targetMachine.container
      ? { x: targetMachine.container.x, y: targetMachine.container.y }
      : this.scene.factoryGrid.gridToWorld(targetMachine.gridX, targetMachine.gridY);

    const particle = this.scene.add.circle(this.x + 40, this.y, 6, tierColor);
    particle.setStrokeStyle(1, 0xffffff);

    if (this.scene.addToWorld) {
      this.scene.addToWorld(particle);
    }

    this.scene.tweens.add({
      targets: particle,
      x: targetPos.x,
      y: targetPos.y,
      duration: 250,
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }

  /**
   * Get the grid cells occupied by this chip
   */
  getOccupiedCells() {
    const cells = [];
    for (let dx = 0; dx < CHIP_CONFIG.size; dx++) {
      for (let dy = 0; dy < CHIP_CONFIG.size; dy++) {
        cells.push({
          x: this.gridX + dx,
          y: this.gridY + dy,
        });
      }
    }
    return cells;
  }

  /**
   * Clean up the chip
   */
  destroy() {
    if (this.emissionTimer) {
      this.emissionTimer.remove();
    }

    if (this.container) {
      this.container.destroy();
    }

    // Remove from grid cells
    const cells = this.getOccupiedCells();
    for (const cell of cells) {
      this.scene.factoryGrid.setCell(cell.x, cell.y, null);
    }

    // Remove from chips array
    const index = this.scene.chips?.indexOf(this);
    if (index !== undefined && index !== -1) {
      this.scene.chips.splice(index, 1);
    }
  }
}
