import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { _UpgradeManager } from '../managers/UpgradeManager';
import {
  createPurityResource,
  getItemColorHex,
  getItemColorName,
  getSourceItemColor,
} from '../utils/PurityUtils';

export default class ResourceNode {
  constructor(scene, config, round, upgradeManager) {
    this.scene = scene;
    this.upgradeManager = upgradeManager;
    this.x = config.x;
    this.y = config.y;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.resourceType = GAME_CONFIG.resourceTypes[config.resourceType];
    this.itemColor =
      config.itemColor ||
      getSourceItemColor(
        this.resourceType.id,
        typeof config.sourceIndex === 'number' ? config.sourceIndex : 0
      );
    this.resourceLevel = 1; // Resource nodes always output Level 1 resources
    this.lifespan = config.lifespan;
    this.round = round || 1;
    this.isFiniteSource = config.finiteSource ?? GAME_CONFIG.finiteResourceRounds ?? false;
    this.showColorTag = config.showColorTag ?? false;

    // Calculate properties based on round
    const baseInitialMin = 3;
    const baseInitialMax = 5;
    const baseMaxResources = 100;
    const baseGenerationRate = 2000; // Base rate ms
    const minGenerationRate = 500; // Minimum delay ms
    const roundFactorInitialMin = 1;
    const roundFactorInitialMax = 2;
    const roundFactorMaxResources = 25;
    const roundFactorGenerationRate = 100; // ms reduction per round

    const bountyModifier = this.upgradeManager.getResourceBountyModifier();
    const initialMin = Math.floor(
      (baseInitialMin + (this.round - 1) * roundFactorInitialMin) * bountyModifier
    );
    const initialMax = Math.floor(
      (baseInitialMax + (this.round - 1) * roundFactorInitialMax) * bountyModifier
    );
    const configuredInitialResources =
      typeof config.initialResources === 'number'
        ? Math.max(0, Math.floor(config.initialResources))
        : null;
    this.resources =
      configuredInitialResources !== null
        ? configuredInitialResources
        : Phaser.Math.Between(initialMin, initialMax); // Start with resources based on round

    this.lifespan = Infinity;
    console.log(
      `[ResourceNode] Created ${this.isFiniteSource ? 'finite' : 'permanent'} resource source`
    );

    // Max resources based on round
    this.maxResources =
      typeof config.maxResources === 'number'
        ? Math.max(this.resources, Math.floor(config.maxResources))
        : this.isFiniteSource
          ? this.resources
          : baseMaxResources + (this.round - 1) * roundFactorMaxResources;

    // Calculate base generation delay based on round
    this.baseGenerationDelay = Math.max(
      minGenerationRate,
      baseGenerationRate - (this.round - 1) * roundFactorGenerationRate
    );

    // Apply the regeneration modifier
    const regenModifier = this.upgradeManager.getResourceRegenModifier();
    const generationDelay = this.baseGenerationDelay / regenModifier;

    // Add cooldown for pushing/extracting resources
    this.pushCooldown = 800; // Increased to 800ms - push/extract resources no more than every 0.8 seconds
    this.lastPushTime = 0;

    //console.log(`Created resource node at (${this.gridX}, ${this.gridY}) for round ${this.round} with ${this.resources}/${this.maxResources} ${this.resourceType.id}, gen delay: ${generationDelay}ms`);

    // Create visual representation
    this.createVisuals();

    this.lifespanTimer = null;

    // Set up resource generation timer using calculated delay. Finite roguelite
    // sources do not regenerate; their remaining inventory is the round budget.
    this.resourceTimer = this.isFiniteSource
      ? null
      : scene.time.addEvent({
          delay: generationDelay, // Use calculated delay
          callback: this.generateResource,
          callbackScope: this,
          loop: true,
        });
  }

