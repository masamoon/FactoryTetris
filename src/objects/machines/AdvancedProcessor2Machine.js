import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor 2 Machine
 * Combines basic and advanced resources into mega resources (Long L-Shape)
 */
export default class AdvancedProcessor2Machine extends BaseMachine {
  /**
   * Create a new advanced processor 2 machine
   * @param {Phaser.Scene} scene - The scene this machine belongs to
   * @param {Object} config - Configuration object
   */
  constructor(scene, config) {
    super(scene, config);
  }

  /**
   * Override the base class method to define processor-specific properties
   */
  initMachineProperties() {
    // Define machine identifier properties
    this.id = 'advanced-processor-2';
    this.name = 'Advanced Processor 2';
    this.description = 'Combines basic and advanced resources into mega resources. (Long L-Shape)';

    // Define the original long L-shape
    const originalShape = [
      [1, 1, 1, 1],
      [1, 0, 0, 0],
    ];

    // Set input/output types
    this.inputTypes = ['basic-resource', 'advanced-resource'];
    this.outputTypes = ['mega-resource'];
    this.processingTime = 6000; // Different processing time
    this.defaultDirection = 'down';

    // Initialize using the single source of truth for I/O positions
    // Get the correct coordinates from the static method based on the default direction
    const ioPositions = AdvancedProcessor2Machine.getIOPositionsForDirection(
      this.id,
      this.defaultDirection
    );
    this.inputCoord = ioPositions.inputPos;
    this.outputCoord = ioPositions.outputPos;

    // Required inputs for processing
    this.requiredInputs = {
      'basic-resource': 1,
      'advanced-resource': 1,
    };

    // Set the machine shape
    this.shape = originalShape;

    // Log initialization
    console.log(`[AdvancedProcessor2] Initialized with properties:
            Input types: ${this.inputTypes}
            Output types: ${this.outputTypes}
            Processing time: ${this.processingTime}ms
            I/O positions for ${this.defaultDirection}: Input(${this.inputCoord.x},${this.inputCoord.y}), Output(${this.outputCoord.x},${this.outputCoord.y})
        `);
  }

  /**
   * Override the createVisuals method to customize the processor appearance
   */
  createVisuals() {
    // Call the base class to create the common visuals
    super.createVisuals();

    // Add processor-specific visuals using the standardized method
    if (this.container) {
      this.createProcessorVisuals('MGA2', {
        coreColor: 0xaa44aa, // Purple color
        coreShape: 'square',
        fontSize: 10,
      });
    }
  }

  /**
   * Get a preview sprite for the machine selection panel
   */
  static getPreviewSprite(scene, x, y, direction = 'right') {
    // Use the standard preview sprite with our specific options
    const shape = [
      [1, 1, 1, 1],
      [1, 0, 0, 0],
    ];

    // Get input/output positions using the single source of truth
    const ioPositions = AdvancedProcessor2Machine.getIOPositionsForDirection(
      'advanced-processor-2',
      direction
    );

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'advanced-processor-2',
      shape: shape,
      label: 'AP2',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  /**
   * Get input and output positions for each direction
   * This is the single source of truth for AdvancedProcessor2 I/O positions
   * @param {string} machineId - The machine ID (should be 'advanced-processor-2')
   * @param {string} direction - The direction ('right', 'down', 'left', 'up')
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    // Long L-shape: [[1,1,1,1], [1,0,0,0]]
    // Define direction-specific positions
    let inputPos, outputPos;

    switch (direction) {
      case 'right': // Original orientation
        inputPos = { x: 0, y: 1 }; // Bottom-left corner
        outputPos = { x: 3, y: 0 }; // Top-right corner
        break;
      case 'down': // 90° clockwise - rotated to [[1,1], [1,0], [1,0], [1,0]]
        inputPos = { x: 0, y: 0 }; // Top-left corner
        outputPos = { x: 1, y: 3 }; // Bottom-right corner
        break;
      case 'left': // 180° - rotated to [[0,0,0,1], [1,1,1,1]]
        inputPos = { x: 3, y: 0 }; // Bottom-right corner
        outputPos = { x: 0, y: 1 }; // Top-left corner
        break;
      case 'up': // 270° clockwise - rotated to [[0,1], [0,1], [0,1], [1,1]]
        inputPos = { x: 1, y: 3 }; // Bottom-right corner
        outputPos = { x: 0, y: 0 }; // Top-left corner
        break;
      default:
        inputPos = { x: 0, y: 1 }; // Default bottom-left
        outputPos = { x: 3, y: 0 }; // Default top-right
    }

    return { inputPos, outputPos };
  }

  /**
   * Get standard configuration for this machine type
   */
  static getConfig() {
    // Get the I/O positions for the default direction
    const ioPositions = AdvancedProcessor2Machine.getIOPositionsForDirection(
      'advanced-processor-2',
      'down'
    );

    return BaseMachine.getStandardConfig({
      id: 'advanced-processor-2',
      name: 'Advanced Processor 2',
      description: 'Combines basic and advanced resources into mega resources. (Long L-Shape)',
      shape: [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
      ],
      inputTypes: ['basic-resource', 'advanced-resource'],
      outputTypes: ['mega-resource'],
      processingTime: 6000,
      defaultDirection: 'down',
      requiredInputs: {
        'basic-resource': 1,
        'advanced-resource': 1,
      },
      // Use the positions from our single source of truth
      inputCoord: ioPositions.inputPos,
      outputCoord: ioPositions.outputPos,
    });
  }
}
