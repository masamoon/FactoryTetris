import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor Machine
 * Combines Products A and B with coal to create Product C
 */
export default class AdvancedProcessorMachine extends BaseMachine {
    /**
     * Create a new advanced processor machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with processor-specific values
        this.id = 'advanced-processor';
        this.name = 'Advanced Processor';
        this.description = 'Combines Products A and B with coal to create Product C';
        this.shape = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ]; // Cross-shape Tetris piece
        this.inputTypes = ['product-a', 'product-b', 'coal'];
        this.outputTypes = ['product-c'];
        this.processingTime = 5000; // 5 seconds
        this.defaultDirection = 'down';
        
        // Initialize processor-specific properties
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'product-a': 1,
            'product-b': 1,
            'coal': 1
        };
        
        // Apply shape rotation if needed
        this.shape = config.shape || (this.grid ? this.grid.getRotatedShape(this.shape, this.rotation) : this.shape);
        
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        this.inputTypes.forEach(type => {
            this.inputInventory[type] = 0;
        });
        
        this.outputTypes.forEach(type => {
            this.outputInventory[type] = 0;
        });
    }
    
    /**
     * Override the createVisuals method to customize the processor appearance
     */
    createVisuals() {
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for machine: grid reference is missing');
            return;
        }
        
        // Calculate world position for the top-left corner of the machine
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        if (this.direction !== 'none') {
            // For cross-shape, we'll put input and output on opposite ends
            switch (this.direction) {
                case 'right':
                    // Input on left side, output on right side
                    inputPos = { x: 0, y: 1 };
                    outputPos = { x: this.shape[0].length - 1, y: 1 };
                    break;
                case 'down':
                    // Input on top side, output on bottom side
                    inputPos = { x: 1, y: 0 };
                    outputPos = { x: 1, y: this.shape.length - 1 };
                    break;
                case 'left':
                    // Input on right side, output on left side
                    inputPos = { x: this.shape[0].length - 1, y: 1 };
                    outputPos = { x: 0, y: 1 };
                    break;
                case 'up':
                    // Input on bottom side, output on top side
                    inputPos = { x: 1, y: this.shape.length - 1 };
                    outputPos = { x: 1, y: 0 };
                    break;
            }
        }
        
        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Create machine parts based on shape
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to top-left corner
                    const partX = x * cellSize + cellSize / 2;
                    const partY = y * cellSize + cellSize / 2;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    if (x === inputPos.x && y === inputPos.y) {
                        partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        // Add a visual indicator for input
                        const inputIndicator = this.scene.add.text(partX, partY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 10,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                    } else if (x === outputPos.x && y === outputPos.y) {
                        partColor = 0xffa520; // Brighter orange for output (same as when dragging)
                        // Add a visual indicator for output
                        const outputIndicator = this.scene.add.text(partX, partY, "OUT", {
                            fontFamily: 'Arial',
                            fontSize: 9,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(outputIndicator);
                    }
                    
                    // Make the center piece a different color to indicate it's the processing core
                    if (x === 1 && y === 1) {
                        partColor = 0xffaa44; // Brighter reddish-orange for the center
                    }
                    
                    // Create machine part
                    const part = this.scene.add.rectangle(partX, partY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(2, 0x000000);
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (x === inputPos.x && y === inputPos.y) {
                        this.inputSquare = part;
                    } else if (x === outputPos.x && y === outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Calculate the machine center for indicators and labels
        const centerX = (this.shape[0].length * cellSize) / 2;
        const centerY = (this.shape.length * cellSize) / 2;
        
        // Add machine type indicator at the center of the machine
        const machineLabel = this.scene.add.text(centerX, centerY, "C", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing progress bar
        this.progressBar = this.scene.add.rectangle(
            centerX, 
            centerY + cellSize / 4, 
            cellSize - 10, 
            4, 
            0x00ff00
        );
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // Add direction indicator if not a cargo loader
        if (this.direction !== 'none') {
            this.directionIndicator = this.createDirectionIndicator(centerX, centerY);
            this.container.add(this.directionIndicator);
        }
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Adjust container position based on shape and rotation
        this.adjustContainerPosition();
    }
    
    /**
     * Adjust the container position based on the shape and rotation
     */
    adjustContainerPosition() {
        const cellSize = this.grid.cellSize;
        
        // Adjust based on rotation
        switch (this.direction) {
            case 'right': // Default cross shape
                // No adjustment needed for right
                break;
            case 'down': // Rotated 90 degrees clockwise
                // For down rotation of cross shape
                break;
            case 'left': // Rotated 180 degrees
                // For left rotation of cross shape
                break;
            case 'up': // Rotated 270 degrees clockwise (90 counter-clockwise)
                // For up rotation of cross shape
                break;
        }
        
        // Don't apply rotation to the container since we're using rotated shapes from the grid
        // The input/output positions are handled based on direction
    }
    
    /**
     * Create a new advanced processor machine preview sprite
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Container} The preview container
     */
    static getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Get the default shape from game config
        const shape = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ]; // Cross-shape Tetris piece
        
        // Base machine body
        const cellSize = 24; // Use a smaller size for previews
        
        // Calculate dimensions
        const width = shape[0].length * cellSize;
        const height = shape.length * cellSize;
        
        // Draw each cell based on the shape
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[0].length; x++) {
                if (shape[y][x] === 1) {
                    // Calculate position
                    const cellX = (x * cellSize) - (width / 2) + (cellSize / 2);
                    const cellY = (y * cellSize) - (height / 2) + (cellSize / 2);
                    
                    // Determine if this is an input or output cell
                    let color = 0x4a6fb5; // Default blue
                    
                    // Input is on the left of the middle row
                    if (x === 0 && y === 1) {
                        color = 0x0055ff; // Bright blue for input
                        // Add a visual indicator for input
                        const inputIndicator = scene.add.text(cellX, cellY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 8,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(inputIndicator);
                    } 
                    // Output is on the right of the middle row
                    else if (x === shape[0].length - 1 && y === 1) {
                        color = 0xff3300; // Bright orange/red for output
                        // Add a visual indicator for output
                        const outputIndicator = scene.add.text(cellX, cellY, "OUT", {
                            fontFamily: 'Arial',
                            fontSize: 7,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(outputIndicator);
                    }
                    // Center piece is a different color
                    else if (x === 1 && y === 1) {
                        color = 0xff5500; // Reddish-orange for the center
                    }
                    
                    const rect = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(2, 0x000000);
                    container.add(rect);
                }
            }
        }
        
        // Add a simple label
        const label = scene.add.text(0, 0, "C", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        // Add a simple direction indicator (pointing right by default)
        const directionIndicator = scene.add.triangle(
            width / 2 - cellSize / 2, 0,
            -4, -6,
            -4, 6,
            8, 0,
            0xffffff
        );
        container.add(directionIndicator);
        
        return container;
    }
    
    /**
     * Override the update method to handle processing logic
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Check if we can start processing
        if (!this.isProcessing && this.canProcess()) {
            this.startProcessing();
        }
        
        // If we're processing, update the progress
        if (this.isProcessing) {
            this.processingProgress += delta;
            
            // Update visual feedback
            if (this.progressBar) {
                const progress = this.processingProgress / this.processingTime;
                this.progressBar.scaleX = progress;
            }
            
            // If we've reached the processing time, complete the processing
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        }
        
        // Try to transfer resources to connected machines
        this.transferResources();
    }
    
    /**
     * Check if the machine can start processing
     * @returns {boolean} True if the machine can process
     */
    canProcess() {
        // Check if we have enough of each required input
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            if (!this.inputInventory[resourceType] || this.inputInventory[resourceType] < amount) {
                return false;
            }
        }
        
        // Check if there's room in the output inventory
        if (this.outputInventory['product-c'] >= 3) { // Limit output storage
            return false;
        }
        
        return true;
    }
    
    /**
     * Start the processing operation
     */
    startProcessing() {
        // Consume the required inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            this.inputInventory[resourceType] -= amount;
        }
        
        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Visual feedback for processing
        if (this.progressBar) {
            this.scene.tweens.add({
                targets: this.progressBar,
                scaleX: 1,
                duration: this.processingTime,
                ease: 'Linear'
            });
        }
        
        console.log('Advanced Processor started processing');
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add the product to the output inventory
        this.outputInventory['product-c']++;
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visual feedback
        if (this.progressBar) {
            this.progressBar.scaleX = 0;
        }
        
        console.log('Advanced Processor completed processing, produced 1 product-c');
    }
} 