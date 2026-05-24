import Phaser from 'phaser';
import { loadGameSettings, resetGameSettings, saveGameSettings } from '../utils/GameSettings';

const COLORS = {
  overlay: 0x02070b,
  panel: 0x0d151d,
  stroke: 0x456274,
  accent: 0x83f7ff,
  green: 0x2c7a55,
  greenHover: 0x3f9f72,
  blue: 0x4a6fb5,
  blueHover: 0x5a8fd5,
  warn: 0x66322d,
  warnHover: 0x88463d,
  text: '#f4fbff',
  muted: '#95aab5',
};

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
    this.settings = loadGameSettings();
    this.sourceSceneKey = null;
    this.resumeSourceOnClose = false;
    this.resetConfirmArmed = false;
  }

  init(data = {}) {
    this.settings = loadGameSettings();
    this.sourceSceneKey = data.sourceSceneKey || null;
    this.resumeSourceOnClose = data.resumeSourceOnClose === true;
    this.resetConfirmArmed = false;
  }

  create() {
    const { width, height } = this.scale;
    const panelWidth = 430;
    const panelHeight = this.isGameSource() ? 430 : 358;
    const panelX = width / 2;
    const panelY = height / 2;

    this.add.rectangle(0, 0, width, height, COLORS.overlay, 0.72).setOrigin(0).setInteractive();

    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, COLORS.panel, 0.98);
    panel.setStrokeStyle(2, COLORS.stroke, 0.95);

    this.add
      .text(panelX, panelY - panelHeight / 2 + 36, 'SETTINGS', {
        fontFamily: 'Arial Black',
        fontSize: 28,
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(panelX, panelY - panelHeight / 2 + 70, 'Keep the forge comfortable.', {
        fontFamily: 'Arial',
        fontSize: 13,
        color: COLORS.muted,
        align: 'center',
      })
      .setOrigin(0.5);

    const left = panelX - panelWidth / 2 + 42;
    const right = panelX + panelWidth / 2 - 42;
    let rowY = panelY - panelHeight / 2 + 118;

    this.createRowLabel(left, rowY, 'AUDIO VOLUME');
    this.volumeValueText = this.add
      .text(right, rowY, '', {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: COLORS.text,
      })
      .setOrigin(1, 0.5);
    this.volumeSlider = this.createSlider(left, rowY + 32, right - left, this.settings.audioVolume);

    rowY += 78;
    this.muteButton = this.createToggleButton(left, rowY, 'MUTE', this.settings.muted, () => {
      this.updateSettings({ muted: !this.settings.muted });
    });
    this.inputButton = this.createToggleButton(
      panelX + 12,
      rowY,
      'TOUCH MODE',
      this.settings.inputMode === 'touch',
      () => {
        this.updateSettings({
          inputMode: this.settings.inputMode === 'touch' ? 'desktop' : 'touch',
        });
      }
    );

    rowY += 58;
    this.tutorialButton = this.createToggleButton(
      left,
      rowY,
      'TUTORIAL TIPS',
      this.settings.showTutorialTips,
      () => {
        this.updateSettings({ showTutorialTips: !this.settings.showTutorialTips });
      },
      346
    );

    rowY += 70;
    if (this.isGameSource()) {
      this.resetRunButton = this.createButton(
        left,
        rowY,
        166,
        40,
        'RESET RUN',
        () => {
          this.confirmOrResetRun();
        },
        COLORS.warn,
        COLORS.warnHover
      );
      this.createButton(right - 166, rowY, 166, 40, 'MAIN MENU', () => {
        this.goToMainMenu();
      });
      rowY += 58;
    }

    this.createButton(left, rowY, 166, 40, 'RESET DEFAULTS', () => {
      this.updateSettings(resetGameSettings());
    });
    this.createButton(
      right - 136,
      rowY,
      136,
      40,
      'CLOSE',
      () => {
        this.close();
      },
      COLORS.green,
      COLORS.greenHover
    );

    this.input.keyboard?.once('keydown-ESC', () => this.close());
    this.refreshControls();
  }

  isGameSource() {
    return this.sourceSceneKey === 'GameScene';
  }

  createRowLabel(x, y, text) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: COLORS.text,
      })
      .setOrigin(0, 0.5);
  }

  createSlider(x, y, width, value) {
    const track = this.add.rectangle(x, y, width, 8, 0x26333c, 1).setOrigin(0, 0.5);
    track.setStrokeStyle(1, 0x526d7b, 0.9);

    const fill = this.add.rectangle(x, y, width * value, 8, COLORS.accent, 0.95).setOrigin(0, 0.5);
    const thumb = this.add.circle(x + width * value, y, 11, COLORS.accent, 1);
    thumb.setStrokeStyle(2, 0xffffff, 0.85);

    const slider = { x, y, width, track, fill, thumb };
    const setFromPointer = (pointer) => {
      const next = Phaser.Math.Clamp((pointer.x - x) / width, 0, 1);
      this.updateSettings({ audioVolume: next, muted: false });
    };

    track.setInteractive({ useHandCursor: true });
    thumb.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(thumb);
    track.on('pointerdown', setFromPointer);
    thumb.on('drag', (_pointer, dragX) => {
      const next = Phaser.Math.Clamp((dragX - x) / width, 0, 1);
      this.updateSettings({ audioVolume: next, muted: false });
    });
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && thumb.getBounds().contains(pointer.downX, pointer.downY)) {
        setFromPointer(pointer);
      }
    });

    return slider;
  }

  createToggleButton(x, y, label, active, callback, width = 166) {
    const button = this.createButton(x, y, width, 40, '', callback);
    button.label = label;
    button.active = active;
    return button;
  }

  createButton(x, y, width, height, text, callback, fill = COLORS.blue, hover = COLORS.blueHover) {
    const button = this.add
      .rectangle(x, y, width, height, fill, 1)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    button.defaultFillColor = fill;
    button.hoverFillColor = hover;
    button.setStrokeStyle(1, 0x9ac5d8, 0.7);

    const buttonText = this.add
      .text(x + width / 2, y, text, {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.fillColor = button.hoverFillColor;
    });
    button.on('pointerout', () => {
      button.fillColor = button.defaultFillColor;
    });
    button.on('pointerdown', () => {
      this.playClick();
      callback();
    });

    return { button, text: buttonText, width, fill, hover };
  }

  updateSettings(patch) {
    this.settings = saveGameSettings(patch);
    this.resetConfirmArmed = false;
    this.applySettingsToGame();
    this.refreshControls();
  }

  applySettingsToGame() {
    const scenes = ['GameScene', 'GameOverScene', 'MainMenuScene'];
    scenes.forEach((key) => {
      const scene = this.scene.get(key);
      if (scene && typeof scene.applySettings === 'function') {
        scene.applySettings(this.settings);
      }
    });
  }

  refreshControls() {
    const volumePercent = Math.round(this.settings.audioVolume * 100);
    this.volumeValueText?.setText(`${volumePercent}%`);

    if (this.volumeSlider) {
      const fillWidth = this.volumeSlider.width * this.settings.audioVolume;
      this.volumeSlider.fill.width = fillWidth;
      this.volumeSlider.thumb.x = this.volumeSlider.x + fillWidth;
    }

    this.refreshToggleButton(this.muteButton, this.settings.muted);
    this.refreshToggleButton(this.inputButton, this.settings.inputMode === 'touch');
    this.refreshToggleButton(this.tutorialButton, this.settings.showTutorialTips);
    if (this.resetRunButton) {
      this.resetRunButton.text.setText(this.resetConfirmArmed ? 'CONFIRM RESET' : 'RESET RUN');
    }
  }

  refreshToggleButton(control, active) {
    if (!control) return;

    control.active = active;
    control.button.defaultFillColor = active ? COLORS.green : COLORS.blue;
    control.button.hoverFillColor = active ? COLORS.greenHover : COLORS.blueHover;
    control.button.fillColor = control.button.defaultFillColor;
    control.text.setText(`${control.label}: ${active ? 'ON' : 'OFF'}`);
  }

  playClick() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene && typeof gameScene.playSound === 'function') {
      gameScene.playSound('click');
    }
  }

  confirmOrResetRun() {
    if (!this.resetConfirmArmed) {
      this.resetConfirmArmed = true;
      this.refreshControls();
      return;
    }

    this.scene.stop('SettingsScene');
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  goToMainMenu() {
    this.scene.stop('SettingsScene');
    this.scene.stop('GameScene');
    this.scene.start('MainMenuScene');
  }

  close() {
    if (this.resumeSourceOnClose && this.sourceSceneKey) {
      this.scene.resume(this.sourceSceneKey);
    }
    this.scene.stop('SettingsScene');
  }
}
