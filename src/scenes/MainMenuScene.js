import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    preload() {
        // Preload button images
        this.load.image('button-idle', 'assets/images/button.png');
        this.load.image('button-hover', 'assets/images/button-hover.png');
    }

    create() {
        console.log('[MainMenuScene] Create started');
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        console.log('[MainMenuScene] Screen dimensions:', width, 'x', height);

        // Dark grey background
        this.cameras.main.setBackgroundColor('#333333'); // Dark grey
        console.log('[MainMenuScene] Background set to dark grey');

        // Title text with a more thematic font
        this.add.text(centerX, centerY - 100, 'GRIDFORGE', { // Positioned higher
            fontFamily: '"Courier New", Courier, monospace', // Monospace font
            fontSize: '48px', // Larger size
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        console.log('[MainMenuScene] Title text added');

        // Start button using image assets
        const startButton = this.add.image(centerX, centerY + 100, 'button-idle')
            .setInteractive({ useHandCursor: true }); // Add hand cursor on hover

        const buttonText = this.add.text(centerX, centerY + 100, 'START GAME', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        console.log('[MainMenuScene] Start button image and text added');

        // Button hover effect
        startButton.on('pointerover', () => {
            startButton.setTexture('button-hover');
        });
        startButton.on('pointerout', () => {
            startButton.setTexture('button-idle');
        });

        // Button click handler
        startButton.on('pointerdown', () => {
            console.log('[MainMenuScene] Start button clicked');
            // Optional: Add a small visual feedback like tint or scale change
            startButton.setTint(0xcccccc); 
            this.time.delayedCall(100, () => { // Slight delay before scene change
                 this.scene.start('GameScene');
            });
        });

        console.log('[MainMenuScene] Create completed');
    }
} 