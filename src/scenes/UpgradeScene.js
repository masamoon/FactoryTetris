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
      ? 'Choose a Run Boon'
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

    if (this.isShop) {
      this.createShopCards();
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

  createShopCards() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const callingScene = this.scene.get(this.callingSceneKey);
    const scrap = callingScene?.scrap || 0;
    const offers = this.upgradeChoices.filter((choice) => choice.type !== 'skip_shop');
    const saveChoice =
      this.upgradeChoices.find((choice) => choice.type === 'skip_shop') ||
      this.upgradeChoices[this.upgradeChoices.length - 1];

    this.add
      .rectangle(width / 2, height / 2 + 20, 700, 430, 0x09131d, 0.94)
      .setStrokeStyle(2, 0x2f4d62, 0.95);

    this.add
      .text(width / 2, 138, `Available Scrap: ${scrap}`, {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    const cardWidth = 206;
    const cardHeight = 224;
    const gap = 18;
    const totalWidth = offers.length * cardWidth + Math.max(0, offers.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + cardWidth / 2;

    offers.forEach((choice, index) => {
      this.createShopOfferButton(
        startX + index * (cardWidth + gap),
        314,
        cardWidth,
        cardHeight,
        choice,
        scrap
      );
    });

    if (saveChoice) {
      this.createShopSaveButton(width / 2, 506, 260, 52, saveChoice);
    }
  }

  createShopOfferButton(x, y, width, height, choice, scrap) {
    const canAfford = choice.isFree || scrap >= (choice.cost || 0);
    const fillColor = canAfford ? 0x173244 : 0x171d25;
    const hoverColor = canAfford ? 0x214b64 : 0x202633;
    const strokeColor = canAfford ? 0x4aa3c7 : 0x4b5663;
    const textColor = canAfford ? '#f4fbff' : '#8c98a3';
    const accentColor = this.getShopKindColor(choice.kind);

    const bg = this.add
      .rectangle(x, y, width, height, fillColor, 0.98)
      .setStrokeStyle(2, strokeColor, canAfford ? 0.95 : 0.55)
      .setInteractive({ useHandCursor: true });

    const kindBadge = this.add
      .rectangle(x - width / 2 + 48, y - height / 2 + 25, 76, 26, accentColor, canAfford ? 1 : 0.45)
      .setStrokeStyle(1, 0xffffff, 0.18);
    this.add
      .text(kindBadge.x, kindBadge.y, choice.kind || 'Offer', {
        fontFamily: 'Arial',
        fontSize: 11,
        fontStyle: 'bold',
        color: canAfford ? '#061018' : '#a9b2bb',
        align: 'center',
      })
      .setOrigin(0.5);

    const costLabel = choice.isFree ? 'FREE' : `${choice.cost || 0} Scrap`;
    const costBg = this.add
      .rectangle(x + width / 2 - 50, y - height / 2 + 25, 84, 26, 0x0c151d, 0.95)
      .setStrokeStyle(1, 0xffd166, canAfford ? 0.8 : 0.35);
    this.add
      .text(costBg.x, costBg.y, costLabel, {
        fontFamily: 'Arial',
        fontSize: 11,
        fontStyle: 'bold',
        color: canAfford ? '#ffd166' : '#8a7a52',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y - 54, choice.name, {
        fontFamily: 'Arial',
        fontSize: 18,
        fontStyle: 'bold',
        color: textColor,
        align: 'center',
        wordWrap: { width: width - 28 },
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 18, choice.description || '', {
        fontFamily: 'Arial',
        fontSize: 13,
        color: canAfford ? '#cfe1ea' : '#7f8a94',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: width - 30 },
      })
      .setOrigin(0.5);

    if (!canAfford) {
      this.add
        .text(x, y + height / 2 - 25, 'Need more Scrap', {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#ff8a8a',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    bg.on('pointerover', () => {
      bg.fillColor = hoverColor;
      bg.setStrokeStyle(2, canAfford ? 0x7ad7ff : 0x66717d, canAfford ? 1 : 0.65);
    });
    bg.on('pointerout', () => {
      bg.fillColor = fillColor;
      bg.setStrokeStyle(2, strokeColor, canAfford ? 0.95 : 0.55);
    });
    bg.on('pointerdown', () => {
      this.handleShopChoice(choice);
    });
  }

  createShopSaveButton(x, y, width, height, choice) {
    const bg = this.add
      .rectangle(x, y, width, height, 0x26313b, 0.98)
      .setStrokeStyle(2, 0x6b7c8c, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, 'Save Scrap', {
        fontFamily: 'Arial',
        fontSize: 18,
        fontStyle: 'bold',
        color: '#f4fbff',
        align: 'center',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.fillColor = 0x334250;
    });
    bg.on('pointerout', () => {
      bg.fillColor = 0x26313b;
    });
    bg.on('pointerdown', () => {
      this.handleShopChoice(choice);
    });
  }

  getShopKindColor(kind) {
    switch (kind) {
      case 'Machine':
        return 0x70d6ff;
      case 'Board':
        return 0x88ffcc;
      case 'Color':
        return 0xffd166;
      case 'Utility':
        return 0xcdb4db;
      case 'Run':
        return 0xff8fab;
      case 'Sticker':
        return 0xa7c957;
      default:
        return 0x9fb8c8;
    }
  }

  handleShopChoice(choice) {
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
        fontSize: this.isShop ? '15px' : '18px',
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
        this.handleShopChoice(choice);
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
