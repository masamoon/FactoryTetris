import Phaser from 'phaser';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
    this.upgradeManager = null;
    this.callingSceneKey = null;
    this.isLevelUp = false;
    this.isShop = false;
    this.upgradeChoices = [];
    this.selectedUpgrade = null;
  }

  init(data) {
    this.upgradeManager = data.upgradeManager;
    this.callingSceneKey = data.callingSceneKey || 'GameScene';
    this.isLevelUp = data.isLevelUp || false;
    this.isBoon = data.isBoon || false;
    this.isShop = data.isShop || false;
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
    let titleText = this.isBoon
      ? 'Choose a Boon'
      : this.isShop
        ? 'Scrap Shop'
        : this.isLevelUp
          ? 'Upgrade Ready'
          : 'Choose an Upgrade';

    this.title = this.add
      .text(width / 2, height * 0.15, titleText, {
        fontFamily: 'Arial',
        fontSize: 28,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Get upgrade choices from manager
    const callingScene = this.scene.get(this.callingSceneKey);
    this.upgradeChoices = this.isShop
      ? callingScene?.getShopChoices?.() || []
      : this.isBoon
        ? this.upgradeManager.getBoonChoices(3)
        : this.upgradeManager.getUpgradeChoices(3);

    if (this.isShop) {
      this.scrapText = this.add
        .text(width / 2, height * 0.22, `Scrap: ${callingScene?.scrap || 0}`, {
          fontFamily: 'Arial',
          fontSize: 20,
          color: '#ffd166',
          align: 'center',
        })
        .setOrigin(0.5);
    }

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
    const buttonYStart = this.isShop ? 205 : 200;
    const buttonYStep = this.isShop ? 92 : 120;
    const buttonWidth = 400;
    const buttonHeight = this.isShop ? 76 : 100;

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

    const costText = this.isShop ? ` [${choice.cost || 0} Scrap]` : '';
    const kindText = this.isShop && choice.kind ? `${choice.kind} - ` : '';
    const textContent = choice.level
      ? `${choice.name} (Lvl ${choice.level})${costText}\n${choice.description}`
      : `${kindText}${choice.name}${costText}\n${choice.description}`;
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
      if (this.isShop) {
        const callingScene = this.scene.get(this.callingSceneKey);
        const result = callingScene?.buyShopChoice?.(choice) || {
          success: false,
          message: 'Shop unavailable.',
        };
        if (!result.success) {
          this.showShopMessage(result.message || 'Cannot buy that.');
          return;
        }
        if (result.closeShop !== false) {
          this.closeScene();
        }
        return;
      } else if (this.isBoon) {
        this.upgradeManager.applyBoon(choice.type);
      } else {
        this.upgradeManager.applyUpgrade(choice.type);
      }
      console.log(`Selected: ${choice.name}`);
      if (this.scene.get(this.callingSceneKey)?.playSound) {
        this.scene.get(this.callingSceneKey).playSound('upgrade-select');
      }
      this.closeScene();
    });

    return { bg, text };
  }

  showShopMessage(message) {
    if (this.shopMessage) {
      this.shopMessage.destroy();
    }

    this.shopMessage = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 70, message, {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ff7777',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.shopMessage,
      alpha: 0,
      duration: 1200,
      ease: 'Power1',
      onComplete: () => {
        if (this.shopMessage) {
          this.shopMessage.destroy();
          this.shopMessage = null;
        }
      },
    });
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
