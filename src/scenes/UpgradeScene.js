import Phaser from 'phaser';

export class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
        this.upgradeManager = null;
        this.callingSceneKey = 'GameScene'; // Default, can be overridden if needed
    }

    init(data) {
        this.upgradeManager = data.upgradeManager;
        // Optionally receive the calling scene key if multiple scenes could trigger this
        if (data.callingSceneKey) {
            this.callingSceneKey = data.callingSceneKey;
        }
    }

    create() {
        if (!this.upgradeManager) {
            console.error("UpgradeScene launched without UpgradeManager!");
            this.closeScene(); // Close if manager is missing
            return;
        }

        // Dim the background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7)
            .setOrigin(0, 0);

        // Get upgrade choices
        const choices = this.upgradeManager.getUpgradeChoices(3);

        if (choices.length === 0) {
            console.log("No available upgrades to choose from.");
            // Display a message and close?
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, 'No upgrades available!', {
                fontSize: '24px', fill: '#ffffff'
            }).setOrigin(0.5);
            this.time.delayedCall(1500, this.closeScene, [], this); // Auto-close after a delay
            return;
        }

        // Title
        this.add.text(this.cameras.main.width / 2, 100, 'Choose an Upgrade', {
            fontSize: '32px', fill: '#ffd700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Display choices
        const buttonYStart = 200;
        const buttonYStep = 120;
        const buttonWidth = 400;
        const buttonHeight = 100;

        choices.forEach((choice, index) => {
            const y = buttonYStart + index * buttonYStep;
            this.createUpgradeButton(this.cameras.main.width / 2, y, buttonWidth, buttonHeight, choice);
        });
    }

    createUpgradeButton(x, y, width, height, choice) {
        const bg = this.add.rectangle(x, y, width, height, 0x3a5f95)
            .setStrokeStyle(2, 0x6a8fbb)
            .setInteractive({ useHandCursor: true });

        const textContent = `${choice.name} (Lvl ${choice.level})\n${choice.description}`;
        const text = this.add.text(x, y, textContent, {
            fontSize: '18px', 
            fill: '#ffffff', 
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        bg.on('pointerover', () => { bg.fillColor = 0x4a6fb5; });
        bg.on('pointerout', () => { bg.fillColor = 0x3a5f95; });
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