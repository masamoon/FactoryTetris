import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MainMenuScene from './scenes/MainMenuScene';
import GameScene from './scenes/GameScene';
import GameOverScene from './scenes/GameOverScene';

// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        MainMenuScene,
        GameScene,
        GameOverScene
    ],
    // Disable audio by default to prevent errors
    audio: {
        disableWebAudio: true,
        noAudio: true
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Global error handler for audio issues
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('audio')) {
        console.warn('Audio error caught by global handler:', event.error.message);
        // Prevent the error from showing in the console
        event.preventDefault();
    }
}); 