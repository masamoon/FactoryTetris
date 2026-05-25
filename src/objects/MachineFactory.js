import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import MachineRegistry from './machines/MachineRegistry';
import { MACHINE_COLORS } from './machines/BaseMachine';
import { assignLevelsToShape } from '../utils/PieceGenerator';
import { getTraitById, getTraitBandColor } from '../config/traits';
import { ARITHMETIC_OPERATION_TYPES } from '../config/resourceLevels';
import { createPieceDeckForRound, getPieceDeckEntryById } from '../config/pieceDeck';
import { isProcessingPieceBodyId, normalizeProcessingPieceBodyId } from '../config/pieceBodies';

export default class MachineFactory {
  constructor(scene, config) {
    this.scene = scene;
    this.x = config.x;
    this.y = config.y - 10; // Move up slightly to prevent being cut off
    // Adjust the width and height for a better UI
    this.width = config.width; // Use exact config width
    this.height = config.height; // Use exact config height

    // Initialize the machine registry
    this.machineRegistry = new MachineRegistry();

    // Available machines
    this.activeMachine = null;
    this.selectedMachineType = null;
    this.placementGhost = null;

    // --- Processor Selection State ---
    this.processorTypes = [];
    this.numProcessorSlots = 3; // Number of processor slots to display
    this.availableProcessors = []; // Array of currently available processor types (one per slot)
    this.processorDeck = [];
    this.processorDiscard = [];
    this.bonusPieceCards = [];
    this.panelPreviewItems = [];
    this.lastSelectedSlotIndex = -1; // Track which slot was last selected for refresh
    this.processorPreviewContainer = null; // Will be created in createVisuals
    this.conveyorMachineType = null; // Store conveyor type separately
    this.numLogisticsSlots = 4; // Splitter, Merger, Underground, Painter
    this.availableLogistics = []; // Array of currently available logistics machines
    this.lockedLogistics = []; // Logistics shown as future meta unlocks
    this.logisticsTypes = []; // Pool of logistics machine types

    // --- Conveyor Drag State ---
    this.isDraggingConveyor = false;
    this.dragPath = []; // Array of {x, y} grid positions
    this.lastDragGridPos = null;
    // --- End Processor Selection State ---

    // Create visual representation
    this.createVisuals();

    // Get processor types
    this.initializeProcessorTypes(); // Call method to populate processor types

    // Create machine selection panel (now specifically for the rotating processor)
    this.createProcessorSelectionPanel(); // Renamed for clarity

    // Listen for pointer events for machine placement
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    // Also handle pointer up outside the canvas to cancel/finish drag
    this.scene.input.on('gameout', this.handlePointerUp, this);
  }

  createVisuals() {
    // Create container for factory parts
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setScrollFactor(0);

    // Create factory background with a more modern look
    this.background = this.scene.add.rectangle(0, 0, this.width, this.height, 0x111a22);
    this.background.setStrokeStyle(2, 0x2f4657);
    this.container.add(this.background);

    // Create machine preview area with a cleaner look
    this.previewArea = this.scene.add.rectangle(0, 0, this.width - 34, this.height - 28, 0x17232d);
    this.previewArea.setStrokeStyle(1, 0x355466);
    this.container.add(this.previewArea);

    // Create a dedicated container for the single rotating processor preview
    this.processorPreviewContainer = this.scene.add.container(0, 0); // Positioned at the center of the factory container
    this.container.add(this.processorPreviewContainer);

    // Add a title for the machine selection panel (Optional)
    /*const title = this.scene.add.text(
            0, 
            -this.height / 2 + 15, 
            "PROCESSOR", // Changed title
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.container.add(title);*/

    // Create a container for the machine previews (No longer used for processors)
    // this.scrollContainer = this.scene.add.container(0, 0);
    // this.container.add(this.scrollContainer);
  }

