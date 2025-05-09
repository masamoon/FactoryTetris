import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor D Machine
 * Processes basic resources into advanced resources (Line Shape)
 */
export default class ProcessorDMachine extends BaseMachine {
    /**
     * Create a new processor D machine
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
        this.id = 'processor-d';
        this.name = 'Processor D';
        this.description = 'Processes basic resources into advanced resources (Line)';
        
        // Define the original shape - a horizontal line
        const originalShape = [
            [1, 1, 1]
        ];
        
        // Set input/output types
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3000; // 3 seconds
        this.defaultDirection = 'right';
        
        // Initialize using the single source of truth for I/O positions
        const ioPositions = ProcessorDMachine.getIOPositionsForDirection('processor-d', this.defaultDirection);
        this.inputCoord = ioPositions.inputPos;
        this.outputCoord = ioPositions.outputPos;
        
        // Required inputs for processing
        this.requiredInputs = {
            'basic-resource': 1 
        };
        
        // Set the machine shape
        this.shape = originalShape;
        
        // Log initialization for better debugging
        console.log(`[ProcessorD] Initialized with properties:
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
            this.createProcessorVisuals("D", {
                coreColor: 0x00ffaa, // Teal color
                coreShape: 'circle'
            });
        }
    }
    
    /**
     * Get a preview sprite for the machine selection panel
     */
    static getPreviewSprite(scene, x, y, direction = 'right') {
        // Use the standard preview sprite with D-specific options
        const shape = [
            [1, 1, 1]
        ];
        
        // Get input/output positions using the single source of truth
        const ioPositions = ProcessorDMachine.getIOPositionsForDirection('processor-d', direction);
        
        return BaseMachine.getStandardPreviewSprite(scene, x, y, {
            machineId: 'processor-d',
            shape: shape,
            label: "D",
            inputPos: ioPositions.inputPos,
            outputPos: ioPositions.outputPos,
            direction: direction
        });
    }
    
    /**
     * Get input and output positions for each direction
     * This is the single source of truth for ProcessorD I/O positions
     * @param {string} machineId - The machine ID (should be 'processor-d')
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // Line shape: [[1,1,1]] (horizontal) or [[1],[1],[1]] (vertical when rotated)
        let inputPos, outputPos;
        
        switch(direction) {
            case 'right': // Horizontal line
                inputPos = { x: 0, y: 0 };  // Left end
                outputPos = { x: 2, y: 0 }; // Right end
                break;
            case 'down': // Vertical line
                inputPos = { x: 0, y: 0 };  // Top end
                outputPos = { x: 0, y: 2 }; // Bottom end
                break;
            case 'left': // Horizontal line (flipped)
                inputPos = { x: 2, y: 0 };  // Right end
                outputPos = { x: 0, y: 0 }; // Left end
                break;
            case 'up': // Vertical line (flipped)
                inputPos = { x: 0, y: 2 };  // Bottom end
                outputPos = { x: 0, y: 0 }; // Top end
                break;
            default:
                inputPos = { x: 0, y: 0 };  // Left end (default)
                outputPos = { x: 2, y: 0 }; // Right end (default)
        }
        
        return { inputPos, outputPos };
    }
    
    /**
     * Get standard configuration for this machine type
     */
    static getConfig() {
        return BaseMachine.getStandardConfig({
            id: 'processor-d',
            name: 'Processor D',
            description: 'Processes basic resources into advanced resources (Line)',
            shape: [
                [1, 1, 1]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000,
            defaultDirection: 'right',
            requiredInputs: { 'basic-resource': 1 }
        });
    }
} 