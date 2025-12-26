import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor E Machine
 * Processes basic resources into advanced resources (Cross Shape)
 */
export default class ProcessorEMachine extends BaseMachine {
  /**
   * Create a new processor E machine
   * @param {Phaser.Scene} scene - The scene this machine belongs to
   * @param {Object} config - Configuration object
   */
  constructor(scene, config) {
    // Call the parent constructor
    super(scene, config);

    // Store the config reference
    this.config = config;
  }

  /**
   * Override the base class method to define processor-specific properties
   */
  initMachineProperties() {
    // Define machine identifier properties
    this.id = 'processor-e';
    this.name = 'Processor E';
    this.description = 'Processes basic resources into advanced resources (L Shape)';

    // Define the original shape - a 3x3 cross
    const originalShape = [
      [1, 1],
      [0, 1],
      [0, 1],
    ];

    // Set input/output types
    this.inputTypes = ['basic-resource'];
    this.outputTypes = ['advanced-resource'];
    this.processingTime = 4000; // 4 seconds
    this.defaultDirection = 'right';

    // Initialize using the single source of truth for I/O positions
    const ioPositions = ProcessorEMachine.getIOPositionsForDirection(
      'processor-e',
      this.defaultDirection
    );
    this.inputCoord = ioPositions.inputPos;
    this.outputCoord = ioPositions.outputPos;

    // Required inputs for processing
    this.requiredInputs = {
      'basic-resource': 2, // Requires 2 basic resources (more than others)
    };

    // Set the machine shape
    this.shape = originalShape;

    // Log initialization for better debugging
    console.log(`[ProcessorE] Initialized with properties:
            Input types: ${this.inputTypes}
            Output types: ${this.outputTypes}
            Processing time: ${this.processingTime}ms
            I/O positions for ${this.defaultDirection}: Input(${this.inputCoord.x},${this.inputCoord.y}), Output(${this.outputCoord.x},${this.outputCoord.y})
        `);
  }

  /**
   * Get input and output positions for each direction
   * This is the single source of truth for ProcessorE I/O positions
   * @param {string} machineId - The machine ID (should be 'processor-e')
   * @param {string} direction - The direction ('right', 'down', 'left', 'up')
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    // Define direction-specific positions for the cross-shaped processor
    let inputPos, outputPos;

    // L shape shape: [[1,1], [0,1], [0,1]]
    // Ensure I/O positions are on cells with value 1
    switch (direction) {
      case 'right': // Original orientation
        inputPos = { x: 0, y: 0 }; // Left-middle (on horizontal bar)
        outputPos = { x: 1, y: 2 }; // Right-middle (on horizontal bar)
        break;
      case 'down': // 90° clockwise
        inputPos = { x: 2, y: 0 }; // Top-middle (on vertical bar)
        outputPos = { x: 0, y: 1 }; // Bottom-middle (on vertical bar)
        break;
      case 'left': // 180°
        inputPos = { x: 1, y: 2 }; // Right-middle (on horizontal bar)
        outputPos = { x: 0, y: 0 }; // Left-middle (on horizontal bar)
        break;
      case 'up': // 270° clockwise
        inputPos = { x: 0, y: 1 }; // Bottom-middle (on vertical bar)
        outputPos = { x: 2, y: 0 }; // Top-middle (on vertical bar)
        break;
      default:
        inputPos = { x: 0, y: 0 }; // Left-middle (default)
        outputPos = { x: 1, y: 2 }; // Right-middle (default)
    }

    return { inputPos, outputPos };
  }

  /**
   * Override the createVisuals method to customize the processor appearance
   */
  createVisuals() {
    // Call the base class to create the common visuals
    super.createVisuals();

    // Add processor-specific visuals using the standardized method
    if (this.container) {
      this.createProcessorVisuals('E', {
        coreColor: 0xff00ff, // Purple color
        coreShape: 'circle',
        fontSize: 16,
      });
    }
  }

  /**
   * Get a preview sprite for the machine selection panel
   */
  static getPreviewSprite(scene, x, y, direction = 'right') {
    // Use the standard preview sprite with E-specific options
    const shape = [
      [1, 1],
      [0, 1],
      [0, 1],
    ];

    // Get input/output positions using the single source of truth
    const ioPositions = ProcessorEMachine.getIOPositionsForDirection('processor-e', direction);

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'processor-e',
      shape: shape,
      label: 'E',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  /**
   * Get standard configuration for this machine type
   */
  static getConfig() {
    return BaseMachine.getStandardConfig({
      id: 'processor-e',
      name: 'Processor E',
      description: 'Processes basic resources into advanced resources (L shape)',
      shape: [
        [1, 1],
        [0, 1],
        [0, 1],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 4000,
      defaultDirection: 'right',
      requiredInputs: { 'basic-resource': 2 },
    });
  }
}
