import BaseMachine from './BaseMachine';

/**
 * Advanced Processor 1 Machine
 * Combines basic and advanced resources into mega resources (U-Shape)
 */
export default class AdvancedProcessor1Machine extends BaseMachine {
  /**
   * Create a new advanced processor 1 machine
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
    this.id = 'advanced-processor-1';
    this.name = 'Advanced Processor 1';
    this.description = 'Combines basic and advanced resources into mega resources. (U-Shape)';

    // Define the original U-shape
    const originalShape = [
      [1, 0, 1],
      [1, 1, 1],
    ];

    // Set input/output types
    this.inputTypes = ['basic-resource', 'advanced-resource'];
    this.outputTypes = ['mega-resource'];
    this.processingTime = 5500; // Different processing time
    this.defaultDirection = 'down';

    // Initialize using the single source of truth for I/O positions
    // Get the correct coordinates from the static method based on the default direction
    const ioPositions = AdvancedProcessor1Machine.getIOPositionsForDirection(
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
    console.log(`[AdvancedProcessor1] Initialized with properties:
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
      this.createProcessorVisuals('AP1', {
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
      [1, 0, 1],
      [1, 1, 1],
    ];

    // Get input/output positions using the single source of truth
    const ioPositions = AdvancedProcessor1Machine.getIOPositionsForDirection(
      'advanced-processor-1',
      direction
    );

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'advanced-processor-1',
      shape: shape,
      label: 'MGA1',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  /**
   * Get input and output positions for each direction
   * This is the single source of truth for AdvancedProcessor1 I/O positions
   * @param {string} machineId - The machine ID (should be 'advanced-processor-1')
   * @param {string} direction - The direction ('right', 'down', 'left', 'up')
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    // U-shape: [[1,0,1], [1,1,1]]
    // Define direction-specific positions
    let inputPos, outputPos;

    switch (direction) {
      case 'right': // Original orientation
        inputPos = { x: 0, y: 0 }; // Top-left corner
        outputPos = { x: 2, y: 0 }; // Top-right corner
        break;
      case 'down': // 90° clockwise - rotated to [[1,1], [0,1], [1,1]]
        inputPos = { x: 1, y: 0 }; // Top-left corner
        outputPos = { x: 1, y: 2 }; // Bottom-left corner
        break;
      case 'left': // 180° - rotated to [[1,1,1], [1,0,1]]
        inputPos = { x: 2, y: 1 }; // Bottom-right corner
        outputPos = { x: 0, y: 1 }; // Bottom-left corner
        break;
      case 'up': // 270° clockwise - rotated to [[1,1], [1,0], [1,1]]
        inputPos = { x: 0, y: 2 }; // Bottom-right corner
        outputPos = { x: 0, y: 0 }; // Top-right corner
        break;
      default:
        inputPos = { x: 0, y: 0 }; // Default top-left
        outputPos = { x: 2, y: 0 }; // Default top-right
    }

    return { inputPos, outputPos };
  }

  /**
   * Get standard configuration for this machine type
   */
  static getConfig() {
    // Get the I/O positions for the default direction
    const ioPositions = AdvancedProcessor1Machine.getIOPositionsForDirection(
      'advanced-processor-1',
      'down'
    );

    return BaseMachine.getStandardConfig({
      id: 'advanced-processor-1',
      name: 'Advanced Processor 1',
      description: 'Combines basic and advanced resources into mega resources. (U-Shape)',
      shape: [
        [1, 0, 1],
        [1, 1, 1],
      ],
      inputTypes: ['basic-resource', 'advanced-resource'],
      outputTypes: ['mega-resource'],
      processingTime: 5500,
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
