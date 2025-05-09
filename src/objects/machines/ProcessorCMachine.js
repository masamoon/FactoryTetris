import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor C Machine
 * Processes basic resources into advanced resources (Square Shape)
 */
export default class ProcessorCMachine extends BaseMachine {
    /**
     * Create a new processor C machine
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
        this.id = 'processor-c';
        this.name = 'Processor C';
        this.description = 'Processes basic resources into advanced resources (Square)';
        
        // Define the original shape - a 2x2 Square
        const originalShape = [
            [1, 1],
            [1, 1]
        ];
        
        // Set input/output types
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3000; // 3 seconds
        this.defaultDirection = 'right';
        
        // Initialize using the single source of truth for I/O positions
        const ioPositions = ProcessorCMachine.getIOPositionsForDirection('processor-c', this.defaultDirection);
        this.inputCoord = ioPositions.inputPos;
        this.outputCoord = ioPositions.outputPos;
        
        // Required inputs for processing
        this.requiredInputs = {
            'basic-resource': 1
        };
        
        // Set the machine shape
        this.shape = originalShape;
        
        // Log initialization for better debugging
        console.log(`[ProcessorC] Initialized with properties:
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
            this.createProcessorVisuals("C", {
                coreColor: 0x00ccff, // Cyan color
                coreShape: 'square'
            });
        }
    }
    
    /**
     * Get a preview sprite for the machine selection panel
     */
    static getPreviewSprite(scene, x, y, direction = 'right') {
        // Use the standard preview sprite with C-specific options
        const shape = [
            [1, 1],
            [1, 1]
        ];
        
        // Get input/output positions using the single source of truth
        const ioPositions = ProcessorCMachine.getIOPositionsForDirection('processor-c', direction);
        
        return BaseMachine.getStandardPreviewSprite(scene, x, y, {
            machineId: 'processor-c',
            shape: shape,
            label: "C",
            inputPos: ioPositions.inputPos,
            outputPos: ioPositions.outputPos,
            direction: direction
        });
    }
    
    /**
     * Get input and output positions for each direction
     * This is the single source of truth for ProcessorC I/O positions
     * @param {string} machineId - The machine ID (should be 'processor-c')
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // Square shape: [[1,1], [1,1]]
        // For a square shape, all positions are valid (all cells are 1)
        let inputPos, outputPos;
        
        switch(direction) {
            case 'right': 
                inputPos = { x: 0, y: 0 };  // Top-left
                outputPos = { x: 1, y: 0 }; // Top-right
                break;
            case 'down':  
                inputPos = { x: 1, y: 0 };  // Top-right
                outputPos = { x: 1, y: 1 }; // Bottom-right
                break;
            case 'left':  
                inputPos = { x: 1, y: 1 };  // Bottom-right
                outputPos = { x: 0, y: 1 }; // Bottom-left
                break;
            case 'up':    
                inputPos = { x: 0, y: 1 };  // Bottom-left
                outputPos = { x: 0, y: 0 }; // Top-left
                break;
            default:
                inputPos = { x: 0, y: 0 };  // Top-left (default)
                outputPos = { x: 1, y: 0 }; // Top-right (default)
        }
        
        return { inputPos, outputPos };
    }
    
    /**
     * Get standard configuration for this machine type
     */
    static getConfig() {
        return BaseMachine.getStandardConfig({
            id: 'processor-c',
            name: 'Processor C',
            description: 'Processes basic resources into advanced resources (Square)',
            shape: [
                [1, 1],
                [1, 1]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000,
            defaultDirection: 'right',
            requiredInputs: { 'basic-resource': 1 }
        });
    }
} 