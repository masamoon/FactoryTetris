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
    this.cameras.main.setBackgroundColor('#070b10');
    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(0x070b10, 0x070b10, 0x14232c, 0x14232c, 1);
    backdrop.fillRect(0, 0, width, height);
    this.add
      .rectangle(width / 2, height / 2, 470, 390, 0x09131d, 0.94)
      .setStrokeStyle(2, 0x456274, 0.95);

    // Game Over text
    this.add
      .text(width / 2, height / 2 - 145, 'RUN COMPLETE', {
        fontFamily: 'Arial Black',
        fontSize: 42,
        color: '#f4fbff',
        stroke: '#123646',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5);

    // Format time survived
    const minutes = Math.floor(this.timeSurvived / 60);
    const seconds = this.timeSurvived % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    // Score and time display
    this.add
      .text(width / 2, height / 2 - 58, `SCORE  ${this.score}`, {
        fontFamily: 'Arial Black',
        fontSize: 32,
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 12, `TIME  ${timeString}`, {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#dfefff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Reason for factory collapse
    this.add
      .text(
        width / 2,
        height / 2 + 34,
        'The cargo contract failed. Rebuild the line and push farther.',
        {
          fontFamily: 'Arial',
          fontSize: 16,
          color: '#95aab5',
          align: 'center',
          wordWrap: { width: 360 },
        }
      )
      .setOrigin(0.5);

    // Create buttons
    this.createButton(width / 2, height / 2 + 104, 'PLAY AGAIN', () => {
      this.scene.start('GameScene');
    });

    this.createButton(width / 2, height / 2 + 164, 'MAIN MENU', () => {
      this.scene.start('MainMenuScene');
    });
  }

  createButton(x, y, text, callback) {
    const button = this.add
      .rectangle(x, y, 220, 46, text === 'PLAY AGAIN' ? 0x2c7a55 : 0x263746, 0.98)
      .setInteractive({ useHandCursor: true });
    button.defaultFillColor = text === 'PLAY AGAIN' ? 0x2c7a55 : 0x263746;
    button.hoverFillColor = text === 'PLAY AGAIN' ? 0x3f9f72 : 0x35546a;
    button.setStrokeStyle(2, text === 'PLAY AGAIN' ? 0x88ffcc : 0x83f7ff, 0.9);
    const buttonText = this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize: 16,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.fillColor = button.hoverFillColor;
    });

    button.on('pointerout', () => {
      button.fillColor = button.defaultFillColor;
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
