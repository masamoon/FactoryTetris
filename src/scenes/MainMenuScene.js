import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        console.log('[MainMenuScene] Create started');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        console.log('[MainMenuScene] Screen dimensions:', width, 'x', height);
        
        // Super simple background - just a solid color
        this.add.rectangle(0, 0, width, height, 0xFF0000).setOrigin(0, 0);
        console.log('[MainMenuScene] Background added (RED)');
        
        // Simple text
        this.add.text(width / 2, height / 2, 'FACTORY TETRIS', {
            fontFamily: 'Arial',
            fontSize: 32,
            color: '#ffffff'
        }).setOrigin(0.5);
        console.log('[MainMenuScene] Title text added');
        
        // Simple button with minimal styling
        const buttonBg = this.add.rectangle(width / 2, height / 2 + 100, 200, 50, 0x0000FF).setInteractive();
        this.add.text(width / 2, height / 2 + 100, 'START GAME', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff'
        }).setOrigin(0.5);
        console.log('[MainMenuScene] Start button added');
        
        // Direct click handler
        buttonBg.on('pointerdown', () => {
            console.log('[MainMenuScene] Start button clicked');
            this.scene.start('GameScene');
        });
        
        console.log('[MainMenuScene] Create completed');
    }
} 