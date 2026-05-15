import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import MachineRegistry from './machines/MachineRegistry';
import { MACHINE_COLORS } from './machines/BaseMachine';
import { assignLevelsToShape } from '../utils/PieceGenerator';
import { getTraitById, getTraitBandColor } from '../config/traits';

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
    this.availableMachines = [];
    this.activeMachine = null;
    this.selectedMachineType = null;
    this.placementGhost = null;

    // --- Processor Selection State ---
    this.processorTypes = [];
    this.numProcessorSlots = 3; // Number of processor slots to display
    this.availableProcessors = []; // Array of currently available processor types (one per slot)
    this.lastSelectedSlotIndex = -1; // Track which slot was last selected for refresh
    this.processorPreviewContainer = null; // Will be created in createVisuals
    this.conveyorMachineType = null; // Store conveyor type separately
    this.numLogisticsSlots = 3; // Number of logistics slots (Splitter, Merger, Underground)
    this.availableLogistics = []; // Array of currently available logistics machines
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
    this.background = this.scene.add.rectangle(0, 0, this.width, this.height, 0x2c3e50);
    this.background.setStrokeStyle(3, 0x34495e);
    this.container.add(this.background);

    // Create machine preview area with a cleaner look
    this.previewArea = this.scene.add.rectangle(0, 0, this.width - 30, this.height - 30, 0x1c2833);
    this.previewArea.setStrokeStyle(2, 0x2c3e50);
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

    // Add some factory decorations
    //this.addDecorations();
  }

  addDecorations() {
    // Add some factory-themed decorations
    const gearSize = 20;
    const gear1 = this.scene.add.circle(
      -this.width / 2 + gearSize,
      -this.height / 2 + gearSize,
      gearSize,
      0x666666
    );
    gear1.setStrokeStyle(2, 0x444444);
    this.container.add(gear1);

    const gear2 = this.scene.add.circle(
      this.width / 2 - gearSize,
      -this.height / 2 + gearSize,
      gearSize * 0.7,
      0x666666
    );
    gear2.setStrokeStyle(2, 0x444444);
    this.container.add(gear2);

    // Add rotation animation
    this.scene.tweens.add({
      targets: gear1,
      rotation: Math.PI * 2,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });

    this.scene.tweens.add({
      targets: gear2,
      rotation: -Math.PI * 2,
      duration: 5000,
      repeat: -1,
      ease: 'Linear',
    });
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
          trait: this.selectedMachineType.trait || null,
          outputLevel: this.selectedMachineType.outputLevel || null,
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

    // Filter for machines whose ID includes 'processor' (case-insensitive)
    this.processorTypes = allMachineTypes.filter((type) =>
      type.id.toLowerCase().includes('processor')
    );

    // Filter for logistics machines
    this.logisticsTypes = allMachineTypes.filter((type) =>
      ['splitter', 'merger', 'underground-belt'].includes(type.id.toLowerCase())
    );

    // Get the conveyor type
    this.conveyorMachineType = allMachineTypes.find((type) => type.id.toLowerCase() === 'conveyor');

    if (this.processorTypes.length === 0) {
      console.warn('MachineFactory: No processor types found for selection panel.');
    }
    if (!this.conveyorMachineType) {
      console.warn('MachineFactory: Conveyor machine type not found.');
    }

    // Initialize the available processors with random selections
    this.refreshAvailableProcessors();
    this.refreshAvailableLogistics();

    console.log('MachineFactory: Initialization complete.');
    console.log(
      'Available processors:',
      this.availableProcessors.map((p) => p?.id)
    );
  }

  // Populate all processor slots with random processors from the pool
  // Each processor gets assigned dynamic input/output levels
  // Guarantees at least one slot gets a higher tier piece (L3+ output)
  refreshAvailableProcessors() {
    if (this.processorTypes.length === 0) {
      this.availableProcessors = [];
      return;
    }

    this.availableProcessors = [];
    let hasHigherTier = false;

    for (let i = 0; i < this.numProcessorSlots; i++) {
      // Force higher tier on second slot if first slot didn't get one,
      // or on last slot as final guarantee
      const forceHigherTier =
        (!hasHigherTier && i === 1) || (!hasHigherTier && i === this.numProcessorSlots - 1);

      const processorWithLevels = this.createDraftProcessor({ forceHigherTier });
      if (processorWithLevels.outputLevel > 2) {
        hasHigherTier = true;
      }

      this.availableProcessors.push(processorWithLevels);
    }

    this.ensureUsableDraft();
    this.ensureEarlyTraitDraft();
    this.markTraitIntroducedIfVisible();

    console.log(
      'Refreshed processors with levels:',
      this.availableProcessors.map((p) => `${p.id} (${p.notation})`)
    );
  }

  // Populate logistics slots
  // Populate logistics slots
  refreshAvailableLogistics() {
    if (this.logisticsTypes.length === 0) {
      this.availableLogistics = [];
      return;
    }

    // Always include all logistics types in order
    this.availableLogistics = [...this.logisticsTypes];
  }

  // Rotate the processor list: remove the selected one, shift others, add new one at end
  // The new processor gets assigned dynamic levels
  // Ensures at least one higher tier piece (L3+) remains in the rotation
  rotateProcessors(removedSlotIndex) {
    if (
      this.processorTypes.length === 0 ||
      removedSlotIndex < 0 ||
      removedSlotIndex >= this.availableProcessors.length
    ) {
      return;
    }

    // Remove the used processor
    // distinct from just replacing it, we want the others to shift filling the gap
    this.availableProcessors.splice(removedSlotIndex, 1);

    // Check if remaining processors have a higher tier piece
    const hasHigherTier = this.availableProcessors.some((p) => p.outputLevel > 2);

    // Force higher tier if none remain after removing the used one
    const forceHigherTier = !hasHigherTier;

    const newProcessor = this.createDraftProcessor({
      forceHigherTier,
      forceTrait: this.shouldForceEarlyTrait(),
    });

    this.availableProcessors.push(newProcessor);
    this.ensureUsableDraft();
    this.ensureEarlyTraitDraft();
    this.markTraitIntroducedIfVisible();

    console.log(
      `Rotated processors: removed index ${removedSlotIndex}, added ${newProcessor.id} (${newProcessor.notation}) at end`
    );
  }

  createDraftProcessor(options = {}) {
    const { requireUsable = false, ...levelOptions } = options;
    let fallback = null;

    for (let attempt = 0; attempt < 30; attempt++) {
      const randomIndex = Math.floor(Math.random() * this.processorTypes.length);
      const baseProcessor = this.processorTypes[randomIndex];
      const levelConfig = assignLevelsToShape(baseProcessor.shape, this.scene, levelOptions);
      const candidate = {
        ...baseProcessor,
        inputLevels: levelConfig.inputLevels,
        outputLevel: levelConfig.outputLevel,
        notation: levelConfig.notation,
        trait: levelConfig.trait || null,
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

  shouldForceEarlyTrait() {
    return (
      this.scene && this.scene.firstL2Placed === true && this.scene.hasIntroducedTrait === false
    );
  }

  ensureEarlyTraitDraft() {
    if (!this.shouldForceEarlyTrait()) return;
    if (this.availableProcessors.some((p) => p && p.isUsable && p.trait)) return;

    const forcedProcessor = this.createDraftProcessor({
      forceHigherTier: true,
      forceTrait: true,
    });

    if (forcedProcessor.outputLevel >= 3 && forcedProcessor.isUsable && forcedProcessor.trait) {
      this.availableProcessors[0] = forcedProcessor;
      console.log('[traits] Forced usable build-around trait into processor draft');
    }
  }

  markTraitIntroducedIfVisible() {
    if (!this.scene || this.scene.hasIntroducedTrait) return;
    if (this.availableProcessors.some((p) => p && p.isUsable && p.trait)) {
      this.scene.hasIntroducedTrait = true;
    }
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

    // --- Define positions for processors, logistics, and conveyor ---
    // Total items: 3 processors + 1 logistics + 1 conveyor = 5 items
    const totalItems = this.numProcessorSlots + this.numLogisticsSlots + 1;
    const itemSpacing = 50; // Slightly more spacing
    const totalWidth = (totalItems - 1) * itemSpacing;
    const startX = -totalWidth / 2;
    // --- End Positions ---

    // --- Display Processors ---
    let currentItemIndex = 0;
    for (let slotIndex = 0; slotIndex < this.numProcessorSlots; slotIndex++) {
      const machineType = this.availableProcessors[slotIndex];
      const itemX = startX + currentItemIndex * itemSpacing;
      const itemY = 0;
      currentItemIndex++;

      this.addMachinePreviewToPanel(machineType, itemX, itemY, slotIndex, 'processor');
    }

    // --- Display Logistics ---
    for (let slotIndex = 0; slotIndex < this.numLogisticsSlots; slotIndex++) {
      const machineType = this.availableLogistics[slotIndex];
      const itemX = startX + currentItemIndex * itemSpacing;
      const itemY = 0;
      currentItemIndex++;

      this.addMachinePreviewToPanel(machineType, itemX, itemY, slotIndex, 'logistics');
    }

    // --- Display Conveyor ---
    const conveyorX = startX + currentItemIndex * itemSpacing;
    const conveyorY = 0;
    if (this.conveyorMachineType) {
      this.addMachinePreviewToPanel(this.conveyorMachineType, conveyorX, conveyorY, -1, 'conveyor');
    }
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

    let machinePreview;
    try {
      if (this.machineRegistry.hasMachineType(machineType.id)) {
        machinePreview = this.machineRegistry.createMachinePreview(
          machineType.id,
          this.scene,
          itemX,
          itemY
        );
      } else {
        machinePreview = this.createMachinePreview(machineType, itemX, itemY);
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

      // --- ADD NOTATION LABEL FOR PROCESSORS ---
      if (category === 'processor' && machineType.notation) {
        // Determine label color based on usability
        const labelColor = machineType.isUsable !== false ? '#00ff00' : '#ff6666';
        const notationLabel = this.scene.add
          .text(itemX, itemY + 25, machineType.notation, {
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

        // --- ADD TRAIT INFO BENEATH NOTATION ---
        if (machineType.trait) {
          const traitDef = getTraitById(machineType.trait);
          const traitBandColor = getTraitBandColor(machineType.trait);
          if (traitDef) {
            const traitNameLabel = this.scene.add
              .text(itemX, itemY + 40, traitDef.name, {
                fontFamily: 'Arial',
                fontSize: 11,
                color: '#ffffff',
                fontStyle: 'bold',
              })
              .setOrigin(0.5);
            const traitBand = this.scene.add.rectangle(itemX, itemY + 54, 44, 3, traitBandColor);
            this.processorPreviewContainer.add(traitNameLabel);
            this.processorPreviewContainer.add(traitBand);
            machinePreview.traitNameLabel = traitNameLabel;
            machinePreview.traitBand = traitBand;
          }
        }
        // --- END TRAIT INFO ---
      }
      // --- END NOTATION LABEL ---

      // Interactivity
      const hitAreaSize = 50;
      machinePreview.setInteractive(
        new Phaser.Geom.Rectangle(-hitAreaSize / 2, -hitAreaSize / 2, hitAreaSize, hitAreaSize),
        Phaser.Geom.Rectangle.Contains
      );

      machinePreview.on('pointerover', () => {
        machinePreview.setScale(1.1);
        this.showMachineTooltip(machineType, this.x + itemX, this.y + itemY + 40);
      });

      machinePreview.on('pointerout', () => {
        machinePreview.setScale(1);
        this.hideMachineTooltip();
      });

      machinePreview.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        if (category === 'processor') {
          this.lastSelectedSlotIndex = slotIndex;
          this.lastSelectedCategory = 'processor';
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

  // Select a processor from a specific slot
  selectProcessorFromSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.availableProcessors.length) {
      console.warn(`Invalid slot index: ${slotIndex}`);
      return;
    }

    const machineType = this.availableProcessors[slotIndex];
    if (!machineType) {
      console.warn(`No processor in slot ${slotIndex}`);
      return;
    }

    // Track which slot was selected (for refresh after placement)
    this.lastSelectedSlotIndex = slotIndex;

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
      // Set appropriate default shapes based on machine type
      const id = machineType.id.toLowerCase();
      switch (id) {
        case 'processor-a':
        case 'processor-b':
        case 'splitter':
        case 'merger':
        case 'underground-belt':
          console.log(`[MachineFactory] Selecting machine type: ${id}`);
          machineType.shape = GAME_CONFIG.machineTypes.find((m) => m.id === id)?.shape;
          break;
        case 'advanced-processor':
          machineType.shape = GAME_CONFIG.machineTypes.find((m) => m.id === 'advanced-processor')
            ?.shape || [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0],
          ];
          break;
        case 'conveyor':
          machineType.shape = GAME_CONFIG.machineTypes.find((m) => m.id === 'conveyor')?.shape || [
            [1, 1],
          ];
          break;
        case 'cargo-loader':
          machineType.shape = GAME_CONFIG.machineTypes.find((m) => m.id === 'cargo-loader')
            ?.shape || [
            [1, 1],
            [1, 1],
          ];
          break;
        default:
          console.warn(`No default shape found for ${machineType.id}, using 1x1.`);
          machineType.shape = [[1]]; // 1x1 shape as fallback
      }
      console.log(`Assigned shape for ${machineType.id}:`, machineType.shape);
    }

    // Set the selected machine type
    this.selectedMachineType = machineType;

    // Notify any listeners (e.g., the scene)
    this.scene.events.emit('machineSelected', machineType);

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
        direction: machineType.defaultDirection || 'right',
        rotation: 0,
        trait: machineType.trait || null,
        outputLevel: machineType.outputLevel || null,
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
  }

  /**
   * Handle pointer down event
   * @param {Phaser.Input.Pointer} pointer
   */
  handlePointerDown(pointer) {
    // If not a conveyor, use standard click placement
    // Also, if it IS a conveyor but we want to allow single clicks, we can start the drag here.

    // Check basic validity first
    if (!this.selectedMachineType) return;
    if (this.isPointerOverUI(pointer)) return;

    // Check if it's a conveyor
    if (this.selectedMachineType.id === 'conveyor') {
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
    } else {
      // Standard placement for other machines
      this.handlePlaceMachine(pointer);
    }
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
    if (this.isDraggingConveyor) return;

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

      // Check if we can place the machine at the grid position
      console.log(
        `[Factory.handlePlaceMachine] Checking canPlaceMachine for ${this.selectedMachineType.id} at (${gridPos.x}, ${gridPos.y})`
      ); // LOG H7
      const canPlace = this.scene.factoryGrid.canPlaceMachine(
        this.selectedMachineType,
        gridPos.x,
        gridPos.y,
        this.selectedMachineType.direction || 'right' // Use right if direction undefined
      );
      console.log(`[Factory.handlePlaceMachine] canPlaceMachine result: ${canPlace}`); // LOG H8

      if (canPlace) {
        try {
          console.log(
            `[Factory.handlePlaceMachine] About to call scene.placeMachine for ${this.selectedMachineType.id}`
          ); // LOG H9
          // Place the machine using the scene's placeMachine method
          const placedMachine = this.scene.placeMachine(
            this.selectedMachineType,
            gridPos.x,
            gridPos.y,
            this.selectedMachineType.rotation || 0
          );

          if (placedMachine) {
            console.log(
              `[Factory.handlePlaceMachine] scene.placeMachine SUCCESS for ${this.selectedMachineType.id}`
            ); // LOG H10
            // Play a placement sound
            this.scene.playSound('place');

            // If a processor or logistics was placed
            if (this.lastSelectedCategory === 'processor' && this.lastSelectedSlotIndex >= 0) {
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
              this.rotateLogistics(this.lastSelectedSlotIndex);
              this.displayCurrentProcessorPreview();
              // DO NOT clear selection for logistics - keep them valid for next placement
              // DO NOT reset lastSelectedCategory/Index so we know what slot we are on
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
        if (typeOrId.notation) {
          config.notation = typeOrId.notation;
        }
        if (typeOrId.trait) {
          config.trait = typeOrId.trait;
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

      if (
        this.scene &&
        this.scene.firstL2Placed === false &&
        machine &&
        machine.outputLevel === 2
      ) {
        this.scene.firstL2Placed = true;
        console.log('[traits] firstL2Placed armed; next draft will guarantee a trait');
      }

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
      200,
      100, // Increase initial height for better spacing
      0x000000,
      0.8
    );
    tooltipBg.setStrokeStyle(1, 0xffffff, 0.5);
    this.tooltip.add(tooltipBg);

    // Add machine name (moved up for more spacing)
    const nameText = this.scene.add
      .text(
        0,
        -35, // Moved up to create more space
        machineType.name || 'Unknown Machine',
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
    let tooltipText = '';

    // Simplified descriptions for logistics items
    if (machineType.id === 'conveyor') {
      tooltipText = 'Transports items between machines and nodes.\n\n';
      tooltipText += 'Place on resource nodes to extract resources.\n';
      tooltipText += 'Connect to machines to transfer items.';
    } else if (machineType.id === 'splitter') {
      tooltipText = 'Splits incoming items between two outputs.\n\n';
      tooltipText += 'Alternates items left and right.';
    } else if (machineType.id === 'merger') {
      tooltipText = 'Combines items from multiple inputs.\n\n';
      tooltipText += 'Merges two input paths into one output.';
    } else if (machineType.id === 'underground-belt') {
      tooltipText = 'Transports items underground.\n\n';
      tooltipText += 'Use to pass under machines or other belts.';
    } else {
      // Regular machine tooltip for processors

      // Add inputs with quantities if available
      if (machineType.requiredInputs && Object.keys(machineType.requiredInputs).length > 0) {
        tooltipText += 'Inputs:\n';
        for (const [type, amount] of Object.entries(machineType.requiredInputs)) {
          tooltipText += `  • ${amount}× ${this.formatResourceName(type)}\n`;
        }
      } else if (machineType.inputTypes && machineType.inputTypes.length > 0) {
        tooltipText += 'Inputs:\n';
        machineType.inputTypes.forEach((type) => {
          tooltipText += `  • ${this.formatResourceName(type)}\n`;
        });
      }

      // Add outputs
      if (machineType.outputTypes && machineType.outputTypes.length > 0) {
        tooltipText += 'Outputs:\n';
        machineType.outputTypes.forEach((type) => {
          tooltipText += `  • ${this.formatResourceName(type)}\n`;
        });
      }

      // Add processing time if available
      if (machineType.processingTime) {
        tooltipText += `Processing time: ${machineType.processingTime / 1000}s`;
      }
    }

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
          wordWrap: { width: 180 },
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
    tooltipBg.height = Math.max(100, 80 + tooltipContent.height);

    // Log that we're creating a tooltip (for debugging)
    console.log(
      `Creating tooltip for ${machineType.id} at (${x}, ${y}) with content: ${tooltipText}`
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

  /**
   * Hide the machine tooltip
   */
  hideMachineTooltip() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  /**
   * Create a machine of the specified type at the given position
   * @param {Object} machineType - The machine type to create
   * @param {number} x - X position for the machine
   * @param {number} y - Y position for the machine
   * @returns {Phaser.GameObjects.Container} The created machine
   */
  createMachineOfType(machineType, _x, _y) {
    console.warn('createMachineOfType is potentially redundant. Consider using createMachine.');
    // Create the machine using the registry/preview method - Needs review
    // This implementation seems wrong - it's creating another *preview* not a machine instance.
    // let machine = this.createMachinePreview(machineType, x, y);

    // Correct approach: Use the registry to create an actual machine instance
    let machineInstance = null;
    if (this.machineRegistry.hasMachineType(machineType.id)) {
      // This needs the actual grid config, not just x, y for a preview
      // We probably shouldn't call this from here. Placement logic should handle creation.
      console.error(
        'createMachineOfType should likely not be called directly. Placement logic needed.'
      );
      // Example of how it *might* look if grid/config were available:
      /*
             const config = {
                 grid: this.scene.factoryGrid, // Assuming scene has the grid
                 gridX: x, // Needs conversion from world/UI coords to grid coords
                 gridY: y,
                 direction: machineType.defaultDirection || 'right'
             };
             machineInstance = this.machineRegistry.createMachine(machineType.id, this.scene, config);
             */
    } else {
      console.error(`Machine type ${machineType.id} not found in registry for createMachineOfType`);
    }

    if (machineInstance) {
      // Add to scene, etc. - This logic belongs elsewhere (e.g., GameScene placement)
      console.log(
        'Machine instance created (but not added/managed by this function):',
        machineInstance
      );
    }

    // Return the instance (or null)
    return machineInstance;

    /* Original problematic code:
        if (machine) {
            // Add to container (This adds a *preview* to the factory UI, not a game machine)
             this.container.add(machine); // This seems wrong

            // Make the preview interactive (Redundant with selection panel?)
            machine.setInteractive(new Phaser.Geom.Rectangle(
                -30, -30, 60, 60
            ), Phaser.Geom.Rectangle.Contains);

            // Add hover effect
            machine.on('pointerover', () => {
                machine.setScale(1.1);
                this.showMachineTooltip(machineType, x, y + 40);
            });

            machine.on('pointerout', () => {
                machine.setScale(1);
                this.hideMachineTooltip();
            });

            // Add click handler
            machine.on('pointerdown', () => {
                 // This selects the type again, causing potential issues
                this.selectMachineType(machineType);
            });

            // Store in available machines (Adds another preview reference)
            this.availableMachines.push({
                preview: machine,
                type: machineType
            });
        }

        return machine; // Returns the preview container
        */
  }

  getMachineTypeById(id) {
    try {
      // Check if we have a machineRegistry
      if (this.machineRegistry && typeof this.machineRegistry.getMachineConfig === 'function') {
        // Use the registry to get the machine configuration
        return this.machineRegistry.getMachineConfig(id);
      }

      // Look in the availableMachines array as a fallback
      if (this.availableMachines && Array.isArray(this.availableMachines)) {
        for (const machineEntry of this.availableMachines) {
          if (machineEntry.type && machineEntry.type.id === id) {
            return machineEntry.type;
          }
        }
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
        machineType: this.selectedMachineType,
      };

      this.scene.updatePlacementPreview(previewMachine);
    }
  }
}
