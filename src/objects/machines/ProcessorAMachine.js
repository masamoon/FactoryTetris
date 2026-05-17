import BaseMachine from './BaseMachine';

/**
 * Processor A Machine
 * Processes raw resources into Product A
 */
export default class ProcessorAMachine extends BaseMachine {
  /**
   * Create a new processor A machine
   * @param {Phaser.Scene} scene - The scene this machine belongs to
   * @param {Object} config - Configuration object
   */
  constructor(scene, config) {
    // Call the parent constructor first
    super(scene, config);

    // Store the config for later use
    this.config = config;

    // Everything else is handled by the initialization hooks in the base class
    // and our overridden initMachineProperties method
  }

  /**
   * Override the base class method to define processor-specific properties
   */
  initMachineProperties() {
    // Define machine identifier properties
    this.id = 'processor-a';
    this.name = 'Processor A';
    this.description = 'Processes basic resources into advanced resources';

    // Define the original shape - a J-shaped Tetris piece
    const originalShape = [
      [1, 1],
      [1, 0],
      [1, 0],
    ];

    // Set input/output types
    this.inputTypes = ['basic-resource'];
    this.outputTypes = ['advanced-resource'];
    this.processingTime = 3000; // 3 seconds
    this.defaultDirection = 'right';

    // Initialize using the single source of truth for I/O positions
    // Get the correct coordinates from the static method based on the default direction
    const ioPositions = ProcessorAMachine.getIOPositionsForDirection(
      'processor-a',
      this.defaultDirection
    );
    this.inputCoord = ioPositions.inputPos;
    this.outputCoord = ioPositions.outputPos;

    // Initialize processor-specific properties
    this.isProcessing = false;
    this.processingProgress = 0;
    this.requiredInputs = {
      'basic-resource': 1,
    };

    // Set the original shape - rotation will be applied by BaseMachine before createVisuals
    this.shape = originalShape;

    // Dynamic resource level system - read from config or use defaults
    this.inputLevels = this.config?.inputLevels ?? [1];
    this.outputLevel = this.config?.outputLevel ?? 2;
    this.notation = this.config?.notation ?? '1/2';

    // Initialize inventories with default values
    this.inputInventory = {
      'basic-resource': 0,
    };
    this.outputInventory = {
      'advanced-resource': 0,
    };

    // Log initialization
    console.log(`[ProcessorA] Initialized with properties:
            Input types: ${this.inputTypes}
            Output types: ${this.outputTypes}
            Processing time: ${this.processingTime}ms
            Required inputs: ${JSON.stringify(this.requiredInputs)}
            Initial inventories: 
            - Input: ${JSON.stringify(this.inputInventory)}
            - Output: ${JSON.stringify(this.outputInventory)}
            I/O positions for ${this.defaultDirection}: Input(${this.inputCoord.x},${this.inputCoord.y}), Output(${this.outputCoord.x},${this.outputCoord.y})
        `);
  }

  /**
   * Get the origin point of the machine's shape
   * @param {Array<Array<number>>} shape - The shape array to find the origin for
   * @returns {Object} The origin point as {x, y}
   */
  getOrigin(shape) {
    // Use the shape provided or fall back to the machine's shape
    const shapeToUse = shape || this.shape;

    // For the L-shaped processor, we want to define a specific origin
    // that matches our visual representation
    const width = shapeToUse[0].length;
    const height = shapeToUse.length;

    // We want the origin to be at the center of the L shape

    return {
      x: (width - 1) / 2,
      y: (height - 1) / 2,
    };
  }

  /**
   * Override the createVisuals method to customize the processor appearance
   */
  createVisuals() {
    // Call the base class to create the common visuals
    super.createVisuals();

    // Add processor-specific visuals using the standardized method
    if (this.container) {
      this.createProcessorVisuals('A', {
        coreColor: 0x00ccff,
        coreShape: 'circle',
      });
    }
  }

  /**
   * Adjust the container position based on the shape and rotation
   */
  adjustContainerPosition() {
    // Skip adjustment completely - our container position is already correct
    // Container is positioned at the grid cell center and all parts are relative to it

    // Log that we're not making any adjustments
    const originalX = this.container.x;
    const originalY = this.container.y;

    console.log(
      `[ProcessorAMachine] adjustContainerPosition - SKIPPED. Container remains at (${originalX}, ${originalY})`
    );
    console.log(
      `[ProcessorAMachine] Using center-relative positioning for all parts, no adjustment needed.`
    );
  }

  /**
   * Override the update method to handle processing logic
   */
  update(time, delta) {
    super.update(time, delta); // Call base class update

    // Optional: Add ProcessorA-specific update logic here if needed in the future
  }

  /**
   * Get a preview sprite for the machine selection panel
   */
  static getPreviewSprite(scene, x, y, direction = 'right') {
    // Define the machine's 2x2 shape
    const shape = [
      [1, 1],
      [1, 0],
      [1, 0],
    ];

    // Get input/output positions using the single source of truth
    const ioPositions = ProcessorAMachine.getIOPositionsForDirection('processor-a', direction);

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'processor-a',
      shape: shape,
      label: 'A',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  static getConfig() {
    const ioPositions = ProcessorAMachine.getIOPositionsForDirection('processor-a', 'right');

    return BaseMachine.getStandardConfig({
      id: 'processor-a',
      name: 'Processor A',
      description: 'Processes basic resources into advanced resources',
      shape: [
        [1, 1],
        [1, 0],
        [1, 0],
      ],
      inputTypes: ['basic-resource'],
      outputTypes: ['advanced-resource'],
      processingTime: 3000,
      defaultDirection: 'right',
      requiredInputs: { 'basic-resource': 1 },
      inputCoord: ioPositions.inputPos,
      outputCoord: ioPositions.outputPos,
    });
  }

  /**
   * Get input and output positions for each direction
   * This is the single source of truth for ProcessorA I/O positions
   * @param {string} machineId - The machine ID (should be 'processor-a')
   * @param {string} direction - The direction ('right', 'down', 'left', 'up')
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    // Define direction-specific positions for the 2x2 processor
    let inputPos, outputPos;

    switch (direction) {
      case 'right':
        inputPos = { x: 0, y: 0 }; // Left-top
        outputPos = { x: 0, y: 2 }; // Right-bottom
        break;
      case 'down':
        inputPos = { x: 2, y: 1 }; // Right-top
        outputPos = { x: 0, y: 0 }; // Left-bottom
        break;
      case 'left':
        // For left orientation, the shape rotates to [[0,1],[0,1],[1,1]]
        // Based on actual visual observation, these positions work:
        inputPos = { x: 0, y: 2 }; // Bottom-left
        outputPos = { x: 1, y: 0 }; // Top-right
        break;
      case 'up':
        inputPos = { x: 0, y: 0 }; // Left-bottom
        outputPos = { x: 2, y: 1 }; // Right-top
        break;
      default:
        inputPos = { x: 0, y: 2 }; // Left-top (default)
        outputPos = { x: 1, y: 0 }; // Right-bottom (default)
    }

    return { inputPos, outputPos };
  }
}
