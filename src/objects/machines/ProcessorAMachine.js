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
            [1, 0]
        ];
        
        // Set input/output types
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
        
        // Set the original shape - rotation will be applied by BaseMachine before createVisuals
        this.shape = originalShape;
        
        // Initialize inventories with default values
        this.inputInventory = {
            'basic-resource': 0
        };
        this.outputInventory = {
            'advanced-resource': 0
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
            y: (height - 1) / 2
        };
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
        
        // *** ADDED: Get the correctly rotated shape for visuals (Copied from BaseMachine) ***
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection); // Use direction string

        // *** VALIDATE the rotated shape ***
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
            console.error(`[${this.id}] Failed to get valid rotated shape for direction ${currentDirection}. Using default.`);
            rotatedShape = [[1]]; // Fallback to default shape
        }
        
        // Log critical information about the machine's properties
        console.log(`[ProcessorAMachine.createVisuals] Machine data:`);
        console.log(`  ID: ${this.id}`);
        console.log(`  Direction: ${this.direction}`);
        console.log(`  Rotation: ${this.rotation} radians (${this.rotation * 180 / Math.PI} degrees)`);
        console.log(`  Original Shape: ${JSON.stringify(this.shape)}`); 
        console.log(`  Rotated Shape Used: ${JSON.stringify(rotatedShape)}`); 
        console.log(`  Shape dimensions: ${rotatedShape[0].length}x${rotatedShape.length}`);
        
        // *** MODIFIED: Use gridToWorldTopLeft consistent with BaseMachine ***
        const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
        
        // Create container for machine parts at the cell top-left
        // *** MODIFIED: Use topLeftPos ***
        this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);
        console.log(`[ProcessorAMachine] Created container at world position (${topLeftPos.x}, ${topLeftPos.y})`);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output positions based on direction
        this.inputPos = { x: -1, y: -1 };
        this.outputPos = { x: -1, y: -1 };
        
        if (this.direction !== 'none') {
            // For machines with direction, determine input and output positions
            // based on rotating the original input(0,0) and output(0,2) points.
            switch (this.direction) {
                case 'right': // 0 deg rotation
                    // Original Shape: [[1,1], [1,0], [1,0]]
                    this.inputPos = { x: 0, y: 0 }; // Top-left of original
                    this.outputPos = { x: 0, y: 2 }; // Bottom-left of original
                    break;
                case 'down': // 90 deg rotation
                    // Rotated Shape: [[1,1,1], [0,0,1]] (Width=3, Height=2)
                    // *** CORRECTED based on re-tracing coordinate transformation ***
                    this.inputPos = { x: 2, y: 0 }; // Original (0,0) maps here
                    this.outputPos = { x: 0, y: 0 }; // Original (0,2) maps here
                    break;
                case 'left': // 180 deg rotation
                    // Rotated Shape: [[0,1], [0,1], [1,1]] (Width=2, Height=3)
                    this.inputPos = { x: 1, y: 2 }; // Original (0,0) maps here
                    this.outputPos = { x: 1, y: 0 }; // Original (0,2) maps here
                    break;
                case 'up': // 270 deg rotation
                    // Rotated Shape: [[1,0,0], [1,1,1]] (Width=3, Height=2)
                     // *** CORRECTED based on re-tracing coordinate transformation ***
                    this.inputPos = { x: 0, y: 1 }; // Original (0,0) maps here
                    this.outputPos = { x: 2, y: 1 }; // Original (0,2) maps here
                    break;
            }
        }
        
        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Calculate the shape center in terms of cells
        // *** MODIFIED: Use rotatedShape dimensions ***
        const shapeCenterX = (rotatedShape[0].length - 1) / 2;
        const shapeCenterY = (rotatedShape.length - 1) / 2;
        
        // Create machine parts based on shape with consistent colors
        // *** MODIFIED: Use rotatedShape ***
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // *** MODIFIED: Use rotatedShape ***
                if (rotatedShape[y][x] === 1) {
                    // *** MODIFIED: Use top-left positioning logic from BaseMachine ***
                    const partCenterX = x * cellSize + cellSize / 2;
                    const partCenterY = y * cellSize + cellSize / 2;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    if (x === this.inputPos.x && y === this.inputPos.y) {
                        partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        // Add a visual indicator for input
                        const inputIndicator = this.scene.add.text(partCenterX, partCenterY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 10,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                    } else if (x === this.outputPos.x && y === this.outputPos.y) {
                        partColor = 0xffa520; // Brighter orange for output (same as when dragging)
                        // Add a visual indicator for output
                        const outputIndicator = this.scene.add.text(partCenterX, partCenterY, "OUT", {
                            fontFamily: 'Arial',
                            fontSize: 9,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(outputIndicator);
                    }
                    
                    // Create machine part
                    // *** MODIFIED: Use partCenterX/Y for positioning ***
                    const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333);
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (x === this.inputPos.x && y === this.inputPos.y) {
                        this.inputSquare = part;
                    } else if (x === this.outputPos.x && y === this.outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Position relative to the VISUAL center of the shape within the container
        const visualCenterX = shapeCenterX * cellSize;
        const visualCenterY = shapeCenterY * cellSize;
        
        // Adjust center based on user's part offset
        // *** MODIFIED: Use positioning logic from BaseMachine ***
        const adjustedVisualCenterX = visualCenterX + cellSize / 2;
        const adjustedVisualCenterY = visualCenterY + cellSize / 2;
        
        // Position the machine label at the center of the container (0,0)
        // since the container itself is already positioned at the machine's center
        const machineLabel = this.scene.add.text(adjustedVisualCenterX, adjustedVisualCenterY, "A", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing progress bar (Copied from ProcessorC)
        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, 
            adjustedVisualCenterY + cellSize * 0.6, // Position below the center label
            cellSize * 1.5, // Width based on cell size (adjust multiplier if needed for shape)
            6, // Height
            0x000000 // Background color
        ).setOrigin(0.5);
        this.progressBar.setDepth(1); // Ensure progress bar is visible
        this.container.add(this.progressBar);
        
        this.progressFill = this.scene.add.rectangle(
            this.progressBar.x - this.progressBar.width / 2,
            this.progressBar.y,
            0, // Initial width
            this.progressBar.height,
            0x00ff00 // Fill color
        ).setOrigin(0, 0.5);
        this.progressFill.setDepth(2);
        this.container.add(this.progressFill);
        
        // Hide progress bar initially
        this.progressBar.setVisible(false);
        this.progressFill.setVisible(false);
        // --- End Progress Bar ---
        
        // Create processor core visual element
        // Position relative to the VISUAL center of the shape within the container
        this.processorCore = this.scene.add.circle(adjustedVisualCenterX, adjustedVisualCenterY, cellSize / 4, 0xff5500);
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        
        // Add direction indicator if not a cargo loader
        if (this.direction !== 'none') {
            // *** MODIFIED: Use absolute positioning logic from BaseMachine ***
            const absoluteCenterX = this.container.x + adjustedVisualCenterX;
            const absoluteCenterY = this.container.y + adjustedVisualCenterY;

            // Create the direction indicator directly in the scene, not in the container
            const indicatorColor = 0xff9500;
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteCenterX,      // Center relative to calculated absolute center
                absoluteCenterY,      // Center relative to calculated absolute center
                -4, -6, // left top
                -4, 6,  // left bottom
                8, 0,   // right point
                indicatorColor
            ).setOrigin(0.5, 0.5);
            
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
        }
        
        // Add placement animation
        this.addPlacementAnimation();

        this.adjustContainerPosition();
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
        // Call base class update first
        super.update(time, delta);
        
        // If processing, update progress
        if (this.isProcessing) {
            this.processingProgress += delta;
            
            // *** ADDED: Update progress bar visual ***
            const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
            if (this.progressFill && this.progressBar) { // Check if bar exists
                 this.progressFill.width = this.progressBar.width * progressRatio;
            }
            // *** END ADDED ***
            
            // Check if processing is complete
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            // If not processing, check if we can start
            if (this.canProcess()) {
                this.startProcessing();
            }
        }
        
        // Try to push output if available
        if (this.hasOutput()) {
            this.pushOutput();
        }
    }
    
    /**
     * Check if the machine can start processing
     * @returns {boolean} True if the machine can process
     */
    canProcess() {
        // Check if we have enough of each required input
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            const currentAmount = this.inputInventory[resourceType] || 0;
            if (currentAmount < amount) {
                return false;
            }
        }
        
        // Check if there's room in the output inventory
        const currentOutput = this.outputInventory['advanced-resource'] || 0;
        if (currentOutput >= 5) { // Limit output storage
            return false;
        }
        
        return true;
    }
    
    /**
     * Start the processing operation
     */
    startProcessing() {
        // Consume required inputs
        for (const type in this.requiredInputs) {
            this.inputInventory[type] -= this.requiredInputs[type];
        }
        
        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // *** ADDED: Show progress bar ***
        if (this.progressBar && this.progressFill) { // Check if bar exists
             this.progressBar.setVisible(true);
             this.progressFill.setVisible(true);
             this.progressFill.width = 0; // Reset fill width
        }
        // *** END ADDED ***
        
        // Play processing sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('processing');
        }
        
        console.log(`[${this.id}] Started processing.`);
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add output resources
        this.outputTypes.forEach(type => {
            if (this.outputInventory[type] !== undefined) {
                this.outputInventory[type]++;
            } else {
                console.warn(`[${this.id}] Output inventory does not have key: ${type}`);
            }
        });
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // *** ADDED: Hide progress bar ***
        if (this.progressBar && this.progressFill) { // Check if bar exists
            this.progressBar.setVisible(false);
            this.progressFill.setVisible(false);
        }
        // *** END ADDED ***
        
        // Play completion sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('complete');
        }
        
        console.log(`[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`);
        
        // Immediately try to push the new output
        this.pushOutput();
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
                    console.log(`[Preview SPRITE] Processing Shape Cell (${x}, ${y})`); // Log cell being processed
                    // Calculate position relative to center (0,0) - same formula as createVisuals
                    const cellX = (x - shapeCenterX) * cellSize;
                    const cellY = (y - shapeCenterY) * cellSize;
                    
                    // Determine if this is an input or output cell for the default 'right' orientation
                    let color = 0x44ff44; // Default green color
                    let isInput = (x === 0 && y === 0); // Top-left for 'right' orientation
                    let isOutput = (x === 0 && y === 2); // Bottom-left for 'right' orientation

                    // Remove existing indicators first if they exist outside the new conditions
                    container.getAll().forEach(child => {
                        if (child.text === "IN" || child.text === "OUT") {
                            // Simple check, might need refinement if other text exists
                            // Check if the position roughly matches this cell to avoid removing unrelated text
                            if (Math.abs(child.x - cellX) < cellSize / 2 && Math.abs(child.y - cellY) < cellSize / 2) {
                                child.destroy();
                            }
                        }
                    });
                    
                    if (isInput) {
                        color = 0x4aa8eb; // Blue for input
                        const inputIndicator = scene.add.text(cellX, cellY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 8,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(inputIndicator);
                    } 
                    else if (isOutput) { 
                        color = 0xffa520; // Orange for output
                        const outputIndicator = scene.add.text(cellX, cellY, "OUT", {
                            fontFamily: 'Arial',
                            fontSize: 7,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        container.add(outputIndicator);
                    }
                    
                    console.log(`[Preview SPRITE] Cell (${x}, ${y}) -> Pos (${cellX.toFixed(1)}, ${cellY.toFixed(1)}), Color: ${color.toString(16)}`); // Log calculated pos and color
                    
                    const rect = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(2, 0x000000);
                    container.add(rect);
                    console.log(`[Preview SPRITE] Added rect for Cell (${x}, ${y}) to container.`); // Log rect addition
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
    
    /**
     * Override findTargetForOutput to correctly identify the adjacent cell
     * based on the Processor A's specific J-shape and direction.
     * This version checks all cells along the output face.
     */
    findTargetForOutput() {
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot find target: grid reference is missing`);
            return null;
        }

        const occupiedCells = this.getOccupiedCells();
        if (!occupiedCells || occupiedCells.length === 0) {
             console.warn(`[${this.id}] Cannot find target: machine occupies no cells.`);
            return null; 
        }

        // Determine the offset to check based on direction
        let dx = 0, dy = 0;
        switch (this.direction) {
            case 'right': dx = 1; break;
            case 'down':  dy = 1; break;
            case 'left':  dx = -1; break;
            case 'up':    dy = -1; break;
            default:
                console.warn(`[${this.id}] Invalid direction: ${this.direction}`);
                return null;
        }

        // Iterate through all cells occupied by this machine
        for (const cell of occupiedCells) {
            const outputFaceAbsX = cell.x; // Absolute X of the cell occupied by this machine
            const outputFaceAbsY = cell.y; // Absolute Y of the cell occupied by this machine

            // Calculate the coordinates of the potential target cell adjacent to this occupied cell
            const targetX = outputFaceAbsX + dx;
            const targetY = outputFaceAbsY + dy;
            
            // Check 1: Is the target cell within grid bounds?
            if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                continue; // Skip if out of bounds
            }
            
            // Check 2: Is the target cell part of this machine itself?
            const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
            if (isSelf) {
                continue; // Skip if target is part of this machine
            }

            // If the target cell is valid and not part of self, check its content
            const targetCell = this.grid.getCell(targetX, targetY);
            if (!targetCell) {
                continue; 
            }
            
            // Check if the target cell contains a valid machine or node
            if (targetCell.type === 'delivery-node' && targetCell.object) {
                 // Return info about the node and WHICH cell of this machine is outputting to it
                 return { type: 'delivery-node', target: targetCell.object, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
            if (targetCell.type === 'machine' && targetCell.machine) {
                 // Return info about the machine and WHICH cell of this machine is outputting to it
                 return { type: 'machine', target: targetCell.machine, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
        }
        
        // If the loop completes without finding a valid target
        return null;
    }
} 