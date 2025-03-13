import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.score = data.score || 0;
        this.timeSurvived = data.timeSurvived || 0; // in seconds
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Check if audio is available
        this.audioAvailable = this.registry.get('audioAvailable') || false;
        console.log('GameOverScene - Audio available:', this.audioAvailable);
        
        // Play game over sound
        if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
            try {
                this.sound.play('game-over');
            } catch (error) {
                console.error('Failed to play game over sound:', error);
                this.audioAvailable = false;
                this.registry.set('audioAvailable', false);
            }
        }
        
        // Background
        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0);
        
        // Game Over text
        this.add.text(width / 2, height / 4, 'GAME OVER', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        // Format time survived
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = this.timeSurvived % 60;
        const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        // Score and time display
        this.add.text(width / 2, height / 2 - 40, `SCORE: ${this.score}`, {
            fontFamily: 'Arial',
            fontSize: 32,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height / 2 + 10, `TIME SURVIVED: ${timeString}`, {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        // Reason for factory collapse
        this.add.text(width / 2, height / 2 + 60, 'Your factory collapsed due to Cargo Bay overflow!', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ff9999',
            align: 'center'
        }).setOrigin(0.5);
        
        // Create buttons
        this.createButton(width / 2, height * 0.7, 'PLAY AGAIN', () => {
            this.scene.start('GameScene');
        });
        
        this.createButton(width / 2, height * 0.7 + 70, 'MAIN MENU', () => {
            this.scene.start('MainMenuScene');
        });
    }
    
    createButton(x, y, text, callback) {
        const button = this.add.rectangle(x, y, 200, 50, 0x4a6fb5).setInteractive();
        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5);
        
        button.on('pointerover', () => {
            button.fillColor = 0x5a8fd5;
        });
        
        button.on('pointerout', () => {
            button.fillColor = 0x4a6fb5;
        });
        
        button.on('pointerdown', () => {
            if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
                try {
                    this.sound.play('click');
                } catch (error) {
                    console.error('Failed to play click sound:', error);
                    this.audioAvailable = false;
                    this.registry.set('audioAvailable', false);
                }
            }
            callback();
        });
        
        return { button, text: buttonText };
    }
} 