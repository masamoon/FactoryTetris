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
        console.log(`[ProcessorC] Constructor START. Config received:`, config); // Log at start
        // Call the parent constructor first
        super(scene, config);
        
        // Store the config for later use
        this.config = config;
        
        // Everything else is handled by the initialization hooks in the base class
        // and our overridden initMachineProperties method
        console.log(`[ProcessorC] Constructor END.`); // Log at end
    }
    
    /**
     * Override the base class method to define processor-specific properties
     */
    initMachineProperties() {
        // Define machine identifier properties
        this.id = 'processor-c'; // *** CHANGED ID ***
        this.name = 'Processor C'; // *** CHANGED Name ***
        this.description = 'Processes basic resources into advanced resources (Square)'; // *** CHANGED Description ***
        
        // Define the original shape - a 2x2 Square
        const originalShape = [
            [1, 1],
            [1, 1]
        ];
        
        // Set input/output types (same as Processor A/B)
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
        console.log(`[ProcessorC] Initialized with properties:
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
        const width = shapeToUse[0].length;
        const height = shapeToUse.length;
        
        // For 2x2, center is between cells, use floor for simplicity
        return {
            x: Math.floor((width - 1) / 2),
            y: Math.floor((height - 1) / 2)
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
        
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        let rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);

        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
            console.error(`[${this.id}] Failed to get valid rotated shape for direction ${currentDirection}. Using default.`);
            rotatedShape = [[1]]; // Fallback to default shape
        }
        
        console.log(`[ProcessorCMachine.createVisuals] Machine data:`);
        console.log(`  ID: ${this.id}`);
        console.log(`  Direction: ${this.direction}`);
        console.log(`  Rotation: ${this.rotation} radians (${this.rotation * 180 / Math.PI} degrees)`);
        console.log(`  Original Shape: ${JSON.stringify(this.shape)}`); 
        console.log(`  Rotated Shape Used: ${JSON.stringify(rotatedShape)}`); 
        console.log(`  Shape dimensions: ${rotatedShape[0].length}x${rotatedShape.length}`);
        
        const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
        
        this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);
        console.log(`[ProcessorCMachine] Created container at world position (${topLeftPos.x}, ${topLeftPos.y})`);
        
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output positions based on direction for 2x2 square
        // Consistent definition: Input=Center of entry edge, Output=Center of exit edge
        this.inputPos = { x: -1, y: -1 }; // Relative to top-left of shape
        this.outputPos = { x: -1, y: -1 };
        
        if (this.direction !== 'none') {
            switch (this.direction) {
                case 'right': // Input Left(0,0), Output Right(1,0)
                    this.inputPos = { x: 0, y: 0 }; 
                    this.outputPos = { x: 1, y: 0 }; 
                    break;
                case 'down': // Input Top(0,0), Output Bottom(0,1)
                    this.inputPos = { x: 0, y: 0 }; 
                    this.outputPos = { x: 0, y: 1 }; 
                    break;
                case 'left': // Input Right(1,0), Output Left(0,0)
                    this.inputPos = { x: 1, y: 0 }; 
                    this.outputPos = { x: 0, y: 0 }; 
                    break;
                case 'up': // Input Bottom(0,1), Output Top(0,0)
                    this.inputPos = { x: 0, y: 1 }; 
                    this.outputPos = { x: 0, y: 0 }; 
                    break;
            }
        }
        
        const cellSize = this.grid.cellSize;
        const shapeCenterX = (rotatedShape[0].length - 1) / 2;
        const shapeCenterY = (rotatedShape.length - 1) / 2;
        
        // Create visual parts (rectangles)
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                if (rotatedShape[y][x] === 1) {
                    const partCenterX = x * cellSize + cellSize / 2;
                    const partCenterY = y * cellSize + cellSize / 2;
                    
                    let partColor = 0x44ff44; // Default green
                    
                    // Assign colors and references to input/output squares
                    if (x === this.inputPos.x && y === this.inputPos.y) {
                        partColor = 0x4aa8eb; // Blue for input
                        const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                        part.setStrokeStyle(1, 0x333333);
                        this.container.add(part);
                        this.inputSquare = part; // Assign reference
                        // Add IN indicator 
                        const inputIndicator = this.scene.add.text(partCenterX, partCenterY, "IN", {
                            fontFamily: 'Arial', fontSize: 10, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                    } else if (x === this.outputPos.x && y === this.outputPos.y) {
                        partColor = 0xffa520; // Orange for output
                        const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                        part.setStrokeStyle(1, 0x333333);
                        this.container.add(part);
                        this.outputSquare = part; // Assign reference
                        // Add OUT indicator
                        const outputIndicator = this.scene.add.text(partCenterX, partCenterY, "OUT", {
                            fontFamily: 'Arial', fontSize: 9, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(outputIndicator);
                    } else {
                        // Create regular part
                        const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                        part.setStrokeStyle(1, 0x333333);
                        this.container.add(part);
                    }
                }
            }
        }
        
        const visualCenterX = shapeCenterX * cellSize;
        const visualCenterY = shapeCenterY * cellSize;
        const adjustedVisualCenterX = visualCenterX + cellSize / 2;
        const adjustedVisualCenterY = visualCenterY + cellSize / 2;
        
        const machineLabel = this.scene.add.text(adjustedVisualCenterX, adjustedVisualCenterY, "C", { // *** CHANGED Label ***
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, 
            adjustedVisualCenterY + cellSize * 0.6, // Position below the center label
            cellSize * 1.5, // Width based on cell size
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
        
        // Ensure input/output squares are correctly referenced
        // (Might need adjustment based on exact visual layout)
        // this.fixInputOutputReferences(); 
        
        // Standardize colors
        this.standardizeColors();

        // --- ADD DIRECTION INDICATOR LOGIC (Copied from BaseMachine) ---
        if (this.direction !== 'none') {
            // Calculate absolute center based on top-left container pos + visual center offset
            const absoluteCenterX = this.container.x + adjustedVisualCenterX;
            const absoluteCenterY = this.container.y + adjustedVisualCenterY;
            
            // Create the direction indicator directly in the scene, not in the container
            const indicatorColor = 0xff9500; // Orange color
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteCenterX,  // Place at calculated absolute center X
                absoluteCenterY,  // Place at calculated absolute center Y
                -4, -6,     // left top
                -4, 6,      // left bottom
                8, 0,       // right point
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
            
            // Set the depth to ensure it appears above the machine
            this.directionIndicator.setDepth(this.container.depth + 1);
        }
        // --- END DIRECTION INDICATOR LOGIC ---
        
        // Final adjustment to container position (if needed)
        this.adjustContainerPosition();
    }
    
    /**
     * Adjust the container's final position if necessary
     */
    adjustContainerPosition() {
        // For the square processor, the top-left positioning might be sufficient
        // Add adjustments here if the visual center needs correction
        // Example: this.container.x += adjustmentX;
        // Example: this.container.y += adjustmentY;
    }
    
    /**
     * Update machine state each frame
     * @param {number} time - Current game time
     * @param {number} delta - Time since last frame
     */
    update(time, delta) {
        super.update(time, delta);

        if (this.isProcessing) {
            // ---> APPLY MODIFIER HERE <---
            const speedModifier = this.scene.upgradeManager.getProcessorSpeedModifier();
            const effectiveDelta = delta * speedModifier; // Apply modifier to delta time

            this.processingProgress += effectiveDelta; // Use modified delta

            // Update progress bar visual
            const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
            if (this.progressFill && this.progressBar) {
                this.progressFill.width = this.progressBar.width * progressRatio;
            }

            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            if (this.canProcess()) {
                this.startProcessing();
            }
        }

        if (this.hasOutput()) {
            this.pushOutput();
        }
    }
    
    /**
     * Check if the machine has the required resources to start processing
     * @returns {boolean} True if processing can start, false otherwise
     */
    canProcess() {
        // Check if already processing or has output waiting
        if (this.isProcessing || this.hasOutput()) {
            // console.log(`[${this.id}] Cannot process: Already processing or has output.`); // Optional log
            return false;
        }
        
        let canStart = true;
        // Check if all required inputs are available
        for (const type in this.requiredInputs) {
            const required = this.requiredInputs[type];
            const current = this.inputInventory[type] || 0;
            if (current < required) {
                // console.log(`[${this.id}] Cannot process: Missing input ${type} (Need ${required}, Have ${current})`); // Optional log
                canStart = false;
                break;
            }
        }
        console.log(`[${this.id}] canProcess() Result: ${canStart}. Input: ${JSON.stringify(this.inputInventory)}`); // Log result
        return canStart; // All conditions met
    }
    
    /**
     * Start the processing cycle
     */
    startProcessing() {
        console.log(`[${this.id}] startProcessing() called.`); // Log call
        // Consume required inputs
        for (const type in this.requiredInputs) {
            this.inputInventory[type] -= this.requiredInputs[type];
        }
        
        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Show progress bar
        this.progressBar.setVisible(true);
        this.progressFill.setVisible(true);
        this.progressFill.width = 0; // Reset fill width
        
        // Play processing sound (if available)
        if (this.scene && this.scene.playSound) { // Check if scene and method exist
             this.scene.playSound('processing'); // Call scene's method
        }
        
        // console.log(`[${this.id}] Started processing.`); // Redundant log removed
    }
    
    /**
     * Complete the processing cycle and generate output
     */
    completeProcessing() {
        console.log(`[${this.id}] completeProcessing() called.`); // Log call
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
        
        // Hide progress bar
        this.progressBar.setVisible(false);
        this.progressFill.setVisible(false);
        
        // Play completion sound (if available)
        if (this.scene && this.scene.playSound) { // Check if scene and method exist
            this.scene.playSound('complete'); // Call scene's method
        }
        
        console.log(`[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`);
        
        // Immediately try to push the new output
        this.pushOutput();
    }
    
    /**
     * Static method to create a preview sprite for the UI
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - The x position for the sprite
     * @param {number} y - The y position for the sprite
     * @returns {Phaser.GameObjects.Container} The container holding the preview sprite
     */
    static getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Define the shape and cell size for preview
        const shape = [
            [1, 1],
            [1, 1]
        ];
        const cellSize = 24; // Use a fixed size for UI previews
        const margin = 2; // Small margin between cells
        
        // Calculate dimensions
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const totalWidth = shapeWidth * cellSize - (shapeWidth - 1) * margin;
        const totalHeight = shapeHeight * cellSize - (shapeHeight - 1) * margin;
        
        // Calculate offsets to center the shape in the container
        const offsetX = -totalWidth / 2 + cellSize / 2;
        const offsetY = -totalHeight / 2 + cellSize / 2;
        
        // Determine input/output positions for the preview (assuming 'right' default)
        const inputPos = { x: 0, y: 0 };
        const outputPos = { x: 1, y: 0 };
        
        // Create visual parts
        for (let row = 0; row < shapeHeight; row++) {
            for (let col = 0; col < shapeWidth; col++) {
                if (shape[row][col] === 1) {
                    const partX = offsetX + col * (cellSize - margin);
                    const partY = offsetY + row * (cellSize - margin);
                    
                    let partColor = 0x44ff44; // Default green
                    if (col === inputPos.x && row === inputPos.y) {
                        partColor = 0x4aa8eb; // Input blue
                    } else if (col === outputPos.x && row === outputPos.y) {
                        partColor = 0xffa520; // Output orange
                    }
                    
                    const part = scene.add.rectangle(
                        partX,
                        partY,
                        cellSize - margin * 2,
                        cellSize - margin * 2,
                        partColor
                    ).setStrokeStyle(1, 0x333333);
                    container.add(part);
                }
            }
        }
        
        // Add machine label
        const label = scene.add.text(0, 0, 'C', { // *** CHANGED Label ***
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        // Add direction indicator (triangle pointing right)
        const indicatorSize = 8;
        const directionIndicator = scene.add.triangle(
            totalWidth / 2 - indicatorSize, 0, // Position near the center right edge
            0, -indicatorSize, // Top point
            0, indicatorSize, // Bottom point
            indicatorSize * 1.5, 0, // Right point
            0xff9500 // Orange color
        );
        directionIndicator.rotation = 0; // Point right
        container.add(directionIndicator);
        
        // Store references needed for potential UI interactions (like rotation)
        container.shape = shape;
        container.directionIndicator = directionIndicator;
        container.machineLabel = label; // Reference to the label if needed
        
        return container;
    }
    
    /**
     * Find the adjacent cell(s) where output should be pushed based on direction.
     * For a 2x2 machine, this checks both cells adjacent to the output face.
     * @returns {Array<Object>|null} An array of potential target cell coordinates [{x, y, outputFaceX, outputFaceY}, ...] or null if no valid targets.
     */
    findTargetForOutput() {
        const potentialTargets = [];
        let outputFaceCells = []; // Array to hold the coords of the 2 cells on the output face

        // Determine the relative coordinates of the two cells on the output face based on direction
        switch (this.direction) {
            case 'right': 
                outputFaceCells = [{x: 1, y: 0}, {x: 1, y: 1}]; // Cells at relative (1,0) and (1,1)
                break;
            case 'down':  
                outputFaceCells = [{x: 0, y: 1}, {x: 1, y: 1}]; // Cells at relative (0,1) and (1,1)
                break;
            case 'left':  
                outputFaceCells = [{x: 0, y: 0}, {x: 0, y: 1}]; // Cells at relative (0,0) and (0,1) 
                break;
            case 'up':    
                outputFaceCells = [{x: 0, y: 0}, {x: 1, y: 0}]; // Cells at relative (0,0) and (1,0)
                break;
            default: return null; // Invalid direction
        }

        // For each cell on the output face, calculate the adjacent target cell
        for (const faceCell of outputFaceCells) {
            const outputCellX = this.gridX + faceCell.x;
            const outputCellY = this.gridY + faceCell.y;

            // Determine the offset FROM the output cell based on direction
            let targetOffsetX = 0;
            let targetOffsetY = 0;
            switch (this.direction) {
                case 'right': targetOffsetX = 1; break;
                case 'down':  targetOffsetY = 1; break;
                case 'left':  targetOffsetX = -1; break;
                case 'up':    targetOffsetY = -1; break;
            }

            // Calculate the final target coordinates
            const finalTargetX = outputCellX + targetOffsetX;
            const finalTargetY = outputCellY + targetOffsetY;

            // Validate target coordinates are within grid bounds
            if (this.grid && 
                finalTargetX >= 0 && finalTargetX < this.grid.width &&
                finalTargetY >= 0 && finalTargetY < this.grid.height) 
            {
                // Add valid target to the list
                potentialTargets.push({ 
                    x: finalTargetX, 
                    y: finalTargetY, 
                    outputFaceX: outputCellX, // Keep track of which face cell this target is adjacent to
                    outputFaceY: outputCellY 
                });
            }
        }

        // Return the array of valid potential targets (could be 0, 1, or 2 targets)
        return potentialTargets.length > 0 ? potentialTargets : null;
    }
    
    /**
     * Attempt to push output resources to the target cell
     */
    pushOutput() {
        // console.log(`[${this.id}] pushOutput() called. Output Inv: ${JSON.stringify(this.outputInventory)}`); // Log call
        if (!this.hasOutput()) {
             // console.log(`[${this.id}] pushOutput: No output to push.`); // Log exit
             return; // Nothing to push
        }
        
        const potentialTargets = this.findTargetForOutput(); // Now returns an array or null
        // console.log(`[${this.id}] pushOutput: findTargetForOutput result:`, potentialTargets); // Log target coords
        if (!potentialTargets || potentialTargets.length === 0) {
             // console.log(`[${this.id}] pushOutput: No valid target cell(s) found.`); // Log exit
             return; // No valid target cell(s)
        }
        
        // --- Try each potential target until one accepts --- 
        for (const targetCoords of potentialTargets) {
            const targetCell = this.grid.getCell(targetCoords.x, targetCoords.y);
            // console.log(`[${this.id}] pushOutput: Trying target (${targetCoords.x}, ${targetCoords.y}). Cell content:`, targetCell); // Log cell content
            
            // Check if the target cell can accept input
            if (targetCell && targetCell.type === 'machine' && targetCell.machine && typeof targetCell.machine.acceptItem === 'function') {
                const targetMachine = targetCell.machine;
                
                // Try to push the first available output type 
                for (const resourceType in this.outputInventory) {
                    if (this.outputInventory[resourceType] > 0) {
                        
                        // --- MODIFIED: Check canAcceptInput first --- 
                        if (targetMachine.canAcceptInput && targetMachine.canAcceptInput(resourceType)) {
                            
                            // --- MODIFIED: Attempt transfer using acceptItem --- 
                            const itemToTransfer = { type: resourceType, amount: 1 };
                            if (targetMachine.acceptItem(itemToTransfer)) { // Call acceptItem
                                // Decrease output inventory
                                this.outputInventory[resourceType]--;
                                
                                // Create transfer effect
                                this.createResourceTransferEffect(resourceType, targetMachine);
                                
                                // console.log(`[${this.id}] Successfully pushed ${resourceType} to machine at (${targetCoords.x}, ${targetCoords.y})`);
                                
                                // Exit pushOutput completely after successfully pushing one resource
                                return; 
                            } else {
                                // Target machine rejected item (e.g., full inventory)
                                // console.log(`[${this.id}] Target machine at (${targetCoords.x}, ${targetCoords.y}) rejected ${resourceType} (acceptItem returned false).`);
                            }
                            // --- END MODIFIED Transfer --- 
                        } else {
                            // Target machine cannot accept this type
                            // console.log(`[${this.id}] Target machine at (${targetCoords.x}, ${targetCoords.y}) cannot accept type ${resourceType}.`);
                        }
                        // --- END MODIFIED Check --- 
                        
                        // Only try one resource type per pushOutput cycle for simplicity
                        break; // Stop trying resource types for this target cell, move to next target cell
                    }
                } // End loop resource types
            } else {
                // console.log(`[${this.id}] pushOutput: Target cell at (${targetCoords.x}, ${targetCoords.y}) cannot accept input (Not a machine or lacks acceptItem/canAcceptInput).`);
            }
        } // End loop potential targets

        // If loop finishes, no target accepted the resource this cycle
        // console.log(`[${this.id}] pushOutput: No target accepted the resource this cycle.`);
    }
    
    /**
     * Check if the machine has any resources in its output inventory
     * @returns {boolean} True if output inventory is not empty, false otherwise
     */
    hasOutput() {
        for (const type in this.outputInventory) {
            if (this.outputInventory[type] > 0) {
                return true;
            }
        }
        return false;
    }
} 