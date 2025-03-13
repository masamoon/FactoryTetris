import Phaser from 'phaser';
import DummyAudioPlugin from '../utils/DummyAudioPlugin';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
        this.audioAvailable = false; // Start with audio disabled by default
        this.audioErrors = 0;
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Loading background
        this.add.image(width / 2, height / 2, 'loading-background');
        
        // Progress bar container
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        // Loading text
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);
        
        // Percent text
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);
        
        // Loading event handlers
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Handle file load errors
        this.load.on('loaderror', (file) => {
            console.warn(`Error loading file: ${file.key}`);
            
            // If it's an audio file, count the error
            if (file.type === 'audio') {
                this.audioErrors++;
            }
        });
        
        // Load game assets
        this.loadAssets();
    }

    loadAssets() {
        // UI elements
        this.load.image('button', 'assets/images/button.png');
        this.load.image('button-hover', 'assets/images/button-hover.png');
        
        // Game tiles and objects
        this.load.image('grid-cell', 'assets/images/grid-cell.png');
        this.load.image('resource-node', 'assets/images/resource-node.png');
        
        // Machine parts (Tetris-like pieces)
        this.load.image('machine-i', 'assets/images/machine-i.png');
        this.load.image('machine-l', 'assets/images/machine-l.png');
        this.load.image('machine-j', 'assets/images/machine-j.png');
        this.load.image('machine-o', 'assets/images/machine-o.png');
        this.load.image('machine-s', 'assets/images/machine-s.png');
        this.load.image('machine-t', 'assets/images/machine-t.png');
        this.load.image('machine-z', 'assets/images/machine-z.png');
        
        // Resources and products
        this.load.image('raw-resource', 'assets/images/raw-resource.png');
        this.load.image('product-a', 'assets/images/product-a.png');
        this.load.image('product-b', 'assets/images/product-b.png');
        this.load.image('product-c', 'assets/images/product-c.png');
        
        // We'll skip loading audio files for now
        // We'll use the dummy audio plugin instead
    }

    create() {
        console.log('PreloadScene create - Setting up audio');
        
        // Always use the dummy audio plugin for now
        this.audioAvailable = false;
        
        // Store audio availability in the registry
        this.registry.set('audioAvailable', this.audioAvailable);
        console.log('Audio available:', this.audioAvailable);
        
        // Replace the sound manager with our dummy plugin in all scenes
        this.setupDummyAudio();
        
        // Start the main menu scene
        this.scene.start('MainMenuScene');
    }
    
    setupDummyAudio() {
        console.log('Setting up dummy audio plugin for all scenes');
        
        // Get all scene keys
        const sceneKeys = Object.keys(this.scene.manager.keys);
        
        // For each scene, replace the sound manager with our dummy plugin
        sceneKeys.forEach(key => {
            const scene = this.scene.manager.getScene(key);
            if (scene && scene !== this) {
                console.log(`Setting up dummy audio for scene: ${key}`);
                scene.sound = new DummyAudioPlugin(scene);
            }
        });
        
        // Also replace the sound manager for this scene
        this.sound = new DummyAudioPlugin(this);
        
        // Replace the global sound manager
        if (this.game.sound) {
            console.log('Replacing global sound manager');
            this.game.sound.destroy();
            this.game.sound = new DummyAudioPlugin(this);
        }
    }
} 