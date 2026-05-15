import Phaser from 'phaser';
import { processResource } from '../../utils/PurityUtils';
import { getLevelColor, getLevelName } from '../../config/resourceLevels';
import { getTraitById } from '../../config/traits';

// Unique colors for each machine type
const MACHINE_COLORS = {
  'processor-a': 0x4e79a7, // blue
  'processor-b': 0x03fcfc, // light blue
  'processor-c': 0xe15759, // red
  'processor-d': 0x76b7b2, // teal
  'processor-e': 0x59a14f, // green
  'advanced-processor': 0xedc948, // yellow
  'advanced-processor-1': 0xaa44aa, // purple
  'advanced-processor-2': 0xfc039d, // pink
  conveyor: 0x888888, // gray
  splitter: 0xaa88ff, // light purple
  merger: 0xff88aa, // light pink
  'underground-belt': 0x444444, // dark gray
  // Add more as needed
};
export { MACHINE_COLORS };

/**
 * Base class for all machine types
 * This class provides common functionality that all machines share
 * Specific machine types will extend this class and override methods as needed
 */
export default class BaseMachine {
  /**
   * Create a new machine
   * @param {Phaser.Scene} scene - The scene this machine belongs to
   * @param {Object} config - Configuration object
   */
  constructor(scene, config) {
    this.scene = scene;

    // Check if this is a preview instance (no grid needed)
    this.isPreview = config.preview === true;

    // Store preset position if provided (for exact positioning)
    if (config.presetPosition) {
      this.presetPosition = config.presetPosition;
      // console.log(`[BaseMachine] Constructor received preset position: (${this.presetPosition.x}, ${this.presetPosition.y})`);
    }

    // Only set grid-related properties if not in preview mode
    if (!this.isPreview) {
      //console.log(`[BaseMachine] Setting grid properties: `+this.gridX+ ` `+this.gridY+ ` `+this.rotation);
      this.grid = config.grid;
      this.gridX = config.gridX !== undefined ? config.gridX : 0;
      this.gridY = config.gridY !== undefined ? config.gridY : 0;
      this._rotation = config.rotation !== undefined ? config.rotation : 0; // Use backing field

      // Set direction based on rotation
      this.direction = config.direction || this.getDirectionFromRotation(this.rotation);
    } else {
      // For preview instances, just set default direction
      this.direction = config.direction || 'right';
    }

    // Set up initial state for tracking
    this.isProcessing = false;
    this.processingProgress = 0;
    this.isSelected = false;

    // Harmonic Interference properties
    this.isInterfered = false;
    this.efficiency = 1.0;
    this.lastInterferenceCheck = 0;
    this.interferencePulseTimer = 0;

    // Initialize with base properties
    this.initBaseProperties();

    // Let child classes define their specific properties
    this.initMachineProperties();

    // Allow config to provide trait id (set by MachineFactory for higher-tier pieces).
    // Read AFTER initMachineProperties so child classes can override defaults but
    // the runtime trait (from draft) always wins.
    if (config && config.trait) {
      this.trait = config.trait;
    }

    // Initialize inventories
    this.initInventories();

    // Only create visuals and add interactivity if not in preview mode
    // and we have a valid scene - AFTER properties are initialized
    if (!this.isPreview && this.scene) {
      // *** REMOVED Shape Rotation Logic from Constructor ***
      /*
            // Ensure shape is properly rotated based on the rotation value
            if (this.grid && this.shape) {
                // Log the shape before rotation
                
                // Apply the rotation to the shape if it wasn't already done in the child class
                if (this.rotation) {
                    // Convert rotation from radians to degrees for Grid.getRotatedShape
                    // Grid.getRotatedShape expects either a direction string or rotation in degrees, not radians
                    const rotationDegrees = (this.rotation * 180 / Math.PI) % 360;
                    
                    // Get the rotated shape using degrees
                    this.shape = this.grid.getRotatedShape(this.shape, rotationDegrees);
                    
                    // Ensure direction property is updated to match the rotation
                    // This ensures consistency between shape and direction
                    const directionFromRotation = this.getDirectionFromRotation(this.rotation);
                    if (this.direction !== directionFromRotation) {
                        this.direction = directionFromRotation;
                    }
                    
                }
            }
            */

      // Create visual representation
      this.createVisuals(); // createVisuals will now get the rotated shape itself

      // Add interactivity
      this.addInteractivity();

      // Initialize keyboard controls
      this.initKeyboardControls();

      // Fire trait onAttach hook now that the machine is fully constructed and
      // on the grid. Preview-mode machines never fire trait hooks.
      if (!this.isPreview && this.trait) {
        const def = getTraitById(this.trait);
        if (def && def.hooks && def.hooks.onAttach) {
          try {
            def.hooks.onAttach(this, this.scene);
          } catch (err) {
            console.error(`[${this.id}] trait onAttach failed for ${this.trait}:`, err);
          }
        }
      }
    }
  }

  /**
   * Get the rotation in degrees
   */
  get rotation() {
    return this._rotation;
  }

  /**
   * Set the rotation in degrees/radians
   * Note: Visual rotation is handled by drawing the rotated shape directly,
   * so we don't apply container.rotation. This value is stored for direction calculations.
   */
  set rotation(value) {
    this._rotation = value;
    // Note: We don't apply container.rotation because we draw the rotated shape directly
    // The visual representation is updated by recreating visuals, not by rotating the container
  }

  /**
   * Initialize base machine properties
   * This gets called first during construction
   */
  initBaseProperties() {
    // Initialize machine properties with defaults
    this.id = 'base-machine';
    this.name = 'Base Machine';
    this.description = 'Base machine class';
    this.shape = [[1]]; // Default 1x1 shape
    this.inputTypes = [];
    this.outputTypes = [];
    this.processingTime = 1000; // Default 1 second
    this.inputCapacity = 10; // Increased buffer size to handling mixed belts better

    // Dynamic resource level system
    // inputLevels: array of required input levels (e.g., [1] or [1, 2])
    // outputLevel: the level this machine outputs (e.g., 2)
    // notation: display string like "1/2" or "1/2/3"
    this.inputLevels = [];
    this.outputLevel = null;
    this.notation = null;
    this.trait = null;
  }

  /**
   * Initialize machine-specific properties
   * Child classes should override this method to set their specific properties
   */
  initMachineProperties() {
    // This is intentionally empty in the base class
    // Child classes will override this method
  }

  /**
   * Initialize inventory objects based on input and output types
   */
  initInventories() {
    // Initialize inventories
    this.inputInventory = {};
    this.outputInventory = {};

    // Add slots for each input type
    if (this.inputTypes && Array.isArray(this.inputTypes)) {
      this.inputTypes.forEach((type) => {
        this.inputInventory[type] = 0;
      });
    }

    // Add slots for each output type
    if (this.outputTypes && Array.isArray(this.outputTypes)) {
      this.outputTypes.forEach((type) => {
        this.outputInventory[type] = 0;
      });
    }

    // Initialize queues for preserving object data (purity/chain)
    this.inputQueue = [];
    this.outputQueue = [];
  }

  /**
   * Get the machine's ID
   * @returns {string} The machine ID
   */
  getId() {
    return this.id;
  }

  /**
   * Get the machine's display name
   * @returns {string} The display name
   */
  getDisplayName() {
    return this.name;
  }

  /**
   * Get the machine's description
   * @returns {string} The description
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get the machine's shape
   * @returns {Array<Array<number>>} 2D array representing the machine's shape
   */
  getShape() {
    return this.shape;
  }

  /**
   * Get the machine's input types
   * @returns {Array<string>} Array of input resource types
   */
  getInputTypes() {
    return this.inputTypes;
  }

  /**
   * Get the machine's output types
   * @returns {Array<string>} Array of output resource types
   */
  getOutputTypes() {
    return this.outputTypes;
  }

  /**
   * Get the machine's processing time
   * @returns {number} Processing time in milliseconds
   */
  getProcessingTime() {
    return this.processingTime;
  }

  /**
   * Set a named multiplicative modifier on this machine's processing time.
   * Multiple modifiers (e.g. Overclocked self + a neighbor's Conductor)
   * compose multiplicatively and restore cleanly regardless of order.
   * @param {string} key - unique modifier source key
   * @param {number} multiplier - factor (e.g. 0.5 = twice as fast)
   */
  setProcessingTimeModifier(key, multiplier) {
    if (this._ptBaseTime == null) {
      this._ptBaseTime = this.processingTime;
    }
    if (!this._ptModifiers) {
      this._ptModifiers = new Map();
    }
    this._ptModifiers.set(key, multiplier);
    this._recomputeProcessingTime();
  }

  /**
   * Remove a named processing-time modifier and recompute.
   * @param {string} key - the modifier source key to clear
   */
  clearProcessingTimeModifier(key) {
    if (!this._ptModifiers) return;
    this._ptModifiers.delete(key);
    this._recomputeProcessingTime();
  }

  _recomputeProcessingTime() {
    if (this._ptBaseTime == null) return;
    let factor = 1;
    if (this._ptModifiers) {
      for (const m of this._ptModifiers.values()) {
        factor *= m;
      }
    }
    this.processingTime = Math.max(50, Math.floor(this._ptBaseTime * factor));
  }

  /**
   * Get the machine's default direction
   * @returns {string} Default direction ('right', 'down', 'left', 'up', or 'none')
   */
  getDefaultDirection() {
    return this.direction;
  }

  /**
   * Convert rotation to direction
   * @param {number} rotation - Rotation in radians
   * @returns {string} Direction ('right', 'down', 'left', 'up')
   */
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

  /**
   * Create the visual representation of the machine.
   * Handles container creation, shape drawing, progress bar, direction indicator, and interactivity.
   * Subclasses should call super.createVisuals() and then add machine-specific elements (labels, cores).
   */
  createVisuals() {
    if (this.isPreview) {
      console.warn(`[${this.id}] Skipping visuals for preview instance.`);
      return; // Don't create visuals for preview instances
    }
    if (!this.grid) {
      console.warn(`[${this.id}] Cannot create visuals: grid reference is missing`);
      return;
    }

    // Get the actual rotated shape based on current direction
    // We draw the ROTATED shape directly - NO container rotation needed
    const currentDirection = this.direction || 'right';
    let rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);

    if (
      !rotatedShape ||
      !Array.isArray(rotatedShape) ||
      rotatedShape.length === 0 ||
      !Array.isArray(rotatedShape[0])
    ) {
      console.error(`[${this.id}] Invalid rotated shape. Using original shape.`);
      rotatedShape = this.shape || [[1]];
    }

    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;

    // --- Calculate Input/Output positions for the CURRENT direction ---
    let rotatedInputPos = null;
    let rotatedOutputPos = null;

    // Use the single source of truth for I/O positions with the actual direction
    const ioPositions = this.constructor.getIOPositionsForDirection
      ? this.constructor.getIOPositionsForDirection(this.id, currentDirection)
      : BaseMachine.getIOPositionsForDirection(this.id, currentDirection);

    rotatedInputPos = ioPositions.inputPos;
    rotatedOutputPos = ioPositions.outputPos;

    // --- Container Setup ---
    // Calculate visual center based on the rotated shape dimensions
    const cellSize = this.grid.cellSize;
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;

    // Position container at the VISUAL CENTER of the rotated shape
    const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
    if (!topLeftPos) {
      console.error(
        `[${this.id}] Could not get top-left position for (${this.gridX}, ${this.gridY}). Aborting visuals.`
      );
      return;
    }

    // Set container position to the center point of the rotated shape
    this.container = this.scene.add.container(
      topLeftPos.x + visualCenterX,
      topLeftPos.y + visualCenterY
    );
    // NO container rotation - we're drawing the rotated shape directly
    // The rotation value is stored for other purposes but not applied to container visually
    this._rotation = this.rotation; // Keep the rotation value but don't apply it visually

    // --- Draw Shape Parts ---
    this.inputSquare = null; // Reset references
    this.outputSquare = null;

