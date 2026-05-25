import Phaser from 'phaser';
import { loadGameSettings } from '../utils/GameSettings';

const COLORS = {
  backgroundTop: 0x070b10,
  backgroundBottom: 0x14232c,
  cyan: 0x83f7ff,
  blue: 0x3f8cff,
  yellow: 0xffd166,
  green: 0x4dd47e,
  purple: 0xb56cff,
  text: '#f4fbff',
};

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  preload() {
    const images = [
      ['button-idle', 'assets/images/button.png'],
      ['button-hover', 'assets/images/button-hover.png'],
    ];

    images.forEach(([key, path]) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    });
  }

  create() {
    const { width, height } = this.cameras.main;

    this.drawBackground(width, height);
    this.createTitle(width);
    this.createMenuControls(width);
    this.createAmbientMotion(width, height);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  drawBackground(width, height) {
    this.cameras.main.setBackgroundColor('#070b10');

    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    backdrop.fillRect(0, 0, width, height);

    const glow = this.add.graphics();
    glow.fillStyle(COLORS.blue, 0.08);
    glow.fillEllipse(width * 0.48, height * 0.38, 680, 300);
    glow.fillStyle(COLORS.yellow, 0.04);
    glow.fillEllipse(width * 0.76, height * 0.65, 360, 180);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x223846, 0.35);
    const horizonY = 330;
    const floorBottom = height + 40;

    for (let x = -140; x <= width + 140; x += 40) {
      const skew = (x - width / 2) * 0.42;
      grid.lineBetween(width / 2 + skew, horizonY, x, floorBottom);
    }

    for (let y = horizonY; y <= floorBottom; y += 24) {
      const progress = (y - horizonY) / (floorBottom - horizonY);
      grid.lineStyle(1, 0x355466, 0.12 + progress * 0.3);
      grid.lineBetween(0, y, width, y);
    }

    const scanline = this.add.rectangle(width / 2, 0, width, 3, COLORS.cyan, 0.14);
    this.tweens.add({
      targets: scanline,
      y: height,
      duration: 3200,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createTitle(width) {
    const titleY = 118;
    const titleShadow = this.add
      .text(width / 2 + 4, titleY + 6, 'GRIDFORGE', {
        fontFamily: 'Arial Black',
        fontSize: 70,
        color: '#061017',
        align: 'center',
      })
      .setOrigin(0.5);
    titleShadow.setAlpha(0.85);

    const title = this.add
      .text(width / 2, titleY, 'GRIDFORGE', {
        fontFamily: 'Arial Black',
        fontSize: 70,
        color: COLORS.text,
        stroke: '#123646',
        strokeThickness: 7,
        align: 'center',
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#83f7ff', 18, true, true);

    const subtitle = this.add
      .text(width / 2, titleY + 62, 'ROGUE-LITE FACTORY AUTOMATION', {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    const rule = this.add.graphics();
    rule.lineStyle(2, COLORS.cyan, 0.82);
    rule.lineBetween(width / 2 - 176, titleY + 88, width / 2 + 176, titleY + 88);
    rule.lineStyle(2, COLORS.yellow, 0.82);
    rule.lineBetween(width / 2 - 68, titleY + 96, width / 2 + 68, titleY + 96);

    this.tweens.add({
      targets: [title, subtitle],
      y: '+=4',
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createMenuControls(width) {
    const start = this.createButton(width / 2, 504, 'START RUN', () => this.startGame(), {
      width: 246,
      fill: 0x1f7a5b,
      hover: 0x2fa875,
      stroke: 0x8dffd0,
    });

    this.add
      .text(width / 2, 544, 'ENTER / SPACE', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#6f8793',
        align: 'center',
      })
      .setOrigin(0.5);

    this.createButton(width / 2, 574, 'SETTINGS', () => this.openSettings(), {
      width: 176,
      height: 36,
      fill: 0x263746,
      hover: 0x35546a,
      stroke: 0x83f7ff,
      fontSize: 14,
    });

    this.tweens.add({
      targets: start.button,
      scaleX: 1.03,
      scaleY: 1.08,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: start.text,
      scale: 1.04,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createAmbientMotion(width, height) {
    const sparkColors = [COLORS.cyan, COLORS.yellow, COLORS.green, COLORS.purple];

    for (let i = 0; i < 18; i += 1) {
      const x = Phaser.Math.Between(70, width - 70);
      const y = Phaser.Math.Between(82, height - 90);
      const spark = this.add.circle(
        x,
        y,
        Phaser.Math.Between(1, 3),
        sparkColors[i % sparkColors.length],
        0.6
      );

      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-26, 26),
        y: y + Phaser.Math.Between(-20, 20),
        alpha: { from: 0.18, to: 0.8 },
        duration: Phaser.Math.Between(1400, 3200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      });
    }
  }

  createButton(x, y, text, callback, options = {}) {
    const width = options.width || 220;
    const height = options.height || 48;
    const fill = options.fill || 0x4a6fb5;
    const hover = options.hover || 0x5a8fd5;
    const stroke = options.stroke || 0xffffff;

    const button = this.add
      .rectangle(x, y, width, height, fill, 0.98)
      .setInteractive({ useHandCursor: true });
    button.setStrokeStyle(2, stroke, 0.95);

    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize: options.fontSize || 20,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    label.setShadow(0, 2, '#062017', 4, true, true);

    button.on('pointerover', () => {
      button.fillColor = hover;
      label.setColor('#efffff');
    });

    button.on('pointerout', () => {
      button.fillColor = fill;
      label.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      button.setScale(0.98, 0.94);
      label.setScale(0.98);
      this.time.delayedCall(80, callback);
    });

    return { button, text: label };
  }

  startGame() {
    this.scene.start('GameScene');
  }

  openSettings() {
    this.scene.launch('SettingsScene', {
      sourceSceneKey: 'MainMenuScene',
      resumeSourceOnClose: true,
    });
    this.scene.bringToTop('SettingsScene');
    this.scene.pause();
  }

  applySettings(settings = loadGameSettings()) {
    this.gameSettings = settings;
  }
}
