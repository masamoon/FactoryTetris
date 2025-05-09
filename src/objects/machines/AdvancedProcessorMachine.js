import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor Machine
 * Processes resources more efficiently than basic processors
 */
export default class AdvancedProcessorMachine extends BaseMachine {
    /**
     * Create a new advanced processor machine
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
     * Override the base class method to define machine-specific properties
     */
    initMachineProperties() {
        // Define machine properties
        this.id = 'advanced-processor';
        this.name = 'Advanced Processor';
        this.description = 'Processes resources more efficiently than basic processors';
        
        // Define the machine shape (3x2)
        this.shape = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ]; 
        
        // Set default direction
        this.defaultDirection = 'right';
        
        // Set input/output types
        this.inputTypes = ['basic-resource', 'advanced-resource'];
        this.outputTypes = ['mega-resource'];
        this.processingTime = 5000; // 5 seconds
        
        // Initialize using the single source of truth for I/O positions
        const ioPositions = AdvancedProcessorMachine.getIOPositionsForDirection('advanced-processor', this.defaultDirection);
        this.inputCoord = ioPositions.inputPos;
        this.outputCoord = ioPositions.outputPos;
        
        // Define required inputs for processing
        this.requiredInputs = {
            'advanced-resource': 1,
            'basic-resource': 2
        };
        
        // Log initialization for better debugging
        console.log(`[AdvancedProcessor] Initialized with properties:
            Input types: ${this.inputTypes}
            Output types: ${this.outputTypes}
            Processing time: ${this.processingTime}ms
            I/O positions for ${this.defaultDirection}: Input(${this.inputCoord.x},${this.inputCoord.y}), Output(${this.outputCoord.x},${this.outputCoord.y})
        `);
    }
    
    /**
     * Get input and output positions for each direction
     * This is the single source of truth for AdvancedProcessor I/O positions
     * @param {string} machineId - The machine ID (should be 'advanced-processor')
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // Define direction-specific positions for the Advanced Processor
        let inputPos, outputPos;
        
        // Shape: [[0,1,0], [1,1,1], [0,1,0]] (cross shape)
        // Ensure I/O positions are on cells with value 1
        switch(direction) {
            case 'right': // Original orientation
                inputPos = { x: 0, y: 1 };  // Left-middle (on horizontal bar)
                outputPos = { x: 2, y: 1 }; // Right-middle (on horizontal bar)
                 break; 
            case 'down':  // 90° clockwise
                inputPos = { x: 1, y: 0 };  // Top-middle (on vertical bar)
                outputPos = { x: 1, y: 2 }; // Bottom-middle (on vertical bar)
                break;
            case 'left':  // 180° 
                inputPos = { x: 2, y: 1 };  // Right-middle (on horizontal bar)
                outputPos = { x: 0, y: 1 }; // Left-middle (on horizontal bar)
                break;
            case 'up':    // 270° clockwise
                inputPos = { x: 1, y: 2 };  // Bottom-middle (on vertical bar)
                outputPos = { x: 1, y: 0 }; // Top-middle (on vertical bar)
                break;
            default:
                inputPos = { x: 0, y: 1 };  // Left-middle (default)
                outputPos = { x: 2, y: 1 }; // Right-middle (default)
        }
        
        return { inputPos, outputPos };
    }
    
    /**
     * Override the createVisuals method to customize the processor appearance
     */
    createVisuals() {
        // Call the base class method first
        super.createVisuals();
        
        // Add advanced processor-specific visuals
        if (this.container) {
            this.createProcessorVisuals("AP", {
                coreColor: 0xff5500, // Orange color
                coreShape: 'square' // Square core
            });
        }
    }

    /**
     * Get a preview sprite for the machine selection panel
     */
    static getPreviewSprite(scene, x, y, direction = 'right') {
        // Use the standard preview with machine-specific options
        const shape = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ];
        
        // Get input/output positions using the single source of truth
        const ioPositions = AdvancedProcessorMachine.getIOPositionsForDirection('advanced-processor', direction);
        
        return BaseMachine.getStandardPreviewSprite(scene, x, y, {
            machineId: 'advanced-processor',
            shape: shape,
            label: "AP",
            inputPos: ioPositions.inputPos,
            outputPos: ioPositions.outputPos,
            direction: direction
        });
    }
    
    /**
     * Get the machine configuration
     */
    static getConfig() {
        return BaseMachine.getStandardConfig({
            id: 'advanced-processor',
            name: 'Advanced Processor',
            description: 'Processes resources more efficiently than basic processors',
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ],
            inputTypes: ['basic-resource', 'advanced-resource'],
            outputTypes: ['mega-resource'],
            processingTime: 5000,
            requiredInputs: {
                'advanced-resource': 1,
                'basic-resource': 2
            }
        });
    }
} 