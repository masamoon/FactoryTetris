import Phaser from 'phaser';
import Grid from '../objects/Grid';
import MachineFactory from '../objects/MachineFactory';
import ResourceNode from '../objects/ResourceNode';
import DeliveryNode from '../objects/DeliveryNode'; // Add import
import { GRID_CONFIG, GAME_CONFIG } from '../config/gameConfig';
import { UpgradeManager } from '../managers/UpgradeManager.js';
import BoardGenerator from '../managers/BoardGenerator.js';
import EconomyManager from '../managers/EconomyManager.js';
import { BOON_POOL, STARTER_SPARK_POOL } from '../config/boons.js';
import {
  BOARD_BLOCKER_CELL_STYLE,
  BOARD_OBSTACLE_TYPES,
  BOARD_OBSTACLE_STYLES,
  BOARD_TILE_STYLES,
  BOARD_TILE_TYPES,
} from '../config/boardConfig.js';
import { UPGRADE_TYPES, upgradesConfig } from '../config/upgrades.js';
import {
  ARITHMETIC_OPERATION_TYPES,
  ARITHMETIC_OPERATION_TAGS,
  getArithmeticOperationTagLabel,
} from '../config/resourceLevels';
import ConveyorMachine from '../objects/machines/ConveyorMachine.js'; // *** ADDED IMPORT ***
import { getPainterPaintColorKey } from '../objects/machines/ColorPainterMachine.js';
import BaseMachine from '../objects/machines/BaseMachine.js'; // Import BaseMachine for getIOPositionsForDirection
import { MACHINE_COLORS } from '../objects/machines/BaseMachine';
import TraitRegistry from '../objects/traits/TraitRegistry';
import {
  TRAIT_CATEGORIES,
  getTraitBandColor,
  getTraitById,
  rollTrait,
  rollTraitFromIds,
} from '../config/traits';
import { STARTER_PIECE_DECK, STANDARD_PIECE_LIBRARY } from '../config/pieceDeck';
import { getProcessingPieceBody, isProcessingPieceBodyId } from '../config/pieceBodies';
import {
  getItemColorHex,
  getItemColorKey,
  getItemColorName,
  getWildcardItemColor,
  isWildcardItemColor,
} from '../utils/ResourceUtils';
import {
  loadGameSettings,
  loadMetaUnlocks,
  saveGameSettings,
  saveMetaUnlocks,
} from '../utils/GameSettings';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    // Game state
    this.score = 0;
    this.gameTime = 0; // in seconds
    this.gameOver = false;
    this.paused = false;
    this.scrap = 0;
    this.yellowScrapProgress = 0;
    this.currentRound = 1;
    this.money = GAME_CONFIG.startingMoney || 45;
    this.capitalEdge = 0;
    this.lastRoundCapitalEdgeGain = 0;
    this.lastRoundCapitalDividend = 0;
    this.roundClearing = false;

    // Initialize collections
    this.resourceNodes = [];
    this.machines = [];
    this.deliveryNodes = []; // Add deliveryNodes array

    // Initialize Upgrade Manager
    this.upgradeManager = new UpgradeManager();
    this.economyManager = new EconomyManager(GAME_CONFIG.economy || {});

    this.isPausedForUpgrade = false; // Flag for upgrade pause state
    this.consumingBankedUpgrade = false;
    this.inputMode = 'desktop'; // 'desktop' or 'touch'
    this.isTouchPlacing = false;
    this.touchPreviewGridPos = null;

    // Camera references
    this.uiCamera = null;
    this.uiHeightRatio = 0.3; // Bottom deck and controls need enough room to avoid crunched cards.
    this.rightPanelWidth = 300; // Fixed width for right panel
    this.debugMode = false; // Toggle for debug features like "Clear Factory"

    // === Round / quota system state ===
    // runState: 'BUILD_PHASE' | 'ROUND_ACTIVE' | 'ROUND_CLEARED' | 'GRACE' | 'RUN_OVER'
    this.runState = 'ROUND_ACTIVE';
    this.currentRound = 1;
    this.roundScore = 0;
    this.roundQuota = 0;
    this.roundSurvived = false;
    this.pendingDeliveryCompletionScore = 0;
    this.roundTimerEvent = null;
    this.contract = null; // legacy HUD/modifier shell; replaced by round quota loop
    this.contractTimerEvent = null; // legacy alias for older pause code paths
    this.roundDeliveryCount = 0;
    this.contractDeliveryCount = 0; // legacy alias for older code paths
    this.recentFlowPlacements = new Map();
    this.flowPlacementRewardWindow = 18000;
    this.currentMomentum = 0;
    this.flowStreak = 0;
    this.bestFlowStreak = 0;
    this.lastFlowDeliveryAt = 0;
    this.lastFlowMilestone = 0;
    this.currentRoundBoard = null;
    this.roundBoardBlockers = [];
    this.roundBoardSpecialTiles = [];
    this.roundBoardLoaners = [];
    this.roundBoardShortcutContracts = [];
    this.roundState = null;
    this.boardGenerator = null;
    this.boardRevealGraphics = null;
    this.boardGimmickTooltip = null;
    this.hoveredBoardGimmickKey = null;
    this.fastForwardActive = false;
    this.fastForwardMultiplier = GAME_CONFIG.fastForwardSpeedMultiplier || 3;
    this.fastForwardButton = null;
    this.resetBoardButton = null;
    this.startRoundButtonPulse = null;
    this.juiceAudioContext = null;
    this.lastJuiceSoundAt = {};
    this.sfxVolumeMultiplier = 2.2;
    this.musicVolume = 0.8;
    this.audioVolume = 0.8;
    this.audioMuted = false;
    this.tutorialTipsEnabled = true;
    this.pendingBonusSourceColors = [];
    this.pendingBoardBlockerRemovals = 0;
    this.pendingBoardBonusTiles = [];
    this.currentShopOffers = null;
    this.shopRerollCount = 0;
    this.pendingShopOpen = false;
    this.specialLogisticsInventory = {};
    this.permanentSpecialLogistics = {};
    this.tutorialDismissed = false;
    this.tutorialPanel = null;
    this.tutorialUiHighlight = null;
    this.tutorialWorldHighlight = null;
    this.tutorialHighlightTween = null;
    this.tutorialHighlightKey = null;
    this.placementCue = null;
    this.placementCueBg = null;
    this.placementCueText = null;
    this.placementHintText = null;
    this.actionHintBar = null;
    this.actionHintBg = null;
    this.actionHintAccent = null;
    this.actionHintTitle = null;
    this.actionHintBody = null;
    this.lastQuotaHudScore = 0;
    this.firstDeliveryCelebrated = false;
    this.exactDemandExplained = false;
    this.operationDemandExplained = false;
    this.roundTimeLimitMs = 0;
    this.roundTimeRemainingMs = 0;
    this.roundEndsAt = 0;
    this.lastRoundTimeBonus = 0;
    this.lastRoundSpeedScrap = 0;
    this.lastRoundQuotaPayout = 0;
    this.lastRoundOverDelivery = 0;
    this.lastRoundPaidBeltFreeBonus = 0;
    this.paidBeltPlacementsThisRound = 0;
    this.paidBeltSpendThisRound = 0;
    this.lastDeliveryBreakdown = null;
    this.deliveryRejectionStats = {};
    this.lastDeliveryRejection = null;
    this.lastFailureSummary = null;
    this.starterSparkOffered = false;
    this.pendingStarterSparkRound = null;
    this.pendingStarterSparkGrant = null;
    this.starterJackpotPrimerSpent = false;
    this.metaUnlocks = {
      freeDraftRedrawPerRound: true,
      undergroundBelts: GAME_CONFIG.metaProgression?.undergroundBeltsUnlockedByDefault === true,
    };
    this.freeDraftRedrawsRemaining = 0;
  }

  create() {
    this.setupCameras();
    this.applySettings(loadGameSettings());
    const savedMetaUnlocks = loadMetaUnlocks();
    this.metaUnlocks = {
      ...this.metaUnlocks,
      ...savedMetaUnlocks,
      freeDraftRedrawPerRound: savedMetaUnlocks.freeDraftRedrawPerRound !== false,
      undergroundBelts: Boolean(
        this.metaUnlocks.undergroundBelts || savedMetaUnlocks.undergroundBelts
      ),
    };

    this.traitRegistry = new TraitRegistry();
    console.log('[GameScene] TraitRegistry initialized');

    // Create game objects
    this.createBackground();
    this.grid = new Grid(this, GRID_CONFIG);
    this.addToWorld(this.grid.graphics); // Ensure grid graphics are only in world view
    this.addToWorld(this.grid.highlightEffect); // Ensure grid highlight is only in world view
    this.boardGenerator = new BoardGenerator({ gridConfig: GRID_CONFIG });

    // Add a reference to the grid as factoryGrid for compatibility with existing code
    this.factoryGrid = this.grid; // Revert to using the existing Grid instance

    // Initialize MachineFactory in the machine selection area
    // Use scale (screen size) instead of camera main (world view)
    const width = this.scale.width;
    const height = this.scale.height;
    const screenWidth = width;
    const screenHeight = height;

    // Position: Center X, Center of bottom 25% for Y
    const uiY = screenHeight * (1 - this.uiHeightRatio / 2);

    // Right Panel offset
    const gameWidth = screenWidth - this.rightPanelWidth;

    this.machineFactory = new MachineFactory(this, {
      x: gameWidth / 2, // Center in the game area, not full screen
      y: uiY,
      width: gameWidth, // Only span the game area
      height: screenHeight * this.uiHeightRatio,
      cellSize: GRID_CONFIG.cellSize,
    });
    this.addToUI(this.machineFactory.container);

    // Connect the Grid to the MachineFactory
    this.grid.setFactory(this.machineFactory);

    // Setup input handlers
    this.setupInput();

    // Create UI elements
    this.createUI();

    // Add decorative elements
    this.addDecorations();

    // Setup game timers
    this.gameTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true,
    });

    // Delivery/resource nodes are now spawned by round setup, not a timer.
    this.nodeSpawnTimer = null;

    // Initialize game state
    this.score = 0;
    this.gameTime = 0;
    this.gameOver = false;
    this.currentRound = 1;
    this.roundScore = 0;
    this.roundSurvived = false;
    this.pendingDeliveryCompletionScore = 0;
    this.currentMomentum = 0;
    this.flowStreak = 0;
    this.bestFlowStreak = 0;
    this.lastFlowDeliveryAt = 0;
    this.lastFlowMilestone = 0;
    this.scrap = 0;
    this.yellowScrapProgress = 0;
    this.money = GAME_CONFIG.startingMoney || 45;
    this.capitalEdge = 0;
    this.lastRoundCapitalEdgeGain = 0;
    this.lastRoundCapitalDividend = 0;
    this.resetRoundPaidBeltUsage();
    this.specialLogisticsInventory = {};
    this.permanentSpecialLogistics = {};
    this.starterSparkOffered = false;

    this.startRound(1, { buildPhase: true });

    // Play background music
    this.playBackgroundMusic();

    this.events.on('upgradeSelected', this.resumeFromUpgrade, this);
    this.events.on('machineSelected', this.showPlacementCue, this);
    this.events.on('machineDeselected', this.hidePlacementCue, this);

    // Add a toggle button or key for switching input modes
    this.input.keyboard.on('keydown-M', () => {
      const settings = saveGameSettings({
        inputMode: this.inputMode === 'desktop' ? 'touch' : 'desktop',
      });
      this.applySettings(settings);
      this.showInputModeMessage();
    });
    this.input.keyboard.on('keydown-O', () => {
      this.openSettingsScreen();
    });

    // Set initial camera bounds
    this.updateCameraBounds();

    this.updateRoundUI();
  }

  update(time, delta) {
    // Add time, delta parameters
    // PAUSE CHECK
    if (this.gameOver || this.paused || this.isPausedForUpgrade) return;

    // ---> ADD TIMER PROGRESS LOG HERE <---
    if (this.nodeSpawnTimer && this.time.now % 1000 < 20) {
      // Log roughly once per second
      //console.log(`[TIMER_DEBUG] nodeSpawnTimer Progress: ${(this.nodeSpawnTimer.getProgress() * 100).toFixed(1)}% (${this.nodeSpawnTimer.getRemaining().toFixed(0)}ms remaining) Paused: ${this.nodeSpawnTimer.paused}`);
    }

    if (this.runState === 'BUILD_PHASE') {
      this.refreshTutorialPanel();
      this.machineFactory.update();
      this.deliveryNodes.forEach((node) => node.update(time, delta));
      this.cleanupRecentFlowPlacements();
      return;
    }

    this.cleanupRecentFlowPlacements();

    // Update all game objects
    this.factoryGrid.update(time, delta); // Pass time, delta to Grid.update()
    this.machineFactory.update(); // Does MachineFactory need time/delta?

    // Update resource nodes
    this.resourceNodes.forEach((node) => node.update(time, delta)); // Pass time/delta just in case
    // Update delivery nodes
    this.deliveryNodes.forEach((node) => node.update(time, delta)); // Pass time/delta just in case
    this.advanceRoundClock(delta);
    this.evaluateRoundTimeLimit();
    this.evaluateRoundResourceExhaustion();

    this._roundHudAccum = (this._roundHudAccum || 0) + delta;
    if (this._roundHudAccum >= 500) {
      this.updateRoundUI();
      this.refreshTutorialPanel();
      this._roundHudAccum = 0;
    }

    // Trait HUD refresh
    this._traitHudAccum = (this._traitHudAccum || 0) + delta;
    if (this._traitHudAccum >= 500) {
      this.refreshRunWideHud();
      this._traitHudAccum = 0;
    }

    // --- REMOVED CLEAR COOLDOWN UI UPDATE ---
    // this.updateClearCooldownUI();

    // Check for game over condition

    // this.updateScore(); // Remove this call, addScore handles UI update
    // this.updateResourceDisplay(); // Remove this call, likely handled elsewhere or undefined
  }

  updateCameraBounds() {
    const padding = 500;
    const gridWidth = this.grid.width * this.grid.cellSize;
    const gridHeight = this.grid.height * this.grid.cellSize;

    // Grid x,y is the top-left corner
    const gridX = this.grid.x;
    const gridY = this.grid.y;

    // Calculate bounds with padding
    const minX = gridX - padding;
    const minY = gridY - padding;
    const width = gridWidth + padding * 2;
    const height = gridHeight + padding * 2;

    this.cameras.main.setBounds(minX, minY, width, height);
    console.log(`[Camera] Updated bounds: x=${minX}, y=${minY}, w=${width}, h=${height}`);
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Main background - Add to World
    const mainBg = this.add
      .rectangle(0, 0, width, height, 0x1a2e3b)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.addToWorld(mainBg);

    // Factory area background REMOVED - grid has its own background

    // Machine selection area - REMOVED (Handled by MachineFactory)
    /*
    const uiBg = this.add
      .rectangle(width * 0.05, height * 0.7, width * 0.4, height * 0.25, 0x0a1a2a)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0x3a5a7a);
    this.addToUI(uiBg);

    // Add some decorative elements
    this.addDecorations();
    */
  }

  createUI() {
    const width = this.scale.width;
    const height = this.scale.height;

    const panelX = width - this.rightPanelWidth;
    const centerX = panelX + this.rightPanelWidth / 2;
    const margin = 14;
    const contentX = panelX + margin;
    const contentWidth = this.rightPanelWidth - margin * 2;
    const statGap = 8;
    const statWidth = (contentWidth - statGap) / 2;

    this.createHudPanel(contentX, 12, contentWidth, 82, 0x101820, 0x263746);
    this.scoreText = this.createStatChip(contentX, 22, statWidth, 'REVENUE', '$0', '#ffffff');
    this.scrapText = this.createStatChip(
      contentX + statWidth + statGap,
      22,
      statWidth,
      'SUPPLY',
      '0',
      '#ffd166'
    );
    this.eraText = this.createStatChip(
      contentX,
      62,
      statWidth,
      'ROUND',
      `${this.currentRound}`,
      '#aaaaff'
    );
    this.moneyText = this.createStatChip(
      contentX + statWidth + statGap,
      62,
      statWidth,
      'CASH',
      `$${this.money}`,
      '#88ffcc'
    );
    this.flowText = this.add
      .text(contentX + contentWidth / 2, 96, 'Flow 0/12  x1.00', {
        fontFamily: 'Arial',
        fontSize: 10,
        color: '#95aab5',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.flowText.setDepth(3);
    this.addToUI(this.flowText);

    this.createActionHintBar();

    this.createHudPanel(contentX, 112, contentWidth, 146, 0x12151d, 0x3f3a2b);
    this.createSectionLabel(contentX + 10, 122, 'TARGET');
    this.deliveryQuotaText = this.add
      .text(contentX + 12, 142, '$0 / $0', {
        fontFamily: 'Arial Black',
        fontSize: 17,
        color: '#ffe28a',
        align: 'left',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.deliveryQuotaText.setDepth(3);
    this.deliveryStatusText = this.add
      .text(contentX + contentWidth - 12, 142, '', {
        fontFamily: 'Arial Black',
        fontSize: 14,
        color: '#88ccff',
        align: 'right',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    this.deliveryStatusText.setDepth(3);
    this.deliveryProgressTrack = this.add
      .rectangle(contentX + 12, 162, contentWidth - 24, 8, 0x27313a, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.deliveryProgressTrack.setStrokeStyle(1, 0x455d6a, 0.55);
    this.deliveryProgressTrack.setDepth(2);
    this.deliveryProgressFill = this.add
      .rectangle(contentX + 12, 162, 0, 8, 0x88ffcc, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.deliveryProgressFill.setDepth(3);
    this.deliveryBoardText = this.add
      .text(contentX + 12, 184, '', {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#dfefff',
        align: 'left',
        wordWrap: { width: contentWidth - 24 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.deliveryBoardText.setDepth(3);
    this.deliveryDemandText = this.add
      .text(contentX + 12, 209, '', {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#ffe28a',
        align: 'left',
        lineSpacing: 4,
        wordWrap: { width: contentWidth - 24 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.deliveryDemandText.setDepth(3);
    this.nextDemandText = this.add
      .text(contentX + 12, 243, '', {
        fontFamily: 'Arial',
        fontSize: 10,
        color: '#95dfe8',
        align: 'left',
        wordWrap: { width: contentWidth - 24 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.nextDemandText.setDepth(3);
    [
      this.deliveryQuotaText,
      this.deliveryStatusText,
      this.deliveryProgressTrack,
      this.deliveryProgressFill,
      this.deliveryBoardText,
      this.deliveryDemandText,
      this.nextDemandText,
    ].forEach((obj) => this.addToUI(obj));

    this.upgradesPanelBounds = {
      x: contentX,
      y: 272,
      width: contentWidth,
      height: 138,
    };
    this.createHudPanel(
      this.upgradesPanelBounds.x,
      this.upgradesPanelBounds.y,
      this.upgradesPanelBounds.width,
      this.upgradesPanelBounds.height,
      0x15151b,
      0x3f3d55
    );
    this.createSectionLabel(contentX + 10, 282, 'UPGRADES');
    this.upgradeRows = [];
    this.upgradeRowContainer = this.add.container(0, 0).setScrollFactor(0);
    this.upgradeRowContainer.setDepth(3);
    this.addToUI(this.upgradeRowContainer);
    this.updateActiveUpgradesDisplay(); // Initial update

    // Active run-wide traits HUD
    this.runWideHud = this.add.container(width - 12, 8);
    this.runWideHud.setScrollFactor(0);
    this.runWideHud.setDepth(1000);
    this.runWideHudLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#ffffff',
        align: 'right',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(1, 0);
    this.runWideHud.add(this.runWideHudLabel);
    this.refreshRunWideHud();

    const buttonStartY = height - 78;

    // Pause and speed controls
    this.pauseButton = this.createButton(
      centerX - 90,
      buttonStartY,
      'PAUSE',
      () => {
        this.togglePause();
      },
      78,
      36,
      12
    );
    this.pauseButton.button.setScrollFactor(0);
    this.pauseButton.text.setScrollFactor(0);
    this.addToUI(this.pauseButton.button);
    this.addToUI(this.pauseButton.text);

    this.fastForwardButton = this.createButton(
      centerX,
      buttonStartY,
      'SPEED 1x',
      () => {
        this.toggleFastForward();
      },
      78,
      36,
      11
    );
    this.fastForwardButton.button.setScrollFactor(0);
    this.fastForwardButton.text.setScrollFactor(0);
    this.addToUI(this.fastForwardButton.button);
    this.addToUI(this.fastForwardButton.text);

    this.settingsButton = this.createButton(
      centerX + 90,
      buttonStartY,
      'OPTIONS',
      () => {
        this.openSettingsScreen();
      },
      78,
      36,
      12
    );
    this.settingsButton.button.fillColor = 0x263746;
    this.settingsButton.button.defaultFillColor = 0x263746;
    this.settingsButton.button.hoverFillColor = 0x35546a;
    this.settingsButton.button.setStrokeStyle(1, 0x83f7ff, 0.7);
    this.settingsButton.button.setScrollFactor(0);
    this.settingsButton.text.setScrollFactor(0);
    this.addToUI(this.settingsButton.button);
    this.addToUI(this.settingsButton.text);

    this.startRoundButton = this.createButton(centerX, buttonStartY - 42, 'START ROUND', () => {
      if (this.runState === 'ROUND_ACTIVE' && this.roundSurvived) {
        this.finishSurvivedRound();
        return;
      }
      this.beginActiveRound();
    });
    this.startRoundButton.button.fillColor = 0x2c7a55;
    this.startRoundButton.button.defaultFillColor = 0x2c7a55;
    this.startRoundButton.button.hoverFillColor = 0x3f9f72;
    this.startRoundButton.button.setStrokeStyle(2, 0x88ffcc);
    this.startRoundButton.button.setScrollFactor(0);
    this.startRoundButton.text.setScrollFactor(0);
    this.addToUI(this.startRoundButton.button);
    this.addToUI(this.startRoundButton.text);
    this.setBuildPhaseUIVisible(false);

    this.resetBoardButton = this.createButton(
      centerX,
      buttonStartY - 84,
      'RESET BOARD',
      () => {
        this.resetBuildBoard();
      },
      250
    );
    this.resetBoardButton.button.fillColor = 0x4f3b2c;
    this.resetBoardButton.button.defaultFillColor = 0x4f3b2c;
    this.resetBoardButton.button.hoverFillColor = 0x755438;
    this.resetBoardButton.button.setStrokeStyle(1, 0xc58b5b, 0.75);
    this.resetBoardButton.button.setScrollFactor(0);
    this.resetBoardButton.text.setScrollFactor(0);
    this.addToUI(this.resetBoardButton.button);
    this.addToUI(this.resetBoardButton.text);

    this.draftCycleButton = this.createButton(centerX, buttonStartY + 40, 'REDRAW HAND', () => {
      this.cycleDraftSelection();
    });
    this.draftCycleButton.button.fillColor = 0x884400;
    this.draftCycleButton.button.defaultFillColor = 0x884400;
    this.draftCycleButton.button.hoverFillColor = 0xaa6600;
    this.draftCycleButton.button.setStrokeStyle(1, 0xcc6600, 0.78);
    this.draftCycleButton.button.setScrollFactor(0);
    this.draftCycleButton.text.setScrollFactor(0);
    this.updateDraftCycleButton();
    this.updateFastForwardButton();
    this.updatePauseButton();
    this.updateResetBoardButton();
    this.addToUI(this.draftCycleButton.button);
    this.addToUI(this.draftCycleButton.text);
    this.createTutorialPanel();

    // Clear Factory Button (DEBUG ONLY)
    if (this.debugMode) {
      this.clearButton = this.createButton(centerX, buttonStartY - 126, 'CLEAR (DEBUG)', () => {
        this.clearPlacedItems();
      });
      this.clearButton.button.setScrollFactor(0);
      this.clearButton.text.setScrollFactor(0);
      this.clearButton.button.fillColor = 0xaa0000;
      this.addToUI(this.clearButton.button);
      this.addToUI(this.clearButton.text);
    }
  }

  createHudPanel(x, y, width, height, fillColor, strokeColor) {
    const panel = this.add
      .rectangle(x, y, width, height, fillColor, 0.78)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    panel.setAlpha(0.94);
    panel.setStrokeStyle(1, strokeColor, 0.58);
    panel.setDepth(1);
    this.addToUI(panel);
    return panel;
  }

  createSectionLabel(x, y, label) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: 10,
        color: '#b3c9d4',
        align: 'left',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    text.setDepth(2);
    this.addToUI(text);
    return text;
  }

  createStatChip(x, y, width, label, value, valueColor) {
    const bg = this.add
      .rectangle(x, y, width, 30, 0x1c2933, 0.9)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    bg.setStrokeStyle(1, 0x4b6b7d, 0.48);
    bg.setDepth(2);
    this.addToUI(bg);

    const labelText = this.add
      .text(x + 8, y + 7, label, {
        fontFamily: 'Arial',
        fontSize: 8,
        color: '#b7c8d0',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    labelText.setDepth(3);
    this.addToUI(labelText);

    const valueText = this.add
      .text(x + width - 8, y + 18, value, {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: valueColor,
        align: 'right',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    valueText.setDepth(3);
    valueText.statChipMaxWidth = Math.max(28, width - 16);
    valueText.statChipBaseFontSize = 15;
    this.addToUI(valueText);
    return valueText;
  }

  createActionHintBar() {
    const playAreaWidth = this.scale.width - this.rightPanelWidth;
    const tutorialVisible = this.shouldShowTutorialPanel();
    const reservedTutorialWidth = tutorialVisible ? 214 : 0;
    const barWidth = Math.min(
      tutorialVisible ? 270 : 430,
      playAreaWidth - reservedTutorialWidth - 18
    );
    const barX = tutorialVisible
      ? reservedTutorialWidth
      : Math.max(14, playAreaWidth / 2 - barWidth / 2);
    const barY = 14;
    const barHeight = 54;
    const container = this.add.container(barX, barY).setScrollFactor(0);
    container.setDepth(880);

    this.actionHintBg = this.add
      .rectangle(0, 0, barWidth, barHeight, 0x07111a, 0.82)
      .setOrigin(0)
      .setStrokeStyle(1, 0x355466, 0.78);
    this.actionHintAccent = this.add.rectangle(0, 0, 5, barHeight, 0x88ffcc, 0.95).setOrigin(0);
    this.actionHintTitle = this.add.text(14, 10, '', {
      fontFamily: 'Arial Black',
      fontSize: 11,
      color: '#88ffcc',
      align: 'left',
    });
    this.actionHintBody = this.add.text(14, 29, '', {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#dfefff',
      align: 'left',
      wordWrap: { width: barWidth - 28 },
    });

    container.add([
      this.actionHintBg,
      this.actionHintAccent,
      this.actionHintTitle,
      this.actionHintBody,
    ]);
    this.actionHintBar = container;
    this.addToUI(container);
  }

  setActionHint(title, body, color = 0x88ffcc) {
    if (!this.actionHintBar || !this.actionHintTitle || !this.actionHintBody) return;

    this.layoutActionHintBar();
    this.actionHintTitle.setText(title);
    this.actionHintTitle.setColor(this.toCssColor(color));
    this.actionHintBody.setText(body);
    if (this.actionHintAccent) {
      this.actionHintAccent.fillColor = color;
    }
  }

  layoutActionHintBar() {
    if (!this.actionHintBar || !this.actionHintBg || !this.actionHintBody) return;

    const playAreaWidth = this.scale.width - this.rightPanelWidth;
    const tutorialVisible = this.shouldShowTutorialPanel() && this.tutorialPanel?.visible !== false;
    const reservedTutorialWidth = tutorialVisible ? 214 : 0;
    const barWidth = Math.max(
      300,
      Math.min(tutorialVisible ? 270 : 430, playAreaWidth - reservedTutorialWidth - 18)
    );
    const barX = tutorialVisible
      ? reservedTutorialWidth
      : Math.max(14, playAreaWidth / 2 - barWidth / 2);

    this.actionHintBar.setPosition(barX, 14);
    this.actionHintBg.width = barWidth;
    this.actionHintAccent.width = 5;
    this.actionHintBody.setWordWrapWidth(barWidth - 28);
  }

  setStatChipValue(textObject, value) {
    if (!textObject) return;
    const baseSize = textObject.statChipBaseFontSize || 16;
    const maxWidth = textObject.statChipMaxWidth || 80;
    let fontSize = baseSize;
    textObject.setText(value);
    textObject.setFontSize(fontSize);
    while (textObject.width > maxWidth && fontSize > 11) {
      fontSize -= 1;
      textObject.setFontSize(fontSize);
    }
  }

  createTutorialPanel() {
    if (!this.shouldShowTutorialPanel() || this.tutorialPanel) return;

    const panelX = 14;
    const panelY = 14;
    const panelWidth = 190;
    const panelHeight = 152;
    const panel = this.add.container(panelX, panelY).setScrollFactor(0);
    panel.setDepth(900);

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x07111a, 0.86)
      .setOrigin(0)
      .setStrokeStyle(1, 0x456274, 0.8);
    const accent = this.add.rectangle(0, 0, 5, panelHeight, 0x88ccff, 0.9).setOrigin(0);
    const title = this.add.text(14, 10, 'FIRST DELIVERY', {
      fontFamily: 'Arial Black',
      fontSize: 10,
      color: '#88ccff',
    });
    const closeButton = this.add
      .text(panelWidth - 13, 10, 'X', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#95aab5',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => {
      this.tutorialDismissed = true;
      this.destroyTutorialPanel();
    });

    this.tutorialStepsText = this.add.text(14, 34, '', {
      fontFamily: 'Arial',
      fontSize: 11,
      color: '#dfefff',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 26 },
    });
    this.tutorialHintText = this.add.text(14, 82, '', {
      fontFamily: 'Arial',
      fontSize: 11,
      color: '#ffd166',
      lineSpacing: 3,
      wordWrap: { width: panelWidth - 26 },
    });
    this.tutorialGoalText = this.add.text(14, 132, '', {
      fontFamily: 'Arial',
      fontSize: 10,
      color: '#95aab5',
      wordWrap: { width: panelWidth - 26 },
    });

    panel.add([
      background,
      accent,
      title,
      closeButton,
      this.tutorialStepsText,
      this.tutorialHintText,
      this.tutorialGoalText,
    ]);
    this.tutorialPanel = panel;
    this.addToUI(panel);
    this.refreshTutorialPanel();
  }

  shouldShowTutorialPanel() {
    return false;
  }

  destroyTutorialPanel() {
    if (this.tutorialPanel) {
      this.tutorialPanel.destroy();
      this.tutorialPanel = null;
    }
    this.tutorialStepsText = null;
    this.tutorialHintText = null;
    this.tutorialGoalText = null;
    this.clearTutorialHighlights();
  }

  getTutorialDeliveryTargetLabel() {
    const deliveryNode =
      (this.deliveryNodes || []).find((node) => !node.completed) || (this.deliveryNodes || [])[0];
    if (deliveryNode) {
      if (typeof deliveryNode.getHudLabel === 'function') return deliveryNode.getHudLabel();
      if (typeof deliveryNode.getConditionShortLabel === 'function') {
        return deliveryNode.getConditionShortLabel();
      }
      if (deliveryNode.label) return deliveryNode.label;
    }

    if (typeof this.getRoundPreviewText === 'function') {
      return this.getRoundPreviewText(this.currentRound || 1, 1);
    }

    return 'delivery target';
  }

  getTutorialDeliveryTargetDetails() {
    const deliveryNode =
      (this.deliveryNodes || []).find((node) => !node.completed) || (this.deliveryNodes || [])[0];
    if (!deliveryNode) {
      return {
        cargoLabel: this.getTutorialCargoLabel(this.getTutorialDeliveryTargetLabel()),
        requiredCount: 1,
        rewardLabel: '',
      };
    }

    const condition = deliveryNode.condition || {};
    const requiredCount = Math.max(1, condition.requiredCount || 1);
    const cargoLabel =
      typeof deliveryNode.getConditionShortLabel === 'function'
        ? deliveryNode.getConditionShortLabel()
        : this.getTutorialCargoLabel(deliveryNode.label || 'delivery target');
    const scoreReward = condition.completionScoreReward || condition.payout || 0;
    const rewardParts = [];
    if (scoreReward > 0) rewardParts.push(`$${scoreReward} revenue`);

    return {
      cargoLabel,
      requiredCount,
      rewardLabel: rewardParts.join(', '),
    };
  }

  isTutorialProcessorMachine(machine) {
    const id = String(machine?.id || machine?.type || '').toLowerCase();
    return (
      machine?.category === 'operator' ||
      machine?.machineFamily === 'operator' ||
      isProcessingPieceBodyId(id) ||
      Boolean(machine?.arithmeticOperation)
    );
  }

  isTutorialLogisticsMachine(machine) {
    const id = String(machine?.id || machine?.type || '').toLowerCase();
    return ['conveyor', 'splitter', 'merger', 'underground-belt', 'painter'].includes(id);
  }

  getFirstDeliveryTutorialState() {
    const machines = this.machines || [];
    const selectedId = String(this.selectedMachineType?.id || '').toLowerCase();
    const processorPlaced = machines.some((machine) => this.isTutorialProcessorMachine(machine));
    const logisticsPlaced = machines.some((machine) => this.isTutorialLogisticsMachine(machine));
    const placed = machines.length > 0;
    const started = this.runState !== 'BUILD_PHASE';
    const scored =
      (this.roundScore || 0) > 0 ||
      (this.deliveryNodes || []).some((node) => node.completed || (node.deliveredCount || 0) > 0);

    return {
      picked:
        Boolean(this.selectedMachineType) ||
        processorPlaced ||
        isProcessingPieceBodyId(selectedId) ||
        Boolean(this.selectedMachineType?.arithmeticOperation),
      placed,
      processorPlaced,
      logisticsPlaced,
      started,
      scored,
      target: this.getTutorialDeliveryTargetLabel(),
      targetDetails: this.getTutorialDeliveryTargetDetails(),
    };
  }

  refreshTutorialPanel() {
    if (!this.shouldShowTutorialPanel()) {
      this.destroyTutorialPanel();
      return;
    }
    if (!this.tutorialPanel || !this.tutorialStepsText) return;

    const state = this.getFirstDeliveryTutorialState();
    const targetDetails = state.targetDetails || {};
    const cargoLabel = this.getTutorialCargoLabel(targetDetails.cargoLabel || state.target);
    const requiredCount = Math.max(1, targetDetails.requiredCount || 1);
    const itemLabel = `${requiredCount} ${cargoLabel} item${requiredCount === 1 ? '' : 's'}`;
    const rewardText = targetDetails.rewardLabel ? ` Reward: ${targetDetails.rewardLabel}.` : '';
    let hint = `Pick an Operator card from the bottom deck. It turns source items into ${cargoLabel}.${rewardText}`;

    if (state.scored) {
      hint =
        'First delivery paid out revenue. Keep adding operators and belts until the quota is full.';
    } else if (state.started) {
      hint = 'Watch the flow. If items stall, use the next build phase to rotate or reroute.';
    } else if (state.logisticsPlaced) {
      hint = 'Press START R1 when the source, Operator, belts, and delivery all have a path.';
    } else if (state.placed) {
      hint = `Add BELT from source to Operator, then to ${cargoLabel}. Direction arrows matter.`;
    } else if (state.picked) {
      hint = 'Place the Operator between a source and the highlighted delivery target.';
    }
    const highlightStep = this.getTutorialHighlightStep(state);
    const stepSummary = this.getTutorialStepSummary(state);

    this.tutorialStepsText.setText(`Deliver ${itemLabel}\n${stepSummary}`);
    this.tutorialHintText.setText(hint);
    this.tutorialGoalText?.setText('Follow the highlighted area.');
    this.updateTutorialHighlight(highlightStep);
  }

  getTutorialCargoLabel(target) {
    return String(target || 'the requested')
      .replace(/\s*SCORE\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getTutorialStepSummary(state) {
    if (state.scored) return 'First revenue in';
    if (state.started) return 'Watch for the first payout';
    if (state.logisticsPlaced) return 'Start the round';
    if (state.placed) return 'Connect it with belts';
    if (state.picked) return 'Place the Operator';
    return 'Pick an Operator';
  }

  getTutorialHighlightStep(state) {
    if (state.scored) return 'quota';
    if (state.started) return 'delivery';
    if (state.logisticsPlaced) return 'start';
    if (state.placed) return 'logistics';
    if (state.picked) return 'board';
    return 'operators';
  }

  getTutorialHighlightTarget(step) {
    const factory = this.machineFactory;
    if (step === 'operators' && factory) {
      return {
        key: 'ui:operators',
        camera: 'ui',
        x: factory.x - 168,
        y: factory.y - 78,
        width: 336,
        height: 72,
        radius: 6,
      };
    }

    if (step === 'logistics' && factory) {
      return {
        key: 'ui:logistics',
        camera: 'ui',
        x: factory.x - 170,
        y: factory.y + 2,
        width: 510,
        height: 64,
        radius: 6,
      };
    }

    if (step === 'start' && this.startRoundButton?.button) {
      const button = this.startRoundButton.button;
      return {
        key: 'ui:start',
        camera: 'ui',
        x: button.x - button.width / 2 - 8,
        y: button.y - button.height / 2 - 8,
        width: button.width + 16,
        height: button.height + 16,
        radius: 4,
      };
    }

    if (step === 'quota') {
      const panelX = this.scale.width - this.rightPanelWidth + 14;
      return {
        key: 'ui:quota',
        camera: 'ui',
        x: panelX,
        y: 108,
        width: this.rightPanelWidth - 28,
        height: 150,
        radius: 4,
      };
    }

    if (step === 'delivery') {
      const deliveryNode =
        (this.deliveryNodes || []).find((node) => !node.completed) || (this.deliveryNodes || [])[0];
      if (deliveryNode) {
        return {
          key: `world:delivery:${deliveryNode.gridX}:${deliveryNode.gridY}`,
          camera: 'world',
          x: deliveryNode.x - 23,
          y: deliveryNode.y - 23,
          width: 46,
          height: 46,
          radius: 8,
        };
      }
    }

    if (step === 'board' && this.grid) {
      const inset = 4;
      const gridWidth = this.grid.width * this.grid.cellSize;
      const gridHeight = this.grid.height * this.grid.cellSize;
      return {
        key: 'world:board',
        camera: 'world',
        x: this.grid.x - gridWidth / 2 + inset,
        y: this.grid.y - gridHeight / 2 + inset,
        width: gridWidth - inset * 2,
        height: gridHeight - inset * 2,
        radius: 4,
      };
    }

    return null;
  }

  updateTutorialHighlight(step) {
    const target = this.getTutorialHighlightTarget(step);
    if (!target) {
      this.clearTutorialHighlights();
      return;
    }

    const isWorld = target.camera === 'world';
    const activeLayer = isWorld ? this.getTutorialWorldHighlight() : this.getTutorialUiHighlight();
    const inactiveLayer = isWorld ? this.tutorialUiHighlight : this.tutorialWorldHighlight;

    inactiveLayer?.clear();
    inactiveLayer?.setVisible(false);
    activeLayer.setVisible(true);
    activeLayer.clear();
    activeLayer.fillStyle(0xffd166, 0.07);
    activeLayer.lineStyle(2, 0xffd166, 0.95);
    activeLayer.fillRoundedRect(
      target.x,
      target.y,
      target.width,
      target.height,
      target.radius || 4
    );
    activeLayer.strokeRoundedRect(
      target.x,
      target.y,
      target.width,
      target.height,
      target.radius || 4
    );

    if (this.tutorialHighlightKey === target.key && this.tutorialHighlightTween) return;

    this.tutorialHighlightTween?.stop();
    activeLayer.setAlpha(1);
    this.tutorialHighlightKey = target.key;
    this.tutorialHighlightTween = this.tweens.add({
      targets: activeLayer,
      alpha: 0.42,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getTutorialUiHighlight() {
    if (!this.tutorialUiHighlight) {
      this.tutorialUiHighlight = this.add.graphics().setScrollFactor(0);
      this.tutorialUiHighlight.setDepth(875);
      this.addToUI(this.tutorialUiHighlight);
    }
    return this.tutorialUiHighlight;
  }

  getTutorialWorldHighlight() {
    if (!this.tutorialWorldHighlight) {
      this.tutorialWorldHighlight = this.add.graphics();
      this.tutorialWorldHighlight.setDepth(300);
      this.addToWorld(this.tutorialWorldHighlight);
    }
    return this.tutorialWorldHighlight;
  }

  clearTutorialHighlights() {
    this.tutorialHighlightTween?.stop();
    this.tutorialHighlightTween = null;
    this.tutorialHighlightKey = null;
    this.tutorialUiHighlight?.clear();
    this.tutorialUiHighlight?.setVisible(false);
    this.tutorialWorldHighlight?.clear();
    this.tutorialWorldHighlight?.setVisible(false);
  }

  showPlacementCue(machineType) {
    if (!machineType) return;

    if (!this.placementCue) {
      this.placementCue = this.add.container(0, 0).setScrollFactor(0);
      this.placementCue.setDepth(11000);
      this.placementCueBg = this.add
        .rectangle(0, 0, 268, 50, 0x07111a, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, 0x88ccff, 0.85);
      this.placementCueText = this.add.text(12, 10, '', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#dfefff',
        lineSpacing: 3,
        wordWrap: { width: 244 },
      });
      this.placementCueText.setOrigin(0, 0);
      this.placementCue.add([this.placementCueBg, this.placementCueText]);
      this.addToUI(this.placementCue);
    }

    const label =
      machineType.pieceShortName || machineType.pieceName || machineType.name || machineType.id;
    const cost =
      typeof this.getMachinePlacementCost === 'function'
        ? this.getMachinePlacementCost(machineType)
        : machineType.placementCost || 0;
    const actionHint =
      this.inputMode === 'touch'
        ? 'Tap board to preview. Tap again to place.'
        : 'Click to place. R rotate. Esc cancel.';
    this.placementCueText.setText(`PLACING ${label}${cost ? `  $${cost}` : ''}\n${actionHint}`);
    this.placementCue.setVisible(true);
    this.setActionHint(
      `Placing ${label}`,
      cost ? `Costs $${cost}. Rotate with R, cancel with Esc.` : 'Rotate with R, cancel with Esc.',
      cost && this.money < cost ? 0xff8888 : 0x88ffcc
    );
    this.updatePlacementCuePosition();
    this.refreshTutorialPanel();
  }

  updatePlacementCuePosition() {
    if (!this.placementCue || !this.placementCue.visible) return;

    const width = 268;
    const margin = 10;
    const playAreaWidth = Math.max(0, this.scale.width - this.rightPanelWidth);
    const x = Phaser.Math.Clamp(
      playAreaWidth - width - margin,
      margin,
      this.scale.width - width - margin
    );
    this.placementCue.setPosition(x, margin);
  }

  hidePlacementCue() {
    if (this.placementCue) {
      this.placementCue.setVisible(false);
    }
    this.updateRoundUI();
    this.refreshTutorialPanel();
  }

  showPlacementHint(message, color = '#ffcc88') {
    const now = this.time?.now || 0;
    if (this.lastPlacementHintAt && now - this.lastPlacementHintAt < 450) return;
    this.lastPlacementHintAt = now;

    const pointer = this.input?.activePointer;
    const x = pointer?.x ?? this.scale.width / 2 - this.rightPanelWidth / 2;
    const y = pointer?.y ?? 140;

    if (this.placementHintText) {
      this.placementHintText.destroy();
    }

    this.placementHintText = this.add
      .text(x, y - 24, message, {
        fontFamily: 'Arial Black',
        fontSize: 14,
        color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.placementHintText.setDepth(11001);
    this.addToUI(this.placementHintText);

    this.tweens.add({
      targets: this.placementHintText,
      y: y - 48,
      alpha: 0,
      duration: 850,
      ease: 'Power2',
      onComplete: () => {
        this.placementHintText?.destroy();
        this.placementHintText = null;
      },
    });
  }

  setupInput() {
    // Camera Drag Controls
    this.input.mouse.disableContextMenu();

    this.input.on('pointerdown', (pointer) => {
      // Drag camera with Right Mouse Button or Middle Mouse Button or Left if holding Shift
      if (
        pointer.rightButtonDown() ||
        pointer.middleButtonDown() ||
        (pointer.leftButtonDown() &&
          this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT')))
      ) {
        this.isDraggingCamera = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.cameras.main.scrollX;
        this.cameraStartY = this.cameras.main.scrollY;
        this.input.setDefaultCursor('grabbing');
      }
    });

    this.input.on('pointermove', (pointer) => {
      this.updatePlacementCuePosition(pointer);

      if (this.isDraggingCamera) {
        this.hideBoardGimmickTooltip();
        const deltaX = (pointer.x - this.dragStartX) * 1.0;
        const deltaY = (pointer.y - this.dragStartY) * 1.0;
        this.cameras.main.scrollX = this.cameraStartX - deltaX;
        this.cameras.main.scrollY = this.cameraStartY - deltaY;
      } else {
        if (this.updateUpgradeHover(pointer)) {
          this.hideBoardGimmickTooltip();
          return;
        }
        this.updateBoardGimmickHover(pointer);
      }
    });

    this.input.on('pointerup', (_pointer) => {
      if (this.isDraggingCamera) {
        this.isDraggingCamera = false;
        this.input.setDefaultCursor('default');
      }
    });

    this.input.on('gameout', () => {
      this.hideBoardGimmickTooltip();
      this.clearUpgradeRowHover();
      this.hidePlacementCue();
    });
    const canvas = this.game?.canvas;
    if (canvas) {
      this.handleCanvasMouseLeave = () => {
        this.hideBoardGimmickTooltip();
        this.clearUpgradeRowHover();
      };
      this.handleDocumentMouseMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        const isOutsideCanvas =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (isOutsideCanvas) {
          this.hideBoardGimmickTooltip();
          this.clearUpgradeRowHover();
        }
      };
      canvas.addEventListener('mouseleave', this.handleCanvasMouseLeave);
      document.addEventListener('mousemove', this.handleDocumentMouseMove);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        canvas.removeEventListener('mouseleave', this.handleCanvasMouseLeave);
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
      });
    }

    // Add ESC key handler to clear selection
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.machineFactory) {
        this.machineFactory.clearSelection();
      }
    });

    // Handle rotation key press
    this.input.keyboard.on('keydown-R', () => {
      //console.log("[ROTATION KEY] R key pressed - DIRECT LOG");
      //console.log("[ROTATION KEY] R key pressed");
      try {
        // If we have a machine factory with a selected machine type, rotate it
        if (this.machineFactory && this.machineFactory.selectedMachineType) {
          //console.log("[ROTATION KEY] Rotating selected machine type");
          this.machineFactory.rotateMachine();
          return;
        }

        // For compatibility with existing code, still handle rotation for dragged machines
        let machineToRotate = null;

        // Check if there's a dragged object with the active pointer
        if (
          this.input.activePointer &&
          this.input.activePointer.isDragging &&
          this.input.activePointer.dragData &&
          this.input.activePointer.dragData.gameObject
        ) {
          machineToRotate = this.input.activePointer.dragData.gameObject;
        }

        if (machineToRotate) {
          // Debug rotation
          //console.log("[ROTATION] === ROTATION DEBUG ===");
          this.debugRotation('BEFORE', machineToRotate);

          try {
            // Normalize any negative rotation to the positive equivalent
            let currentRotation =
              machineToRotate.rotation !== undefined ? machineToRotate.rotation : 0;
            if (currentRotation < 0) {
              // Convert negative rotation to equivalent positive rotation in [0, 2π]
              currentRotation = (2 * Math.PI + (currentRotation % (2 * Math.PI))) % (2 * Math.PI);
              //console.log(`[ROTATION] Normalized negative rotation ${machineToRotate.rotation} to positive ${currentRotation}`);

              // Update the rotation to the normalized value
              machineToRotate.rotation = currentRotation;
            }

            // Get the current direction
            const oldDirection =
              machineToRotate.direction || this.getDirectionFromRotation(machineToRotate.rotation);

            // Calculate the new rotation - use exact values for cardinal directions
            let newRotation;
            let newDirection;

            // Determine the next rotation based on the current direction
            switch (oldDirection) {
              case 'right':
                newRotation = Math.PI / 2; // Exactly 90 degrees (down)
                newDirection = 'down';
                break;
              case 'down':
                newRotation = Math.PI; // Exactly 180 degrees (left)
                newDirection = 'left';
                break;
              case 'left':
                newRotation = (3 * Math.PI) / 2; // Exactly 270 degrees (up) - ALWAYS use 3*PI/2, never -PI/2
                newDirection = 'up';
                break;
              case 'up':
              default:
                newRotation = 0; // Exactly 0 degrees (right)
                newDirection = 'right';
                break;
            }

            //console.log(`[ROTATION] Rotating from ${oldDirection} to ${newDirection} (${newRotation.toFixed(4)} rad)`);

            // Set the new rotation
            machineToRotate.rotation = newRotation;

            // Update the direction directly instead of deriving it from rotation
            machineToRotate.direction = newDirection;

            // Update direction indicator if it exists
            if (machineToRotate.directionIndicator) {
              try {
                this.updateDirectionIndicator(machineToRotate, newDirection);
              } catch (indicatorError) {
                console.error('[ROTATION] Error updating direction indicator:', indicatorError);
              }
            }

            // Update input indicator if it exists
            if (machineToRotate.inputIndicator) {
              try {
                this.updateInputIndicator(machineToRotate);
              } catch (inputError) {
                console.error('[ROTATION] Error updating input indicator:', inputError);
              }
            }

            this.debugRotation('AFTER', machineToRotate);

            // Update the placement preview
            if (machineToRotate.shape) {
              try {
                this.updatePlacementPreview(machineToRotate);
              } catch (previewError) {
                console.error('[ROTATION] Error updating placement preview:', previewError);
              }
            }
          } catch (rotationError) {
            console.error('[ROTATION] Error rotating machine:', rotationError);
            // Try to reset rotation to a safe value
            try {
              machineToRotate.rotation = 0;
              machineToRotate.direction = 'right';
            } catch (_e) {
              // Ignore errors in recovery
            }
          }
        }
      } catch (error) {
        console.error('[ROTATION] Unhandled error in rotation handler:', error);
      }
    });

    // Add mouse click handler for machine placement
    this.input.on('pointerdown', (pointer) => {
      if (this.inputMode === 'touch') {
        // Touch mode: first tap shows preview, second tap confirms
        const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);
        if (!gridPos) return;
        if (!this.isPlacingMachine) {
          this.tryStartQuickConveyorPlacement(pointer, gridPos);
          return;
        }
        if (!this.isTouchPlacing) {
          // First tap: show preview
          this.isTouchPlacing = true;
          this.touchPreviewGridPos = gridPos;
          this.updatePlacementPreviewAt(gridPos);
          // Show a floating 'Place' button
          this.showPlaceButton(gridPos);
        } else {
          // Second tap: confirm placement
          this.tryPlaceMachineAt(this.touchPreviewGridPos);
          this.isTouchPlacing = false;
          this.touchPreviewGridPos = null;
          this.removePlaceButton();
        }
      } else {
        // Desktop mode: normal placement
        // CHECK UI BOUNDS - Block clicks on UI panels
        const uiTopY = this.scale.height * (1 - this.uiHeightRatio);
        const gameWidth = this.scale.width - this.rightPanelWidth;

        // Block if in right panel OR in bottom panel (left of right panel only)
        const isInRightPanel = pointer.x >= gameWidth;
        const isInBottomPanel = pointer.y > uiTopY && pointer.x < gameWidth;

        if (isInRightPanel || isInBottomPanel) {
          return;
        }

        if (this.isPrimaryPointer(pointer)) {
          const worldX = pointer.worldX;
          const worldY = pointer.worldY;

          // Priority 1: Pick up an existing placed machine.
          const selectedMachineType =
            this.machineFactory && this.machineFactory.selectedMachineType;
          const isPlacingMachine = selectedMachineType;

          if (!isPlacingMachine) {
            if (this.tryHandleBoardGimmickClick(pointer)) {
              return;
            }
            if (this.grid.isInBounds(worldX, worldY)) {
              const gridPos = this.grid.worldToGrid(worldX, worldY);
              if (gridPos) {
                const cell = this.grid.getCell(gridPos.x, gridPos.y);
                if (cell && cell.type === 'machine' && cell.object) {
                  if ((this.time?.now || 0) - (cell.object.placedAtTime || -Infinity) < 250) {
                    return;
                  }
                  if (cell.object.isFixedInfrastructure) {
                    this.showPlacementHint('Fixed board tunnel', '#83f7ff');
                    return;
                  }
                  this.pickUpPlacedMachine(cell.object);
                  return;
                } else {
                  if (this.tryStartQuickConveyorPlacement(pointer, gridPos)) {
                    return;
                  }
                }
              }
            }
          }

          // Priority 2: Handle machine placement if a machine type is selected
          if (isPlacingMachine) {
            // Ensure the click is within the factory grid for placement
            const isBoundsOk = this.grid.isInBounds(worldX, worldY);

            if (isBoundsOk) {
              this.machineFactory.handlePlaceMachine(pointer);
            } else {
              this.showPlacementHint('Place on the grid', '#ffcc88');
            }
          }
        }
      }
    });
    this.input.on('pointermove', (pointer) => {
      if (this.inputMode === 'touch' && this.isTouchPlacing) {
        const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);
        if (
          gridPos &&
          (!this.touchPreviewGridPos ||
            gridPos.x !== this.touchPreviewGridPos.x ||
            gridPos.y !== this.touchPreviewGridPos.y)
        ) {
          this.touchPreviewGridPos = gridPos;
          this.updatePlacementPreviewAt(gridPos);
          this.movePlaceButton(gridPos);
        }
      }
    });
  }

  isPrimaryPointer(pointer) {
    return (
      pointer?.button === 0 ||
      (pointer && typeof pointer.leftButtonDown === 'function' && pointer.leftButtonDown())
    );
  }

  tryStartQuickConveyorPlacement(pointer, gridPos) {
    if (this.paused || this.gameOver || this.isDraggingCamera) return false;
    if (!this.machineFactory || this.machineFactory.selectedMachineType) return false;
    if (!gridPos || !this.grid) return false;

    const cell = this.grid.getCell(gridPos.x, gridPos.y);
    const isFreeCell = cell && (cell.type === 'empty' || cell.type === 'board-tile');
    if (!isFreeCell) return false;

    if (typeof this.machineFactory.startQuickConveyorPlacement !== 'function') return false;
    return this.machineFactory.startQuickConveyorPlacement(pointer);
  }

  isPointerInWorldViewport(pointer) {
    const camera = this.cameras?.main;
    if (!pointer || !camera) return false;
    return (
      pointer.x >= camera.x &&
      pointer.x < camera.x + camera.width &&
      pointer.y >= camera.y &&
      pointer.y < camera.y + camera.height
    );
  }

  getPointerWorldPoint(pointer) {
    const camera = this.cameras?.main;
    if (!pointer || !camera) return null;

    if (typeof pointer.positionToCamera === 'function') {
      const point = pointer.positionToCamera(camera);
      return { x: point.x, y: point.y };
    }

    return {
      x: pointer.x + camera.scrollX,
      y: pointer.y + camera.scrollY,
    };
  }

  getBoardGimmickAtPointer(pointer) {
    if (!this.grid || !this.isPointerInWorldViewport(pointer)) return null;

    const worldPoint = this.getPointerWorldPoint(pointer);
    if (!worldPoint) return null;

    const gridWidth = this.grid.width * this.grid.cellSize;
    const gridHeight = this.grid.height * this.grid.cellSize;
    const startX = this.grid.x - gridWidth / 2;
    const startY = this.grid.y - gridHeight / 2;
    const endX = startX + gridWidth;
    const endY = startY + gridHeight;
    if (
      worldPoint.x < startX ||
      worldPoint.x >= endX ||
      worldPoint.y < startY ||
      worldPoint.y >= endY
    ) {
      return null;
    }

    const gridPos = this.grid.worldToGrid(worldPoint.x, worldPoint.y);
    const cell = this.grid.getCell(gridPos.x, gridPos.y);
    return cell?.type === 'board-tile' || cell?.type === 'board-blocker' ? { cell, gridPos } : null;
  }

  updateBoardGimmickHover(pointer) {
    const hovered = this.getBoardGimmickAtPointer(pointer);
    if (!hovered) {
      this.hideBoardGimmickTooltip();
      return;
    }

    const cellTypeKey = hovered.cell.tileType || hovered.cell.obstacleType || hovered.cell.type;
    const key = `${hovered.gridPos.x},${hovered.gridPos.y},${cellTypeKey}`;
    if (this.hoveredBoardGimmickKey !== key) {
      this.showBoardGimmickTooltip(hovered.cell, hovered.gridPos, pointer);
      this.hoveredBoardGimmickKey = key;
    } else {
      this.positionBoardGimmickTooltip(pointer);
    }
  }

  showBoardGimmickTooltip(cell, gridPos, pointer) {
    this.hideBoardGimmickTooltip();

    const style =
      cell.type === 'board-blocker'
        ? BOARD_OBSTACLE_STYLES[cell.obstacleType] || {}
        : BOARD_TILE_STYLES[cell.tileType] || {};
    const title = cell.name || style.name || cell.label || 'Board Cell';
    const description = cell.description || style.description || '';
    const effectLine =
      cell.type === 'board-blocker' && cell.obstacleType === BOARD_OBSTACLE_TYPES.SCRAP_DOOR
        ? `Click to open for $${this.getScrapDoorOpenCost(cell)} cash.`
        : cell.type === 'board-blocker'
          ? 'Blocks placement and routing.'
          : this.getBoardGimmickEffectLine(cell.tileType);
    const body = [description, effectLine].filter(Boolean).join('\n');
    const width = 270;
    const padding = 12;
    const accentColor = cell.borderColor || style.borderColor || 0xffffff;

    const tooltip = this.add.container(0, 0);
    tooltip.setDepth(12000);
    tooltip.setScrollFactor(0);

    const background = this.add
      .rectangle(0, 0, width, 92, 0x07111a, 0.94)
      .setOrigin(0)
      .setStrokeStyle(1, accentColor, 0.9);
    const accent = this.add.rectangle(0, 0, 5, 92, accentColor, 0.95).setOrigin(0);
    const titleText = this.add.text(padding, 9, title, {
      fontSize: '15px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: this.toCssColor(accentColor),
    });
    const bodyText = this.add.text(padding, 32, body, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#dbe8ef',
      lineSpacing: 3,
      wordWrap: { width: width - padding * 2 },
    });
    const coordText = this.add.text(width - padding, 10, `${gridPos.x},${gridPos.y}`, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#7f9bad',
    });
    coordText.setOrigin(1, 0);

    const height = Math.max(76, bodyText.y + bodyText.height + padding);
    background.height = height;
    accent.height = height;
    tooltip.tooltipWidth = width;
    tooltip.tooltipHeight = height;
    tooltip.add([background, accent, titleText, bodyText, coordText]);

    this.boardGimmickTooltip = tooltip;
    this.addToUI(tooltip);
    this.positionBoardGimmickTooltip(pointer);
  }

  positionBoardGimmickTooltip(pointer) {
    if (!this.boardGimmickTooltip || !pointer) return;

    const width = this.boardGimmickTooltip.tooltipWidth || 270;
    const height = this.boardGimmickTooltip.tooltipHeight || 90;
    const margin = 8;
    let x = pointer.x + 18;
    let y = pointer.y + 18;

    if (x + width + margin > this.scale.width) {
      x = pointer.x - width - 18;
    }
    if (y + height + margin > this.scale.height) {
      y = pointer.y - height - 18;
    }

    this.boardGimmickTooltip.setPosition(
      Phaser.Math.Clamp(x, margin, this.scale.width - width - margin),
      Phaser.Math.Clamp(y, margin, this.scale.height - height - margin)
    );
  }

  hideBoardGimmickTooltip() {
    if (this.boardGimmickTooltip) {
      this.boardGimmickTooltip.destroy();
      this.boardGimmickTooltip = null;
    }
    this.hoveredBoardGimmickKey = null;
  }

  getScrapDoorOpenCost(cell = null) {
    return Math.max(1, Math.floor(cell?.openCost || GAME_CONFIG.boardScrapDoorBudgetCost || 4));
  }

  tryHandleBoardGimmickClick(pointer) {
    if (this.runState !== 'BUILD_PHASE' || !this.isPrimaryPointer(pointer)) return false;

    const hovered = this.getBoardGimmickAtPointer(pointer);
    if (!hovered || hovered.cell?.type !== 'board-blocker') return false;
    if (hovered.cell.obstacleType !== BOARD_OBSTACLE_TYPES.SCRAP_DOOR) return false;

    const cost = this.getScrapDoorOpenCost(hovered.cell);
    if ((this.money || 0) < cost) {
      this.showPlacementHint(`Need $${cost}`, '#ff8888');
      return true;
    }

    this.addMoney(-cost, 'door');
    this.openBoardBlockerCell(hovered.gridPos.x, hovered.gridPos.y);
    this.hideBoardGimmickTooltip();
    this.grid?.drawGrid();
    this.showPlacementHint('Door opened', '#88ffcc');
    return true;
  }

  openBoardBlockerCell(x, y) {
    const key = `${x},${y}`;
    this.grid?.setCell(x, y, { type: 'empty' });
    if (this.currentRoundBoard?.blockers) {
      this.currentRoundBoard.blockers = this.currentRoundBoard.blockers.filter(
        (cell) => `${cell.x},${cell.y}` !== key
      );
    }
    this.roundBoardBlockers = (this.roundBoardBlockers || []).filter(
      (cell) => `${cell.x},${cell.y}` !== key
    );
  }

  getBoardGimmickEffectLine(tileType) {
    if (tileType === BOARD_TILE_TYPES.POWER) {
      const multiplier = GAME_CONFIG.boardPowerProcessingMultiplier || 0.78;
      return `Processing time x${multiplier.toFixed(2)}.`;
    }
    if (tileType === BOARD_TILE_TYPES.QUALITY) {
      const bonus = GAME_CONFIG.boardQualityLevelBonus || 1;
      return `Output level +${bonus}.`;
    }
    if (tileType === BOARD_TILE_TYPES.TAXED) {
      const surcharge = GAME_CONFIG.boardTaxedCellSurcharge || 3;
      return `Placement cost +$${surcharge} per covered cell.`;
    }
    return '';
  }

  toCssColor(color) {
    if (typeof color !== 'number') return '#ffffff';
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  getRotationInfoFromDirection(direction) {
    const directionToRotation = {
      right: { radians: 0, degrees: 0 },
      down: { radians: Math.PI / 2, degrees: 90 },
      left: { radians: Math.PI, degrees: 180 },
      up: { radians: (3 * Math.PI) / 2, degrees: 270 },
    };

    return directionToRotation[direction] || directionToRotation.right;
  }

  normalizeRotationValue(rotation) {
    const value = Number(rotation);
    if (isNaN(value)) {
      return null;
    }

    if (Math.abs(value) <= Math.PI * 2 + 0.01) {
      const degrees = Math.round((value * 180) / Math.PI);
      return {
        radians: value,
        degrees: ((degrees % 360) + 360) % 360,
      };
    }

    const degrees = Math.round(value);
    return {
      radians: (degrees * Math.PI) / 180,
      degrees: ((degrees % 360) + 360) % 360,
    };
  }

  getPlacementOrientation(machine) {
    const source = machine?.machineType || machine || {};

    if (source.rotationDegrees !== undefined) {
      const rotation = this.normalizeRotationValue(Number(source.rotationDegrees));
      if (rotation) {
        return {
          ...rotation,
          direction: this.getDirectionFromRotation(rotation.radians),
        };
      }
    }

    if (source.rotation !== undefined) {
      const rotation = this.normalizeRotationValue(source.rotation);
      if (rotation) {
        return {
          ...rotation,
          direction: this.getDirectionFromRotation(rotation.radians),
        };
      }
    }

    if (machine?.rotationDegrees !== undefined && Number(machine.rotationDegrees) !== 0) {
      const rotation = this.normalizeRotationValue(Number(machine.rotationDegrees));
      if (rotation) {
        return {
          ...rotation,
          direction: this.getDirectionFromRotation(rotation.radians),
        };
      }
    }

    if (machine?.rotation !== undefined && Number(machine.rotation) !== 0) {
      const rotation = this.normalizeRotationValue(machine.rotation);
      if (rotation) {
        return {
          ...rotation,
          direction: this.getDirectionFromRotation(rotation.radians),
        };
      }
    }

    const direction =
      source.direction ||
      source.defaultDirection ||
      machine?.direction ||
      machine?.defaultDirection ||
      'right';
    const rotation = this.getRotationInfoFromDirection(direction);
    return {
      ...rotation,
      direction,
    };
  }

  // Create a visual preview of where the machine will be placed
  createPlacementPreview(machine) {
    // Create a graphics object for the preview
    this.placementPreview = this.add.graphics();
    this.addToWorld(this.placementPreview);

    // Add a debug marker at the preview position to help track it
    /*this.placementPreviewMarker = this.add.graphics();
        this.placementPreviewMarker.lineStyle(2, 0xff0000);
        this.placementPreviewMarker.strokeCircle(0, 0, 5);
        this.placementPreviewMarker.lineStyle(2, 0x00ff00);
        this.placementPreviewMarker.strokeCircle(0, 0, 10);
        this.placementPreviewMarker.setPosition(0, 0); // Set initial position*/

    // If no machine is provided, try to use the selectedMachine property
    if (!machine) {
      machine = this.selectedMachine;
      if (!machine) {
        //console.log('[PREVIEW] No machine to preview, creating empty preview');
        return;
      }
    }

    // Update the preview with the available machine
    this.updatePlacementPreview(machine);

    // const machineName = machine.id || (machine.machineType ? machine.machineType.id : 'unknown');
    // console.log(`[PREVIEW] Created placement preview for ${machineName}`);
  }

  /**
   * Updates the placement preview graphics
   */
  updatePlacementPreview(machine) {
    //console.log('[PLACEMENT PREVIEW] updatePlacementPreview called - DIRECT LOG');

    // If placementPreview doesn't exist, create it first
    if (!this.placementPreview) {
      //console.log('[PLACEMENT PREVIEW] Creating new placement preview graphics');
      this.createPlacementPreview(machine);
      return; // createPlacementPreview will call updatePlacementPreview again
    }

    // Clear existing preview graphics
    this.placementPreview.clear();
    this.hidePlacementTraitPreview();
    this.hidePlacementOutputMarker();

    // If no machine provided, try to use the selectedMachine property
    if (!machine) {
      machine = this.selectedMachine;
    }

    // Still no machine? Early return
    if (!machine) {
      //console.log('[PLACEMENT PREVIEW] No machine to preview');
      return;
    }

    // Make sure the machine has a shape, and it's an array
    if (!machine.shape || !Array.isArray(machine.shape)) {
      //console.log('[PLACEMENT PREVIEW] Machine shape is missing or invalid, using default 1x1 shape');
      machine.shape = [[1]];
    }

    const orientation = this.getPlacementOrientation(machine);

    // Get the rotated shape of the machine
    let rotatedShape;
    try {
      // Prepare rotation value - handle both radians and degrees
      let _rotationValue;

      // If we have a numeric rotation
      if (typeof machine.rotation === 'number') {
        // Check if it's in radians (0-2π) or degrees (0-360)
        if (machine.rotation < 10) {
          // Likely radians
          //console.log(`[PLACEMENT PREVIEW] Rotation value appears to be in radians: ${machine.rotation}`);
          // Convert to degrees for grid
          _rotationValue = Math.round((machine.rotation * 180) / Math.PI);
        } else {
          // Likely degrees
          //console.log(`[PLACEMENT PREVIEW] Rotation value appears to be in degrees: ${machine.rotation}`);
          _rotationValue = Math.round(machine.rotation);
        }
      } else {
        // Use direction string if no rotation
        _rotationValue = machine.direction || 'right';
      }

      rotatedShape = this.grid.getRotatedShape(machine.shape, orientation.direction);
    } catch (error) {
      console.error('[PLACEMENT PREVIEW] Error getting rotated shape:', error);
      // If we can't get the rotated shape, use the original shape as fallback
      rotatedShape = machine.shape;
    }

    // Get the grid position from the pointer position
    // Get the grid position from the pointer position
    const worldPoint = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );
    const gridPos = this.grid.worldToGrid(worldPoint.x, worldPoint.y);
    if (!gridPos) {
      return; // Pointer is outside the grid
    }

    // Get the direction from the selected orientation
    const direction = orientation.direction;

    const machineId = machine.id || (machine.machineType ? machine.machineType.id : 'unknown');
    const isLogisticsBeltPiece =
      machine.isLogisticsBeltPiece === true || machine.machineType?.isLogisticsBeltPiece === true;
    const usesOperatorOutputMarker =
      machine.machineFamily === 'operator' ||
      machine.category === 'operator' ||
      machine.machineType?.machineFamily === 'operator' ||
      machine.machineType?.category === 'operator' ||
      Boolean(machine.arithmeticOperation || machine.machineType?.arithmeticOperation) ||
      isProcessingPieceBodyId(machineId);
    const painterPreviewColor =
      machineId === 'painter'
        ? getItemColorHex(getPainterPaintColorKey(direction), 0x3f8cff)
        : null;

    // Create a minimal machineType object for canPlaceMachine if it doesn't exist
    const machineTypeForCheck = {
      shape: machine.shape,
      id: machineId,
      direction: direction,
    };
    const replacementInfo = this.findProcessorReplacement(machine, gridPos.x, gridPos.y, direction);
    const previewGridPos = replacementInfo
      ? { x: replacementInfo.gridX, y: replacementInfo.gridY }
      : gridPos;

    // Check if we can place the machine here
    let canPlace = this.grid.canPlaceMachine(
      machineTypeForCheck,
      previewGridPos.x,
      previewGridPos.y,
      direction
    );
    if (!canPlace && replacementInfo) {
      canPlace = true;
    }

    // Get the world position of the center of the grid cell
    const centerWorldPos = this.grid.gridToWorld(previewGridPos.x, previewGridPos.y);

    // Update the placement preview marker position
    if (this.placementPreviewMarker) {
      this.placementPreviewMarker.clear();
      this.placementPreviewMarker.lineStyle(2, 0xff0000);
      this.placementPreviewMarker.strokeCircle(0, 0, 5);
      this.placementPreviewMarker.lineStyle(2, 0x00ff00);
      this.placementPreviewMarker.strokeCircle(0, 0, 10);
      this.placementPreviewMarker.setPosition(centerWorldPos.x, centerWorldPos.y);
    }

    // Determine input and output positions based on direction
    let inputPos = { x: -1, y: -1 };
    let outputPos = { x: -1, y: -1 };

    if (direction !== 'none') {
      // Get the machine constructor from the registry
      let machineConstructor = null;
      if (
        this.machineFactory &&
        this.machineFactory.machineRegistry &&
        typeof this.machineFactory.machineRegistry.machineTypes === 'object'
      ) {
        machineConstructor = this.machineFactory.machineRegistry.machineTypes.get(machineId);
      }

      if (machine.ioByDirection?.[direction]) {
        inputPos = machine.ioByDirection[direction].inputPos;
        outputPos = machine.ioByDirection[direction].outputPos;
      }
      // Use the getIOPositionsForDirection method from the constructor if available
      else if (
        machineConstructor &&
        typeof machineConstructor.getIOPositionsForDirection === 'function'
      ) {
        // Get positions from the machine's own implementation
        const ioPositions = machineConstructor.getIOPositionsForDirection(machineId, direction);
        inputPos = ioPositions.inputPos;
        outputPos = ioPositions.outputPos;
        console.log(
          `[PREVIEW] Using ${machineId}'s getIOPositionsForDirection: in(${inputPos.x},${inputPos.y}), out(${outputPos.x},${outputPos.y})`
        );
      }
      // Otherwise, fallback to BaseMachine's implementation
      else if (typeof BaseMachine !== 'undefined' && BaseMachine.getIOPositionsForDirection) {
        const ioPositions = BaseMachine.getIOPositionsForDirection(machineId, direction);
        inputPos = ioPositions.inputPos;
        outputPos = ioPositions.outputPos;
        console.log(
          `[PREVIEW] Using BaseMachine.getIOPositionsForDirection for ${machineId}: in(${inputPos.x},${inputPos.y}), out(${outputPos.x},${outputPos.y})`
        );
      }
      // If neither method is available, use the backup hardcoded positions (should rarely happen)
      else {
        console.warn(
          `[PREVIEW] getIOPositionsForDirection not found for ${machineId}. Using fallbacks.`
        );
        switch (direction) {
          case 'right':
            // Input on left side, output on right side
            inputPos = { x: 0, y: Math.floor(rotatedShape.length / 2) };
            outputPos = { x: rotatedShape[0].length - 1, y: Math.floor(rotatedShape.length / 2) };
            break;
          case 'down':
            // Input on top side, output on bottom side
            inputPos = { x: Math.floor(rotatedShape[0].length / 2), y: 0 };
            outputPos = { x: Math.floor(rotatedShape[0].length / 2), y: rotatedShape.length - 1 };
            break;
          case 'left':
            // Input on right side, output on left side
            inputPos = { x: rotatedShape[0].length - 1, y: Math.floor(rotatedShape.length / 2) };
            outputPos = { x: 0, y: Math.floor(rotatedShape.length / 2) };
            break;
          case 'up':
            // Input on bottom side, output on top side
            inputPos = { x: Math.floor(rotatedShape[0].length / 2), y: rotatedShape.length - 1 };
            outputPos = { x: Math.floor(rotatedShape[0].length / 2), y: 0 };
            break;
        }
      }
    }
    if (isLogisticsBeltPiece) {
      inputPos = { x: -1, y: -1 };
      outputPos = { x: -1, y: -1 };
    }

    // Use direct positioning instead of offsets
    // Draw each cell at its exact grid position
    for (let y = 0; y < rotatedShape.length; y++) {
      for (let x = 0; x < rotatedShape[y].length; x++) {
        // Only draw cells with value 1 (occupied)
        if (rotatedShape[y][x] === 1) {
          // *** MODIFIED: Calculate grid coordinates using top-left anchor logic ***
          const cellGridX = previewGridPos.x + x;
          const cellGridY = previewGridPos.y + y;

          // *** REMOVED Center-based offset logic ***
          // const offsetX = Math.floor(rotatedShape[0].length / 2);
          // const offsetY = Math.floor(rotatedShape.length / 2);
          // const cellGridX = Math.floor(gridPos.x + (x - offsetX));
          // const cellGridY = Math.floor(gridPos.y + (y - offsetY));

          // *** MODIFIED: Get world coordinates for the top-left of this exact cell ***
          const cellWorldTopLeftPos = this.grid.gridToWorldTopLeft(cellGridX, cellGridY);

          // If the cell is out of bounds, gridToWorldTopLeft returns null
          if (!cellWorldTopLeftPos) {
            continue; // Don't draw parts that are out of bounds
          }

          // Determine cell color based on position in the shape
          let cellColor = MACHINE_COLORS[machine.id] || 0x44ff44; // Unique color for this machine type
          if (painterPreviewColor != null) {
            cellColor = painterPreviewColor;
          }

          // Draw the cell directly at its world position
          if (replacementInfo) {
            cellColor = 0xffd966;
          }
          this.placementPreview.fillStyle(cellColor, canPlace ? 0.7 : 0.3);
          this.placementPreview.fillRect(
            cellWorldTopLeftPos.x + 2, // Use top-left X + margin
            cellWorldTopLeftPos.y + 2, // Use top-left Y + margin
            this.grid.cellSize - 4, // Account for 2px margin on each side
            this.grid.cellSize - 4 // Account for 2px margin on each side
          );

          // --- Adjust Input/Output indicator positioning ---
          // Get the center of the current cell for placing circles/text
          const cellWorldCenterPos = this.grid.gridToWorld(cellGridX, cellGridY);

          // If this is an input cell, draw 'IN' text
          if (x === inputPos.x && y === inputPos.y) {
            this.placementPreview.lineStyle(1, 0xffffff, 0.8);
            this.placementPreview.fillStyle(0x000000, 0.5);
            // *** MODIFIED: Use cell center position ***
            this.placementPreview.fillCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
            this.placementPreview.strokeCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
          }

          // If this is an output cell, draw the relevant output marker
          if (x === outputPos.x && y === outputPos.y) {
            const cx = cellWorldCenterPos.x;
            const cy = cellWorldCenterPos.y;

            if (usesOperatorOutputMarker) {
              this.drawPlacementOperatorOutputMarker(cx, cy, canPlace);
            } else {
              const arrowSize = this.grid.cellSize * 0.3;

              this.placementPreview.lineStyle(1, 0xffffff, 1);
              this.placementPreview.fillStyle(0xffffff, 1);

              this.placementPreview.beginPath();

              // Draw arrow based on direction
              switch (direction) {
                case 'right':
                  this.placementPreview.moveTo(cx + arrowSize * 0.75, cy);
                  this.placementPreview.lineTo(cx - arrowSize * 0.75, cy - arrowSize * 0.7);
                  this.placementPreview.lineTo(cx - arrowSize * 0.75, cy + arrowSize * 0.7);
                  break;
                case 'down':
                  this.placementPreview.moveTo(cx, cy + arrowSize * 0.75);
                  this.placementPreview.lineTo(cx + arrowSize * 0.7, cy - arrowSize * 0.75);
                  this.placementPreview.lineTo(cx - arrowSize * 0.7, cy - arrowSize * 0.75);
                  break;
                case 'left':
                  this.placementPreview.moveTo(cx - arrowSize * 0.75, cy);
                  this.placementPreview.lineTo(cx + arrowSize * 0.75, cy + arrowSize * 0.7);
                  this.placementPreview.lineTo(cx + arrowSize * 0.75, cy - arrowSize * 0.7);
                  break;
                case 'up':
                  this.placementPreview.moveTo(cx, cy - arrowSize * 0.75);
                  this.placementPreview.lineTo(cx - arrowSize * 0.7, cy + arrowSize * 0.75);
                  this.placementPreview.lineTo(cx + arrowSize * 0.7, cy + arrowSize * 0.75);
                  break;
                default:
                  // Default right
                  this.placementPreview.moveTo(cx + arrowSize * 0.75, cy);
                  this.placementPreview.lineTo(cx - arrowSize * 0.75, cy - arrowSize * 0.7);
                  this.placementPreview.lineTo(cx - arrowSize * 0.75, cy + arrowSize * 0.7);
              }

              this.placementPreview.closePath();
              this.placementPreview.fillPath();
              this.placementPreview.strokePath();
            }
          }

          if (painterPreviewColor != null) {
            this.drawPainterPlacementItemPreview(
              cellWorldCenterPos,
              direction,
              painterPreviewColor,
              canPlace
            );
          }
        }
      }
    }

    if (isLogisticsBeltPiece) {
      this.drawLogisticsBeltPlacementPreview(machine, previewGridPos, direction, canPlace);
    }

    this.drawPlacementTraitPreview(machine, previewGridPos, rotatedShape, canPlace);

    // Draw a marker at the center position
    this.placementPreview.lineStyle(1, 0xffffff, 0.8);
    this.placementPreview.strokeCircle(centerWorldPos.x, centerWorldPos.y, 3);

    // Draw direction indicator if we have a direction
    if (direction !== 'none' && !isLogisticsBeltPiece && !usesOperatorOutputMarker) {
      const indicatorColor = 0xff9500; // Orange
      const indicatorSize = this.grid.cellSize / 3;

      // Draw a triangle pointing in the direction
      this.placementPreview.lineStyle(2, indicatorColor, 0.9);
      this.placementPreview.fillStyle(indicatorColor, 0.7);

      // Calculate indicator position offset from center
      let indicatorX = centerWorldPos.x;
      let indicatorY = centerWorldPos.y;

      // Create a triangle path for the direction indicator
      const trianglePath = [];

      switch (direction) {
        case 'right':
          trianglePath.push({ x: indicatorX + indicatorSize, y: indicatorY });
          trianglePath.push({
            x: indicatorX - indicatorSize / 2,
            y: indicatorY - indicatorSize / 2,
          });
          trianglePath.push({
            x: indicatorX - indicatorSize / 2,
            y: indicatorY + indicatorSize / 2,
          });
          break;
        case 'down':
          trianglePath.push({ x: indicatorX, y: indicatorY + indicatorSize });
          trianglePath.push({
            x: indicatorX - indicatorSize / 2,
            y: indicatorY - indicatorSize / 2,
          });
          trianglePath.push({
            x: indicatorX + indicatorSize / 2,
            y: indicatorY - indicatorSize / 2,
          });
          break;
        case 'left':
          trianglePath.push({ x: indicatorX - indicatorSize, y: indicatorY });
          trianglePath.push({
            x: indicatorX + indicatorSize / 2,
            y: indicatorY - indicatorSize / 2,
          });
          trianglePath.push({
            x: indicatorX + indicatorSize / 2,
            y: indicatorY + indicatorSize / 2,
          });
          break;
        case 'up':
          trianglePath.push({ x: indicatorX, y: indicatorY - indicatorSize });
          trianglePath.push({
            x: indicatorX - indicatorSize / 2,
            y: indicatorY + indicatorSize / 2,
          });
          trianglePath.push({
            x: indicatorX + indicatorSize / 2,
            y: indicatorY + indicatorSize / 2,
          });
          break;
      }

      // Draw the triangle
      if (trianglePath.length === 3) {
        this.placementPreview.beginPath();
        this.placementPreview.moveTo(trianglePath[0].x, trianglePath[0].y);
        this.placementPreview.lineTo(trianglePath[1].x, trianglePath[1].y);
        this.placementPreview.lineTo(trianglePath[2].x, trianglePath[2].y);
        this.placementPreview.closePath();
        this.placementPreview.fillPath();
        this.placementPreview.strokePath();
      }
    }
  }

  drawPainterPlacementItemPreview(cellWorldCenterPos, direction, paintColor, canPlace) {
    if (!this.placementPreview || !cellWorldCenterPos || paintColor == null) return;

    const directionVectors = {
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      up: { x: 0, y: -1 },
    };
    const vector = directionVectors[direction] || directionVectors.right;
    const travelOffset = this.grid.cellSize * 0.24;
    const radius = Math.max(4, this.grid.cellSize * 0.16);
    const alpha = canPlace ? 0.95 : 0.45;

    const inputX = cellWorldCenterPos.x - vector.x * travelOffset;
    const inputY = cellWorldCenterPos.y - vector.y * travelOffset;
    const outputX = cellWorldCenterPos.x + vector.x * travelOffset;
    const outputY = cellWorldCenterPos.y + vector.y * travelOffset;

    this.placementPreview.lineStyle(2, 0xffffff, alpha * 0.55);
    this.placementPreview.lineBetween(inputX, inputY, outputX, outputY);

    this.placementPreview.fillStyle(0x101820, alpha * 0.9);
    this.placementPreview.fillCircle(inputX, inputY, radius * 0.78);
    this.placementPreview.strokeCircle(inputX, inputY, radius * 0.78);

    this.placementPreview.fillStyle(paintColor, alpha);
    this.placementPreview.fillCircle(outputX, outputY, radius);
    this.placementPreview.lineStyle(1.5, 0xffffff, alpha);
    this.placementPreview.strokeCircle(outputX, outputY, radius);
  }

  drawLogisticsBeltPlacementPreview(machine, gridPos, direction, canPlace) {
    if (!this.placementPreview || !this.grid || !machine || !gridPos) return;

    const machineType = machine.machineType || machine;
    const beltCells = this.getRotatedLogisticsBeltCells(machineType, direction);
    if (beltCells.length === 0) return;

    const alpha = canPlace ? 0.95 : 0.45;
    const cellSize = this.grid.cellSize;
    const isTunnel = machineType.isLogisticsTunnelPiece === true;
    const pathColor = isTunnel ? 0xb56cff : 0x83f7ff;
    const arrowColor = isTunnel ? 0xd9b6ff : 0xfff3bf;
    const getCenter = (cell) => this.grid.gridToWorld(gridPos.x + cell.x, gridPos.y + cell.y);

    this.placementPreview.lineStyle(Math.max(5, cellSize * 0.2), 0x07111a, alpha * 0.9);
    for (let i = 0; i < beltCells.length - 1; i++) {
      const from = getCenter(beltCells[i]);
      const to = getCenter(beltCells[i + 1]);
      this.placementPreview.lineBetween(from.x, from.y, to.x, to.y);
    }

    this.placementPreview.lineStyle(Math.max(3, cellSize * 0.12), pathColor, alpha);
    for (let i = 0; i < beltCells.length - 1; i++) {
      const from = getCenter(beltCells[i]);
      const to = getCenter(beltCells[i + 1]);
      this.placementPreview.lineBetween(from.x, from.y, to.x, to.y);
    }

    beltCells.forEach((cell, index) => {
      const nextCell = beltCells[index + 1] || null;
      const prevCell = beltCells[index - 1] || null;
      const beltDirection = this.getDirectionBetweenCells(
        cell,
        nextCell,
        nextCell ? null : prevCell
      );
      const center = getCenter(cell);
      this.drawPlacementArrow(center.x, center.y, beltDirection, cellSize * 0.3, arrowColor, alpha);
    });

    const start = getCenter(beltCells[0]);
    const end = getCenter(beltCells[beltCells.length - 1]);
    this.placementPreview.fillStyle(0x101820, alpha);
    this.placementPreview.lineStyle(1.5, pathColor, alpha);
    this.placementPreview.fillCircle(start.x, start.y, cellSize * 0.16);
    this.placementPreview.strokeCircle(start.x, start.y, cellSize * 0.16);
    this.placementPreview.lineStyle(2, arrowColor, alpha);
    this.placementPreview.strokeCircle(end.x, end.y, cellSize * 0.22);
  }

  drawPlacementArrow(x, y, direction, size, color = 0xffffff, alpha = 1) {
    let angle = 0;
    switch (direction) {
      case 'down':
        angle = Math.PI / 2;
        break;
      case 'left':
        angle = Math.PI;
        break;
      case 'up':
        angle = (3 * Math.PI) / 2;
        break;
      case 'right':
      default:
        angle = 0;
        break;
    }

    const tip = { x: x + Math.cos(angle) * size, y: y + Math.sin(angle) * size };
    const left = {
      x: x + Math.cos(angle + 2.55) * size,
      y: y + Math.sin(angle + 2.55) * size,
    };
    const right = {
      x: x + Math.cos(angle - 2.55) * size,
      y: y + Math.sin(angle - 2.55) * size,
    };

    this.placementPreview.lineStyle(1.5, 0x07111a, alpha);
    this.placementPreview.fillStyle(color, alpha);
    this.placementPreview.beginPath();
    this.placementPreview.moveTo(tip.x, tip.y);
    this.placementPreview.lineTo(left.x, left.y);
    this.placementPreview.lineTo(right.x, right.y);
    this.placementPreview.closePath();
    this.placementPreview.fillPath();
    this.placementPreview.strokePath();
  }

  getPreviewTraitId(machine) {
    if (!machine) return null;
    return machine.trait || (machine.machineType && machine.machineType.trait) || null;
  }

  getPreviewOutputLevel(machine) {
    if (!machine) return null;
    return (
      machine.outputLevel ||
      machine.previewOutputLevel ||
      (machine.machineType &&
        (machine.machineType.outputLevel || machine.machineType.previewOutputLevel)) ||
      null
    );
  }

  drawPlacementTraitPreview(machine, gridPos, rotatedShape, canPlace) {
    const traitId = this.getPreviewTraitId(machine);
    if (!traitId || !this.grid || !gridPos || !rotatedShape || rotatedShape.length === 0) return;

    const traitDef = getTraitById(traitId);
    if (!traitDef || !rotatedShape[0]) return;

    const cellSize = this.grid.cellSize;
    const bandColor = getTraitBandColor(traitId);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;
    const topLeft = this.grid.gridToWorldTopLeft(gridPos.x, gridPos.y);
    if (!topLeft) return;

    const width = shapeWidth * cellSize;
    const height = shapeHeight * cellSize;
    const alpha = canPlace ? 0.95 : 0.55;

    this.placementPreview.lineStyle(3, bandColor, alpha);
    this.placementPreview.strokeRect(topLeft.x + 1, topLeft.y + 1, width - 2, height - 2);

    const iconX = topLeft.x + width - cellSize * 0.25;
    const iconY = topLeft.y + cellSize * 0.25;
    this.placementPreview.fillStyle(bandColor, canPlace ? 0.95 : 0.6);
    this.placementPreview.lineStyle(1, 0xffffff, 0.9);
    this.placementPreview.fillCircle(iconX, iconY, 8);
    this.placementPreview.strokeCircle(iconX, iconY, 8);

    this.showPlacementTraitLabel(traitDef, iconX, iconY, topLeft.x + width / 2, topLeft.y + height);

    if (traitDef.category === TRAIT_CATEGORIES.ADJACENCY) {
      this.drawPlacementAdjacencyHints(machine, gridPos, rotatedShape, traitId, bandColor);
    }
  }

  showPlacementTraitLabel(traitDef, iconX, iconY, labelX, labelY) {
    if (!this.placementTraitInitial) {
      this.placementTraitInitial = this.add
        .text(iconX, iconY, '', {
          fontFamily: 'Arial',
          fontSize: 11,
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(1000);
      this.addToWorld(this.placementTraitInitial);
    }

    if (!this.placementTraitLabel) {
      this.placementTraitLabel = this.add
        .text(labelX, labelY + 4, '', {
          fontFamily: 'Arial',
          fontSize: 11,
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.65)',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 0)
        .setDepth(1000);
      this.addToWorld(this.placementTraitLabel);
    }

    this.placementTraitInitial
      .setText(traitDef.name.charAt(0).toUpperCase())
      .setPosition(iconX, iconY)
      .setVisible(true);

    this.placementTraitLabel.setText(traitDef.name);

    const visibleWorld = this.cameras.main.worldView;
    const padding = 6;
    const targetY = labelY + 4;
    const minX = visibleWorld.x + this.placementTraitLabel.width / 2 + padding;
    const maxX = visibleWorld.x + visibleWorld.width - this.placementTraitLabel.width / 2 - padding;
    const minY = visibleWorld.y + padding;
    const maxY = visibleWorld.y + visibleWorld.height - this.placementTraitLabel.height - padding;
    const clampedLabelX = Phaser.Math.Clamp(labelX, minX, Math.max(minX, maxX));
    const clampedLabelY = Phaser.Math.Clamp(targetY, minY, Math.max(minY, maxY));

    this.placementTraitLabel.setPosition(clampedLabelX, clampedLabelY).setVisible(true);
  }

  hidePlacementTraitPreview() {
    if (this.placementTraitInitial) {
      this.placementTraitInitial.setVisible(false);
    }
    if (this.placementTraitLabel) {
      this.placementTraitLabel.setVisible(false);
    }
  }

  destroyPlacementTraitPreview() {
    if (this.placementTraitInitial) {
      this.placementTraitInitial.destroy();
      this.placementTraitInitial = null;
    }
    if (this.placementTraitLabel) {
      this.placementTraitLabel.destroy();
      this.placementTraitLabel = null;
    }
  }

  drawPlacementOperatorOutputMarker(x, y, canPlace) {
    if (!this.placementPreview || !this.grid) return;

    const alpha = canPlace ? 0.95 : 0.55;
    const cellSize = this.grid.cellSize;
    this.placementPreview.lineStyle(3, 0x83f7ff, alpha);
    this.placementPreview.strokeRect(
      x - cellSize / 2 + 3,
      y - cellSize / 2 + 3,
      cellSize - 6,
      cellSize - 6
    );

    if (!this.placementOutputMarkerLabel) {
      this.placementOutputMarkerLabel = this.add
        .text(x, y, 'OUT', {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: 7,
          color: '#efffff',
          stroke: '#05090d',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(1000);
      this.addToWorld(this.placementOutputMarkerLabel);
    }

    this.placementOutputMarkerLabel
      .setText('OUT')
      .setPosition(x, y + cellSize * 0.31)
      .setAlpha(alpha)
      .setVisible(true);
  }

  hidePlacementOutputMarker() {
    if (this.placementOutputMarkerLabel) {
      this.placementOutputMarkerLabel.setVisible(false);
    }
  }

  destroyPlacementOutputMarker() {
    if (this.placementOutputMarkerLabel) {
      this.placementOutputMarkerLabel.destroy();
      this.placementOutputMarkerLabel = null;
    }
  }

  drawPlacementAdjacencyHints(_machine, gridPos, rotatedShape, traitId, bandColor) {
    const candidateCells = this.getPreviewAdjacentCells(gridPos, rotatedShape);

    for (const cell of candidateCells) {
      const topLeft = this.grid.gridToWorldTopLeft(cell.x, cell.y);
      if (!topLeft) continue;

      const occupant = this.grid.getCell(cell.x, cell.y);
      const neighborMachine = occupant && occupant.type === 'machine' ? occupant.object : null;
      let isActiveTarget = false;

      if (traitId === 'conductor') {
        isActiveTarget = Boolean(neighborMachine && neighborMachine.setProcessingTimeModifier);
      }

      const alpha = isActiveTarget ? 0.95 : 0.25;
      const radius = isActiveTarget ? this.grid.cellSize * 0.42 : this.grid.cellSize * 0.34;
      const center = this.grid.gridToWorld(cell.x, cell.y);

      this.placementPreview.lineStyle(isActiveTarget ? 3 : 1, bandColor, alpha);
      this.placementPreview.strokeCircle(center.x, center.y, radius);

      if (isActiveTarget) {
        this.placementPreview.fillStyle(bandColor, 0.12);
        this.placementPreview.fillRect(
          topLeft.x + 3,
          topLeft.y + 3,
          this.grid.cellSize - 6,
          this.grid.cellSize - 6
        );
      }
    }
  }

  getPreviewAdjacentCells(gridPos, rotatedShape) {
    const occupied = new Set();
    const result = new Map();
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (let y = 0; y < rotatedShape.length; y++) {
      for (let x = 0; x < rotatedShape[y].length; x++) {
        if (rotatedShape[y][x] !== 1) continue;
        const gx = gridPos.x + x;
        const gy = gridPos.y + y;
        occupied.add(`${gx},${gy}`);
      }
    }

    for (const key of occupied) {
      const [gx, gy] = key.split(',').map(Number);
      for (const dir of directions) {
        const nx = gx + dir.x;
        const ny = gy + dir.y;
        const nKey = `${nx},${ny}`;
        if (occupied.has(nKey)) continue;
        if (nx < 0 || nx >= this.grid.width || ny < 0 || ny >= this.grid.height) continue;
        result.set(nKey, { x: nx, y: ny });
      }
    }

    return Array.from(result.values());
  }

  // Remove the placement preview
  removePlacementPreview() {
    try {
      if (this.placementPreview) {
        this.placementPreview.clear();
        this.placementPreview.destroy();
        this.placementPreview = null;
      }

      if (this.placementPreviewMarker) {
        this.placementPreviewMarker.clear();
        this.placementPreviewMarker.destroy();
        this.placementPreviewMarker = null;
      }

      this.destroyPlacementTraitPreview();
      this.destroyPlacementOutputMarker();
    } catch (error) {
      console.error('Error removing placement preview:', error);
      // Make sure we still set these to null to avoid further issues
      this.placementPreview = null;
      this.placementPreviewMarker = null;
      this.destroyPlacementTraitPreview();
      this.destroyPlacementOutputMarker();
    }
  }

  // Alias for consistency
  clearPlacementPreview() {
    this.removePlacementPreview();
  }

  updateConveyorPathPreview(path, machineType) {
    if (!this.placementPreview) {
      this.placementPreview = this.add.graphics();
      this.addToWorld(this.placementPreview);
    }

    this.placementPreview.clear();
    this.hidePlacementOutputMarker();

    if (!path || path.length === 0) return;

    // Determine direction for each segment
    for (let i = 0; i < path.length; i++) {
      const currentPos = path[i];
      let direction = 'right'; // Default
      let rotation = 0;

      // logic to determine direction (same as in MachineFactory, but for visual)
      if (i < path.length - 1) {
        const nextPos = path[i + 1];
        if (nextPos.x > currentPos.x) direction = 'right';
        else if (nextPos.x < currentPos.x) direction = 'left';
        else if (nextPos.y > currentPos.y) direction = 'down';
        else if (nextPos.y < currentPos.y) direction = 'up';
      } else {
        // Last one
        if (i > 0) {
          const prevPos = path[i - 1];
          if (currentPos.x > prevPos.x) direction = 'right';
          else if (currentPos.x < prevPos.x) direction = 'left';
          else if (currentPos.y > prevPos.y) direction = 'down';
          else if (currentPos.y < prevPos.y) direction = 'up';
        } else {
          // Single point - use machine direction
          if (machineType && machineType.direction) {
            direction = machineType.direction;
          }
        }
      }

      // Get rotation from direction
      switch (direction) {
        case 'right':
          rotation = 0;
          break;
        case 'down':
          rotation = 90;
          break;
        case 'left':
          rotation = 180;
          break;
        case 'up':
          rotation = 270;
          break;
      }

      // Get world pos
      const worldPos = this.grid.gridToWorld(currentPos.x, currentPos.y);

      // Draw the ghost
      // Check if we can place here
      const canPlace = this.grid.canPlaceMachine(
        machineType,
        currentPos.x,
        currentPos.y,
        direction
      );

      const color = canPlace ? 0x00ff00 : 0xff0000;
      const alpha = 0.5;

      this.placementPreview.fillStyle(color, alpha);
      const cellSize = this.grid.cellSize;

      // Draw rect
      this.placementPreview.fillRect(
        worldPos.x - cellSize / 2,
        worldPos.y - cellSize / 2,
        cellSize,
        cellSize
      );

      // Draw direction indicator (simple triangle)
      this.placementPreview.fillStyle(0xffffff, 0.8);

      // const arrowSize = cellSize * 0.3; // Unused
      let angleRad = Phaser.Math.DegToRad(rotation);

      const tipX = worldPos.x + Math.cos(angleRad) * (cellSize / 3);
      const tipY = worldPos.y + Math.sin(angleRad) * (cellSize / 3);

      const leftX = worldPos.x + Math.cos(angleRad + 2.6) * (cellSize / 3);
      const leftY = worldPos.y + Math.sin(angleRad + 2.6) * (cellSize / 3);

      const rightX = worldPos.x + Math.cos(angleRad - 2.6) * (cellSize / 3);
      const rightY = worldPos.y + Math.sin(angleRad - 2.6) * (cellSize / 3);

      this.placementPreview.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
    }
  }

  createInitialResourceNodes() {
    // Ensure resourceNodes is initialized
    if (!this.resourceNodes) {
      this.resourceNodes = [];
    }
    // Ensure deliveryNodes is initialized
    if (!this.deliveryNodes) {
      this.deliveryNodes = [];
    }

    const starterLaneY = Math.floor(this.grid.height / 2);
    const board = this.currentRoundBoard || this.createRoundBoard(this.currentRound);
    const targetResourceNodeCount = Math.min(
      this.grid.height,
      this.currentRound <= 1
        ? 1
        : (GAME_CONFIG.initialNodeCount || 3) + Math.floor((this.currentRound - 1) / 2)
    );

    // Resource sources persist between rounds. Add only enough new sources to
    // reach the current round's target, so the factory grows around its old spine.
    const existingResourceCount = (this.resourceNodes || []).filter(
      (node) => node?.container
    ).length;
    const sourceColorCycle = this.getSourceColorCycleForRound(this.currentRound);
    this.normalizeResourceNodeColors(sourceColorCycle);
    const sourceInventory = this.getRoundSourceInventory(this.currentRound);
    for (const node of this.resourceNodes || []) {
      if (!node?.container) continue;
      node.isFiniteSource = GAME_CONFIG.finiteResourceRounds ?? true;
      node.resources = sourceInventory;
      node.maxResources = sourceInventory;
      if (typeof node.updateResourceIndicator === 'function') {
        node.updateResourceIndicator();
      }
    }
    for (let i = existingResourceCount; i < targetResourceNodeCount; i++) {
      const preferredY = this.getPreferredRoundRow(board.sourceRows, i, targetResourceNodeCount);
      this.spawnResourceNode(
        i === 0 && !board.sourceRows?.length ? starterLaneY : preferredY,
        0,
        GAME_CONFIG.nodeLifespan,
        sourceColorCycle[i % sourceColorCycle.length],
        {
          finiteSource: GAME_CONFIG.finiteResourceRounds ?? true,
          initialResources: sourceInventory,
          maxResources: sourceInventory,
          showColorTag: this.shouldShowSourceColorTags(this.currentRound),
        }
      );
    }
    this.normalizeResourceNodeColors(sourceColorCycle);

    const deliveryNodeCount = this.getDeliveryNodeCountForRound(this.currentRound);
    for (let i = 0; i < deliveryNodeCount; i++) {
      const preferredY = this.getPreferredRoundRow(board.deliveryRows, i, deliveryNodeCount);
      this.spawnDeliveryNode(this.createDeliveryCondition(this.currentRound, i), preferredY);
    }

    (board.shortcutContracts || []).forEach((shortcut, index) => {
      this.spawnShortcutDeliveryNode(shortcut, index);
    });

    const bonusSources = [...(this.pendingBonusSourceColors || [])];
    this.pendingBonusSourceColors = [];
    bonusSources.forEach((itemColor, index) => {
      const preferredY = this.getPreferredRoundRow(
        board.sourceRows,
        targetResourceNodeCount + index,
        targetResourceNodeCount + bonusSources.length
      );
      const resourceTypeIndex = GAME_CONFIG.resourceTypes.findIndex(
        (resourceType) => resourceType.itemColor === itemColor
      );
      this.spawnResourceNode(
        preferredY,
        resourceTypeIndex === -1 ? 0 : resourceTypeIndex,
        GAME_CONFIG.nodeLifespan,
        itemColor,
        {
          finiteSource: GAME_CONFIG.finiteResourceRounds ?? true,
          initialResources: sourceInventory,
          maxResources: sourceInventory,
          showColorTag: true,
        }
      );
    });
  }

  getSourceColorCycleForRound(round = this.currentRound) {
    const defaultColor = GAME_CONFIG.defaultItemColor || 'blue';
    if (!this.shouldUseColoredSources(round)) return [defaultColor];

    const configuredCycle = GAME_CONFIG.sourceColorCycle || [defaultColor];
    return configuredCycle.length > 0 ? configuredCycle : [defaultColor];
  }

  shouldUseColoredSources(round = this.currentRound) {
    return this.hasColorDemandForRound(round);
  }

  shouldShowSourceColorTags(round = this.currentRound) {
    return this.shouldUseColoredSources(round);
  }

  hasColorDemandForRound(round = this.currentRound) {
    const nodeCount = this.getDeliveryNodeCountForRound(round);
    for (let index = 0; index < nodeCount; index += 1) {
      if (this.createDeliveryCondition(round, index).itemColor) return true;
    }
    return false;
  }

  normalizeResourceNodeColors(sourceColorCycle = GAME_CONFIG.sourceColorCycle || []) {
    if (!Array.isArray(this.resourceNodes) || sourceColorCycle.length === 0) return;

    const activeSources = this.resourceNodes
      .filter((node) => node?.container)
      .sort((a, b) => {
        if ((a.gridX || 0) !== (b.gridX || 0)) return (a.gridX || 0) - (b.gridX || 0);
        return (a.gridY || 0) - (b.gridY || 0);
      });

    activeSources.forEach((node, index) => {
      const color = sourceColorCycle[index % sourceColorCycle.length];
      if (typeof node.setItemColor === 'function') {
        node.setItemColor(color);
      } else {
        node.itemColor = color;
      }
      node.setColorTagVisible?.(this.shouldShowSourceColorTags(this.currentRound));
      node.sourceIndex = index;
    });
  }

  // Modify spawnResourceNode to pass the current round
  spawnResourceNode(
    preferredY = null,
    resourceTypeIndex = 0,
    lifespan = GAME_CONFIG.nodeLifespan,
    itemColorOverride = null,
    options = {}
  ) {
    try {
      if (this.gameOver || this.paused) return null;

      // Ensure resourceNodes is initialized
      if (!this.resourceNodes) {
        this.resourceNodes = [];
      }

      // Find an empty spot on the left edge of the grid (column 0)
      const preferredCell =
        preferredY !== null && preferredY !== undefined ? this.grid.getCell(0, preferredY) : null;
      const emptySpot =
        preferredCell && preferredCell.type === 'empty'
          ? { x: 0, y: preferredY }
          : this.grid.findEmptyCellInColumn(0);
      if (!emptySpot) {
        console.warn('[GAME] No empty cells found in left edge for resource node placement');
        return null;
      }

      // Convert grid position to world coordinates
      const worldPos = this.grid.gridToWorld(emptySpot.x, emptySpot.y);
      if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
        console.error('[GAME] Invalid world position for resource node:', worldPos);
        return null;
      }

      // Select a random resource type (currently hardcoded to basic)
      const sourceIndex = this.resourceNodes.length;
      const sourceColorCycle = this.getSourceColorCycleForRound(this.currentRound);
      const itemColor =
        itemColorOverride || sourceColorCycle[sourceIndex % sourceColorCycle.length];

      // Create a new resource node, passing the current round for scaling and upgradeManager.
      const node = new ResourceNode(
        this,
        {
          x: worldPos.x,
          y: worldPos.y,
          gridX: emptySpot.x,
          gridY: emptySpot.y,
          resourceType: resourceTypeIndex,
          sourceIndex,
          itemColor,
          lifespan,
          showColorTag:
            options.showColorTag ??
            (this.shouldShowSourceColorTags(this.currentRound) ||
              itemColor !== (GAME_CONFIG.defaultItemColor || 'blue')),
          ...options,
        },
        this.currentRound,
        this.upgradeManager
      );

      this.resourceNodes.push(node);
      this.addToWorld(node);
      this.grid.setCell(emptySpot.x, emptySpot.y, { type: 'node', object: node });

      //console.log(`[GAME] Created resource node for round ${this.currentRound} at grid (${emptySpot.x}, ${emptySpot.y})`);
      return node;
    } catch (error) {
      console.error('[GAME] Error creating resource node:', error);
      return null;
    }
  }

  generateResources() {
    if (this.gameOver || this.paused) return;

    // Each resource node generates resources based on its own internal timer (now round-dependent).
    // This loop is no longer needed.
    /*
        this.resourceNodes.forEach(node => {
            node.generateResource(); // This is handled by the node's internal timer now
        });
        */
  }

  updateGameTime() {
    if (this.gameOver || this.paused) return;

    this.gameTime++;

    // Update time display
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = this.gameTime % 60;
    if (this.timeText) {
      this.timeText.setText(`TIME: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }
  }

  getRoundTimeLimitSeconds(round = this.currentRound) {
    const earlyLimit = this.getRoundPacingOverride(
      GAME_CONFIG.pacingConfig?.earlyRoundTimeLimits,
      round
    );
    if (typeof earlyLimit === 'number') return Math.max(30, earlyLimit);

    const base = GAME_CONFIG.roundBaseTimeLimit || 70;
    const growth = GAME_CONFIG.roundTimeGrowth || 8;
    const perDelivery = GAME_CONFIG.roundTimePerDeliveryNode || 12;
    const pacing = this.getRoundPacing(round);
    const bossBonus = pacing.isBoss ? GAME_CONFIG.roundBossTimeBonus || 18 : 0;
    const deliveryCount = this.getDeliveryNodeCountForRound(round);
    return Math.max(
      30,
      base + Math.max(0, round - 1) * growth + deliveryCount * perDelivery + bossBonus
    );
  }

  getRoundTimeRemainingMs() {
    if (this.runState !== 'ROUND_ACTIVE') return this.roundTimeLimitMs || 0;
    if (typeof this.roundTimeRemainingMs === 'number') {
      return Math.max(0, this.roundTimeRemainingMs);
    }
    if (!this.roundEndsAt) return this.roundTimeLimitMs || 0;
    return Math.max(0, this.roundEndsAt - (this.time?.now || 0));
  }

  getRoundTimeRemainingSeconds() {
    return Math.ceil(this.getRoundTimeRemainingMs() / 1000);
  }

  formatRoundTime(seconds = this.getRoundTimeRemainingSeconds()) {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;
  }

  evaluateRoundTimeLimit() {
    if (this.runState !== 'ROUND_ACTIVE' || this.roundClearing || this.roundSurvived) return;
    if (this.getRoundTimeRemainingMs() > 0) return;

    this.failRoundFromTimeLimit();
  }

  failRoundFromTimeLimit() {
    if (this.gameOver || this.runState !== 'ROUND_ACTIVE') return;

    this.setRoundPhase('RUN_OVER');
    this.setProductionPaused(true);
    this.lastFailureSummary = this.getLightFailureSummary('Time ran out');
    this.updateRoundState({ exhausted: true, failureReason: 'time' });
    this.updateRoundUI();
    this.showResourceExhaustedFeedback('TIME UP');
    this.time.delayedCall(650, () => this.endGame());
  }

  createRoundState(round, board) {
    return {
      number: round,
      phase: this.runState,
      board,
      contract: this.contract,
      draft: this.machineFactory?.getDeckCounts?.() || null,
      score: this.roundScore || 0,
      quota: this.roundQuota || 0,
      sourceSupply: this.getRemainingSourceResources(),
      timeLimitMs: this.roundTimeLimitMs || 0,
      timeRemainingMs: this.getRoundTimeRemainingMs(),
      exhausted: false,
    };
  }

  setRoundPhase(phase) {
    this.runState = phase;
    if (this.roundState) {
      this.roundState.phase = phase;
    }
    if (phase !== 'ROUND_ACTIVE' && this.fastForwardActive) {
      this.setFastForwardActive(false);
    } else {
      this.updateFastForwardButton();
    }
    this.updateResetBoardButton();
  }

  updateRoundState(patch = {}) {
    if (!this.roundState) return;

    this.roundState = {
      ...this.roundState,
      ...patch,
      phase: patch.phase || this.runState,
      score: patch.score ?? this.roundScore,
      quota: patch.quota ?? this.roundQuota,
      sourceSupply: patch.sourceSupply ?? this.getRemainingSourceResources(),
      timeRemainingMs: patch.timeRemainingMs ?? this.getRoundTimeRemainingMs(),
    };
  }

  canFastForward() {
    return this.runState === 'ROUND_ACTIVE' && !this.paused && !this.gameOver;
  }

  getFlowSpeedMultiplier() {
    const fastForward =
      this.fastForwardActive && this.canFastForward() ? this.fastForwardMultiplier : 1;
    const starterSpark =
      this.upgradeManager?.isProceduralUpgradeActive('spark_hyperlane_key') &&
      (this.currentRound || 1) <= 4
        ? 1.35
        : 1;
    return fastForward * starterSpark;
  }

  getRoundClockSpeedMultiplier() {
    return this.fastForwardActive && this.canFastForward() ? this.fastForwardMultiplier : 1;
  }

  advanceRoundClock(delta = 0) {
    if (this.runState !== 'ROUND_ACTIVE' || this.roundClearing) return;
    if (typeof this.roundTimeRemainingMs !== 'number') {
      this.roundTimeRemainingMs = this.roundTimeLimitMs || 0;
    }

    const elapsedMs = Math.max(0, delta || 0) * this.getRoundClockSpeedMultiplier();
    this.roundTimeRemainingMs = Math.max(0, this.roundTimeRemainingMs - elapsedMs);
    this.roundEndsAt = (this.time?.now || 0) + this.roundTimeRemainingMs;
  }

  toggleFastForward() {
    if (!this.canFastForward()) {
      this.fastForwardActive = false;
      this.updateFastForwardButton();
      return;
    }

    this.fastForwardActive = !this.fastForwardActive;
    this.playSound(this.fastForwardActive ? 'draft-cycle' : 'click');
    this.refreshMachineFlowSpeed();
    this.updateFastForwardButton();
  }

  setFastForwardActive(active) {
    const nextActive = Boolean(active) && this.canFastForward();
    if (this.fastForwardActive === nextActive) {
      this.updateFastForwardButton();
      return;
    }

    this.fastForwardActive = nextActive;
    this.refreshMachineFlowSpeed();
    this.updateFastForwardButton();
  }

  refreshMachineFlowSpeed() {
    (this.machines || []).forEach((machine) => {
      if (machine && typeof machine.updateFromUpgrades === 'function') {
        machine.updateFromUpgrades();
      }
    });
  }

  updateFastForwardButton() {
    if (!this.fastForwardButton) return;

    const canFastForward = this.canFastForward();
    const active = this.fastForwardActive && canFastForward;
    const button = this.fastForwardButton.button;
    const text = this.fastForwardButton.text;
    text.setText(active ? `SPEED ${this.fastForwardMultiplier}x` : 'SPEED 1x');
    button.fillColor = active ? 0x2c6f8f : 0x263746;
    button.defaultFillColor = button.fillColor;
    button.hoverFillColor = active ? 0x3f8fb5 : 0x345066;
    button.setStrokeStyle(2, active ? 0x7ad7ff : 0x60788c, canFastForward ? 1 : 0.45);
    text.setColor(canFastForward ? '#ffffff' : '#8c98a3');

    if (canFastForward) {
      button.setInteractive({ useHandCursor: true });
      button.setAlpha(1);
      text.setAlpha(1);
    } else {
      button.disableInteractive();
      button.setAlpha(0.58);
      text.setAlpha(0.58);
    }
  }

  addScore(points, options = {}) {
    if (this.gameOver) return 0; // Don't add score if game is over

    const countsForFlow = options.countsForFlow !== false;

    const effectivePoints = Math.max(0, Math.floor(points || 0));

    this.score += effectivePoints;
    this.updateScoreText();
    if (countsForFlow) {
      this.addRoundScore(effectivePoints);
    }

    this.refreshRunWideHud();
    return effectivePoints;
  }

  addRoundScore(points) {
    if (this.runState !== 'ROUND_ACTIVE') return;

    this.roundScore += Math.max(0, Math.floor(points || 0));
    this.updateScoreText();
    if (this.contract) {
      this.contract.delivered = this.roundScore;
    }
    this.updateRoundState({ score: this.roundScore });
    this.updateRoundUI();

    this.tryCompleteRound();
  }

  getFlowMultiplier() {
    const config = GAME_CONFIG.flowConfig || {};
    const cappedStreak = Math.min(
      Math.max(0, Math.floor(this.flowStreak || 0)),
      config.maxStreak || 12
    );
    const multiplier = 1 + cappedStreak * (config.multiplierPerStep || 0.035);
    return Math.min(config.maxMultiplier || 1.35, multiplier);
  }

  applyFlowDeliveryBonus(points, options = {}) {
    const config = GAME_CONFIG.flowConfig || {};
    const now = this.time?.now || 0;
    const windowMs = config.deliveryWindowMs || 5200;
    const startingPoints = Math.max(0, Math.floor(points || 0));

    this.flowStreak = now - (this.lastFlowDeliveryAt || 0) <= windowMs ? this.flowStreak + 1 : 1;
    this.flowStreak = Math.min(this.flowStreak, config.maxStreak || 12);
    this.bestFlowStreak = Math.max(this.bestFlowStreak || 0, this.flowStreak);
    this.lastFlowDeliveryAt = now;
    this.currentMomentum = Math.round(
      Phaser.Math.Clamp((this.flowStreak / (config.maxStreak || 12)) * 100, 0, 100)
    );

    const multiplier = this.getFlowMultiplier();
    const adjusted = Math.floor(startingPoints * multiplier);
    const milestones = config.milestoneStreaks || [3, 6, 10];
    const hitMilestone =
      milestones.includes(this.flowStreak) && this.flowStreak !== this.lastFlowMilestone;
    if (hitMilestone) {
      this.lastFlowMilestone = this.flowStreak;
      this.showFlowStreakFeedback(this.flowStreak, multiplier);
    }
    this.updateFlowHud();
    if (options.withBreakdown) {
      return {
        points: adjusted,
        multiplier,
        streak: this.flowStreak,
        maxStreak: config.maxStreak || 12,
      };
    }
    return adjusted;
  }

  updateFlowHud() {
    if (!this.flowText) return;

    const config = GAME_CONFIG.flowConfig || {};
    const maxStreak = config.maxStreak || 12;
    const windowMs = config.deliveryWindowMs || 5200;
    const now = this.time?.now || 0;
    const elapsed = this.lastFlowDeliveryAt ? now - this.lastFlowDeliveryAt : Infinity;
    const isLive = this.runState === 'ROUND_ACTIVE' && elapsed <= windowMs;
    const streak = isLive ? Math.max(0, Math.floor(this.flowStreak || 0)) : 0;
    const multiplier = Math.min(
      config.maxMultiplier || 1.35,
      1 + Math.min(streak, maxStreak) * (config.multiplierPerStep || 0.035)
    );
    const windowText =
      streak > 0 ? `  ${Math.max(0, (windowMs - elapsed) / 1000).toFixed(1)}s` : '';
    const timeText = this.runState === 'ROUND_ACTIVE' ? `  Time ${this.formatRoundTime()}` : '';
    this.flowText.setText(
      `Flow ${streak}/${maxStreak}  x${multiplier.toFixed(2)}${windowText}${timeText}`
    );
    this.flowText.setColor(
      this.runState === 'ROUND_ACTIVE' && this.getRoundTimeRemainingSeconds() <= 10
        ? '#ff8888'
        : streak >= 10
          ? '#ffd166'
          : streak >= 6
            ? '#88ffcc'
            : '#88ccff'
    );
  }

  showFlowStreakFeedback(streak, multiplier) {
    const text = this.add
      .text(
        this.scale.width / 2 - this.rightPanelWidth / 2,
        150,
        `FLOW ${streak}\nx${multiplier.toFixed(2)}`,
        {
          fontFamily: 'Arial Black',
          fontSize: 24,
          color: streak >= 10 ? '#ffd166' : '#88ffcc',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);
    this.cameras.main.flash(90, 80, 220, 255, true);

    this.tweens.add({
      targets: text,
      y: 112,
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: 0,
      duration: 1050,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  areDeliveryNodesComplete() {
    return !this.getQuotaDeliveryNodes().some((node) => node && !node.completed);
  }

  isQuotaDeliveryNode(node) {
    return Boolean(node) && node.condition?.countsForQuota !== false && !node.condition?.shortcut;
  }

  getQuotaDeliveryNodes() {
    return (this.deliveryNodes || []).filter((node) => this.isQuotaDeliveryNode(node));
  }

  getShortcutDeliveryNodes() {
    return (this.deliveryNodes || []).filter((node) => node?.condition?.shortcut);
  }

  queueDeliveryCompletionScore(points) {
    const scoreReward = Math.max(0, Math.floor(points || 0));
    if (scoreReward <= 0) return 0;

    this.pendingDeliveryCompletionScore = (this.pendingDeliveryCompletionScore || 0) + scoreReward;
    return scoreReward;
  }

  awardPendingDeliveryCompletionScore() {
    const pendingScore = Math.max(0, Math.floor(this.pendingDeliveryCompletionScore || 0));
    if (pendingScore <= 0) return 0;

    this.pendingDeliveryCompletionScore = 0;
    return this.addScore(pendingScore, { countsForFlow: true });
  }

  tryCompleteRound() {
    if (this.runState !== 'ROUND_ACTIVE' || this.roundClearing) return;

    const deliveryMapComplete = this.areDeliveryNodesComplete();
    if (deliveryMapComplete) {
      this.awardPendingDeliveryCompletionScore();
    }

    const quotaMet = (this.roundScore || 0) >= (this.roundQuota || 0);
    if (quotaMet && !this.roundSurvived) {
      this.roundSurvived = true;
      if (!deliveryMapComplete) {
        this.showRoundSurvivedFeedback();
      }
      this.updateRoundAdvanceButton();
    }

    if (quotaMet) {
      this.clearRound();
    }
  }

  getRemainingSourceResources() {
    return (this.resourceNodes || []).reduce(
      (sum, node) => sum + Math.max(0, Math.floor(node?.resources || 0)),
      0
    );
  }

  hasInFlightResources() {
    for (const machine of this.machines || []) {
      if (!machine) continue;
      if (Array.isArray(machine.itemsOnBelt) && machine.itemsOnBelt.length > 0) return true;
      if (Array.isArray(machine.inputQueue) && machine.inputQueue.length > 0) return true;
      if (Array.isArray(machine.outputQueue) && machine.outputQueue.length > 0) return true;
      if (
        Array.isArray(machine.currentProcessingItems) &&
        machine.currentProcessingItems.length > 0
      ) {
        return true;
      }

      const inventories = [machine.inputInventory, machine.outputInventory];
      for (const inventory of inventories) {
        if (!inventory || typeof inventory !== 'object') continue;
        if (Object.values(inventory).some((count) => Number(count) > 0)) return true;
      }
    }

    return false;
  }

  evaluateRoundResourceExhaustion() {
    if (
      this.runState !== 'ROUND_ACTIVE' ||
      this.roundClearing ||
      this.roundSurvived ||
      !GAME_CONFIG.finiteResourceRounds
    ) {
      this.roundExhaustionStartedAt = null;
      return;
    }

    if (this.getRemainingSourceResources() > 0) {
      this.roundExhaustionStartedAt = null;
      return;
    }

    if (!this.roundExhaustionStartedAt) {
      this.roundExhaustionStartedAt = this.time?.now || 0;
    }

    const graceMs = GAME_CONFIG.roundExhaustionGraceMs || 4500;
    const graceElapsed = (this.time?.now || 0) - this.roundExhaustionStartedAt >= graceMs;
    if (!this.hasInFlightResources() || graceElapsed) {
      this.failRoundFromResourceExhaustion();
    }
  }

  failRoundFromResourceExhaustion() {
    if (this.gameOver || this.runState !== 'ROUND_ACTIVE') return;

    this.setRoundPhase('RUN_OVER');
    this.setProductionPaused(true);
    this.lastFailureSummary = this.getLightFailureSummary('Source supply ran out');
    this.updateRoundState({ exhausted: true });
    this.updateRoundUI();
    this.showResourceExhaustedFeedback();
    this.time.delayedCall(650, () => this.endGame());
  }

  // === ROUND QUOTA SYSTEM ===

  getItemRouteTags(_itemData) {
    return [];
  }

  hasContractRoute(_itemData, _contract = this.contract) {
    return true;
  }

  hasContractOperation(_itemData, _demand) {
    return true;
  }

  getRoundPacing(round = this.currentRound) {
    const config = GAME_CONFIG.pacingConfig || {};
    const roundsPerAct = Math.max(1, config.roundsPerAct || 4);
    const act = Math.floor((Math.max(1, round) - 1) / roundsPerAct) + 1;
    const roundInAct = ((Math.max(1, round) - 1) % roundsPerAct) + 1;
    const isBoss = roundInAct === (config.bossRoundInAct || roundsPerAct);
    const isElite = !isBoss && roundInAct === (config.eliteRoundInAct || roundsPerAct - 1);
    const stage = isBoss ? 'BOSS' : isElite ? 'SURGE' : 'BUILD';
    const stageName = isBoss
      ? this.getBossRoundName(act)
      : isElite
        ? 'Surge Shift'
        : 'Factory Shift';

    return {
      act,
      roundInAct,
      roundsPerAct,
      isBoss,
      isElite,
      stage,
      stageName,
      label: `Act ${act}-${roundInAct} ${stage}`,
      quotaMultiplier: isBoss
        ? config.bossQuotaMultiplier || 1.18
        : isElite
          ? config.eliteQuotaMultiplier || 1.08
          : 1,
      sourceMultiplier: isBoss
        ? config.bossSourceMultiplier || 1.12
        : isElite
          ? config.eliteSourceMultiplier || 1.05
          : 1,
      requiredCountBonus: isBoss ? config.bossRequiredCountBonus || 1 : 0,
      completionScoreMultiplier: isBoss
        ? config.bossCompletionScoreMultiplier || 1.25
        : isElite
          ? config.eliteCompletionScoreMultiplier || 1.1
          : 1,
      completionScrapBonus: isBoss
        ? config.bossCompletionScrapBonus || 3
        : isElite
          ? config.eliteCompletionScrapBonus || 1
          : 0,
    };
  }

  getRoundPacingOverride(overrides, round = this.currentRound, fallback = null) {
    if (!overrides) return fallback;
    const key = String(Math.max(1, Math.floor(round || 1)));
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      return overrides[key];
    }
    return fallback;
  }

  getBossRoundName(act) {
    const names = ['Precision Audit', 'Routing Audit', 'Throughput Audit', 'Apex Audit'];
    return names[(Math.max(1, act) - 1) % names.length];
  }

  getRoundPacingLabel(round = this.currentRound) {
    const pacing = this.getRoundPacing(round);
    return `${pacing.label}: ${pacing.stageName}`;
  }

  getContractDemandMatch(tier, itemData, options = {}) {
    if (this.runState !== 'ROUND_ACTIVE' || !this.contract) return null;
    if (!this.hasContractRoute(itemData, this.contract)) return null;

    const allowFilled = options.allowFilled === true;
    return (
      (this.contract.demands || []).find((demand) => {
        if (!allowFilled && demand.delivered >= demand.quantity) return false;
        if (!this.hasContractOperation(itemData, demand)) return false;
        return demand.exact ? tier === demand.tier : tier >= demand.tier;
      }) || null
    );
  }

  isTierRelevantToContract(tier, itemData = null) {
    return Boolean(this.getContractDemandMatch(tier, itemData, { allowFilled: true }));
  }

  getDeliveryRejectionReason(node, itemData) {
    if (!node?.condition || !itemData) return 'wrong item';

    const tier =
      typeof itemData.level === 'number'
        ? itemData.level
        : typeof itemData.level === 'number'
          ? itemData.level
          : 1;
    const requiredTier = node.condition.tier || 1;
    if (node.condition.exact ? tier !== requiredTier : tier < requiredTier) {
      return node.condition.exact ? `needs exact L${requiredTier}` : `needs L${requiredTier}+`;
    }

    return 'wrong item';
  }

  hasActiveDeliveryDemandColor(itemColor) {
    if (!itemColor || isWildcardItemColor(itemColor)) return false;
    return this.getQuotaDeliveryNodes().some(
      (node) => !node.completed && node.condition?.itemColor === itemColor
    );
  }

  getHighestActiveDeliveryDemandTierForColor(itemColor) {
    if (!itemColor || isWildcardItemColor(itemColor)) return 0;
    return this.getQuotaDeliveryNodes().reduce((highest, node) => {
      if (node.completed || node.condition?.itemColor !== itemColor) return highest;
      return Math.max(highest, Math.floor(node.condition?.tier || 0));
    }, 0);
  }

  recordDeliveryRejection(node, itemData, reason = null) {
    if (this.runState !== 'ROUND_ACTIVE') return;

    const label = reason || this.getDeliveryRejectionReason(node, itemData);
    const now = this.time?.now || 0;
    const key = `${node?.gridX ?? 'x'},${node?.gridY ?? 'y'}:${label}`;
    if (this.lastDeliveryRejection?.key === key && now - this.lastDeliveryRejection.time < 900) {
      return;
    }

    this.lastDeliveryRejection = { key, time: now };
    this.deliveryRejectionStats[label] = (this.deliveryRejectionStats[label] || 0) + 1;
  }

  getLightFailureSummary(prefix = 'Run ended') {
    return this.getFailureSnapshot(prefix).summary;
  }

  getFailureSnapshot(prefix = 'Run ended') {
    const missing = Math.max(0, (this.roundQuota || 0) - (this.roundScore || 0));
    const topRejection = Object.entries(this.deliveryRejectionStats || {}).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const quota = Math.max(1, this.roundQuota || 0);
    const quotaPercent = Math.floor(
      Phaser.Math.Clamp(((this.roundScore || 0) / quota) * 100, 0, 100)
    );
    const topReason = topRejection?.[0] || '';
    const failureKey = `${prefix}`.toLowerCase();
    const isTimeFailure = failureKey.includes('time');
    const isSupplyFailure = failureKey.includes('source') || failureKey.includes('supply');
    let lesson = 'Build one scoring lane first, then add branches once it is paying.';

    if (isTimeFailure) {
      lesson = 'Start with the shortest route, then spend the bonus time on upgrades.';
    } else if (topReason) {
      lesson = `Next run: check the delivery tag first. ${topReason}.`;
    } else if (isSupplyFailure) {
      lesson = 'Spend less supply testing. Make the first route pay before expanding.';
    } else if (quotaPercent >= 80) {
      lesson = 'That was close. One faster delivery line likely clears it.';
    }

    const summary = topReason
      ? `${prefix}. ${quotaPercent}% of quota. Misses: ${topReason}.`
      : `${prefix}. ${quotaPercent}% of quota. Needed $${missing} more revenue.`;

    return {
      summary,
      lesson,
      missingScore: missing,
      quotaPercent,
      topRejectionReason: topReason,
      roundScore: this.roundScore || 0,
      roundQuota: this.roundQuota || 0,
      finalRound: this.currentRound || 1,
      timeRemainingSeconds: this.getRoundTimeRemainingSeconds(),
      reason: isTimeFailure
        ? 'time'
        : isSupplyFailure
          ? 'supply'
          : topReason
            ? 'delivery'
            : 'quota',
    };
  }

  getDeliveryReward(basePoints, tier, itemData = null) {
    const countsForFlow =
      this.runState === 'ROUND_ACTIVE' &&
      itemData?.countsForQuota !== false &&
      itemData?.countsForFlow !== false;
    let points = Math.floor(basePoints);
    const breakdownSteps = [];
    const applyMultiplier = (label, multiplier, detail = null) => {
      const cleanMultiplier = Number(multiplier) || 1;
      if (cleanMultiplier === 1) return;
      points = Math.floor(points * cleanMultiplier);
      breakdownSteps.push({
        label,
        multiplier: cleanMultiplier,
        points,
        detail,
      });
    };

    if (countsForFlow) {
      this.roundDeliveryCount = (this.roundDeliveryCount || 0) + 1;
      this.contractDeliveryCount = this.roundDeliveryCount;

      const condition = itemData?.deliveryCondition || null;
      const filledDelivery = itemData?.filledDelivery === true;
      const levelModifier =
        typeof this.upgradeManager?.getLevelDeliveryScoreModifier === 'function'
          ? this.upgradeManager.getLevelDeliveryScoreModifier({
              itemLevel: tier,
              conditionTier: condition?.tier || tier,
              exact: Boolean(condition?.exact),
            })
          : 1;
      applyMultiplier('Surplus', levelModifier, condition ? `L${condition.tier}+` : null);

      const budgetBonus =
        !filledDelivery && typeof this.upgradeManager?.getLevelDeliveryBudgetBonus === 'function'
          ? this.upgradeManager.getLevelDeliveryBudgetBonus({
              itemLevel: tier,
              conditionTier: condition?.tier || tier,
              exact: Boolean(condition?.exact),
            })
          : 0;
      if (budgetBonus > 0) {
        this.addMoney(budgetBonus, 'overlevel');
      }

      if (
        this.upgradeManager?.isProceduralUpgradeActive('boon_every_fifth') &&
        this.roundDeliveryCount % 5 === 0
      ) {
        applyMultiplier('5th delivery', 2);
      }

      const flowReward = this.applyFlowDeliveryBonus(points, { withBreakdown: true });
      points = flowReward.points;
      breakdownSteps.push({
        label: `Flow ${flowReward.streak}/${flowReward.maxStreak}`,
        multiplier: flowReward.multiplier,
        points,
        detail: `${Math.round((GAME_CONFIG.flowConfig?.deliveryWindowMs || 5200) / 100) / 10}s`,
      });
    }

    if (countsForFlow) {
      this.recordDeliveryBreakdown({
        basePoints,
        tier,
        points,
        steps: breakdownSteps,
        condition: itemData?.deliveryCondition || null,
      });
    }

    return {
      points,
      countsForFlow,
      breakdownSteps,
    };
  }

  recordDeliveryBreakdown(breakdown) {
    if (!breakdown) return;
    this.lastDeliveryBreakdown = {
      basePoints: Math.max(0, Math.floor(breakdown.basePoints || 0)),
      tier: Math.max(1, Math.floor(breakdown.tier || 1)),
      points: Math.max(0, Math.floor(breakdown.points || 0)),
      steps: Array.isArray(breakdown.steps) ? breakdown.steps.slice(-3) : [],
      condition: breakdown.condition || null,
    };
  }

  formatScoreMultiplier(multiplier) {
    const value = Number(multiplier) || 1;
    return value % 1 === 0 ? `${value}` : value.toFixed(2);
  }

  getLastDeliveryFormulaText() {
    const breakdown = this.lastDeliveryBreakdown;
    if (!breakdown) return 'Last delivery: waiting for output';

    const factors = [`L${breakdown.tier} $${breakdown.basePoints}`];
    for (const step of breakdown.steps || []) {
      if (!step?.multiplier || step.multiplier === 1) continue;
      factors.push(`${step.label} x${this.formatScoreMultiplier(step.multiplier)}`);
    }

    return `${factors.join('  ->  ')}  =  $${breakdown.points}`;
  }

  getRoundQuota(round = this.currentRound) {
    const base = GAME_CONFIG.roundBaseQuota || 450;
    const growth = GAME_CONFIG.roundQuotaGrowth || 1.55;
    const flatGrowth = GAME_CONFIG.roundQuotaFlatGrowth || 180;
    const board = this.currentRoundBoard?.round === round ? this.currentRoundBoard : null;
    const boardMultiplier = board?.quotaMultiplier || 1;
    const pacingMultiplier = this.getRoundPacing(round).quotaMultiplier || 1;
    const earlyRoundMultiplier =
      this.getRoundPacingOverride(GAME_CONFIG.pacingConfig?.earlyRoundQuotaMultipliers, round, 1) ||
      1;
    const boonMultiplier = this.upgradeManager?.isProceduralUpgradeActive('boon_bulk_contracts')
      ? 0.8
      : 1;
    const starterSparkMultiplier =
      this.upgradeManager?.isProceduralUpgradeActive('spark_hyperlane_key') && round <= 4
        ? 1.15
        : 1;
    return Math.round(
      (base * Math.pow(growth, Math.max(0, round - 1)) + flatGrowth * (round - 1)) *
        boardMultiplier *
        pacingMultiplier *
        earlyRoundMultiplier *
        boonMultiplier *
        starterSparkMultiplier
    );
  }

  buildRound() {
    const round = this.currentRound;
    this.roundScore = 0;
    this.roundQuota = this.getRoundQuota(round);
    this.roundSurvived = false;
    this.flowStreak = 0;
    this.currentMomentum = 0;
    this.lastFlowDeliveryAt = 0;
    this.lastFlowMilestone = 0;
    this.contract = {
      number: round,
      title: 'Revenue Quota',
      requiredTier: null,
      quantity: this.roundQuota,
      delivered: 0,
      demands: [],
      requiredRouteTag: null,
    };
    this.roundDeliveryCount = 0;
    this.contractDeliveryCount = 0;
    this.updateRoundState({ contract: this.contract, quota: this.roundQuota, score: 0 });
    return this.contract;
  }

  buildContract() {
    return this.buildRound();
  }

  createContractShape(round, requiredTier, quantity) {
    const variant = (round - 1) % 5;
    const lowerTier = Math.max(1, requiredTier - 1);
    const feederTier = Math.max(1, requiredTier - 2);

    if (variant === 1) {
      const highQty = Math.max(1, Math.ceil(quantity / 2));
      return {
        title: 'Exact Ratio',
        demands: [
          { tier: lowerTier, quantity: Math.max(1, quantity - highQty), delivered: 0, exact: true },
          { tier: requiredTier, quantity: highQty, delivered: 0, exact: true },
        ],
      };
    }

    if (variant === 2) {
      return {
        title: 'Tier Push',
        demands: [{ tier: requiredTier, quantity, delivered: 0, exact: false }],
      };
    }

    if (variant === 3) {
      return {
        title: 'Lower-Tier Buffer',
        demands: [{ tier: lowerTier, quantity, delivered: 0, exact: false }],
      };
    }

    if (variant === 4) {
      return {
        title: 'Three-Part Ratio',
        demands: [
          { tier: feederTier, quantity: 1, delivered: 0, exact: true },
          { tier: lowerTier, quantity: 1, delivered: 0, exact: true },
          {
            tier: requiredTier,
            quantity: Math.max(1, quantity - 2),
            delivered: 0,
            exact: true,
          },
        ],
      };
    }

    if (round > 1) {
      return {
        title: 'Precision Shipment',
        demands: [{ tier: requiredTier, quantity, delivered: 0, exact: true }],
      };
    }

    return {
      title: 'Precision Shipment',
      demands: [{ tier: requiredTier, quantity, delivered: 0, exact: true }],
    };
  }

  updateContractHud() {
    this.updateRoundUI();
  }

  getContractDemandText(contract) {
    const demandText = (contract.demands || [])
      .map((demand) => {
        const comparator = demand.exact ? '=' : '+';
        return `${Math.min(demand.delivered, demand.quantity)}/${demand.quantity} L${demand.tier}${comparator}`;
      })
      .join('  ');
    const routeText = contract.requiredRouteTag
      ? ` via ${contract.requiredRouteTag === 'junction' ? 'junction' : contract.requiredRouteTag}`
      : '';
    return `${demandText}${routeText}`;
  }

  clearRoundQuota() {
    this.clearRound();
  }

  finishSurvivedRound() {
    this.clearRound();
  }

  updateScrapText() {
    if (this.scrapText) {
      this.scrapText.setText(`${this.getRemainingSourceResources()}`);
    }
  }

  updateScoreText() {
    if (this.scoreText) {
      this.setStatChipValue(this.scoreText, `$${this.roundScore || 0}`);
    }
  }

  addScrap(amount, reason = 'reward') {
    const gained = Math.max(0, Math.floor(amount || 0));
    if (gained <= 0) return 0;

    this.scrap = (this.scrap || 0) + gained;
    this.updateScrapText();
    console.log(`[SHOP] +${gained} Scrap (${reason})`);
    return gained;
  }

  spendScrap(amount) {
    const cost = Math.max(0, Math.floor(amount || 0));
    if ((this.scrap || 0) < cost) return false;

    this.scrap -= cost;
    this.updateScrapText();
    return true;
  }

  awardRoundScrap() {
    const base = GAME_CONFIG.shopRoundClearScrap || 6;
    const pacing = this.getRoundPacing(this.currentRound);
    const bossBonus = pacing.isBoss ? GAME_CONFIG.pacingConfig?.bossRoundClearScrapBonus || 4 : 0;
    const hyperlaneBonus =
      this.lastRoundClearWasStretchComplete &&
      this.upgradeManager?.isProceduralUpgradeActive('spark_hyperlane_key') &&
      this.currentRound <= 4
        ? 4
        : 0;
    const jackpotPrimerBonus =
      this.lastRoundClearWasStretchComplete &&
      this.upgradeManager?.isProceduralUpgradeActive('spark_jackpot_primer') &&
      !this.starterJackpotPrimerSpent
        ? 8
        : 0;
    if (jackpotPrimerBonus > 0) {
      this.starterJackpotPrimerSpent = true;
    }
    const overkillScore = Math.max(0, (this.roundScore || 0) - (this.roundQuota || 0));
    const overkillScrap = Math.floor(
      overkillScore / (GAME_CONFIG.shopOverkillScorePerScrap || 250)
    );
    const speedScrap = this.getRoundSpeedScrap();
    this.lastRoundSpeedScrap = speedScrap;
    return this.addScrap(
      base + bossBonus + hyperlaneBonus + jackpotPrimerBonus + overkillScrap + speedScrap,
      `round ${this.currentRound} clear`
    );
  }

  getRoundSpeedScrap() {
    const timeBonusScore = Math.max(0, Math.floor(this.lastRoundTimeBonus || 0));
    const scorePerScrap =
      GAME_CONFIG.shopTimeBonusScorePerScrap || GAME_CONFIG.shopOverkillScorePerScrap || 250;
    return Math.floor(timeBonusScore / Math.max(1, scorePerScrap));
  }

  showRoundSurvivedFeedback(message = `Round ${this.currentRound} survived`) {
    const text = this.add
      .text(this.scale.width - this.rightPanelWidth - 20, 76, message, {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#88ffcc',
        align: 'right',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 48,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  clearContract() {
    this.clearRoundQuota();
  }

  startNextRound() {
    this.startRound(this.currentRound + 1, { buildPhase: true });
  }

  startNextContract() {
    this.startNextRound();
  }

  showContractOnlineFeedback() {
    const text = this.add
      .text(
        this.scale.width - this.rightPanelWidth - 20,
        76,
        `Round ${this.contract.number} online`,
        {
          fontFamily: 'Arial Black',
          fontSize: 18,
          color: '#ffd966',
          align: 'right',
          stroke: '#000000',
          strokeThickness: 4,
        }
      )
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 48,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  togglePause() {
    if (this.isPausedForUpgrade) return;
    this.paused = !this.paused;

    if (this.paused) {
      this.setFastForwardActive(false);
      // Pause timers
      this.setProductionPaused(true);
      if (this.nodeSpawnTimer) {
        this.nodeSpawnTimer.paused = true;
        console.log('[TIMER_DEBUG] Paused nodeSpawnTimer via togglePause.'); // Log pause
      }
      this.clearPauseScreen();
    } else {
      // Resume timers
      this.setProductionPaused(this.runState === 'BUILD_PHASE');
      if (this.contractTimerEvent && this.runState === 'ROUND_ACTIVE')
        this.contractTimerEvent.paused = false;
      if (this.nodeSpawnTimer) {
        this.nodeSpawnTimer.paused = false;
        console.log('[TIMER_DEBUG] Resumed nodeSpawnTimer via togglePause.'); // Log resume
      }
      this.clearPauseScreen();
    }
    this.updateFastForwardButton();
    this.updatePauseButton();
  }

  updatePauseButton() {
    if (!this.pauseButton) return;

    const button = this.pauseButton.button;
    const text = this.pauseButton.text;
    text.setText(this.paused ? 'RESUME' : 'PAUSE');
    button.fillColor = this.paused ? 0x7a4f2a : 0x4a6fb5;
    button.defaultFillColor = button.fillColor;
    button.hoverFillColor = this.paused ? 0x9a6a3a : 0x5a8fd5;
  }

  clearPauseScreen() {
    if (this.pauseOverlay) this.pauseOverlay.destroy();
    if (this.pauseText) this.pauseText.destroy();
    if (this.resumeButton) {
      this.resumeButton.button.destroy();
      this.resumeButton.text.destroy();
    }
    if (this.menuButton) {
      this.menuButton.button.destroy();
      this.menuButton.text.destroy();
    }
    this.pauseOverlay = null;
    this.pauseText = null;
    this.resumeButton = null;
    this.menuButton = null;
  }

  endGame() {
    this.gameOver = true;
    const failureSnapshot = this.getFailureSnapshot(
      this.lastFailureSummary ? this.lastFailureSummary.split('.')[0] : 'Run ended'
    );

    // Stop all timers
    this.gameTimer.remove();
    if (this.roundTimerEvent) {
      this.roundTimerEvent.remove();
      this.roundTimerEvent = null;
      this.contractTimerEvent = null;
    }
    if (this.nodeSpawnTimer) {
      console.log('[TIMER_DEBUG] Removing nodeSpawnTimer in endGame.');
      this.nodeSpawnTimer.remove();
    }

    // Transition to game over scene
    this.scene.start('GameOverScene', {
      score: this.score,
      timeSurvived: this.gameTime,
      finalRound: this.currentRound,
      failureSummary: failureSnapshot.summary,
      failureSnapshot,
    });
  }

  getDraftCycleState() {
    const selectedCategory = this.machineFactory?.lastSelectedCategory || null;
    const selectedProcessorSlot =
      selectedCategory === 'operator' ? this.machineFactory.lastSelectedSlotIndex : -1;
    const selectedLogisticsSlot =
      selectedCategory === 'logistics' ? this.machineFactory.lastSelectedSlotIndex : -1;
    const canCycleSelectedSlot =
      selectedProcessorSlot >= 0 &&
      this.machineFactory?.canCycleProcessorSlot?.(selectedProcessorSlot) === true;
    const canCycleSelectedLogisticsSlot =
      selectedLogisticsSlot >= 0 &&
      this.machineFactory?.canCycleLogisticsSlot?.(selectedLogisticsSlot) === true;
    const canCycleAnySelectedSlot = canCycleSelectedSlot || canCycleSelectedLogisticsSlot;
    const cost = canCycleAnySelectedSlot
      ? GAME_CONFIG.draftCycleCost || 2
      : this.getDraftRedrawCost();
    const inBuildPhase =
      this.runState === 'BUILD_PHASE' && !this.gameOver && !this.paused && !this.isPausedForUpgrade;

    return {
      affordable: (this.money || 0) >= cost,
      canCycleSelectedLogisticsSlot,
      canCycleSelectedSlot: canCycleAnySelectedSlot,
      cost,
      enabled: inBuildPhase,
      inBuildPhase,
      label: canCycleAnySelectedSlot
        ? `CYCLE $${cost}`
        : cost === 0
          ? 'REDRAW FREE'
          : `REDRAW $${cost}`,
      selectedCategory,
      selectedLogisticsSlot,
      selectedProcessorSlot,
    };
  }

  cycleDraftSelection() {
    if (this.gameOver) return;

    const state = this.getDraftCycleState();
    if (!state.inBuildPhase) {
      this.showDraftCycleFeedback('Build phase only', '#ffcc88');
      return;
    }

    if ((this.money || 0) < state.cost) {
      this.showDraftCycleFeedback(`Need $${state.cost}`, '#ff8888');
      return;
    }

    let success = false;
    if (state.canCycleSelectedLogisticsSlot) {
      success = this.machineFactory?.cycleLogisticsSlot?.(state.selectedLogisticsSlot);
    } else if (state.canCycleSelectedSlot) {
      success = this.machineFactory?.cycleProcessorSlot?.(state.selectedProcessorSlot);
    } else {
      success = this.machineFactory?.redrawBuildHand?.();
    }

    if (!success) {
      this.showDraftCycleFeedback('No cards to draw', '#ff8888');
      return;
    }

    if (state.canCycleSelectedSlot) {
      this.addMoney(-state.cost, 'cycle slot');
    } else if (state.cost > 0) {
      this.addMoney(-state.cost, 'redraw hand');
    } else {
      this.freeDraftRedrawsRemaining = Math.max(0, (this.freeDraftRedrawsRemaining || 0) - 1);
      this.updateActiveUpgradesDisplay();
    }
    this.playSound(state.canCycleSelectedSlot ? 'draft-cycle' : 'draft-redraw');
    this.pulseUIButton(this.draftCycleButton, { scale: 1.06, duration: 120 });
    this.showDraftCycleFeedback(state.canCycleSelectedSlot ? 'Slot cycled' : 'Hand redrawn');
    this.updateRoundState({ draft: this.machineFactory?.getDeckCounts?.() || null });
    this.updateDraftCycleButton();
  }

  getDraftRedrawCost() {
    return this.hasFreeDraftRedrawPerRound() && (this.freeDraftRedrawsRemaining || 0) > 0
      ? 0
      : GAME_CONFIG.draftRedrawCost || 4;
  }

  hasFreeDraftRedrawPerRound() {
    return (
      this.metaUnlocks?.freeDraftRedrawPerRound === true &&
      (GAME_CONFIG.metaProgression?.freeDraftRedrawsPerRound || 0) > 0
    );
  }

  showDraftCycleFeedback(message, color = '#88ccff') {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const feedbackText = this.add
      .text(width * 0.5, height * 0.3, message, {
        fontFamily: 'Arial',
        fontSize: 24,
        color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    feedbackText.setDepth(100);

    this.tweens.add({
      targets: feedbackText,
      y: height * 0.2,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy(),
    });
  }

  updateDraftCycleButton() {
    if (!this.draftCycleButton) return;

    const state = this.getDraftCycleState();
    const fillColor = state.enabled ? (state.affordable ? 0x884400 : 0x5a3924) : 0x3b3228;
    const strokeColor = state.inBuildPhase ? 0xcc6600 : 0x6a5544;

    this.draftCycleButton.text.setText(state.label);
    this.draftCycleButton.button.fillColor = fillColor;
    this.draftCycleButton.button.defaultFillColor = fillColor;
    this.draftCycleButton.button.hoverFillColor =
      state.enabled && state.affordable ? 0xaa6600 : fillColor;
    this.draftCycleButton.button.setStrokeStyle(2, strokeColor);
    this.draftCycleButton.text.setColor(
      state.enabled ? (state.affordable ? '#ffffff' : '#ffbb88') : '#9a8f83'
    );

    if (state.enabled) {
      this.draftCycleButton.button.setInteractive({ useHandCursor: true });
      this.draftCycleButton.text.setAlpha(1);
      this.draftCycleButton.button.setAlpha(1);
    } else {
      this.draftCycleButton.button.disableInteractive();
      this.draftCycleButton.text.setAlpha(state.inBuildPhase ? 0.85 : 0.55);
      this.draftCycleButton.button.setAlpha(state.inBuildPhase ? 0.85 : 0.55);
    }
  }

  canResetBuildBoard() {
    return (
      this.runState === 'BUILD_PHASE' &&
      !this.paused &&
      !this.gameOver &&
      !this.roundClearing &&
      (this.machines?.length || 0) > 0
    );
  }

  getBuildBoardRefund() {
    return (this.machines || []).reduce((total, machine) => {
      const cost =
        typeof machine?.placementCost === 'number'
          ? machine.placementCost
          : this.getMachinePlacementCost(machine);
      return total + Math.max(0, Math.floor(cost || 0));
    }, 0);
  }

  resetBuildBoard() {
    if (this.runState !== 'BUILD_PHASE') {
      this.showDraftCycleFeedback('Build phase only', '#ffcc88');
      return;
    }
    if (!this.canResetBuildBoard()) {
      this.showDraftCycleFeedback('Nothing to reset', '#ffcc88');
      return;
    }

    const refund = this.getBuildBoardRefund();
    this.clearPlacedItems({
      salvage: false,
      clearMachines: true,
      clearResources: false,
      clearDeliveries: false,
    });
    this.resetRoundPaidBeltUsage();

    if (refund > 0) {
      this.addMoney(refund, 'board reset');
    }
    this.playSound('destroy');
    this.showDraftCycleFeedback(refund > 0 ? `Refunded $${refund}` : 'Board reset', '#88ffcc');
    this.updateResetBoardButton();
  }

  updateResetBoardButton() {
    if (!this.resetBoardButton) return;

    const inBuildPhase = this.runState === 'BUILD_PHASE';
    const canReset = this.canResetBuildBoard();
    const refund = this.getBuildBoardRefund();
    const label = canReset && refund > 0 ? `RESET +$${refund}` : 'RESET BOARD';
    const fillColor = canReset ? 0x4f3b2c : 0x2e2824;
    const strokeColor = canReset ? 0xc58b5b : 0x6a5544;

    this.resetBoardButton.text.setText(label);
    this.resetBoardButton.button.setVisible(inBuildPhase);
    this.resetBoardButton.text.setVisible(inBuildPhase);
    this.resetBoardButton.button.fillColor = fillColor;
    this.resetBoardButton.button.defaultFillColor = fillColor;
    this.resetBoardButton.button.hoverFillColor = canReset ? 0x755438 : fillColor;
    this.resetBoardButton.button.setStrokeStyle(2, strokeColor, canReset ? 1 : 0.45);
    this.resetBoardButton.text.setColor(canReset ? '#ffffff' : '#9a8f83');

    if (canReset) {
      this.resetBoardButton.button.setInteractive({ useHandCursor: true });
      this.resetBoardButton.button.setAlpha(1);
      this.resetBoardButton.text.setAlpha(1);
    } else {
      this.resetBoardButton.button.disableInteractive();
      this.resetBoardButton.button.setAlpha(0.58);
      this.resetBoardButton.text.setAlpha(0.58);
    }
  }

  createButton(x, y, text, callback, width = 200, height = 36, fontSize = 14) {
    const button = this.add.rectangle(x, y, width, height, 0x4a6fb5).setInteractive();
    button.defaultFillColor = 0x4a6fb5;
    button.hoverFillColor = 0x5a8fd5;
    const buttonText = this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.fillColor = button.hoverFillColor ?? 0x5a8fd5;
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 90,
        ease: 'Sine.easeOut',
      });
    });

    button.on('pointerout', () => {
      button.fillColor = button.defaultFillColor ?? 0x4a6fb5;
      if (button !== this.startRoundButton?.button || !this.startRoundButtonPulse) {
        this.tweens.add({
          targets: [button, buttonText],
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Sine.easeOut',
        });
      }
    });

    button.on('pointerdown', () => {
      this.playSound('click');
      this.pulseUIButton({ button, text: buttonText }, { scale: 0.97, duration: 70 });
      callback();
    });

    return { button, text: buttonText };
  }

  createPanelButton(x, y, width, height, text, callback, color = 0x4a6fb5) {
    const button = this.add
      .rectangle(x, y, width, height, color)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);
    const buttonText = this.add
      .text(x, y, text, {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    button.on('pointerover', () => {
      button.fillColor = 0x8f6bea;
    });
    button.on('pointerout', () => {
      button.fillColor = color;
    });
    button.on('pointerdown', () => {
      this.playSound('click');
      this.pulseUIButton({ button, text: buttonText }, { scale: 0.97, duration: 70 });
      callback();
    });

    return { button, text: buttonText };
  }

  openSettingsScreen() {
    if (this.scene.isActive('SettingsScene')) return;

    this.scene.launch('SettingsScene', {
      sourceSceneKey: 'GameScene',
      resumeSourceOnClose: true,
    });
    this.scene.bringToTop('SettingsScene');
    this.scene.pause();
  }

  applySettings(settings = loadGameSettings()) {
    this.gameSettings = settings;
    this.audioVolume = Phaser.Math.Clamp(Number(settings.audioVolume) || 0, 0, 1);
    this.audioMuted = settings.muted === true;
    this.musicVolume = this.audioMuted ? 0 : this.audioVolume;
    this.inputMode = settings.inputMode === 'touch' ? 'touch' : 'desktop';
    this.tutorialTipsEnabled = settings.showTutorialTips !== false;

    if (!this.tutorialTipsEnabled) {
      this.destroyTutorialPanel?.();
    } else if (this.scene?.settings?.active && this.shouldShowTutorialPanel?.()) {
      this.createTutorialPanel?.();
    }

    if (this.sound) {
      this.sound.volume = this.musicVolume;
    }
  }

  isUndergroundBeltUnlocked() {
    return Boolean(
      this.metaUnlocks?.undergroundBelts ||
      GAME_CONFIG.metaProgression?.undergroundBeltsUnlockedByDefault
    );
  }

  getSpecialLogisticsConfig(machineTypeOrId) {
    const machineId = String(machineTypeOrId?.id || machineTypeOrId || '').toLowerCase();
    return GAME_CONFIG.specialLogistics?.[machineId] || null;
  }

  isSpecialLogisticsMachine(machineTypeOrId) {
    return Boolean(this.getSpecialLogisticsConfig(machineTypeOrId));
  }

  getSpecialLogisticsInventoryCount(machineTypeOrId) {
    const config = this.getSpecialLogisticsConfig(machineTypeOrId);
    if (!config) return 0;
    return Math.max(0, this.specialLogisticsInventory?.[config.id] || 0);
  }

  isPermanentSpecialLogisticsUnlocked(machineTypeOrId) {
    const config = this.getSpecialLogisticsConfig(machineTypeOrId);
    return Boolean(config && this.permanentSpecialLogistics?.[config.id]);
  }

  getLogisticsMachinePanelType(machineType) {
    const machineId = String(machineType?.id || '').toLowerCase();
    const specialConfig = this.getSpecialLogisticsConfig(machineId);
    if (specialConfig) {
      const isPermanent = this.isPermanentSpecialLogisticsUnlocked(machineId);
      const inventoryCount = this.getSpecialLogisticsInventoryCount(machineId);
      if (!isPermanent && inventoryCount <= 0) return null;
      const useTemporaryKit = inventoryCount > 0;

      return {
        ...machineType,
        name: specialConfig.name || machineType.name,
        description: specialConfig.description || machineType.description,
        specialLogisticsSource: useTemporaryKit ? 'temporary' : 'permanent',
        specialLogisticsCount: inventoryCount,
        placementCost: useTemporaryKit
          ? specialConfig.temporaryPlacementCost
          : specialConfig.permanentPlacementCost,
      };
    }

    return this.isLogisticsMachineUnlocked(machineType) ? machineType : null;
  }

  shouldShowLockedLogisticsMachine(machineType) {
    const machineId = String(machineType?.id || machineType || '').toLowerCase();
    return machineId === 'underground-belt';
  }

  isLogisticsMachineUnlocked(machineType) {
    const machineId = String(machineType?.id || machineType || '').toLowerCase();
    if (this.isSpecialLogisticsMachine(machineId)) {
      return (
        this.getSpecialLogisticsInventoryCount(machineId) > 0 ||
        this.isPermanentSpecialLogisticsUnlocked(machineId)
      );
    }
    if (machineId === 'underground-belt') {
      return this.isUndergroundBeltUnlocked();
    }
    return true;
  }

  getLogisticsUnlockHint(machineType) {
    const machineId = String(machineType?.id || machineType || '').toLowerCase();
    if (machineId === 'underground-belt') {
      const unlockRound = GAME_CONFIG.metaProgression?.advancedLogisticsUnlockRound || 4;
      return `Clear round ${unlockRound} to unlock Advanced Logistics. Board loaner tunnels stay free.`;
    }
    return 'Locked for now.';
  }

  unlockAdvancedLogistics(reason = 'advanced logistics') {
    if (this.isUndergroundBeltUnlocked()) return false;

    this.metaUnlocks = saveMetaUnlocks({
      ...this.metaUnlocks,
      undergroundBelts: true,
    });
    this.machineFactory?.refreshAvailableLogistics?.();
    this.machineFactory?.displayCurrentProcessorPreview?.();
    this.showMetaUnlockFeedback('ADVANCED LOGISTICS\nUNDERGROUND BELTS');
    console.log(`[META] Unlocked underground belts (${reason})`);
    return true;
  }

  refreshLogisticsPanel() {
    this.machineFactory?.refreshAvailableLogistics?.();
    this.machineFactory?.displayCurrentProcessorPreview?.();
  }

  grantSpecialLogisticsItem(machineId, quantity = 1) {
    const config = this.getSpecialLogisticsConfig(machineId);
    if (!config) return false;

    this.specialLogisticsInventory = {
      ...this.specialLogisticsInventory,
      [config.id]: this.getSpecialLogisticsInventoryCount(config.id) + Math.max(1, quantity),
    };
    this.refreshLogisticsPanel();
    this.showMetaUnlockFeedback(`${config.name.toUpperCase()}\nKIT READY`);
    return true;
  }

  unlockPermanentSpecialLogistics(machineId) {
    const config = this.getSpecialLogisticsConfig(machineId);
    if (!config || this.isPermanentSpecialLogisticsUnlocked(config.id)) return false;

    this.permanentSpecialLogistics = {
      ...this.permanentSpecialLogistics,
      [config.id]: true,
    };
    this.refreshLogisticsPanel();
    this.updateActiveUpgradesDisplay();
    this.showMetaUnlockFeedback(`${config.name.toUpperCase()}\nSTABILIZED`);
    return true;
  }

  consumeSpecialLogisticsPlacement(machineType, machineObj) {
    const config = this.getSpecialLogisticsConfig(machineType);
    if (!config || machineType?.specialLogisticsSource !== 'temporary') return false;

    const count = this.getSpecialLogisticsInventoryCount(config.id);
    if (count <= 0) return false;

    this.specialLogisticsInventory = {
      ...this.specialLogisticsInventory,
      [config.id]: Math.max(0, count - 1),
    };
    if (machineObj) {
      machineObj.specialLogisticsSource = 'temporary';
    }
    this.refreshLogisticsPanel();
    return true;
  }

  maybeUnlockAdvancedLogistics(pacing = this.getRoundPacing(this.currentRound)) {
    const unlockRound = GAME_CONFIG.metaProgression?.advancedLogisticsUnlockRound || 4;
    if (this.currentRound >= unlockRound || pacing?.isBoss) {
      return this.unlockAdvancedLogistics(`round ${this.currentRound} clear`);
    }
    return false;
  }

  showMetaUnlockFeedback(message) {
    const text = this.add
      .text(this.scale.width / 2 - this.rightPanelWidth / 2, 164, message, {
        fontFamily: 'Arial Black',
        fontSize: 20,
        color: '#83f7ff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1002);
    this.addToUI(text);
    this.playSound('delivery');

    this.tweens.add({
      targets: text,
      y: 128,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0,
      duration: 1450,
      ease: 'Back.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  addDecorations() {
    // Note: width and height are intentionally unused - kept for potential future decorations
    // const width = this.cameras.main.width;
    // const height = this.cameras.main.height;
    // Add some factory-themed decorations
    //this.add.rectangle(width * 0.5, height * 0.1, width * 0.02, height * 0.8, 0x333333).setOrigin(0.5, 0);
    //this.add.rectangle(width * 0.5, height * 0.1, width * 0.01, height * 0.8, 0x555555).setOrigin(0.5, 0);
    // Add some pipes and industrial elements
    //this.addPipe(width * 0.05, height * 0.1, width * 0.4, 0x555555);
    //this.addPipe(width * 0.55, height * 0.1, width * 0.4, 0x555555);
  }

  addPipe(x, y, width, color) {
    const pipeHeight = 15;
    const connectorRadius = 8;

    // Main pipe
    this.add.rectangle(x, y - pipeHeight / 2, width, pipeHeight, color).setOrigin(0, 0);

    // Connectors
    const connectorCount = Math.floor(width / 50);
    for (let i = 0; i <= connectorCount; i++) {
      const connectorX = x + i * (width / connectorCount);
      this.add.circle(connectorX, y, connectorRadius, 0x333333);
    }
  }

  // Helper method to get direction from rotation
  getDirectionFromRotation(rotation) {
    // Ensure rotation is a number
    if (rotation === undefined || rotation === null) {
      rotation = 0;
    }

    // Convert to number if it's not already
    rotation = Number(rotation);

    // Check if conversion was successful
    if (isNaN(rotation)) {
      rotation = 0;
    }

    // Normalize rotation to 0-2π range
    if (Math.abs(rotation) > Math.PI * 2 + 0.01) {
      rotation = (rotation * Math.PI) / 180;
    }

    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Convert rotation to direction - using exact values for better precision
    let direction;

    // Use a small epsilon value to handle floating point precision issues
    const epsilon = 0.01; // Increased epsilon for better tolerance

    // Check for specific rotation values that correspond to cardinal directions
    if (
      Math.abs(normalizedRotation - 0) < epsilon ||
      Math.abs(normalizedRotation - 2 * Math.PI) < epsilon
    ) {
      direction = 'right';
    } else if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
      direction = 'down';
    } else if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
      direction = 'left';
    } else if (Math.abs(normalizedRotation - (3 * Math.PI) / 2) < epsilon) {
      direction = 'up';
    }
    // Fallback to range-based checks if not exact
    else if (normalizedRotation < Math.PI / 4 || normalizedRotation >= (7 * Math.PI) / 4) {
      direction = 'right';
    } else if (normalizedRotation >= Math.PI / 4 && normalizedRotation < (3 * Math.PI) / 4) {
      direction = 'down';
    } else if (normalizedRotation >= (3 * Math.PI) / 4 && normalizedRotation < (5 * Math.PI) / 4) {
      direction = 'left';
    } else {
      direction = 'up';
    }

    return direction;
  }

  // Update direction indicator for a machine
  updateDirectionIndicator(machine, direction) {
    if (machine && machine.directionIndicator) {
      // Update the rotation based on direction
      switch (direction) {
        case 'right':
          machine.directionIndicator.rotation = 0; // Point right (0 degrees)
          break;
        case 'down':
          machine.directionIndicator.rotation = Math.PI / 2; // Point down (90 degrees)
          break;
        case 'left':
          machine.directionIndicator.rotation = Math.PI; // Point left (180 degrees)
          break;
        case 'up':
          machine.directionIndicator.rotation = (3 * Math.PI) / 2; // Point up (270 degrees)
          break;
        default:
          machine.directionIndicator.rotation = 0;
          break;
      }
    }
  }

  // Update input indicator based on machine rotation
  updateInputIndicator(machine) {
    if (!machine.inputIndicator) return;

    // Determine input direction (opposite of output direction)
    const outputDirection = this.getDirectionFromRotation(machine.rotation);
    let inputDirection = 'none';

    switch (outputDirection) {
      case 'right':
        inputDirection = 'left';
        break;
      case 'down':
        inputDirection = 'up';
        break;
      case 'left':
        inputDirection = 'right';
        break;
      case 'up':
        inputDirection = 'down';
        break;
    }

    // Safely get width and height, providing fallbacks if properties are missing
    let width = 24; // Default width
    let height = 24; // Default height

    if (machine.originalWidth) {
      width = machine.originalWidth;
    } else if (machine.machineType && machine.machineType.shape) {
      width = machine.machineType.shape[0].length * 24;
    } else if (machine.type && machine.type.shape) {
      width = machine.type.shape.length * 24;
    }

    if (machine.originalHeight) {
      height = machine.originalHeight;
    } else if (machine.machineType && machine.machineType.shape) {
      height = machine.machineType.shape.length * 24;
    } else if (machine.type && machine.type.shape) {
      height = machine.type.shape.length * 24;
    }

    // Update position based on new input direction
    switch (inputDirection) {
      case 'right':
        machine.inputIndicator.x = width - 8;
        machine.inputIndicator.y = height / 2;
        machine.inputIndicator.rotation = 0;
        break;
      case 'down':
        machine.inputIndicator.x = width / 2;
        machine.inputIndicator.y = height - 8;
        machine.inputIndicator.rotation = Math.PI / 2;
        break;
      case 'left':
        machine.inputIndicator.x = 8;
        machine.inputIndicator.y = height / 2;
        machine.inputIndicator.rotation = Math.PI;
        break;
      case 'up':
        machine.inputIndicator.x = width / 2;
        machine.inputIndicator.y = 8;
        machine.inputIndicator.rotation = (3 * Math.PI) / 2;
        break;
    }
  }

  // Play a sound if audio is available
  playSound(key) {
    if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
      try {
        this.sound.play(key, { volume: this.getSfxVolume() });
        return;
      } catch (_error) {
        this.audioAvailable = false;
        this.registry.set('audioAvailable', false);
      }
    }

    this.playProceduralSound(key);
  }

  getJuiceAudioContext() {
    if (this.juiceAudioContext) return this.juiceAudioContext;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.juiceAudioContext = new AudioContextClass();
    } catch (_error) {
      this.juiceAudioContext = null;
    }
    return this.juiceAudioContext;
  }

  playProceduralSound(key) {
    if (this.getSfxVolume() <= 0) return;

    const now = this.time?.now || 0;
    if (now - (this.lastJuiceSoundAt[key] || -Infinity) < 35) return;
    this.lastJuiceSoundAt[key] = now;

    const context = this.getJuiceAudioContext();
    if (!context) return;
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      context.resume().catch(() => {});
    }

    const patterns = {
      click: [
        { frequency: 440, duration: 0.045, type: 'triangle', volume: 0.018 },
        { frequency: 660, duration: 0.035, delay: 0.035, type: 'triangle', volume: 0.014 },
      ],
      place: [{ frequency: 300, duration: 0.06, type: 'square', volume: 0.018 }],
      delivery: [
        { frequency: 620, duration: 0.055, type: 'sine', volume: 0.018 },
        { frequency: 930, duration: 0.07, delay: 0.045, type: 'sine', volume: 0.014 },
      ],
      'draft-redraw': [
        { frequency: 240, duration: 0.055, type: 'sawtooth', volume: 0.014 },
        { frequency: 360, duration: 0.055, delay: 0.055, type: 'sawtooth', volume: 0.014 },
        { frequency: 520, duration: 0.07, delay: 0.11, type: 'triangle', volume: 0.018 },
      ],
      'draft-cycle': [
        { frequency: 380, duration: 0.055, type: 'triangle', volume: 0.016 },
        { frequency: 560, duration: 0.06, delay: 0.045, type: 'triangle', volume: 0.016 },
      ],
      'build-phase': [{ frequency: 280, duration: 0.12, type: 'triangle', volume: 0.016 }],
      'round-start': [
        { frequency: 330, duration: 0.08, type: 'triangle', volume: 0.018 },
        { frequency: 495, duration: 0.08, delay: 0.07, type: 'triangle', volume: 0.016 },
        { frequency: 660, duration: 0.12, delay: 0.14, type: 'triangle', volume: 0.016 },
      ],
      'round-clear': [
        { frequency: 523.25, duration: 0.09, type: 'sine', volume: 0.02 },
        { frequency: 659.25, duration: 0.09, delay: 0.08, type: 'sine', volume: 0.018 },
        { frequency: 783.99, duration: 0.14, delay: 0.16, type: 'sine', volume: 0.018 },
      ],
      'round-fail': [
        { frequency: 220, duration: 0.12, type: 'sawtooth', volume: 0.018 },
        { frequency: 146.83, duration: 0.18, delay: 0.09, type: 'sawtooth', volume: 0.014 },
      ],
      'shop-buy': [
        { frequency: 700, duration: 0.05, type: 'triangle', volume: 0.016 },
        { frequency: 1046.5, duration: 0.08, delay: 0.05, type: 'sine', volume: 0.014 },
      ],
      destroy: [{ frequency: 180, duration: 0.08, type: 'sawtooth', volume: 0.012 }],
    };

    (patterns[key] || patterns.click).forEach((tone) => this.playTone(context, tone));
  }

  getSfxVolume() {
    if (this.audioMuted) return 0;
    return Phaser.Math.Clamp(this.audioVolume ?? 0.8, 0, 1);
  }

  playTone(context, tone) {
    const startTime = context.currentTime + (tone.delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const peakVolume = Phaser.Math.Clamp(
      (tone.volume || 0.015) * (this.sfxVolumeMultiplier || 1) * this.getSfxVolume(),
      0.0001,
      0.12
    );

    oscillator.type = tone.type || 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (tone.duration || 0.08));

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + (tone.duration || 0.08) + 0.02);
  }

  // Play background music if audio is available
  playBackgroundMusic() {
    //console.log('Attempting to play background music');
    // Check if audio is available from registry
    this.audioAvailable = this.registry.get('audioAvailable') || false;

    if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
      try {
        this.sound.play('background-music', {
          loop: true,
          volume: this.musicVolume,
        });
        //console.log('Background music started');
      } catch (error) {
        console.error('Failed to play background music:', error);
        this.audioAvailable = false;
        this.registry.set('audioAvailable', false);
      }
    } else {
      //console.log('Audio not available, skipping background music');
    }
  }

  isProcessorTypeId(id) {
    return isProcessingPieceBodyId(id);
  }

  isProcessorMachine(machine) {
    return machine && this.isProcessorTypeId(machine.id);
  }

  getPlacementFootprint(machineType, gridX, gridY, direction) {
    if (!this.grid || !machineType || !machineType.shape) return null;

    const shape = this.grid.getRotatedShape(machineType.shape, direction);
    if (!shape || !Array.isArray(shape) || !Array.isArray(shape[0])) return null;

    const cells = [];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 1) continue;
        cells.push({ x: gridX + x, y: gridY + y });
      }
    }

    return cells;
  }

  getProcessorAtCell(gridX, gridY) {
    if (!this.grid) return null;
    const cell = this.grid.getCell(gridX, gridY);
    if (!cell || cell.type !== 'machine' || !cell.object) return null;
    return this.isProcessorMachine(cell.object) ? cell.object : null;
  }

  getRotatedShapeSize(machineType, direction) {
    if (!this.grid || !machineType || !machineType.shape) return null;
    const shape = this.grid.getRotatedShape(machineType.shape, direction);
    if (!shape || !Array.isArray(shape) || !Array.isArray(shape[0])) return null;
    return { width: shape[0].length, height: shape.length };
  }

  canPlaceFootprintAfterRemoving(machineType, gridX, gridY, direction, removedMachine) {
    const footprint = this.getPlacementFootprint(machineType, gridX, gridY, direction);
    if (!footprint || footprint.length === 0) return false;

    for (const cellPos of footprint) {
      if (
        cellPos.x < 0 ||
        cellPos.x >= this.grid.width ||
        cellPos.y < 0 ||
        cellPos.y >= this.grid.height
      ) {
        return false;
      }

      const cell = this.grid.getCell(cellPos.x, cellPos.y);
      if (!cell || cell.type === 'empty') continue;
      if (cell.type === 'machine' && cell.object === removedMachine) continue;
      return false;
    }

    return true;
  }

  findNearbyProcessorReplacementAnchor(machineType, clickX, clickY, direction, existingMachine) {
    const shapeSize = this.getRotatedShapeSize(machineType, direction);
    if (!shapeSize) return null;

    const radius = Math.max(shapeSize.width, shapeSize.height, 4);
    let best = null;

    for (let y = clickY - radius; y <= clickY + radius; y++) {
      for (let x = clickX - radius; x <= clickX + radius; x++) {
        if (!this.canPlaceFootprintAfterRemoving(machineType, x, y, direction, existingMachine)) {
          continue;
        }

        const centerX = x + (shapeSize.width - 1) / 2;
        const centerY = y + (shapeSize.height - 1) / 2;
        const distance = Math.abs(centerX - clickX) + Math.abs(centerY - clickY);
        const candidate = { x, y, distance };

        if (
          !best ||
          candidate.distance < best.distance ||
          (candidate.distance === best.distance &&
            Math.abs(candidate.x - clickX) + Math.abs(candidate.y - clickY) <
              Math.abs(best.x - clickX) + Math.abs(best.y - clickY))
        ) {
          best = candidate;
        }
      }
    }

    return best ? { x: best.x, y: best.y } : null;
  }

  findNearbyValidPlacementAnchor(machineType, clickX, clickY, direction) {
    const shapeSize = this.getRotatedShapeSize(machineType, direction);
    if (!shapeSize) return null;

    const radius = Math.max(shapeSize.width, shapeSize.height, 3);
    let best = null;

    for (let y = clickY - radius; y <= clickY + radius; y++) {
      for (let x = clickX - radius; x <= clickX + radius; x++) {
        if (!this.grid.canPlaceMachine(machineType, x, y, direction)) {
          continue;
        }

        const centerX = x + (shapeSize.width - 1) / 2;
        const centerY = y + (shapeSize.height - 1) / 2;
        const distance = Math.abs(centerX - clickX) + Math.abs(centerY - clickY);
        const candidate = { x, y, distance };

        if (
          !best ||
          candidate.distance < best.distance ||
          (candidate.distance === best.distance &&
            Math.abs(candidate.x - clickX) + Math.abs(candidate.y - clickY) <
              Math.abs(best.x - clickX) + Math.abs(best.y - clickY))
        ) {
          best = candidate;
        }
      }
    }

    return best ? { x: best.x, y: best.y } : null;
  }

  findProcessorReplacement(machineType, gridX, gridY, direction) {
    if (!this.grid || !machineType || !this.isProcessorTypeId(machineType.id)) return null;

    const clickedProcessor = this.getProcessorAtCell(gridX, gridY);
    if (clickedProcessor) {
      const nearbyAnchor = this.findNearbyProcessorReplacementAnchor(
        machineType,
        gridX,
        gridY,
        direction,
        clickedProcessor
      );
      if (nearbyAnchor) {
        return {
          machine: clickedProcessor,
          footprint: this.getPlacementFootprint(
            machineType,
            nearbyAnchor.x,
            nearbyAnchor.y,
            direction
          ),
          gridX: nearbyAnchor.x,
          gridY: nearbyAnchor.y,
          preservesTrait: Boolean(clickedProcessor.trait),
          flushesInventory: this.machineHasBufferedItems(clickedProcessor),
        };
      }
    }

    const footprint = this.getPlacementFootprint(machineType, gridX, gridY, direction);
    if (!footprint || footprint.length === 0) return null;

    const occupiedObjects = new Set();
    for (const cellPos of footprint) {
      if (
        cellPos.x < 0 ||
        cellPos.x >= this.grid.width ||
        cellPos.y < 0 ||
        cellPos.y >= this.grid.height
      ) {
        return null;
      }

      const cell = this.grid.getCell(cellPos.x, cellPos.y);
      if (!cell || cell.type === 'empty') continue;
      if (cell.type !== 'machine' || !cell.object) return null;
      occupiedObjects.add(cell.object);
    }

    if (occupiedObjects.size !== 1) return null;

    const existingMachine = Array.from(occupiedObjects)[0];
    if (!this.isProcessorMachine(existingMachine)) return null;

    return {
      machine: existingMachine,
      footprint,
      gridX,
      gridY,
      preservesTrait: Boolean(existingMachine.trait),
      flushesInventory: this.machineHasBufferedItems(existingMachine),
    };
  }

  canReplaceProcessor(machineType, gridX, gridY, direction) {
    return Boolean(this.findProcessorReplacement(machineType, gridX, gridY, direction));
  }

  machineHasBufferedItems(machine) {
    if (!machine) return false;
    if (Array.isArray(machine.inputQueue) && machine.inputQueue.length > 0) return true;
    if (Array.isArray(machine.outputQueue) && machine.outputQueue.length > 0) return true;

    const inventories = [machine.inputInventory, machine.outputInventory];
    return inventories.some(
      (inventory) =>
        inventory &&
        Object.values(inventory).some((count) => typeof count === 'number' && count > 0)
    );
  }

  getMachineTypeForProcessorReplacement(machineType, existingMachine) {
    if (!machineType || !existingMachine || !existingMachine.trait) {
      return machineType;
    }

    return {
      ...machineType,
      trait: existingMachine.trait,
      replacementPreservedTrait: true,
    };
  }

  removeMachineForProcessorReplacement(machine) {
    if (!machine) return;

    const machineIndex = this.machines.indexOf(machine);
    if (machineIndex > -1) {
      this.machines.splice(machineIndex, 1);
    }

    if (typeof machine.destroy === 'function') {
      machine.destroy();
    } else if (this.grid && typeof this.grid.removeMachine === 'function') {
      this.grid.removeMachine(machine);
    }
  }

  applyProcessorReplacementCost(replacementInfo) {
    const message = replacementInfo?.flushesInventory
      ? 'Processor replaced\nInventory flushed'
      : replacementInfo?.preservesTrait
        ? 'Processor replaced\nTrait preserved'
        : 'Processor replaced';
    this.showProcessorReplacementFeedback(message);
  }

  showProcessorReplacementFeedback(message) {
    const text = this.add
      .text(this.scale.width - this.rightPanelWidth - 20, 142, message, {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: '#ffd966',
        align: 'right',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 112,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  trackPlacementForFlowReward(machine) {
    if (!machine || !machine.uid || !this.recentFlowPlacements) return;

    this.recentFlowPlacements.set(machine.uid, {
      expiresAt: this.time.now + this.flowPlacementRewardWindow,
      rewarded: false,
      machineId: machine.id,
    });
  }

  cleanupRecentFlowPlacements() {
    if (!this.recentFlowPlacements || this.recentFlowPlacements.size === 0) return;
    const now = this.time.now;
    for (const [uid, info] of this.recentFlowPlacements.entries()) {
      if (info.rewarded || info.expiresAt <= now) {
        this.recentFlowPlacements.delete(uid);
      }
    }
  }

  recordDeliveryFlow(itemData, tier, reward) {
    if (!itemData || !this.recentFlowPlacements || reward?.countsForFlow === false) return;

    if (!this.firstDeliveryCelebrated) {
      this.firstDeliveryCelebrated = true;
      this.showFirstDeliveryFeedback(tier, reward?.points || 0);
      if (this.currentRound === 1) {
        this.tutorialDismissed = true;
        this.destroyTutorialPanel();
      }
    }

    this.cleanupRecentFlowPlacements();
  }

  showFirstDeliveryFeedback(tier, points) {
    const text = this.add
      .text(
        this.scale.width / 2 - this.rightPanelWidth / 2,
        118,
        `FIRST DELIVERY\nL${tier}  +${Math.floor(points || 0)}`,
        {
          fontFamily: 'Arial Black',
          fontSize: 30,
          color: '#88ffcc',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);
    this.cameras.main.flash(140, 120, 255, 210, true);
    this.playSound('delivery');

    this.tweens.add({
      targets: text,
      y: 82,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  countNewMachineConnections(machine, gridX, gridY, direction) {
    if (!machine || !this.grid) return 0;

    const shape = this.grid.getRotatedShape(machine.shape, direction);
    if (!shape || !Array.isArray(shape)) return 0;

    const ownCells = new Set();
    const occupiedCells = [];

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 1) continue;
        const cellX = gridX + x;
        const cellY = gridY + y;
        const key = `${cellX},${cellY}`;
        ownCells.add(key);
        occupiedCells.push({ x: cellX, y: cellY });
      }
    }

    const neighborObjects = new Set();
    const offsets = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (const cell of occupiedCells) {
      for (const offset of offsets) {
        const nx = cell.x + offset.x;
        const ny = cell.y + offset.y;
        if (ownCells.has(`${nx},${ny}`)) continue;

        const neighbor = this.grid.getCell(nx, ny);
        if (!neighbor || neighbor.type === 'empty') continue;

        const object = neighbor.object || neighbor.machine || neighbor.id || neighbor.type;
        if (object && object !== machine) {
          neighborObjects.add(object);
        }
      }
    }

    return neighborObjects.size;
  }

  /**
   * Places a machine on the grid at the specified position
   * @param {Object} machineType - The type of machine to place
   * @param {number} gridX - The x coordinate on the grid
   * @param {number} gridY - The y coordinate on the grid
   * @param {number} rotation - The rotation of the machine in degrees
   * @returns {Object|null} The placed machine object or null if placement failed
   */
  placeMachine(machineType, gridX, gridY, rotation = 0) {
    try {
      // Check 1: Initial bounds check (using gridToWorld)
      const worldPosCheck = this.grid.gridToWorld(gridX, gridY);
      if (!this.grid.isInBounds(worldPosCheck.x, worldPosCheck.y)) {
        console.warn(
          `[GameScene.placeMachine] Exit P1: Initial bounds check failed for world pos derived from (${gridX}, ${gridY})`
        );
        this.showPlacementHint('Outside board', '#ff8888');
        return null;
      }

      // Check 2: Validate machineType object
      if (!machineType) {
        console.warn(
          `[GameScene.placeMachine] Exit P2: Invalid machineType object passed (null/undefined).`
        );
        this.showPlacementHint('Pick a piece first', '#ffcc88');
        return null;
      }
      // Check 3: Validate machineType format
      if (typeof machineType !== 'object' || !machineType.id) {
        console.warn(
          `[GameScene.placeMachine] Exit P3: Invalid machineType format (not object or no id). Type: ${typeof machineType}, ID: ${machineType ? machineType.id : 'N/A'}`
        );
        this.showPlacementHint('Invalid piece', '#ff8888');
        return null;
      }
      if (machineType.isLogisticsBeltPiece) {
        return this.placeLogisticsBeltPiece(machineType, gridX, gridY, rotation);
      }
      const isRepositionedMachine = Boolean(machineType.fromPlacedMachine);

      // Get direction from rotation (assuming degrees for now)
      const direction = this.getDirectionFromRotation(rotation);

      // Check 5: Validate shape generation (use shape from machineType passed in)
      let shape;
      try {
        if (!machineType.shape) {
          console.warn(
            `[GameScene.placeMachine] Exit P5a: machineType object is missing .shape property.`
          );
          this.showPlacementHint('No shape data', '#ff8888');
          return null;
        }
        shape = this.grid.getRotatedShape(machineType.shape, rotation);
        if (!Array.isArray(shape) || shape.length === 0 || !Array.isArray(shape[0])) {
          console.warn(
            `[GameScene.placeMachine] Exit P5b: Invalid rotated shape generated. Shape was:`,
            shape
          );
          return null;
        }
      } catch (shapeError) {
        console.error(
          '[GameScene.placeMachine] Exit P5c: Error getting rotated shape:',
          shapeError
        );
        return null;
      }

      // Check 6: Final placement check using derived direction
      let canPlace = false;
      let replacementInfo = null;
      try {
        canPlace = this.grid.canPlaceMachine(machineType, gridX, gridY, direction);
      } catch (canPlaceError) {
        console.error(
          '[GameScene.placeMachine] Exit P6a: Error checking canPlaceMachine:',
          canPlaceError
        );
        return null; // Exit on error during check
      }
      if (!canPlace && this.isProcessorTypeId(machineType.id)) {
        const nearbyAnchor = this.findNearbyValidPlacementAnchor(
          machineType,
          gridX,
          gridY,
          direction
        );
        if (nearbyAnchor) {
          gridX = nearbyAnchor.x;
          gridY = nearbyAnchor.y;
          canPlace = true;
        }
      }
      if (!canPlace) {
        replacementInfo = isRepositionedMachine
          ? null
          : this.findProcessorReplacement(machineType, gridX, gridY, direction);
        if (replacementInfo) {
          machineType = this.getMachineTypeForProcessorReplacement(
            machineType,
            replacementInfo.machine
          );
          gridX = replacementInfo.gridX;
          gridY = replacementInfo.gridY;
          canPlace = true;
        }
      }
      if (!canPlace) {
        console.warn(
          `[GameScene.placeMachine] Exit P6b: Final canPlace check failed for ${machineType.id} at (${gridX}, ${gridY}), direction ${direction}`
        );
        this.showPlacementHint('Blocked placement', '#ff8888');
        return null;
      }

      const boardTileEffects = isRepositionedMachine
        ? null
        : this.getBoardTilePlacementEffects(machineType, gridX, gridY, direction);
      const placementCost = isRepositionedMachine
        ? 0
        : this.getMachinePlacementCost(machineType, boardTileEffects);
      if (
        !isRepositionedMachine &&
        machineType.specialLogisticsSource === 'temporary' &&
        this.getSpecialLogisticsInventoryCount(machineType.id) <= 0
      ) {
        this.showPlacementHint('No kits left', '#ffcc88');
        this.refreshLogisticsPanel();
        return null;
      }
      if (!isRepositionedMachine && this.money < placementCost) {
        console.warn(
          `[GameScene.placeMachine] Exit P6c: Cannot afford ${machineType.id}. Cost ${placementCost}, money ${this.money}`
        );
        this.showMoneyFeedback(-placementCost, 'needed');
        this.showPlacementHint(`Need $${placementCost}`, '#ff8888');
        return null;
      }

      // Create the machine using the factory
      let machineObj;
      try {
        if (!this.machineFactory || typeof this.machineFactory.createMachine !== 'function') {
          console.error(
            '[GameScene.placeMachine] Exit P7a: this.machineFactory is invalid or missing createMachine method.'
          );
          return null;
        }
        if (replacementInfo) {
          this.removeMachineForProcessorReplacement(replacementInfo.machine);
        }
        // Pass the full machineType object so level configuration (inputLevels, outputLevel) is available
        machineObj = this.machineFactory.createMachine(
          machineType,
          gridX,
          gridY,
          direction,
          rotation,
          this.grid
        );

        if (!machineObj) {
          // Explicit check if creation failed
          console.error(
            '[GameScene.placeMachine] Exit P8a: machineFactory.createMachine returned null/undefined.'
          );
          return null;
        }
      } catch (createError) {
        console.error(
          `[GameScene.placeMachine] Exit P7b: Error during machineFactory.createMachine call:`,
          createError
        );
        return null;
      }

      // --- If we get here, machineObj should be valid ---

      // Transfer level-based properties from machineType to machineObj
      if (machineType.inputLevels && machineType.inputLevels.length > 0) {
        machineObj.inputLevels = [...machineType.inputLevels];
      }
      if (machineType.outputLevel) {
        machineObj.outputLevel = machineType.outputLevel;
      }
      if (machineType.previewOutputLevel) {
        machineObj.previewOutputLevel = machineType.previewOutputLevel;
      }
      if (machineType.notation) {
        machineObj.notation = machineType.notation;
      }
      if (machineType.arithmeticOperation) {
        machineObj.arithmeticOperation = { ...machineType.arithmeticOperation };
        machineObj.arithmeticInputCount = machineType.arithmeticInputCount || 0;
        machineObj.inputLevels = [];
        machineObj.outputLevel = null;
      }

      // Ensure the machine is visible
      if (machineObj.container) {
        machineObj.container.setVisible(true);
        machineObj.container.setAlpha(1);

        // Check if the container has any children
        if (machineObj.container.list) {
          // Make sure all children are visible
          machineObj.container.list.forEach((child) => {
            if (child) {
              child.setVisible(true);
              child.setAlpha(1);
            }
          });
        }
      }

      // Register the machine with the factory grid
      try {
        this.grid.placeMachine(machineObj, gridX, gridY, direction);
      } catch (gridError) {
        console.error('[GameScene.placeMachine] Error during grid.placeMachine:', gridError);
        // Decide if we should destroy the created machineObj if grid placement fails
        if (machineObj && typeof machineObj.destroy === 'function') machineObj.destroy();
        return null; // Exit if grid placement fails
      }

      // Add the machine to the scene's tracking array
      this.machines.push(machineObj);
      machineObj.placedAtTime = this.time?.now || 0;
      this.addToWorld(machineObj);
      if (!isRepositionedMachine) {
        this.trackPlacementForFlowReward(machineObj);
      }
      this.showPlacementHint('Placed', '#88ffcc');
      this.refreshTutorialPanel();

      // Always play a sound when placing a machine
      try {
        this.playSound('place');
      } catch (_soundError) {
        // Continue even if sound playback fails
      }

      machineObj.placementCost = placementCost;
      if (!isRepositionedMachine) {
        this.recordPaidBeltPlacement(machineObj, placementCost);
      }
      this.applyBoardTileEffectsToMachine(machineObj, boardTileEffects);
      this.addMoney(-placementCost, machineObj.id);
      this.consumeSpecialLogisticsPlacement(machineType, machineObj);

      if (replacementInfo) {
        this.applyProcessorReplacementCost(replacementInfo);
      }

      // Always exit machine placement mode after successful placement
      // This ensures consistency regardless of how the machine was placed
      if (this.isPlacingMachine) {
        try {
          this.exitMachinePlacementMode();
        } catch (_modeError) {
          // Continue even if exit mode fails
        }
      }

      if (machineType.isRelocation && this.machineFactory) {
        this.machineFactory.clearSelection();
        this.machineFactory.lastSelectedCategory = null;
        this.machineFactory.lastSelectedSlotIndex = -1;
      }

      return machineObj;
    } catch (error) {
      console.error(
        `[GameScene.placeMachine] Unhandled error in placeMachine for ${machineType ? machineType.id : 'unknown'}:`,
        error
      );
      return null;
    }
  }

  placeLogisticsBeltPiece(machineType, gridX, gridY, rotation = 0) {
    const direction = this.getDirectionFromRotation(rotation);
    const boardTileEffects = this.getBoardTilePlacementEffects(
      machineType,
      gridX,
      gridY,
      direction
    );
    const placementCost = this.getMachinePlacementCost(machineType, boardTileEffects);

    if (this.money < placementCost) {
      this.showMoneyFeedback(-placementCost, 'needed');
      this.showPlacementHint(`Need $${placementCost}`, '#ff8888');
      return null;
    }

    if (!this.grid.canPlaceMachine(machineType, gridX, gridY, direction)) {
      this.showPlacementHint('Blocked placement', '#ff8888');
      return null;
    }

    const logisticsMachineId = machineType.logisticsMachineId || 'conveyor';
    if (logisticsMachineId === 'tunnel') {
      return this.placeLogisticsMachinePiece(
        machineType,
        'logistics-tunnel',
        gridX,
        gridY,
        direction,
        rotation,
        placementCost
      );
    }

    if (logisticsMachineId !== 'conveyor' && logisticsMachineId !== 'tunnel') {
      return this.placeLogisticsMachinePiece(
        machineType,
        logisticsMachineId,
        gridX,
        gridY,
        direction,
        rotation,
        placementCost
      );
    }

    const beltCells = this.getRotatedLogisticsBeltCells(machineType, direction);
    if (beltCells.length === 0) {
      this.showPlacementHint('Invalid belt piece', '#ff8888');
      return null;
    }

    const placedBelts = [];
    for (let index = 0; index < beltCells.length; index++) {
      const cell = beltCells[index];
      const nextCell = beltCells[index + 1] || null;
      const prevCell = beltCells[index - 1] || null;
      const beltDirection = this.getDirectionBetweenCells(
        cell,
        nextCell,
        nextCell ? null : prevCell
      );
      const beltRotation = this.getRotationFromDirection(beltDirection);
      const conveyorType = {
        ...(this.machineFactory?.conveyorMachineType || { id: 'conveyor' }),
        id: 'conveyor',
        placementCost: 0,
        isLogisticsBeltSegment: true,
        isLogisticsTunnelSegment: logisticsMachineId === 'tunnel',
      };
      const machineObj = this.machineFactory.createMachine(
        conveyorType,
        gridX + cell.x,
        gridY + cell.y,
        beltDirection,
        beltRotation,
        this.grid
      );

      if (!machineObj) {
        placedBelts.forEach((belt) => {
          this.grid.removeMachine(belt);
          this.machines = this.machines.filter((machine) => machine !== belt);
          belt.destroy?.();
        });
        this.showPlacementHint('Belt placement failed', '#ff8888');
        return null;
      }

      const placedOnGrid = this.grid.placeMachine(
        machineObj,
        gridX + cell.x,
        gridY + cell.y,
        beltDirection
      );
      if (!placedOnGrid) {
        machineObj.destroy?.();
        placedBelts.forEach((belt) => {
          this.grid.removeMachine(belt);
          this.machines = this.machines.filter((machine) => machine !== belt);
          belt.destroy?.();
        });
        this.showPlacementHint('Belt placement failed', '#ff8888');
        return null;
      }
      this.machines.push(machineObj);
      machineObj.placedAtTime = this.time?.now || 0;
      machineObj.placementCost = 0;
      machineObj.logisticsPieceId = machineType.logisticsPieceCard?.id || machineType.pieceName;
      this.addToWorld(machineObj);
      this.trackPlacementForFlowReward(machineObj);
      placedBelts.push(machineObj);
    }

    if (placementCost > 0) {
      this.addMoney(-placementCost, machineType.pieceName || 'belt piece');
    } else {
      this.updateRoundUI();
    }
    this.showPlacementHint(
      logisticsMachineId === 'tunnel' ? 'Tunnel piece placed' : 'Belt piece placed',
      '#88ffcc'
    );
    this.refreshTutorialPanel();
    this.playSound('place');
    this.exitMachinePlacementMode();
    return placedBelts[0] || null;
  }

  placeLogisticsMachinePiece(
    machineType,
    logisticsMachineId,
    gridX,
    gridY,
    direction,
    rotation,
    placementCost
  ) {
    const placementType = {
      ...machineType,
      id: logisticsMachineId,
      placementCost: 0,
      isLogisticsBeltPiece: false,
      isLogisticsDraftPiece: true,
    };
    const machineObj = this.machineFactory.createMachine(
      placementType,
      gridX,
      gridY,
      direction,
      rotation,
      this.grid
    );

    if (!machineObj) {
      this.showPlacementHint('Logistics placement failed', '#ff8888');
      return null;
    }

    const placedOnGrid = this.grid.placeMachine(machineObj, gridX, gridY, direction);
    if (!placedOnGrid) {
      machineObj.destroy?.();
      this.showPlacementHint('Logistics placement failed', '#ff8888');
      return null;
    }

    this.machines.push(machineObj);
    machineObj.placedAtTime = this.time?.now || 0;
    machineObj.placementCost = 0;
    machineObj.logisticsPieceId = machineType.logisticsPieceCard?.id || machineType.pieceName;
    machineObj.isLogisticsDraftPiece = true;
    this.addToWorld(machineObj);
    this.trackPlacementForFlowReward(machineObj);

    if (placementCost > 0) {
      this.addMoney(-placementCost, machineType.pieceName || 'logistics piece');
    } else {
      this.updateRoundUI();
    }
    this.showPlacementHint(
      `${machineType.pieceShortName || machineType.pieceName} placed`,
      '#88ffcc'
    );
    this.refreshTutorialPanel();
    this.playSound('place');
    this.exitMachinePlacementMode();
    return machineObj;
  }

  getRotatedLogisticsBeltCells(machineType, direction) {
    const path = Array.isArray(machineType?.logisticsPath) ? machineType.logisticsPath : [];
    const shape = machineType?.shape || [[1]];
    return path.map((cell) => this.rotateLogisticsBeltCell(cell, shape, direction));
  }

  rotateLogisticsBeltCell(cell, shape, direction) {
    const height = shape.length;
    const width = shape[0]?.length || 1;

    switch (direction) {
      case 'down':
        return { x: height - 1 - cell.y, y: cell.x };
      case 'left':
        return { x: width - 1 - cell.x, y: height - 1 - cell.y };
      case 'up':
        return { x: cell.y, y: width - 1 - cell.x };
      case 'right':
      default:
        return { x: cell.x, y: cell.y };
    }
  }

  getDirectionBetweenCells(cell, nextCell, previousCell = null) {
    const target = nextCell || cell;
    let dx = target.x - cell.x;
    let dy = target.y - cell.y;

    if (dx === 0 && dy === 0 && previousCell) {
      dx = cell.x - previousCell.x;
      dy = cell.y - previousCell.y;
    }

    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
    if (dy > 0) return 'down';
    if (dy < 0) return 'up';
    return 'right';
  }

  getRotationFromDirection(direction) {
    switch (direction) {
      case 'down':
        return Math.PI / 2;
      case 'left':
        return Math.PI;
      case 'up':
        return (3 * Math.PI) / 2;
      case 'right':
      default:
        return 0;
    }
  }

  /**
   * Helper method to debug machine rotation information
   * @param {string} label - Label for debug information (e.g., "BEFORE" or "AFTER")
   * @param {object} machine - The machine object being rotated
   */
  debugRotation(label, machine) {
    if (!machine) {
      console.warn(`[ROTATION] ${label}: No machine provided for debug`);
      return;
    }

    const rotationRad = machine.rotation !== undefined ? machine.rotation : 0;
    // Note: rotationDeg and direction are computed for debugging but logging is commented out
    // const rotationDeg = ((rotationRad * 180) / Math.PI).toFixed(1);
    const _direction = machine.direction || this.getDirectionFromRotation(rotationRad);

    //console.log(`[ROTATION] ${label}: rotation=${rotationRad.toFixed(4)} rad (${rotationDeg}°), direction=${direction}`);

    if (machine.machineType) {
      //console.log(`[ROTATION] ${label}: machineType=${machine.machineType.id || 'unknown'}`);
    }

    if (machine.gridX !== undefined && machine.gridY !== undefined) {
      //console.log(`[ROTATION] ${label}: gridPos=(${machine.gridX}, ${machine.gridY})`);
    }

    if (machine.x !== undefined && machine.y !== undefined) {
      //console.log(`[ROTATION] ${label}: worldPos=(${machine.x.toFixed(1)}, ${machine.y.toFixed(1)})`);
    }
  }

  // Add this helper method to ensure input/output references are correctly set
  fixMachineInputOutputReferences(machine) {
    if (!machine || !machine.container || !machine.container.list) return;

    //console.log(`[DEBUG] Fixing input/output references for ${machine.id}`);
    //console.log(`[DEBUG] Machine shape:`, machine.shape);
    //console.log(`[DEBUG] Machine direction: ${machine.direction}`);
    //console.log(`[DEBUG] Total parts in container:`, machine.container.list.length);

    // Determine input and output positions based on direction
    let _inputPos = { x: -1, y: -1 };
    let _outputPos = { x: -1, y: -1 };

    if (machine.direction !== 'none') {
      // For machines with direction, determine input and output positions
      switch (machine.direction) {
        case 'right':
          // Input on left side, output on right side
          _inputPos = { x: 0, y: Math.floor(machine.shape.length / 2) };
          _outputPos = { x: machine.shape[0].length - 1, y: Math.floor(machine.shape.length / 2) };
          break;
        case 'down':
          // Input on top side, output on bottom side
          _inputPos = { x: Math.floor(machine.shape[0].length / 2), y: 0 };
          _outputPos = { x: Math.floor(machine.shape[0].length / 2), y: machine.shape.length - 1 };
          break;
        case 'left':
          // Input on right side, output on left side
          _inputPos = { x: machine.shape[0].length - 1, y: Math.floor(machine.shape.length / 2) };
          _outputPos = { x: 0, y: Math.floor(machine.shape.length / 2) };
          break;
        case 'up':
          // Input on bottom side, output on top side
          _inputPos = { x: Math.floor(machine.shape[0].length / 2), y: machine.shape.length - 1 };
          _outputPos = { x: Math.floor(machine.shape[0].length / 2), y: 0 };
          break;
      }
    }

    //console.log(`[DEBUG] Expected input position: (${_inputPos.x}, ${_inputPos.y})`);
    //console.log(`[DEBUG] Expected output position: (${_outputPos.x}, ${_outputPos.y})`);

    // Reset inputSquare and outputSquare references
    machine.inputSquare = null;
    machine.outputSquare = null;

    // Direct approach: manually set the input and output squares
    // First get the parts ordered by position
    const cellSize = machine.grid.cellSize;
    const parts = [];

    // Log each part first for debugging (commented out)
    // machine.container.list.forEach((part, index) => {
    //   console.log(`[DEBUG] Part ${index}:`, part.type,
    //                     part.fillColor ? part.fillColor.toString(16) : 'no fillColor',
    //                     part.x, part.y);
    // });

    // Collect all rectangle parts - be more inclusive
    machine.container.list.forEach((part) => {
      // Check if the part has a fillColor property (is a shape)
      if (
        part.fillColor !== undefined &&
        part !== machine.progressBar &&
        !part.isResourceIndicator
      ) {
        // Store the part with its grid position
        parts.push({
          part: part,
          x: Math.round(part.x / cellSize),
          y: Math.round(part.y / cellSize),
        });
        //console.log(`[DEBUG] Found part at calculated position (${Math.round(part.x / cellSize)}, ${Math.round(part.y / cellSize)})`);
      }
    });

    // Find the leftmost part for input (right direction)
    if (machine.direction === 'right') {
      let leftmost = null;
      parts.forEach((item) => {
        if (leftmost === null || item.x < leftmost.x) {
          leftmost = item;
        }
      });
      if (leftmost) {
        machine.inputSquare = leftmost.part;
        //console.log(`[DEBUG] Set input square to leftmost part at (${leftmost.x}, ${leftmost.y})`);
      }

      // Find the rightmost part for output
      let rightmost = null;
      parts.forEach((item) => {
        if (rightmost === null || item.x > rightmost.x) {
          rightmost = item;
        }
      });
      if (rightmost) {
        machine.outputSquare = rightmost.part;
        //console.log(`[DEBUG] Set output square to rightmost part at (${rightmost.x}, ${rightmost.y})`);
      }
    }
    // Find the topmost part for input (down direction)
    else if (machine.direction === 'down') {
      let topmost = null;
      parts.forEach((item) => {
        if (topmost === null || item.y < topmost.y) {
          topmost = item;
        }
      });
      if (topmost) {
        machine.inputSquare = topmost.part;
        //console.log(`[DEBUG] Set input square to topmost part at (${topmost.x}, ${topmost.y})`);
      }

      // Find the bottommost part for output
      let bottommost = null;
      parts.forEach((item) => {
        if (bottommost === null || item.y > bottommost.y) {
          bottommost = item;
        }
      });
      if (bottommost) {
        machine.outputSquare = bottommost.part;
        //console.log(`[DEBUG] Set output square to bottommost part at (${bottommost.x}, ${bottommost.y})`);
      }
    }
    // Find the rightmost part for input (left direction)
    else if (machine.direction === 'left') {
      let rightmost = null;
      parts.forEach((item) => {
        if (rightmost === null || item.x > rightmost.x) {
          rightmost = item;
        }
      });
      if (rightmost) {
        machine.inputSquare = rightmost.part;
        //console.log(`[DEBUG] Set input square to rightmost part at (${rightmost.x}, ${rightmost.y})`);
      }

      // Find the leftmost part for output
      let leftmost = null;
      parts.forEach((item) => {
        if (leftmost === null || item.x < leftmost.x) {
          leftmost = item;
        }
      });
      if (leftmost) {
        machine.outputSquare = leftmost.part;
        //console.log(`[DEBUG] Set output square to leftmost part at (${leftmost.x}, ${leftmost.y})`);
      }
    }
    // Find the bottommost part for input (up direction)
    else if (machine.direction === 'up') {
      let bottommost = null;
      parts.forEach((item) => {
        if (bottommost === null || item.y > bottommost.y) {
          bottommost = item;
        }
      });
      if (bottommost) {
        machine.inputSquare = bottommost.part;
        //console.log(`[DEBUG] Set input square to bottommost part at (${bottommost.x}, ${bottommost.y})`);
      }

      // Find the topmost part for output
      let topmost = null;
      parts.forEach((item) => {
        if (topmost === null || item.y < topmost.y) {
          topmost = item;
        }
      });
      if (topmost) {
        machine.outputSquare = topmost.part;
        //console.log(`[DEBUG] Set output square to topmost part at (${topmost.x}, ${topmost.y})`);
      }
    }
  }

  /**
   * Simulate machine placement to calculate accurate position adjustments
   * @param {string} machineId - The ID of the machine type
   * @param {number} gridX - The x coordinate on the grid
   * @param {number} gridY - The y coordinate on the grid
   * @param {string} direction - The direction the machine is facing
   * @param {number} rotation - The rotation of the machine in degrees
   * @returns {Object} The world position and adjustments
   */
  simulateMachinePlacement(machineId, gridX, gridY, direction, rotation) {
    try {
      // Ensure we have valid inputs
      if (machineId === undefined || machineId === null) {
        machineId = 'unknown';
      }

      // Ensure machineId is a string
      machineId = String(machineId);

      // Validate grid position
      if (gridX === undefined || gridY === undefined || gridX === null || gridY === null) {
        gridX = 0;
        gridY = 0;
      }

      // Ensure grid coordinates are numbers
      gridX = Number(gridX);
      gridY = Number(gridY);

      // Handle NaN values
      if (isNaN(gridX) || isNaN(gridY)) {
        gridX = 0;
        gridY = 0;
      }

      // Ensure we have a valid direction, defaulting to 'right' if missing
      if (
        !direction ||
        typeof direction !== 'string' ||
        !['right', 'down', 'left', 'up'].includes(direction)
      ) {
        direction = 'right';
      }

      // Ensure rotation is a number, defaulting to 0 if missing or invalid
      if (rotation === undefined || rotation === null || isNaN(Number(rotation))) {
        rotation = 0;
      } else {
        rotation = Number(rotation);
      }

      // Get base world position from grid coordinates
      let worldPos;
      try {
        // This gives us the center of the grid cell
        worldPos = this.grid.gridToWorld(gridX, gridY);

        // Validate world position
        if (
          !worldPos ||
          typeof worldPos !== 'object' ||
          worldPos.x === undefined ||
          worldPos.y === undefined ||
          isNaN(worldPos.x) ||
          isNaN(worldPos.y)
        ) {
          throw new Error('Invalid world position returned');
        }
      } catch (_gridError) {
        // Create a fallback world position
        worldPos = {
          x: gridX * (this.grid.cellSize || 24),
          y: gridY * (this.grid.cellSize || 24),
        };
      }

      // Initialize adjustments - for most machines these should be 0
      const adjustments = { x: 0, y: 0 };

      // Apply direction-specific adjustments based on machine type
      // Note: cellSize is declared but currently unused - kept for future direction adjustments

      // Now ensure the position is always an integer value to avoid rounding errors
      worldPos.x = Math.round(worldPos.x);
      worldPos.y = Math.round(worldPos.y);

      return {
        worldPos: worldPos,
        adjustments: adjustments,
      };
    } catch (_error) {
      // Provide a fallback result
      const cellSize = this.grid ? this.grid.cellSize || 24 : 24;
      return {
        worldPos: {
          x: gridX * cellSize,
          y: gridY * cellSize,
        },
        adjustments: { x: 0, y: 0 },
      };
    }
  }

  // Handle machine placement from UI
  handleMachinePlacement(machineType) {
    // Exit placement mode if already placing this machine type
    if (this.isPlacingMachine && this.selectedMachineType === machineType) {
      this.exitMachinePlacementMode();
      return;
    }

    // Enter placement mode with the selected machine type
    this.enterMachinePlacementMode(machineType);
  }

  // Exit machine placement mode
  exitMachinePlacementMode() {
    try {
      this.isPlacingMachine = false;
      this.selectedMachineType = null;

      // Use our robust placement preview removal method
      try {
        this.removePlacementPreview();
      } catch (previewError) {
        console.error('[EXIT] Error removing placement preview:', previewError);
        // Force reset preview objects
        this.placementPreview = null;
        this.placementPreviewMarker = null;
      }

      // Clear any ghost machines
      if (this.machineFactory && this.machineFactory.clearGhostMachine) {
        try {
          this.machineFactory.clearGhostMachine();
        } catch (ghostError) {
          console.error('[EXIT] Error clearing ghost machine:', ghostError);
        }
      }

      //console.log('[PLACEMENT] Exited machine placement mode');
    } catch (error) {
      console.error('[EXIT] Unhandled error in exitMachinePlacementMode:', error);
      // Force reset state
      this.isPlacingMachine = false;
      this.selectedMachineType = null;
      this.placementPreview = null;
      this.placementPreviewMarker = null;
    }
  }

  // Enter machine placement mode with the given machine type
  enterMachinePlacementMode(machineType) {
    try {
      // Validate machine type
      if (!machineType) {
        console.error('[ENTER] Missing machine type, cannot enter placement mode');
        return;
      }

      if (typeof machineType !== 'object' || !machineType.id) {
        console.error('[ENTER] Invalid machine type:', machineType);
        return;
      }

      // First exit any existing placement mode
      this.exitMachinePlacementMode();

      // Set the new machine type and enter placement mode
      this.isPlacingMachine = true;
      this.selectedMachineType = machineType;

      // Create a placement preview for the selected machine type
      if (this.machineFactory) {
        try {
          // Create a ghost machine using the factory
          this.machineFactory.createGhostMachine(machineType);
        } catch (ghostError) {
          console.error('[ENTER] Error creating ghost machine:', ghostError);
          // Continue even if ghost creation fails
        }
      } else {
        console.warn('[ENTER] Machine factory not available, cannot create ghost machine');
      }

      //console.log(`[PLACEMENT] Entered machine placement mode with type: ${machineType.id}`);
    } catch (error) {
      console.error('[ENTER] Unhandled error in enterMachinePlacementMode:', error);
      // Try to clean up
      this.exitMachinePlacementMode();
    }
  }

  /**
   * Handle mouse interactions with draggable machine
   */
  handleDraggableMachine() {
    // Create a placeholder machine for preview
    if (!this.selectedMachine && this.uiSelectedMachine) {
      const machineType = this.uiSelectedMachine;

      // Log the machineType for debugging
      /*console.log('[DRAG] Machine type selected:', JSON.stringify({
                id: machineType.id,
                shape: machineType.shape,
                defaultDirection: machineType.defaultDirection
            }));*/

      // Ensure the shape is valid
      let shape = machineType.shape;
      if (!shape || !Array.isArray(shape)) {
        //console.log('[DRAG] Creating default shape for machine');
        shape = [[1]]; // Default 1x1 shape
      } else {
        //console.log('[DRAG] Using shape from machineType:', JSON.stringify(shape));
      }

      this.selectedMachine = {
        type: machineType.id,
        id: machineType.id,
        shape: shape,
        direction: machineType.defaultDirection || 'right',
        rotation: 0,
        // Add a machineType property to avoid errors in Grid.js
        machineType: {
          id: machineType.id,
          shape: shape,
          direction: machineType.defaultDirection || 'right',
        },
        getRotatedShape: function () {
          return this.grid.getRotatedShape(this.shape, this.rotation);
        }.bind(this),
      };

      // Log the created selectedMachine
      /*console.log('[DRAG] Created selectedMachine:', JSON.stringify({
                type: this.selectedMachine.type,
                shape: this.selectedMachine.shape,
                direction: this.selectedMachine.direction,
                rotation: this.selectedMachine.rotation
            }));*/

      // Create placement preview
      this.createPlacementPreview(this.selectedMachine);
    }

    // Update the machine preview on pointer move
    if (this.selectedMachine) {
      this.pointer = this.input.activePointer;

      // Handle rotation on right click
      if (this.input.mousePointer.rightButtonDown() && !this.rightClickProcessed) {
        this.rightClickProcessed = true;

        // Rotate 90 degrees clockwise
        this.selectedMachine.rotation = (this.selectedMachine.rotation + 90) % 360;

        // Update the direction based on rotation
        switch (this.selectedMachine.rotation) {
          case 0:
            this.selectedMachine.direction = 'right';
            break;
          case 90:
            this.selectedMachine.direction = 'down';
            break;
          case 180:
            this.selectedMachine.direction = 'left';
            break;
          case 270:
            this.selectedMachine.direction = 'up';
            break;
        }

        // Also update the direction in the machineType
        if (this.selectedMachine.machineType) {
          this.selectedMachine.machineType.direction = this.selectedMachine.direction;
        }

        // Log rotation
        //console.log(`[DRAG] Machine rotated: ${this.selectedMachine.rotation}° (${this.selectedMachine.direction})`);

        // Update the placement preview after rotation
        this.updatePlacementPreview(this.selectedMachine);
      }

      // Reset right click processing when mouse button is released
      if (!this.input.mousePointer.rightButtonDown()) {
        this.rightClickProcessed = false;
      }

      // Update the placement preview
      this.updatePlacementPreview(this.selectedMachine);

      // Handle machine placement on left click
      if (this.input.mousePointer.leftButtonDown() && !this.leftClickProcessed) {
        this.leftClickProcessed = true;

        // Get grid position from pointer
        const gridPos = this.grid.worldToGrid(this.pointer.worldX, this.pointer.worldY);

        if (gridPos) {
          // Try to place the machine
          const placementResult = this.grid.placeMachine(
            this.selectedMachine,
            gridPos.x,
            gridPos.y,
            this.selectedMachine.rotation
          );

          if (placementResult.success) {
            //console.log(`Machine placed at grid (${gridPos.x}, ${gridPos.y})`);

            // Create the machine in the world
            this.createMachine(
              this.selectedMachine.id,
              gridPos.x,
              gridPos.y,
              this.selectedMachine.direction
            );

            // Play placement sound
            this.playSound('place');
          } else {
            //console.log(`Cannot place machine: ${placementResult.reason}`);

            // Play error sound
            this.playSound('error');
          }
        }
      }

      // Reset left click processing when mouse button is released
      if (!this.input.mousePointer.leftButtonDown()) {
        this.leftClickProcessed = false;
      }
    }
  }

  // Add a debug button creation method
  createDebugButton(x, y, text, callback) {
    const button = this.add
      .text(x, y, text, {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#ff0000',
        padding: { x: 10, y: 5 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callback)
      .on('pointerover', () => button.setStyle({ fill: '#ff0' }))
      .on('pointerout', () => button.setStyle({ fill: '#fff' }));

    // Make sure it's on top of other elements
    button.setDepth(1000);

    return button;
  }

  // --- Clear Factory Ability ---

  clearPlacedItems(options = {}) {
    if (this.paused || this.gameOver) return;

    const clearMachines = options.clearMachines !== false;
    const clearResources = options.clearResources !== false;
    const clearDeliveries = options.clearDeliveries !== false;
    console.log(
      `Clearing placed items with effects. Machines:${clearMachines} Resources:${clearResources} Deliveries:${clearDeliveries}`
    );

    // --- 1. Score Remaining Items ---
    let salvagedScore = 0;
    const resourceValue = GAME_CONFIG.resourceValueMap;
    const salvage = options.salvage !== false;

    if (salvage) {
      // Score items on conveyor belts
      if (clearMachines) {
        this.machines.forEach((machine) => {
          if (machine instanceof ConveyorMachine && machine.itemsOnBelt) {
            machine.itemsOnBelt.forEach((itemOnBelt) => {
              const itemType = itemOnBelt.itemData.type;
              if (resourceValue[itemType]) {
                salvagedScore += resourceValue[itemType];
              }
            });
          }
          // Score items in machine inventories (optional, might double count if belts feed machines)
          // Consider if needed based on how inventories work
          // for (const type in machine.inputInventory) {
          //     if (resourceValue[type]) {
          //         salvagedScore += (machine.inputInventory[type] * resourceValue[type]);
          //     }

          // for (const type in machine.outputInventory) {
          //      if (resourceValue[type]) {
          //          salvagedScore += (machine.outputInventory[type] * resourceValue[type]);
          //      }
        });
      }

      // Score items still in Resource Nodes
      if (clearResources) {
        this.resourceNodes.forEach((node) => {
          if (node.resources > 0 && resourceValue[node.resourceType.id]) {
            salvagedScore += node.resources * resourceValue[node.resourceType.id];
          }
        });
      }

      if (salvagedScore > 0) {
        console.log(`Adding ${salvagedScore} from salvaged resources.`);
        this.score += salvagedScore;
        this.updateScoreText();
      }
    }

    // --- 2. Clear Entities with Animation ---
    const clearDelay = 50; // Short delay between each item's effect start
    const effectDuration = 300; // How long the disintegration effect takes

    // --- Helper function for disintegration effect ---
    const disintegrate = (targetObject, index, isMachine = false) => {
      if (!targetObject) return;

      let targetContainer = targetObject.container || targetObject; // Use container if machine, else the object itself (for nodes)
      if (!targetContainer || !targetContainer.scene) return; // Safety checks

      this.time.delayedCall(index * clearDelay, () => {
        // Sound
        this.playSound('destroy'); // Assuming a 'destroy' sound effect exists

        // Particle Effect (at container's center)
        const emitter = this.add.particles(targetContainer.x, targetContainer.y, 'particle', {
          // Assume 'particle' texture exists
          speed: { min: 50, max: 150 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: effectDuration,
          gravityY: 100,
          quantity: 10, // Number of particles
          blendMode: 'ADD', // Brighter particles
        });
        // Make particles disappear after duration
        this.time.delayedCall(effectDuration, () => emitter.destroy());

        // Disintegration Tween
        this.tweens.add({
          targets: targetContainer,
          duration: effectDuration,
          ease: 'Quad.easeIn', // Start slow, accelerate
          // 1. Flash White
          scaleX: targetContainer.scaleX * 1.1, // Optional: slight scale up
          scaleY: targetContainer.scaleY * 1.1,
          alpha: 0.5, // Semi-transparent
          tint: 0xffffff, // Flash white
          yoyo: true, // Go back to normal tint/alpha briefly
          hold: 50, // Hold the white flash briefly
          onComplete: () => {
            // 2. Shrink & Fade Out Fast
            this.tweens.add({
              targets: targetContainer,
              scaleX: 0,
              scaleY: 0,
              alpha: 0,
              duration: effectDuration * 0.6, // Faster fade out
              ease: 'Quad.easeIn',
              onComplete: () => {
                // 3. Final Cleanup after animation
                if (
                  this.grid &&
                  targetObject.gridX !== undefined &&
                  targetObject.gridY !== undefined
                ) {
                  if (isMachine) {
                    this.grid.removeMachine(targetObject); // Remove from grid data
                    if (targetObject && typeof targetObject.destroy === 'function') {
                      targetObject.destroy(); // Then destroy the machine object itself
                    }
                  } else {
                    // Assumes nodes occupy single cells
                    const cell = this.grid.getCell(targetObject.gridX, targetObject.gridY);
                    if (cell && cell.object === targetObject) {
                      this.grid.setCell(targetObject.gridX, targetObject.gridY, { type: 'empty' });
                    }
                    if (targetObject && typeof targetObject.destroy === 'function') {
                      targetObject.destroy(); // Destroy the node object
                    }
                  }
                } else if (isMachine) {
                  console.warn(`[Disintegrate] Machine missing grid/coords, destroying directly.`);
                  if (targetObject && typeof targetObject.destroy === 'function') {
                    targetObject.destroy();
                  }
                } else {
                  // Is a Node, missing grid/coords
                  console.warn(`[Disintegrate] Node missing grid/coords, destroying directly.`);
                  if (targetObject && typeof targetObject.destroy === 'function') {
                    targetObject.destroy();
                  }
                }
              },
            });
          },
        });
      });
    };
    // --- End Helper function ---

    let clearIndex = 0;

    // --- Clear Machines ---
    const machinesToClear = clearMachines ? [...this.machines] : [];
    if (clearMachines) {
      this.machines = []; // Clear the main array
      this.roundBoardLoaners = [];
      machinesToClear.forEach((machine) => disintegrate(machine, clearIndex++, true));
    }

    // --- Clear Resource Nodes ---
    const resourceNodesToClear = clearResources ? [...this.resourceNodes] : [];
    if (clearResources) {
      this.resourceNodes = []; // Clear the main array
      resourceNodesToClear.forEach((node) => disintegrate(node, clearIndex++, false));
    }

    // --- Clear Delivery Nodes ---
    const deliveryNodesToClear = clearDeliveries ? [...this.deliveryNodes] : [];
    if (clearDeliveries) {
      this.deliveryNodes = []; // Clear the main array
      deliveryNodesToClear.forEach((node) => disintegrate(node, clearIndex++, false));
    }

    // --- Grid visual clear (optional, can be removed if animation handles it) ---
    // this.grid.clearGrid(); // Might interfere with animations, clear via cell removal instead

    console.log('Factory clear initiated. Selected items will disintegrate.');
  }

  refreshRunWideHud() {
    if (!this.traitRegistry) return;

    const lines = [];
    const beaconCount = this.traitRegistry.getBeaconCount();
    if (beaconCount > 0) {
      lines.push(`Beacon x${beaconCount} (+${(beaconCount * 0.1).toFixed(1)} revenue)`);
    }

    this.runWideHudLines = lines;
    if (this.runWideHudLabel) {
      this.runWideHudLabel.setVisible(false);
    }
    if (this.activeUpgradesText) {
      this.updateActiveUpgradesDisplay();
    }
  }

  resetRoundPaidBeltUsage() {
    this.paidBeltPlacementsThisRound = 0;
    this.paidBeltSpendThisRound = 0;
  }

  isPaidBeltPlacement(machineType, placementCost) {
    return machineType?.id === 'conveyor' && Math.max(0, Math.floor(placementCost || 0)) > 0;
  }

  recordPaidBeltPlacement(machine, placementCost) {
    if (!machine || !this.isPaidBeltPlacement(machine, placementCost)) return;

    const cost = Math.max(0, Math.floor(placementCost || 0));
    machine.isPaidBeltPlacement = true;
    machine.paidBeltPlacementCost = cost;
    this.paidBeltPlacementsThisRound = Math.max(0, (this.paidBeltPlacementsThisRound || 0) + 1);
    this.paidBeltSpendThisRound = Math.max(0, (this.paidBeltSpendThisRound || 0) + cost);
  }

  unrecordBuildPhasePaidBelt(machine) {
    if (!machine?.isPaidBeltPlacement || this.runState !== 'BUILD_PHASE') return;

    this.paidBeltPlacementsThisRound = Math.max(0, (this.paidBeltPlacementsThisRound || 0) - 1);
    this.paidBeltSpendThisRound = Math.max(
      0,
      (this.paidBeltSpendThisRound || 0) -
        Math.max(0, Math.floor(machine.paidBeltPlacementCost || machine.placementCost || 0))
    );
    machine.isPaidBeltPlacement = false;
    machine.paidBeltPlacementCost = 0;
  }

  getRoundCashPayoutBreakdown(score = this.roundScore, quota = this.roundQuota) {
    const quotaRevenue = Math.min(Math.max(0, Math.floor(score || 0)), Math.max(0, quota || 0));
    const overDeliveryRevenue = Math.max(0, Math.floor(score || 0) - Math.max(0, quota || 0));
    const multiplier = Math.max(0, Number(GAME_CONFIG.roundCashPayoutMultiplier ?? 1));

    return {
      quotaRevenue,
      overDeliveryRevenue,
      quotaCash: Math.floor(quotaRevenue * multiplier),
      overDeliveryCash: Math.floor(overDeliveryRevenue * multiplier),
      multiplier,
    };
  }

  getPaidBeltFreeClearBonus(round = this.currentRound) {
    if ((this.paidBeltPlacementsThisRound || 0) > 0) return 0;

    const base = Math.max(0, Math.floor(GAME_CONFIG.paidBeltFreeClearBonusBase || 0));
    const growth = Math.max(0, Math.floor(GAME_CONFIG.paidBeltFreeClearBonusGrowth || 0));
    const cap = Math.max(0, Math.floor(GAME_CONFIG.paidBeltFreeClearBonusCap || 0));
    const bonus = base + Math.max(0, Math.floor(round || 1) - 1) * growth;
    return cap > 0 ? Math.min(cap, bonus) : bonus;
  }

  getRoundClearRankInfo(score = this.roundScore, quota = this.roundQuota) {
    const safeQuota = Math.max(1, Math.floor(quota || 0));
    const ratio = Math.max(0, Math.floor(score || 0)) / safeQuota;

    if (ratio >= 1.2) return { label: 'S', color: '#ffd166', ratio };
    if (ratio >= 1.08) return { label: 'A', color: '#88ffcc', ratio };
    if (ratio >= 1) return { label: 'B', color: '#83f7ff', ratio };
    if (ratio >= 0.88) return { label: 'C', color: '#b7cbd6', ratio };
    return { label: 'D', color: '#ff9f88', ratio };
  }

  getDeliveryNodeCompletionBurstInfo(node) {
    if (node?.isShortcutNode) {
      return { label: 'OPEN', color: '#88ffcc', isRank: false };
    }

    const deliveryNodes = this.getQuotaDeliveryNodes();
    const completesMap =
      deliveryNodes.length > 0 &&
      deliveryNodes.every((delivery) => delivery === node || delivery.completed);
    const projectedScore =
      (this.roundScore || 0) +
      Math.max(0, Math.floor(this.pendingDeliveryCompletionScore || 0)) +
      Math.max(0, Math.floor(node?.completionScoreReward || 0));

    if (completesMap && projectedScore >= (this.roundQuota || 0)) {
      return { ...this.getRoundClearRankInfo(projectedScore, this.roundQuota), isRank: true };
    }

    return { label: 'DONE', color: '#88ffcc', isRank: false };
  }

  getRoundStartingMoney(round = this.currentRound) {
    const base = GAME_CONFIG.roundBaseMoney || 28;
    const growth = GAME_CONFIG.roundMoneyGrowth || 8;
    const budgetBonus =
      typeof this.upgradeManager?.getBudgetBonus === 'function'
        ? this.upgradeManager.getBudgetBonus()
        : 0;
    const floatBonus =
      typeof this.upgradeManager?.getClosingFloatBonus === 'function'
        ? this.upgradeManager.getClosingFloatBonus()
        : 0;
    return base + Math.max(0, round - 1) * growth + budgetBonus + floatBonus * 2;
  }

  getBudgetCarryoverCap(round = this.currentRound) {
    const base = GAME_CONFIG.budgetCarryoverCapBase || 0;
    if (base <= 0) return Infinity;

    const growth = GAME_CONFIG.budgetCarryoverCapGrowth || 0;
    const budgetBonus =
      typeof this.upgradeManager?.getBudgetBonus === 'function'
        ? this.upgradeManager.getBudgetBonus()
        : 0;
    const floatBonus =
      typeof this.upgradeManager?.getClosingFloatBonus === 'function'
        ? this.upgradeManager.getClosingFloatBonus()
        : 0;
    return base + Math.max(0, round - 1) * growth + budgetBonus + floatBonus * 4;
  }

  applyBudgetCarryoverCap(round = this.currentRound) {
    const cap = this.getBudgetCarryoverCap(round);
    if (!Number.isFinite(cap) || (this.money || 0) <= cap) return false;

    this.money = Math.max(0, Math.floor(cap));
    this.updateRoundUI();
    return true;
  }

  getRoundSourceInventory(round = this.currentRound) {
    const base = GAME_CONFIG.roundSourceBaseInventory || 18;
    const growth = GAME_CONFIG.roundSourceInventoryGrowth || 5;
    const variance = GAME_CONFIG.roundSourceInventoryVariance || 0;
    const wave = variance > 0 ? (round % 3) * variance : 0;
    const board = this.currentRoundBoard?.round === round ? this.currentRoundBoard : null;
    const boardMultiplier = board?.sourceInventoryMultiplier || 1;
    const pacingMultiplier = this.getRoundPacing(round).sourceMultiplier || 1;
    const boonMultiplier = this.upgradeManager?.isProceduralUpgradeActive('boon_bulk_contracts')
      ? 0.82
      : 1;
    return Math.max(
      1,
      Math.floor(
        (base + Math.max(0, round - 1) * growth + wave) *
          boardMultiplier *
          pacingMultiplier *
          boonMultiplier
      )
    );
  }

  getDeliveryNodeCountForRound(round = this.currentRound) {
    const maxNodes = GAME_CONFIG.maxDeliveryNodesPerRound || 7;
    if (round <= 1) return 1;
    if (round === 2) return 1;
    if (round === 3) return 1;
    if (round <= 6) return 2;
    const pacing = this.getRoundPacing(round);
    if (pacing.isElite) {
      return Math.min(maxNodes, 1 + pacing.act);
    }
    if (pacing.isBoss) {
      return Math.min(maxNodes, 1 + pacing.act);
    }
    return Math.min(maxNodes, 2 + Math.floor(Math.max(0, round - 5) / 3));
  }

  createRoundBoard(round = this.currentRound) {
    const generator = this.boardGenerator || new BoardGenerator({ gridConfig: GRID_CONFIG });
    return generator.createRoundBoard(round, {
      width: this.grid?.width || GRID_CONFIG.width,
      height: this.grid?.height || GRID_CONFIG.height,
    });
  }

  clearRoundBoard() {
    if (!this.grid) return;
    this.hideBoardGimmickTooltip();

    for (const machine of this.roundBoardLoaners || []) {
      const machineIndex = this.machines.indexOf(machine);
      if (machineIndex > -1) {
        this.machines.splice(machineIndex, 1);
      }
      if (machine?.container?.scene && typeof machine.destroy === 'function') {
        machine.destroy();
      }
    }
    for (const blocker of this.roundBoardBlockers || []) {
      const cell = this.grid.getCell(blocker.x, blocker.y);
      if (cell?.type === 'board-blocker') {
        this.grid.setCell(blocker.x, blocker.y, { type: 'empty' });
      }
    }
    for (const tile of this.roundBoardSpecialTiles || []) {
      const cell = this.grid.getCell(tile.x, tile.y);
      if (cell?.type === 'board-tile') {
        this.grid.setCell(tile.x, tile.y, { type: 'empty' });
      }
    }
    this.roundBoardBlockers = [];
    this.roundBoardSpecialTiles = [];
    this.roundBoardLoaners = [];
    this.roundBoardShortcutContracts = [];
    this.currentRoundBoard = null;
  }

  applyRoundBoard(round = this.currentRound) {
    this.clearRoundBoard();
    const board = this.applyPendingBoardEdits(this.createRoundBoard(round));
    this.currentRoundBoard = board;
    this.roundBoardBlockers = board.blockers || [];
    this.roundBoardSpecialTiles = board.specialTiles || [];
    this.roundBoardShortcutContracts = board.shortcutContracts || [];

    for (const blocker of this.roundBoardBlockers) {
      const cell = this.grid.getCell(blocker.x, blocker.y);
      if (cell?.type === 'empty') {
        const style = BOARD_OBSTACLE_STYLES[blocker.obstacleType] || BOARD_BLOCKER_CELL_STYLE || {};
        this.grid.setCell(blocker.x, blocker.y, {
          type: 'board-blocker',
          boardId: board.id,
          obstacleType: blocker.obstacleType,
          openCost: blocker.openCost,
          gimmickType: blocker.gimmickType,
          name: style.name,
          color: style.color,
          borderColor: style.borderColor,
          description: style.description,
        });
      }
    }
    for (const tile of this.roundBoardSpecialTiles) {
      const style = BOARD_TILE_STYLES[tile.type] || {};
      const cell = this.grid.getCell(tile.x, tile.y);
      if (cell?.type === 'empty') {
        this.grid.setCell(tile.x, tile.y, {
          type: 'board-tile',
          boardId: board.id,
          tileType: tile.type,
          name: style.name,
          label: style.label,
          color: style.color,
          borderColor: style.borderColor,
          glowColor: style.glowColor,
          description: style.description,
        });
      }
    }

    this.applyBoardLoanerUndergrounds(board);
    this.grid.drawGrid();
    this.showBoardRevealJuice(board);
    return board;
  }

  applyBoardLoanerUndergrounds(board) {
    const loaners = board?.loanerUndergrounds || [];
    if (!loaners.length || !this.grid || !this.machineFactory) return;

    const loanerType = {
      id: 'underground-belt',
      shape: [[1, 0, 0, 1]],
      isBoardLoaner: true,
      isFixedInfrastructure: true,
    };

    for (const loaner of loaners) {
      const direction = loaner.direction || 'right';
      if (!this.grid.canPlaceMachine(loanerType, loaner.x, loaner.y, direction)) {
        console.warn(
          `[BOARD] Could not place loaner underground at (${loaner.x}, ${loaner.y}) ${direction}`
        );
        continue;
      }

      const machine = this.machineFactory.createMachine(
        {
          ...loanerType,
          pieceName: loaner.label || 'Loaner Underground',
        },
        loaner.x,
        loaner.y,
        direction,
        0,
        this.grid
      );
      if (!machine) continue;

      machine.isBoardLoaner = true;
      machine.isFixedInfrastructure = true;
      machine.placementCost = 0;
      machine.boardLoanerId = loaner.id;
      machine.displayName = loaner.label || 'Loaner Underground';

      try {
        this.grid.placeMachine(machine, loaner.x, loaner.y, direction);
      } catch (error) {
        console.warn('[BOARD] Loaner underground placement failed:', error);
        machine.destroy?.();
        continue;
      }

      this.machines.push(machine);
      this.roundBoardLoaners.push(machine);
      machine.placedAtTime = this.time?.now || 0;
      this.addToWorld(machine);
    }
  }

  applyPendingBoardEdits(board) {
    const editedBoard = {
      ...board,
      blockers: [...(board.blockers || [])],
      specialTiles: [...(board.specialTiles || [])],
      loanerUndergrounds: [...(board.loanerUndergrounds || [])],
      shortcutContracts: [...(board.shortcutContracts || [])],
    };

    const removeCount = Math.min(
      this.pendingBoardBlockerRemovals || 0,
      editedBoard.blockers.length
    );
    if (removeCount > 0) {
      editedBoard.blockers.splice(0, removeCount);
      this.pendingBoardBlockerRemovals -= removeCount;
    }

    const remainingBlockers = new Set(editedBoard.blockers.map((cell) => `${cell.x},${cell.y}`));
    editedBoard.shortcutContracts = editedBoard.shortcutContracts
      .map((shortcut) => ({
        ...shortcut,
        unlockCells: (shortcut.unlockCells || []).filter((cell) =>
          remainingBlockers.has(`${cell.x},${cell.y}`)
        ),
      }))
      .filter((shortcut) => shortcut.unlockCells.length > 0);

    const bonusTiles = [...(this.pendingBoardBonusTiles || [])];
    this.pendingBoardBonusTiles = [];
    bonusTiles.forEach((type, index) => {
      const tile = this.findOpenBoardTileSlot(editedBoard, index);
      if (tile) {
        editedBoard.specialTiles.push({ ...tile, type });
      }
    });

    return editedBoard;
  }

  findOpenBoardTileSlot(board, offset = 0) {
    const width = this.grid?.width || GRID_CONFIG.width;
    const height = this.grid?.height || GRID_CONFIG.height;
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const blocked = new Set([
      ...(board.blockers || []).map((cell) => `${cell.x},${cell.y}`),
      ...(board.specialTiles || []).map((cell) => `${cell.x},${cell.y}`),
      ...(board.shortcutContracts || []).map((shortcut) => `${shortcut.x},${shortcut.y}`),
    ]);
    const candidates = [
      { x: midX - 2 - offset, y: midY },
      { x: midX + 2 + offset, y: midY },
      { x: midX, y: midY - 2 - offset },
      { x: midX, y: midY + 2 + offset },
      { x: midX - 1, y: midY + 1 + offset },
    ];

    return candidates.find(
      (cell) =>
        cell.x > 0 &&
        cell.x < width - 1 &&
        cell.y >= 0 &&
        cell.y < height &&
        !blocked.has(`${cell.x},${cell.y}`)
    );
  }

  getRoundBoardSummary(round = this.currentRound) {
    const board =
      this.currentRoundBoard && this.currentRoundBoard.round === round
        ? this.currentRoundBoard
        : this.createRoundBoard(round);
    const hasOverpass = board.loanerUndergrounds?.some(
      (loaner) => loaner.gimmickType === 'overpass'
    );
    const hasDoor = board.blockers?.some(
      (blocker) => blocker.obstacleType === BOARD_OBSTACLE_TYPES.SCRAP_DOOR
    );
    const hasColorToll = board.shortcutContracts?.some(
      (contract) => contract.kind === 'color-toll'
    );
    const hasShortcut = board.shortcutContracts?.some((contract) => contract.kind !== 'color-toll');
    const parts = [
      board.name,
      hasDoor ? 'cash doors' : null,
      hasShortcut ? 'key shortcut' : null,
      hasColorToll ? 'color toll' : null,
      hasOverpass ? 'overpass' : board.loanerUndergrounds?.length ? 'fixed tunnel' : null,
    ].filter(Boolean);
    return parts.join(' + ');
  }

  getPreferredRoundRow(rows = [], index = 0, total = 1) {
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[index % rows.length];
    }
    return Math.floor(((index + 1) * this.grid.height) / (total + 1));
  }

  getRoundVariantRng(round, salt = '') {
    if (!this.boardGenerator) {
      this.boardGenerator = new BoardGenerator({ gridConfig: GRID_CONFIG });
    }
    return this.boardGenerator.createRoundRng(`${round}:${salt}`);
  }

  randomRoundInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  createDeliveryCondition(round, index) {
    const rng = this.getRoundVariantRng(round, `delivery-${index}`);
    const pacing = this.getRoundPacing(round);
    const baseTier = 2 + Math.floor((round - 2 + Math.max(0, index)) / 3);
    const tierJitter = round >= 5 && rng() < 0.35 ? (rng() < 0.55 ? -1 : 1) : 0;
    const tier = round <= 2 ? 2 : Math.max(2, Math.min(6, baseTier + tierJitter));
    const exactOffset = round >= 3 ? this.randomRoundInt(rng, 0, 1) : 0;
    const countJitter = round >= 4 ? this.randomRoundInt(rng, -1, 1) : 0;
    let requiredCount = Math.max(
      1,
      Math.min(7, round === 1 ? 1 : 2 + Math.floor((round - 1) / 3) + (index % 2) + countJitter)
    );
    if (round <= 3) {
      requiredCount = Math.min(requiredCount, 3);
    } else if (round === 4) {
      requiredCount = Math.min(requiredCount, 3);
    }
    if (pacing.isBoss) {
      requiredCount = Math.min(8, requiredCount + (pacing.requiredCountBonus || 0));
    }
    const nodeCount = this.getDeliveryNodeCountForRound(round);
    const colorCycle = GAME_CONFIG.sourceColorCycle || [GAME_CONFIG.defaultItemColor || 'blue'];
    const colorOffset = this.randomRoundInt(rng, 0, colorCycle.length - 1);
    const pacingConfig = GAME_CONFIG.pacingConfig || {};
    const minRequiredCount = this.getRoundPacingOverride(
      pacingConfig.earlyRoundMinRequiredCounts,
      round
    );
    if (typeof minRequiredCount === 'number') {
      requiredCount = Math.max(requiredCount, minRequiredCount);
    }
    const firstExactDemandRound = pacingConfig.firstExactDemandRound || 5;
    const firstColorDemandRound = pacingConfig.firstColorDemandRound || 7;
    let itemColor = null;
    const wantsColorDemand =
      round >= firstColorDemandRound &&
      (round <= 8 ? index === nodeCount - 1 : !pacing.isBoss || pacing.act > 1 || index % 2 === 1);
    if (wantsColorDemand) {
      itemColor = colorCycle[(round + index + colorOffset - 2) % colorCycle.length];
    }
    const colorConfig = itemColor ? GAME_CONFIG.itemColors?.[itemColor] : null;
    const wantsExactDemand = pacing.isBoss
      ? round >= firstExactDemandRound + 3 && (index === 0 || pacing.act >= 3)
      : round >= firstExactDemandRound && (index + exactOffset) % 2 === 0;
    const earlyCompletionScoreMultiplier =
      this.getRoundPacingOverride(pacingConfig.earlyRoundCompletionScoreMultipliers, round, 1) || 1;
    const completionScoreReward = Math.floor(
      ((GAME_CONFIG.deliveryNodeCompletionScoreBase || 420) +
        tier * (GAME_CONFIG.deliveryNodeCompletionScorePerTier || 160) +
        requiredCount * (GAME_CONFIG.deliveryNodeCompletionScorePerItem || 85) +
        (itemColor ? 180 : 0)) *
        (pacing.completionScoreMultiplier || 1) *
        earlyCompletionScoreMultiplier
    );
    const tierLabel = `${wantsExactDemand ? '=' : ''}L${tier}${wantsExactDemand ? '' : '+'}`;
    const pacingPrefix = pacing.isBoss ? 'BOSS ' : pacing.isElite ? 'SURGE ' : '';

    return {
      tier,
      exact: wantsExactDemand,
      pacingStage: pacing.stage,
      scoreSink: true,
      itemColor,
      requiredCount,
      completionScoreReward,
      completionScrapReward: 0,
      label: `${pacingPrefix}${colorConfig ? `${colorConfig.name} ` : ''}${tierLabel} x${requiredCount}`,
    };
  }

  getRoundPreviewText(round = this.currentRound, limit = 4) {
    const count = this.getDeliveryNodeCountForRound(round);
    const parts = [];
    for (let i = 0; i < Math.min(count, limit); i++) {
      parts.push(this.formatDeliveryConditionHud(this.createDeliveryCondition(round, i)));
    }
    if (count > limit) {
      parts.push(`+${count - limit} more`);
    }
    return parts.join(', ');
  }

  getBuildChecklistText() {
    const activeNodes = this.getQuotaDeliveryNodes().filter((node) => !node.completed);
    const activeShortcuts = this.getShortcutDeliveryNodes().filter((node) => !node.completed);
    const demands = activeNodes.map((node) => node?.condition).filter(Boolean);
    const needsColor = demands.some((condition) => condition.itemColor);
    const needsExact = demands.some((condition) => condition.exact);
    const highestTier = Math.max(2, ...demands.map((condition) => condition.tier || 2));
    const steps = [`make L${highestTier}`, 'connect source -> operator -> delivery'];

    if (needsExact) steps.push('avoid over-leveling exact orders');
    if (needsColor) steps.push('match color for bonus');
    if (activeShortcuts.length > 0) steps.push('optional key order opens a shortcut');

    return `${steps.join(' | ')} | ${this.formatRoundTime(this.getRoundTimeLimitSeconds())}`;
  }

  formatDeliveryConditionHud(condition) {
    if (!condition) return '';
    const tier = condition.tier || 1;
    const tierLabel = `${condition.exact ? '=' : ''}L${tier}${condition.exact ? '' : '+'}`;
    const colorLabel = condition.itemColor
      ? getItemColorName(condition.itemColor).charAt(0).toUpperCase()
      : null;
    const count = Math.max(1, condition.requiredCount || 1);
    return [colorLabel, tierLabel, `x${count}`].filter(Boolean).join(' ');
  }

  updateRoundUI() {
    this.updateRoundState();
    if (this.eraText) {
      this.eraText.setText(`${this.currentRound}`);
    }
    const activeNodes = this.getQuotaDeliveryNodes().filter((node) => !node.completed);
    activeNodes.forEach((node) => {
      if (typeof node.updateProgressVisuals === 'function') {
        node.updateProgressVisuals();
      }
    });
    if (this.scrapText) {
      this.scrapText.setText(`${this.getRemainingSourceResources()}`);
    }
    this.updateScoreText();
    if (this.moneyText) {
      const interest = this.getProjectedInterest();
      this.setStatChipValue(
        this.moneyText,
        interest > 0 ? `$${this.money} +${interest}` : `$${this.money}`
      );
    }
    this.machineFactory?.updatePanelSelectionHighlights?.();
    this.updateFlowHud();
    const visibleNodes = activeNodes.slice(0, 3);
    const cappedScore = Math.min(this.roundScore || 0, this.roundQuota || 0);
    const quota = this.roundQuota || 0;
    if (this.deliveryQuotaText) {
      this.deliveryQuotaText.setText(`$${cappedScore} / $${quota}`);
    }
    if (this.deliveryProgressFill && this.deliveryProgressTrack) {
      const progress = quota > 0 ? Phaser.Math.Clamp(cappedScore / quota, 0, 1) : 0;
      this.deliveryProgressFill.width = this.deliveryProgressTrack.width * progress;
      this.deliveryProgressFill.fillColor =
        progress >= 1 ? 0x88ffcc : progress >= 0.65 ? 0xffd166 : 0x88ccff;
      if (cappedScore > (this.lastQuotaHudScore || 0)) {
        this.pulseDeliveryProgress();
      }
      this.lastQuotaHudScore = cappedScore;
    }
    if (this.deliveryBoardText) {
      const phaseLabel =
        this.runState === 'BUILD_PHASE'
          ? 'Plan'
          : this.runState === 'ROUND_ACTIVE'
            ? 'Live'
            : 'Cleared';
      const pacing = this.getRoundPacing(this.currentRound);
      this.deliveryBoardText.setText(`${phaseLabel} - ${pacing.stageName}`);
    }
    if (this.deliveryDemandText) {
      const outputLines =
        activeNodes.length > 0
          ? [
              ...visibleNodes.map((node) =>
                typeof node.getCompactHudLabel === 'function'
                  ? node.getCompactHudLabel()
                  : node.getHudLabel()
              ),
              activeNodes.length > visibleNodes.length
                ? `+${activeNodes.length - visibleNodes.length} more`
                : null,
            ].filter(Boolean)
          : ['No active deliveries'];
      this.deliveryDemandText.setText(outputLines.join('\n'));
    }
    if (this.nextDemandText) {
      if (this.runState === 'BUILD_PHASE') {
        this.nextDemandText.setText(`Plan: ${this.getBuildChecklistText()}`);
        this.nextDemandText.setColor('#88ffcc');
      } else if (this.runState === 'ROUND_ACTIVE') {
        this.nextDemandText.setText(this.getLastDeliveryFormulaText());
        this.nextDemandText.setColor('#ffe28a');
      } else {
        const payout = this.getRoundCashPayoutBreakdown();
        const bonus = this.lastRoundPaidBeltFreeBonus || this.getPaidBeltFreeClearBonus();
        this.nextDemandText.setText(
          `Cash: $${payout.quotaCash} quota + $${payout.overDeliveryCash} over${
            bonus > 0 ? ` + $${bonus} no paid belts` : ''
          }`
        );
        this.nextDemandText.setColor('#88ffcc');
      }
    }
    if (this.deliveryStatusText) {
      if (this.runState === 'BUILD_PHASE') {
        this.deliveryStatusText.setText(this.formatRoundTime(this.getRoundTimeLimitSeconds()));
        this.deliveryStatusText.setColor('#88ffcc');
      } else if (this.runState === 'ROUND_ACTIVE') {
        if (this.roundSurvived) {
          this.deliveryStatusText.setText('Clearing');
          this.deliveryStatusText.setColor('#88ffcc');
        } else if (this.getRoundTimeRemainingSeconds() <= 10) {
          this.deliveryStatusText.setText(`Time ${this.formatRoundTime()}`);
          this.deliveryStatusText.setColor('#ff8888');
        } else if (this.getRemainingSourceResources() > 0) {
          this.deliveryStatusText.setText(`Time ${this.formatRoundTime()}`);
          this.deliveryStatusText.setColor('#88ccff');
        } else if (this.roundExhaustionStartedAt) {
          const graceMs = GAME_CONFIG.roundExhaustionGraceMs || 4500;
          const remaining = Math.max(
            0,
            graceMs - ((this.time?.now || 0) - this.roundExhaustionStartedAt)
          );
          this.deliveryStatusText.setText(`Empty ${Math.ceil(remaining / 1000)}s`);
          this.deliveryStatusText.setColor('#ff8888');
        } else {
          this.deliveryStatusText.setText('Supply empty');
          this.deliveryStatusText.setColor('#ff8888');
        }
      } else {
        this.deliveryStatusText.setText(`Cash $${this.money || 0}`);
        this.deliveryStatusText.setColor('#88ccff');
      }
    }
    this.updateActionHint();
    this.updateDraftCycleButton();
    this.updateResetBoardButton();
    this.updateRoundAdvanceButton();
  }

  updateActionHint() {
    if (!this.actionHintBar) return;

    const selected = this.machineFactory?.selectedMachineType || this.selectedMachineType;
    if (selected) {
      const label = selected.pieceShortName || selected.pieceName || selected.name || selected.id;
      const cost =
        typeof this.getMachinePlacementCost === 'function'
          ? this.getMachinePlacementCost(selected)
          : selected.placementCost || 0;
      const color = cost && this.money < cost ? 0xff8888 : 0x88ffcc;
      const action =
        selected.id === 'conveyor'
          ? 'Drag a belt path. Click-drag from any empty cell for quick belts.'
          : 'Click the grid to place. R rotates the piece, Esc cancels.';
      this.setActionHint(`Placing ${label}`, cost ? `$${cost} to place. ${action}` : action, color);
      return;
    }

    if (this.runState === 'BUILD_PHASE') {
      const activeNodes = (this.deliveryNodes || []).filter((node) => !node.completed);
      const hasMachines = (this.machines || []).length > 0;
      const title = `Build Round ${this.currentRound}`;
      const body = hasMachines
        ? 'Connect sources to deliveries, then start the round when the path looks ready.'
        : activeNodes.length > 0
          ? 'Pick an operator from the bottom deck, then connect it with belts.'
          : 'Study the board, draft a piece, and prepare the first route.';
      this.setActionHint(title, body, 0x88ffcc);
      return;
    }

    if (this.runState === 'ROUND_ACTIVE') {
      const timeLeft = this.formatRoundTime();
      const supply = this.getRemainingSourceResources();
      const body = this.roundSurvived
        ? 'Quota met. Let the remaining items finish clearing.'
        : `Watch for stalls. ${timeLeft} left, ${supply} supply remaining.`;
      this.setActionHint('Round Live', body, this.roundSurvived ? 0x88ffcc : 0x88ccff);
      return;
    }

    this.setActionHint(
      'Round Cleared',
      'Collect rewards, improve the run, and prep the next board.',
      0xffd166
    );
  }

  addMoney(amount, reason = '') {
    if (!amount || this.gameOver) return;
    this.money = Math.max(0, Math.floor(this.money + amount));
    this.updateRoundUI();
    if (reason) {
      this.showMoneyFeedback(amount, reason);
    }
  }

  getBaseInterest(money = this.money) {
    return this.economyManager?.getInterestForMoney?.(money) || 0;
  }

  getBuildIdentityFocusLevel(identityId) {
    return this.upgradeManager?.getBuildIdentityFocusLevel?.(identityId) || 0;
  }

  getPrimaryBuildIdentity(minScore = 2) {
    return this.upgradeManager?.getPrimaryBuildIdentity?.(minScore) || null;
  }

  getCapitalEdgeDividend(edge = this.capitalEdge) {
    const base = this.economyManager?.getCapitalEdgeDividend?.(edge) || 0;
    return base + this.getBuildIdentityFocusLevel('capital');
  }

  getProjectedInterest(money = this.money) {
    const baseInterest = this.getBaseInterest(money);
    const dividend = this.getCapitalEdgeDividend();
    const floatBonus =
      baseInterest + dividend > 0 && typeof this.upgradeManager?.getClosingFloatBonus === 'function'
        ? this.upgradeManager.getClosingFloatBonus()
        : 0;
    return baseInterest + dividend + floatBonus;
  }

  growCapitalEdge(baseInterest) {
    const gain = this.economyManager?.getCapitalEdgeGain?.(baseInterest, this.currentRound) || 0;
    if (gain <= 0) return 0;

    const maxEdge = this.economyManager?.getMaxCapitalEdge?.() || 0;
    const nextEdge =
      maxEdge > 0
        ? Math.min(maxEdge, (this.capitalEdge || 0) + gain)
        : (this.capitalEdge || 0) + gain;
    const actualGain = Math.max(0, nextEdge - (this.capitalEdge || 0));
    this.capitalEdge = nextEdge;
    return actualGain;
  }

  grantRoundInterest() {
    const baseInterest = this.getBaseInterest(this.money);
    const edgeGain = this.growCapitalEdge(baseInterest);
    const dividend = this.getCapitalEdgeDividend();
    const floatBonus =
      baseInterest + dividend > 0 && typeof this.upgradeManager?.getClosingFloatBonus === 'function'
        ? this.upgradeManager.getClosingFloatBonus()
        : 0;
    const interest = baseInterest + dividend + floatBonus;
    this.lastRoundCapitalEdgeGain = edgeGain;
    this.lastRoundCapitalDividend = dividend;
    if (interest <= 0) return 0;

    this.addMoney(interest);
    return interest;
  }

  showMoneyFeedback(amount, reason) {
    const isScoreBonus = reason === 'time bonus';
    const prefix = amount >= 0 ? '+' : '';
    const valueText = isScoreBonus ? `${prefix}${amount}` : `${prefix}$${amount}`;
    const text = this.add
      .text(this.scale.width - this.rightPanelWidth - 20, 72, `${valueText} ${reason}`, {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: amount >= 0 ? '#88ffcc' : '#ff8888',
        align: 'right',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 48,
      alpha: 0,
      duration: 850,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  pulseUIButton(buttonBundle, options = {}) {
    if (!buttonBundle?.button || !buttonBundle?.text) return null;

    const targets = [buttonBundle.button, buttonBundle.text];
    this.tweens.killTweensOf(targets);
    return this.tweens.add({
      targets,
      scaleX: options.scale || 1.05,
      scaleY: options.scale || 1.05,
      duration: options.duration || 460,
      yoyo: true,
      repeat: options.repeat ?? 0,
      ease: options.ease || 'Sine.easeInOut',
    });
  }

  pulseDeliveryProgress() {
    const targets = [this.deliveryProgressFill, this.deliveryQuotaText].filter(Boolean);
    if (targets.length === 0) return;

    this.tweens.killTweensOf(targets);
    targets.forEach((target) => target.setScale?.(1));
    this.tweens.add({
      targets,
      scaleX: 1.04,
      scaleY: 1.28,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  startButtonReadyPulse() {
    if (!this.startRoundButton || this.startRoundButtonPulse) return;

    this.startRoundButtonPulse = this.pulseUIButton(this.startRoundButton, {
      scale: 1.04,
      duration: 760,
      repeat: -1,
    });
  }

  stopButtonReadyPulse() {
    if (!this.startRoundButton) return;

    if (this.startRoundButtonPulse) {
      this.startRoundButtonPulse.stop();
      this.startRoundButtonPulse = null;
    }
    this.tweens.killTweensOf([this.startRoundButton.button, this.startRoundButton.text]);
    this.startRoundButton.button.setScale(1);
    this.startRoundButton.text.setScale(1);
  }

  updateRoundAdvanceButton() {
    if (!this.startRoundButton) return;

    const canStartRound = this.runState === 'BUILD_PHASE' && !this.roundClearing && !this.gameOver;
    const visible = canStartRound;

    this.startRoundButton.text.setText(`START R${this.currentRound}`);
    this.startRoundButton.button.setVisible(visible);
    this.startRoundButton.text.setVisible(visible);

    this.startRoundButton.button.fillColor = 0x2c7a55;
    this.startRoundButton.button.defaultFillColor = 0x2c7a55;
    this.startRoundButton.button.hoverFillColor = 0x3f9f72;
    this.startRoundButton.button.setStrokeStyle(2, 0x88ffcc);

    if (visible) {
      this.startRoundButton.button.setInteractive({ useHandCursor: true });
      this.startRoundButton.button.setAlpha(1);
      this.startRoundButton.text.setAlpha(1);
      this.startButtonReadyPulse();
    } else {
      this.startRoundButton.button.disableInteractive();
      this.startRoundButton.button.setAlpha(1);
      this.startRoundButton.text.setAlpha(1);
      this.stopButtonReadyPulse();
    }
  }

  showBoardRevealJuice(board) {
    if (!this.grid || !board) return;

    if (this.boardRevealGraphics) {
      this.boardRevealGraphics.destroy();
    }

    const graphics = this.add.graphics();
    graphics.setDepth(6);
    this.addToWorld(graphics);
    const cellSize = this.grid.cellSize;

    for (const blocker of board.blockers || []) {
      const topLeft = this.grid.gridToWorldTopLeft(blocker.x, blocker.y);
      if (!topLeft) continue;
      graphics.lineStyle(2, 0xb9f7ff, 0.9);
      graphics.strokeRect(topLeft.x + 2, topLeft.y + 2, cellSize - 4, cellSize - 4);
    }

    const markRows = (rows, color) => {
      rows.forEach((row) => {
        const left = this.grid.gridToWorldTopLeft(0, row);
        if (!left) return;
        graphics.lineStyle(2, color, 0.5);
        graphics.strokeRect(left.x + 2, left.y + 2, this.grid.width * cellSize - 4, cellSize - 4);
      });
    };
    markRows(board.sourceRows || [], 0x88ffcc);
    markRows(board.deliveryRows || [], 0xffd166);
    for (const tile of board.specialTiles || []) {
      const center = this.grid.gridToWorld(tile.x, tile.y);
      const style = BOARD_TILE_STYLES[tile.type] || {};
      graphics.lineStyle(3, style.glowColor || style.borderColor || 0xffffff, 0.85);
      graphics.strokeCircle(center.x, center.y, cellSize * 0.45);
    }

    for (const shortcut of board.shortcutContracts || []) {
      const center = this.grid.gridToWorld(shortcut.x, shortcut.y);
      if (center) {
        graphics.lineStyle(3, 0x83f7ff, 0.95);
        graphics.strokeCircle(center.x, center.y, cellSize * 0.5);
        const labelText = shortcut.kind === 'color-toll' ? 'COLOR TOLL' : 'KEY ORDER';
        const label = this.add
          .text(center.x, center.y - 24, labelText, {
            fontFamily: 'Arial Black',
            fontSize: 10,
            color: '#83f7ff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5);
        label.setDepth(8);
        this.addToWorld(label);
        this.tweens.add({
          targets: label,
          y: label.y - 10,
          alpha: 0,
          duration: 1250,
          ease: 'Power2',
          onComplete: () => label.destroy(),
        });
      }

      for (const cell of shortcut.unlockCells || []) {
        const topLeft = this.grid.gridToWorldTopLeft(cell.x, cell.y);
        if (!topLeft) continue;
        graphics.lineStyle(3, 0x83f7ff, 0.78);
        graphics.strokeRect(topLeft.x + 4, topLeft.y + 4, cellSize - 8, cellSize - 8);
      }
    }

    for (const loaner of board.loanerUndergrounds || []) {
      const start = this.grid.gridToWorld(loaner.x, loaner.y);
      const endOffset =
        loaner.direction === 'down'
          ? { x: 0, y: 3 }
          : loaner.direction === 'up'
            ? { x: 0, y: -3 }
            : loaner.direction === 'left'
              ? { x: -3, y: 0 }
              : { x: 3, y: 0 };
      const end = this.grid.gridToWorld(loaner.x + endOffset.x, loaner.y + endOffset.y);
      if (!start || !end) continue;

      graphics.lineStyle(4, 0x83f7ff, 0.85);
      graphics.strokeCircle(start.x, start.y, cellSize * 0.42);
      graphics.strokeCircle(end.x, end.y, cellSize * 0.42);
      graphics.lineStyle(3, 0x83f7ff, 0.65);
      graphics.lineBetween(start.x, start.y, end.x, end.y);

      const label = this.add
        .text(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2 - 18,
          loaner.gimmickType === 'overpass' ? 'OVERPASS' : 'FREE TUNNEL',
          {
            fontFamily: 'Arial Black',
            fontSize: 10,
            color: '#b9f7ff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
          }
        )
        .setOrigin(0.5);
      label.setDepth(8);
      this.addToWorld(label);
      this.tweens.add({
        targets: label,
        y: label.y - 12,
        alpha: 0,
        duration: 1250,
        ease: 'Power2',
        onComplete: () => label.destroy(),
      });
    }

    this.boardRevealGraphics = graphics;
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 1100,
      ease: 'Power2',
      onComplete: () => {
        graphics.destroy();
        if (this.boardRevealGraphics === graphics) {
          this.boardRevealGraphics = null;
        }
      },
    });
  }

  getMachinePlacementCost(machineType, options = {}) {
    if (typeof options.boardTaxSurcharge === 'number') {
      return this.getMachinePlacementCostBase(machineType) + options.boardTaxSurcharge;
    }
    return this.getMachinePlacementCostBase(machineType);
  }

  getMachinePlacementCostBase(machineType) {
    if (machineType?.isRelocation && typeof machineType.placementCost === 'number') {
      return machineType.placementCost;
    }
    if (typeof machineType?.placementCost === 'number' && machineType.specialLogisticsSource) {
      return machineType.placementCost;
    }
    if (machineType?.isLogisticsBeltPiece) {
      return GAME_CONFIG.machinePlacementCosts?.logisticsBeltPiece || 0;
    }
    const costs = GAME_CONFIG.machinePlacementCosts || {};
    const id = machineType?.id || '';
    if (id === 'conveyor') return costs.conveyor || 1;
    if (id === 'splitter') return costs.splitter || 4;
    if (id === 'filter-splitter') return costs['filter-splitter'] || 42;
    if (id === 'merger') return costs.merger || 4;
    if (id === 'underground-belt') return costs['underground-belt'] || 5;
    if (id === 'painter') return costs.painter || 3;

    if (isProcessingPieceBodyId(id)) {
      const operationKey = this.getOperatorCostKey(machineType);
      const operationCost = costs[operationKey] || costs.operator || 8;
      const body = getProcessingPieceBody(machineType?.bodyId || id);
      const bodyPremium = body?.isComplexBody ? costs.complexBodyPremium || 0 : 0;
      return operationCost + bodyPremium;
    }
    return 3;
  }

  getOperatorCostKey(machineType) {
    const operation = machineType?.arithmeticOperation;
    if (!operation) return 'operator';

    switch (operation.type) {
      case 'add-constant':
        return operation.value >= 2 ? 'booster' : 'refiner';
      case 'add':
        return 'adder';
      case 'multiply':
        return 'multiplier';
      case 'divide':
        return 'divider';
      default:
        return 'operator';
    }
  }

  isExpensiveOperator(machineOrType) {
    if (!machineOrType) return false;
    const threshold = GAME_CONFIG.machinePlacementCosts?.expensiveOperatorThreshold || 20;
    const cost =
      typeof machineOrType.placementCost === 'number'
        ? machineOrType.placementCost
        : this.getMachinePlacementCost(machineOrType);
    return cost >= threshold;
  }

  canAffordMachine(machineType) {
    return this.money >= this.getMachinePlacementCost(machineType);
  }

  getMachineBoardFootprint(machineType, gridX, gridY, direction) {
    if (!machineType?.shape || !this.grid) return [];

    const shape = this.grid.getRotatedShape(machineType.shape, direction);
    const cells = [];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 1) continue;
        cells.push({ x: gridX + x, y: gridY + y });
      }
    }
    return cells;
  }

  getBoardTilePlacementEffects(machineType, gridX, gridY, direction) {
    const effects = {
      tiles: [],
      hasPower: false,
      hasQuality: false,
      taxedCells: 0,
      boardTaxSurcharge: 0,
    };

    for (const footprintCell of this.getMachineBoardFootprint(
      machineType,
      gridX,
      gridY,
      direction
    )) {
      const cell = this.grid.getCell(footprintCell.x, footprintCell.y);
      if (cell?.type !== 'board-tile') continue;

      const tile = { x: footprintCell.x, y: footprintCell.y, type: cell.tileType };
      effects.tiles.push(tile);
      if (cell.tileType === BOARD_TILE_TYPES.POWER) effects.hasPower = true;
      if (cell.tileType === BOARD_TILE_TYPES.QUALITY) effects.hasQuality = true;
      if (cell.tileType === BOARD_TILE_TYPES.TAXED) effects.taxedCells++;
    }

    effects.boardTaxSurcharge = effects.taxedCells * (GAME_CONFIG.boardTaxedCellSurcharge || 3);
    return effects;
  }

  applyBoardTileEffectsToMachine(machine, effects) {
    if (!machine || !effects) return;

    machine.boardTileEffects = effects;
    if (effects.hasPower && typeof machine.setProcessingTimeModifier === 'function') {
      machine.setProcessingTimeModifier(
        'board-power',
        GAME_CONFIG.boardPowerProcessingMultiplier || 0.78
      );
      machine.boardPowerActive = true;
      this.showProcessorReplacementFeedback('Power cell\nspeed boost');
    }

    if (effects.hasQuality) {
      machine.boardQualityLevelBonus = GAME_CONFIG.boardQualityLevelBonus || 1;
      this.showProcessorReplacementFeedback('Quality cell\n+1 output');
    }
  }

  setProductionPaused(paused) {
    if (this.gameTimer) {
      this.gameTimer.paused = paused;
    }
    if (this.contractTimerEvent) {
      this.contractTimerEvent.paused = paused;
    }
    this.resourceNodes?.forEach((node) => {
      if (node?.resourceTimer) {
        node.resourceTimer.paused = paused;
      }
    });
  }

  setBuildPhaseUIVisible(_visible) {
    if (!this.startRoundButton) return;

    this.updateRoundAdvanceButton();
    this.updateDraftCycleButton();
  }

  beginActiveRound() {
    if (this.gameOver || this.paused || this.runState === 'ROUND_ACTIVE') return;

    this.setRoundPhase('ROUND_ACTIVE');
    this.roundClearing = false;
    this.roundStartedAt = this.time?.now || 0;
    this.roundTimeRemainingMs = this.roundTimeLimitMs || 0;
    this.roundEndsAt = this.roundStartedAt + (this.roundTimeLimitMs || 0);
    this.setProductionPaused(false);
    this.setBuildPhaseUIVisible(false);
    this.updateRoundUI();
    this.playSound('round-start');
    this.showRoundStartFeedback(this.currentRound);
  }

  startRound(round = this.currentRound, options = {}) {
    this.destroyRoundEconomySummary();
    this.currentRound = round;
    if (this.shouldShowTutorialPanel()) {
      this.createTutorialPanel();
    } else {
      this.destroyTutorialPanel();
    }
    this.roundClearing = false;
    this.roundExhaustionStartedAt = null;
    this.lastQuotaHudScore = 0;
    this.pendingDeliveryCompletionScore = 0;
    this.lastRoundTimeBonus = 0;
    this.lastRoundSpeedScrap = 0;
    this.lastRoundQuotaPayout = 0;
    this.lastRoundOverDelivery = 0;
    this.lastRoundPaidBeltFreeBonus = 0;
    this.lastRoundReinvestmentCash = 0;
    this.lastDeliveryBreakdown = null;
    this.resetRoundPaidBeltUsage();
    this.roundTimeLimitMs = this.getRoundTimeLimitSeconds(round) * 1000;
    this.roundTimeRemainingMs = this.roundTimeLimitMs;
    this.roundEndsAt = 0;
    this.deliveryRejectionStats = {};
    this.lastDeliveryRejection = null;
    this.lastFailureSummary = null;
    this.freeDraftRedrawsRemaining = this.hasFreeDraftRedrawPerRound()
      ? GAME_CONFIG.metaProgression?.freeDraftRedrawsPerRound || 1
      : 0;
    this.updateActiveUpgradesDisplay();
    const board = this.applyRoundBoard(round);
    this.buildRound();
    const minimumBudget = this.getRoundStartingMoney(round);
    this.lastRoundBudgetInjection = Math.max(0, minimumBudget - (this.money || 0));
    this.money = Math.max(this.money || 0, minimumBudget);
    this.applyBudgetCarryoverCap(round);
    this.createInitialResourceNodes();
    if (this.machineFactory) {
      this.machineFactory.refreshAvailableProcessors();
      this.machineFactory.displayCurrentProcessorPreview();
    }
    this.roundState = this.createRoundState(round, board);
    this.updateRoundUI();
    this.maybeShowDemandMilestone();

    if (options.buildPhase) {
      this.setRoundPhase('BUILD_PHASE');
      this.setProductionPaused(true);
      this.setBuildPhaseUIVisible(true);
      this.playSound('build-phase');
      this.showBuildPhaseFeedback(round);
      this.updateRoundUI();
      return;
    }

    this.setRoundPhase('BUILD_PHASE');
    this.beginActiveRound();
  }

  showBuildPhaseFeedback(round) {
    const text = this.add
      .text(
        this.scale.width / 2 - this.rightPanelWidth / 2,
        78,
        `BUILD R${round}\n${this.getRoundPacingLabel(round)}\n${this.getRoundBoardSummary(round)}`,
        {
          fontFamily: 'Arial Black',
          fontSize: 22,
          color: '#88ffcc',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 52,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  maybeShowDemandMilestone() {
    const activeDemands = this.getQuotaDeliveryNodes()
      .map((node) => node?.condition)
      .filter(Boolean);
    if (!this.exactDemandExplained && activeDemands.some((condition) => condition.exact)) {
      this.exactDemandExplained = true;
      const exactDemand = activeDemands.find((condition) => condition.exact);
      this.showDemandMilestoneFeedback(
        'EXACT DEMAND',
        `Only L${exactDemand.tier} counts here`,
        '#ffd166'
      );
      return;
    }
  }

  showDemandMilestoneFeedback(title, subtitle, color = '#ffd166') {
    const text = this.add
      .text(this.scale.width / 2 - this.rightPanelWidth / 2, 130, `${title}\n${subtitle}`, {
        fontFamily: 'Arial Black',
        fontSize: 22,
        color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 96,
      alpha: 0,
      duration: 1600,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  showRoundStartFeedback(round) {
    const text = this.add
      .text(
        this.scale.width / 2 - this.rightPanelWidth / 2,
        78,
        `ROUND ${round}\n${this.getRoundPacingLabel(round)}\n${this.getRoundBoardSummary(round)}`,
        {
          fontFamily: 'Arial Black',
          fontSize: 22,
          color: '#ffffff',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 52,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  getDeliveryNodeCompletionScore(node) {
    const base = Math.max(0, Math.floor(node?.condition?.completionScoreReward || 0));
    const jackpotPrimerActive =
      this.upgradeManager?.isProceduralUpgradeActive('spark_jackpot_primer') &&
      !this.starterJackpotPrimerSpent;
    return jackpotPrimerActive ? base * 2 : base;
  }

  getDeliveryNodeCompletionScrap(node) {
    const base = Math.max(0, Math.floor(node?.condition?.completionScrapReward || 0));
    const jackpotPrimerActive =
      this.upgradeManager?.isProceduralUpgradeActive('spark_jackpot_primer') &&
      !this.starterJackpotPrimerSpent;
    return jackpotPrimerActive ? base * 2 : base;
  }

  onDeliveryNodeCompleted(node) {
    if (!node || node.completionRewardClaimed) return;
    node.completionRewardClaimed = true;
    const rewardsEnabled = node.condition?.countsForQuota !== false;
    const procurementRebate =
      rewardsEnabled && typeof this.upgradeManager?.getProcurementRebate === 'function'
        ? this.upgradeManager.getProcurementRebate()
        : 0;
    const boonRebate =
      rewardsEnabled && this.upgradeManager?.isProceduralUpgradeActive('boon_procurement_engine')
        ? 3
        : 0;
    const scoreReward = rewardsEnabled ? this.getDeliveryNodeCompletionScore(node) : 0;
    this.playSound('delivery');
    if (procurementRebate + boonRebate > 0) {
      this.addMoney(procurementRebate + boonRebate, 'delivery refund');
    }
    this.queueDeliveryCompletionScore(scoreReward);
    if (node.condition?.shortcut) {
      this.unlockBoardShortcut(node);
    }
    this.updateRoundUI();
    this.tryCompleteRound();
  }

  clearRound() {
    if (this.roundClearing) return;
    this.roundClearing = true;
    this.lastRoundClearWasStretchComplete = this.areDeliveryNodesComplete();
    this.lastRoundTimeBonus = this.awardRoundTimeBonus();
    this.lastRoundSpeedScrap = this.getRoundSpeedScrap();
    this.setRoundPhase('ROUND_CLEARED');
    const pacing = this.getRoundPacing(this.currentRound);
    const payout = this.getRoundCashPayoutBreakdown();
    const paidBeltFreeBonus = this.getPaidBeltFreeClearBonus();
    let reinvestedBudget = 0;
    this.lastRoundQuotaPayout = payout.quotaCash;
    this.lastRoundOverDelivery = payout.overDeliveryCash;
    this.lastRoundPaidBeltFreeBonus = paidBeltFreeBonus;
    this.lastRoundReinvestmentCash = 0;
    this.addMoney(payout.quotaCash + payout.overDeliveryCash + paidBeltFreeBonus);
    if (this.upgradeManager?.isProceduralUpgradeActive('boon_reinvestment_loop')) {
      reinvestedBudget = Math.floor(payout.overDeliveryRevenue / 500);
      if (reinvestedBudget > 0) {
        this.lastRoundReinvestmentCash = reinvestedBudget;
        this.addMoney(reinvestedBudget, 'reinvest');
      }
    }
    this.lastRoundInterest = this.grantRoundInterest();
    this.applyBudgetCarryoverCap(this.currentRound + 1);
    this.playSound('round-clear');
    this.showRoundClearFeedback();
    this.maybeUnlockAdvancedLogistics(pacing);

    const entitiesToClear =
      (this.machines?.length || 0) +
      (this.resourceNodes?.length || 0) +
      (this.deliveryNodes?.length || 0);
    this.time.delayedCall(650, () => {
      this.clearPlacedItems({
        salvage: false,
        clearMachines: true,
        clearResources: true,
        clearDeliveries: true,
      });
      const nextRoundDelay = Math.max(900, entitiesToClear * 50 + 700);
      this.time.delayedCall(nextRoundDelay, () => {
        this.showRoundEconomySummary();
      });
    });
  }

  awardRoundTimeBonus() {
    return 0;
  }

  showRoundClearFeedback() {
    const rank = this.getRoundClearRankInfo();
    const x = this.scale.width / 2 - this.rightPanelWidth / 2;
    const y = 118;
    const text = this.add
      .text(x, y, rank.label, {
        fontFamily: 'Arial Black',
        fontSize: 72,
        color: rank.color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);
    this.cameras.main.flash(180, 120, 255, 210, true);

    this.tweens.add({
      targets: text,
      scaleX: 1.32,
      scaleY: 1.32,
      alpha: 0,
      duration: 1100,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  showOverDeliveryFeedback(amount) {
    const value = Math.max(0, Math.floor(amount || 0));
    if (value <= 0) return;

    const x = this.scale.width / 2 - this.rightPanelWidth / 2;
    const text = this.add
      .text(x, 206, `+$${value}`, {
        fontFamily: 'Arial Black',
        fontSize: 54,
        color: '#ffd166',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1001);
    this.addToUI(text);

    this.tweens.add({
      targets: text,
      y: 176,
      scaleX: 1.22,
      scaleY: 1.22,
      alpha: 0,
      duration: 1150,
      ease: 'Back.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  getRoundEconomySummaryRows() {
    const payout = this.getRoundCashPayoutBreakdown();
    const shippedRevenue = payout.quotaRevenue + payout.overDeliveryRevenue;
    const convertedCash = (this.lastRoundQuotaPayout || 0) + (this.lastRoundOverDelivery || 0);
    const paidBeltCount = Math.max(0, Math.floor(this.paidBeltPlacementsThisRound || 0));
    const paidBeltSpend = Math.max(0, Math.floor(this.paidBeltSpendThisRound || 0));
    const noPaidBeltBonus = Math.max(0, Math.floor(this.lastRoundPaidBeltFreeBonus || 0));
    const reinvestmentCash = Math.max(0, Math.floor(this.lastRoundReinvestmentCash || 0));
    const interestCash = Math.max(0, Math.floor(this.lastRoundInterest || 0));
    const conversionPercent = Math.round((payout.multiplier || 0) * 100);
    const rows = [
      {
        label: 'Revenue shipped',
        value: `$${shippedRevenue}`,
        detail: `$${payout.quotaRevenue} quota${
          payout.overDeliveryRevenue > 0 ? ` + $${payout.overDeliveryRevenue} over` : ''
        }`,
        color: '#ffe28a',
      },
      {
        label: 'Cash conversion',
        value: `+$${convertedCash}`,
        detail: `${conversionPercent}% of shipped revenue becomes shop cash`,
        color: '#88ffcc',
      },
      {
        label: 'Paid belt bonus',
        value: noPaidBeltBonus > 0 ? `+$${noPaidBeltBonus}` : '$0',
        detail:
          paidBeltCount > 0
            ? `${paidBeltCount} paid belt${paidBeltCount === 1 ? '' : 's'} used for $${paidBeltSpend}`
            : 'No paid conveyor belts used',
        color: noPaidBeltBonus > 0 ? '#83f7ff' : '#b7cbd6',
      },
    ];

    if (reinvestmentCash > 0) {
      rows.push({
        label: 'Reinvestment',
        value: `+$${reinvestmentCash}`,
        detail: 'Over-delivery turned into extra budget',
        color: '#ffd166',
      });
    }

    rows.push({
      label: 'Interest',
      value: `+$${interestCash}`,
      detail:
        this.lastRoundCapitalDividend > 0
          ? `Includes capital edge +$${this.lastRoundCapitalDividend}`
          : this.lastRoundCapitalEdgeGain > 0
            ? `Capital edge grew by ${this.lastRoundCapitalEdgeGain}`
            : 'Based on cash held after payout',
      color: interestCash > 0 ? '#ffd166' : '#b7cbd6',
    });

    return rows;
  }

  showRoundEconomySummary() {
    if (this.gameOver) return;
    this.destroyRoundEconomySummary();

    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(680, Math.max(300, width - 36));
    const panelHeight = Math.min(520, Math.max(360, height - 58));
    const panelX = Phaser.Math.Clamp(
      width / 2 - this.rightPanelWidth / 2,
      panelWidth / 2 + 18,
      width - panelWidth / 2 - 18
    );
    const panelY = height / 2;
    const top = panelY - panelHeight / 2;
    const left = panelX - panelWidth / 2;
    const rows = this.getRoundEconomySummaryRows();
    const rowTop = top + 108;
    const footerY = top + panelHeight - 88;
    const preferredRowHeight = panelHeight < 470 ? 54 : 62;
    const rowHeight = Phaser.Math.Clamp(
      Math.floor((footerY - rowTop - 10) / Math.max(1, rows.length)),
      48,
      preferredRowHeight
    );
    const compactRows = rowHeight < 56;
    const totalCash =
      (this.lastRoundQuotaPayout || 0) +
      (this.lastRoundOverDelivery || 0) +
      (this.lastRoundPaidBeltFreeBonus || 0) +
      (this.lastRoundReinvestmentCash || 0) +
      (this.lastRoundInterest || 0);
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(2100);
    const blocker = this.add
      .rectangle(0, 0, width, height, 0x03070c, 0.84)
      .setOrigin(0, 0)
      .setInteractive();
    const panel = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x09131d, 0.98)
      .setStrokeStyle(2, 0x70d6ff, 0.9);
    const accent = this.add.rectangle(left, top, 7, panelHeight, 0x88ffcc, 0.95).setOrigin(0, 0.5);
    const title = this.add
      .text(panelX, top + 38, `ROUND ${this.currentRound} CLEAR`, {
        fontFamily: 'Arial Black',
        fontSize: panelHeight < 470 ? 22 : 26,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(panelX, top + 70, 'Revenue clears the map. Cash funds the shop.', {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#b7cbd6',
        align: 'center',
      })
      .setOrigin(0.5);
    container.add([blocker, panel, accent, title, subtitle]);

    rows.forEach((row, index) => {
      const y = rowTop + index * rowHeight;
      const rowBg = this.add
        .rectangle(panelX, y + rowHeight / 2, panelWidth - 48, rowHeight - 8, 0x132232, 0.72)
        .setStrokeStyle(1, 0x2f4d62, 0.6);
      const label = this.add
        .text(left + 38, y + (compactRows ? 14 : 17), row.label, {
          fontFamily: 'Arial Black',
          fontSize: compactRows ? 12 : 13,
          color: '#f4fbff',
        })
        .setOrigin(0, 0.5);
      const detail = this.add
        .text(left + 38, y + (compactRows ? 33 : 39), row.detail, {
          fontFamily: 'Arial',
          fontSize: compactRows ? 11 : 12,
          color: '#b7cbd6',
          wordWrap: { width: panelWidth - 210 },
        })
        .setOrigin(0, 0.5);
      const value = this.add
        .text(left + panelWidth - 42, y + rowHeight / 2, row.value, {
          fontFamily: 'Arial Black',
          fontSize: compactRows ? 18 : 20,
          color: row.color,
          align: 'right',
        })
        .setOrigin(1, 0.5);
      container.add([rowBg, label, detail, value]);
    });

    const total = this.add
      .text(
        panelX,
        footerY,
        `Cash gained this round: +$${totalCash}     Current cash: $${this.money || 0}`,
        {
          fontFamily: 'Arial Black',
          fontSize: 15,
          color: '#88ffcc',
          align: 'center',
        }
      )
      .setOrigin(0.5);
    const button = this.add
      .rectangle(panelX, top + panelHeight - 38, 240, 44, 0x2c7a55, 1)
      .setStrokeStyle(2, 0x88ffcc, 0.95)
      .setInteractive({ useHandCursor: true });
    const buttonText = this.add
      .text(panelX, top + panelHeight - 38, 'OPEN SHOP', {
        fontFamily: 'Arial Black',
        fontSize: 15,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    button.on('pointerover', () => {
      button.fillColor = 0x3f9f72;
    });
    button.on('pointerout', () => {
      button.fillColor = 0x2c7a55;
    });
    button.on('pointerdown', () => {
      this.playSound('click');
      this.continueFromRoundEconomySummary();
    });
    container.add([total, button, buttonText]);
    this.roundEconomySummaryOverlay = container;
    this.addToUI(container);

    this.input.keyboard?.once('keydown-SPACE', () => this.continueFromRoundEconomySummary());
    this.input.keyboard?.once('keydown-ENTER', () => this.continueFromRoundEconomySummary());
  }

  destroyRoundEconomySummary() {
    if (!this.roundEconomySummaryOverlay) return;
    this.roundEconomySummaryOverlay.destroy(true);
    this.roundEconomySummaryOverlay = null;
  }

  continueFromRoundEconomySummary() {
    if (!this.roundEconomySummaryOverlay) return;
    this.destroyRoundEconomySummary();
    this.pendingRoundAdvanceAfterBoon = true;
    this.showShopScreen();
  }

  showStretchJackpotBurst(x, y) {
    const reelLabels = ['CASH', 'REVENUE', 'FLOW'];
    const reelContainer = this.add.container(x, y + 62).setScrollFactor(0);
    reelContainer.setDepth(1001);

    reelLabels.forEach((label, index) => {
      const offsetX = (index - 1) * 86;
      const box = this.add
        .rectangle(offsetX, 0, 74, 34, 0x111820, 0.94)
        .setStrokeStyle(2, 0xffd166, 0.95);
      const reelText = this.add
        .text(offsetX, 0, label, {
          fontFamily: 'Arial Black',
          fontSize: 11,
          color: '#ffd166',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      reelContainer.add([box, reelText]);
      this.tweens.add({
        targets: reelText,
        y: { from: -18, to: 0 },
        scaleX: 1.16,
        scaleY: 1.16,
        duration: 180 + index * 90,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeOut',
      });
    });

    this.addToUI(reelContainer);
    this.tweens.add({
      targets: reelContainer,
      y: y + 36,
      alpha: 0,
      delay: 780,
      duration: 820,
      ease: 'Power2',
      onComplete: () => reelContainer.destroy(),
    });

    const burstLabels = ['+$', '+REV', 'x2', 'WIN', '+FLOW', 'BONUS'];
    for (let index = 0; index < 24; index++) {
      const angle = (Math.PI * 2 * index) / 24;
      const distance = 58 + (index % 5) * 18;
      const label = burstLabels[index % burstLabels.length];
      const chip = this.add
        .text(x, y + 16, label, {
          fontFamily: 'Arial Black',
          fontSize: 12,
          color: index % 3 === 0 ? '#88ffcc' : index % 3 === 1 ? '#ffd166' : '#b9f7ff',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      chip.setDepth(1002);
      this.addToUI(chip);
      this.tweens.add({
        targets: chip,
        x: x + Math.cos(angle) * distance,
        y: y + 16 + Math.sin(angle) * distance * 0.55,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        duration: 760 + (index % 4) * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => chip.destroy(),
      });
    }
  }

  showResourceExhaustedFeedback(message = 'RESOURCES EXHAUSTED') {
    const text = this.add
      .text(this.scale.width / 2 - this.rightPanelWidth / 2, 118, message, {
        fontFamily: 'Arial Black',
        fontSize: 30,
        color: '#ff8888',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);
    this.playSound('round-fail');
    this.cameras.main.shake(220, 0.006);

    this.tweens.add({
      targets: text,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0,
      duration: 1300,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  /** Spawns a Resource Node and a Delivery Node pair */
  spawnNode() {
    // Log `this` context FIRST and use double quotes for the string
    //console.log("[SPAWN_DEBUG] Verifying 'this' context:", this instanceof GameScene ? 'Correct (GameScene)' : 'INCORRECT CONTEXT!', this);

    try {
      // <-- Add try here
      // --- Start of original spawnNode logic ---
      //console.log(`[SPAWN_DEBUG] spawnNode called at time ${this.time.now.toFixed(0)}`);

      if (this.gameOver || this.paused || this.isPausedForUpgrade) {
        //console.log(`[SPAWN_DEBUG] Aborted spawn due to game state (gameOver/paused).`);
        return;
      }

      if (!this.resourceNodes) {
        this.resourceNodes = [];
      }
      if (!this.deliveryNodes) {
        this.deliveryNodes = [];
      }

      if (!this.grid) {
        console.error('[SPAWN_DEBUG] Aborted spawn: Grid is not available.');
        return;
      }

      // Find empty spot on left edge for resource node
      const emptySpot1 = this.grid.findEmptyCellInColumn(0);
      console.log(`[SPAWN_DEBUG] findEmptyCellInColumn(0) result:`, emptySpot1);
      if (!emptySpot1) {
        console.warn('[SPAWN_DEBUG] No empty cells found on left edge for resource node.');
        return;
      }

      const originalCellType1 = this.grid.getCell(emptySpot1.x, emptySpot1.y)?.type || 'unknown';
      this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'temp-reserved-for-spawn' });
      console.log(
        `[SPAWN_DEBUG] Temporarily marked (${emptySpot1.x}, ${emptySpot1.y}) as reserved.`
      );

      // Find empty spot on right edge for delivery node
      const emptySpot2 = this.grid.findEmptyCellInColumn(this.grid.width - 1);
      console.log(`[SPAWN_DEBUG] findEmptyCellInColumn(right edge) result:`, emptySpot2);

      this.grid.setCell(emptySpot1.x, emptySpot1.y, {
        type: originalCellType1 === 'temp-reserved-for-spawn' ? 'empty' : originalCellType1,
      });
      console.log(
        `[SPAWN_DEBUG] Restored (${emptySpot1.x}, ${emptySpot1.y}) to type: ${this.grid.getCell(emptySpot1.x, emptySpot1.y)?.type}`
      );

      if (!emptySpot2) {
        console.warn(
          '[SPAWN_DEBUG] Only one empty cell found. Cannot spawn node pair (2nd attempt failed).'
        );
        return;
      }

      const worldPos1 = this.grid.gridToWorld(emptySpot1.x, emptySpot1.y);
      if (!worldPos1 || typeof worldPos1.x !== 'number' || typeof worldPos1.y !== 'number') {
        console.error('[SPAWN_DEBUG] Invalid world position for resource node:', worldPos1);
        return;
      }

      const resourceTypeIndex = 0;
      const sourceColorCycle = this.getSourceColorCycleForRound(this.currentRound);
      const itemColor = sourceColorCycle[this.resourceNodes.length % sourceColorCycle.length];
      console.log(`[SPAWN_DEBUG] Spawning Resource Node at (${emptySpot1.x}, ${emptySpot1.y})`);
      const resourceNode = new ResourceNode(
        this,
        {
          x: worldPos1.x,
          y: worldPos1.y,
          gridX: emptySpot1.x,
          gridY: emptySpot1.y,
          resourceType: resourceTypeIndex,
          sourceIndex: this.resourceNodes.length,
          itemColor,
          showColorTag: this.shouldShowSourceColorTags(this.currentRound),
          lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier(),
        },
        this.currentRound,
        this.upgradeManager
      );
      this.resourceNodes.push(resourceNode);
      this.addToWorld(resourceNode); // Ensure it's not on the UI camera
      this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'node', object: resourceNode });
      console.log(
        `[SPAWN_DEBUG] Successfully created resource node at grid (${emptySpot1.x}, ${emptySpot1.y})`
      );

      const worldPos2 = this.grid.gridToWorld(emptySpot2.x, emptySpot2.y);
      if (!worldPos2 || typeof worldPos2.x !== 'number' || typeof worldPos2.y !== 'number') {
        console.error('[SPAWN_DEBUG] Invalid world position for delivery node:', worldPos2);
        console.error(
          '[SPAWN_DEBUG] Rolling back resource node spawn due to delivery node position error.'
        );
        this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'empty' });
        const index = this.resourceNodes.indexOf(resourceNode);
        if (index !== -1) this.resourceNodes.splice(index, 1);
        resourceNode.destroy();
        return;
      }

      console.log(`[SPAWN_DEBUG] Spawning Delivery Node at (${emptySpot2.x}, ${emptySpot2.y})`);
      const deliveryNode = new DeliveryNode(this, {
        x: worldPos2.x,
        y: worldPos2.y,
        gridX: emptySpot2.x,
        gridY: emptySpot2.y,
        lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier(),
        pointsPerResource: 10,
      });
      this.deliveryNodes.push(deliveryNode);
      this.addToWorld(deliveryNode); // Ensure it's not on the UI camera
      this.grid.setCell(emptySpot2.x, emptySpot2.y, {
        type: 'delivery-node',
        object: deliveryNode,
      });
      console.log(
        `[SPAWN_DEBUG] Successfully created delivery node at grid (${emptySpot2.x}, ${emptySpot2.y})`
      );
      // --- End of original spawnNode logic ---
    } catch (error) {
      // <-- Add catch here
      console.error('[SPAWN_ERROR] Uncaught error inside spawnNode:', error);
    }
  }

  showUpgradeScreen() {
    if (this.isPausedForUpgrade) return; // Prevent multiple launches

    console.log('Showing Upgrade Screen for level up...');
    this.isPausedForUpgrade = true;
    this.consumingBankedUpgrade = false;

    // Pause timers
    this.gameTimer.paused = true;
    if (this.nodeSpawnTimer) {
      this.nodeSpawnTimer.paused = true;
    }

    // Launch Upgrade Scene, passing the manager
    this.scene.launch('UpgradeScene', {
      upgradeManager: this.upgradeManager,
      callingSceneKey: this.scene.key, // Pass own key
      isLevelUp: true, // Indicate this is from a level up
    });
  }

  showBoonScreen() {
    this.isPausedForUpgrade = true;
    if (this.gameTimer) this.gameTimer.paused = true;
    if (this.contractTimerEvent) this.contractTimerEvent.paused = true;
    if (this.nodeSpawnTimer) this.nodeSpawnTimer.paused = true;
    this.scene.launch('UpgradeScene', {
      upgradeManager: this.upgradeManager,
      callingSceneKey: this.scene.key,
      isLevelUp: false,
      isBoon: true,
    });
  }

  showStarterSparkScreen() {
    if (this.starterSparkOffered || this.gameOver) return;

    this.starterSparkOffered = true;
    this.isPausedForUpgrade = true;
    this.destroyTutorialPanel();
    if (this.gameTimer) this.gameTimer.paused = true;
    if (this.contractTimerEvent) this.contractTimerEvent.paused = true;
    if (this.nodeSpawnTimer) this.nodeSpawnTimer.paused = true;
    this.scene.launch('UpgradeScene', {
      upgradeManager: this.upgradeManager,
      callingSceneKey: this.scene.key,
      isLevelUp: false,
      isStarterSpark: true,
    });
  }

  getStarterSparkChoices() {
    const fixedOffers = STARTER_SPARK_POOL.filter((choice) => choice.fixedOffer);
    const randomOffers = STARTER_SPARK_POOL.filter((choice) => !choice.fixedOffer);
    Phaser.Utils.Array.Shuffle(randomOffers);
    return [...fixedOffers, ...randomOffers].slice(0, 3).map((choice) => ({
      ...choice,
      type: choice.id,
      kind: 'Bonus',
    }));
  }

  applyStarterSparkChoice(choice) {
    const sparkId = choice?.id || choice?.type;
    if (!sparkId) return false;

    this.upgradeManager?.applyBoon?.(sparkId);
    switch (sparkId) {
      case 'spark_surge_voucher':
        this.pendingStarterSparkRound = 3;
        this.pendingStarterSparkGrant = { money: 140, label: 'Skip Ahead' };
        break;
      case 'spark_prototype_crate':
        this.applyPrototypeCrateSpark();
        this.pendingStarterSparkGrant = { money: 12, label: 'Free Prototype' };
        break;
      case 'spark_hyperlane_key':
        this.refreshMachineFlowSpeed();
        this.pendingStarterSparkGrant = { money: 28, label: 'Faster Factory' };
        break;
      case 'spark_jackpot_primer':
        this.pendingStarterSparkGrant = { money: 30, label: 'First Clear Bonus' };
        break;
      default:
        break;
    }

    this.updateActiveUpgradesDisplay();
    return true;
  }

  applyPrototypeCrateSpark() {
    if (!this.machineFactory) return false;

    const prototype =
      STANDARD_PIECE_LIBRARY.find((card) => card.id === 'standard-mixer-u') ||
      STANDARD_PIECE_LIBRARY.find((card) => card.id === 'standard-multiplier-cross') ||
      STANDARD_PIECE_LIBRARY[0];
    if (!prototype) return false;

    const card = {
      ...prototype,
      id: `${prototype.id}-spark-prototype`,
      instanceId: `${prototype.id}-spark-prototype`,
      name: `Prototype ${prototype.name}`,
      shortName: prototype.shortName || prototype.name,
      copies: 1,
    };
    this.machineFactory.addPieceCardToRunDeckFromCard(card);
    const draftedPrototype = this.machineFactory.drawProcessorPiece({ pieceCard: card });
    if (draftedPrototype) {
      this.machineFactory.availableProcessors[0] = draftedPrototype;
      this.machineFactory.displayCurrentProcessorPreview();
    }
    return true;
  }

  applyPendingStarterSparkResume() {
    const grant = this.pendingStarterSparkGrant;
    const targetRound = this.pendingStarterSparkRound;
    this.pendingStarterSparkGrant = null;
    this.pendingStarterSparkRound = null;

    if (targetRound) {
      this.startRound(targetRound, { buildPhase: true });
    } else if (this.runState === 'BUILD_PHASE') {
      this.setProductionPaused(true);
    }

    if (grant?.money) {
      this.addMoney(grant.money, grant.label || 'opening spark');
    }
    if (grant) {
      this.showStarterSparkFeedback(grant.label || 'Starting Bonus');
    }
    if (this.shouldShowTutorialPanel()) {
      this.createTutorialPanel();
    }
    this.updateRoundUI();
  }

  showStarterSparkFeedback(label) {
    const text = this.add
      .text(this.scale.width / 2 - this.rightPanelWidth / 2, 104, `STARTING BONUS\n${label}`, {
        fontFamily: 'Arial Black',
        fontSize: 26,
        color: '#ffd166',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    text.setDepth(1000);
    this.addToUI(text);
    this.cameras.main.flash(140, 255, 218, 120, true);

    this.tweens.add({
      targets: text,
      y: 70,
      scaleX: 1.16,
      scaleY: 1.16,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  showShopScreen() {
    if (this.scene.isActive('UpgradeScene')) {
      this.pendingShopOpen = true;
      return;
    }

    this.isPausedForUpgrade = true;
    this.pendingShopOpen = false;
    if (this.gameTimer) this.gameTimer.paused = true;
    if (this.contractTimerEvent) this.contractTimerEvent.paused = true;
    if (this.nodeSpawnTimer) this.nodeSpawnTimer.paused = true;
    this.shopRerollCount = 0;
    this.currentShopOffers = this.createShopOffers();
    this.scene.launch('UpgradeScene', {
      upgradeManager: this.upgradeManager,
      callingSceneKey: this.scene.key,
      isShop: true,
    });
  }

  getShopChoices() {
    if (!this.currentShopOffers) {
      this.currentShopOffers = this.createShopOffers();
    }

    return [
      ...this.currentShopOffers,
      {
        type: 'reroll_shop',
        kind: 'Shop',
        name: 'Reroll Shop',
        description: 'Refresh all unbought offers.',
        effect: 'New Operators and permanent upgrade.',
        cost: this.getShopRerollCost(),
      },
      {
        type: 'continue_run',
        kind: 'Continue',
        name: 'Start Next Round',
        description: 'Leave the shop and continue the run.',
        effect: 'Unspent cash is kept.',
        cost: 0,
        isFree: true,
      },
    ];
  }

  createShopOffers() {
    const runWideOffers = this.createRunWideShopOffers(3);
    const pieceOfferCount = GAME_CONFIG.shopPieceOfferCount ?? GAME_CONFIG.shopOfferCount ?? 3;
    return [...runWideOffers, ...this.createShopPieceOffers(pieceOfferCount)].filter(Boolean);
  }

  createBoonShopOffer() {
    if ((this.currentRound || 1) < 2) return null;

    const available = BOON_POOL.filter(
      (boon) => !this.upgradeManager?.isProceduralUpgradeActive?.(boon.id)
    );
    if (available.length === 0) return null;

    const identity = this.getPrimaryBuildIdentity();
    const aligned = identity ? available.filter((boon) => identity.boonIds?.includes(boon.id)) : [];
    const boon =
      aligned.length > 0 && Math.random() < 0.68
        ? Phaser.Utils.Array.GetRandom(aligned)
        : Phaser.Utils.Array.GetRandom(available);
    const offer = {
      type: 'boon',
      kind: 'Run',
      boonId: boon.id,
      name: boon.name,
      description: boon.description,
      effect: boon.rarity === 'rare' ? 'Rare run-wide rule.' : 'Run-wide rule.',
      cost: (boon.rarity === 'rare' ? 9 : 7) * this.getShopCostMultiplier(),
      purchased: false,
    };

    if (identity && identity.boonIds?.includes(boon.id)) {
      this.applySynergyRecommendation(offer, identity, 'GOOD FIT');
    }

    return offer;
  }

  createRunWideShopOffers(count = 3) {
    const upgradeTypes = Object.values(UPGRADE_TYPES);
    const identity = this.getPrimaryBuildIdentity();
    const permanentOffers = upgradeTypes
      .map((upgradeType) => this.createPermanentUpgradeChoice(upgradeType))
      .filter(Boolean);
    const boonOffers =
      (this.currentRound || 1) >= 2
        ? BOON_POOL.filter(
            (boon) => !this.upgradeManager?.isProceduralUpgradeActive?.(boon.id)
          ).map((boon) => this.createBoonShopChoice(boon))
        : [];
    const offers = [...permanentOffers, ...boonOffers].filter(Boolean);

    offers.forEach((offer) => {
      if (identity?.upgradeTypes?.includes(offer.upgradeType)) {
        this.applySynergyRecommendation(offer, identity, 'BUILD FIT');
      }
      if (identity?.boonIds?.includes(offer.boonId)) {
        this.applySynergyRecommendation(offer, identity, 'BUILD FIT');
      }
    });

    return Phaser.Utils.Array.Shuffle(offers)
      .sort((a, b) => Number(Boolean(b.isRecommended)) - Number(Boolean(a.isRecommended)))
      .slice(0, count);
  }

  createBoonShopChoice(boon) {
    if (!boon) return null;

    return {
      type: 'boon',
      kind: 'Run Upgrade',
      boonId: boon.id,
      name: boon.name,
      description: boon.description,
      effect: boon.rarity === 'rare' ? 'Rare run-wide rule.' : 'Run-wide rule.',
      cost: (boon.rarity === 'rare' ? 18 : 14) * this.getShopCostMultiplier(),
      purchased: false,
    };
  }

  createSpecialLogisticsShopOffer() {
    if ((this.currentRound || 1) < 4) return null;

    const blueprintChance = GAME_CONFIG.shopSpecialLogisticsBlueprintChance ?? 0.08;
    const dropChance = GAME_CONFIG.shopSpecialLogisticsDropChance ?? 0.32;

    if (Math.random() < blueprintChance) {
      const blueprintOffer = this.createSpecialLogisticsBlueprintOffer();
      if (blueprintOffer) return blueprintOffer;
    }

    if (Math.random() >= dropChance) return null;
    return this.createSpecialLogisticsDropOffer();
  }

  getSpecialLogisticsShopConfigs(options = {}) {
    const configs = Object.values(GAME_CONFIG.specialLogistics || {});
    if (options.onlyBlueprints) {
      return configs.filter((config) => !this.isPermanentSpecialLogisticsUnlocked(config.id));
    }
    return configs;
  }

  chooseWeightedSpecialLogisticsConfig(configs) {
    if (!configs.length) return null;

    const totalWeight = configs.reduce(
      (sum, config) => sum + Math.max(1, config.shopWeight || 1),
      0
    );
    let roll = Math.random() * totalWeight;
    for (const config of configs) {
      roll -= Math.max(1, config.shopWeight || 1);
      if (roll <= 0) return config;
    }
    return configs[configs.length - 1];
  }

  createSpecialLogisticsDropOffer() {
    const config = this.chooseWeightedSpecialLogisticsConfig(this.getSpecialLogisticsShopConfigs());
    if (!config) return null;

    return {
      type: 'special_logistics_drop',
      kind: 'Special',
      specialLogisticsId: config.id,
      quantity: 1,
      name: config.dropName || `${config.name} Kit`,
      description: `${config.description} Limited shop kit; placing it consumes one copy.`,
      effect:
        config.temporaryPlacementCost > 0
          ? `Placement: $${config.temporaryPlacementCost}`
          : 'Placement: free kit',
      cost: (config.shopDropCost || 4) * this.getShopCostMultiplier(),
      purchased: false,
    };
  }

  createSpecialLogisticsBlueprintOffer() {
    const config = this.chooseWeightedSpecialLogisticsConfig(
      this.getSpecialLogisticsShopConfigs({ onlyBlueprints: true })
    );
    if (!config) return null;

    return {
      type: 'special_logistics_blueprint',
      kind: 'Blueprint',
      specialLogisticsId: config.id,
      name: config.blueprintName || `Stabilized ${config.name} Blueprint`,
      description: `Permanently adds ${config.name} to this run's logistics tray.`,
      effect: `Placement: $${config.permanentPlacementCost}`,
      cost: (config.blueprintCost || 12) * this.getShopCostMultiplier(),
      purchased: false,
    };
  }

  createNextRoundAssistOffer() {
    const nextRound = (this.currentRound || 1) + 1;
    const nextPacing = this.getRoundPacing(nextRound);
    const pacingConfig = GAME_CONFIG.pacingConfig || {};
    const nextDemands = Array.from(
      { length: this.getDeliveryNodeCountForRound(nextRound) },
      (_unused, index) => this.createDeliveryCondition(nextRound, index)
    );
    const colorDemand = nextDemands.find((demand) => demand.itemColor);
    const exactDemand = nextDemands.find((demand) => demand.exact);
    const isFirstExactShop = nextRound === (pacingConfig.firstExactDemandRound || 5);
    const isFirstColorShop = nextRound === (pacingConfig.firstColorDemandRound || 7);
    const priorityLabel = isFirstColorShop
      ? 'COLOR BONUS'
      : isFirstExactShop
        ? 'EXACT PREP'
        : nextPacing.isBoss
          ? 'BOSS PREP'
          : 'PLAN FIT';

    if (colorDemand && (this.currentRound || 1) >= 4) {
      const painterConfig = GAME_CONFIG.specialLogistics?.painter;
      if (painterConfig) {
        const offer = {
          type: 'special_logistics_drop',
          kind: nextPacing.isBoss ? 'Boss Prep' : 'Plan',
          specialLogisticsId: painterConfig.id,
          quantity: 1,
          name: `${nextPacing.isBoss ? 'Boss Prep' : 'Next Plan'}: ${
            painterConfig.dropName || painterConfig.name
          }`,
          description: `${painterConfig.description} Recommended for ${this.getRoundPacingLabel(
            nextRound
          )}.`,
          effect: `Next: ${this.getRoundPreviewText(nextRound, 2)}`,
          cost: (painterConfig.shopDropCost || 4) * this.getShopCostMultiplier(),
          purchased: false,
          isRecommended: true,
          recommendationLabel: priorityLabel,
        };
        return this.makeAssistOfferAffordable(offer);
      }
    }
    const highestTier = Math.max(...nextDemands.map((demand) => demand.tier || 1));
    const template = this.findShopAssistTemplate({
      operationTag: null,
      highestTier,
      exact: Boolean(exactDemand),
      isBoss: nextPacing.isBoss,
    });

    if (!template) return null;

    return this.finalizeShopAssistOffer(
      this.createShopPieceOffer(template, 99, { forcePlain: true }),
      nextRound,
      nextPacing,
      priorityLabel
    );
  }

  finalizeShopAssistOffer(offer, nextRound, nextPacing, recommendationLabel) {
    if (!offer) return null;

    offer.kind = nextPacing.isBoss ? 'Boss Prep' : 'Plan';
    offer.name = `${nextPacing.isBoss ? 'Boss Prep' : 'Next Plan'}: ${offer.name}`;
    offer.description = `${offer.description} Recommended for ${this.getRoundPacingLabel(nextRound)}.`;
    offer.effect = `Next: ${this.getRoundPreviewText(nextRound, 2)}`;
    offer.isRecommended = true;
    offer.recommendationLabel =
      recommendationLabel || (nextPacing.isBoss ? 'BOSS PREP' : 'PLAN FIT');
    return this.makeAssistOfferAffordable(offer);
  }

  makeAssistOfferAffordable(offer) {
    return offer;
  }

  applySynergyRecommendation(offer, identity, reason = 'GOOD FIT') {
    if (!offer || !identity) return offer;

    offer.synergyHint = reason;
    offer.isRecommended = true;
    offer.recommendationLabel = reason;
    return offer;
  }

  findShopAssistTemplate({ operationTag, highestTier, exact, isBoss }) {
    const library = [...STARTER_PIECE_DECK, ...STANDARD_PIECE_LIBRARY];
    const matchesOperation = (template, type, value = null) => {
      const operation = template.arithmeticOperation;
      if (operation?.type !== type) return false;
      return value === null || operation.value === value;
    };

    if (operationTag === ARITHMETIC_OPERATION_TAGS.ADD_ONE) {
      return library.find((template) =>
        matchesOperation(template, ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, 1)
      );
    }
    if (operationTag === ARITHMETIC_OPERATION_TAGS.ADD_TWO) {
      return library.find((template) =>
        matchesOperation(template, ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, 2)
      );
    }
    if (operationTag === ARITHMETIC_OPERATION_TAGS.ADD) {
      return library.find((template) => matchesOperation(template, ARITHMETIC_OPERATION_TYPES.ADD));
    }

    if (isBoss || exact || highestTier >= 4) {
      return (
        library.find((template) =>
          matchesOperation(template, ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT, 2)
        ) || library.find((template) => matchesOperation(template, ARITHMETIC_OPERATION_TYPES.ADD))
      );
    }

    return null;
  }

  createShopPieceOffers(count = 3) {
    const library = [...STARTER_PIECE_DECK, ...STANDARD_PIECE_LIBRARY];
    const offers = [];

    for (let i = 0; i < count; i++) {
      const template = Phaser.Utils.Array.GetRandom(library);
      offers.push(this.createShopPieceOffer(template, i));
    }

    return offers;
  }

  createShopPieceOffer(template, index = 0, options = {}) {
    const specialChance = GAME_CONFIG.shopPieceTraitChance ?? 0.3;
    const identity = this.getPrimaryBuildIdentity();
    const identityTraitPool = Array.isArray(identity?.traitIds) ? identity.traitIds : [];
    const trait = options.forcePlain
      ? null
      : Math.random() < specialChance
        ? identity && Math.random() < 0.62
          ? rollTraitFromIds(identityTraitPool)
          : rollTrait()
        : null;
    const traitDef = trait ? getTraitById(trait) : null;
    const operation = template.arithmeticOperation;
    const operationCost = this.getShopPieceOperationCost(operation);
    const traitCost = trait
      ? (GAME_CONFIG.shopPieceTraitCost || 3) * this.getShopCostMultiplier()
      : 0;
    const outputItemColor =
      options.outputItemColor ||
      (options.forcePlain
        ? template.outputItemColor ||
          template.machineColor ||
          GAME_CONFIG.defaultItemColor ||
          'blue'
        : this.rollShopOperatorOutputColor());
    const outputColorName = getItemColorName(outputItemColor);
    const operationLabel = this.getOperationShopLabel(operation);
    const operationDescription = this.getOperationDescription(operation);
    const operationExample = this.getOperationExample(operation);
    const card = {
      ...template,
      trait,
      suppressTrait: true,
      outputItemColor,
      id: `${template.id}${trait ? `-${trait}` : ''}-shop-${this.currentRound}-${index}-${Date.now()}`,
      instanceId: `${template.id}-shop-${this.currentRound}-${index}-${Date.now()}`,
    };

    const offer = {
      type: 'shop_piece',
      kind: trait ? 'Special' : 'Operator',
      pieceCard: card,
      trait,
      traitName: traitDef?.name || null,
      traitDescription: traitDef?.description || null,
      name: traitDef
        ? `${outputColorName} ${traitDef.name} ${template.shortName || template.name}`
        : `${outputColorName} ${template.name}`,
      description: traitDef
        ? `${template.name}. ${operationDescription} Outputs ${outputColorName}. Trait: ${traitDef.name} - ${traitDef.description}`
        : `Permanent Operator card. ${operationDescription} Outputs ${outputColorName}.`,
      effect: traitDef ? `${traitDef.name}: ${traitDef.description}` : operationExample,
      operationLabel,
      operationExample,
      cost: operationCost + traitCost,
      purchased: false,
    };

    if (identity && trait && identityTraitPool.includes(trait)) {
      this.applySynergyRecommendation(offer, identity, 'GOOD FIT');
    }

    return offer;
  }

  getShopPieceOperationCost(operation) {
    const multiplier = this.getShopCostMultiplier();
    switch (operation?.type) {
      case 'add-constant':
        return (operation.value >= 2 ? 5 : 4) * multiplier;
      case 'add':
        return 6 * multiplier;
      case 'divide':
        return 7 * multiplier;
      case 'multiply':
        return 9 * multiplier;
      default:
        return 4 * multiplier;
    }
  }

  getOperationDescription(operation) {
    switch (operation?.type) {
      case 'add-constant':
        return `Raises one input by ${operation.value || 1}.`;
      case 'add':
        return 'Adds two different input levels together.';
      case 'divide':
        return 'Divides two different input levels.';
      case 'multiply':
        return 'Multiplies two different input levels together.';
      default:
        return 'Transforms numeric resources.';
    }
  }

  getOperationShopLabel(operation) {
    switch (operation?.type) {
      case 'add-constant':
        return `Operation: +${operation.value || 1}`;
      case 'add':
        return 'Operation: add';
      case 'divide':
        return 'Operation: divide';
      case 'multiply':
        return 'Operation: multiply';
      default:
        return 'Operation: transform';
    }
  }

  getOperationExample(operation) {
    switch (operation?.type) {
      case 'add-constant':
        return `Example: L1 -> L${1 + (operation.value || 1)}`;
      case 'add':
        return 'Example: L2 + L3 -> L5';
      case 'divide':
        return 'Example: L6 / L2 -> L3';
      case 'multiply':
        return 'Example: L3 x L4 -> L12';
      default:
        return 'Adds a card to your Operator deck.';
    }
  }

  rollShopOperatorOutputColor(options = {}) {
    if (!options.preventWildcard) {
      const wildcardChance =
        typeof this.upgradeManager?.getWildcardOperatorShopChance === 'function'
          ? this.upgradeManager.getWildcardOperatorShopChance()
          : GAME_CONFIG.shopWildcardOperatorChance || 0;
      if (Math.random() < wildcardChance) return getWildcardItemColor();
    }

    const colorCycle = GAME_CONFIG.sourceColorCycle || [GAME_CONFIG.defaultItemColor || 'blue'];
    return Phaser.Utils.Array.GetRandom(colorCycle) || GAME_CONFIG.defaultItemColor || 'blue';
  }

  createPermanentUpgradeOffer() {
    const upgradeTypes = Object.values(UPGRADE_TYPES);
    const available = upgradeTypes
      .map((upgradeType) => this.createPermanentUpgradeChoice(upgradeType))
      .filter(Boolean);
    const identity = this.getPrimaryBuildIdentity();
    const identityAvailable = identity
      ? available.filter((offer) => identity.upgradeTypes?.includes(offer.upgradeType))
      : [];
    const offer =
      identityAvailable.length > 0 && Math.random() < 0.72
        ? Phaser.Utils.Array.GetRandom(identityAvailable)
        : Phaser.Utils.Array.GetRandom(available);

    if (identity && identity.upgradeTypes?.includes(offer?.upgradeType)) {
      this.applySynergyRecommendation(offer, identity, 'GOOD FIT');
    }

    return offer;
  }

  createPermanentUpgradeChoice(upgradeType) {
    const config = upgradesConfig[upgradeType];
    const nextLevel = (this.upgradeManager?.currentUpgrades?.[upgradeType] || 0) + 1;
    const tier = config?.tiers?.find((entry) => entry.level === nextLevel);
    if (!config || !tier) return null;

    return {
      type: 'upgrade_permanent',
      upgradeType,
      kind: 'Run Upgrade',
      name: `${config.name} L${nextLevel}`,
      description: config.description,
      effect: tier.description,
      cost: (12 + nextLevel * 6) * this.getShopCostMultiplier(),
      purchased: false,
    };
  }

  getShopRerollCost() {
    return (
      ((GAME_CONFIG.shopRerollCost || 2) + Math.max(0, this.shopRerollCount || 0)) *
      this.getShopCostMultiplier()
    );
  }

  getShopCostMultiplier() {
    return Math.max(1, Math.floor(GAME_CONFIG.shopCostMultiplier || 1));
  }

  spendMoney(amount) {
    const cost = Math.max(0, Math.floor(amount || 0));
    if ((this.money || 0) < cost) return false;

    this.money -= cost;
    this.updateRoundUI();
    return true;
  }

  buyShopChoice(choice) {
    if (!choice) return { success: false, message: 'No shop choice selected.' };

    if (choice.type === 'continue_run') {
      return { success: true, closeShop: true };
    }

    if (choice.purchased) {
      return { success: false, message: 'Already purchased.' };
    }

    if (!this.spendMoney(choice.cost || 0)) {
      return { success: false, message: 'Not enough cash.' };
    }

    let success = true;
    switch (choice.type) {
      case 'shop_piece':
        success = Boolean(this.machineFactory?.addPieceCardToRunDeckFromCard(choice.pieceCard));
        break;
      case 'upgrade_permanent':
        this.upgradeManager.applyUpgrade(choice.upgradeType);
        this.updateActiveUpgradesDisplay();
        this.updateRoundUI();
        break;
      case 'special_logistics_drop':
        success = this.grantSpecialLogisticsItem(choice.specialLogisticsId, choice.quantity || 1);
        break;
      case 'special_logistics_blueprint':
        success = this.unlockPermanentSpecialLogistics(choice.specialLogisticsId);
        break;
      case 'reroll_shop':
        this.shopRerollCount = (this.shopRerollCount || 0) + 1;
        this.currentShopOffers = this.createShopOffers();
        break;
      case 'boon':
        this.upgradeManager.applyBoon(choice.boonId);
        this.updateActiveUpgradesDisplay();
        break;
      default:
        success = false;
        break;
    }

    if (!success) {
      this.addMoney(choice.cost || 0, 'refund');
      return { success: false, message: 'Could not apply shop item.' };
    }

    if (choice.type !== 'reroll_shop') {
      choice.purchased = true;
    }

    this.playSound('shop-buy');
    return { success: true, closeShop: false, refreshShop: true };
  }

  resumeFromUpgrade() {
    this.isPausedForUpgrade = false;
    if (this.gameTimer) this.gameTimer.paused = false;
    if (this.nodeSpawnTimer) this.nodeSpawnTimer.paused = false;
    if (this.pendingStarterSparkGrant || this.pendingStarterSparkRound) {
      this.applyPendingStarterSparkResume();
      if (!this.pendingShopOpen) return;
    }
    if (this.pendingShopOpen) {
      this.pendingShopOpen = false;
      this.time.delayedCall(0, () => this.showShopScreen());
      return;
    }
    if (this.pendingRoundAdvanceAfterBoon) {
      this.pendingRoundAdvanceAfterBoon = false;
      this.startNextRound();
      return;
    }
    // (legacy level-up path removed in Task 6; nothing else to do)
  }

  updateActiveUpgradesDisplay() {
    if (!this.upgradeManager || !this.upgradeRowContainer) {
      return;
    }

    const activeUpgrades = this.upgradeManager.currentUpgrades;
    const activeBoons = Array.from(this.upgradeManager.activeProceduralUpgrades || []);
    const runWideLines = Array.isArray(this.runWideHudLines) ? this.runWideHudLines : [];
    const permanentSpecials = Object.keys(this.permanentSpecialLogistics || {}).filter(
      (machineId) => this.permanentSpecialLogistics[machineId]
    );
    const metaLines = [];
    if (this.isUndergroundBeltUnlocked()) {
      metaLines.push({
        title: 'Advanced Logistics',
        value: 'META',
        description:
          'Underground belts are now available in the logistics tray. Fixed board tunnels still stay free.',
        color: 0x83f7ff,
      });
    }
    if (this.hasFreeDraftRedrawPerRound()) {
      metaLines.push({
        title: 'Free Redraw',
        value: `${this.freeDraftRedrawsRemaining || 0}/${
          GAME_CONFIG.metaProgression?.freeDraftRedrawsPerRound || 1
        }`,
        description: 'The first full hand redraw each round costs no cash.',
        color: 0xffd166,
      });
    }
    const entries = [];

    if (
      Object.keys(activeUpgrades).length === 0 &&
      activeBoons.length === 0 &&
      runWideLines.length === 0 &&
      permanentSpecials.length === 0 &&
      metaLines.length === 0
    ) {
      entries.push({
        title: 'No upgrades yet',
        value: '',
        description: 'Earn and buy upgrades to shape this run.',
        color: 0x6f8793,
      });
    } else {
      for (const upgradeType in activeUpgrades) {
        const level = activeUpgrades[upgradeType];
        const config = upgradesConfig[upgradeType];
        if (config) {
          const tier = config.tiers?.find((entry) => entry.level === level);
          entries.push({
            title: config.name,
            value: `L${level}`,
            description: [config.description, tier?.description].filter(Boolean).join('\n'),
            color: 0x88ccff,
          });
        }
      }
      activeBoons.forEach((boonId) => {
        const boon =
          BOON_POOL.find((entry) => entry.id === boonId) ||
          STARTER_SPARK_POOL.find((entry) => entry.id === boonId);
        entries.push({
          title: boon?.name || boonId,
          value: boon?.rarity ? boon.rarity.toUpperCase() : 'BOON',
          description: boon?.description || 'Run-defining boon.',
          color: boonId.startsWith('spark_') ? 0xff8fab : 0xffd166,
        });
      });
      permanentSpecials.forEach((machineId) => {
        const config = this.getSpecialLogisticsConfig(machineId);
        entries.push({
          title: config?.name || machineId,
          value: 'BLUEPRINT',
          description: `Available in the logistics tray. Placement costs $${
            config?.permanentPlacementCost || this.getMachinePlacementCostBase({ id: machineId })
          }.`,
          color: 0x83f7ff,
        });
      });
    }

    metaLines.forEach((line) => entries.push(line));

    runWideLines.forEach((line) => {
      entries.push({
        title: line,
        value: '',
        description: 'Active run-wide modifier.',
        color: 0xb56cff,
      });
    });

    this.renderUpgradeRows(entries);
  }

  renderUpgradeRows(entries) {
    this.hideUpgradeTooltip();
    this.hoveredUpgradeRow = null;
    this.upgradeRowContainer.removeAll(true);
    this.upgradeRows = [];

    const panelX = this.scale.width - this.rightPanelWidth;
    const contentX = panelX + 14;
    const contentWidth = this.rightPanelWidth - 28;
    const rowX = contentX + 10;
    const rowY = 306;
    const rowWidth = contentWidth - 20;
    const rowHeight = 24;
    const gap = 6;
    const panelBottom =
      (this.upgradesPanelBounds?.y || 272) + (this.upgradesPanelBounds?.height || 150);
    const rowAreaTop = rowY - rowHeight / 2;
    const rowAreaBottom = panelBottom - 12;
    const rowSlots = Math.max(
      1,
      Math.floor((rowAreaBottom - rowAreaTop + gap) / (rowHeight + gap))
    );
    const needsOverflowRow = entries.length > rowSlots;
    const visibleCount = needsOverflowRow ? Math.max(0, rowSlots - 1) : rowSlots;
    const visibleEntries = entries.slice(0, visibleCount);

    visibleEntries.forEach((entry, index) => {
      this.createUpgradeRow(entry, rowX, rowY + index * (rowHeight + gap), rowWidth, rowHeight);
    });

    if (needsOverflowRow) {
      this.createUpgradeRow(
        {
          title: `+${entries.length - visibleCount} more`,
          value: '',
          description: entries
            .slice(visibleCount)
            .map((entry) => `${entry.title}${entry.value ? ` ${entry.value}` : ''}`)
            .join('\n'),
          color: 0x95aab5,
        },
        rowX,
        rowY + visibleCount * (rowHeight + gap),
        rowWidth,
        rowHeight
      );
    }
  }

  createUpgradeRow(entry, x, y, width, height) {
    const row = this.add.container(x, y).setScrollFactor(0);
    row.setDepth(3);

    const background = this.add
      .rectangle(0, 0, width, height, 0x202a34, 0.96)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, entry.color || 0x88ccff, 0.35);
    const accent = this.add
      .rectangle(0, 0, 4, height, entry.color || 0x88ccff, 0.9)
      .setOrigin(0, 0.5);
    const title = this.add
      .text(12, 0, entry.title, {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#dfefff',
        align: 'left',
        wordWrap: { width: width - 64 },
      })
      .setOrigin(0, 0.5);
    const value = this.add
      .text(width - 10, 0, entry.value || '', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: this.toCssColor(entry.color || 0x88ccff),
        align: 'right',
      })
      .setOrigin(1, 0.5);

    row.add([background, accent, title, value]);
    row.upgradeEntry = entry;
    row.upgradeBackground = background;
    row.upgradeColor = entry.color || 0x88ccff;
    row.upgradeBounds = { x, y: y - height / 2, width, height };
    row.setSize(width, height);
    row.setInteractive(
      new Phaser.Geom.Rectangle(0, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    row.on('pointerover', (pointer) => {
      background.fillColor = 0x293744;
      background.setStrokeStyle(1, entry.color || 0x88ccff, 0.85);
      this.showUpgradeTooltip(entry, pointer);
    });
    row.on('pointermove', (pointer) => this.positionUpgradeTooltip(pointer));
    row.on('pointerout', () => {
      background.fillColor = 0x202a34;
      background.setStrokeStyle(1, entry.color || 0x88ccff, 0.35);
      this.hideUpgradeTooltip();
    });

    this.upgradeRowContainer.add(row);
    this.upgradeRows.push(row);
  }

  updateUpgradeHover(pointer) {
    if (!pointer || !Array.isArray(this.upgradeRows) || this.upgradeRows.length === 0) {
      this.clearUpgradeRowHover();
      return false;
    }

    const hoveredRow = this.upgradeRows.find((row) => {
      const bounds = row.upgradeBounds;
      return (
        bounds &&
        pointer.x >= bounds.x &&
        pointer.x <= bounds.x + bounds.width &&
        pointer.y >= bounds.y &&
        pointer.y <= bounds.y + bounds.height
      );
    });

    if (!hoveredRow) {
      this.clearUpgradeRowHover();
      return false;
    }

    if (this.hoveredUpgradeRow !== hoveredRow) {
      this.clearUpgradeRowHover();
      this.hoveredUpgradeRow = hoveredRow;
      hoveredRow.upgradeBackground.fillColor = 0x293744;
      hoveredRow.upgradeBackground.setStrokeStyle(1, hoveredRow.upgradeColor, 0.85);
      this.showUpgradeTooltip(hoveredRow.upgradeEntry, pointer);
    } else {
      this.positionUpgradeTooltip(pointer);
    }

    return true;
  }

  clearUpgradeRowHover() {
    if (this.hoveredUpgradeRow?.upgradeBackground) {
      this.hoveredUpgradeRow.upgradeBackground.fillColor = 0x202a34;
      this.hoveredUpgradeRow.upgradeBackground.setStrokeStyle(
        1,
        this.hoveredUpgradeRow.upgradeColor,
        0.35
      );
    }
    this.hoveredUpgradeRow = null;
    this.hideUpgradeTooltip();
  }

  showUpgradeTooltip(entry, pointer) {
    this.hideUpgradeTooltip();

    const width = 248;
    const padding = 12;
    const tooltip = this.add.container(0, 0).setScrollFactor(0);
    tooltip.setDepth(12000);

    const background = this.add
      .rectangle(0, 0, width, 96, 0x07111a, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, entry.color || 0x88ccff, 0.9);
    const title = this.add.text(padding, 10, entry.title, {
      fontFamily: 'Arial Black',
      fontSize: 13,
      color: this.toCssColor(entry.color || 0x88ccff),
      wordWrap: { width: width - padding * 2 },
    });
    const body = this.add.text(padding, 34, entry.description || 'No description available.', {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#dbe8ef',
      lineSpacing: 4,
      wordWrap: { width: width - padding * 2 },
    });

    const height = Math.max(78, body.y + body.height + padding);
    background.height = height;
    tooltip.tooltipWidth = width;
    tooltip.tooltipHeight = height;
    tooltip.add([background, title, body]);
    this.upgradeTooltip = tooltip;
    this.addToUI(tooltip);
    this.positionUpgradeTooltip(pointer);
  }

  positionUpgradeTooltip(pointer) {
    if (!this.upgradeTooltip || !pointer) return;

    const width = this.upgradeTooltip.tooltipWidth || 248;
    const height = this.upgradeTooltip.tooltipHeight || 96;
    const margin = 8;
    let x = pointer.x - width - 18;
    let y = pointer.y + 14;

    if (x < margin) {
      x = pointer.x + 18;
    }
    if (y + height + margin > this.scale.height) {
      y = pointer.y - height - 14;
    }

    this.upgradeTooltip.setPosition(
      Phaser.Math.Clamp(x, margin, this.scale.width - width - margin),
      Phaser.Math.Clamp(y, margin, this.scale.height - height - margin)
    );
  }

  hideUpgradeTooltip() {
    if (this.upgradeTooltip) {
      this.upgradeTooltip.destroy();
      this.upgradeTooltip = null;
    }
  }

  getRotationForPlacedMachine(machine) {
    if (machine?.rotationDegrees !== undefined) {
      return {
        radians: (Number(machine.rotationDegrees) * Math.PI) / 180,
        degrees: Number(machine.rotationDegrees),
      };
    }

    if (machine?.rotation !== undefined && !isNaN(Number(machine.rotation))) {
      const rotation = Number(machine.rotation);
      const degrees = rotation < 10 ? Math.round((rotation * 180) / Math.PI) : rotation;
      return {
        radians: rotation < 10 ? rotation : (degrees * Math.PI) / 180,
        degrees,
      };
    }

    const direction = machine?.direction || 'right';
    const directionToRadians = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: (3 * Math.PI) / 2,
    };
    const radians = directionToRadians[direction] || 0;
    return {
      radians,
      degrees: Math.round((radians * 180) / Math.PI),
    };
  }

  createMachineTypeFromPlacedMachine(machine) {
    if (!machine || !machine.id) return null;

    let baseType = null;
    if (this.machineFactory && typeof this.machineFactory.getMachineTypeById === 'function') {
      try {
        baseType = this.machineFactory.getMachineTypeById(machine.id);
      } catch (_error) {
        baseType = null;
      }
    }

    const rotation = this.getRotationForPlacedMachine(machine);
    const machineType = {
      ...(baseType || {}),
      id: machine.id,
      name: machine.name || baseType?.name || machine.id,
      description: machine.description || baseType?.description || '',
      shape: Array.isArray(machine.shape) ? machine.shape.map((row) => [...row]) : baseType?.shape,
      direction: machine.direction || baseType?.direction || 'right',
      rotation: rotation.radians,
      rotationDegrees: rotation.degrees,
      fromPlacedMachine: true,
    };

    if (Array.isArray(machine.inputLevels)) {
      machineType.inputLevels = [...machine.inputLevels];
    }
    if (machine.outputLevel != null) {
      machineType.outputLevel = machine.outputLevel;
    }
    if (machine.previewOutputLevel != null) {
      machineType.previewOutputLevel = machine.previewOutputLevel;
    }
    if (machine.notation) {
      machineType.notation = machine.notation;
    }
    if (machine.arithmeticOperation) {
      machineType.arithmeticOperation = { ...machine.arithmeticOperation };
      machineType.arithmeticInputCount = machine.arithmeticInputCount || 0;
    }
    if (machine.trait) {
      machineType.trait = machine.trait;
    }
    if (machine.bodyId) {
      machineType.bodyId = machine.bodyId;
    }
    if (machine.inputCoord) {
      machineType.inputCoord = { ...machine.inputCoord };
    }
    if (machine.outputCoord) {
      machineType.outputCoord = { ...machine.outputCoord };
    }
    if (machine.ioByDirection) {
      machineType.ioByDirection = Object.fromEntries(
        Object.entries(machine.ioByDirection).map(([dir, io]) => [
          dir,
          {
            inputPos: { ...io.inputPos },
            outputPos: { ...io.outputPos },
          },
        ])
      );
    }
    machineType.placementCost = 0;
    machineType.isRelocation = true;

    return machineType.shape ? machineType : null;
  }

  clearMachineRuntimeItems(machine) {
    if (!machine) return;

    if (Array.isArray(machine.itemsOnBelt)) {
      machine.itemsOnBelt.forEach((itemOnBelt) => {
        const visual = itemOnBelt?.visual || itemOnBelt;
        if (visual && typeof visual.destroy === 'function') {
          visual.destroy();
        }
      });
      machine.itemsOnBelt = [];
    }

    if (machine.itemVisualsGroup && typeof machine.itemVisualsGroup.clear === 'function') {
      machine.itemVisualsGroup.clear(true, true);
    }
  }

  pickUpPlacedMachine(machine) {
    if (this.paused || this.gameOver || !machine || !this.machineFactory) return;
    if (machine.isFixedInfrastructure) {
      this.showPlacementHint('Fixed board tunnel', '#83f7ff');
      return;
    }

    const machineType = this.createMachineTypeFromPlacedMachine(machine);
    if (!machineType) {
      console.warn('[PICKUP] Could not create placement data for clicked machine.');
      return;
    }

    this.clearMachineRuntimeItems(machine);

    const machineIndex = this.machines.indexOf(machine);
    if (machineIndex > -1) {
      this.machines.splice(machineIndex, 1);
    }

    if (typeof machine.destroy === 'function') {
      machine.destroy();
    } else if (this.grid && typeof this.grid.removeMachine === 'function') {
      this.grid.removeMachine(machine);
    }

    this.machineFactory.lastSelectedCategory = null;
    this.machineFactory.lastSelectedSlotIndex = -1;
    this.machineFactory.selectMachineType(machineType);
    this.isPlacingMachine = true;
    this.selectedMachineType = machineType;

    if (typeof this.playSound === 'function') {
      this.playSound('destroy');
    }
    this.showProcessorReplacementFeedback('Picked up\nplace for free');
  }

  deleteLogisticsOnClick(machine) {
    if (this.paused || this.gameOver || !machine) return;
    if (machine.isFixedInfrastructure) {
      this.showPlacementHint('Fixed board tunnel', '#83f7ff');
      return;
    }

    console.log(`Attempting to delete logistics item at grid (${machine.gridX}, ${machine.gridY})`);

    // 1. Delete items on the belt (if applicable)
    if (machine.itemsOnBelt && machine.itemsOnBelt.length > 0) {
      console.log(`Deleting ${machine.itemsOnBelt.length} items from machine belt.`);
      machine.itemsOnBelt.forEach((itemSprite) => {
        if (itemSprite && typeof itemSprite.destroy === 'function') {
          itemSprite.destroy();
        }
      });
      machine.itemsOnBelt = []; // Clear the array
    }

    const refund = Math.floor(
      (typeof machine.placementCost === 'number'
        ? machine.placementCost
        : this.getMachinePlacementCost(machine)) * (GAME_CONFIG.machineRefundRate || 0.5)
    );
    if (refund > 0) {
      this.addMoney(refund, 'refund');
    }
    this.unrecordBuildPhasePaidBelt(machine);

    // 2. Remove from the scene's machines array
    const machineIndex = this.machines.indexOf(machine);
    if (machineIndex > -1) {
      this.machines.splice(machineIndex, 1);
      console.log('Removed machine from scene machines array.');
    }

    // 3. Remove from grid - Let the machine's destroy() handle this via grid.removeMachine
    // (This prevents double-call warnings in Grid objects)
    console.log('Grid removal will be handled by machine.destroy() -> super.destroy()');

    // 4. Destroy the game object (container and its contents)
    if (typeof machine.destroy === 'function') {
      machine.destroy();
      console.log('Destroyed machine game object.');
    }

    // 5. Play a sound
    this.playSound('destroy'); // Assuming you have a 'destroy' sound effect
  }

  // -------------------------

  showInputModeMessage() {
    const msg = `Input mode: ${this.inputMode.toUpperCase()}`;
    if (this.inputModeText) this.inputModeText.destroy();
    this.inputModeText = this.add
      .text(10, 10, msg, { fontSize: 18, color: '#fff', backgroundColor: '#222' })
      .setScrollFactor(0)
      .setDepth(2000);
    this.time.delayedCall(
      1500,
      () => {
        if (this.inputModeText) this.inputModeText.destroy();
      },
      [],
      this
    );
  }

  updatePlacementPreviewAt(gridPos) {
    if (!this.selectedMachineType) return;
    // Create a dummy machine object for the preview at gridPos
    const previewMachine = {
      id: this.selectedMachineType.id,
      type: this.selectedMachineType.id,
      shape: this.selectedMachineType.shape,
      direction: this.selectedMachineType.direction || 'right',
      rotation: this.selectedMachineType.rotation || 0,
      rotationDegrees: this.selectedMachineType.rotationDegrees,
      trait: this.selectedMachineType.trait || null,
      outputLevel: this.selectedMachineType.outputLevel || null,
      previewOutputLevel: this.selectedMachineType.previewOutputLevel || null,
      isLogisticsBeltPiece: this.selectedMachineType.isLogisticsBeltPiece === true,
      logisticsPath: this.selectedMachineType.logisticsPath || null,
      logisticsMachineId: this.selectedMachineType.logisticsMachineId || null,
      machineType: this.selectedMachineType,
      gridX: gridPos.x,
      gridY: gridPos.y,
    };
    this.updatePlacementPreview(previewMachine);
  }

  showPlaceButton(gridPos) {
    this.removePlaceButton();
    const world = this.grid.gridToWorld(gridPos.x, gridPos.y);
    this.placeBtn = this.add
      .text(world.x, world.y - 32, 'Place', {
        fontSize: 18,
        color: '#fff',
        backgroundColor: '#4a6fb5',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2000);
    this.addToWorld(this.placeBtn);
    this.placeBtn.on('pointerdown', () => {
      if (this.isTouchPlacing && this.touchPreviewGridPos) {
        this.tryPlaceMachineAt(this.touchPreviewGridPos);
        this.isTouchPlacing = false;
        this.touchPreviewGridPos = null;
        this.removePlaceButton();
      }
    });
  }
  movePlaceButton(gridPos) {
    if (this.placeBtn) {
      const world = this.grid.gridToWorld(gridPos.x, gridPos.y);
      this.placeBtn.setPosition(world.x, world.y - 32);
    }
  }
  removePlaceButton() {
    if (this.placeBtn) {
      this.placeBtn.destroy();
      this.placeBtn = null;
    }
  }
  tryPlaceMachineAt(gridPos) {
    if (!this.selectedMachineType || !gridPos) return;
    const orientation = this.getPlacementOrientation(this.selectedMachineType);
    this.placeMachine(this.selectedMachineType, gridPos.x, gridPos.y, orientation.radians);
  }

  /**
   * Spawns a single delivery node at an empty cell
   * @returns {DeliveryNode|null} The spawned delivery node or null if unsuccessful
   */
  spawnDeliveryNode(condition = null, preferredY = null) {
    try {
      if (this.gameOver || this.paused) return null;

      // Ensure deliveryNodes is initialized
      if (!this.deliveryNodes) {
        this.deliveryNodes = [];
      }

      // Find an empty spot on the right edge of the grid (last column)
      const preferredCell =
        preferredY !== null && preferredY !== undefined
          ? this.grid.getCell(this.grid.width - 1, preferredY)
          : null;
      const emptySpot =
        preferredCell && preferredCell.type === 'empty'
          ? { x: this.grid.width - 1, y: preferredY }
          : this.grid.findEmptyCellInColumn(this.grid.width - 1);
      if (!emptySpot) {
        console.warn('[GAME] No empty cells found in right edge for delivery node placement');
        return null;
      }

      // Convert grid position to world coordinates
      const worldPos = this.grid.gridToWorld(emptySpot.x, emptySpot.y);
      if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
        console.error('[GAME] Invalid world position for delivery node:', worldPos);
        return null;
      }

      // Create a new delivery node
      const deliveryNode = new DeliveryNode(this, {
        x: worldPos.x,
        y: worldPos.y,
        gridX: emptySpot.x,
        gridY: emptySpot.y,
        lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier(),
        pointsPerResource: 10,
        condition:
          condition || this.createDeliveryCondition(this.currentRound, this.deliveryNodes.length),
      });

      this.deliveryNodes.push(deliveryNode);
      this.addToWorld(deliveryNode);
      this.grid.setCell(emptySpot.x, emptySpot.y, { type: 'delivery-node', object: deliveryNode });

      console.log(`[GAME] Created delivery node at grid (${emptySpot.x}, ${emptySpot.y})`);
      return deliveryNode;
    } catch (error) {
      console.error('[GAME] Error creating delivery node:', error);
      return null;
    }
  }

  createShortcutDeliveryCondition(shortcut, index = 0) {
    const isColorToll = shortcut.kind === 'color-toll';
    const tier = Math.max(2, Math.min(4, 2 + Math.floor(Math.max(0, this.currentRound - 4) / 4)));
    const requiredCount = this.currentRound >= 8 ? 2 : 1;
    const tierLabel = `L${tier}+`;
    const colorLabel = isColorToll ? `${getItemColorName(shortcut.itemColor)} ` : '';
    return {
      tier,
      exact: false,
      shortcut: true,
      shortcutKind: shortcut.kind || 'shortcut',
      shortcutId: shortcut.id || `shortcut-${index + 1}`,
      shortcutContract: shortcut,
      countsForQuota: false,
      scoreSink: false,
      itemColor: shortcut.itemColor || null,
      requiredItemColor: isColorToll ? shortcut.itemColor : null,
      strictItemColor: isColorToll,
      requiredCount,
      completionScoreReward: 0,
      completionScrapReward: 0,
      label: `${isColorToll ? 'TOLL ' : 'KEY '}${colorLabel}${tierLabel} x${requiredCount}`,
    };
  }

  spawnShortcutDeliveryNode(shortcut, index = 0) {
    try {
      if (!shortcut || this.gameOver || this.paused || !this.grid) return null;
      if (!this.deliveryNodes) this.deliveryNodes = [];

      const cell = this.grid.getCell(shortcut.x, shortcut.y);
      if (cell?.type !== 'empty') {
        console.warn(
          `[BOARD] Could not place shortcut order at (${shortcut.x}, ${shortcut.y}); cell occupied`
        );
        return null;
      }

      const worldPos = this.grid.gridToWorld(shortcut.x, shortcut.y);
      if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
        console.error('[BOARD] Invalid shortcut order position:', shortcut, worldPos);
        return null;
      }

      const deliveryNode = new DeliveryNode(this, {
        x: worldPos.x,
        y: worldPos.y,
        gridX: shortcut.x,
        gridY: shortcut.y,
        lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier(),
        pointsPerResource: 0,
        isShortcutNode: true,
        condition: this.createShortcutDeliveryCondition(shortcut, index),
      });

      this.deliveryNodes.push(deliveryNode);
      this.addToWorld(deliveryNode);
      this.grid.setCell(shortcut.x, shortcut.y, { type: 'delivery-node', object: deliveryNode });
      return deliveryNode;
    } catch (error) {
      console.error('[BOARD] Error creating shortcut delivery node:', error);
      return null;
    }
  }

  unlockBoardShortcut(node) {
    const shortcut = node?.condition?.shortcutContract;
    if (!shortcut || node.shortcutUnlocked) return;
    node.shortcutUnlocked = true;

    const unlockKeys = new Set((shortcut.unlockCells || []).map((cell) => `${cell.x},${cell.y}`));
    let unlockedCells = 0;
    for (const cellPos of shortcut.unlockCells || []) {
      const cell = this.grid?.getCell(cellPos.x, cellPos.y);
      if (cell?.type !== 'board-blocker') continue;
      this.grid.setCell(cellPos.x, cellPos.y, { type: 'empty' });
      unlockedCells += 1;
    }

    if (this.currentRoundBoard?.blockers) {
      this.currentRoundBoard.blockers = this.currentRoundBoard.blockers.filter(
        (cell) => !unlockKeys.has(`${cell.x},${cell.y}`)
      );
    }
    this.roundBoardBlockers = (this.roundBoardBlockers || []).filter(
      (cell) => !unlockKeys.has(`${cell.x},${cell.y}`)
    );

    this.grid?.drawGrid();
    this.showShortcutUnlockFeedback(node, shortcut, unlockedCells);
  }

  showShortcutUnlockFeedback(node, shortcut, unlockedCells = 0) {
    const openLabel =
      shortcut.kind === 'color-toll'
        ? 'TOLL OPEN'
        : unlockedCells > 0
          ? 'SHORTCUT OPEN'
          : 'KEY ORDER DONE';
    const label = this.add
      .text(node.x, node.y - 58, openLabel, {
        fontFamily: 'Arial Black',
        fontSize: 16,
        color: '#83f7ff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    label.setDepth(1000);
    this.addToWorld(label);

    const graphics = this.add.graphics();
    graphics.setDepth(9);
    this.addToWorld(graphics);
    for (const cell of shortcut.unlockCells || []) {
      const topLeft = this.grid.gridToWorldTopLeft(cell.x, cell.y);
      if (!topLeft) continue;
      graphics.lineStyle(3, 0x83f7ff, 0.92);
      graphics.strokeRect(
        topLeft.x + 2,
        topLeft.y + 2,
        this.grid.cellSize - 4,
        this.grid.cellSize - 4
      );
    }

    this.cameras.main.flash(110, 80, 220, 255, true);
    this.tweens.add({
      targets: [label, graphics],
      alpha: 0,
      y: label.y - 18,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        label.destroy();
        graphics.destroy();
      },
    });
  }

  setupCameras() {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Configure Main Camera (World View)
    const gameWidth = width - this.rightPanelWidth;
    const worldHeight = height * (1 - this.uiHeightRatio);

    this.cameras.main.setViewport(0, 0, gameWidth, worldHeight);
    this.cameras.main.setName('WorldCamera');

    // 2. Configure UI Camera
    // Occupies the full screen (overlay)
    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setName('UICamera');

    // 3. Create a background for the Bottom UI panel area (Machine Selection)
    const bottomUiBg = this.add.graphics();
    bottomUiBg.fillStyle(0x18222b, 1);
    bottomUiBg.fillRect(0, worldHeight, gameWidth, height * this.uiHeightRatio);
    bottomUiBg.lineStyle(2, 0x2d4150, 1);
    bottomUiBg.beginPath();
    bottomUiBg.moveTo(0, worldHeight);
    bottomUiBg.lineTo(gameWidth, worldHeight);
    bottomUiBg.strokePath();
    bottomUiBg.setScrollFactor(0);
    this.addToUI(bottomUiBg);

    // 4. Create background for Right Side Panel
    const rightPanelBg = this.add.graphics();
    rightPanelBg.fillStyle(0x0d1117, 1);
    rightPanelBg.fillRect(gameWidth, 0, this.rightPanelWidth, height);
    rightPanelBg.lineStyle(2, 0x263746, 1);
    rightPanelBg.beginPath();
    rightPanelBg.moveTo(gameWidth, 0);
    rightPanelBg.lineTo(gameWidth, height);
    rightPanelBg.strokePath();
    rightPanelBg.setScrollFactor(0);
    this.addToUI(rightPanelBg);

    console.log(
      `[GameScene] Cameras setup. World: ${gameWidth}x${worldHeight}, Right Panel: ${this.rightPanelWidth}px`
    );
  }

  // Helper handling visibility
  addToWorld(gameObject) {
    if (!gameObject) return;
    if (!this.uiCamera) return; // Safeguard if uiCamera not yet created

    if (Array.isArray(gameObject)) {
      gameObject.forEach((obj) => this.addToWorld(obj));
    } else if (gameObject.container) {
      // Handle wrapper classes with a container property (Machine, ResourceNode)
      this.uiCamera.ignore(gameObject.container);
      // console.log('[GameScene] Ignoring container for UI camera');
    } else {
      // Handle direct GameObjects
      this.uiCamera.ignore(gameObject);
      // console.log('[GameScene] Ignoring object for UI camera');
    }
  }

  addToUI(gameObject) {
    if (!gameObject) return;

    if (Array.isArray(gameObject)) {
      gameObject.forEach((obj) => this.addToUI(obj));
    } else if (gameObject.container) {
      // Handle wrapper classes with a container property
      this.cameras.main.ignore(gameObject.container);
    } else {
      // Handle direct GameObjects
      this.cameras.main.ignore(gameObject);
    }
  }
}
