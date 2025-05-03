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
        
        // Add processing progress bar
        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, // Relative to adjusted visual center X
            adjustedVisualCenterY + cellSize / 2, // Relative to adjusted visual center Y, slightly below
            cellSize - 10, 
            4, 
            0x00ff00
        );
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
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
        super.update(time, delta);
        
        // Ensure delta is a valid number and convert to milliseconds if needed
        delta = Number(delta) || 16.67; // Default to 60fps if delta is invalid
        if (delta > 0 && delta < 100) { // If delta is in seconds (Phaser can provide it in seconds)
            delta *= 1000; // Convert to milliseconds
        }
        
        // If we're processing, update the progress
        if (this.isProcessing) {
            // Ensure we have valid numbers
            this.processingProgress = Number(this.processingProgress) || 0;
            this.processingTime = Number(this.processingTime) || 3000;
            
            // Update progress
            this.processingProgress += delta;
            // Ensure progress doesn't exceed time
            this.processingProgress = Math.min(this.processingProgress, this.processingTime);
            
            // Update progress bar
            if (this.progressBar) {
                const progress = Math.min(1, this.processingProgress / this.processingTime);
                this.progressBar.scaleX = progress;
            }
            
            // Update visual feedback
            if (this.processorCore) {
                const progress = Math.min(1, this.processingProgress / this.processingTime);
                this.processorCore.alpha = 0.5 + (progress * 0.5);
                this.processorCore.scale = 1 + (progress * 0.2);
                this.processorCore.angle = progress * 360;
            }
            
            // If we've reached the processing time, complete the processing
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            // Check if we can start processing
            if (this.canProcess()) {
                this.startProcessing();
            }
        }
        
        // Try to transfer resources to connected machines
        if (this.outputInventory['advanced-resource'] > 0) {
            this.transferResources();
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
        // Consume the required inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            const currentAmount = this.inputInventory[resourceType] || 0;
            this.inputInventory[resourceType] = Math.max(0, currentAmount - amount);
        }
        
        // Reset and start processing
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Reset visual elements
        if (this.progressBar) {
            this.progressBar.scaleX = 0;
        }
        
        if (this.processorCore) {
            this.processorCore.alpha = 0.5;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add the product to the output inventory
        this.outputInventory['advanced-resource'] = (this.outputInventory['advanced-resource'] || 0) + 1;
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visual elements
        if (this.progressBar) {
            this.progressBar.scaleX = 0;
        }
        
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
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
     */
    findTargetForOutput() {
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot find target: grid reference is missing`);
            return null;
        }

        // Determine the absolute grid coordinates of the output face cell based on direction.
        // This logic mimics the results of the original getOutputCell method.
        let outputFaceAbsX = this.gridX;
        let outputFaceAbsY = this.gridY;

        switch (this.direction) {
            case 'right': // Shape: [[1,1],[1,0],[1,0]] -> Output face is bottom-left (0, 2) relative to anchor
                outputFaceAbsX = this.gridX + 0; 
                outputFaceAbsY = this.gridY + 2; 
                break;
            case 'down': // Shape: [[1,1,1],[0,0,1]] -> Output face is bottom-right (2, 1) relative to anchor
                outputFaceAbsX = this.gridX + 2; 
                outputFaceAbsY = this.gridY + 1; 
                break;
            case 'left': // Shape: [[0,1],[0,1],[1,1]] -> Output face is top-right (1, 0) relative to anchor
                outputFaceAbsX = this.gridX + 1; 
                outputFaceAbsY = this.gridY + 0; 
                break;
            case 'up':   // Shape: [[1,0,0],[1,1,1]] -> Output face is top-left (0, 0) relative to anchor
                outputFaceAbsX = this.gridX + 0; 
                outputFaceAbsY = this.gridY + 0; 
                break;
            default:
                 console.warn(`[${this.id}] Invalid direction: ${this.direction}`);
                return null;
        }

        // Calculate the coordinates of the target cell immediately adjacent to the output face
        let targetX = outputFaceAbsX;
        let targetY = outputFaceAbsY;
        switch (this.direction) {
            case 'right': targetX += 1; break;
            case 'down':  targetY += 1; break;
            case 'left':  targetX -= 1; break;
            case 'up':    targetY -= 1; break;
        }
        
        // console.warn(`[${this.id}] Finding target: Direction=${this.direction}, OutputFace=(${outputFaceAbsX},${outputFaceAbsY}), TargetCell=(${targetX},${targetY})`); // Optional Debug log

        // Check grid bounds for the target cell
        if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
            // console.warn(`[${this.id}] Target cell (${targetX}, ${targetY}) is out of bounds.`);
            return null;
        }

        // Get the content of the target cell
        const targetCell = this.grid.getCell(targetX, targetY);
        if (!targetCell) {
            // console.warn(`[${this.id}] No cell data found at target (${targetX}, ${targetY}).`);
            return null;
        }

        // Return the target info based on cell type
        if (targetCell.type === 'delivery-node' && targetCell.object) {
            return { type: 'delivery-node', target: targetCell.object };
        }
        if (targetCell.type === 'machine' && targetCell.machine) {
             // IMPORTANT SELF-CHECK: Ensure we are not targeting ourselves
            if (targetCell.machine === this) {
                 // console.warn(`[${this.id}] Target cell (${targetX}, ${targetY}) contains self. No valid output target found.`);
                 return null; 
            }
            return { type: 'machine', target: targetCell.machine };
        }
        
        // console.warn(`[${this.id}] Target cell (${targetX}, ${targetY}) is empty or contains non-targetable type: ${targetCell.type}`);
        return null; // Target cell is empty or not a machine/node
    }
} 