import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.score = data.score || 0;
    this.timeSurvived = data.timeSurvived || 0;
    this.finalRound = data.finalRound || data.failureSnapshot?.finalRound || 1;
    this.failureSnapshot = data.failureSnapshot || {};
    this.failureSummary =
      data.failureSummary ||
      this.failureSnapshot.summary ||
      'Run ended. Rebuild the line and push farther.';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.audioAvailable = this.registry.get('audioAvailable') || false;
    this.playUiSound('game-over');
    this.updateBestRun();

    this.cameras.main.setBackgroundColor('#070b10');
    this.drawBackground(width, height);

    const headline = this.getResultHeadline();
    const panelHeight = 430;
    this.add
      .rectangle(width / 2, height / 2, 530, panelHeight, 0x09131d, 0.96)
      .setStrokeStyle(2, this.isNewBest ? 0xffd166 : 0x456274, 0.95);

    this.add
      .text(width / 2, height / 2 - 166, headline, {
        fontFamily: 'Arial Black',
        fontSize: 40,
        color: this.isNewBest ? '#ffd166' : '#f4fbff',
        stroke: '#123646',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 108, this.getScoreLine(), {
        fontFamily: 'Arial Black',
        fontSize: 25,
        color: '#f4fbff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 62, this.getProgressLine(), {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#88ffcc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 12, this.failureSummary, {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#b9cbd4',
        align: 'center',
        wordWrap: { width: 410 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 42, this.getRunbackLesson(), {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: '#ffd166',
        align: 'center',
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5);

    const playAgain = this.createButton(
      width / 2,
      height / 2 + 116,
      'NEW RUN',
      () => {
        this.restartRun();
      },
      {
        width: 286,
        height: 58,
        fill: 0x2c7a55,
        hover: 0x3f9f72,
        stroke: 0x88ffcc,
        fontSize: 22,
      }
    );

    this.tweens.add({
      targets: [playAgain.button, playAgain.text],
      scaleX: 1.04,
      scaleY: 1.08,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, height / 2 + 160, 'R / ENTER / SPACE', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#6f8793',
        align: 'center',
      })
      .setOrigin(0.5);

    this.createButton(
      width / 2,
      height / 2 + 190,
      'MAIN MENU',
      () => {
        this.scene.start('MainMenuScene');
      },
      {
        width: 170,
        height: 34,
        fill: 0x263746,
        hover: 0x35546a,
        stroke: 0x83f7ff,
        fontSize: 13,
      }
    );

    this.input.keyboard?.once('keydown-R', () => this.restartRun());
    this.input.keyboard?.once('keydown-ENTER', () => this.restartRun());
    this.input.keyboard?.once('keydown-SPACE', () => this.restartRun());
  }

  drawBackground(width, height) {
    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(0x070b10, 0x070b10, 0x14232c, 0x14232c, 1);
    backdrop.fillRect(0, 0, width, height);

    const sweep = this.add.rectangle(width / 2, height * 0.72, width, 2, 0x83f7ff, 0.16);
    this.tweens.add({
      targets: sweep,
      y: height * 0.28,
      alpha: { from: 0.08, to: 0.28 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getResultHeadline() {
    if (this.isNewBest) return 'NEW BEST';
    if (this.failureSnapshot.reason === 'time') return 'TIME UP';
    if (this.failureSnapshot.quotaPercent >= 80) return 'SO CLOSE';
    if (this.failureSnapshot.reason === 'delivery') return 'WRONG OUTPUT';
    return 'RUN COMPLETE';
  }

  getScoreLine() {
    const bestScore = this.bestRun?.score || 0;
    return `SCORE ${this.score}   BEST ${Math.max(bestScore, this.score)}`;
  }

  getProgressLine() {
    const percent = this.failureSnapshot.quotaPercent ?? 0;
    return `ROUND ${this.finalRound}   ${percent}% QUOTA   ${this.formatTime(this.timeSurvived)}`;
  }

  getRunbackLesson() {
    return this.failureSnapshot.lesson || 'New route, faster start, bigger clear.';
  }

  updateBestRun() {
    this.bestRun = this.loadBestRun();
    this.isNewBest =
      this.score > (this.bestRun.score || 0) ||
      (this.score === (this.bestRun.score || 0) &&
        this.finalRound > (this.bestRun.finalRound || 0));

    if (this.isNewBest) {
      this.bestRun = {
        score: this.score,
        finalRound: this.finalRound,
        timeSurvived: this.timeSurvived,
      };
      this.saveBestRun(this.bestRun);
    }
  }

  loadBestRun() {
    try {
      if (typeof window === 'undefined') return {};
      return JSON.parse(window.localStorage?.getItem('gridforgeBestRun') || '{}') || {};
    } catch (_error) {
      return {};
    }
  }

  saveBestRun(bestRun) {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage?.setItem('gridforgeBestRun', JSON.stringify(bestRun));
    } catch (_error) {
      // Best-run persistence is nice-to-have; restart flow should never depend on it.
    }
  }

  formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  restartRun() {
    this.playUiSound('click');
    this.scene.start('GameScene');
  }

  createButton(x, y, text, callback, options = {}) {
    const width = options.width || 220;
    const height = options.height || 46;
    const fill = options.fill || 0x263746;
    const hover = options.hover || 0x35546a;
    const stroke = options.stroke || 0x83f7ff;
    const button = this.add
      .rectangle(x, y, width, height, fill, 0.98)
      .setInteractive({ useHandCursor: true });
    button.defaultFillColor = fill;
    button.hoverFillColor = hover;
    button.setStrokeStyle(2, stroke, 0.9);

    const buttonText = this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize: options.fontSize || 16,
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
      button.setScale(0.98, 0.94);
      buttonText.setScale(0.98);
      this.time.delayedCall(70, callback);
    });

    return { button, text: buttonText };
  }

  playUiSound(key) {
    if (!this.audioAvailable || !this.sound || typeof this.sound.play !== 'function') return;

    try {
      this.sound.play(key);
    } catch (error) {
      console.error(`Failed to play ${key} sound:`, error);
      this.audioAvailable = false;
      this.registry.set('audioAvailable', false);
    }
  }
}
