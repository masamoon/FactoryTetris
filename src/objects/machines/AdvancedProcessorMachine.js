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
        
        // Add a debug interval to check inputs periodically
        this.debugInterval = setInterval(() => {
            if (this.scene && !this.scene.gameOver) {
                this.logInputStatus();
            }
        }, 5000);
    }
    
    /**
     * Log the input status to help diagnose issues
     */
    logInputStatus() {
        console.log(`[AdvancedProcessor] at (${this.gridX},${this.gridY}) Input status:`, 
            JSON.stringify(this.inputInventory), 
            `Can process: ${this.canProcess()}`
        );
        
        // Check adjacent cells for potential inputs
        const adjacentMachines = this.findAdjacentMachines();
        if (adjacentMachines.length > 0) {
            console.log(`[AdvancedProcessor] Adjacent machines:`, 
                adjacentMachines.map(m => `${m.id} at (${m.gridX},${m.gridY}) with outputs: ${JSON.stringify(m.outputInventory)}`).join(', ')
            );
        } else {
            console.log(`[AdvancedProcessor] No adjacent machines found`);
        }
    }
    
    /**
     * Find machines adjacent to this one
     * @returns {Array} Array of adjacent machines
     */
    findAdjacentMachines() {
        if (!this.grid) return [];
        
        const adjacentMachines = [];
        const occupiedCells = this.getOccupiedCells();
        
        // Check all cells occupied by this machine
        for (const cell of occupiedCells) {
            // Check in all four directions
            const directions = [
                {dx: 1, dy: 0},  // right
                {dx: 0, dy: 1},  // down
                {dx: -1, dy: 0}, // left
                {dx: 0, dy: -1}  // up
            ];
            
            for (const dir of directions) {
                const nx = cell.x + dir.dx;
                const ny = cell.y + dir.dy;
                
                // Skip if out of bounds
                if (nx < 0 || nx >= this.grid.width || ny < 0 || ny >= this.grid.height) {
                    continue;
                }
                
                // Skip if it's one of our own cells
                if (occupiedCells.some(oc => oc.x === nx && oc.y === ny)) {
                    continue;
                }
                
                // Check the cell
                try {
                    const neighborCell = this.grid.getCell(nx, ny);
                    if (neighborCell && neighborCell.type === 'machine' && neighborCell.object && 
                        neighborCell.object !== this && !adjacentMachines.includes(neighborCell.object)) {
                        adjacentMachines.push(neighborCell.object);
                    }
                } catch (e) {
                    console.warn(`[AdvancedProcessor] Error checking cell (${nx},${ny}):`, e);
                }
            }
        }
        
        return adjacentMachines;
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
     * Override destroy to clean up interval
     */
    destroy() {
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
            this.debugInterval = null;
        }
        super.destroy();
    }
    
    /**
     * Override the canAcceptInput method to ensure we properly handle advanced resources
     */
    canAcceptInput(resourceTypeId) {
     
        return super.canAcceptInput(resourceTypeId);
    }
    
    /**
     * Override acceptItem to add extra logging
     */
    acceptItem(itemData, sourceMachine = null) {
        //console.log(`[AdvancedProcessor] acceptItem called with item:`, itemData);
        
        // Call the parent method
        const result = super.acceptItem(itemData, sourceMachine);
        
        //console.log(`[AdvancedProcessor] acceptItem result: ${result}`);
        return result;
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