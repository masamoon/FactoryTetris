import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { _UpgradeManager } from '../managers/UpgradeManager';
import { createPurityResource } from '../utils/PurityUtils';

export default class ResourceNode {
  constructor(scene, config, round, upgradeManager) {
    this.scene = scene;
    this.upgradeManager = upgradeManager;
    this.x = config.x;
    this.y = config.y;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.resourceType = GAME_CONFIG.resourceTypes[config.resourceType];
    this.resourceLevel = 1; // Resource nodes always output Level 1 resources
    this.lifespan = config.lifespan;
    this.round = round || 1;

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

    // Initialize with resources based on round (using round-1 as factor starts from round 1)
    // Initialize with resources based on round (using round-1 as factor starts from round 1)
    const bountyModifier = this.upgradeManager.getResourceBountyModifier();
    const initialMin = Math.floor(
      (baseInitialMin + (this.round - 1) * roundFactorInitialMin) * bountyModifier
    );
    const initialMax = Math.floor(
      (baseInitialMax + (this.round - 1) * roundFactorInitialMax) * bountyModifier
    );
    this.resources = Phaser.Math.Between(initialMin, initialMax); // Start with resources based on round

    // Apply Node Longevity Modifier to Lifespan
    const longevityModifier = this.upgradeManager.getNodeLongevityModifier();
    this.lifespan = Math.floor(config.lifespan * longevityModifier);
    console.log(
      `[ResourceNode] Created with lifespan ${this.lifespan} (Base: ${config.lifespan}, Mod: ${longevityModifier})`
    );

    // Max resources based on round
    this.maxResources = baseMaxResources + (this.round - 1) * roundFactorMaxResources;

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

    // Set up lifespan timer
    this.lifespanTimer = scene.time.addEvent({
      delay: 1000,
      callback: this.updateLifespan,
      callbackScope: this,
      loop: true,
    });

    // Set up resource generation timer using calculated delay
    this.resourceTimer = scene.time.addEvent({
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
    let nodeColor;
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
        nodeColor = 0x00aa44; // Default green
    }

    // Create node background
    this.background = this.scene.add.circle(0, 0, 12, nodeColor);
    this.container.add(this.background);

    // Create node border
    this.border = this.scene.add.circle(0, 0, 12);
    this.border.setStrokeStyle(2, 0x008833);
    this.container.add(this.border);

    // Create resource indicator
    this.resourceIndicator = this.scene.add
      .text(0, 0, '0', {
        fontFamily: 'Arial',
        fontSize: 10,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.container.add(this.resourceIndicator);

    // Create lifespan indicator
    this.lifespanBar = this.scene.add.rectangle(0, 16, 24, 4, 0x00ff00);
    this.container.add(this.lifespanBar);

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

  /**
   * Generate a new resource
   */
  generateResource() {
    if (this.resources < this.maxResources) {
      this.resources++;
      //console.log(`Resource node at (${this.gridX}, ${this.gridY}) generated resource: ${this.resources}/${this.maxResources} ${this.resourceType.id}`);

      // Visual feedback for resource generation
      const resourceParticle = this.scene.add
        .circle(
          this.container.x,
          this.container.y,
          4,
          0xffff00 // Use a distinct color for generation feedback maybe?
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

    // Update the visual indicator
    if (this.resourceIndicator) {
      this.resourceIndicator.setText(this.resources.toString());
    }
  }

  /**
   * Update the node's visual representation
   */
  update() {
    // Update resource indicator
    if (this.resourceIndicator) {
      this.resourceIndicator.setText(this.resources.toString());
    }

    // Update lifespan bar
    if (this.lifespanBar) {
      this.lifespanBar.scaleX = this.lifespan / GAME_CONFIG.nodeLifespan;

      // Update color based on lifespan
      if (this.lifespan < GAME_CONFIG.nodeLifespan * 0.25) {
        this.lifespanBar.fillColor = 0xff0000;
      } else if (this.lifespan < GAME_CONFIG.nodeLifespan * 0.5) {
        this.lifespanBar.fillColor = 0xffaa00;
      }
    }

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

  /**
   * Check adjacent cells and push resources to valid conveyors OR machines
   */
  pushResourcesToConveyors() {
    // Check cooldown
    const now = this.scene.time.now;
    if (now - this.lastPushTime < this.pushCooldown) {
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

      // --- Priority 1: Push directly to adjacent Machine (non-conveyor) ---
      if (cell && cell.type === 'machine' && cell.machine && cell.machine.id !== 'conveyor') {
        const targetMachine = cell.machine;
        // Create purity resource with initial purity 1
        const itemToPush = createPurityResource(1);
        // Pass itemData to canAcceptInput for level-based validation
        if (
          targetMachine.canAcceptInput &&
          targetMachine.canAcceptInput('purity-resource', itemToPush)
        ) {
          if (targetMachine.acceptItem(itemToPush)) {
            this.resources--; // Decrement node resources
            this.lastPushTime = now; // Reset cooldown
            if (this.resourceIndicator) {
              this.resourceIndicator.setText(this.resources.toString());
            }
            this.createTransferEffect(targetMachine);
            return; // Pushed successfully to machine
          }
        }
      }

      // --- Priority 2: Push to adjacent Conveyor pointing AWAY ---
      else if (cell && cell.type === 'machine' && cell.machine && cell.machine.id === 'conveyor') {
        const conveyor = cell.machine;

        // Check if conveyor is pointing away from the node
        let isPointingAway = false;
        if (offset.dx === 1 && conveyor.direction !== 'left') isPointingAway = true; // Target is right, conveyor not pointing left
        if (offset.dx === -1 && conveyor.direction !== 'right') isPointingAway = true; // Target is left, conveyor not pointing right
        if (offset.dy === 1 && conveyor.direction !== 'up') isPointingAway = true; // Target is down, conveyor not pointing up
        if (offset.dy === -1 && conveyor.direction !== 'down') isPointingAway = true; // Target is up, conveyor not pointing down

        // Create purity resource with initial purity 1 for validation check
        const itemToPush = createPurityResource(1);
        if (
          isPointingAway &&
          conveyor.canAcceptInput &&
          conveyor.canAcceptInput('purity-resource', itemToPush)
        ) {
          if (conveyor.acceptItem(itemToPush)) {
            this.resources--; // Decrement node resources
            this.lastPushTime = now; // Reset cooldown
            if (this.resourceIndicator) {
              this.resourceIndicator.setText(this.resources.toString());
            }
            this.createTransferEffect(conveyor);
            return; // Pushed successfully to conveyor
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
      this.resourceType.color || 0xaaaaaa
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
    this.lifespan--;

    if (this.lifespan <= 0) {
      this.destroy();
    }
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
    if (now - this.lastPushTime < this.pushCooldown) {
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
        `ResourceNode at (${this.gridX}, ${this.gridY}) extracted ${amountExtracted} ${this.resourceType.id}, remaining: ${this.resources}`
      );

      // Update visual indicator
      if (this.resourceIndicator) {
        this.resourceIndicator.setText(this.resources.toString());
      }

      // Return purity resource with initial purity 1
      const purityResource = createPurityResource(1);
      purityResource.amount = amountExtracted;
      return purityResource;
    } else {
      //console.log(`ResourceNode at (${this.gridX}, ${this.gridY}) attempt to extract failed, no resources.`);
      return null; // No resources available
    }
  }
}
