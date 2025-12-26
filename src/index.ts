import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MainMenuScene from './scenes/MainMenuScene';
import GameScene from './scenes/GameScene';
import GameOverScene from './scenes/GameOverScene';
import { UpgradeScene } from './scenes/UpgradeScene.js';

// Add a debug UI
window.onload = function () {
  // Create a direct debug message on the page
  const directDebug = document.createElement('div');
  directDebug.style.position = 'fixed';
  directDebug.style.bottom = '10px';
  directDebug.style.right = '10px';
  directDebug.style.zIndex = '2000';
  directDebug.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
  directDebug.style.color = 'white';
  directDebug.style.padding = '10px';
  directDebug.style.borderRadius = '5px';
  directDebug.style.fontFamily = 'monospace';
  directDebug.innerHTML = '<strong>Direct Debug:</strong> Page loaded, creating game...';
  document.body.appendChild(directDebug);

  // Create a debug UI container
  const debugContainer = document.createElement('div');
  debugContainer.style.position = 'fixed';
  debugContainer.style.top = '10px';
  debugContainer.style.left = '10px';
  debugContainer.style.zIndex = '1000';
  debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugContainer.style.color = 'white';
  debugContainer.style.padding = '10px';
  debugContainer.style.borderRadius = '5px';
  debugContainer.style.fontFamily = 'monospace';
  debugContainer.innerHTML = '<h3>Debug Controls</h3>';

  // Add a button to place a machine
  const placeButton = document.createElement('button');
  placeButton.textContent = 'Place Machine at (5,5)';
  placeButton.style.display = 'block';
  placeButton.style.margin = '5px 0';
  placeButton.style.padding = '5px';
  placeButton.onclick = function () {
    // Get the game instance
    const game = window.game;
    if (game && game.scene.scenes) {
      // Find the GameScene
      const gameScene = game.scene.scenes.find((scene) => scene.constructor.name === 'GameScene');
      if (gameScene) {
        console.log('[DEBUG UI] Attempting to place machine directly');
        // Create a proper machine type object
        const machineType = { id: 'processor-a' };
        // Try to place a processor-a machine at position (5, 5) with rotation 0
        const success = gameScene.placeMachine(machineType, 5, 5, 0);
        console.log('[DEBUG UI] Machine placement result:', success);
      } else {
        console.error('[DEBUG UI] GameScene not found');
        directDebug.innerHTML += '<br>GameScene not found!';
      }
    } else {
      console.error('[DEBUG UI] Game instance not found');
      directDebug.innerHTML += '<br>Game instance not found!';
    }
  };
  debugContainer.appendChild(placeButton);

  // Add a button to show the current scenes
  const scenesButton = document.createElement('button');
  scenesButton.textContent = 'Show Active Scenes';
  scenesButton.style.display = 'block';
  scenesButton.style.margin = '5px 0';
  scenesButton.style.padding = '5px';
  scenesButton.onclick = function () {
    // Get the game instance
    const game = window.game;
    if (game && game.scene && game.scene.scenes) {
      const activeScenes = game.scene.scenes
        .filter((scene) => scene.scene.settings.active)
        .map((scene) => scene.constructor.name)
        .join(', ');

      directDebug.innerHTML += '<br>Active scenes: ' + activeScenes;
      console.log('[DEBUG UI] Active scenes:', activeScenes);
    } else {
      directDebug.innerHTML += '<br>Cannot get scene info!';
      console.error('[DEBUG UI] Cannot access scene information');
    }
  };
  debugContainer.appendChild(scenesButton);

  // Add the debug container to the page
  document.body.appendChild(debugContainer);

  // Create the game
  try {
    window.game = new Phaser.Game({
      type: Phaser.CANVAS, // Force Canvas rendering - WebGL is having framebuffer issues
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
      parent: 'game-container',
      backgroundColor: '#000000',
      scene: [BootScene, PreloadScene, MainMenuScene, GameScene, UpgradeScene, GameOverScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      disableContextMenu: true, // Prevent right-click menu
      callbacks: {
        postBoot: (game) => {
          // Log that the game has booted successfully
          directDebug.innerHTML +=
            '<br>Game booted! Renderer: ' +
            (game.renderer.type === Phaser.CANVAS ? 'Canvas' : 'WebGL');

          // Check if the canvas element exists and is visible
          const canvas = document.querySelector('canvas');
          if (canvas) {
            directDebug.innerHTML += '<br>Canvas found: ' + canvas.width + 'x' + canvas.height;
          } else {
            directDebug.innerHTML += '<br>Canvas not found!';
          }
        },
      },
    });

    // Update direct debug with success
    directDebug.innerHTML += '<br>Game instance created';
  } catch (error) {
    // Log any errors during game creation
    console.error('[GAME INIT] Error creating game:', error);
    directDebug.innerHTML += '<br>ERROR: ' + error.message;
  }

  // Add a global click listener for debugging
  document.addEventListener('click', function (event) {
    console.log('[GLOBAL] Document click detected at', event.clientX, event.clientY);
  });
};

// Global error handler for audio issues
window.addEventListener('error', function (event) {
  if (event.error && event.error.message && event.error.message.includes('audio')) {
    // Silently prevent the error from showing in the console
    event.preventDefault();
  }
});
