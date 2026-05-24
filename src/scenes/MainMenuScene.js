import Phaser from 'phaser';

const COLORS = {
  backgroundTop: 0x070b10,
  backgroundBottom: 0x14232c,
  panelStroke: 0x315062,
  cyan: 0x83f7ff,
  blue: 0x3f8cff,
  yellow: 0xffd166,
  green: 0x4dd47e,
  purple: 0xb56cff,
  text: '#f4fbff',
  muted: '#95aab5',
};

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
    this.movingItems = [];
  }

  preload() {
    const images = [
      ['button-idle', 'assets/images/button.png'],
      ['button-hover', 'assets/images/button-hover.png'],
      ['machine-i', 'assets/images/machine-i.png'],
      ['machine-l', 'assets/images/machine-l.png'],
      ['machine-t', 'assets/images/machine-t.png'],
      ['machine-o', 'assets/images/machine-o.png'],
      ['raw-resource', 'assets/images/raw-resource.png'],
      ['product-a', 'assets/images/product-a.png'],
      ['product-b', 'assets/images/product-b.png'],
      ['product-c', 'assets/images/product-c.png'],
    ];

    images.forEach(([key, path]) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.movingItems = [];

    this.drawBackground(width, height);
    this.createFactoryShowpiece(width);
    this.createTitle(width);
    this.createMenuControls(width);
    this.createAmbientMotion(width, height);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  update(_time, delta) {
    const moveBy = delta * 0.085;

    this.movingItems.forEach((item) => {
      item.sprite.x += moveBy * item.speed;

      if (item.sprite.x > item.endX) {
        item.sprite.x = item.startX;
      }
    });
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

  createFactoryShowpiece(width) {
    const platform = this.add.graphics();
    platform.fillStyle(0x0b1118, 0.96);
    platform.fillRoundedRect(78, 292, width - 156, 142, 8);
    platform.lineStyle(2, COLORS.panelStroke, 0.9);
    platform.strokeRoundedRect(78, 292, width - 156, 142, 8);

    this.drawConveyor(120, 350, 560, COLORS.cyan);
    this.drawConveyor(190, 392, 420, COLORS.yellow);

    this.addMachineSprite(176, 328, 'machine-l', COLORS.blue, 0.88);
    this.addMachineSprite(302, 328, 'machine-t', COLORS.green, 0.9);
    this.addMachineSprite(438, 328, 'machine-o', COLORS.purple, 0.88);
    this.addMachineSprite(570, 328, 'machine-i', COLORS.yellow, 0.82);

    this.createFlowItem(128, 350, 668, 'raw-resource', 0.52, 0.72);
    this.createFlowItem(260, 350, 668, 'product-a', 0.5, 1);
    this.createFlowItem(405, 350, 668, 'product-b', 0.48, 0.88);
    this.createFlowItem(542, 350, 668, 'product-c', 0.48, 1.08);
    this.createFlowItem(204, 392, 604, 'raw-resource', 0.42, 0.82);
    this.createFlowItem(378, 392, 604, 'product-a', 0.4, 0.72);

    this.add
      .text(width / 2, 462, 'Forge chains. Refine purity. Expand the grid.', {
        fontFamily: 'Arial',
        fontSize: 16,
        color: COLORS.muted,
        align: 'center',
      })
      .setOrigin(0.5);
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
    const start = this.createButton(width / 2, 514, 'START RUN', () => this.startGame(), {
      width: 246,
      fill: 0x1f7a5b,
      hover: 0x2fa875,
      stroke: 0x8dffd0,
    });

    this.add
      .text(width / 2, 558, 'ENTER / SPACE', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#6f8793',
        align: 'center',
      })
      .setOrigin(0.5);

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

  drawConveyor(x, y, width, accentColor) {
    const belt = this.add.graphics();
    belt.fillStyle(0x131d24, 1);
    belt.fillRoundedRect(x, y - 15, width, 30, 5);
    belt.lineStyle(2, 0x3a5665, 0.9);
    belt.strokeRoundedRect(x, y - 15, width, 30, 5);

    for (let i = 0; i <= width; i += 32) {
      belt.lineStyle(2, accentColor, 0.2);
      belt.lineBetween(x + i, y - 12, x + i + 16, y + 12);
    }
  }

  addMachineSprite(x, y, texture, tint, scale) {
    const glow = this.add.rectangle(x, y, 62, 62, tint, 0.09);
    glow.setStrokeStyle(1, tint, 0.42);

    const machine = this.add.image(x, y, texture);
    machine.setScale(scale);
    machine.setTint(tint);
    machine.setAlpha(0.95);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.22, to: 0.46 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: x,
    });
  }

  createFlowItem(x, y, endX, texture, scale, speed) {
    const sprite = this.add.image(x, y, texture);
    sprite.setScale(scale);
    sprite.setDepth(2);
    sprite.setAlpha(0.96);

    this.movingItems.push({
      sprite,
      startX: x,
      endX,
      speed,
    });

    this.tweens.add({
      targets: sprite,
      y: y - 3,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: x,
    });
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
        fontSize: 20,
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
}
