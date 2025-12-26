import Phaser from 'phaser';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
    this.upgradeManager = null;
    this.callingSceneKey = null;
    this.isLevelUp = false;
    this.upgradeChoices = [];
    this.selectedUpgrade = null;
  }

  init(data) {
    this.upgradeManager = data.upgradeManager;
    this.callingSceneKey = data.callingSceneKey || 'GameScene';
    this.isLevelUp = data.isLevelUp || false;
    this.upgradeChoices = [];
    this.selectedUpgrade = null;
  }

  create() {
    if (!this.upgradeManager) {
      console.error('UpgradeScene launched without UpgradeManager!');
      this.closeScene(); // Close if manager is missing
      return;
    }

    // Create a semi-transparent dark overlay
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Add title
    let titleText = this.isLevelUp ? 'LEVEL UP! Choose an Upgrade' : 'Choose an Upgrade';

    this.title = this.add
      .text(width / 2, height * 0.15, titleText, {
        fontFamily: 'Arial',
        fontSize: 28,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Get upgrade choices from manager
    this.upgradeChoices = this.upgradeManager.getUpgradeChoices(3);

    // Create upgrade cards
    this.createUpgradeCards();
  }

  createUpgradeCards() {
    if (this.upgradeChoices.length === 0) {
      console.log('No available upgrades to choose from.');
      // Display a message and close?
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 50,
          'No upgrades available!',
          {
            fontSize: '24px',
            fill: '#ffffff',
          }
        )
        .setOrigin(0.5);
      this.time.delayedCall(1500, this.closeScene, [], this); // Auto-close after a delay
      return;
    }

    // Display choices
    const buttonYStart = 200;
    const buttonYStep = 120;
    const buttonWidth = 400;
    const buttonHeight = 100;

    this.upgradeChoices.forEach((choice, index) => {
      const y = buttonYStart + index * buttonYStep;
      this.createUpgradeButton(this.cameras.main.width / 2, y, buttonWidth, buttonHeight, choice);
    });
  }

  createUpgradeButton(x, y, width, height, choice) {
    const bg = this.add
      .rectangle(x, y, width, height, 0x3a5f95)
      .setStrokeStyle(2, 0x6a8fbb)
      .setInteractive({ useHandCursor: true });

    const textContent = `${choice.name} (Lvl ${choice.level})\n${choice.description}`;
    const text = this.add
      .text(x, y, textContent, {
        fontSize: '18px',
        fill: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 20 },
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.fillColor = 0x4a6fb5;
    });
    bg.on('pointerout', () => {
      bg.fillColor = 0x3a5f95;
    });
    bg.on('pointerdown', () => {
      // Apply the upgrade
      this.upgradeManager.applyUpgrade(choice.type);
      console.log(`Selected Upgrade: ${choice.name}`);

      // Play sound (optional)
      if (this.scene.get(this.callingSceneKey)?.playSound) {
        this.scene.get(this.callingSceneKey).playSound('upgrade-select'); // Assuming sound key exists
      }

      // Close this scene and resume the calling scene
      this.closeScene();
    });

    return { bg, text };
  }

  closeScene() {
    // Resume the calling scene (GameScene)
    const callingScene = this.scene.get(this.callingSceneKey);
    if (callingScene) {
      callingScene.events.emit('upgradeSelected'); // Signal completion
      this.scene.resume(this.callingSceneKey);
    }
    // Stop this scene
    this.scene.stop(this.key);
  }
}