  createVisuals() {
    // Create container for node parts
    const _cellSize = this.scene.factoryGrid.cellSize;
    this.container = this.scene.add.container(this.x, this.y);

    // Set color based on resource type
    let nodeColor = getItemColorHex(this.itemColor, this.resourceType?.color || 0x00aa44);
    switch (this.resourceType.id) {
      case 'raw-resource':
        nodeColor = 0x00aa44; // Green for raw resources
        break;
      case 'copper-ore':
        nodeColor = 0xd2691e; // Copper color
        break;
      case 'iron-ore':
        nodeColor = 0xa19d94; // Iron color
        break;
      case 'coal':
        nodeColor = 0x36454f; // Coal color
        break;
      default:
        nodeColor = getItemColorHex(this.itemColor, this.resourceType?.color || 0x00aa44);
    }
    nodeColor = getItemColorHex(this.itemColor, nodeColor);

    this.sourcePlate = this.scene.add.rectangle(0, 0, 30, 30, 0x07111a, 0.72);
    this.sourcePlate.setStrokeStyle(1.5, 0x88ffcc, 0.75);
    this.container.add(this.sourcePlate);

    // Create node background
    this.background = this.scene.add.circle(0, 0, 11, nodeColor);
    this.container.add(this.background);

    // Create node border
    this.border = this.scene.add.circle(0, 0, 13);
    this.border.setStrokeStyle(2, 0x88ffcc);
    this.container.add(this.border);

    this.outputArrow = this.scene.add
      .triangle(16, 0, -4, -5, -4, 5, 5, 0, 0x88ffcc, 1)
      .setOrigin(0.5);
    this.container.add(this.outputArrow);

    this.outputBadge = this.scene.add
      .text(0, -9, 'OUT', {
        fontFamily: 'Arial Black',
        fontSize: 6,
        color: '#88ffcc',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.outputBadge);

    // Create resource supply indicator.
    this.resourceIndicator = this.scene.add
      .text(0, 3, `${this.resources}`, {
        fontFamily: 'Arial',
        fontSize: 10,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.resourceIndicator);

    this.colorTag = this.scene.add
      .text(-13, 13, getItemColorName(this.itemColor).charAt(0).toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: 8,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.colorTag.setVisible(this.showColorTag);
    this.container.add(this.colorTag);

    this.lifespanBar = null;

    // Add pulsing animation
    this.scene.tweens.add({
      targets: this.background,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  updateResourceIndicator() {
    if (this.resourceIndicator) {
      this.resourceIndicator.setText(`${this.resources}`);
    }
  }

  setItemColor(itemColor) {
    if (!itemColor || itemColor === this.itemColor) return;

    this.itemColor = itemColor;
    const color = getItemColorHex(this.itemColor, this.resourceType?.color || 0x00aa44);
    if (this.background) {
      this.background.setFillStyle(color);
    }
    if (this.sourcePlate) {
      this.sourcePlate.setStrokeStyle(1.5, color, 0.9);
    }
    if (this.outputArrow) {
      this.outputArrow.setFillStyle(color, 1);
    }
    if (this.outputBadge) {
      this.outputBadge.setColor('#88ffcc');
    }
    if (this.colorTag) {
      this.colorTag.setText(getItemColorName(this.itemColor).charAt(0).toUpperCase());
      this.colorTag.setVisible(this.showColorTag);
    }
  }

  setColorTagVisible(visible) {
    this.showColorTag = Boolean(visible);
    if (this.colorTag) {
      this.colorTag.setVisible(this.showColorTag);
    }
  }

  /**
   * Generate a new resource
   */
  generateResource() {
    if (this.isFiniteSource) return;

    if (this.resources < this.maxResources) {
      this.resources++;
      //console.log(`Resource node at (${this.gridX}, ${this.gridY}) generated resource: ${this.resources}/${this.maxResources} ${this.resourceType.id}`);

      // Visual feedback for resource generation
      const resourceParticle = this.scene.add
        .circle(
          this.container.x,
          this.container.y,
          4,
          getItemColorHex(this.itemColor, this.resourceType?.color || 0xffff00)
        )
        .setDepth(this.container.depth + 1); // Ensure particle is visible

      // Ensure particle is on the world camera
      if (this.scene.addToWorld) {
        this.scene.addToWorld(resourceParticle);
      }

      this.scene.tweens.add({
        targets: resourceParticle,
        alpha: 0,
        y: this.container.y - 20,
        duration: 500,
        onComplete: () => {
          resourceParticle.destroy();
        },
      });
    } else {
      //console.log(`Resource node at (${this.gridX}, ${this.gridY}) is full: ${this.resources}/${this.maxResources}`);
    }

    this.updateResourceIndicator();
  }

  /**
   * Update the node's visual representation
   */
  update() {
    this.updateResourceIndicator();

    // Push resources to adjacent conveyors
    this.pushResourcesToConveyors();

    // Periodically log the node's status
    if (this.scene.time.now % 5000 < 16) {
      // Log every ~5 seconds
      //console.log*(`ResourceNode at (${this.gridX}, ${this.gridY}):`);
      //console.log*(`- Type: ${this.resourceType.id}`);
      //console.log*(`- Resources: ${this.resources}/${this.maxResources}`);
      //console.log*(`- Lifespan: ${this.lifespan}/${GAME_CONFIG.nodeLifespan}`);
    }

    // Check for upgrades periodically (every 2 seconds)
    if (this.scene.time.now % 2000 < 20) {
      this.updateFromUpgrades();
    }
  }

  /**
   * Updates properties based on current upgrade levels
   */
  updateFromUpgrades() {
    if (this.isFiniteSource) return;
    if (!this.upgradeManager || !this.resourceTimer) return;

    // Update resource generation speed
    const regenModifier = this.upgradeManager.getResourceRegenModifier();
    const newDelay = this.baseGenerationDelay / regenModifier;

    if (this.resourceTimer.delay !== newDelay) {
      // confirm it's valid
      if (!isNaN(newDelay) && newDelay > 0) {
        // console.log(`[ResourceNode] Updating gen delay from ${this.resourceTimer.delay} to ${newDelay} (Mod: ${regenModifier})`);
        this.resourceTimer.delay = newDelay;
      }
    }
  }

  createOutputItem(amount = 1) {
    const item = createPurityResource(1, this.itemColor);
    item.amount = amount;
    item.itemColor = this.itemColor;
    item.sourceColor = this.itemColor;
    item.sourceGridX = this.gridX;
    item.sourceGridY = this.gridY;
    return item;
  }

  /**
   * Check adjacent cells and push resources to valid conveyors OR machines
   */
  pushResourcesToConveyors() {
    // Check cooldown
    const now = this.scene.time.now;
    const flowMod =
      this.scene && typeof this.scene.getFlowSpeedMultiplier === 'function'
        ? this.scene.getFlowSpeedMultiplier()
        : 1;
    if (now - this.lastPushTime < this.pushCooldown / flowMod) {
      return; // Still on cooldown
    }

    // If no resources available, don't attempt to push
    if (this.resources <= 0) {
      return;
    }

    // Offset positions for adjacent cells
    const adjacentOffsets = [
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 0, dy: -1 }, // Up
    ];

    for (const offset of adjacentOffsets) {
      const targetX = this.gridX + offset.dx;
      const targetY = this.gridY + offset.dy;

      // Check grid bounds
      if (
        targetX < 0 ||
        targetX >= this.scene.factoryGrid.width ||
        targetY < 0 ||
        targetY >= this.scene.factoryGrid.height
      ) {
        continue;
      }

      const cell = this.scene.factoryGrid.getCell(targetX, targetY);

      const targetMachine = cell?.machine || cell?.object;
      const isConveyorLike = Boolean(targetMachine && Array.isArray(targetMachine.itemsOnBelt));
      if (targetMachine?.acceptsDirectSource === false) {
        continue;
      }

      // --- Priority 1: Push directly to adjacent processing Machine (non-belt) ---
      if (cell && cell.type === 'machine' && targetMachine && !isConveyorLike) {
        // Create purity resource with initial purity 1
        const itemToPush = this.createOutputItem();
        // Pass itemData to canAcceptInput for level-based validation
        if (
          targetMachine.canAcceptInput &&
          targetMachine.canAcceptInput('purity-resource', itemToPush)
        ) {
          if (targetMachine.acceptItem(itemToPush)) {
            this.resources--; // Decrement node resources
            this.lastPushTime = now; // Reset cooldown
            this.updateResourceIndicator();
            this.createTransferEffect(targetMachine);
            return; // Pushed successfully to machine
          }
        }
      }

      // --- Priority 2: Push to adjacent belt-like machine pointing AWAY ---
      else if (cell && cell.type === 'machine' && targetMachine && isConveyorLike) {
        let isPointingAway = false;
        if (targetMachine.id === 'underground-belt') {
          isPointingAway = true;
        } else {
          if (offset.dx === 1 && targetMachine.direction !== 'left') isPointingAway = true;
          if (offset.dx === -1 && targetMachine.direction !== 'right') isPointingAway = true;
          if (offset.dy === 1 && targetMachine.direction !== 'up') isPointingAway = true;
          if (offset.dy === -1 && targetMachine.direction !== 'down') isPointingAway = true;
        }

        // Create purity resource with initial purity 1 for validation check
        const itemToPush = this.createOutputItem();
        if (
          isPointingAway &&
          targetMachine.canAcceptInput &&
          targetMachine.canAcceptInput('purity-resource', itemToPush)
        ) {
          if (targetMachine.acceptItem(itemToPush, this)) {
            this.resources--; // Decrement node resources
            this.lastPushTime = now; // Reset cooldown
            this.updateResourceIndicator();
            this.createTransferEffect(targetMachine);
            return; // Pushed successfully to belt-like machine
          }
        }
      }
    }
  }

  /**
   * Creates a visual effect for resource transfer
   * @param {BaseMachine} targetMachine - The machine receiving the resource
   */
  createTransferEffect(targetMachine) {
    const targetPos = targetMachine.container
      ? { x: targetMachine.container.x, y: targetMachine.container.y }
      : this.scene.factoryGrid.gridToWorld(targetMachine.gridX, targetMachine.gridY);

    const particle = this.scene.add.circle(
      this.container.x,
      this.container.y,
      5,
      getItemColorHex(this.itemColor, this.resourceType.color || 0xaaaaaa)
    );
    particle.setDepth(this.container.depth + 1);

    // Ensure particle is on the world camera
    if (this.scene.addToWorld) {
      this.scene.addToWorld(particle);
    }

    this.scene.tweens.add({
      targets: particle,
      x: targetPos.x,
      y: targetPos.y,
      duration: 300, // Faster transfer effect
      ease: 'Power1',
      onComplete: () => {
        particle.destroy();
      },
    });
  }

  updateLifespan() {
    // Resource nodes are permanent in the round-based loop.
  }

  destroy() {
    // Remove from grid
    this.scene.factoryGrid.removeResourceNode(this);

    // Remove from resource nodes list
    const index = this.scene.resourceNodes.indexOf(this);
    if (index !== -1) {
      this.scene.resourceNodes.splice(index, 1);
    }

    // Stop timer
    if (this.lifespanTimer) {
      this.lifespanTimer.remove();
    }
    // Also stop the resource generation timer
    if (this.resourceTimer) {
      this.resourceTimer.remove();
    }

    // Destroy visuals
    if (this.container) {
      this.container.destroy();
    }
  }

  /**
   * Extracts one unit of resource, potentially modified by bounty upgrades.
   * Called by external entities like Conveyors.
   * @returns {object|null} An object { type: string, amount: number } or null if no resources.
   */
  extractResource() {
    // Apply the same cooldown as in pushResourcesToConveyors
    const now = this.scene.time.now;
    const flowMod =
      this.scene && typeof this.scene.getFlowSpeedMultiplier === 'function'
        ? this.scene.getFlowSpeedMultiplier()
        : 1;
    if (now - this.lastPushTime < this.pushCooldown / flowMod) {
      //console.log(`ResourceNode at (${this.gridX}, ${this.gridY}) extraction attempt on cooldown`);
      return null; // Still on cooldown
    }

    if (this.resources > 0) {
      const bountyModifier = this.upgradeManager.getResourceBountyModifier();
      const amountExtracted = Math.max(1, Math.floor(1 * bountyModifier)); // Ensure at least 1 is extracted

      // Decrement resources, but don't go below zero
      const resourcesConsumed = 1; // Always consumes 1 base unit per extraction attempt
      this.resources = Math.max(0, this.resources - resourcesConsumed);

      // Update cooldown timestamp
      this.lastPushTime = now;

      console.log(
        `ResourceNode at (${this.gridX}, ${this.gridY}) extracted ${amountExtracted} ${this.itemColor} L1, remaining: ${this.resources}`
      );

      this.updateResourceIndicator();

      // Return purity resource with initial purity 1
      return this.createOutputItem(amountExtracted);
    } else {
      //console.log(`ResourceNode at (${this.gridX}, ${this.gridY}) attempt to extract failed, no resources.`);
      return null; // No resources available
    }
  }
}