  update() {
    // Skip update if no machine is selected
    if (!this.selectedMachineType) {
      return;
    }

    // Get the active pointer
    const pointer = this.scene.input.activePointer;

    // Only update placement preview if the pointer is over the game area
    if (!this.isPointerOverUI(pointer) && pointer.worldX && pointer.worldY) {
      // Call updatePlacementPreview with the selected machine type
      if (this.scene.updatePlacementPreview && !this.isDraggingConveyor) {
        // Create a dummy machine object for the preview
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
          machineType: this.selectedMachineType,
        };

        this.scene.updatePlacementPreview(previewMachine);
      }
    }
  }

  // New method to filter and store processor types
  initializeProcessorTypes() {
    const machineConfigs = this.machineRegistry.getAllMachineConfigs();
    const allMachineTypes = machineConfigs.length > 0 ? machineConfigs : GAME_CONFIG.machineTypes;

    this.processorTypes = allMachineTypes.filter(
      (type) =>
        type.category === 'operator' ||
        type.machineFamily === 'operator' ||
        isProcessingPieceBodyId(type.id)
    );

    // Filter for logistics machines
    this.logisticsTypes = allMachineTypes.filter((type) =>
      ['splitter', 'merger', 'underground-belt', 'painter', 'filter-splitter'].includes(
        type.id.toLowerCase()
      )
    );

    // Get the conveyor type
    this.conveyorMachineType = allMachineTypes.find((type) => type.id.toLowerCase() === 'conveyor');

    if (this.processorTypes.length === 0) {
      console.warn('MachineFactory: No operator body types found for selection panel.');
    }
    if (!this.conveyorMachineType) {
      console.warn('MachineFactory: Conveyor machine type not found.');
    }

    // Initialize the available processors with draws from the current piece deck
    this.refreshProcessorHand();
    this.refreshAvailableLogistics();

    console.log('MachineFactory: Initialization complete.');
    console.log(
      'Available processors:',
      this.availableProcessors.map((p) => p?.id)
    );
  }

  buildProcessorDeck() {
    this.processorDeck = [
      ...createPieceDeckForRound(
        this.scene?.currentRound || 1,
        GAME_CONFIG.starterDraftRounds || 1
      ),
      ...this.bonusPieceCards,
    ];
    this.shuffleProcessorDeck();
    this.processorDiscard = [];
  }

  shuffleProcessorDeck() {
    for (let i = this.processorDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.processorDeck[i], this.processorDeck[j]] = [
        this.processorDeck[j],
        this.processorDeck[i],
      ];
    }
  }

  drawPieceCard() {
    if (this.processorDeck.length === 0) {
      this.processorDeck = [...this.processorDiscard];
      this.processorDiscard = [];
      this.shuffleProcessorDeck();
    }

    return this.processorDeck.pop() || null;
  }

  getProcessorTypeById(machineTypeId) {
    const normalizedId = normalizeProcessingPieceBodyId(machineTypeId);
    return this.processorTypes.find((type) => type.id === normalizedId) || null;
  }

  // Populate all processor slots with named pieces from the deck.
  refreshProcessorHand(options = {}) {
    if (this.processorTypes.length === 0) {
      this.availableProcessors = [];
      return;
    }

    const rebuildDeck = options.rebuildDeck !== false;
    if (rebuildDeck) {
      this.buildProcessorDeck();
    } else if (options.discardCurrentHand) {
      for (const processor of this.availableProcessors) {
        if (processor?.pieceCard) {
          this.processorDiscard.push(processor.pieceCard);
        }
      }
    }
    this.availableProcessors = [];

    for (let i = 0; i < this.numProcessorSlots; i++) {
      this.availableProcessors.push(this.drawProcessorPiece());
    }

    this.ensureUsableDraft();

    console.log(
      'Refreshed processor hand:',
      this.availableProcessors.map((p) => `${p.pieceName || p.name} (${p.notation})`)
    );
  }

  refreshAvailableProcessors() {
    this.refreshProcessorHand({ rebuildDeck: true });
  }

  // Populate logistics slots
  // Populate logistics slots
  refreshAvailableLogistics() {
    if (this.logisticsTypes.length === 0) {
      this.availableLogistics = [];
      this.numLogisticsSlots = 0;
      return;
    }

    this.availableLogistics = this.logisticsTypes
      .map((type) => {
        if (typeof this.scene?.getLogisticsMachinePanelType === 'function') {
          return this.scene.getLogisticsMachinePanelType(type);
        }
        if (typeof this.scene?.isLogisticsMachineUnlocked === 'function') {
          return this.scene.isLogisticsMachineUnlocked(type) ? type : null;
        }
        return type;
      })
      .filter(Boolean);

    const availableIds = new Set(this.availableLogistics.map((type) => type.id));
    this.lockedLogistics = this.logisticsTypes
      .filter((type) => {
        if (availableIds.has(type.id)) return false;
        if (typeof this.scene?.shouldShowLockedLogisticsMachine === 'function') {
          return this.scene.shouldShowLockedLogisticsMachine(type);
        }
        if (typeof this.scene?.isLogisticsMachineUnlocked === 'function') {
          return !this.scene.isLogisticsMachineUnlocked(type);
        }
        return false;
      })
      .map((type) => ({
        ...type,
        isLocked: true,
        lockedReason:
          this.scene?.getLogisticsUnlockHint?.(type) ||
          'Unlock this tool through meta progression.',
      }));
    this.numLogisticsSlots = this.availableLogistics.length;
  }

  getDisplayedLogisticsTypes() {
    return [...this.availableLogistics, ...this.lockedLogistics];
  }

  // Replace the used piece with the next card from the deck.
  replaceUsedProcessorPiece(removedSlotIndex) {
    if (
      this.processorTypes.length === 0 ||
      removedSlotIndex < 0 ||
      removedSlotIndex >= this.availableProcessors.length
    ) {
      return;
    }

    const usedPiece = this.availableProcessors[removedSlotIndex];
    if (usedPiece?.pieceCard) {
      this.processorDiscard.push(usedPiece.pieceCard);
    }

    const newProcessor = this.drawProcessorPiece();

    this.availableProcessors[removedSlotIndex] = newProcessor;
    this.ensureUsableDraft();

    console.log(
      `Replaced processor piece: removed index ${removedSlotIndex}, drew ${newProcessor.pieceName || newProcessor.name} (${newProcessor.notation})`
    );
  }

  rotateProcessors(removedSlotIndex) {
    this.replaceUsedProcessorPiece(removedSlotIndex);
  }

  drawProcessorPiece(options = {}) {
    const card = options.pieceCard || this.drawPieceCard();
    if (!card) {
      return this.createDraftProcessor(options);
    }

    const baseProcessor = this.getProcessorTypeById(card.bodyId || card.machineTypeId);
    if (!baseProcessor) {
      console.warn(`[piece-deck] Missing piece body for card ${card.id}: ${card.bodyId}`);
      return this.createDraftProcessor(options);
    }

    return this.createProcessorPieceFromCard(card, baseProcessor, options);
  }

  createProcessorPieceFromCard(card, baseProcessor, options = {}) {
    const levelConfig = assignLevelsToShape(baseProcessor.shape, this.scene, {
      ...options,
      forcedArithmeticOperation: card.arithmeticOperation || options.forcedArithmeticOperation,
    });
    const inputLevels = Array.isArray(levelConfig.inputLevels) ? levelConfig.inputLevels : [1];

    return {
      ...baseProcessor,
      inputLevels,
      outputLevel: levelConfig.outputLevel,
      previewOutputLevel: levelConfig.previewOutputLevel,
      notation: levelConfig.notation,
      arithmeticOperation: levelConfig.arithmeticOperation || null,
      arithmeticInputCount: levelConfig.arithmeticInputCount || 0,
      trait: card.trait || null,
      isUsable: levelConfig.isUsable,
      pieceCard: card,
      pieceId: card.id,
      pieceName: card.name,
      pieceShortName: card.shortName || card.name,
      bodyId: normalizeProcessingPieceBodyId(card.bodyId || baseProcessor.id),
    };
  }

  createDraftProcessor(options = {}) {
    const { requireUsable = false, ...levelOptions } = options;
    let fallback = null;

    for (let attempt = 0; attempt < 30; attempt++) {
      const randomIndex = Math.floor(Math.random() * this.processorTypes.length);
      const baseProcessor = this.processorTypes[randomIndex];
      const levelConfig = assignLevelsToShape(baseProcessor.shape, this.scene, levelOptions);
      const inputLevels = Array.isArray(levelConfig.inputLevels) ? levelConfig.inputLevels : [1];
      const candidate = {
        ...baseProcessor,
        inputLevels,
        outputLevel: levelConfig.outputLevel,
        previewOutputLevel: levelConfig.previewOutputLevel,
        notation: levelConfig.notation,
        arithmeticOperation: levelConfig.arithmeticOperation || null,
        arithmeticInputCount: levelConfig.arithmeticInputCount || 0,
        trait: options.trait || null,
        isUsable: levelConfig.isUsable,
      };

      fallback = fallback || candidate;
      if (!requireUsable || candidate.isUsable) {
        return candidate;
      }
    }

    return fallback;
  }

  ensureUsableDraft() {
    if (this.availableProcessors.some((p) => p && p.isUsable)) return;

    const usableProcessor = this.createDraftProcessor({ requireUsable: true });
    if (usableProcessor && usableProcessor.isUsable) {
      this.availableProcessors[0] = usableProcessor;
      console.log('[draft] Forced usable processor into slot 0');
    }
  }

  getDraftOutputLevel(machineType) {
    return machineType?.outputLevel || machineType?.previewOutputLevel || 1;
  }

  injectDraftProcessor(options = {}) {
    const slotIndex = Phaser.Math.Clamp(options.slotIndex ?? 0, 0, this.numProcessorSlots - 1);
    const processor = this.createDraftProcessor({
      ...options,
      requireUsable: options.requireUsable !== false,
    });

    if (!processor) return false;

    this.availableProcessors[slotIndex] = processor;
    this.displayCurrentProcessorPreview();
    return true;
  }

  injectAddConstantDraft(value = 1, slotIndex = 0) {
    return this.injectDraftProcessor({
      slotIndex,
      forcedArithmeticOperation: {
        type: ARITHMETIC_OPERATION_TYPES.ADD_CONSTANT,
        value,
      },
    });
  }

  rerollProcessorDrafts() {
    this.refreshProcessorHand({ rebuildDeck: false, discardCurrentHand: true });
    this.displayCurrentProcessorPreview();
  }

  canCycleProcessorSlot(slotIndex) {
    return (
      this.processorTypes.length > 0 &&
      slotIndex >= 0 &&
      slotIndex < this.availableProcessors.length &&
      Boolean(this.availableProcessors[slotIndex])
    );
  }

  cycleProcessorSlot(slotIndex) {
    if (!this.canCycleProcessorSlot(slotIndex)) {
      return false;
    }

    const oldProcessor = this.availableProcessors[slotIndex];
    if (oldProcessor?.pieceCard) {
      this.processorDiscard.push(oldProcessor.pieceCard);
    }

    const newProcessor = this.drawProcessorPiece();
    this.availableProcessors[slotIndex] = newProcessor;
    this.ensureUsableDraft();
    this.displayCurrentProcessorPreview();

    if (this.lastSelectedCategory === 'operator' && this.lastSelectedSlotIndex === slotIndex) {
      this.clearSelection();
      this.lastSelectedCategory = null;
      this.lastSelectedSlotIndex = -1;
    }

    return true;
  }

  redrawProcessorHand() {
    this.rerollProcessorDrafts();
    if (this.lastSelectedCategory === 'operator') {
      this.clearSelection();
      this.lastSelectedCategory = null;
      this.lastSelectedSlotIndex = -1;
    }
    return this.availableProcessors.length > 0;
  }

  addPieceCardToRunDeck(pieceId) {
    const template = getPieceDeckEntryById(pieceId);
    if (!template) return null;

    return this.addPieceCardToRunDeckFromCard(template);
  }

  addPieceCardToRunDeckFromCard(pieceCard) {
    if (!pieceCard) return null;

    const card = {
      ...pieceCard,
      copies: 1,
      instanceId: `${pieceCard.id || 'operator'}-reward-${this.bonusPieceCards.length + 1}`,
    };
    this.bonusPieceCards.push(card);
    this.processorDiscard.push(card);
    this.displayCurrentProcessorPreview();
    return card;
  }

  getDeckCounts() {
    return {
      deck: this.processorDeck.length,
      discard: this.processorDiscard.length,
      bonus: this.bonusPieceCards.length,
    };
  }

  // Rotate logistics roster
  // Rotate logistics roster - NOW DISABLED for static logistics
  rotateLogistics(_removedSlotIndex) {
    // Logistics items (belts, splitters, mergers, underground) do not rotate.
    // They are always available.
    return;
  }

  // Renamed and repurposed method
  createProcessorSelectionPanel() {
    // Ensure we have processor types before displaying
    if (this.processorTypes.length === 0) {
      console.log('No processors available to display in the panel.');
      return;
    }
    // Display the initial processor
    this.displayCurrentProcessorPreview();
  }

  // Display all available processor previews and conveyor
  displayCurrentProcessorPreview() {
    // Clear any existing preview in the container
    this.processorPreviewContainer.removeAll(true); // Destroy children
    this.panelPreviewItems = [];

    const processorY = -26;
    const logisticsY = 34;
    const processorSpacing = 112;
    const logisticsSpacing = 80;
    const processorStartX = -((this.numProcessorSlots - 1) * processorSpacing) / 2;
    const logisticsDisplayTypes = this.getDisplayedLogisticsTypes();
    const logisticsSlotCount = logisticsDisplayTypes.length;
    const logisticsItems = logisticsSlotCount + 1;
    const logisticsStartX = -((logisticsItems - 1) * logisticsSpacing) / 2;

    const processorLabel = this.scene.add
      .text(-this.width / 2 + 32, -this.height / 2 + 14, 'OPERATORS', {
        fontFamily: 'Arial Black',
        fontSize: 10,
        color: '#88ccff',
        align: 'left',
      })
      .setOrigin(0, 0.5);
    const logisticsLabel = this.scene.add
      .text(-this.width / 2 + 32, 2, 'LOGISTICS', {
        fontFamily: 'Arial Black',
        fontSize: 10,
        color: '#ffd166',
        align: 'left',
      })
      .setOrigin(0, 0.5);
    this.processorPreviewContainer.add([processorLabel, logisticsLabel]);

    // --- Display Operators ---
    for (let slotIndex = 0; slotIndex < this.numProcessorSlots; slotIndex++) {
      const machineType = this.availableProcessors[slotIndex];
      const itemX = processorStartX + slotIndex * processorSpacing;

      this.addMachinePreviewToPanel(machineType, itemX, processorY, slotIndex, 'operator');
    }

    // --- Display Logistics ---
    for (let slotIndex = 0; slotIndex < logisticsSlotCount; slotIndex++) {
      const machineType = logisticsDisplayTypes[slotIndex];
      const itemX = logisticsStartX + slotIndex * logisticsSpacing;

      this.addMachinePreviewToPanel(machineType, itemX, logisticsY, slotIndex, 'logistics');
    }

    // --- Display Conveyor ---
    const conveyorX = logisticsStartX + logisticsSlotCount * logisticsSpacing;
    if (this.conveyorMachineType) {
      this.addMachinePreviewToPanel(
        this.conveyorMachineType,
        conveyorX,
        logisticsY,
        -1,
        'conveyor'
      );
    }

    const counts = this.getDeckCounts();
    const deckText = this.scene.add
      .text(this.width / 2 - 34, -this.height / 2 + 14, `Deck ${counts.deck}`, {
        fontFamily: 'Arial',
        fontSize: 11,
        color: '#b7cbd6',
        align: 'right',
      })
      .setOrigin(1, 0.5);
    this.processorPreviewContainer.add(deckText);
    this.updatePanelSelectionHighlights();
  }

  /**
   * Helper to add a machine preview with a label and interactivity to the panel.
   */
  addMachinePreviewToPanel(machineType, itemX, itemY, slotIndex, category) {
    if (!machineType) {
      const emptyText = this.scene.add
        .text(itemX, itemY, '?', { fontSize: 16, color: '#888888' })
        .setOrigin(0.5);
      this.processorPreviewContainer.add(emptyText);
      return;
    }

    const slotStyle = this.getPanelSlotStyle(machineType, category);
    const isOperator = category === 'operator';
    const slotWidth = isOperator ? 92 : 70;
    const slotHeight = isOperator ? 62 : 50;
    const previewY = isOperator ? itemY + 8 : itemY;
    const placementCost =
      typeof this.scene?.getMachinePlacementCost === 'function'
        ? this.scene.getMachinePlacementCost(machineType)
        : machineType.placementCost || 0;
    const canAfford = !placementCost || (this.scene?.money || 0) >= placementCost;
    const slotFrame = this.scene.add
      .rectangle(itemX, itemY, slotWidth, slotHeight, canAfford ? 0x0f1820 : 0x1e1518, 0.9)
      .setStrokeStyle(
        1,
        canAfford ? slotStyle.borderColor : 0xff7777,
        machineType.isLocked ? 0.35 : 0.78
      );
    if (machineType.isLocked) {
      slotFrame.setAlpha(0.68);
    }
    this.processorPreviewContainer.add(slotFrame);

    let machinePreview;
    try {
      if (this.machineRegistry.hasMachineType(machineType.id)) {
        machinePreview = this.machineRegistry.createMachinePreview(
          machineType.id,
          this.scene,
          itemX,
          previewY
        );
      } else {
        machinePreview = this.createMachinePreview(machineType, itemX, previewY);
      }
    } catch (error) {
      console.error(`Error creating preview for ${machineType.id}:`, error);
      const errorText = this.scene.add
        .text(itemX, itemY, 'Err', { fontSize: 8, color: '#ff0000' })
        .setOrigin(0.5);
      this.processorPreviewContainer.add(errorText);
      return;
    }

    if (machinePreview) {
      this.processorPreviewContainer.add(machinePreview);
      machinePreview.machineType = machineType;
      machinePreview.slotIndex = slotIndex;
      machinePreview.category = category;
      machinePreview.slotFrame = slotFrame;
      machinePreview.basePanelScale = 1;
      machinePreview.setScale(machinePreview.basePanelScale);
      if (machineType.isLocked) {
        machinePreview.setAlpha(0.45);
      }
      this.hidePanelPreviewInternalLabels(machinePreview);
      this.panelPreviewItems.push({
        category,
        slotIndex,
        frame: slotFrame,
        color: slotStyle.borderColor,
        preview: machinePreview,
      });

      if (isOperator && machineType.notation) {
        if (machineType.pieceShortName || machineType.pieceName) {
          const nameLabel = this.scene.add
            .text(itemX, itemY - 33, machineType.pieceShortName || machineType.pieceName, {
              fontFamily: 'Arial',
              fontSize: 9,
              fontWeight: 'bold',
              color: '#dfefff',
              align: 'center',
              stroke: '#000000',
              strokeThickness: 2,
              wordWrap: { width: 62 },
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(nameLabel);
          machinePreview.nameLabel = nameLabel;
        }

        // Determine label color based on usability
        const labelColor = machineType.isUsable !== false && canAfford ? '#88ff66' : '#ff7777';
        const notationLabel = this.scene.add
          .text(itemX, itemY + 23, machineType.notation, {
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'bold',
            color: labelColor,
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5);
        this.processorPreviewContainer.add(notationLabel);

        // Store reference for potential updates
        machinePreview.notationLabel = notationLabel;

        if (machineType.arithmeticOperation && (machineType.arithmeticInputCount || 1) > 1) {
          const inputCount = machineType.arithmeticInputCount || 1;
          const ruleBadge = this.scene.add
            .text(itemX + slotWidth / 2 - 21, itemY - slotHeight / 2 + 10, `${inputCount} DIFF`, {
              fontFamily: 'Arial Black',
              fontSize: 7,
              color: '#ffe08a',
              stroke: '#000000',
              strokeThickness: 2,
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(ruleBadge);
          machinePreview.ruleBadge = ruleBadge;
        }

        if (placementCost) {
          const costBg = this.scene.add
            .rectangle(
              itemX - slotWidth / 2 + 19,
              itemY - slotHeight / 2 + 10,
              32,
              14,
              0x07111a,
              0.95
            )
            .setStrokeStyle(1, canAfford ? 0x88ffcc : 0xff7777, 0.85);
          const costLabel = this.scene.add
            .text(costBg.x, costBg.y, `$${placementCost}`, {
              fontFamily: 'Arial Black',
              fontSize: 8,
              color: canAfford ? '#88ffcc' : '#ff8888',
              align: 'center',
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(costBg);
          this.processorPreviewContainer.add(costLabel);
          machinePreview.costBg = costBg;
          machinePreview.costLabel = costLabel;
        }

        // --- ADD TRAIT INFO BENEATH NOTATION ---
        if (machineType.trait) {
          const traitDef = getTraitById(machineType.trait);
          const traitBandColor = getTraitBandColor(machineType.trait);
          if (traitDef) {
            const badgeX = itemX + slotWidth / 2 - 18;
            const badgeY = itemY - slotHeight / 2 + 9;
            const traitBand = this.scene.add.rectangle(
              itemX - slotWidth / 2 + 3,
              itemY,
              4,
              slotHeight - 8,
              traitBandColor,
              0.95
            );
            const traitBadge = this.scene.add
              .rectangle(badgeX, badgeY, 30, 12, traitBandColor, 0.95)
              .setStrokeStyle(1, 0x07111a, 0.85);
            const traitNameLabel = this.scene.add
              .text(badgeX, badgeY, this.getTraitBadgeLabel(traitDef.name), {
                fontFamily: 'Arial Black',
                fontSize: 7,
                color: '#07111a',
                align: 'center',
              })
              .setOrigin(0.5);
            this.processorPreviewContainer.add(traitBand);
            this.processorPreviewContainer.add(traitBadge);
            this.processorPreviewContainer.add(traitNameLabel);
            machinePreview.traitNameLabel = traitNameLabel;
            machinePreview.traitBand = traitBand;
            machinePreview.traitBadge = traitBadge;
          }
        }
        // --- END TRAIT INFO ---
      } else {
        const logisticsLabel = this.scene.add
          .text(itemX, itemY + 30, slotStyle.label, {
            fontFamily: 'Arial Black',
            fontSize: 9,
            color: slotStyle.textColor,
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5);
        this.processorPreviewContainer.add(logisticsLabel);
        machinePreview.nameLabel = logisticsLabel;
        if (machineType.specialLogisticsSource) {
          const badgeText =
            machineType.specialLogisticsSource === 'permanent'
              ? 'PERM'
              : `x${machineType.specialLogisticsCount || 1}`;
          const badgeColor =
            machineType.specialLogisticsSource === 'permanent' ? 0x83f7ff : 0xffd166;
          const badge = this.scene.add
            .rectangle(itemX + 23, itemY - 25, 34, 14, 0x07111a, 0.96)
            .setStrokeStyle(1, badgeColor, 0.9);
          const badgeLabel = this.scene.add
            .text(badge.x, badge.y, badgeText, {
              fontFamily: 'Arial Black',
              fontSize: 8,
              color: machineType.specialLogisticsSource === 'permanent' ? '#83f7ff' : '#ffd166',
              align: 'center',
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(badge);
          this.processorPreviewContainer.add(badgeLabel);
          machinePreview.specialBadge = badge;
          machinePreview.specialBadgeLabel = badgeLabel;
        }
        if (machineType.isLocked) {
          logisticsLabel.setText('LOCKED');
          logisticsLabel.setColor('#95aab5');
          const lockBadge = this.scene.add
            .text(itemX, itemY - 25, 'R4', {
              fontFamily: 'Arial Black',
              fontSize: 9,
              color: '#83f7ff',
              align: 'center',
              stroke: '#000000',
              strokeThickness: 2,
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(lockBadge);
          machinePreview.lockBadge = lockBadge;
        }

        if (machineType.id === 'painter') {
          const swatchColors = [0x3f8cff, 0xffd166, 0xff5f57, 0x4dd47e];
          swatchColors.forEach((color, index) => {
            const swatch = this.scene.add.rectangle(
              itemX - 15 + index * 10,
              itemY - 26,
              7,
              7,
              color
            );
            swatch.setStrokeStyle(1, 0x0b1117, 0.9);
            this.processorPreviewContainer.add(swatch);
          });
        } else if (machineType.id === 'filter-splitter') {
          const filterLine = this.scene.add.graphics();
          filterLine.lineStyle(2, 0xffd166, 0.9);
          filterLine.lineBetween(itemX - 18, itemY - 26, itemX + 18, itemY - 18);
          filterLine.lineBetween(itemX - 18, itemY - 18, itemX + 18, itemY - 26);
          this.processorPreviewContainer.add(filterLine);
        } else if (machineType.id === 'underground-belt') {
          const tunnelLine = this.scene.add.graphics();
          tunnelLine.lineStyle(2, 0xb56cff, 0.85);
          tunnelLine.setLineDash?.([5, 4]);
          tunnelLine.lineBetween(itemX - 24, itemY - 22, itemX + 24, itemY - 22);
          this.processorPreviewContainer.add(tunnelLine);
        }

        if (placementCost) {
          const costBg = this.scene.add
            .rectangle(itemX - 22, itemY - 25, 34, 14, 0x07111a, 0.95)
            .setStrokeStyle(1, canAfford ? 0x88ffcc : 0xff7777, 0.85);
          const costLabel = this.scene.add
            .text(costBg.x, costBg.y, `$${placementCost}`, {
              fontFamily: 'Arial Black',
              fontSize: 8,
              color: canAfford ? '#88ffcc' : '#ff8888',
              align: 'center',
            })
            .setOrigin(0.5);
          this.processorPreviewContainer.add(costBg);
          this.processorPreviewContainer.add(costLabel);
          machinePreview.costBg = costBg;
          machinePreview.costLabel = costLabel;
        }
      }
      // --- END NOTATION LABEL ---

      // Interactivity
      const hitAreaSize = isOperator ? slotWidth : 66;
      const hitAreaTop = isOperator ? itemY - previewY - slotHeight / 2 - 4 : -slotHeight / 2;
      const hitAreaHeight = isOperator ? slotHeight + 8 : slotHeight + 28;
      machinePreview.setInteractive(
        new Phaser.Geom.Rectangle(-hitAreaSize / 2, hitAreaTop, hitAreaSize, hitAreaHeight),
        Phaser.Geom.Rectangle.Contains
      );

      machinePreview.on('pointerover', () => {
        machinePreview.setScale(machinePreview.basePanelScale);
        slotFrame.fillColor = canAfford ? 0x1f3240 : 0x2a1d21;
        slotFrame.setStrokeStyle(
          2,
          canAfford ? slotStyle.borderColor : 0xff7777,
          machineType.isLocked ? 0.55 : 1
        );
        this.showMachineTooltip(machineType, this.x + itemX, this.y + itemY + 40);
      });

      machinePreview.on('pointerout', () => {
        machinePreview.setScale(machinePreview.basePanelScale);
        this.updatePanelSelectionHighlights();
        this.hideMachineTooltip();
      });

      machinePreview.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        if (machineType.isLocked) {
          this.scene?.showPlacementHint?.(machineType.lockedReason || 'Locked', '#83f7ff');
          return;
        }
        if (!canAfford) {
          this.scene?.showPlacementHint?.(`Need $${placementCost}`, '#ff8888');
        }
        if (category === 'operator') {
          this.lastSelectedSlotIndex = slotIndex;
          this.lastSelectedCategory = 'operator';
        } else if (category === 'logistics') {
          this.lastSelectedSlotIndex = slotIndex;
          this.lastSelectedCategory = 'logistics';
        } else {
          this.lastSelectedSlotIndex = -1;
          this.lastSelectedCategory = 'conveyor';
        }
        this.selectMachineType(machineType);
      });
    }
  }

  hidePanelPreviewInternalLabels(preview) {
    if (!preview || typeof preview.iterate !== 'function') return;

    preview.iterate((child) => {
      if (child?.type === 'Text') {
        child.setVisible(false);
      }
    });
  }

  getTraitBadgeLabel(name) {
    if (!name) return 'SP';
    const compact = String(name)
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
    return compact.slice(0, 3) || 'SP';
  }

  getTraitTooltipLine(traitId) {
    const traitDef = getTraitById(traitId);
    if (!traitDef) return null;
    return `Trait: ${traitDef.name} - ${traitDef.description}`;
  }

  updatePanelSelectionHighlights() {
    if (!Array.isArray(this.panelPreviewItems)) return;

    this.panelPreviewItems.forEach((item) => {
      const isSelected =
        item.category === this.lastSelectedCategory &&
        (item.category === 'conveyor' || item.slotIndex === this.lastSelectedSlotIndex);
      item.frame.fillColor = isSelected ? 0x203b44 : 0x0f1820;
      item.frame.setStrokeStyle(isSelected ? 2 : 1, item.color, isSelected ? 1 : 0.72);
      if (item.preview?.nameLabel) {
        item.preview.nameLabel.setAlpha(isSelected ? 1 : 0.9);
      }
    });
  }

  getPanelSlotStyle(machineType, category) {
    if (category === 'operator') {
      return { label: 'OP', borderColor: 0x3f8cff, textColor: '#88ccff' };
    }

    const styles = {
      splitter: { label: 'SPLIT', borderColor: 0xffd166, textColor: '#ffd166' },
      'filter-splitter': { label: 'FILTER', borderColor: 0xfff3bf, textColor: '#fff3bf' },
      merger: { label: 'MERGE', borderColor: 0x88ffcc, textColor: '#88ffcc' },
      'underground-belt': { label: 'UNDER', borderColor: 0xb56cff, textColor: '#d9b6ff' },
      painter: { label: 'PAINT', borderColor: 0xff5f57, textColor: '#ffaaa5' },
      conveyor: { label: 'BELT', borderColor: 0x83f7ff, textColor: '#83f7ff' },
    };

    return styles[machineType.id] || { label: 'TOOL', borderColor: 0x95aab5, textColor: '#dfefff' };
  }

  // Select an operator from a specific slot
  selectProcessorFromSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.availableProcessors.length) {
      console.warn(`Invalid slot index: ${slotIndex}`);
      return;
    }

    const machineType = this.availableProcessors[slotIndex];
    if (!machineType) {
      console.warn(`No operator in slot ${slotIndex}`);
      return;
    }

    // Track which slot was selected (for refresh after placement)
    this.lastSelectedSlotIndex = slotIndex;
    this.lastSelectedCategory = 'operator';

    // Select the machine type
    this.selectMachineType(machineType);

    console.log(`Selected ${machineType.id} from slot ${slotIndex}`);
  }

  // Helper function to brighten a color
  brightenColor(color, percent) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const brightenedR = Math.min(255, r + (r * percent) / 100);
    const brightenedG = Math.min(255, g + (g * percent) / 100);
    const brightenedB = Math.min(255, b + (b * percent) / 100);

    return (brightenedR << 16) | (brightenedG << 8) | brightenedB;
  }

  /**
   * Select a machine type and create a ghost for placement
   * @param {Object} machineType - The machine type to select
   */
  selectMachineType(machineType) {
    // Deselect any previously selected machine
    this.clearSelection();

    // Double check that the machine type has a proper shape
    if (!machineType.shape || !Array.isArray(machineType.shape)) {
      try {
        const registryConfig = this.machineRegistry.getMachineConfig(machineType.id);
        if (registryConfig?.shape) {
          machineType.shape = registryConfig.shape;
          machineType.direction =
            machineType.direction || registryConfig.direction || registryConfig.defaultDirection;
          machineType.defaultDirection =
            machineType.defaultDirection || registryConfig.defaultDirection;
        }
      } catch (_error) {
        // Fall through to the config-table fallback below.
      }
    }

    if (!machineType.shape || !Array.isArray(machineType.shape)) {
      const id = machineType.id.toLowerCase();
      const bodyId = isProcessingPieceBodyId(id) ? normalizeProcessingPieceBodyId(id) : id;
      machineType.shape = GAME_CONFIG.machineTypes.find((m) => m.id === bodyId)?.shape || [[1]];
      console.log(`Assigned shape for ${machineType.id}:`, machineType.shape);
    }

    // Set the selected machine type
    this.selectedMachineType = machineType;
    if (machineType.id !== 'conveyor') {
      this.isDraggingConveyor = false;
      this.dragPath = [];
      this.lastDragGridPos = null;
    }
    if (this.scene) {
      this.scene.isPlacingMachine = true;
      this.scene.selectedMachineType = machineType;
    }

    // Notify any listeners (e.g., the scene)
    this.scene.events.emit('machineSelected', machineType);
    this.scene.updateDraftCycleButton?.();
    this.updatePanelSelectionHighlights();

    // Create placement preview in the scene
    if (this.scene.createPlacementPreview) {
      console.log(
        '[MachineFactory] Requesting placement preview for:',
        machineType.id,
        'with shape:',
        machineType.shape
      );
      // Ensure shape is passed correctly
      const previewData = {
        id: machineType.id,
        type: machineType.id, // Keep type for potential legacy use
        shape: machineType.shape, // Use the potentially updated shape
        direction: machineType.direction || machineType.defaultDirection || 'right',
        rotation: machineType.rotation || 0,
        rotationDegrees: machineType.rotationDegrees || 0,
        trait: machineType.trait || null,
        outputLevel: machineType.outputLevel || null,
        previewOutputLevel: machineType.previewOutputLevel || null,
        machineType: machineType, // Pass the full object
      };
      console.log('[MachineFactory] Preview data:', JSON.stringify(previewData));
      this.scene.createPlacementPreview(previewData);
    } else {
      console.warn('[MachineFactory] scene.createPlacementPreview not found!');
    }
  }

  // Clear the current selection
  clearSelection() {
    // Reset the selected machine type
    this.selectedMachineType = null;
    if (this.scene) {
      this.scene.isPlacingMachine = false;
      this.scene.selectedMachineType = null;
      if (this.scene.isTouchPlacing) {
        this.scene.isTouchPlacing = false;
        this.scene.touchPreviewGridPos = null;
      }
      if (this.scene.removePlaceButton) {
        this.scene.removePlaceButton();
      }
    }

    // Remove any selection graphics (Still relevant if we add selection feedback elsewhere)
    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
    }

    // Remove any existing placement preview
    if (this.scene.removePlacementPreview) {
      this.scene.removePlacementPreview();
    }

    // Notify the scene about the deselection
    this.scene.events.emit('machineDeselected');
    this.scene.updateDraftCycleButton?.();
    this.updatePanelSelectionHighlights();
  }

  /**
   * Handle pointer down event
   * @param {Phaser.Input.Pointer} pointer
   */
  handlePointerDown(pointer) {
    // Check basic validity first
    if (!this.selectedMachineType) return;
    if (this.isPointerOverUI(pointer)) return;
    if (!this.isPrimaryPointer(pointer)) return;

    // Only conveyors use the factory-level pointer handler for drag placement.
    // Other machines are placed by GameScene's normal click handler.
    if (this.selectedMachineType.id !== 'conveyor') return;

    this.isDraggingConveyor = true;
    this.dragPath = [];
    this.lastDragGridPos = null;

    // Add the initial point
    if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridPos = this.scene.factoryGrid.worldToGrid(worldPoint.x, worldPoint.y);
      if (gridPos) {
        this.dragPath.push(gridPos);
        this.lastDragGridPos = gridPos;
        // Update preview immediately
        this.updateDragPreview();
      }
    }
  }

  isPrimaryPointer(pointer) {
    return (
      pointer?.button === 0 ||
      (pointer && typeof pointer.leftButtonDown === 'function' && pointer.leftButtonDown())
    );
  }

  /**
   * Handle pointer move event
   * @param {Phaser.Input.Pointer} pointer
   */
  handlePointerMove(pointer) {
    if (!this.isDraggingConveyor) return;

    if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridPos = this.scene.factoryGrid.worldToGrid(worldPoint.x, worldPoint.y);

      if (gridPos) {
        // If this is a new cell
        if (
          !this.lastDragGridPos ||
          gridPos.x !== this.lastDragGridPos.x ||
          gridPos.y !== this.lastDragGridPos.y
        ) {
          // Interpolate if we moved more than 1 cell to fill gaps
          if (this.lastDragGridPos) {
            const dx = gridPos.x - this.lastDragGridPos.x;
            const dy = gridPos.y - this.lastDragGridPos.y;
            const steps = Math.max(Math.abs(dx), Math.abs(dy));

            // Add intermediate points
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const ix = Math.round(this.lastDragGridPos.x + dx * t);
              const iy = Math.round(this.lastDragGridPos.y + dy * t);

              // Avoid adding duplicates (though the logic above mostly handles it, rounding might cause overlap with last point)
              const lastP = this.dragPath[this.dragPath.length - 1];
              if (!lastP || lastP.x !== ix || lastP.y !== iy) {
                this.dragPath.push({ x: ix, y: iy });
              }
            }
          } else {
            this.dragPath.push(gridPos);
          }

          this.lastDragGridPos = gridPos;
          this.updateDragPreview();
        }
      }
    }
  }

  /**
   * Handle pointer up event
   * @param {Phaser.Input.Pointer} _pointer
   */
  handlePointerUp(_pointer) {
    if (!this.isDraggingConveyor) return;

    this.isDraggingConveyor = false;

    // Execute placement for the path
    if (this.dragPath.length > 0) {
      this.placeConveyorPath();
    }

    // Clear path
    this.dragPath = [];
    this.lastDragGridPos = null;

    // Clear the custom preview
    this.scene.clearPlacementPreview();

    // If we still have the conveyor selected (which we should),
    // the update loop might try to show a single preview again.
    // That's fine.
  }

  updateDragPreview() {
    // We need a special preview function in GameScene for paths
    if (this.scene.updateConveyorPathPreview) {
      this.scene.updateConveyorPathPreview(this.dragPath, this.selectedMachineType);
    }
  }

  placeConveyorPath() {
    // Iterate through the path and place conveyors
    // We need to determine direction for each.
    // A conveyor at index i should point to i+1.
    // The last conveyor should point in the direction of the drag (or default).

    for (let i = 0; i < this.dragPath.length; i++) {
      const currentPos = this.dragPath[i];
      let direction = 'right'; // Default

      // Determine direction
      if (i < this.dragPath.length - 1) {
        const nextPos = this.dragPath[i + 1];
        if (nextPos.x > currentPos.x) direction = 'right';
        else if (nextPos.x < currentPos.x) direction = 'left';
        else if (nextPos.y > currentPos.y) direction = 'down';
        else if (nextPos.y < currentPos.y) direction = 'up';
      } else {
        // Last one.
        // If there was a previous one, continue that direction?
        // Or if we have a "current drag direction" from the last move?
        if (i > 0) {
          const prevPos = this.dragPath[i - 1];
          if (currentPos.x > prevPos.x) direction = 'right';
          else if (currentPos.x < prevPos.x) direction = 'left';
          else if (currentPos.y > prevPos.y) direction = 'down';
          else if (currentPos.y < prevPos.y) direction = 'up';
        } else {
          // Single point (click placement) - respect current rotation
          if (this.selectedMachineType && this.selectedMachineType.direction) {
            direction = this.selectedMachineType.direction;
          }
        }
      }

      // Check if valid
      const canPlace = this.scene.factoryGrid.canPlaceMachine(
        this.selectedMachineType,
        currentPos.x,
        currentPos.y,
        direction
      );

      if (canPlace) {
        this.scene.placeMachine(
          this.selectedMachineType,
          currentPos.x,
          currentPos.y,
          this.getRotationFromDirection(direction) // Helper needed? or placeMachine takes dir?
          // placeMachine takes rotation in radians usually, let's check
        );
        this.scene.playSound('place');
      }
    }
  }

  getRotationFromDirection(direction) {
    switch (direction) {
      case 'right':
        return 0;
      case 'down':
        return Math.PI / 2;
      case 'left':
        return Math.PI;
      case 'up':
        return (3 * Math.PI) / 2;
      default:
        return 0;
    }
  }

  /**
   * Handle placing a machine at the pointer's current position
   * @param {Phaser.Input.Pointer} pointer - The pointer to use for placement
   */
  handlePlaceMachine(pointer) {
    console.log(
      `[Factory.handlePlaceMachine] Called. Selected: ${this.selectedMachineType ? this.selectedMachineType.id : 'None'}`
    ); // LOG H1

    // Only proceed if NOT dragging conveyor (redundant check but safe)
    if (this.isDraggingConveyor) {
      if (this.selectedMachineType?.id === 'conveyor') return;
      this.isDraggingConveyor = false;
      this.dragPath = [];
      this.lastDragGridPos = null;
    }

    // Check if we have a selected machine type
    if (!this.selectedMachineType) {
      return;
    }

    // Prevent placing machines over UI elements
    if (this.isPointerOverUI(pointer)) {
      console.log('[Factory.handlePlaceMachine] Pointer is over UI. Aborting.'); // LOG H2
      return;
    }

    console.log('[Factory.handlePlaceMachine] Pointer NOT over UI.'); // LOG H3
    // Check if the pointer is over the factory grid
    if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
      console.log('[Factory.handlePlaceMachine] Pointer IS over grid.'); // LOG H4
      // Get the grid position from the pointer
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridPos = this.scene.factoryGrid.worldToGrid(worldPoint.x, worldPoint.y);
      if (!gridPos) {
        console.log('[Factory.handlePlaceMachine] Could not get gridPos. Aborting.'); // LOG H5
        return;
      }
      console.log(`[Factory.handlePlaceMachine] Got gridPos: (${gridPos.x}, ${gridPos.y})`); // LOG H6

      const placementDirection =
        this.selectedMachineType.direction ||
        this.selectedMachineType.defaultDirection ||
        (this.scene && typeof this.scene.getDirectionFromRotation === 'function'
          ? this.scene.getDirectionFromRotation(this.selectedMachineType.rotation || 0)
          : 'right');
      const placementRotation =
        this.selectedMachineType.rotation !== undefined
          ? this.selectedMachineType.rotation
          : this.getRotationFromDirection(placementDirection);

      // Check if we can place the machine at the grid position
      console.log(
        `[Factory.handlePlaceMachine] Checking canPlaceMachine for ${this.selectedMachineType.id} at (${gridPos.x}, ${gridPos.y})`
      ); // LOG H7
      let canPlace = this.scene.factoryGrid.canPlaceMachine(
        this.selectedMachineType,
        gridPos.x,
        gridPos.y,
        placementDirection
      );
      let placementGridPos = gridPos;
      if (
        !canPlace &&
        this.scene &&
        typeof this.scene.isProcessorTypeId === 'function' &&
        this.scene.isProcessorTypeId(this.selectedMachineType.id) &&
        typeof this.scene.findNearbyValidPlacementAnchor === 'function'
      ) {
        const nearbyAnchor = this.scene.findNearbyValidPlacementAnchor(
          this.selectedMachineType,
          gridPos.x,
          gridPos.y,
          placementDirection
        );
        if (nearbyAnchor) {
          placementGridPos = nearbyAnchor;
          canPlace = true;
        }
      }
      if (
        !canPlace &&
        !this.selectedMachineType.fromPlacedMachine &&
        this.scene &&
        typeof this.scene.canReplaceProcessor === 'function' &&
        this.scene.canReplaceProcessor(
          this.selectedMachineType,
          placementGridPos.x,
          placementGridPos.y,
          placementDirection
        )
      ) {
        canPlace = true;
      }
      console.log(`[Factory.handlePlaceMachine] canPlaceMachine result: ${canPlace}`); // LOG H8

      if (canPlace) {
        try {
          console.log(
            `[Factory.handlePlaceMachine] About to call scene.placeMachine for ${this.selectedMachineType.id}`
          ); // LOG H9
          // Place the machine using the scene's placeMachine method
          const shouldClearAfterPlacement = Boolean(this.selectedMachineType.fromPlacedMachine);
          const placedMachine = this.scene.placeMachine(
            this.selectedMachineType,
            placementGridPos.x,
            placementGridPos.y,
            placementRotation
          );

          if (placedMachine) {
            console.log(
              `[Factory.handlePlaceMachine] scene.placeMachine SUCCESS for ${this.selectedMachineType.id}`
            ); // LOG H10
            // Play a placement sound
            this.scene.playSound('place');

            if (shouldClearAfterPlacement) {
              this.clearSelection();
              this.lastSelectedCategory = null;
              this.lastSelectedSlotIndex = -1;
              return;
            }

            // If a processor or logistics was placed
            if (this.lastSelectedCategory === 'operator' && this.lastSelectedSlotIndex >= 0) {
              this.rotateProcessors(this.lastSelectedSlotIndex);
              this.displayCurrentProcessorPreview();
              this.clearSelection();
              // Reset category and slot for processors only (as they deselect)
              this.lastSelectedCategory = null;
              this.lastSelectedSlotIndex = -1;
            } else if (
              this.lastSelectedCategory === 'logistics' &&
              this.lastSelectedSlotIndex >= 0
            ) {
              const depletedTemporarySpecial =
                this.selectedMachineType?.specialLogisticsSource === 'temporary' &&
                typeof this.scene?.getSpecialLogisticsInventoryCount === 'function' &&
                this.scene.getSpecialLogisticsInventoryCount(this.selectedMachineType.id) <= 0;
              this.rotateLogistics(this.lastSelectedSlotIndex);
              this.displayCurrentProcessorPreview();
              if (depletedTemporarySpecial) {
                this.clearSelection();
                this.lastSelectedCategory = null;
                this.lastSelectedSlotIndex = -1;
              }
              // Standard logistics stay selected for repeated placement.
            }

            // Conveyor (lastSelectedSlotIndex === -1) stays selected for unlimited placement
          }
        } catch (_error) {
          // Error during machine placement
        }
      }
    }
  }

  // Check if pointer is over the UI panel
  isPointerOverUI(pointer) {
    if (!this.scene) return false;

    // Use screen dimensions directly for UI checks
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Get UI dimensions (must match GameScene)
    const rightPanelWidth = this.scene.rightPanelWidth || 300;
    const uiRatio = this.scene.uiHeightRatio !== undefined ? this.scene.uiHeightRatio : 0.25;
    const gameWidth = screenWidth - rightPanelWidth;
    const bottomPanelStart = screenHeight * (1 - uiRatio);

    // 1. Right Panel Check - blocks if pointer is in the right panel area (any Y position)
    if (pointer.x >= gameWidth) {
      // console.log(`[UI] Blocked by Right Panel: ${pointer.x} >= ${gameWidth}`);
      return true;
    }

    // 2. Bottom Panel Check - blocks if pointer is below bottom panel start AND within bottom panel width
    // The bottom panel only exists from x=0 to x=gameWidth (left of right panel)
    if (pointer.y >= bottomPanelStart && pointer.x < gameWidth) {
      // console.log(`[UI] Blocked by Bottom Panel: ${pointer.y} >= ${bottomPanelStart} && ${pointer.x} < ${gameWidth}`);
      return true;
    }

    return false;
  }

  // Helper function to get direction from rotation
  getDirectionFromRotation(rotation) {
    // Normalize rotation to 0-2π range
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Define epsilon for floating point comparison
    const epsilon = 0.01;

    // Check for exact values first (with epsilon tolerance)
    if (
      Math.abs(normalizedRotation) < epsilon ||
      Math.abs(normalizedRotation - 2 * Math.PI) < epsilon
    ) {
      return 'right';
    }

    if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
      return 'down';
    }

    if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
      return 'left';
    }

    if (Math.abs(normalizedRotation - (3 * Math.PI) / 2) < epsilon) {
      return 'up';
    }

    // Fallback to range-based checks
    if (normalizedRotation < Math.PI / 4 || normalizedRotation > (7 * Math.PI) / 4) {
      return 'right';
    } else if (normalizedRotation < (3 * Math.PI) / 4) {
      return 'down';
    } else if (normalizedRotation < (5 * Math.PI) / 4) {
      return 'left';
    } else {
      return 'up';
    }
  }

  // Create a machine preview for display or placement
  createMachinePreview(machineType, xOffset = 0, yOffset = 0) {
    if (!machineType) {
      console.error('createMachinePreview called with undefined machineType');
      return null;
    }
    if (!machineType.shape) {
      console.warn(`Machine type ${machineType.id} has no shape for preview.`);
      // Maybe assign a default shape here if needed, or rely on the caller
      // machineType.shape = [[1]]; // Example default
      // return null; // Or return null/error indicator
    }

    // Get cell size from game config as a fallback
    const cellSize = GAME_CONFIG.previewCellSize || 16; // Use a config value or default

    // Create container for preview machine
    const container = this.scene.add.container(xOffset, yOffset);

    // --- Default Shape Handling for Preview (Example) ---
    // Use the shape from machineType if available, otherwise a default
    const shape = machineType.shape || [[1]]; // Default to 1x1 if shape is missing
    const shapeWidth = shape[0]?.length || 1;
    const shapeHeight = shape.length || 1;
    // Calculate visual center X (horizontal centering)
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    // For Y, use bottom-alignment so pieces don't need visualCenterY
    // --- End Default Shape Handling ---

    // Determine input and output positions based on direction (Use default 'right' for preview)
    // Determine input and output positions based on direction (Use default 'right' for preview)
    // const direction = machineType.defaultDirection || 'right';
    // let inputPos = { x: -1, y: -1 };
    // let outputPos = { x: -1, y: -1 };

    // Simplified input/output logic for preview based on common patterns
    // This might need to be generalized or rely on static properties if machines vary greatly
    // Or better yet, use the static getPreviewSprite from the machine class itself!

    // --- Generic Preview Drawing (Placeholder/Fallback) ---
    // All cells use the unique machine color
    const machineColor = MACHINE_COLORS[machineType.id] || 0x44ff44;

    // Draw each cell based on the shape using bottom-aligned positioning
    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (shape[y] && shape[y][x] === 1) {
          // Calculate part position: X centered, Y bottom-aligned
          const partX = x * cellSize + cellSize / 2 - visualCenterX;
          // Bottom-align: last row at y=0, earlier rows go negative
          const partY = (y - shapeHeight + 1) * cellSize + cellSize / 2;

          const rect = this.scene.add.rectangle(
            partX,
            partY,
            cellSize - 2,
            cellSize - 2,
            machineColor
          );
          rect.setStrokeStyle(1, 0x555555);
          container.add(rect);

          // Add output arrow on the last cell (fallback output position)
          if (x === shapeWidth - 1 && y === shapeHeight - 1) {
            const arrowSize = cellSize * 0.3;
            const outputArrow = this.scene.add
              .triangle(
                partX,
                partY,
                -arrowSize * 0.75,
                -arrowSize * 0.7,
                -arrowSize * 0.75,
                arrowSize * 0.7,
                arrowSize * 0.75,
                0,
                0xffffff
              )
              .setOrigin(0.5, 0.5);
            // Default to pointing right for preview
            outputArrow.rotation = 0;
            outputArrow.setDepth(1);
            container.add(outputArrow);
          }
        }
      }
    }
    // --- End Generic Preview Drawing ---

    // Add a label (use machine ID if available)
    const labelText = machineType.id ? machineType.id.substring(0, 3).toUpperCase() : '?';
    const label = this.scene.add
      .text(0, 0, labelText, {
        fontFamily: 'Arial',
        fontSize: Math.max(8, cellSize * 0.6), // Scale font size
        color: '#ffffff',
      })
      .setOrigin(0.5);
    container.add(label);

    // Remove the old direction indicator (now using output arrow instead)
    return container;
  }

  // Create a direction indicator for machine previews
  createDirectionIndicator(centerX, centerY, direction) {
    // Determine color based on machine type
    let indicatorColor = 0xff9500; // Default orange color

    // Create a triangle pointing in the direction of output - directly at the specified position
    const indicator = this.scene.add
      .triangle(
        centerX,
        centerY,
        -4,
        -6, // left top
        -4,
        6, // left bottom
        8,
        0, // right point
        indicatorColor
      )
      .setOrigin(0.5, 0.5);

    // Rotate based on direction
    switch (direction) {
      case 'right':
        indicator.rotation = 0; // Point right (0 degrees)
        break;
      case 'down':
        indicator.rotation = Math.PI / 2; // Point down (90 degrees)
        break;
      case 'left':
        indicator.rotation = Math.PI; // Point left (180 degrees)
        break;
      case 'up':
        indicator.rotation = (3 * Math.PI) / 2; // Point up (270 degrees)
        break;
    }

    return indicator;
  }

  // Add input and output resource indicators to the machine preview
  addResourceIndicators(container, machineType, cellSize) {
    const width = machineType.shape[0].length * cellSize;
    const height = machineType.shape.length * cellSize;

    // Add a more prominent input indicator
    if (machineType.inputTypes.length > 0) {
      // Determine input direction (opposite of output direction)
      let inputDirection = 'none';
      switch (machineType.direction) {
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

      // Create input indicator at the appropriate edge
      if (inputDirection !== 'none') {
        let indicatorX = width / 2;
        let indicatorY = height / 2;

        // Position the indicator at the edge based on input direction
        switch (inputDirection) {
          case 'right':
            indicatorX = width - 8;
            break;
          case 'down':
            indicatorY = height - 8;
            break;
          case 'left':
            indicatorX = 8;
            break;
          case 'up':
            indicatorY = 8;
            break;
        }

        // Create a blue triangle pointing inward
        // By default, the triangle points RIGHT (same as direction indicator)
        const inputTriangle = this.scene.add
          .triangle(
            0,
            0,
            -4,
            -6, // left top
            -4,
            6, // left bottom
            8,
            0, // right point
            0x3498db // Blue color
          )
          .setOrigin(0.5, 0.5);

        // Add a small circle at the base for better visibility
        const inputCircle = this.scene.add
          .circle(
            0,
            0,
            4,
            0x3498db // Blue color
          )
          .setOrigin(0.5, 0.5);

        // Create a container for both shapes
        const inputContainer = this.scene.add.container(indicatorX, indicatorY, [
          inputCircle,
          inputTriangle,
        ]);

        // Rotate based on input direction - using the same rotation values as direction indicators
        switch (inputDirection) {
          case 'right':
            inputContainer.rotation = 0;
            break;
          case 'down':
            inputContainer.rotation = Math.PI / 2;
            break;
          case 'left':
            inputContainer.rotation = Math.PI;
            break;
          case 'up':
            inputContainer.rotation = (3 * Math.PI) / 2;
            break;
        }

        inputContainer.isResourceIndicator = true;
        container.add(inputContainer);
      }
    }

    // The output indicator is already handled by the direction indicator
  }

  /**
   * Creates a machine instance
   * @param {string|Object} typeOrId - The machine type ID or object
   * @param {number} gridX - The x coordinate on the grid
   * @param {number} gridY - The y coordinate on the grid
   * @param {string} direction - The direction the machine is facing
   * @param {number} rotation - The rotation of the machine in degrees
   * @param {Grid} grid - The grid to place the machine on
   * @param {Object} presetPosition - Optional exact position override
   * @returns {BaseMachine} The created machine instance
   */
  createMachine(
    typeOrId,
    gridX,
    gridY,
    direction,
    rotation = 0,
    grid = null,
    presetPosition = null
  ) {
    console.log(
      `[MachineFactory] createMachine called. typeOrId:`,
      typeOrId,
      `Grid Pos: (${gridX},${gridY})`
    ); // Log entry
    try {
      // Determine if we're using the new (ID string) or old (type object) format
      const isTypeObject = typeof typeOrId === 'object' && typeOrId !== null;
      const machineTypeId = isTypeObject ? typeOrId.id : typeOrId;
      console.log(`[MachineFactory] Determined machineTypeId: ${machineTypeId}`); // Log ID

      // Ensure we have a valid grid reference
      const gridRef = grid || this.scene.factoryGrid || this.scene.grid;

      if (!gridRef) {
        console.error('[MachineFactory] No valid grid reference found.'); // Log error
        return null;
      }

      // Check if the registry has this machine type
      if (!this.machineRegistry || !this.machineRegistry.hasMachineType(machineTypeId)) {
        console.error(`[MachineFactory] Machine type '${machineTypeId}' not found in registry.`); // Log error
        return null;
      }

      // Build the configuration with all parameters
      const config = {
        grid: gridRef,
        gridX: gridX,
        gridY: gridY,
        direction: direction,
        rotation: rotation,
      };

      // Add preset position if provided
      if (presetPosition) {
        config.presetPosition = presetPosition;
      }

      // If typeOrId is an object, extract level configuration properties
      if (isTypeObject) {
        if (typeOrId.inputLevels && typeOrId.inputLevels.length > 0) {
          config.inputLevels = [...typeOrId.inputLevels];
        }
        if (typeOrId.outputLevel) {
          config.outputLevel = typeOrId.outputLevel;
        }
        if (typeOrId.previewOutputLevel) {
          config.previewOutputLevel = typeOrId.previewOutputLevel;
        }
        if (typeOrId.notation) {
          config.notation = typeOrId.notation;
        }
        if (typeOrId.arithmeticOperation) {
          config.arithmeticOperation = { ...typeOrId.arithmeticOperation };
          config.arithmeticInputCount = typeOrId.arithmeticInputCount || 0;
        }
        if (typeOrId.trait) {
          config.trait = typeOrId.trait;
        }
        if (typeOrId.bodyId) {
          config.bodyId = typeOrId.bodyId;
        }
        if (typeOrId.pieceName) {
          config.pieceName = typeOrId.pieceName;
        }
        if (typeOrId.isBoardLoaner) {
          config.isBoardLoaner = true;
        }
        if (typeOrId.isFixedInfrastructure) {
          config.isFixedInfrastructure = true;
        }
      }
      console.log(`[MachineFactory] Config prepared:`, config);

      // Call the registry
      console.log(`[MachineFactory] Calling machineRegistry.createMachine for ${machineTypeId}...`);
      console.log(
        `[MachineFactory] --> Passing scene: ${this.scene ? this.scene.scene.key : 'INVALID'}, config keys: ${config ? Object.keys(config).join(', ') : 'N/A'}`
      );
      const machine = this.machineRegistry.createMachine(machineTypeId, this.scene, config);
      console.log(
        `[MachineFactory] Result from machineRegistry.createMachine:`,
        machine ? 'Success' : 'Failed/Null'
      );

      return machine;
    } catch (error) {
      console.error('[MachineFactory] Error in createMachine:', error); // Log caught error
      return null;
    }
  }

  /**
   * Show a tooltip for a machine type
   * @param {Object} machineType - The machine type to show info for
   * @param {number} x - X position for the tooltip
   * @param {number} y - Y position for the tooltip
   */
  showMachineTooltip(machineType, x, y) {
    // Remove any existing tooltip
    this.hideMachineTooltip();

    // Create tooltip container - add directly to scene
    this.tooltip = this.scene.add.container(x, y);
    this.tooltip.setDepth(10000); // Very high depth
    this.scene.addToUI(this.tooltip); // Ensure it's on the UI camera

    // Create tooltip background (make it slightly taller for better spacing)
    // const padding = 10;
    const tooltipBg = this.scene.add.rectangle(
      0,
      0,
      238,
      112, // Increase initial height for better spacing
      0x07111a,
      0.94
    );
    tooltipBg.setStrokeStyle(1, 0x83f7ff, 0.78);
    this.tooltip.add(tooltipBg);

    // Add machine name (moved up for more spacing)
    const nameText = this.scene.add
      .text(
        0,
        -35, // Moved up to create more space
        machineType.pieceName || machineType.name || 'Unknown Machine',
        {
          fontFamily: 'Arial',
          fontSize: 14,
          color: '#ffffff',
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5);
    this.tooltip.add(nameText);

    // Format input/output information
    const lines = [];

    // Simplified descriptions for logistics items
    if (machineType.id === 'conveyor') {
      lines.push('Moves items along arrows.', 'Extracts from source nodes.');
    } else if (machineType.id === 'splitter') {
      lines.push('Alternates one input to two outputs.');
    } else if (machineType.id === 'filter-splitter') {
      lines.push(
        'Routes high-tier or warm-colored items.',
        'Falls back if preferred output is blocked.'
      );
    } else if (machineType.id === 'merger') {
      lines.push('Merges inputs into one output.');
    } else if (machineType.id === 'underground-belt') {
      lines.push('Passes items under machines and belts.');
    } else if (machineType.id === 'painter') {
      lines.push('Recolors by direction.', 'Rotate to choose color.');
    } else if (machineType.arithmeticOperation) {
      const inputCount = machineType.arithmeticInputCount || 1;
      lines.push(`Op: ${machineType.notation}`);
      lines.push(
        inputCount > 1
          ? `Input: ${inputCount} different levels only`
          : 'Input: any level'
      );
      if (typeof this.scene?.getMachinePlacementCost === 'function') {
        lines.push(`Cost: $${this.scene.getMachinePlacementCost(machineType)}`);
      }
      lines.push(`Time: ${this.getOperatorProcessingTime(machineType) / 1000}s`);
    } else {
      // Regular machine tooltip for processors

      // Add inputs with quantities if available
      if (machineType.requiredInputs && Object.keys(machineType.requiredInputs).length > 0) {
        const inputs = Object.entries(machineType.requiredInputs)
          .map(([type, amount]) => `${amount}x ${this.formatResourceName(type)}`)
          .join(', ');
        lines.push(`In: ${inputs}`);
      } else if (machineType.inputTypes && machineType.inputTypes.length > 0) {
        const inputs = machineType.inputTypes
          .map((type) => this.formatResourceName(type))
          .join(', ');
        lines.push(`In: ${inputs}`);
      }

      // Add outputs
      if (machineType.outputTypes && machineType.outputTypes.length > 0) {
        const outputs = machineType.outputTypes
          .map((type) => this.formatResourceName(type))
          .join(', ');
        lines.push(`Out: ${outputs}`);
      }

      // Add processing time if available
      if (machineType.processingTime) {
        lines.push(`Time: ${machineType.processingTime / 1000}s`);
      }
    }

    const traitLine = this.getTraitTooltipLine(machineType.trait);
    if (traitLine) {
      lines.push(traitLine);
    }
    if (machineType.isLocked) {
      lines.push(machineType.lockedReason || 'Locked for now.');
    }
    if (machineType.specialLogisticsSource === 'temporary') {
      lines.push(`Limited kit: ${machineType.specialLogisticsCount || 1} available.`);
    } else if (machineType.specialLogisticsSource === 'permanent') {
      lines.push('Stabilized blueprint: pay money each placement.');
    }
    if (
      machineType.specialLogisticsSource &&
      typeof this.scene?.getMachinePlacementCost === 'function'
    ) {
      lines.push(`Placement: $${this.scene.getMachinePlacementCost(machineType)}`);
    }

    let tooltipText = lines.join('\n');

    // Make sure we have at least some text in the tooltip
    if (!tooltipText) {
      tooltipText = 'No information available';
    }

    // Create tooltip content text (moved down for more spacing)
    const tooltipContent = this.scene.add
      .text(
        0,
        15, // Moved down to create more space between title and content
        tooltipText,
        {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#ffffff',
          align: 'left',
          wordWrap: { width: 210 },
        }
      )
      .setOrigin(0.5);
    this.tooltip.add(tooltipContent);

    // Add a separator line between title and content
    const separator = this.scene.add.graphics();
    separator.lineStyle(1, 0x555555, 0.5);
    separator.lineBetween(-80, -15, 80, -15);
    this.tooltip.add(separator);

    // Adjust background height based on content with increased margin
    tooltipBg.height = Math.max(112, 84 + tooltipContent.height);
    this.tooltip.setPosition(
      Phaser.Math.Clamp(x, 128, this.scene.scale.width - 128),
      Phaser.Math.Clamp(
        y,
        tooltipBg.height / 2 + 8,
        this.scene.scale.height - tooltipBg.height / 2 - 8
      )
    );

    // Add a small animation
    this.tooltip.setScale(0.9);
    this.scene.tweens.add({
      targets: this.tooltip,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Format resource name for display
   * @param {string} resourceId - The resource ID to format
   * @returns {string} Formatted resource name
   */
  formatResourceName(resourceId) {
    if (!resourceId) return 'Unknown';

    // Split by hyphens and capitalize each word
    return resourceId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getOperatorProcessingTime(machineType) {
    const baseTime = machineType?.processingTime || 3000;
    const operation = machineType?.arithmeticOperation;
    if (!operation) return baseTime;

    switch (operation.type) {
      case 'add-constant':
        return Math.floor(baseTime * (operation.value >= 2 ? 1.12 : 1));
      case 'add':
        return Math.floor(baseTime * 1.18);
      case 'divide':
        return Math.floor(baseTime * 1.35);
      case 'multiply':
        return Math.floor(baseTime * 1.75);
      default:
        return baseTime;
    }
  }

  /**
   * Hide the machine tooltip
   */
  hideMachineTooltip() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  getMachineTypeById(id) {
    try {
      if (this.machineRegistry && typeof this.machineRegistry.getMachineConfig === 'function') {
        return this.machineRegistry.getMachineConfig(id);
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Updates the ghost machine's rotation to match the selected machine type
   */
  updateGhostRotation() {
    if (!this.placementGhost) {
      return;
    }

    if (!this.selectedMachineType) {
      return;
    }

    // Get the rotation from the selected machine type
    let rotationDegrees = 0;
    if (this.selectedMachineType.rotationDegrees !== undefined) {
      rotationDegrees = this.selectedMachineType.rotationDegrees;
    } else if (this.selectedMachineType.rotation !== undefined) {
      // Convert from radians if needed
      if (this.selectedMachineType.rotation < 10) {
        // Likely radians
        rotationDegrees = Math.round((this.selectedMachineType.rotation * 180) / Math.PI);
      } else {
        // Already in degrees
        rotationDegrees = this.selectedMachineType.rotation;
      }
    }

    // Update the ghost's direction based on rotation
    let direction;
    switch (rotationDegrees) {
      case 0:
        direction = 'right';
        break;
      case 90:
        direction = 'down';
        break;
      case 180:
        direction = 'left';
        break;
      case 270:
        direction = 'up';
        break;
      default:
        direction = 'right'; // Default
    }

    // Since this method is used by rotateMachine, we'll update only necessary values
    // and not try to manipulate the deprecated placementGhost
    this.selectedMachineType.direction = direction;
  }

  /**
   * Rotates the currently selected machine 90 degrees clockwise
   */
  rotateMachine() {
    console.log('[MACHINE_FACTORY] rotateMachine called');

    // Only rotate if we have a machine type selected
    if (!this.selectedMachineType) {
      console.log('[MACHINE_FACTORY] No machine selected to rotate');
      return;
    }

    // Instead of using radians, use degrees directly (0, 90, 180, 270)
    // Get current rotation in degrees or default to 0
    let currentRotationDegrees = 0;

    if (this.selectedMachineType.rotationDegrees !== undefined) {
      currentRotationDegrees = this.selectedMachineType.rotationDegrees;
    } else if (this.selectedMachineType.rotation !== undefined) {
      // Convert from radians if we have that instead
      if (this.selectedMachineType.rotation < 10) {
        // Likely radians
        currentRotationDegrees = Math.round((this.selectedMachineType.rotation * 180) / Math.PI);
      } else {
        // Already in degrees
        currentRotationDegrees = this.selectedMachineType.rotation;
      }
    }

    // Add 90 degrees for clockwise rotation
    let newRotationDegrees = (currentRotationDegrees + 90) % 360;

    // Store both radians and degrees for compatibility
    const newRotationRadians = (newRotationDegrees * Math.PI) / 180;
    this.selectedMachineType.rotation = newRotationRadians;
    this.selectedMachineType.rotationDegrees = newRotationDegrees;

    // Update direction based on rotation degrees
    let newDirection;
    switch (newRotationDegrees) {
      case 0:
        newDirection = 'right';
        break;
      case 90:
        newDirection = 'down';
        break;
      case 180:
        newDirection = 'left';
        break;
      case 270:
        newDirection = 'up';
        break;
      default:
        newDirection = 'right'; // Default
    }

    this.selectedMachineType.direction = newDirection;

    // Update the ghost machine's rotation
    this.updateGhostRotation();

    // Update the placement preview
    if (this.scene.updatePlacementPreview) {
      const previewMachine = {
        id: this.selectedMachineType.id,
        type: this.selectedMachineType.id,
        shape: this.selectedMachineType.shape,
        direction: this.selectedMachineType.direction,
        rotation: newRotationDegrees, // Pass rotation in degrees
        rotationDegrees: newRotationDegrees, // Explicit degrees property
        trait: this.selectedMachineType.trait || null,
        outputLevel: this.selectedMachineType.outputLevel || null,
        previewOutputLevel: this.selectedMachineType.previewOutputLevel || null,
        machineType: this.selectedMachineType,
      };

      this.scene.updatePlacementPreview(previewMachine);
    }
  }
}
