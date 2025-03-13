import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Check if audio is available
        this.audioAvailable = this.registry.get('audioAvailable') || false;
        console.log('MainMenuScene - Audio available:', this.audioAvailable);
        
        // Background
        this.add.rectangle(0, 0, width, height, 0x0a2e38).setOrigin(0, 0);
        
        // Title
        const title = this.add.text(width / 2, height / 4, 'FACTORY TETRIS', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(width / 2, height / 4 + 60, 'A Rogue-lite Factory Automation Game', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);
        
        // Create buttons
        this.createButton(width / 2, height / 2 + 20, 'PLAY', () => {
            this.scene.start('GameScene');
        });
        
        this.createButton(width / 2, height / 2 + 100, 'HOW TO PLAY', () => {
            // Show tutorial or instructions
            this.showInstructions();
        });
        
        // Add some factory-themed decorations
        this.addDecorations();
        
        // Add background music (only if audio is available)
        if (this.audioAvailable && this.sound && typeof this.sound.add === 'function') {
            try {
                console.log('Attempting to play background music');
                const music = this.sound.add('background-music', {
                    volume: 0.5,
                    loop: true
                });
                music.play();
            } catch (error) {
                console.error('Failed to play background music:', error);
                this.audioAvailable = false;
                this.registry.set('audioAvailable', false);
            }
        } else {
            console.log('Audio not available or sound system not initialized');
        }
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
            buttonText.setColor('#ffffff');
        });
        
        button.on('pointerout', () => {
            button.fillColor = 0x4a6fb5;
            buttonText.setColor('#ffffff');
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
    
    showInstructions() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create a semi-transparent background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0).setInteractive();
        
        // Instructions panel
        const panel = this.add.rectangle(width / 2, height / 2, width * 0.8, height * 0.8, 0x333333).setOrigin(0.5);
        
        // Title
        this.add.text(width / 2, height * 0.2, 'HOW TO PLAY', {
            fontFamily: 'Arial Black',
            fontSize: 28,
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Instructions text
        const instructions = [
            "1. Place factory machines to extract and process resources",
            "2. Connect machines to create production lines",
            "3. Fill rows in the Cargo Bay to ship products and score points",
            "4. Clear multiple rows at once for combo multipliers",
            "5. Don't let the Cargo Bay fill up completely!",
            "",
            "The game lasts for 30 minutes or until your factory collapses.",
            "Adapt to changing resource nodes and optimize your layout!"
        ];
        
        let y = height * 0.3;
        instructions.forEach(line => {
            this.add.text(width * 0.2, y, line, {
                fontFamily: 'Arial',
                fontSize: 18,
                color: '#ffffff'
            });
            y += 30;
        });
        
        // Close button
        const closeButton = this.createButton(width / 2, height * 0.8, 'CLOSE', () => {
            bg.destroy();
            panel.destroy();
            closeButton.button.destroy();
            closeButton.text.destroy();
        });
        
        // Close when clicking outside the panel
        bg.on('pointerdown', () => {
            bg.destroy();
            panel.destroy();
            closeButton.button.destroy();
            closeButton.text.destroy();
        });
    }
    
    addDecorations() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Add some gear decorations
        this.addGear(100, 100, 40, 0x555555, 1);
        this.addGear(width - 100, 100, 30, 0x666666, -1);
        this.addGear(100, height - 100, 35, 0x444444, -0.5);
        this.addGear(width - 100, height - 100, 45, 0x777777, 0.7);
    }
    
    addGear(x, y, radius, color, rotationSpeed) {
        const gear = this.add.graphics();
        gear.fillStyle(color);
        gear.lineStyle(2, 0x000000);
        
        // Draw gear
        gear.beginPath();
        gear.arc(x, y, radius, 0, Math.PI * 2);
        gear.fillPath();
        gear.strokePath();
        
        // Draw teeth
        const teethCount = 8;
        for (let i = 0; i < teethCount; i++) {
            const angle = (i / teethCount) * Math.PI * 2;
            const toothX = x + Math.cos(angle) * radius;
            const toothY = y + Math.sin(angle) * radius;
            
            gear.fillStyle(0x000000);
            gear.fillCircle(toothX, toothY, radius / 5);
        }
        
        // Inner circle
        gear.fillStyle(0x000000);
        gear.fillCircle(x, y, radius / 3);
        
        // Add rotation animation
        this.tweens.add({
            targets: gear,
            rotation: Math.PI * 2,
            duration: 10000 / Math.abs(rotationSpeed),
            repeat: -1,
            ease: 'Linear'
        });
        
        return gear;
    }
} 