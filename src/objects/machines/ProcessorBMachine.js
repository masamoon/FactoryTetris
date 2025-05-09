import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor B Machine
 * Processes basic resources into advanced resources
 */
export default class ProcessorBMachine extends BaseMachine {
    /**
     * Create a new processor B machine
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
        this.id = 'processor-b';
        this.name = 'Processor B';
        this.description = 'Processes basic resources into advanced resources';
        
        // Define the original T-shape
        const originalShape = [
            [0, 1, 0],
            [1, 1, 1]
        ];
        
        // Set input/output types
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3000; // ms
        this.defaultDirection = 'right';
        
        // Initialize using the single source of truth for I/O positions
        // Get the correct coordinates from the static method based on the default direction
        const ioPositions = ProcessorBMachine.getIOPositionsForDirection('processor-b', this.defaultDirection);
        this.inputCoord = ioPositions.inputPos;
        this.outputCoord = ioPositions.outputPos;
        
        // Required inputs for processing
        this.requiredInputs = {
            'basic-resource': 1
        };
        
        // Set the machine shape
        this.shape = originalShape;
        
        // Log initialization for better debugging
        console.log(`[ProcessorB] Initialized with properties:
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
            this.createProcessorVisuals("B", {
                coreColor: 0x00ccff, // Cyan color
                coreShape: 'circle'
            });
        }
    }
    
    /**
     * Get a preview sprite for the machine selection panel
     */
    static getPreviewSprite(scene, x, y, direction = 'right') {
        // Use the standard preview sprite with B-specific options
        const shape = [
            [0, 1, 0],
            [1, 1, 1]
        ];
        
        // Get input/output positions using the single source of truth
        const ioPositions = ProcessorBMachine.getIOPositionsForDirection('processor-b', direction);
        
        return BaseMachine.getStandardPreviewSprite(scene, x, y, {
            machineId: 'processor-b',
            shape: shape,
            label: "B",
            inputPos: ioPositions.inputPos,
            outputPos: ioPositions.outputPos,
            direction: direction
        });
    }
    
    /**
     * Get input and output positions for each direction
     * This is the single source of truth for ProcessorB I/O positions
     * @param {string} machineId - The machine ID (should be 'processor-b')
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // T-shape: [[0,1,0], [1,1,1]]
        // Ensure I/O positions are on cells with value 1
        let inputPos, outputPos;
        
        switch(direction) {
            case 'right': // Original orientation
                inputPos = { x: 0, y: 1 };  // Top-center (on vertical part of T)
                outputPos = { x: 2, y: 1 }; // Right-bottom (on horizontal part of T)
                break;
            case 'down':  // 90° clockwise - rotated to [[0,1], [1,1], [0,1]]
                inputPos = { x: 0, y: 0 };  // Middle-left (on horizontal part of T)
                outputPos = { x: 0, y: 2 }; // Bottom-right (on vertical part of T)
                break;
            case 'left':  // 180° - rotated to [[1,1,1], [0,1,0]]
                inputPos = { x: 2, y: 0 };  // Bottom-center (on vertical part of T)
                outputPos = { x: 0, y: 0 }; // Top-left (on horizontal part of T)
                break;
            case 'up':    // 270° clockwise - rotated to [[1,0], [1,1], [1,0]]
                inputPos = { x: 1, y: 2 };  // Top-right (on vertical part of T)
                outputPos = { x: 1, y: 0 }; // Middle-left (on horizontal part of T)
                break;
            default:
                inputPos = { x: 0, y: 1 };  // Top-center (default)
                outputPos = { x: 2, y: 1 }; // Right-middle (default)
        }
        
        return { inputPos, outputPos };
    }
    
    /**
     * Get standard configuration for this machine type
     */
    static getConfig() {
        // Get the I/O positions for the default direction (right)
        const ioPositions = ProcessorBMachine.getIOPositionsForDirection('processor-b', 'right');
        
        return BaseMachine.getStandardConfig({
            id: 'processor-b',
            name: 'Processor B',
            description: 'Processes basic resources into advanced resources',
            shape: [
                [0, 1, 0],
                [1, 1, 1]
            ],
            inputTypes: ['basic-resource'],
            outputTypes: ['advanced-resource'],
            processingTime: 3000,
            defaultDirection: 'right',
            requiredInputs: { 'basic-resource': 1 },
            // Use the positions from our single source of truth
            inputCoord: ioPositions.inputPos,
            outputCoord: ioPositions.outputPos
        });
    }
} 