import Phaser from 'phaser';
import { getProcessingPieceBody } from '../config/pieceBodies';

const COLORS = {
  panel: 0x09131d,
  panelStroke: 0x2f4d62,
  card: 0x172636,
  cardHover: 0x223b50,
  cardStroke: 0x70d6ff,
  spark: 0xffd166,
  text: '#f4fbff',
  muted: '#b7cbd6',
};

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
    this.upgradeManager = null;
    this.callingSceneKey = null;
    this.isLevelUp = false;
    this.isShop = false;
    this.upgradeChoices = [];
    this.selectedUpgrade = null;
  }

  init(data) {
    this.upgradeManager = data.upgradeManager;
    this.callingSceneKey = data.callingSceneKey || 'GameScene';
    this.isLevelUp = data.isLevelUp || false;
    this.isBoon = data.isBoon || false;
    this.isShop = data.isShop || false;
    this.isStarterSpark = data.isStarterSpark || false;
    this.upgradeChoices = [];
    this.selectedUpgrade = null;
  }

  create() {
    if (!this.upgradeManager) {
      console.error('UpgradeScene launched without UpgradeManager!');
      this.closeScene(); // Close if manager is missing
      return;
    }

    // Create a semi-transparent dark overlay
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Add title
    let titleText = this.isStarterSpark
      ? 'Choose a Starting Bonus'
      : this.isBoon
        ? 'Choose a Run Boon'
        : this.isShop
          ? 'Shop'
          : this.isLevelUp
            ? 'Upgrade Ready'
            : 'Choose an Upgrade';

    const titleY = this.isShop ? Math.max(52, height * 0.1) : height * 0.15;
    this.title = this.add
      .text(width / 2, titleY, titleText, {
        fontFamily: 'Arial Black',
        fontSize: 28,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const subtitle = this.isStarterSpark
      ? 'Pick one boost for this run. You can only choose one.'
      : this.isBoon
        ? 'Pick one modifier for this run.'
        : this.isShop
          ? 'Spend cash on pieces, upgrades, and run tools.'
          : 'Pick the modifier that best fits this board.';
    this.add
      .text(width / 2, titleY + 34, subtitle, {
        fontFamily: 'Arial',
        fontSize: 13,
        color: COLORS.muted,
        align: 'center',
      })
      .setOrigin(0.5);

    // Get upgrade choices from manager
    const callingScene = this.scene.get(this.callingSceneKey);
    this.upgradeChoices = this.isShop
      ? callingScene?.getShopChoices?.() || []
      : this.isStarterSpark
        ? callingScene?.getStarterSparkChoices?.() || []
        : this.isBoon
          ? this.upgradeManager.getBoonChoices(3)
          : this.upgradeManager.getUpgradeChoices(3);

    // Create upgrade cards
    this.createUpgradeCards();
  }

  createUpgradeCards() {
    if (this.upgradeChoices.length === 0) {
      console.log('No available upgrades to choose from.');
      // Display a message and close?
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 50,
          'No upgrades available!',
          {
            fontSize: '24px',
            fill: '#ffffff',
          }
        )
        .setOrigin(0.5);
      this.time.delayedCall(1500, this.closeScene, [], this); // Auto-close after a delay
      return;
    }

    if (this.isShop) {
      this.createShopCards();
      return;
    }

    const panelWidth = this.isStarterSpark ? 520 : 460;
    const panelHeight = this.isStarterSpark ? 410 : 390;
    const panelY = this.isStarterSpark
      ? this.cameras.main.height / 2 + 60
      : this.cameras.main.height / 2 + 42;
    this.add
      .rectangle(this.cameras.main.width / 2, panelY, panelWidth, panelHeight, COLORS.panel, 0.92)
      .setStrokeStyle(2, COLORS.panelStroke, 0.95);

    // Display choices
    const buttonYStart = this.isStarterSpark ? 185 : 200;
    const buttonYStep = this.isStarterSpark ? 126 : 116;
    const buttonWidth = this.isStarterSpark ? 470 : 410;
    const buttonHeight = this.isStarterSpark ? 104 : 94;

    this.upgradeChoices.forEach((choice, index) => {
      const y = buttonYStart + index * buttonYStep;
      this.createUpgradeButton(this.cameras.main.width / 2, y, buttonWidth, buttonHeight, choice);
    });
  }

  createShopCards() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const callingScene = this.scene.get(this.callingSceneKey);
    const money = callingScene?.money || 0;
    const nextRound = (callingScene?.currentRound || 1) + 1;
    const reserve =
      typeof callingScene?.getRoundStartingMoney === 'function'
        ? callingScene.getRoundStartingMoney(nextRound)
        : 0;
    const safeSpend = Math.max(0, money - reserve);
    const runOffers = this.upgradeChoices.filter((choice) =>
      ['upgrade_permanent', 'boon'].includes(choice.type)
    );
    const pieceOffers = this.upgradeChoices.filter((choice) => choice.type === 'shop_piece');
    const rerollChoice = this.upgradeChoices.find((choice) => choice.type === 'reroll_shop');
    const continueChoice = this.upgradeChoices.find((choice) => choice.type === 'continue_run');

    const panelMargin = 24;
    const panelBottomMargin = 14;
    const panelWidth = Math.min(1100, Math.max(300, width - panelMargin * 2));
    const panelHeight = Math.min(650, Math.max(500, height - 118));
    const panelY = height - panelHeight / 2 - panelBottomMargin;
    const panelTop = panelY - panelHeight / 2;
    const panelBottom = panelY + panelHeight / 2;
    const panelLeft = width / 2 - panelWidth / 2;
    const panelRight = width / 2 + panelWidth / 2;
    const innerPad = panelWidth < 720 ? 18 : 24;
    const showDeckSidebar = panelWidth >= 860;
    const deckWidth = showDeckSidebar ? 235 : 0;
    const contentGap = showDeckSidebar ? 18 : 0;
    const shopLeft = panelLeft + innerPad;
    const shopRight = panelRight - innerPad - deckWidth - contentGap;
    const shopWidth = Math.max(260, shopRight - shopLeft);
    const shopCenterX = shopLeft + shopWidth / 2;
    const cardGap = shopWidth < 640 ? 12 : 16;
    const compactHeight = panelHeight < 570;
    const cardAreaTop = panelTop + (compactHeight ? 70 : 82);
    const controlY = panelBottom - 36;
    const runLabelY = cardAreaTop;
    const runTop = runLabelY + (compactHeight ? 14 : 18);
    const runColumns = Math.max(1, Math.min(3, runOffers.length || 3));
    const runCardWidth = Math.floor((shopWidth - (runColumns - 1) * cardGap) / runColumns);
    const runCardHeight = compactHeight ? 104 : 152;
    const runStartX = shopCenterX - (runColumns * runCardWidth + (runColumns - 1) * cardGap) / 2;
    const pieceLabelY = runTop + runCardHeight + (compactHeight ? 24 : 34);
    const pieceTop = pieceLabelY + (compactHeight ? 14 : 18);
    const pieceColumns = shopWidth >= 680 ? 3 : shopWidth >= 460 ? 2 : 1;
    const pieceRows = Math.max(1, Math.ceil(pieceOffers.length / pieceColumns));
    const pieceCardWidth = Math.floor((shopWidth - (pieceColumns - 1) * cardGap) / pieceColumns);
    const compactDeckReserve = showDeckSidebar ? 0 : 34;
    const pieceAreaBottom = controlY - (compactHeight ? 44 : 54) - compactDeckReserve;
    const pieceCardHeight = Math.max(
      compactHeight ? 78 : 110,
      Math.min(
        compactHeight ? 104 : 136,
        Math.floor((pieceAreaBottom - pieceTop - (pieceRows - 1) * cardGap) / pieceRows)
      )
    );
    const pieceGridWidth = pieceColumns * pieceCardWidth + (pieceColumns - 1) * cardGap;
    const pieceStartX = shopCenterX - pieceGridWidth / 2;
    const pieceGridBottom = pieceTop + pieceRows * pieceCardHeight + (pieceRows - 1) * cardGap;

    this.add
      .rectangle(width / 2, panelY, panelWidth, panelHeight, 0x09131d, 0.94)
      .setStrokeStyle(2, 0x2f4d62, 0.95);

    this.add
      .text(width / 2, panelTop + 24, 'SHOP', {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#88ffcc',
        align: 'center',
      })
      .setOrigin(0.5);

    const reelText = this.add
      .text(width / 2, panelTop + 48, `Cash $${money}   Safe spend $${safeSpend}`, {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);
    reelText.setText(`Cash $${money}   Next minimum $${reserve}   Safe spend $${safeSpend}`);
    this.tweens.add({
      targets: reelText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createShopSectionLabel(
      shopLeft,
      runLabelY,
      shopWidth,
      'RUN-WIDE UPGRADES',
      'Expensive picks that shape the whole run.'
    );
    runOffers.forEach((choice, index) => {
      const column = index % runColumns;
      this.createShopOfferButton(
        runStartX + column * (runCardWidth + cardGap) + runCardWidth / 2,
        runTop + runCardHeight / 2,
        runCardWidth,
        runCardHeight,
        choice,
        money
      );
    });

    this.createShopSectionLabel(
      shopLeft,
      pieceLabelY,
      shopWidth,
      'OPERATOR PIECES',
      'Cards bought here are added to your Operator deck.'
    );
    pieceOffers.forEach((choice, index) => {
      const column = index % pieceColumns;
      const row = Math.floor(index / pieceColumns);
      this.createShopOfferButton(
        pieceStartX + column * (pieceCardWidth + cardGap) + pieceCardWidth / 2,
        pieceTop + row * (pieceCardHeight + cardGap) + pieceCardHeight / 2,
        pieceCardWidth,
        pieceCardHeight,
        choice,
        money
      );
    });

    const compactDeckSlotIndex = pieceOffers.length;
    if (!showDeckSidebar && pieceColumns > 1 && compactDeckSlotIndex < pieceRows * pieceColumns) {
      const column = compactDeckSlotIndex % pieceColumns;
      const row = Math.floor(compactDeckSlotIndex / pieceColumns);
      this.createMiniDeckCard(
        pieceStartX + column * (pieceCardWidth + cardGap) + pieceCardWidth / 2,
        pieceTop + row * (pieceCardHeight + cardGap) + pieceCardHeight / 2,
        pieceCardWidth,
        pieceCardHeight,
        callingScene
      );
    }

    if (showDeckSidebar) {
      this.createShopDeckPanel(
        panelRight - innerPad - deckWidth / 2,
        panelTop + 82,
        deckWidth,
        panelBottom - panelTop - 154,
        callingScene
      );
    } else {
      this.createCompactDeckSummary(
        shopCenterX,
        Math.min(controlY - 26, pieceGridBottom + 18),
        shopWidth,
        callingScene
      );
    }

    const controlWidth = Math.min(250, Math.floor(panelWidth / 2 - 42));
    const controlGap = 28;
    const leftControlX = width / 2 - controlWidth / 2 - controlGap / 2;
    const rightControlX = width / 2 + controlWidth / 2 + controlGap / 2;
    if (rerollChoice) {
      this.createShopSaveButton(leftControlX, controlY, controlWidth, 52, rerollChoice, money);
    }
    if (continueChoice) {
      this.createShopSaveButton(rightControlX, controlY, controlWidth, 52, continueChoice, money);
    }
  }

  createShopSectionLabel(x, y, width, title, subtitle) {
    this.add.rectangle(x, y, 6, 22, 0x88ffcc, 0.95).setOrigin(0, 0.5);
    this.add
      .text(x + 14, y - 2, title, {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#f4fbff',
        align: 'left',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(x + width, y - 2, subtitle, {
        fontFamily: 'Arial',
        fontSize: 11,
        color: COLORS.muted,
        align: 'right',
        wordWrap: { width: Math.max(160, width * 0.48) },
      })
      .setOrigin(1, 0.5);
  }

  createShopDeckPanel(x, top, width, height, callingScene) {
    const left = x - width / 2;
    const summary = this.getShopDeckSummary(callingScene);
    this.add
      .rectangle(x, top + height / 2, width, height, 0x0c1822, 0.96)
      .setStrokeStyle(2, 0x446b80, 0.75);
    this.add
      .text(left + 14, top + 18, 'CURRENT DECK', {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#88ffcc',
        align: 'left',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(
        left + 14,
        top + 42,
        `Draw ${summary.counts.deck}   Discard ${summary.counts.discard}   Bought ${summary.counts.bonus}`,
        {
          fontFamily: 'Arial',
          fontSize: 11,
          color: '#ffd166',
          align: 'left',
        }
      )
      .setOrigin(0, 0.5);

    const rows = summary.cards.slice(0, Math.max(0, Math.floor((height - 74) / 36)));
    if (rows.length === 0) {
      this.add
        .text(left + 14, top + 80, 'No Operator cards found.', {
          fontFamily: 'Arial',
          fontSize: 12,
          color: COLORS.muted,
          align: 'left',
          wordWrap: { width: width - 28 },
        })
        .setOrigin(0, 0);
      return;
    }

    rows.forEach((entry, index) => {
      const rowY = top + 76 + index * 36;
      this.add.rectangle(x, rowY, width - 22, 30, 0x111f2c, 0.92).setStrokeStyle(1, 0x274253, 0.55);
      this.add.circle(left + 24, rowY, 6, this.getItemColorSwatchColor(entry.card), 0.95);
      this.add
        .text(left + 38, rowY - 6, this.getDeckCardName(entry.card), {
          fontFamily: 'Arial Black',
          fontSize: 10,
          color: '#f4fbff',
          align: 'left',
          wordWrap: { width: width - 94 },
          maxLines: 1,
        })
        .setOrigin(0, 0.5);
      this.add
        .text(left + 38, rowY + 8, `${entry.zone} - ${this.getDeckCardMeta(entry.card)}`, {
          fontFamily: 'Arial',
          fontSize: 9,
          color: COLORS.muted,
          align: 'left',
          wordWrap: { width: width - 94 },
          maxLines: 1,
        })
        .setOrigin(0, 0.5);
    });
  }

  createCompactDeckSummary(x, y, width, callingScene) {
    const summary = this.getShopDeckSummary(callingScene);
    this.add.rectangle(x, y, width, 30, 0x0c1822, 0.96).setStrokeStyle(1, 0x446b80, 0.75);
    this.add
      .text(
        x,
        y,
        `Current Deck: Draw ${summary.counts.deck} / Discard ${summary.counts.discard} / Bought ${summary.counts.bonus}`,
        {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#f4fbff',
          align: 'center',
          wordWrap: { width: width - 20 },
        }
      )
      .setOrigin(0.5);
  }

  createMiniDeckCard(x, y, width, height, callingScene) {
    const left = x - width / 2;
    const top = y - height / 2;
    const summary = this.getShopDeckSummary(callingScene);
    this.add.rectangle(x, y, width, height, 0x0c1822, 0.96).setStrokeStyle(1, 0x446b80, 0.75);
    this.add.rectangle(left + 4, y, 7, height - 10, 0x88ffcc, 0.9);
    this.add
      .text(left + 18, top + 15, 'CURRENT DECK', {
        fontFamily: 'Arial Black',
        fontSize: 9,
        color: '#88ffcc',
        align: 'left',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(
        left + 18,
        top + 33,
        `Draw ${summary.counts.deck} / Discard ${summary.counts.discard}`,
        {
          fontFamily: 'Arial',
          fontSize: 10,
          color: '#ffd166',
          align: 'left',
        }
      )
      .setOrigin(0, 0.5);

    summary.cards.slice(0, height < 96 ? 2 : 3).forEach((entry, index) => {
      const rowY = top + 52 + index * 15;
      this.add.circle(left + 22, rowY, 4, this.getItemColorSwatchColor(entry.card), 0.95);
      this.add
        .text(left + 32, rowY, `${entry.zone}: ${this.getDeckCardName(entry.card)}`, {
          fontFamily: 'Arial',
          fontSize: 9,
          color: '#d7e7ef',
          align: 'left',
          wordWrap: { width: width - 44 },
          maxLines: 1,
        })
        .setOrigin(0, 0.5);
    });
  }

  getShopDeckSummary(callingScene) {
    const factory = callingScene?.machineFactory;
    const counts = factory?.getDeckCounts?.() || { deck: 0, discard: 0, bonus: 0 };
    const draw = (factory?.processorDeck || []).filter(Boolean);
    const discard = (factory?.processorDiscard || []).filter(Boolean);
    const cards = [
      ...draw.map((card) => ({ zone: 'DRAW', card })),
      ...discard.map((card) => ({ zone: 'DISCARD', card })),
    ];

    return {
      counts,
      cards,
    };
  }

  getDeckCardName(card) {
    if (!card) return 'Unknown';
    return card.shortName || card.pieceShortName || card.name || card.pieceName || 'Operator';
  }

  getDeckCardMeta(card) {
    const color = card?.outputItemColor || card?.machineColor || 'item';
    const operation = card?.arithmeticOperation;
    if (operation?.type === 'add-constant') return `${color} +${operation.value || 1}`;
    if (operation?.type === 'add') return `${color} add`;
    if (operation?.type === 'multiply') return `${color} multiply`;
    if (operation?.type === 'divide') return `${color} divide`;
    return color;
  }

  getItemColorSwatchColor(card) {
    switch (card?.outputItemColor || card?.machineColor) {
      case 'red':
        return 0xff5b5b;
      case 'yellow':
        return 0xffd166;
      case 'green':
        return 0x88ff88;
      case 'purple':
        return 0xc084fc;
      case 'orange':
        return 0xff9f45;
      case 'wild':
        return 0xffffff;
      case 'blue':
      default:
        return 0x70d6ff;
    }
  }

  createShopPieceThumbnail(x, y, size, card, options = {}) {
    const body = getProcessingPieceBody(card?.bodyId);
    const shape = body?.shape || [[1]];
    const rowCount = shape.length;
    const columnCount = Math.max(...shape.map((row) => row.length));
    const largestAxis = Math.max(rowCount, columnCount);
    const gap = Math.max(1, Math.floor(size * 0.06));
    const cellSize = Math.max(4, Math.floor((size - gap * (largestAxis - 1)) / largestAxis));
    const thumbnailWidth = columnCount * cellSize + Math.max(0, columnCount - 1) * gap;
    const thumbnailHeight = rowCount * cellSize + Math.max(0, rowCount - 1) * gap;
    const startX = x - thumbnailWidth / 2;
    const startY = y - thumbnailHeight / 2;
    const enabled = options.enabled !== false;
    const color = this.getItemColorSwatchColor(card);

    this.add
      .rectangle(x, y, thumbnailWidth + 8, thumbnailHeight + 8, 0x061018, enabled ? 0.82 : 0.42)
      .setStrokeStyle(1, color, enabled ? 0.62 : 0.25);

    shape.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (!cell) return;

        this.add
          .rectangle(
            startX + columnIndex * (cellSize + gap) + cellSize / 2,
            startY + rowIndex * (cellSize + gap) + cellSize / 2,
            cellSize,
            cellSize,
            color,
            enabled ? 0.95 : 0.45
          )
          .setStrokeStyle(1, 0xffffff, enabled ? 0.28 : 0.12);
      });
    });
  }

  createShopOfferButton(x, y, width, height, choice, money) {
    const canAfford = !choice.purchased && (choice.isFree || money >= (choice.cost || 0));
    const isFeatured = Boolean(choice.isRecommended);
    const featuredColor = choice.kind === 'Boss Prep' ? 0xffd166 : 0x88ffcc;
    const accentColor = this.getShopKindColor(choice.kind);
    const fillColor = canAfford ? (isFeatured ? 0x13251f : 0x111d28) : 0x171d25;
    const hoverColor = canAfford ? (isFeatured ? 0x1d3b31 : 0x1a3041) : 0x202633;
    const strokeColor = canAfford ? (isFeatured ? featuredColor : 0x345d72) : 0x4b5663;
    const textColor = canAfford ? '#f4fbff' : '#8c98a3';
    const compact = height < 220;
    const veryCompact = height < 150;
    const left = x - width / 2;
    const top = y - height / 2;
    const right = x + width / 2;
    const bottom = y + height / 2;

    if (height <= 120) {
      this.createCompactShopOfferButton({
        x,
        y,
        width,
        height,
        choice,
        canAfford,
        isFeatured,
        featuredColor,
        accentColor,
        fillColor,
        hoverColor,
        strokeColor,
        textColor,
        left,
        top,
        right,
        bottom,
      });
      return;
    }

    const pad = compact ? 12 : 15;
    const headerY = top + 25;
    const costLabel = choice.purchased ? 'SOLD' : choice.isFree ? 'FREE' : `$${choice.cost || 0}`;
    const costWidth = Math.min(width < 240 ? 74 : 88, Math.max(58, costLabel.length * 6 + 20));
    const costX = right - pad - costWidth / 2;
    const headerFontSize = width < 180 ? 10 : 11;
    const iconSize = compact ? 34 : 42;
    const iconX = left + pad + iconSize / 2;
    const titleX = iconX + iconSize / 2 + 12;
    const titleWidth = Math.max(76, costX - costWidth / 2 - titleX - 10);

    const bg = this.add
      .rectangle(x, y, width, height, fillColor, 0.98)
      .setStrokeStyle(isFeatured ? 3 : 2, strokeColor, canAfford ? 0.95 : 0.55)
      .setInteractive({ useHandCursor: true });
    bg.setAlpha(0);
    bg.setScale(0.92);
    this.tweens.add({
      targets: bg,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 280 + Math.random() * 220,
      ease: 'Back.easeOut',
    });

    if (isFeatured) {
      this.tweens.add({
        targets: bg,
        scaleX: 1.014,
        scaleY: 1.014,
        duration: 780,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.add
        .text(left + 10, top + 8, choice.recommendationLabel || 'GOOD FIT', {
          fontFamily: 'Arial Black',
          fontSize: 10,
          color: choice.kind === 'Boss Prep' ? '#fff3bf' : '#c8fff0',
          align: 'left',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
    }

    this.add.rectangle(left + 4, y, 8, height - 12, accentColor, canAfford ? 0.95 : 0.45);

    const iconBg = this.add
      .circle(iconX, headerY + 14, iconSize / 2, accentColor, canAfford ? 0.98 : 0.38)
      .setStrokeStyle(2, isFeatured ? featuredColor : 0xffffff, isFeatured ? 0.9 : 0.18);
    if (choice.type === 'shop_piece') {
      this.createShopPieceThumbnail(iconBg.x, iconBg.y, iconSize - 12, choice.pieceCard, {
        enabled: canAfford,
      });
    } else {
      this.add
        .text(iconBg.x, iconBg.y, this.getShopKindIcon(choice.kind), {
          fontFamily: 'Arial Black',
          fontSize: compact ? 15 : 18,
          color: canAfford ? '#061018' : '#a9b2bb',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(titleX, top + 18, (choice.kind || 'Offer').toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: 10,
        color: canAfford ? `#${accentColor.toString(16).padStart(6, '0')}` : '#7d8892',
        align: 'left',
      })
      .setOrigin(0, 0.5);

    const costBg = this.add
      .rectangle(costX, headerY, costWidth, 26, 0x0c151d, 0.95)
      .setStrokeStyle(1, 0xffd166, canAfford ? 0.8 : 0.35);
    this.add
      .text(costBg.x, costBg.y, costLabel, {
        fontFamily: 'Arial',
        fontSize: headerFontSize,
        fontStyle: 'bold',
        color: canAfford ? '#ffd166' : '#8a7a52',
        align: 'center',
        wordWrap: { width: costWidth - 8 },
      })
      .setOrigin(0.5);

    const titleText = this.add
      .text(titleX, compact ? top + 43 : top + 48, choice.name, {
        fontFamily: 'Arial Black',
        fontSize: veryCompact ? 13 : compact ? 14 : 17,
        fontStyle: 'bold',
        color: textColor,
        align: 'left',
        wordWrap: { width: titleWidth },
        maxLines: veryCompact ? 1 : 2,
      })
      .setOrigin(0, 0);

    const payoffHeight = choice.effect ? (veryCompact ? 30 : compact ? 34 : 42) : 0;
    const payoffY = choice.effect ? bottom - pad - payoffHeight / 2 : null;
    const descriptionTop = Math.max(
      compact ? top + 82 : top + 94,
      titleText.y + titleText.height + 7
    );
    const descriptionBottom = choice.effect ? payoffY - payoffHeight / 2 - 8 : bottom - pad - 4;
    const descriptionFontSize = compact ? 10 : 12;
    const descriptionLineSpacing = compact ? 0 : 2;
    const descriptionLineHeight = descriptionFontSize + descriptionLineSpacing + 3;
    const descriptionHeight = descriptionBottom - descriptionTop;
    const descriptionMaxLines = Math.floor(descriptionHeight / descriptionLineHeight);

    if (choice.description && descriptionMaxLines > 0) {
      this.add
        .text(left + pad + 8, descriptionTop, choice.description, {
          fontFamily: 'Arial',
          fontSize: descriptionFontSize,
          color: canAfford ? '#cfe1ea' : '#7f8a94',
          align: 'left',
          lineSpacing: descriptionLineSpacing,
          wordWrap: { width: width - pad * 2 - 12 },
          maxLines: descriptionMaxLines,
          fixedWidth: width - pad * 2 - 12,
          fixedHeight: descriptionMaxLines * descriptionLineHeight,
        })
        .setOrigin(0, 0);
    }

    if (choice.effect) {
      this.add
        .rectangle(x + 4, payoffY, width - pad * 2 - 8, payoffHeight, 0x071018, 0.78)
        .setStrokeStyle(1, accentColor, canAfford ? 0.5 : 0.18);
      this.add
        .text(left + pad + 9, payoffY, choice.effect, {
          fontFamily: 'Arial Black',
          fontSize: veryCompact ? 9 : compact ? 10 : 12,
          fontStyle: 'bold',
          color: canAfford ? '#ffd166' : '#8a7a52',
          align: 'left',
          wordWrap: { width: width - pad * 2 - 18 },
          maxLines: veryCompact ? 1 : 2,
          fixedWidth: width - pad * 2 - 18,
          fixedHeight: payoffHeight - 8,
        })
        .setOrigin(0, 0.5);
    }

    bg.on('pointerover', () => {
      bg.fillColor = hoverColor;
      bg.setStrokeStyle(2, canAfford ? 0x7ad7ff : 0x66717d, canAfford ? 1 : 0.65);
    });
    bg.on('pointerout', () => {
      bg.fillColor = fillColor;
      bg.setStrokeStyle(2, strokeColor, canAfford ? 0.95 : 0.55);
    });
    bg.on('pointerdown', () => {
      if (choice.purchased) return;
      this.handleShopChoice(choice);
    });
  }

  createCompactShopOfferButton({
    x,
    y,
    width,
    height,
    choice,
    canAfford,
    isFeatured,
    featuredColor,
    accentColor,
    fillColor,
    hoverColor,
    strokeColor,
    textColor,
    left,
    top,
    right,
    bottom,
  }) {
    const hasPieceThumbnail = choice.type === 'shop_piece' && choice.pieceCard;
    const thumbnailSize = hasPieceThumbnail ? Math.min(34, Math.max(24, height - 48)) : 0;
    const contentLeft = hasPieceThumbnail ? left + 58 : left + 18;
    const costLabel = choice.purchased ? 'SOLD' : choice.isFree ? 'FREE' : `$${choice.cost || 0}`;
    const costWidth = Math.min(82, Math.max(58, costLabel.length * 6 + 18));
    const costX = right - 12 - costWidth / 2;
    const titleWidth = Math.max(92, costX - costWidth / 2 - contentLeft - 8);
    const bg = this.add
      .rectangle(x, y, width, height, fillColor, 0.98)
      .setStrokeStyle(isFeatured ? 2 : 1, strokeColor, canAfford ? 0.95 : 0.55)
      .setInteractive({ useHandCursor: true });

    this.add.rectangle(left + 4, y, 7, height - 10, accentColor, canAfford ? 0.95 : 0.45);
    if (hasPieceThumbnail) {
      this.createShopPieceThumbnail(left + 30, y + 5, thumbnailSize, choice.pieceCard, {
        enabled: canAfford,
      });
    }
    this.add
      .text(contentLeft, top + 15, (choice.kind || 'Offer').toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: 9,
        color: canAfford ? `#${accentColor.toString(16).padStart(6, '0')}` : '#7d8892',
        align: 'left',
      })
      .setOrigin(0, 0.5);

    if (isFeatured) {
      this.add
        .text(contentLeft, top + 31, choice.recommendationLabel || 'GOOD FIT', {
          fontFamily: 'Arial Black',
          fontSize: 8,
          color: featuredColor === 0xffd166 ? '#fff3bf' : '#c8fff0',
          align: 'left',
        })
        .setOrigin(0, 0.5);
    }

    this.add
      .rectangle(costX, top + 18, costWidth, 24, 0x0c151d, 0.95)
      .setStrokeStyle(1, 0xffd166, canAfford ? 0.8 : 0.35);
    this.add
      .text(costX, top + 18, costLabel, {
        fontFamily: 'Arial',
        fontSize: 10,
        fontStyle: 'bold',
        color: canAfford ? '#ffd166' : '#8a7a52',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(contentLeft, top + (isFeatured ? 43 : 36), choice.name, {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: textColor,
        align: 'left',
        wordWrap: { width: titleWidth },
        maxLines: 1,
      })
      .setOrigin(0, 0.5);

    if (choice.effect) {
      this.add
        .text(contentLeft, bottom - 17, choice.effect, {
          fontFamily: 'Arial',
          fontSize: 10,
          fontStyle: 'bold',
          color: canAfford ? '#ffd166' : '#8a7a52',
          align: 'left',
          wordWrap: { width: right - contentLeft - 16 },
          maxLines: 1,
        })
        .setOrigin(0, 0.5);
    }

    bg.on('pointerover', () => {
      bg.fillColor = hoverColor;
      bg.setStrokeStyle(2, canAfford ? 0x7ad7ff : 0x66717d, canAfford ? 1 : 0.65);
    });
    bg.on('pointerout', () => {
      bg.fillColor = fillColor;
      bg.setStrokeStyle(isFeatured ? 2 : 1, strokeColor, canAfford ? 0.95 : 0.55);
    });
    bg.on('pointerdown', () => {
      if (choice.purchased) return;
      this.handleShopChoice(choice);
    });
  }

  createShopSaveButton(x, y, width, height, choice, money = 0) {
    const canAfford = choice.isFree || money >= (choice.cost || 0);
    const label = choice.type === 'reroll_shop' ? 'SPIN REROLL' : choice.name;
    const bg = this.add
      .rectangle(x, y, width, height, canAfford ? 0x26313b : 0x171d25, 0.98)
      .setStrokeStyle(2, canAfford ? 0x6b7c8c : 0x4b5663, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, choice.cost ? `${label} ($${choice.cost})` : label, {
        fontFamily: 'Arial',
        fontSize: width < 220 ? 15 : 18,
        fontStyle: 'bold',
        color: canAfford ? '#f4fbff' : '#8c98a3',
        align: 'center',
        wordWrap: { width: width - 18 },
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.fillColor = 0x334250;
    });
    bg.on('pointerout', () => {
      bg.fillColor = 0x26313b;
    });
    bg.on('pointerdown', () => {
      if (!canAfford) {
        this.showShopMessage('Not enough cash.');
        return;
      }
      this.handleShopChoice(choice);
    });
  }

  getShopKindColor(kind) {
    switch (kind) {
      case 'Machine':
      case 'Operator':
        return 0x70d6ff;
      case 'Special':
        return 0xb56cff;
      case 'Board':
        return 0x88ffcc;
      case 'Color':
        return 0xffd166;
      case 'Utility':
        return 0xcdb4db;
      case 'Budget':
        return 0xffd166;
      case 'Plan':
        return 0x88ffcc;
      case 'Boss Prep':
        return 0xffd166;
      case 'Run Upgrade':
        return 0xffd166;
      case 'Upgrade':
      case 'Permanent':
      case 'Blueprint':
        return 0x88ccff;
      case 'Run':
        return 0xff8fab;
      case 'Sticker':
        return 0xa7c957;
      default:
        return 0x9fb8c8;
    }
  }

  getShopKindIcon(kind) {
    switch (kind) {
      case 'Machine':
      case 'Operator':
        return '+';
      case 'Special':
        return '*';
      case 'Board':
        return '#';
      case 'Color':
        return 'C';
      case 'Budget':
        return '$';
      case 'Plan':
        return '!';
      case 'Boss Prep':
        return '!';
      case 'Run Upgrade':
        return '^';
      case 'Upgrade':
      case 'Permanent':
      case 'Blueprint':
        return '^';
      case 'Run':
        return 'R';
      case 'Sticker':
        return '%';
      case 'Utility':
        return '?';
      default:
        return '+';
    }
  }

  handleShopChoice(choice) {
    const callingScene = this.scene.get(this.callingSceneKey);
    const result = callingScene?.buyShopChoice?.(choice) || {
      success: false,
      message: 'Shop unavailable.',
    };
    if (!result.success) {
      this.showShopMessage(result.message || 'Cannot buy that.');
      return;
    }
    if (result.closeShop !== false) {
      this.closeScene();
      return;
    }
    if (result.refreshShop) {
      this.scene.restart({
        upgradeManager: this.upgradeManager,
        callingSceneKey: this.callingSceneKey,
        isShop: this.isShop,
        isBoon: this.isBoon,
        isStarterSpark: this.isStarterSpark,
        isLevelUp: this.isLevelUp,
      });
      return;
    }
  }

  createUpgradeButton(x, y, width, height, choice) {
    const isSpark = this.isStarterSpark;
    const strokeColor = isSpark ? COLORS.spark : COLORS.cardStroke;
    const bg = this.add
      .rectangle(x, y, width, height, COLORS.card, 0.98)
      .setStrokeStyle(2, strokeColor, 0.85)
      .setInteractive({ useHandCursor: true });

    const costText = this.isShop ? ` [$${choice.cost || 0}]` : '';
    const badgeText =
      choice.kind || (isSpark ? 'Spark' : choice.level ? `L${choice.level}` : 'Upgrade');
    const badgeWidth = Math.min(92, Math.max(58, badgeText.length * 7 + 18));
    const badge = this.add
      .rectangle(
        x - width / 2 + badgeWidth / 2 + 14,
        y - height / 2 + 20,
        badgeWidth,
        24,
        strokeColor,
        0.95
      )
      .setStrokeStyle(1, 0xffffff, 0.2);
    this.add
      .text(badge.x, badge.y, badgeText.toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: 10,
        color: '#07111a',
        align: 'center',
      })
      .setOrigin(0.5);

    const title = this.add
      .text(x - width / 2 + 18, y - height / 2 + 46, `${choice.name}${costText}`, {
        fontFamily: 'Arial Black',
        fontSize: isSpark ? 16 : 15,
        color: COLORS.text,
        align: 'left',
        wordWrap: { width: width - 36 },
      })
      .setOrigin(0, 0.5);

    const body = this.add
      .text(x - width / 2 + 18, y - height / 2 + 66, choice.description || '', {
        fontFamily: 'Arial',
        fontSize: isSpark ? 13 : 12,
        color: '#d7e7ef',
        align: 'left',
        lineSpacing: 3,
        wordWrap: { width: width - 36 },
      })
      .setOrigin(0, 0);

    const effect = choice.effect
      ? this.add
          .text(x + width / 2 - 18, y + height / 2 - 14, choice.effect, {
            fontFamily: 'Arial Black',
            fontSize: 11,
            color: '#ffd166',
            align: 'right',
            wordWrap: { width: width - 36 },
          })
          .setOrigin(1, 0.5)
      : null;

    bg.on('pointerover', () => {
      bg.fillColor = COLORS.cardHover;
      bg.setStrokeStyle(3, strokeColor, 1);
    });
    bg.on('pointerout', () => {
      bg.fillColor = COLORS.card;
      bg.setStrokeStyle(2, strokeColor, 0.85);
    });
    bg.on('pointerdown', () => {
      if (this.isShop) {
        this.handleShopChoice(choice);
        return;
      } else if (this.isStarterSpark) {
        const applied = this.scene.get(this.callingSceneKey)?.applyStarterSparkChoice?.(choice);
        if (!applied) {
          this.showShopMessage('Starting bonus unavailable.');
          return;
        }
      } else if (this.isBoon) {
        this.upgradeManager.applyBoon(choice.type);
      } else {
        this.upgradeManager.applyUpgrade(choice.type);
      }
      console.log(`Selected: ${choice.name}`);
      if (this.scene.get(this.callingSceneKey)?.playSound) {
        this.scene.get(this.callingSceneKey).playSound('upgrade-select');
      }
      this.closeScene();
    });

    return { bg, title, body, effect, badge };
  }

  showShopMessage(message) {
    if (this.shopMessage) {
      this.shopMessage.destroy();
    }

    this.shopMessage = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 70, message, {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ff7777',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.shopMessage,
      alpha: 0,
      duration: 1200,
      ease: 'Power1',
      onComplete: () => {
        if (this.shopMessage) {
          this.shopMessage.destroy();
          this.shopMessage = null;
        }
      },
    });
  }

  closeScene() {
    // Resume the calling scene (GameScene)
    const callingScene = this.scene.get(this.callingSceneKey);
    if (callingScene) {
      callingScene.events.emit('upgradeSelected'); // Signal completion
      this.scene.resume(this.callingSceneKey);
    }
    // Stop this scene
    this.scene.stop(this.key);
  }
}
