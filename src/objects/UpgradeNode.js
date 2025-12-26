import Phaser from 'phaser';
import { UPGRADE_PACKAGE_TYPE } from '../config/upgrades.js';

// Assuming a base class or structure exists for grid objects
// Might need to extend Phaser.GameObjects.Sprite or a custom base class

export class UpgradeNode extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, gridX, gridY) {
    super(scene, x, y, 'upgrade-node'); // Replace 'upgrade-node' with your actual texture key
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.isDepleted = false;
    this.spawnTimer = null; // Timer for continuous spawning if needed, or just one-time

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Make it static if it doesn't move

    // Add to a specific group for collision or interaction checks if necessary
    // e.g., scene.upgradeNodesGroup.add(this);

    // Additional properties similar to ResourceNode
    this.setInteractive(); // Optional: for clicking/tooltips
    // this.on('pointerdown', () => console.log('Clicked Upgrade Node'));
  }

  // Called by a conveyor belt trying to extract
  extractResource() {
    if (this.isDepleted) {
      return null; // Nothing left to extract
    }

    // For simplicity, assume one package per node. It becomes depleted after.
    this.isDepleted = true;
    this.setAlpha(0.5); // Visually indicate depletion
    this.emit('depleted', this);

    // Return an object representing the item to be placed on the conveyor
    return {
      type: UPGRADE_PACKAGE_TYPE,
      texture: 'upgrade-package', // Replace with your actual texture key
    };
  }

  // Optional: If nodes should regenerate or have a lifespan
  // setupTimers() { ... }
  // destroyNode() { ... }

  // Pre-destroy cleanup
  preDestroy() {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
    }
    super.preDestroy();
  }
}
