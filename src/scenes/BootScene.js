import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load any assets needed for the loading screen
    this.load.image('loading-background', 'assets/images/loading-background.svg');
  }

  create() {
    // Set up any game configurations or settings
    this.scale.refresh();

    // Transition to the preload scene
    this.scene.start('PreloadScene');
  }
}
