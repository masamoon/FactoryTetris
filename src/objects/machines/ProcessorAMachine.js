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
        
        // Log critical information about the machine's properties
        console.log(`[ProcessorAMachine.createVisuals] Machine data:`);
        console.log(`  ID: ${this.id}`);
        console.log(`  Direction: ${this.direction}`);
        console.log(`  Rotation: ${this.rotation} radians (${this.rotation * 180 / Math.PI} degrees)`);
        console.log(`  Shape: ${JSON.stringify(this.shape)}`);
        console.log(`  Shape dimensions: ${this.shape[0].length}x${this.shape.length}`);
        
        // gridToWorld now returns the center of the shape
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts at the cell center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        console.log(`[ProcessorAMachine] Created container at world position (${worldPos.x}, ${worldPos.y})`);
        
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
                    // Shape: [[1,1], [1,0], [1,0]]
                    this.inputPos = { x: 0, y: 0 }; // Top-left
                    this.outputPos = { x: 0, y: 2 }; // Bottom-left
                    break;
                case 'down': // 90 deg rotation
                    // Shape: [[1,1,1], [0,0,1]]
                    this.inputPos = { x: 2, y: 0 }; // Top-left
                    this.outputPos = { x: 0, y: 0 }; // Top-right
                    break;
                case 'left': // 180 deg rotation
                    // Shape: [[0,1], [0,1], [1,1]]
                    this.inputPos = { x: 1, y: 2 }; // Bottom-right
                    this.outputPos = { x: 1, y: 0 }; // Top-right
                    break;
                case 'up': // 270 deg rotation
                    // Shape: [[1,0,0], [1,1,1]]
                    this.inputPos = { x: 0, y: 1 }; // Bottom-left (Corrected)
                    this.outputPos = { x: 2, y: 1 }; // Bottom-right (Corrected)
                    break;
            }
        }
        
        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Calculate the shape center in terms of cells
        const shapeCenterX = (this.shape[0].length - 1) / 2;
        const shapeCenterY = (this.shape.length - 1) / 2;
        
        console.log(`[ProcessorAMachine] Shape center: (${shapeCenterX}, ${shapeCenterY})`);
        console.log(`[ProcessorAMachine] Shape name: ${this.name}`);


        // Create machine parts based on shape with consistent colors
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    let partX = 0;
                    let partY = 0;
                    // Calculate part position relative to container center (0,0)
                    if (this.direction === 'none') {
                         partX = ((x - shapeCenterX) * cellSize) - cellSize * 0.5;
                         partY = ((y - shapeCenterY) * cellSize) ;
                    } else if (this.direction === 'right') {
                        partX = ((x - shapeCenterX) * cellSize) - cellSize * 0.5;
                        partY = ((y - shapeCenterY) * cellSize) ;
                    } else if (this.direction === 'down') {
                        partX = ((x - shapeCenterX) * cellSize) ;
                        partY = ((y - shapeCenterY) * cellSize) - cellSize * 0.5;
                    } else if (this.direction === 'left') {
                        partX = ((x - shapeCenterX) * cellSize) - cellSize * 0.5;
                        partY = ((y - shapeCenterY) * cellSize) ;
                    } else if (this.direction === 'up') {
                        partX = ((x - shapeCenterX) * cellSize) ;
                        partY = ((y - shapeCenterY) * cellSize) - cellSize * 0.5;
                    }

                    console.log(`[ProcessorAMachine] Part at shape(${x},${y}) -> relative(${partX},${partY})`);
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    if (x === this.inputPos.x && y === this.inputPos.y) {
                        partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        // Add a visual indicator for input
                        const inputIndicator = this.scene.add.text(partX, partY, "IN", {
                            fontFamily: 'Arial',
                            fontSize: 10,
                            color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                    } else if (x === this.outputPos.x && y === this.outputPos.y) {
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
                    if (x === this.inputPos.x && y === this.inputPos.y) {
                        this.inputSquare = part;
                    } else if (x === this.outputPos.x && y === this.outputPos.y) {
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
        
        // Create processor core visual element
        this.processorCore = this.scene.add.circle(0, 0, cellSize / 4, 0xff5500);
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        console.log(`[ProcessorA] Created processor core visual element`);
        
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
            console.log(`[ProcessorA] Processing: ${Math.round((this.processingProgress / this.processingTime) * 100)}% complete`);
            
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
                console.log('[ProcessorA] Starting new processing cycle');
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
        
        console.log('[ProcessorA] Can process: true');
        return true;
    }
    
    /**
     * Start the processing operation
     */
    startProcessing() {
        console.log('[ProcessorA] Starting processing cycle');
        
        // Consume the required inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            const currentAmount = this.inputInventory[resourceType] || 0;
            this.inputInventory[resourceType] = Math.max(0, currentAmount - amount);
            console.log(`[ProcessorA] Consumed ${amount} ${resourceType}, remaining: ${this.inputInventory[resourceType]}`);
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
        
        console.log('[ProcessorA] Processing started');
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        console.log('[ProcessorA] Completing processing cycle');
        
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
        
        console.log(`[ProcessorA] Processing complete. Output inventory: ${JSON.stringify(this.outputInventory)}`);
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
     * Get the output cell coordinates based on shape and direction
     * @returns {{x: number, y: number}} The output cell coordinates
     */
    getOutputCell() {
        // Use the relative output position stored during createVisuals
        const relativeOutputPos = this.outputPos;
        
        // Ensure outputPos has been initialized (should happen in createVisuals)
        console.log(`[DEBUG getOutputCell START] Machine: ${this.id}, Direction: ${this.direction}, Grid: (${this.gridX}, ${this.gridY})`);
        console.log(`[DEBUG getOutputCell] Stored Relative Output Pos:`, JSON.stringify(relativeOutputPos));
        
        if (!relativeOutputPos || relativeOutputPos.x === -1) {
            console.error(`[ProcessorA getOutputCell] Error: this.outputPos not properly initialized. Direction: ${this.direction}`);
            // Fallback to the machine's center or another default
            return { x: this.gridX, y: this.gridY };
        }

        // Calculate the shape's dimensions and center for the *current* rotation
        const currentShape = this.shape; // Assumes this.shape is correctly rotated
        const shapeHeight = currentShape.length;
        const shapeWidth = currentShape[0].length;
        const shapeCenterX = (shapeWidth - 1) / 2;
        const shapeCenterY = (shapeHeight - 1) / 2;
        console.log(`[DEBUG getOutputCell] Current Shape:`, JSON.stringify(currentShape));
        console.log(`[DEBUG getOutputCell] Shape Dims (W, H): (${shapeWidth}, ${shapeHeight}), Shape Center (X, Y): (${shapeCenterX}, ${shapeCenterY})`);

        // Calculate the offset of the shape's top-left (0,0) relative to its center
        const centerOffsetX = -shapeCenterX;
        const centerOffsetY = -shapeCenterY;

        // Calculate the offset of the output cell relative to the shape's top-left (0,0)
        const outputOffsetX = relativeOutputPos.x;
        const outputOffsetY = relativeOutputPos.y;

        console.log(`[DEBUG getOutputCell] Center Offset (X, Y): (${centerOffsetX}, ${centerOffsetY}), Output Offset from TopLeft (X, Y): (${outputOffsetX}, ${outputOffsetY})`);

        // Combine offsets: (Output relative to top-left) + (Top-left relative to Center)
        const totalOffsetX = outputOffsetX + centerOffsetX;
        const totalOffsetY = outputOffsetY + centerOffsetY;
        console.log(`[DEBUG getOutputCell] Total Offset from Center (X, Y): (${totalOffsetX}, ${totalOffsetY})`);
        
        // Add the total offset to the machine's center grid coordinates
        let outputX = Math.floor(this.gridX + totalOffsetX);
        let outputY = Math.floor(this.gridY + totalOffsetY);

        console.log(`[DEBUG getOutputCell END] Final Calculated Output Cell (X, Y): (${outputX}, ${outputY})`);

        return { x: outputX, y: outputY };
    }
    
    /**
     * Find connected machine in the output direction
     * @returns {BaseMachine|null} The connected machine or null if none
     */
    findConnectedMachine() {
        // Skip if there's no grid
        if (!this.grid) return null;
        
        // Get the output cell position based on our shape and direction
        let outputCell = this.getOutputCell();
        
        // For conveyor belts, check all adjacent cells
        const adjacentCells = [
            { x: outputCell.x + 1, y: outputCell.y, dir: 'right' },
            { x: outputCell.x - 1, y: outputCell.y, dir: 'left' },
            { x: outputCell.x, y: outputCell.y + 1, dir: 'down' },
            { x: outputCell.x, y: outputCell.y - 1, dir: 'up' }
        ];
        
        // Check each adjacent cell
        for (const cell of adjacentCells) {
            const cellContent = this.grid.getCellContent(cell.x, cell.y);
            
            // Get the machine object from the cell content
            const machine = cellContent?.object || cellContent?.machine || (cellContent?.occupiedBy?.machine);
            
            if (cellContent && cellContent.type === 'machine' && machine) {
                // Check each conveyor detection method separately
                const constructorCheck = machine.constructor.name.toLowerCase().includes('conveyor');
                const idCheck = machine.id?.toLowerCase().includes('conveyor');
                const methodCheck = typeof machine.addItem === 'function';
                
                // If it's a conveyor belt, we can connect from any direction
                const isConveyor = constructorCheck || idCheck || methodCheck;
                
                if (isConveyor) {
                    return machine;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Transfer resources to connected machines
     */
    transferResources() {
        // Find connected machine in the output direction
        const connectedMachine = this.findConnectedMachine();
        
        if (!connectedMachine) {
            return;
        }
        
        // Check if we have resources to transfer
        const outputResourceType = 'advanced-resource';
        if (this.outputInventory[outputResourceType] <= 0) {
            return;
        }
        
        // Try to transfer using addItem method first
        if (typeof connectedMachine.addItem === 'function') {
            try {
                const success = connectedMachine.addItem(outputResourceType);
                if (success) {
                    this.outputInventory[outputResourceType]--;
                    this.createResourceTransferEffect(outputResourceType, connectedMachine);
                }
            } catch (error) {
                console.error(`[ProcessorA] Error during transfer:`, error);
            }
            return;
        }
        
        // Fall back to inventory-based transfer
        if (connectedMachine.inputInventory) {
            this.outputInventory[outputResourceType]--;
            connectedMachine.inputInventory[outputResourceType] = 
                (connectedMachine.inputInventory[outputResourceType] || 0) + 1;
            
            this.createResourceTransferEffect(outputResourceType, connectedMachine);
        }
    }
    
    /**
     * Create a visual effect for resource transfer
     * @param {string} resourceType - The type of resource being transferred
     * @param {BaseMachine} targetMachine - The machine receiving the resource
     */
    createResourceTransferEffect(resourceType, targetMachine) {
        // --- DEBUGGING --- 
        if (!this.container) {
            console.error(`[${this.id}] ERROR: this.container is null or undefined in createResourceTransferEffect!`);
            console.error(`Machine State: grid=(${this.gridX}, ${this.gridY}), direction=${this.direction}, isProcessing=${this.isProcessing}`);
            // Optionally, try to prevent further errors by returning early
            return; 
        }
        console.log(`[${this.id}] createResourceTransferEffect - Container exists. Position: (${this.container.x}, ${this.container.y})`);
        // --- END DEBUGGING --- 

        // Get source position (center of this machine)
        const sourcePos = {
            x: this.container.x,
            y: this.container.y
        };
        
        // Get target position (center of target machine)
        const targetPos = {
            x: targetMachine.container.x,
            y: targetMachine.container.y
        };
        
        // Create a resource sprite
        const resourceSprite = this.scene.add.circle(sourcePos.x, sourcePos.y, 5, 0xffa520);
        
        // Animate the resource transfer
        this.scene.tweens.add({
            targets: resourceSprite,
            x: targetPos.x,
            y: targetPos.y,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                resourceSprite.destroy();
            }
        });
    }
} 