    // Loop through each cell in the ROTATED shape
    // All cells use the unique machine color for easy identification
    const machineColor = MACHINE_COLORS[this.id] || 0x44ff44;

    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (rotatedShape[y][x] === 1) {
          // Calculate part position relative to the CENTER (0,0 in container)
          const partCenterX = x * cellSize + cellSize / 2 - visualCenterX;
          const partCenterY = y * cellSize + cellSize / 2 - visualCenterY;

          // Determine if this is an input or output cell
          let isInput = false;
          let isOutput = false;

          // Check if this is the input cell
          if (rotatedInputPos && x === rotatedInputPos.x && y === rotatedInputPos.y) {
            if (rotatedShape[y][x] === 1) {
              isInput = true;
            }
          } else if (rotatedOutputPos && x === rotatedOutputPos.x && y === rotatedOutputPos.y) {
            if (rotatedShape[y][x] === 1) {
              isOutput = true;
            }
          }

          // Create the cell rectangle - all cells use the same unique machine color
          const part = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            cellSize - 4,
            cellSize - 4,
            machineColor
          );
          part.setStrokeStyle(1, 0x333333);
          this.container.add(part);

          // Store references to input and output squares
          if (isInput) {
            this.inputSquare = part;
          }
          if (isOutput) {
            this.outputSquare = part;

            // Add output arrow indicator on the output cell
            const arrowSize = cellSize * 0.3;
            const outputArrow = this.scene.add
              .triangle(
                partCenterX,
                partCenterY,
                -arrowSize * 0.75,
                -arrowSize * 0.7,
                -arrowSize * 0.75,
                arrowSize * 0.7,
                arrowSize * 0.75,
                0,
                0xffffff
              )
              .setOrigin(0.5, 0.5);

            // Rotate arrow based on output direction
            switch (currentDirection) {
              case 'right':
                outputArrow.rotation = 0;
                break;
              case 'down':
                outputArrow.rotation = Math.PI / 2;
                break;
              case 'left':
                outputArrow.rotation = Math.PI;
                break;
              case 'up':
                outputArrow.rotation = (3 * Math.PI) / 2;
                break;
            }

            outputArrow.setDepth(1);
            this.container.add(outputArrow);
            this.outputArrow = outputArrow;
          }
        }
      }
    }

    // --- Progress Bar ---
    // Position below the visual center
    // Centered at 0,0 locally, offset by y
    this.progressBar = this.scene.add
      .rectangle(
        0, // Center X
        cellSize * 0.6, // Offset Y from center
        cellSize * shapeWidth * 0.8, // Adjust width based on shape width
        6,
        0x000000
      )
      .setOrigin(0.5);
    this.progressBar.setDepth(1);
    this.container.add(this.progressBar);

    this.progressFill = this.scene.add
      .rectangle(
        this.progressBar.x - this.progressBar.width / 2,
        this.progressBar.y,
        0,
        this.progressBar.height,
        0x00ff00
      )
      .setOrigin(0, 0.5);
    this.progressFill.setDepth(2);
    this.container.add(this.progressFill);

    this.progressBar.setVisible(false);
    this.progressFill.setVisible(false);

    // --- Direction indicator removed - output arrow on output cell is sufficient ---

    // --- Common additions ---
    this.addPlacementAnimation();
    this.addInteractivity();
  }

  /**
   * Add resource type indicators to the machine
   */
  addResourceTypeIndicators() {
    // --- Use Standard Shape (Container rotates) ---
    // const currentDirection = 'right';
    const rotatedShape = this.shape;

    if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
      return;
    }

    // Calculate width and height based on shape
    const width = rotatedShape[0].length * this.grid.cellSize;
    const height = rotatedShape.length * this.grid.cellSize;

    // Since the container is now at the center, positions need to be relative to the center
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Check if we have input levels (new system) or input types (legacy)
    const hasInputs =
      (this.inputLevels && this.inputLevels.length > 0) ||
      (this.inputTypes && this.inputTypes.length > 0);

    // Add a more prominent input indicator
    if (hasInputs) {
      // Determine input direction (opposite of output direction)
      // Use 'right' as base direction since we are in local unrotated space
      let inputDirection = 'none';
      switch ('right') {
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
        // Position the indicator at the edge based on input direction, relative to center
        let indicatorX = 0; // Center by default
        let indicatorY = 0; // Center by default

        // Position the indicator at the edge based on input direction
        switch (inputDirection) {
          case 'right':
            indicatorX = halfWidth - 8;
            break;
          case 'down':
            indicatorY = halfHeight - 8;
            break;
          case 'left':
            indicatorX = -halfWidth + 8;
            break;
          case 'up':
            indicatorY = -halfHeight + 8;
            break;
        }

        // Determine indicator color based on input level (use first input level if available)
        const inputLevel =
          this.inputLevels && this.inputLevels.length > 0 ? this.inputLevels[0] : null;
        const indicatorColor = inputLevel ? getLevelColor(inputLevel) : 0x3498db;

        // Create a triangle pointing inward with level-based color
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
            indicatorColor
          )
          .setOrigin(0.5, 0.5);

        // Add a small circle at the base for better visibility
        const inputCircle = this.scene.add.circle(0, 0, 4, indicatorColor).setOrigin(0.5, 0.5);

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
        this.container.add(inputContainer);
      }
    }

    // Add output level indicator if we have an output level
    if (this.outputLevel) {
      const outputColor = getLevelColor(this.outputLevel);

      // Add a small colored circle near the output direction to indicate output level
      // Position at the output edge (right in local space)
      const outputIndicator = this.scene.add
        .circle(halfWidth - 8, 0, 5, outputColor)
        .setOrigin(0.5, 0.5)
        .setStrokeStyle(1, 0xffffff, 0.8);

      outputIndicator.isResourceIndicator = true;
      this.container.add(outputIndicator);
    }

    // Add notation text label if available (shows input/output level notation like "1/2" or "1/2/3")
    if (this.notation) {
      const notationText = this.scene.add
        .text(0, halfHeight + 8, this.notation, {
          fontSize: '10px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);

      notationText.isResourceIndicator = true;
      this.container.add(notationText);
    }
  }

  /**
   * Add placement animation to the machine
   */
  addPlacementAnimation() {
    // Start with a scale of 0 and grow to normal size
    this.container.setScale(0);

    // Add a grow animation
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Add a flash effect
    const flash = this.scene.add.rectangle(
      0,
      0,
      this.grid.cellSize * 3,
      this.grid.cellSize * 3,
      0xffffff,
      0.8
    );
    this.container.add(flash);

    // Animate the flash
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Add interactive features to the machine
   */
  addInteractivity() {
    // Skip interactivity if explicitly requested (for preview/config purposes)
    if (this.config && this.config.skipInteractivity) {
      return;
    }

    // Skip if grid is not available
    if (!this.grid) {
      console.warn(
        `Cannot add interactivity to machine ${this.id || 'unknown'} - grid is undefined`
      );
      return;
    }

    // *** ADDED: Get rotated shape needed for calculations ***
    // Use Standard Shape
    const rotatedShape = this.shape;
    if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
      return;
    }

    // Calculate the width and height of the machine in pixels
    const width = rotatedShape[0].length * this.grid.cellSize;
    const height = rotatedShape.length * this.grid.cellSize;

    // Create a proper hit area for the container - centered around (0,0)
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-halfWidth, -halfHeight, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    // Add hover effect
    this.container.on('pointerover', () => {
      // Highlight the machine - brighten all cells uniformly
      const machineColor = MACHINE_COLORS[this.id] || 0x44ff44;
      const brightenedColor = this.brightenColor(machineColor, 40);

      this.container.list.forEach((part) => {
        if (part.type === 'Rectangle' && part !== this.progressBar && !part.isResourceIndicator) {
          part.fillColor = brightenedColor;
        }
      });

      // Show machine info tooltip
      this.showTooltip();
    });

    this.container.on('pointerout', () => {
      // Remove highlight - restore to unique machine color for all cells
      const machineColor = MACHINE_COLORS[this.id] || 0x44ff44;

      this.container.list.forEach((part) => {
        if (part.type === 'Rectangle' && part !== this.progressBar && !part.isResourceIndicator) {
          part.fillColor = machineColor;
        }
      });

      // Hide tooltip
      this.hideTooltip();
    });

    // Add click handler
    this.container.on('pointerdown', (pointer) => {
      // Stop propagation to prevent placing a new machine immediately if one is selected
      if (pointer.event) {
        pointer.event.stopPropagation();
      }

      this.setSelected(true);
      this.showDetailedInfo();
    });
  }

  /**
   * Helper to brighten a color by a percentage
   * @param {number} color - Hex color value
   * @param {number} percent - Brightness increase percentage (0-100)
   * @returns {number} Brightened hex color
   */
  brightenColor(color, percent) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const brightenedR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const brightenedG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const brightenedB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    return (brightenedR << 16) | (brightenedG << 8) | brightenedB;
  }

  /**
   * Create resource visualizations for the machine
   */
  createResourceVisualizations() {
    // Implementation will be similar to the original Machine class
    // This is a placeholder for now
  }

  /**
   * Show tooltip with basic machine info
   */
  showTooltip() {
    // Remove existing tooltip if any
    this.hideTooltip();

    // --- MODIFIED: Calculate fixed position on the right side ---
    const fixedX = this.scene.cameras.main.width - 260; // 10px padding from right edge (250 width + 10)
    const fixedY = 50; // 50px from the top
    const tooltipWidth = 250;
    const tooltipHeight = 80; // Initial height, might adjust later
    // --- END MODIFICATION ---

    // --- MODIFIED: Use fixed position for background, align top-left ---
    const tooltipBg = this.scene.add
      .rectangle(fixedX, fixedY, tooltipWidth, tooltipHeight, 0x000000, 0.8)
      .setOrigin(0, 0); // Align top-left
    tooltipBg.setStrokeStyle(1, 0xffffff);

    // Create tooltip text with inventory info
    let tooltipContent = `${this.name} (${this.direction})`;

    // Show Efficiency/Interference warning
    if (this.efficiency !== undefined && this.efficiency < 1.0) {
      tooltipContent += `\n⚠️ INTERFERENCE: Efficiency ${(this.efficiency * 100).toFixed(0)}%`;
    }

    // Add processing status
    if (this.isProcessing) {
      const progressPercent = Math.floor((this.processingProgress / this.processingTime) * 100);
      tooltipContent += `\nProcessing: ${progressPercent}%`;
    } else if (this.canProcess()) {
      tooltipContent += '\nReady to process';
    } else {
      tooltipContent += '\nWaiting for resources';
    }

    // Check if the machine is a Conveyor-like machine
    if (this.itemsOnBelt) {
      tooltipContent += '\nItems on belt: ';
      if (this.itemsOnBelt && this.itemsOnBelt.length > 0) {
        const itemCounts = {};
        this.itemsOnBelt.forEach((itemObject) => {
          const itemType = itemObject.itemData.type;
          itemCounts[itemType] = (itemCounts[itemType] || 0) + (itemObject.itemData.amount || 1);
        });
        if (Object.keys(itemCounts).length > 0) {
          tooltipContent += Object.entries(itemCounts)
            .map(([type, count]) => `${type}(${count})`)
            .join(', ');
        } else {
          tooltipContent += 'Empty';
        }
      } else {
        tooltipContent += 'Empty';
      }
    } else {
      // Show level-based input/output info (new system)
      if (this.inputLevels && this.inputLevels.length > 0) {
        const inputNames = this.inputLevels
          .map((level) => `L${level} (${getLevelName(level)})`)
          .join(', ');
        tooltipContent += `\nInputs: ${inputNames}`;
      }

      if (this.outputLevel) {
        tooltipContent += `\nOutput: L${this.outputLevel} (${getLevelName(this.outputLevel)})`;
      }

      // Show notation if available
      if (this.notation) {
        tooltipContent += `\nNotation: ${this.notation}`;
      }

      // Show current internal inventory for level-based machines
      if (this.inputQueue && this.inputQueue.length > 0) {
        // Group items by purity level
        const levelCounts = {};
        this.inputQueue.forEach((item) => {
          const level = item.purity || 1;
          levelCounts[level] = (levelCounts[level] || 0) + 1;
        });

        // Format as "L1(2), L2(1)" etc.
        const inventoryStr = Object.entries(levelCounts)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([level, count]) => `L${level}(${count})`)
          .join(', ');
        tooltipContent += `\nInventory: ${inventoryStr}`;
      } else if (this.inputLevels && this.inputLevels.length > 0) {
        // Show empty inventory for level-based machines
        tooltipContent += '\nInventory: Empty';
      }

      // Show pending output for level-based machines
      if (this.outputQueue && this.outputQueue.length > 0) {
        // Group output items by purity level
        const outputLevelCounts = {};
        this.outputQueue.forEach((item) => {
          const level = item.purity || 1;
          outputLevelCounts[level] = (outputLevelCounts[level] || 0) + 1;
        });

        // Format as "L2(1), L3(2)" etc.
        const outputStr = Object.entries(outputLevelCounts)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([level, count]) => `L${level}(${count})`)
          .join(', ');
        tooltipContent += `\nPending Output: ${outputStr}`;
      }

      // Legacy: Existing inventory info for other machines using old type system
      if (
        this.inputTypes &&
        this.inputTypes.length > 0 &&
        (!this.inputLevels || this.inputLevels.length === 0)
      ) {
        tooltipContent += '\nInputs: ';
        this.inputTypes.forEach((type) => {
          const count = this.inputInventory[type] || 0;
          tooltipContent += `${type}(${count}) `;
        });

        // Explicitly show purity-resource if present (as it acts as a wildcard)
        if (this.inputInventory['purity-resource'] > 0) {
          tooltipContent += `\nWildcard: purity-resource(${this.inputInventory['purity-resource']})`;
        }
      }

      if (this.outputTypes && this.outputTypes.length > 0 && !this.outputLevel) {
        tooltipContent += '\nOutputs: ';
        this.outputTypes.forEach((type) => {
          const count = this.outputInventory[type] || 0;
          tooltipContent += `${type}(${count}) `;
        });
      }
    }

    // --- MODIFIED: Use fixed position and top-left origin for text ---
    const tooltipText = this.scene.add
      .text(
        fixedX + 10, // Add padding from background edge
        fixedY + 10, // Add padding from background edge
        tooltipContent,
        {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#ffffff',
          align: 'left', // Align text left
          wordWrap: { width: tooltipWidth - 20 }, // Wrap text within padding
        }
      )
      .setOrigin(0, 0); // Align top-left

    // --- Optional: Adjust background height based on text height ---
    tooltipBg.height = Math.max(tooltipHeight, tooltipText.height + 20); // Add padding

    // Store tooltip objects for later removal
    this.tooltip = {
      background: tooltipBg,
      text: tooltipText,
    };

    // Set tooltip depth to ensure it appears above other objects
    tooltipBg.setDepth(1000);
    tooltipText.setDepth(1001);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      if (this.tooltip.background) this.tooltip.background.destroy();
      if (this.tooltip.text) this.tooltip.text.destroy();
      this.tooltip = null;
    }
  }

  /**
   * Show detailed machine information
   */
  showDetailedInfo() {
    // Implementation will be similar to the original Machine class
    // This is a placeholder for now
  }

  /**
   * Hide detailed info panel
   */
  hideDetailedInfo() {
    // Implementation will be similar to the original Machine class
    // This is a placeholder for now
  }

  /**
   * Update method called by the scene
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Throttle interference checks (every 500ms)
    if (time > (this.lastInterferenceCheck || 0) + 500) {
      if (typeof this.checkInterference === 'function') {
        this.checkInterference();
      }
      this.lastInterferenceCheck = time;
    }

    // --- Standard Processing Logic ---
    if (this.isProcessing) {
      // Apply speed modifier if upgrade manager exists
      let effectiveDelta = delta;
      if (
        this.scene.upgradeManager &&
        typeof this.scene.upgradeManager.getProcessorSpeedModifier === 'function'
      ) {
        effectiveDelta = delta * this.scene.upgradeManager.getProcessorSpeedModifier();
      }

      // Apply Harmonic Interference Efficiency
      effectiveDelta *= this.efficiency !== undefined ? this.efficiency : 1.0;

      this.processingProgress += effectiveDelta; // Use potentially modified delta

      // Update progress bar visual if it exists
      if (this.progressFill && this.progressBar) {
        const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
        this.progressFill.width = this.progressBar.width * progressRatio;
      } else {
        // If bar doesn't exist, log warning periodically? (Might be spammy)
        // if (this.scene.time.now % 5000 < 20) console.warn(`[${this.id}] isProcessing=true but no progress bar visuals.`);
      }

      // Check if processing is complete
      if (this.processingProgress >= this.processingTime) {
        this.completeProcessing(); // Handles outputting resources, resetting state
      }
    } else {
      // If not processing, check if we can start
      if (this.canProcess()) {
        this.startProcessing(); // Handles consuming resources, setting state
      }

      // NEW: Continuously try to push output when not processing
      // This ensures outputs move to belts/machines even when idle
      if (this.hasOutput()) {
        this.pushOutput();
      }
    }
    // --- End Standard Processing Logic ---

    try {
      // New: Attempt to pull from an adjacent input node
      if (!this.isProcessing) {
        // Only pull if not currently busy and can accept more
        this.tryPullFromInputNode();
      }

      // Call animation update if defined
      if (this.animateUpdate && typeof this.animateUpdate === 'function') {
        try {
          this.animateUpdate(time, delta);
        } catch (animationError) {
          console.error(`[${this.id || 'UnknownMachine'}] Animation error:`, animationError);
          // Disable animation to prevent continuous errors
          this.animateUpdate = null;
        }
      }

      // Update items on the machine
      if (this.items && this.items.length > 0) {
        try {
          this.updateItems(delta);
        } catch (itemsError) {
          console.error(`[${this.id || 'UnknownMachine'}] Items update error:`, itemsError);
        }
      }

      // Update indicators
      if (this.directionIndicator) {
        try {
          // Check if the method exists either on this object or in the scene
          if (typeof this.updateDirectionIndicator === 'function') {
            this.updateDirectionIndicator();
          } else if (this.scene && typeof this.scene.updateDirectionIndicator === 'function') {
            this.scene.updateDirectionIndicator(this, this.direction);
          }
        } catch (indicatorError) {
          console.error(
            `[${this.id || 'UnknownMachine'}] Direction indicator update error:`,
            indicatorError
          );
        }
      }
    } catch (error) {
      console.error(`[${this.id || 'UnknownMachine'}] Unhandled error in update method:`, error);
    }
  }

  /**
   * NEW METHOD: Attempts to pull a resource from an adjacent ResourceNode
   * into the machine's input inventory.
   * Allows pulling from multiple adjacent nodes in the same tick if possible.
   */
  tryPullFromInputNode() {
    if (!this.grid || this.isProcessing || !this.getOccupiedCells) {
      if (this.scene.time.now % 3000 < 20) {
        console.log(
          `[${this.id}] tryPullFromInputNode: Skipping (no grid OR processing OR no getOccupiedCells)`
        );
      }
      return;
    }

    const occupiedCells = this.getOccupiedCells();
    if (!occupiedCells || occupiedCells.length === 0) {
      if (this.scene.time.now % 3000 < 20) {
        console.log(`[${this.id}] tryPullFromInputNode: Skipping (no occupied cells)`);
      }
      return;
    }

    // Periodic log for occupied cells to reduce spam if needed
    // if (this.scene.time.now % 5000 < 20) {
    //     console.log(`[${this.id}] tryPullFromInputNode: Occupied cells:`, JSON.stringify(occupiedCells));
    // }

    for (const partCell of occupiedCells) {
      // For each cell the machine itself occupies
      const neighbors = [
        { dx: 0, dy: -1, side: 'up' }, // Up
        { dx: 0, dy: 1, side: 'down' }, // Down
        { dx: -1, dy: 0, side: 'left' }, // Left
        { dx: 1, dy: 0, side: 'right' }, // Right
      ];

      for (const offset of neighbors) {
        const potentialNodeX = partCell.x + offset.dx;
        const potentialNodeY = partCell.y + offset.dy;

        // Periodic log for checking neighbors to reduce spam
        // if (this.scene.time.now % 1000 < 20) {
        //      console.log(`[${this.id}] Checking neighbor of partCell (${partCell.x},${partCell.y}) at (${potentialNodeX}, ${potentialNodeY}) for node.`);
        // }

        // A. Check bounds
        if (
          potentialNodeX < 0 ||
          potentialNodeX >= this.grid.width ||
          potentialNodeY < 0 ||
          potentialNodeY >= this.grid.height
        ) {
          continue;
        }

        // B. Check if it's part of the machine itself
        if (occupiedCells.some((oc) => oc.x === potentialNodeX && oc.y === potentialNodeY)) {
          continue;
        }

        const targetCell = this.grid.getCell(potentialNodeX, potentialNodeY);

        if (
          targetCell &&
          targetCell.type === 'node' &&
          targetCell.object &&
          typeof targetCell.object.extractResource === 'function'
        ) {
          const resourceNode = targetCell.object;

          if (!resourceNode.resourceType || !resourceNode.resourceType.id) {
            if (this.scene.time.now % 3000 < 20) {
              console.warn(
                `[${this.id}] ResourceNode at (${potentialNodeX},${potentialNodeY}) is missing resourceType.id`
              );
            }
            continue;
          }
          const resourceTypeFromNode = resourceNode.resourceType.id;

          // Create a mock item data for level-based acceptance check
          // Resource nodes always produce level 1 purity resources
          const mockItemData = { type: 'purity-resource', purity: 1, amount: 1 };
          if (this.canAcceptInput('purity-resource', mockItemData)) {
            const extractedItem = resourceNode.extractResource();

            if (
              extractedItem &&
              (extractedItem.type === resourceTypeFromNode ||
                extractedItem.type === 'purity-resource') &&
              extractedItem.amount > 0
            ) {
              const typeToStore = extractedItem.type;
              this.inputInventory[typeToStore] =
                (this.inputInventory[typeToStore] || 0) + extractedItem.amount;

              console.log(
                `[${this.id}] at (${this.gridX},${this.gridY}) PULLED ${extractedItem.amount} ${typeToStore} (Node type: ${resourceTypeFromNode}) ` +
                  `from ResourceNode at (${potentialNodeX},${potentialNodeY}) via partCell (${partCell.x},${partCell.y}). Input:`,
                JSON.stringify(this.inputInventory)
              );

              // Handle purity resource queueing for pulled items
              if (typeToStore === 'purity-resource' && this.inputQueue) {
                // Ensure the item has all required purity properties
                // extractedItem should already be a valid purity object from extractResource
                if (extractedItem.purity !== undefined) {
                  this.inputQueue.push(extractedItem);
                } else {
                  console.warn(
                    `[${this.id}] Pulled purity-resource without purity level!`,
                    extractedItem
                  );
                }
              }

              this.scene.tweens.add({
                targets: this.container,
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 80,
                yoyo: true,
                ease: 'Sine.easeInOut',
              });
              // DO NOT return here, to allow pulling from other nodes if available
            }
          }
        }
      }
    }
  }

  /**
   * Updates the items on this machine
   * @param {number} delta - The time since the last update
   */
  updateItems(delta) {
    if (!this.items || this.items.length === 0) {
      return;
    }

    // Calculate movement speed based on delta time (milliseconds)
    const moveSpeed = 0.05 * delta;

    // Process each item on the machine
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (!item) {
        console.warn(`[${this.id}] Null item found at index ${i}, removing`);
        this.items.splice(i, 1);
        continue;
      }

      try {
        // Update item position based on machine type and direction
        this.moveItemOnMachine(item, moveSpeed);

        // Check if item has reached the output position
        if (this.hasItemReachedOutput(item)) {
          // Try to transfer to the next machine
          const transferred = this.transferItemToNextMachine(item);

          if (transferred) {
            // Item transferred successfully, remove from this machine
            this.items.splice(i, 1);
          }
        }
      } catch (itemError) {
        console.error(`[${this.id}] Error updating item:`, itemError);
        // Remove problematic item to prevent continuous errors
        this.items.splice(i, 1);
      }
    }
  }

  /**
   * Moves an item along the machine based on type and direction
   * @param {object} item - The item to move
   * @param {number} speed - Movement speed
   */
  moveItemOnMachine(item, speed) {
    // Default implementation - subclasses should override for specific behavior
    if (!item || !item.sprite) {
      return;
    }

    // For machines like conveyors, move along the direction
    switch (this.direction) {
      case 'right':
        item.sprite.x += speed;
        break;
      case 'down':
        item.sprite.y += speed;
        break;
      case 'left':
        item.sprite.x -= speed;
        break;
      case 'up':
        item.sprite.y -= speed;
        break;
    }
  }

  /**
   * Checks if an item has reached the output position
   * @param {object} item - The item to check
   * @returns {boolean} True if the item has reached the output position
   */
  hasItemReachedOutput(item) {
    if (!item || !item.sprite || !this.outputPosition) {
      return false;
    }

    // Check distance to output position
    const dx = item.sprite.x - this.outputPosition.x;
    const dy = item.sprite.y - this.outputPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Item has reached output if close enough to output position
    return distance < 5;
  }

  /**
   * Attempts to transfer an item to the connected machine
   * @param {object} item - The item to transfer
   * @returns {boolean} True if the transfer was successful
   */
  transferItemToNextMachine(_item) {
    // This would require grid and factory logic to find the next machine
    // Default implementation - subclasses or factory should handle this
    return false;
  }

  /**
   * Helper to check if output inventory has space.
   * @returns {boolean} True if there is space for output.
   */
  checkOutputCapacity() {
    const outputCapacity = this.outputCapacity || 5;

    // For machines using the new level system, check outputQueue
    if (this.outputLevel) {
      return (this.outputQueue?.length || 0) < outputCapacity;
    }

    // Legacy: check outputInventory
    if (this.outputTypes && this.outputTypes.length > 0) {
      const outputType = this.outputTypes[0];
      return (this.outputInventory[outputType] || 0) < outputCapacity;
    }
    return true; // If no output types, we can technically "process" (e.g. incinerator)
  }

  /**
   * Check if the machine has enough input resources and output capacity to start processing.
   * Assumes requiredInputs, inputLevels, and outputTypes are defined.
   * @returns {boolean} True if the machine can process, false otherwise.
   */
  canProcess() {
    if (this.isProcessing) {
      return false;
    }

    // 1. Check Output Capacity
    if (!this.checkOutputCapacity()) {
      return false;
    }

    // 2. Check Input Availability
    // NEW SYSTEM: If inputLevels is defined, use it for validation
    if (this.inputLevels && this.inputLevels.length > 0) {
      if (!this.inputQueue || this.inputQueue.length === 0) {
        return false;
      }

      // Count availability in inputQueue
      const availableLevels = {};
      this.inputQueue.forEach((item) => {
        const level = item.purity || 1;
        availableLevels[level] = (availableLevels[level] || 0) + 1;
      });

      // Count requirements
      const requiredLevels = {};
      this.inputLevels.forEach((level) => {
        requiredLevels[level] = (requiredLevels[level] || 0) + 1;
      });

      // Verify all requirements are met
      for (const [level, amount] of Object.entries(requiredLevels)) {
        if ((availableLevels[level] || 0) < amount) {
          if (this.scene.time.now % 1000 < 20) {
            console.log(
              `[${this.id}] canProcess: Not enough Level ${level}. Need ${amount}, Have ${availableLevels[level] || 0}`
            );
          }
          return false;
        }
      }

      return true;
    }

    // LEGACY SYSTEM: Check requiredInputs
    if (!this.requiredInputs || Object.keys(this.requiredInputs).length === 0) {
      return false;
    }

    for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
      const specificAmount = this.inputInventory[resourceType] || 0;
      const purityAmount = this.inputInventory['purity-resource'] || 0;

      if (specificAmount + purityAmount < amount) {
        if (this.scene.time.now % 1000 < 20) {
          console.log(
            `[${this.id}] canProcess: Not enough ${resourceType}. Need ${amount}, Have Specific:${specificAmount} + Purity:${purityAmount}`
          );
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Start processing resources
   * Consumes inputs based on requiredInputs or inputLevels and sets processing state.
   */
  startProcessing() {
    if (!this.canProcess()) {
      console.warn(`[${this.id}] startProcessing called but canProcess() is false.`);
      return;
    }

    // 1. Consume resources
    this.currentProcessingItems = []; // Reset current processing items

    if (this.inputLevels && this.inputLevels.length > 0) {
      // NEW SYSTEM: Consume specific levels from inputQueue
      this.inputLevels.forEach((reqLevel) => {
        const index = this.inputQueue.findIndex((item) => (item.purity || 1) === reqLevel);
        if (index !== -1) {
          const item = this.inputQueue.splice(index, 1)[0];
          this.currentProcessingItems.push(item); // Store for processing

          // Also decrement inventory to keep in sync
          const type = item.type || 'purity-resource';
          if (this.inputInventory[type] > 0) {
            this.inputInventory[type]--;
          }
        } else {
          console.error(
            `[${this.id}] startProcessing: Expected Level ${reqLevel} in queue but not found!`
          );
        }
      });
    } else if (this.requiredInputs) {
      // LEGACY SYSTEM: Consume from requiredInputs
      for (const type in this.requiredInputs) {
        const requiredAmount = this.requiredInputs[type];
        let remainingNeeded = requiredAmount;

        if (this.inputInventory[type] && this.inputInventory[type] > 0) {
          const consumeAmount = Math.min(this.inputInventory[type], remainingNeeded);
          this.inputInventory[type] -= consumeAmount;
          remainingNeeded -= consumeAmount;
        }

        if (remainingNeeded > 0) {
          if (
            this.inputInventory['purity-resource'] &&
            this.inputInventory['purity-resource'] >= remainingNeeded
          ) {
            this.inputInventory['purity-resource'] -= remainingNeeded;
            // Also remove generic items from queue if they exist
            for (let i = 0; i < remainingNeeded; i++) {
              if (this.inputQueue.length > 0) {
                const item = this.inputQueue.shift();
                this.currentProcessingItems.push(item); // Store for processing
              }
            }
            remainingNeeded = 0;
          }
        }
      }
    }

    // Set processing state
    this.isProcessing = true;
    this.processingProgress = 0;

    // Show progress bar
    if (this.progressBar && this.progressFill) {
      this.progressBar.setVisible(true);
      this.progressFill.setVisible(true);
      this.progressFill.width = 0;
    }

    // Play processing sound
    if (this.scene && this.scene.playSound) {
      this.scene.playSound('processing');
    }

    console.log(
      `[${this.id}] Started processing. Queue size: ${this.inputQueue.length}, Processing Items: ${this.currentProcessingItems.length}, Inventory:`,
      JSON.stringify(this.inputInventory)
    );
  }

  /**
   * Complete processing resources
   * Adds outputs based on outputTypes, resets state, and calls pushOutput.
   */
  completeProcessing() {
    // Add output resources - only use legacy inventory if NOT using the new level system
    // The new level system uses outputQueue exclusively
    if (this.outputTypes && !this.outputLevel) {
      this.outputTypes.forEach((type) => {
        if (this.outputInventory[type] !== undefined) {
          this.outputInventory[type]++;
        } else {
          // Initialize if missing (shouldn't happen if initInventories ran)
          console.warn(
            `[${this.id}] Output inventory was missing key: ${type}. Initializing to 1.`
          );
          this.outputInventory[type] = 1;
        }
      });
    }

    // Reset processing state
    this.isProcessing = false;
    this.processingProgress = 0;

    // Hide progress bar if it exists
    if (this.progressBar && this.progressFill) {
      this.progressBar.setVisible(false);
      this.progressFill.setVisible(false);
    }

    // Play completion sound (if available)
    if (this.scene && this.scene.playSound) {
      this.scene.playSound('complete'); // Assuming a generic sound
    }

    console.log(
      `[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`
    );

    // Purity Logic: Process items from processing slot if available
    // Fallback to checking inputQueue only for legacy compatibility,
    // but prefer currentProcessingItems which contains the actual consumed items.
    let processedItem = null;

    if (this.currentProcessingItems && this.currentProcessingItems.length > 0) {
      processedItem = this.currentProcessingItems[0]; // Use the first item as the primary source
      // Clear them after use to prevent double usage
      this.currentProcessingItems = [];
    } else if (this.inputQueue.length > 0) {
      // Old behavior: Peek/Shift from inputQueue (should generally not happen if startProcessing works correctly)
      processedItem = this.inputQueue.shift();
    }

    if (processedItem) {
      // NEW: If this machine has an outputLevel configured, set purity to that level
      let nextItem;
      if (this.outputLevel) {
        // Create output resource with the configured outputLevel as its purity
        // Always ensure type is 'purity-resource' for the new level system
        nextItem = {
          ...processedItem,
          type: 'purity-resource', // Explicitly set type to prevent undefined issues
          purity: this.outputLevel,
          visitedMachines: new Set(processedItem.visitedMachines || []),
          traitTags: Array.isArray(processedItem.traitTags) ? [...processedItem.traitTags] : [],
        };
        // Only increment chain if this is a new machine
        if (!nextItem.visitedMachines.has(this.id)) {
          nextItem.chainCount = Math.min(10, (processedItem.chainCount || 0) + 1);
          nextItem.visitedMachines.add(this.id);
        }
        if (this.trait) {
          nextItem.traitTags.push(this.trait);
        }
        console.log(
          `[${this.id}] Set output to level ${this.outputLevel} (was ${processedItem.purity}), tags: [${nextItem.traitTags.join(',')}]`
        );
      } else {
        // Legacy: Process it to increment purity and chain
        nextItem = processResource(processedItem, this.id, this.trait || null);
      }

      // Fire trait onProcess hook. Hook may MUTATE nextItem or return a
      // replacement value. Returning explicit null aborts the output (used
      // by Polarized when it rejects a resource).
      if (this.trait) {
        const def = getTraitById(this.trait);
        if (def && def.hooks && def.hooks.onProcess) {
          try {
            // 4th arg: processing context. inputPurity is the TRUE purity of
            // the consumed input (nextItem.purity has already been overwritten
            // to outputLevel by this point, so traits that gate on input
            // purity — e.g. Polarized — must read it from here).
            const ctx = { inputPurity: processedItem.purity };
            const result = def.hooks.onProcess(nextItem, this, this.scene, ctx);
            if (result === null) {
              console.log(`[${this.id}] trait ${this.trait} aborted output`);
              nextItem = null;
            } else if (result && typeof result === 'object') {
              nextItem = result;
            }
          } catch (err) {
            console.error(`[${this.id}] trait onProcess failed for ${this.trait}:`, err);
          }
        }
      }

      // Add to output queue for transfer
      if (nextItem) {
        this.outputQueue.push(nextItem);

        console.log(
          `[${this.id}] Processed purity item: Purity ${processedItem.purity} -> ${nextItem.purity}, Chain ${processedItem.chainCount} -> ${nextItem.chainCount}`
        );
      }
    }

    // Immediately try to push the new output
    this.pushOutput();
  }

  /**
   * Checks if the machine has any resources in its output inventory or queue.
   * @returns {boolean} True if there are output resources, false otherwise.
   */
  hasOutput() {
    // For machines using the new level system, check outputQueue
    if (this.outputLevel) {
      return this.outputQueue && this.outputQueue.length > 0;
    }

    // Legacy: check outputInventory
    if (!this.outputTypes || this.outputTypes.length === 0) {
      return false; // No defined output types means no output possible
    }

    for (const type of this.outputTypes) {
      if (this.outputInventory[type] && this.outputInventory[type] > 0) {
        return true; // Found at least one output resource
      }
    }

    return false; // No output resources found
  }

  /**
   * Attempts to push output resources to a connected machine or node.
   * This is typically called periodically or after processing completes.
   * It simply calls the transferResources method.
   */
  pushOutput() {
    this.transferResources();
  }

  /**
   * Transfer resources from this machine's output inventory to connected machines.
   * This is the base implementation, specific machines might override it.
   */
  transferResources() {
    // Find the target machine/node using the (potentially overridden) findTargetForOutput method
    // Note: findTargetForOutput might be defined in the base class or overridden in a subclass
    const findTargetMethod = this.findTargetForOutput || this.findConnectedMachine; // Fallback to old method name if needed

    let targetInfo = null;
    if (findTargetMethod && typeof findTargetMethod === 'function') {
      targetInfo = findTargetMethod.call(this);
    }

    // FALLBACK: If no specific target output found, scan all adjacent cells for a DeliveryNode
    // This makes the game more forgiving if the player places a delivery point slightly off-axis
    if (!targetInfo) {
      // Define adjacent offsets
      const offsets = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      // Scan occupied cells
      const occupied = this.getOccupiedCells();

      for (const cell of occupied) {
        for (const offset of offsets) {
          const tx = cell.x + offset.x;
          const ty = cell.y + offset.y;

          // Check bounds
          if (this.grid && tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
            const tCell = this.grid.getCell(tx, ty);
            // If we find a delivery node and we are not overlapping it
            if (tCell && tCell.type === 'delivery-node' && tCell.object) {
              // found one!
              targetInfo = {
                type: 'delivery-node',
                target: tCell.object,
                outputFaceX: cell.x,
                outputFaceY: cell.y,
              };
              break;
            }
          }
        }
        if (targetInfo) break;
      }
    }
    // MODIFIED LOG to avoid cyclic error:
    if (targetInfo) {
      console.log(
        `[${this.id}] transferResources: findTargetMethod result - Type: ${targetInfo.type}, Target ID: ${targetInfo.target ? targetInfo.target.id : 'N/A'}, OutputFaceX: ${targetInfo.outputFaceX}, OutputFaceY: ${targetInfo.outputFaceY}`
      );
    } else {
      console.log(`[${this.id}] transferResources: findTargetMethod result: null or undefined`);
    }

    if (!targetInfo) {
      // findTargetForOutput should log if no target is found
      return;
    }

    // Determine which resource type to try transferring
    // PRIORITY: Check outputQueue for purity/specific items first
    let resourceTypeToTransfer;
    let usingQueuedItem = false;

    if (this.outputQueue && this.outputQueue.length > 0) {
      resourceTypeToTransfer = this.outputQueue[0].type;
      usingQueuedItem = true;
    } else {
      // Fallback to legacy outputTypes
      if (!this.outputTypes || this.outputTypes.length === 0) {
        return; // No output types defined
      }
      resourceTypeToTransfer = this.outputTypes[0];
    }

    // Check if we actually have resources to transfer
    // For queued items, existence in queue is enough validation (unless we want to verify inventory sync)
    // For legacy items, check inventory
    if (!usingQueuedItem) {
      if (
        !this.outputInventory[resourceTypeToTransfer] ||
        this.outputInventory[resourceTypeToTransfer] <= 0
      ) {
        return; // No resources of this type to transfer
      }
    }

    let transferred = false;

    // Handle transfer to Delivery Node
    if (targetInfo.type === 'delivery-node') {
      const deliveryNode = targetInfo.target;
      // Check if deliveryNode exists and has the correct method
      if (deliveryNode && typeof deliveryNode.acceptItem === 'function') {
        // Create the item object
        let itemToDeliver;
        if (usingQueuedItem) {
          itemToDeliver = this.outputQueue[0];
        } else {
          const defaultPurity = this.outputLevel || 1;
          itemToDeliver = {
            type: resourceTypeToTransfer,
            purity: defaultPurity,
            texture:
              this.scene.registry.get('resourceTextures')?.[resourceTypeToTransfer] ||
              'default-resource',
          };
        }

        if (deliveryNode.acceptItem(itemToDeliver)) {
          // Renamed and passing item object
          transferred = true;
          // Pass the resource type for the effect, but target is the node object
          this.createResourceTransferEffect(resourceTypeToTransfer, deliveryNode);

          if (usingQueuedItem) {
            this.outputQueue.shift(); // Remove from queue
            // Also decrement inventory if it matches a known output type to keep sync
            if (this.outputTypes.includes(resourceTypeToTransfer)) {
              if (this.outputInventory[resourceTypeToTransfer] > 0)
                this.outputInventory[resourceTypeToTransfer]--;
            } else if (this.outputTypes.length > 0) {
              // If we sent a purity item but the machine 'thinks' it made a legacy item
              const legacyType = this.outputTypes[0];
              if (this.outputInventory[legacyType] > 0) this.outputInventory[legacyType]--;
            }
          } else {
            this.outputInventory[resourceTypeToTransfer]--;
          }
          return; // Done
        } else {
          // console.warn(`[${this.name}] Delivery node rejected ${resourceTypeToTransfer}`);
        }
      } else {
        console.warn(
          `[${this.name}] Target Delivery Node is invalid or missing acceptItem method.`
        );
      }
    }
    // Handle transfer to another Machine
    else if (targetInfo.type === 'machine') {
      const targetMachine = targetInfo.target;
      console.log(
        `[${this.id}] transferResources: Target type is 'machine'. Target: ${targetMachine.id} at (${targetMachine.gridX}, ${targetMachine.gridY})`
      );

      // Check if the target machine is an Advanced Processor and we're transferring advanced-resource
      const isAdvancedProcessor = targetMachine.id === 'advanced-processor';
      const isAdvancedResource = resourceTypeToTransfer === 'advanced-resource';

      if (isAdvancedProcessor && isAdvancedResource) {
        console.log(
          `[${this.id}] transferResources: Attempting to send advanced-resource to Advanced Processor`
        );
      }

      // --- MODIFIED: Check for acceptItem method ---
      if (
        targetMachine &&
        typeof targetMachine.canAcceptInput === 'function' &&
        typeof targetMachine.acceptItem === 'function'
      ) {
        console.log(
          `[${this.id}] transferResources: Target machine ${targetMachine.id} has canAcceptInput and acceptItem.`
        );

        // Check if target machine can accept the resource type and has space
        // Special handling for advanced processor to ensure it can accept advanced resources

        // Prepare the item to transfer BEFORE checking acceptance (needed for level validation)
        let itemToTransfer;
        if (usingQueuedItem) {
          itemToTransfer = this.outputQueue[0]; // Peek (shift only on success)
        } else {
          // Standard legacy transfer - include purity for compatibility with inputLevels machines
          // Default to purity 1 for basic resources, or use outputLevel if available
          const defaultPurity = this.outputLevel || 1;
          itemToTransfer = { type: resourceTypeToTransfer, amount: 1, purity: defaultPurity };
        }

        let canAccept = targetMachine.canAcceptInput(resourceTypeToTransfer, itemToTransfer);

        if (canAccept) {
          console.log(
            `[${this.id}] transferResources: Target machine ${targetMachine.id} CAN accept ${resourceTypeToTransfer}.`
          );

          // *** ADDED: Directional check for conveyors ***
          let allowTransfer = true;
          if (targetMachine.id === 'conveyor') {
            const targetDirection = targetMachine.direction;
            const outputFaceX = targetInfo.outputFaceX; // Provided by the enhanced findTargetForOutput
            const outputFaceY = targetInfo.outputFaceY; // Provided by the enhanced findTargetForOutput
            const targetX = targetMachine.gridX;
            const targetY = targetMachine.gridY;

            // Check if conveyor points back towards the cell this machine outputted from
            if (
              (targetDirection === 'left' &&
                targetX === outputFaceX + 1 &&
                targetY === outputFaceY) || // Target is right, points left
              (targetDirection === 'right' &&
                targetX === outputFaceX - 1 &&
                targetY === outputFaceY) || // Target is left, points right
              (targetDirection === 'up' &&
                targetY === outputFaceY + 1 &&
                targetX === outputFaceX) || // Target is below, points up
              (targetDirection === 'down' && targetY === outputFaceY - 1 && targetX === outputFaceX)
            ) {
              // Target is above, points down

              console.warn(
                `[${this.name}] Preventing transfer to Conveyor at (${targetX}, ${targetY}) because its direction (${targetDirection}) points back towards output face (${outputFaceX}, ${outputFaceY}).`
              );
              allowTransfer = false;
            }
          }
          // *** END Directional check ***

          // Attempt transfer only if allowed (basic acceptance AND directional check passed)
          if (allowTransfer) {
            // Special handling for advanced processor if needed
            if (isAdvancedProcessor && isAdvancedResource) {
              // Give bonus or special effect when advanced resources go to advanced processor
              if (this.scene && this.scene.addScore) {
                // Award bonus points when feeding advanced resources to advanced processor
                this.scene.addScore(10);
              }
            }

            console.log(
              `[${this.id}] transferResources: Attempting to call acceptItem on ${targetMachine.id} with`,
              itemToTransfer
            );
            if (targetMachine.acceptItem(itemToTransfer, this)) {
              // Pass this as sourceMachine for better tracing
              transferred = true;
              console.log(
                `[${this.id}] transferResources: Successfully transferred ${resourceTypeToTransfer} to ${targetMachine.id}`
              );
              this.createResourceTransferEffect(resourceTypeToTransfer, targetMachine);

              // Decrement/Shift logic
              if (usingQueuedItem) {
                this.outputQueue.shift(); // Remove from queue
                // Also decrement inventory to maintain sync with legacy counters
                if (this.outputTypes.includes(resourceTypeToTransfer)) {
                  if (this.outputInventory[resourceTypeToTransfer] > 0)
                    this.outputInventory[resourceTypeToTransfer]--;
                } else if (this.outputTypes.length > 0) {
                  // If we sent a purity item but the machine 'thinks' it made a legacy item
                  const legacyType = this.outputTypes[0];
                  if (this.outputInventory[legacyType] > 0) this.outputInventory[legacyType]--;
                }
              } else {
                this.outputInventory[resourceTypeToTransfer]--;
              }
            } else {
              console.warn(
                `[${this.name}] Target machine ${targetMachine.name} acceptItem returned false for ${resourceTypeToTransfer}`
              );
            }
          }
        } else {
          console.warn(
            `[${this.name}] Target machine ${targetMachine.name} cannot accept input type ${resourceTypeToTransfer}`
          );
        }
      } else {
        // --- MODIFIED: Update warning message ---
        let reason = 'is invalid';
        if (targetMachine && typeof targetMachine.acceptItem !== 'function')
          reason = 'is missing acceptItem method';
        else if (targetMachine && typeof targetMachine.canAcceptInput !== 'function')
          reason = 'is missing canAcceptInput method';
        console.warn(`[${this.name}] Target machine ${targetMachine.id || '(no id)'} ${reason}.`);
      }
    }

    // If transfer was successful, decrement the output inventory
    if (transferred) {
      this.outputInventory[resourceTypeToTransfer]--;
    }
  }

  /**
   * Gets the grid coordinates of all cells occupied by this machine.
   * @returns {Array<{x: number, y: number}>} An array of coordinate objects.
   */
  getOccupiedCells() {
    const debugOccupied = false; // <-- Set to false to disable logs
    const cells = [];

    // *** ADDED: Get the correctly rotated shape (Consistent with createVisuals) ***
    if (!this.grid) {
      console.warn(`[${this.id}] Cannot get occupied cells: grid reference missing.`);
      return cells;
    }
    // Use original shape if grid doesn't have rotation function (e.g., during early init)
    let rotatedShape = this.shape;
    if (typeof this.grid.getRotatedShape === 'function') {
      const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
      rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);
    } else {
      console.warn(
        `[${this.id}] Grid object missing getRotatedShape? Using original shape for occupied cells.`
      );
    }
    // *** VALIDATE the rotated shape ***
    if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
      console.error(
        `[${this.id}] Failed to get valid rotated shape for getOccupiedCells. Using default.`
      );
      rotatedShape = [[1]]; // Fallback to default shape
    }

    // *** Original null check using this.shape is now redundant, use rotatedShape ***
    // if (!this.shape || !this.grid) return cells;

    if (typeof this.gridX !== 'number' || typeof this.gridY !== 'number') {
      console.error(
        `[${this.id}] Invalid gridX/gridY in getOccupiedCells: (${this.gridX}, ${this.gridY})`
      );
      return cells;
    }
    if (debugOccupied) {
      console.log(`  [getOccupiedCells for ${this.name} (${this.id})]`);
      console.log(`    > gridX=${this.gridX}, gridY=${this.gridY}`);
      // *** MODIFIED: Log original and rotated shape ***
      console.log(`    > Original shape= ${JSON.stringify(this.shape)}`);
      console.log(`    > Rotated shape Used= ${JSON.stringify(rotatedShape)}`);
    }

    // Use gridX/gridY as the top-left anchor for the shape
    const baseX = this.gridX;
    const baseY = this.gridY;

    // *** MODIFIED: Iterate over rotatedShape ***
    for (let y = 0; y < rotatedShape.length; y++) {
      for (let x = 0; x < rotatedShape[y].length; x++) {
        // *** MODIFIED: Check rotatedShape ***
        if (rotatedShape[y][x] === 1) {
          // Check if this part of the shape exists
          // Calculate absolute grid position relative to the top-left anchor
          const cellX = baseX + x;
          const cellY = baseY + y;

          // *** ADDED BOUNDS CHECK ***
          // Ensure the calculated cell is within the grid boundaries
          if (
            this.grid &&
            cellX >= 0 &&
            cellX < this.grid.width &&
            cellY >= 0 &&
            cellY < this.grid.height
          ) {
            cells.push({ x: cellX, y: cellY });
          } else if (debugOccupied) {
            console.warn(
              `  [getOccupiedCells for ${this.name}] Calculated cell (${cellX}, ${cellY}) is out of bounds (${this.grid.width}x${this.grid.height}). Skipping.`
            );
          }
          // *** END BOUNDS CHECK ***
        }
      }
    }
    if (debugOccupied) {
      console.log(`    > Calculated Cells: ${JSON.stringify(cells)}`);
    }
    return cells;
  }

  /**
   * Find the adjacent machine or node in the machine's output direction.
   * Checks all cells along the output face of the machine.
   * @returns {object|null} An object { type: 'machine'/'delivery-node', target: object, outputFaceX: number, outputFaceY: number } or null if no valid target found.
   */
  findTargetForOutput() {
    if (!this.grid) {
      console.warn(`[${this.id}] Cannot find target: grid reference is missing`);
      return null;
    }

    const occupiedCells = this.getOccupiedCells();
    if (!occupiedCells || occupiedCells.length === 0) {
      console.warn(`[${this.id}] Cannot find target: machine occupies no cells.`);
      return null;
    }

    // Get the output position from the standard method based on the machine's direction
    let outputPos = null;
    try {
      // Use static method to get the output position based on machine ID and direction
      const machineId = this.id;
      const ioPositions = this.constructor.getIOPositionsForDirection(machineId, this.direction);
      if (ioPositions && ioPositions.outputPos) {
        outputPos = ioPositions.outputPos;
      }
    } catch (error) {
      console.warn(`[${this.id}] Error getting output position: ${error.message}`);
    }

    // If we found a specific output position, prioritize checking cells adjacent to it
    if (outputPos) {
      // Find cells that match the output position in our rotated shape
      let outputCells = [];

      // Get the rotated shape to correctly identify the output cell
      let rotatedShape = this.shape;
      if (typeof this.grid.getRotatedShape === 'function') {
        rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
      }

      // Find the cell(s) that match our output position in the rotated shape
      for (let y = 0; y < rotatedShape.length; y++) {
        for (let x = 0; x < rotatedShape[y].length; x++) {
          if (rotatedShape[y][x] === 1 && x === outputPos.x && y === outputPos.y) {
            // Found an output cell - convert to grid coordinates
            outputCells.push({
              x: this.gridX + x,
              y: this.gridY + y,
            });
          }
        }
      }

      // If we found output cells, check adjacent cells in all directions
      if (outputCells.length > 0) {
        const directions = [
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: 1 }, // down
          { dx: -1, dy: 0 }, // left
          { dx: 0, dy: -1 }, // up
        ];

        // First, try to find a target in the machine's facing direction
        const facingTarget = this.checkForTargetInDirection(
          outputCells,
          occupiedCells,
          this.getDirectionOffset(this.direction)
        );
        if (facingTarget) return facingTarget;

        // If no target in the facing direction, check all other directions
        for (const dir of directions) {
          // Skip if this is the facing direction we already checked
          if (this.isDirectionOffset(dir, this.direction)) continue;

          const target = this.checkForTargetInDirection(outputCells, occupiedCells, dir);
          if (target) return target;
        }
      }
    }

    // Fall back to checking all occupied cells in all directions if no output position or no target found
    const directions = [
      { dx: 1, dy: 0 }, // right
      { dx: 0, dy: 1 }, // down
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: -1 }, // up
    ];

    // Try each direction
    for (const dir of directions) {
      for (const cell of occupiedCells) {
        const outputFaceAbsX = cell.x;
        const outputFaceAbsY = cell.y;

        const targetX = outputFaceAbsX + dir.dx;
        const targetY = outputFaceAbsY + dir.dy;

        // Skip if out of bounds
        if (
          targetX < 0 ||
          targetX >= this.grid.width ||
          targetY < 0 ||
          targetY >= this.grid.height
        ) {
          continue;
        }

        // Skip if target is part of this machine
        const isSelf = occupiedCells.some(
          (occupied) => occupied.x === targetX && occupied.y === targetY
        );
        if (isSelf) {
          continue;
        }

        // Check the target cell
        const targetCell = this.grid.getCell(targetX, targetY);
        if (!targetCell) {
          continue;
        }

        // Check for delivery node
        if (targetCell.type === 'delivery-node' && targetCell.object) {
          return {
            type: 'delivery-node',
            target: targetCell.object,
            outputFaceX: outputFaceAbsX,
            outputFaceY: outputFaceAbsY,
          };
        }

        // Check for machine
        if (
          targetCell.object &&
          (targetCell.type === 'machine' || targetCell.object instanceof BaseMachine)
        ) {
          return {
            type: 'machine',
            target: targetCell.object,
            outputFaceX: outputFaceAbsX,
            outputFaceY: outputFaceAbsY,
          };
        }
      }
    }

    // No valid target found
    return null;
  }

  /**
   * Helper method to check for a target in a specific direction
   * @param {Array<{x: number, y: number}>} outputCells - Array of cells considered output cells
   * @param {Array<{x: number, y: number}>} occupiedCells - All cells occupied by this machine
   * @param {Object} direction - Direction to check {dx, dy}
   * @returns {Object|null} Target info object or null if no target found
   * @private
   */
  checkForTargetInDirection(outputCells, occupiedCells, direction) {
    for (const cell of outputCells) {
      const outputFaceAbsX = cell.x;
      const outputFaceAbsY = cell.y;

      const targetX = outputFaceAbsX + direction.dx;
      const targetY = outputFaceAbsY + direction.dy;

      // Skip if out of bounds
      if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
        continue;
      }

      // Skip if target is part of this machine
      const isSelf = occupiedCells.some(
        (occupied) => occupied.x === targetX && occupied.y === targetY
      );
      if (isSelf) {
        continue;
      }

      // Check the target cell
      const targetCell = this.grid.getCell(targetX, targetY);
      if (!targetCell) {
        continue;
      }

      // Check for delivery node
      if (targetCell.type === 'delivery-node' && targetCell.object) {
        return {
          type: 'delivery-node',
          target: targetCell.object,
          outputFaceX: outputFaceAbsX,
          outputFaceY: outputFaceAbsY,
        };
      }

      // Check for machine
      if (
        targetCell.object &&
        (targetCell.type === 'machine' || targetCell.object instanceof BaseMachine)
      ) {
        return {
          type: 'machine',
          target: targetCell.object,
          outputFaceX: outputFaceAbsX,
          outputFaceY: outputFaceAbsY,
        };
      }
    }

    return null;
  }

  /**
   * Helper method to convert a direction name to offset values
   * @param {string} direction - Direction name ('right', 'down', 'left', 'up')
   * @returns {Object} Direction offset {dx, dy}
   * @private
   */
  getDirectionOffset(direction) {
    switch (direction) {
      case 'right':
        return { dx: 1, dy: 0 };
      case 'down':
        return { dx: 0, dy: 1 };
      case 'left':
        return { dx: -1, dy: 0 };
      case 'up':
        return { dx: 0, dy: -1 };
      default:
        console.warn(`[${this.id}] Invalid direction: ${direction} in getDirectionOffset`);
        return { dx: 0, dy: 0 };
    }
  }

  /**
   * Helper method to check if a direction offset matches a direction name
   * @param {Object} offset - Direction offset {dx, dy}
   * @param {string} direction - Direction name ('right', 'down', 'left', 'up')
   * @returns {boolean} True if the offset matches the direction
   * @private
   */
  isDirectionOffset(offset, direction) {
    const dirOffset = this.getDirectionOffset(direction);
    return offset.dx === dirOffset.dx && offset.dy === dirOffset.dy;
  }

  /**
   * Find connected machine in the output direction
   * @returns {Machine|null} The connected machine or null if none
   */
  findConnectedMachine() {
    // Implementation will be similar to the original Machine class
    // This is a placeholder for now
    return null;
  }

  /**
   * Create a visual effect for resource transfer
   * @param {string} resourceType - The type of resource being transferred
   * @param {Machine} targetMachine - The machine receiving the resource
   */
  createResourceTransferEffect(_resourceType, _targetMachine) {
    // Implementation will be similar to the original Machine class
    // This is a placeholder for now
  }

  /**
   * Destroy the machine and clean up resources
   */

  /**
   * Get a preview sprite for the machine selection panel
   * This static method provides a standard preview for processor machines
   * @param {Phaser.Scene} scene - The scene to create the sprite in
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {Object} options - Configuration options:
   *   - {Array<Array<number>>} shape - The shape array for the machine
   *   - {string} label - The label to display (default is first letter of ID)
   *   - {Object} inputPos - The position of the input in the shape {x, y}
   *   - {Object} outputPos - The position of the output in the shape {x, y}
   *   - {string} direction - The direction for the preview ('right', 'down', 'left', 'up')
   *   - {Object} directionMap - Optional map of coordinates for each direction
   * @returns {Phaser.GameObjects.Container} The preview sprite
   */
  static getStandardPreviewSprite(scene, x, y, options = {}) {
    const container = scene.add.container(x, y);
    const shape = options.shape || [[1]];
    const cellSize = 16; // Smaller size for preview
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    // Calculate visual center X (horizontal centering stays the same)
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    // For Y, use bottom-alignment so all pieces sit on the same baseline
    // Instead of centering, align bottom edge at y=0, so pieces extend upward
    // This means row (shapeHeight-1) should be at y=0, and earlier rows go negative
    const direction = options.direction || 'right';
    const machineId = options.machineId || 'unknown-machine';

    // Get input/output positions using the single source of truth
    let outputPos;

    // Try to get positions from provided options first
    if (options.inputPos && options.outputPos) {
      // inputPos = options.inputPos;
      outputPos = options.outputPos;
    }
    // Then try direction-specific mapping
    else if (options.directionMap && options.directionMap[direction]) {
      const dirPositions = options.directionMap[direction];
      // inputPos = dirPositions.inputPos;
      outputPos = dirPositions.outputPos;
    }
    // Finally use the shared getIOPositionsForDirection method
    else {
      // Use either the class-specific method or the BaseMachine default
      const ioPositions = BaseMachine.getIOPositionsForDirection(machineId, direction);
      // inputPos = ioPositions.inputPos;
      outputPos = ioPositions.outputPos;
    }

    // --- Enhanced Debug for Preview ---

    // All cells use the unique machine color
    const machineColor = MACHINE_COLORS[machineId] || 0x44ff44;

    // Draw the machine shape
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          // Calculate part position relative to visual center (same as createVisuals)
          const partX = c * cellSize + cellSize / 2 - visualCenterX;
          // Bottom-align: last row at y=0, earlier rows go negative
          const partY = (r - shapeHeight + 1) * cellSize + cellSize / 2;

          // All cells use the unique machine color
          const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, machineColor);
          rect.setStrokeStyle(1, 0x555555);
          container.add(rect);

          // Add output arrow on output cell
          if (c === outputPos.x && r === outputPos.y && shape[r][c] === 1) {
            const arrowSize = cellSize * 0.3;
            const outputArrow = scene.add
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

            // Rotate arrow based on direction
            switch (direction) {
              case 'right':
                outputArrow.rotation = 0;
                break;
              case 'down':
                outputArrow.rotation = Math.PI / 2;
                break;
              case 'left':
                outputArrow.rotation = Math.PI;
                break;
              case 'up':
                outputArrow.rotation = (3 * Math.PI) / 2;
                break;
            }

            outputArrow.setDepth(1);
            container.add(outputArrow);
          }
        }
      }
    }

    // Add machine label
    const label = scene.add
      .text(0, 0, options.label || '?', {
        fontSize: 12,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    container.add(label);

    return container;
  }

  /**
   * Create processor-style visuals that can be reused across different processor machines
   * @param {string} labelText - The label text to display at the center (usually a single letter)
   * @param {Object} options - Additional options (optional)
   *   - {boolean} addCore - Whether to add a processor core visual (default: true)
   *   - {number} coreColor - Color for the processor core (default: 0x00ccff)
   *   - {string} coreShape - Shape of core: 'circle' or 'square' (default: 'circle')
   *   - {number} fontSize - Font size for the label (default: 14)
   */
  createProcessorVisuals(labelText, options = {}) {
    // Ensure base visuals are created first
    if (!this.container) {
      super.createVisuals();
      if (!this.container) {
        console.error(
          `[${this.id}] Base visuals failed to create container. Aborting processor visuals.`
        );
        return;
      }
    }

    // Default options
    const addCore = options.addCore !== undefined ? options.addCore : true;
    const coreColor = options.coreColor || 0x00ccff; // Default cyan
    const coreShape = options.coreShape || 'circle';
    const fontSize = options.fontSize || 14;
    const cellSize = this.grid ? this.grid.cellSize : 32; // Get cell size from grid or use default

    // We already positioned the container at the visual center.
    // So all "Centered" elements should be at (0,0).

    // Get dimensions from the rotated shape
    // ... (existing code unchanged for getting shape) ...
    // Note: createProcessorVisuals recalculates visualCenter, but since we are now
    // pivoting around the center, the center coordinates in the container are (0,0).

    // We already positioned the container at the visual center.
    // So all "Centered" elements should be at (0,0).

    const visualCenterX = 0;
    const visualCenterY = 0;

    // Add machine type label
    const machineLabel = this.scene.add
      .text(visualCenterX, visualCenterY, labelText, {
        fontFamily: 'Arial',
        fontSize: fontSize,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.container.add(machineLabel);

    // Add processor core if requested
    if (addCore) {
      if (coreShape === 'circle') {
        this.processorCore = this.scene.add.circle(
          visualCenterX,
          visualCenterY,
          cellSize / 4,
          coreColor
        );
      } else {
        this.processorCore = this.scene.add.rectangle(
          visualCenterX,
          visualCenterY,
          cellSize / 2,
          cellSize / 2,
          coreColor
        );
      }

      this.processorCore.setStrokeStyle(1, 0xffffff);
      this.container.add(this.processorCore);
      this.processorCore.setDepth(machineLabel.depth - 1); // Core below label
    }

    return {
      centerX: visualCenterX,
      centerY: visualCenterY,
      machineLabel: machineLabel,
      processorCore: this.processorCore,
    };
  }

  /**
   * Initialize keyboard controls for the machine
   */
  initKeyboardControls() {
    // Add ESC key handler to unselect the machine
    this.escKey = this.scene.input.keyboard.addKey('ESC');
    this.escKey.on('down', this.handleEscKey, this);

    // Add DELETE/BACKSPACE handler to destroy the machine
    this.deleteKey = this.scene.input.keyboard.addKey('DELETE');
    this.deleteKey.on('down', this.handleDeleteKey, this);

    this.backspaceKey = this.scene.input.keyboard.addKey('BACKSPACE');
    this.backspaceKey.on('down', this.handleDeleteKey, this);
  }

  /**
   * Handle ESC key press to unselect the machine
   */
  handleEscKey() {
    // If this machine is selected, unselect it
    if (this.isSelected) {
      this.setSelected(false);

      // Clear any selection in the machine factory
      if (this.scene.machineFactory) {
        this.scene.machineFactory.clearSelection();
      }
    }
  }

  /**
   * Handle DELETE/BACKSPACE key press
   */
  handleDeleteKey() {
    if (this.isSelected) {
      if (this.scene && this.scene.playSound) {
        this.scene.playSound('destroy'); // Assuming sound exists
      }
      this.destroy();
    }
  }

  /**
   * Destroy the machine and cleanup
   */
  destroy() {
    if (!this.isPreview && this.trait) {
      const def = getTraitById(this.trait);
      if (def && def.hooks && def.hooks.onRemove) {
        try {
          def.hooks.onRemove(this, this.scene);
        } catch (err) {
          console.error(`[${this.id}] trait onRemove failed for ${this.trait}:`, err);
        }
      }
    }

    // Destroy tooltip if it exists
    if (this.tooltip) {
      this.hideTooltip();
    }

    // Destroy info panel if it exists
    if (this.infoPanel) {
      this.hideDetailedInfo();
    }

    // Remove from grid
    if (this.grid) {
      // Try removeMachineAt first (common pattern) or removeMachine
      if (this.grid.removeMachineAt) {
        this.grid.removeMachineAt(this.gridX, this.gridY);
      } else if (this.grid.removeMachine) {
        this.grid.removeMachine(this);
      }
    }

    // Unregister inputs/keys
    if (this.escKey) {
      this.escKey.destroy();
    }
    if (this.deleteKey) {
      this.deleteKey.destroy();
    }
    if (this.backspaceKey) {
      this.backspaceKey.destroy();
    }

    // Destroy direction indicator (added directly to scene, not container)
    if (this.directionIndicator) {
      this.directionIndicator.destroy();
      this.directionIndicator = null;
    }

    // Destroy container
    if (this.container) {
      this.container.destroy();
    }
  }

  /**
   * Set the selected state of the machine
   * @param {boolean} selected - Whether the machine is selected
   */
  setSelected(selected) {
    this.isSelected = selected;

    // Update visual appearance based on selection state
    if (this.isSelected) {
      // Add selection highlight
      if (!this.selectionHighlight) {
        this.selectionHighlight = this.scene.add.rectangle(
          0,
          0,
          this.grid.cellSize * this.shape[0].length,
          this.grid.cellSize * this.shape.length,
          0xffff00,
          0.3
        );
        this.container.add(this.selectionHighlight);
        this.selectionHighlight.setDepth(-1);
      }
    } else {
      // Remove selection highlight
      if (this.selectionHighlight) {
        this.selectionHighlight.destroy();
        this.selectionHighlight = null;
      }
    }
  }

  /**
   * Adjust the container position based on the shape and direction
   * This is a base implementation that does nothing - child classes should override
   * to provide machine-specific adjustments
   */
  adjustContainerPosition() {
    // Skip adjustment if we have a preset position - this is crucial for accurate placement
    if (this.presetPosition) {
      console.log(
        `[adjustContainerPosition] SKIPPED for ${this.id || 'unknown'} - using preset position`
      );
      return;
    }

    // Base implementation does nothing
    // Child classes should override this method as needed
    console.log(
      `BaseMachine.adjustContainerPosition: Base implementation called for ${this.id || 'unknown'} machine`
    );

    // Get the shape for this machine
    const shape = this.shape || (this.machineType && this.machineType.shape);
    if (!shape) return;

    // Calculate the cell size
    // const cellSize = this.grid ? this.grid.cellSize : 32;

    // Calculate center offsets based on shape dimensions
    const width = shape[0].length;
    const height = shape.length;

    console.log(
      `Adjusting container for ${width}x${height} shape with direction ${this.direction}`
    );

    // No adjustments in the base class
    // Specific machine classes should override this method as needed
  }

  /**
   * Updates the direction indicator sprite based on the current direction
   * Delegates to the scene's updateDirectionIndicator method
   */
  updateDirectionIndicator() {
    if (this.scene && typeof this.scene.updateDirectionIndicator === 'function') {
      this.scene.updateDirectionIndicator(this, this.direction);
    } else {
      // Fallback implementation if scene method is not available
      if (this.directionIndicator) {
        // Update rotation based on direction
        switch (this.direction) {
          case 'right':
            this.directionIndicator.rotation = 0; // 0 degrees
            break;
          case 'down':
            this.directionIndicator.rotation = Math.PI / 2; // 90 degrees
            break;
          case 'left':
            this.directionIndicator.rotation = Math.PI; // 180 degrees
            break;
          case 'up':
            this.directionIndicator.rotation = (3 * Math.PI) / 2; // 270 degrees
            break;
        }
      }
    }
  }

  /**
   * Check if the machine can accept a specific resource type into its input.
   * @param {string} resourceTypeId - The ID of the resource type.
   * @param {object} [itemData=null] - Optional full item data for level checking.
   * @returns {boolean} True if the resource can be accepted, false otherwise.
   */
  canAcceptInput(resourceTypeId, itemData = null) {
    // NEW: Check level-based system first if this machine has inputLevels configured
    if (this.inputLevels && this.inputLevels.length > 0) {
      // We need the item's level to validate
      if (itemData && itemData.purity !== undefined) {
        const itemLevel = itemData.purity;
        // Check if the item's level matches one of our required input levels
        if (!this.inputLevels.includes(itemLevel)) {
          console.log(
            `[${this.id}] canAcceptInput: Rejected level ${itemLevel}. Required levels: [${this.inputLevels.join(', ')}]`
          );
          return false;
        }

        // SMART RESERVATION LOGIC
        // Ensure we always reserve enough space for the *other* items needed to complete a set.
        // This prevents one resource type from flooding the buffer and causing a deadlock.

        const capacity = this.inputCapacity || 10;
        const currentCount = this.inputQueue ? this.inputQueue.length : 0;

        // If generic capacity is full, definitely reject
        if (currentCount >= capacity) {
          return false;
        }

        // Calculate what we currently have
        const currentInventory = {};
        if (this.inputQueue) {
          this.inputQueue.forEach((item) => {
            const lvl = item.purity || 1;
            currentInventory[lvl] = (currentInventory[lvl] || 0) + 1;
          });
        }

        // Calculate minimum needed to complete at least ONE processing batch (from what is missing)
        // We only care about ensuring that after taking THIS item, we still have room for the missing pieces.
        // Track allocated items to handle duplicate levels in inputLevels correctly.
        // e.g., [2, 2, 3] needs 2x level 2, but we must not count the same inventory item twice.
        let missingForSet = 0;
        const allocatedFromInventory = {}; // Track what we've virtually allocated from each level

        this.inputLevels.forEach((reqLvl) => {
          // How many do we need per entry? (1 per inputLevel entry)
          const neededPerEntry = 1;

          // How many do we have available (minus what we've already allocated to previous entries)
          const totalAvailable = currentInventory[reqLvl] || 0;
          const alreadyAllocated = allocatedFromInventory[reqLvl] || 0;
          let available = totalAvailable - alreadyAllocated;

          // If this is the incoming level, virtually add 1 to what's available
          if (reqLvl === itemLevel) {
            available += 1;
          }

          const missing = Math.max(0, neededPerEntry - available);
          missingForSet += missing;

          // Track what we're allocating for this entry (even if we're missing some)
          const allocating = Math.min(available, neededPerEntry);
          allocatedFromInventory[reqLvl] = alreadyAllocated + allocating;
        });

        // Space remaining AFTER accepting this item
        // currentCount + 1 is the new count
        const spaceAfterAccept = capacity - (currentCount + 1);

        // Do we have enough space left to fit the missing pieces?
        if (spaceAfterAccept < missingForSet) {
          // Only log occasionally to avoid spam
          if (Math.random() < 0.05) {
            console.log(
              `[${this.id}] canAcceptInput: Rejected level ${itemLevel} to reserve space. Cap:${capacity}, Cur:${currentCount}, MissingForSet:${missingForSet}, SpaceAfter:${spaceAfterAccept}`
            );
          }
          return false;
        }

        return true;
      } else if (resourceTypeId === 'purity-resource') {
        // If we have inputLevels but no itemData, we can't validate fully but checking capacity is safe.
        // We can't do smart reservation without knowing the incoming level, so we just check generic capacity.
        // This acts as a fallback.
        const capacity = this.inputCapacity || 10;
        return this.inputQueue ? this.inputQueue.length < capacity : true;
      }
      return true;
    }

    // LEGACY: Check if handling purity-resource (for machines without inputLevels)
    if (resourceTypeId === 'purity-resource') {
      // For purity resources, we accept them if the machine has generic inputs
      // OR if it explicitly lists purity-resource
      // For now, let's assume all processors accept it
      if (this.inputTypes.length === 0 || this.inputTypes.includes('purity-resource')) {
        // Check capacity (using queue length for purity items)
        const capacity = this.inputCapacity || 10;
        return this.inputQueue ? this.inputQueue.length < capacity : true;
      }
      // If machine expects specific named resources (like 'iron'), it might not accept generic purity-resource
      // UNLESS we are converting everything to purity-resource.
      // For the transition, let's allow it if the machine has ANY input types defined,
      // effectively treating purity-resource as a wildcard for legacy machines.
      return this.inputTypes.length > 0;
    }

    // Check if this machine type accepts the resource
    if (!this.inputTypes.includes(resourceTypeId)) {
      return false;
    }

    // Initialize inventory if needed
    if (this.inputInventory[resourceTypeId] === undefined) {
      this.inputInventory[resourceTypeId] = 0;
    }

    // Check if input inventory has space (e.g., less than a capacity of 10)
    const inputCapacity = this.inputCapacity || 10;
    return this.inputInventory[resourceTypeId] < inputCapacity;
  }

  /**
   * Accept an item from another machine or source.
   * Replaces the old receiveResource method.
   * @param {object} itemData - The item object { type: string, amount: number } being received.
   * @param {BaseMachine} [sourceMachine=null] - The machine sending the resource (optional).
   * @returns {boolean} True if the item was accepted, false otherwise.
   */
  acceptItem(itemData, _sourceMachine = null) {
    if (!itemData || !itemData.type) {
      console.warn(`[${this.name}] received invalid itemData at (${this.gridX}, ${this.gridY})`);
      return false;
    }

    const itemType = itemData.type;
    // NOTE: Currently ignoring itemData.amount for processors, assuming they take 1 unit.

    if (this.canAcceptInput(itemType, itemData)) {
      // Handle purity resource queueing - queue items for machines with inputLevels
      // This ensures machines using the inputLevels system can process items correctly
      // CRITICAL: For machines with inputLevels, ALWAYS add to queue with purity (default to 1)
      if (this.inputQueue && this.inputLevels && this.inputLevels.length > 0) {
        // Ensure the item has a purity level - default to 1 if not specified
        const queuedItem = {
          ...itemData,
          purity: itemData.purity !== undefined ? itemData.purity : 1,
        };
        this.inputQueue.push(queuedItem);
        console.log(
          `[${this.name}] Enqueued item (type: ${itemType}, purity: ${queuedItem.purity}). Queue size: ${this.inputQueue.length}`
        );
      } else if (this.inputQueue && itemType === 'purity-resource') {
        // Legacy handling for purity resources on machines without inputLevels
        this.inputQueue.push(itemData);
        console.log(
          `[${this.name}] Enqueued purity-resource (purity: ${itemData.purity}). Queue size: ${this.inputQueue.length}`
        );
      }

      // Ensure inventory slot exists (though initInventories should handle this)
      if (this.inputInventory[itemType] === undefined) {
        this.inputInventory[itemType] = 0;
      }
      this.inputInventory[itemType]++;
      console.log(
        `[${this.name}] at (${this.gridX}, ${this.gridY}) accepted ${itemType}. Input:`,
        this.inputInventory
      );

      // Optional: Trigger a visual effect
      this.scene.tweens.add({
        targets: this.container, // Or a specific part like inputSquare
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      return true;
    }
    console.warn(
      `[${this.name}] at (${this.gridX}, ${this.gridY}) rejected ${itemType}. Input full or type mismatch.`
    );
    return false;
  }

  /** Helper to calculate rotated relative position within the shape matrix */
  getRelativeRotatedPos(originalPos, direction, shapeWidth, shapeHeight) {
    if (!originalPos) return null;

    // Debug the incoming parameters
    console.log(
      `[${this.id || 'unknown'}] ROTATION DEBUG - Original(${originalPos.x},${originalPos.y}), Direction=${direction}, Shape=${shapeWidth}x${shapeHeight}`
    );

    // Shorthand for original coordinates
    const ox = originalPos.x;
    const oy = originalPos.y;

    // The original shape dimensions (before rotation)
    const originalWidth = this.shape ? this.shape[0].length : shapeWidth;
    const originalHeight = this.shape ? this.shape.length : shapeHeight;

    console.log(
      `[${this.id || 'unknown'}] ROTATION DEBUG - Using originalSize=${originalWidth}x${originalHeight}`
    );

    let result;

    // Apply rotation based on direction - ENSURE CONSISTENCY WITH createVisuals
    switch (direction) {
      case 'right': // 0° - no change
        result = { x: ox, y: oy };
        break;

      case 'down': // 90° clockwise
        // Formula for 90° CW rotation:
        result = { x: oy, y: originalWidth - 1 - ox };
        break;

      case 'left': // 180° clockwise
        // Formula for 180° rotation:
        result = { x: originalWidth - 1 - ox, y: originalHeight - 1 - oy };
        break;

      case 'up': // 270° clockwise
        // Formula for 270° CW rotation:
        result = { x: originalHeight - 1 - oy, y: ox };
        break;

      default:
        console.warn(
          `[${this.id || 'unknown'}] Unknown direction: ${direction}, returning original position`
        );
        result = { x: ox, y: oy };
    }

    console.log(
      `[${this.id || 'unknown'}] ROTATION RESULT - Original(${ox},${oy}) -> Rotated(${result.x},${result.y}) for direction ${direction}`
    );
    return result;
  }

  /** Helper to set direction indicator rotation based on this.direction */
  updateDirectionIndicatorVisuals() {
    if (!this.directionIndicator) return;
    switch (this.direction) {
      case 'right':
        this.directionIndicator.rotation = 0;
        break;
      case 'down':
        this.directionIndicator.rotation = Math.PI / 2;
        break;
      case 'left':
        this.directionIndicator.rotation = Math.PI;
        break;
      case 'up':
        this.directionIndicator.rotation = (3 * Math.PI) / 2;
        break;
    }
  }

  /**
   * Get a preview sprite for the machine selection panel
   * This method should be overridden by subclasses to provide custom previews
   * or it will use a default implementation.
   * @param {Phaser.Scene} scene - The scene to create the sprite in
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Phaser.GameObjects.Container} A container with the preview sprite
   */
  getPreviewSprite(scene, x, y) {
    // Create a simplified version of the machine for the selection panel
    const container = scene.add.container(x, y);

    // Create a simple rectangle as a placeholder
    const rect = scene.add.rectangle(0, 0, 24, 24, 0x44ff44); // Default green color
    container.add(rect);

    // Add a label
    const label = scene.add
      .text(0, 0, this.id.charAt(0).toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    container.add(label);

    return container;
  }

  /**
   * Get standard machine configuration
   * This static method provides standard configuration that can be used by processor machines
   * @param {Object} options - Configuration options
   * @returns {Object} The machine configuration
   */
  static getStandardConfig(options = {}) {
    const id = options.id || 'unknown-machine';
    const defaultName = id
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      id: id,
      name: options.name || defaultName,
      description: options.description || 'Standard processor machine',
      shape: options.shape || [
        [1, 1],
        [1, 1],
      ], // Default to 2x2
      inputTypes: options.inputTypes || ['basic-resource'],
      outputTypes: options.outputTypes || ['advanced-resource'],
      processingTime: options.processingTime || 3000,
      direction: options.direction || 'right',
      defaultDirection: options.defaultDirection || 'right',
      requiredInputs: options.requiredInputs || { 'basic-resource': 1 },
    };
  }

  /**
   * Get input and output positions for a given direction
   * This is the single source of truth for I/O positions for all machines
   * @param {string} machineId - The machine ID
   * @param {string} direction - The direction ('right', 'down', 'left', 'up')
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    // Default implementation for simple machines
    // Specific machine classes should override this with their own static method

    // Default positions for a generic 1x1 machine
    let inputPos = { x: 0, y: 0 };
    let outputPos = { x: 0, y: 0 };

    // For a generic machine, place input on one side and output on the opposite
    switch (direction) {
      case 'right':
        inputPos = { x: 0, y: 0 }; // Left
        outputPos = { x: 0, y: 0 }; // Right (same coordinate, direction determines flow)
        break;
      case 'down':
        inputPos = { x: 0, y: 0 }; // Top
        outputPos = { x: 0, y: 0 }; // Bottom (same coordinate, direction determines flow)
        break;
      case 'left':
        inputPos = { x: 0, y: 0 }; // Right
        outputPos = { x: 0, y: 0 }; // Left (same coordinate, direction determines flow)
        break;
      case 'up':
        inputPos = { x: 0, y: 0 }; // Bottom
        outputPos = { x: 0, y: 0 }; // Top (same coordinate, direction determines flow)
        break;
    }

    // Log a warning if this base implementation is used for a specific machine
    if (
      machineId !== 'base-machine' &&
      machineId !== 'unknown-machine' &&
      machineId !== 'conveyor'
    ) {
      console.warn(
        `Using default I/O positions for ${machineId}. Should implement getIOPositionsForDirection in ${machineId} class.`
      );
    }

    return { inputPos, outputPos };
  }

  /**
   * Check for Harmonic Interference from adjacent machines
   * Machines placed directly adjacent (N/S/E/W) suffer processing penalty
   * unless the neighbor is a Conveyor
   */
  checkInterference() {
    if (!this.grid || !this.scene) return;

    // Define cardinal directions
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
    ];

    let foundInterference = false;

    // Conveyors themselves don't suffer from interference
    if (this.id === 'conveyor') {
      this.isInterfered = false;
      this.efficiency = 1.0;
      return;
    }

    // Iterate through cells occupied by THIS machine to check their neighbors
    // This supports multi-tile machines
    const myCells = this.getOccupiedCells
      ? this.getOccupiedCells()
      : [{ x: this.gridX, y: this.gridY }];

    for (const cell of myCells) {
      for (const dir of directions) {
        const neighborX = cell.x + dir.x;
        const neighborY = cell.y + dir.y;

        // Check boundary
        if (!this.grid.isInBounds(neighborX, neighborY)) continue;

        // Don't check against my own cells
        if (myCells.some((c) => c.x === neighborX && c.y === neighborY)) continue;

        const neighborCell = this.grid.getCell(neighborX, neighborY);

        // If there's a machine there
        if (neighborCell && neighborCell.type === 'machine' && neighborCell.object) {
          const neighborMachine = neighborCell.object;

          // If the neighbor is a CONVEYOR, it does NOT cause interference
          if (neighborMachine.id !== 'conveyor') {
            // It's a non-conveyor machine -> INTERFERENCE!
            foundInterference = true;
            break;
          }
        }
      }
      if (foundInterference) break;
    }

    // Apply results
    if (foundInterference) {
      if (!this.isInterfered) {
        // Just started interfering
        this.isInterfered = true;
        this.efficiency = 0.5; // 50% speed
        // Trigger visual warning start
        this.setInterferenceVisualState(true);
      }
    } else {
      if (this.isInterfered) {
        // Interference ended
        this.isInterfered = false;
        this.efficiency = 1.0;
        // Clear visual warning
        this.setInterferenceVisualState(false);
      }
    }
  }

  /**
   * Updates visual state for interference (tinting/untinting)
   * @param {boolean} active - Whether interference is active
   */
  setInterferenceVisualState(active) {
    if (!this.container || !this.container.list) return;

    // Use a red tint for interference
    const interferenceColor = 0xff4444;

    this.container.list.forEach((part) => {
      // Targets standard parts, excluding specific UI elements
      if (
        part.type === 'Rectangle' &&
        part !== this.progressBar &&
        part !== this.progressFill &&
        !part.isResourceIndicator
      ) {
        if (active) {
          part.setTint(interferenceColor);
        } else {
          part.clearTint();
        }
      }
    });
  }
}
