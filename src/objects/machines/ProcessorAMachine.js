import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

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
        super(scene, config);
        
        // Override base machine properties with processor-specific values
        this.id = 'processor-a';
        this.name = 'Processor A';
        this.description = 'Processes basic resources into advanced resources';
        this.shape = [
            [1, 1],
            [1, 0],
            [1, 0]
        ]; // Proper J-shaped Tetris piece (2 cells wide)
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3000; // 3 seconds
        this.defaultDirection = 'right';
        
        // Initialize processor-specific properties
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'basic-resource': 1
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
        
        // gridToWorld now returns the center of the shape
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts at the cell center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        console.log(`[ProcessorAMachine] Created container at world position (${worldPos.x}, ${worldPos.y})`);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        if (this.direction !== 'none') {
            // For machines with direction, determine input and output positions
            switch (this.direction) {
                case 'right':
                    // Input on left side, output on right side
                    inputPos = { x: 0, y: 0 };
                    outputPos = { x: this.shape[0].length - 1, y: 0 };
                    break;
                case 'down':
                    // Input on top side, output on bottom side
                    // In down rotation, the J shape should have its long part at the top
                    // and the short part to the right
                    inputPos = { x: 0, y: 0 };
                    outputPos = { x: 0, y: this.shape.length - 1 };
                    break;
                case 'left':
                    // Input on right side, output on left side
                    inputPos = { x: this.shape[0].length - 1, y: 0 };
                    outputPos = { x: 0, y: 0 };
                    break;
                case 'up':
                    // Input on bottom side, output on top side
                    inputPos = { x: 0, y: this.shape.length - 1 };
                    outputPos = { x: 0, y: 0 };
                    break;
            }
        }
        
        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Calculate the shape center in terms of cells
        const shapeCenterX = (this.shape[0].length - 1) / 2;
        const shapeCenterY = (this.shape.length - 1) / 2;
        
        console.log(`[ProcessorAMachine] Shape center: (${shapeCenterX}, ${shapeCenterY})`);
        
        // Create machine parts based on shape with consistent colors
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to container center (0,0)
                    const partX = (x - shapeCenterX) * cellSize;
                    const partY = (y - shapeCenterY) * cellSize;
                    
                    console.log(`[ProcessorAMachine] Part at shape(${x},${y}) -> relative(${partX},${partY})`);
                    
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
        
        // Position the machine label at the center of the container (0,0)
        // since the container itself is already positioned at the machine's center
        const machineLabel = this.scene.add.text(0, 0, "A", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing progress bar
        this.progressBar = this.scene.add.rectangle(
            0, 
            cellSize / 4, 
            cellSize - 10, 
            4, 
            0x00ff00
        );
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // Add direction indicator if not a cargo loader
        if (this.direction !== 'none') {
            // Create the direction indicator as part of the container, not in the scene
            const indicatorColor = 0xff9500;
            
            this.directionIndicator = this.scene.add.triangle(
                0,      // Center relative to container (x=0)
                0,      // Center relative to container (y=0)
                -4, -6, // left top
                -4, 6,  // left bottom
                8, 0,   // right point
                indicatorColor
            ).setOrigin(0.5, 0.5);
            
            // Add the indicator to the container instead of directly to the scene
            this.container.add(this.directionIndicator);
            
            // Rotate based on direction
            switch (this.direction) {
                case 'right':
                    this.directionIndicator.rotation = 0; // Point right (0 degrees)
                    break;
                case 'down':
                    this.directionIndicator.rotation = Math.PI / 2; // Point down (90 degrees)
                    break;
                case 'left':
                    this.directionIndicator.rotation = Math.PI; // Point left (180 degrees)
                    break;
                case 'up':
                    this.directionIndicator.rotation = 3 * Math.PI / 2; // Point up (270 degrees)
                    break;
            }
            
            console.log(`[ProcessorAMachine] Direction indicator created in container with direction ${this.direction}`);
        }
        
        // Add placement animation
        this.addPlacementAnimation();
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
        
        console.log(`[ProcessorAMachine] adjustContainerPosition - SKIPPED. Container remains at (${originalX}, ${originalY})`);
        console.log(`[ProcessorAMachine] Using center-relative positioning for all parts, no adjustment needed.`);
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
            if (this.processorCore) {
                const progress = this.processingProgress / this.processingTime;
                this.processorCore.alpha = 0.5 + (progress * 0.5);
                this.processorCore.scale = 1 + (progress * 0.2);
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
        if (this.outputInventory['advanced-resource'] >= 5) { // Limit output storage
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
        if (this.processorCore) {
            this.scene.tweens.add({
                targets: this.processorCore,
                angle: 360,
                duration: this.processingTime,
                ease: 'Linear'
            });
        }
        
        console.log('Processor A started processing');
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add the product to the output inventory
        this.outputInventory['advanced-resource']++;
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visual feedback
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
        
        console.log('Processor A completed processing, produced 1 advanced-resource');
    }
    
    /**
     * Create a new processor machine preview sprite
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
            [1, 1],
            [1, 0],
            [1, 0]
        ]; // Proper J-shaped Tetris piece (2 cells wide)
        
        // Base machine body
        const cellSize = 24; // Use a smaller size for previews
        
        // Calculate the shape center in terms of cells (same as in createVisuals)
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;
        
        // Draw each cell based on the shape using center-relative positioning
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[0].length; x++) {
                if (shape[y][x] === 1) {
                    // Calculate position relative to center (0,0) - same formula as createVisuals
                    const cellX = (x - shapeCenterX) * cellSize;
                    const cellY = (y - shapeCenterY) * cellSize;
                    
                    // Determine if this is an input or output cell
                    let color = 0x44ff44; // Default green color (same as when dragging)
                    
                    // Input is on the left
                    if (x === 0 && y === 0) {
                        color = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        // Add a visual indicator for input
                        const inputIndicator = scene.add.text(cellX, cellY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 8,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(inputIndicator);
                    } 
                    // Output is on the right
                    else if (x === shape[0].length - 1 && y === 0) {
                        color = 0xffa520; // Brighter orange for output (same as when dragging)
                        // Add a visual indicator for output
                        const outputIndicator = scene.add.text(cellX, cellY, "OUT", {
                            fontFamily: 'Arial',
                            fontSize: 7,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(outputIndicator);
                    }
                    
                    const rect = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(2, 0x000000);
                    container.add(rect);
                }
            }
        }
        
        // Add a simple label at the center (0,0)
        const label = scene.add.text(0, 0, "A", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        // Add a simple direction indicator (pointing right by default)
        const directionIndicator = scene.add.triangle(
            0, 0,  // Center of container
            -4, -6,
            -4, 6,
            8, 0,
            0xffffff
        );
        container.add(directionIndicator);
        
        return container;
    }
} 