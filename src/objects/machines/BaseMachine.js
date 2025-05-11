import Phaser from 'phaser';
import { GAME_CONFIG } from '../../config/gameConfig';
import { GRID_CONFIG } from '../../config/gameConfig';
import ConveyorMachine from './ConveyorMachine';

// Unique colors for each machine type
const MACHINE_COLORS = {
    'processor-a': 0x4e79a7, // blue
    'processor-b': 0xf28e2b, // orange
    'processor-c': 0xe15759, // red
    'processor-d': 0x76b7b2, // teal
    'processor-e': 0x59a14f, // green
    'advanced-processor': 0xedc948, // yellow
    'conveyor': 0x888888, // gray
    // Add more as needed
};
export { MACHINE_COLORS };

/**
 * Base class for all machine types
 * This class provides common functionality that all machines share
 * Specific machine types will extend this class and override methods as needed
 */
export default class BaseMachine {
    /**
     * Create a new machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        this.scene = scene;
        
        // Check if this is a preview instance (no grid needed)
        this.isPreview = config.preview === true;
        
        // Store preset position if provided (for exact positioning)
        if (config.presetPosition) {
            this.presetPosition = config.presetPosition;
           // console.log(`[BaseMachine] Constructor received preset position: (${this.presetPosition.x}, ${this.presetPosition.y})`);
        }
        
        // Only set grid-related properties if not in preview mode
        if (!this.isPreview) {
            //console.log(`[BaseMachine] Setting grid properties: `+this.gridX+ ` `+this.gridY+ ` `+this.rotation);
            this.grid = config.grid;
            this.gridX = config.gridX !== undefined ? config.gridX : 0;
            this.gridY = config.gridY !== undefined ? config.gridY : 0;
            this.rotation = config.rotation !== undefined ? config.rotation : 0;
            
            // Set direction based on rotation
            this.direction = config.direction || this.getDirectionFromRotation(this.rotation);
        } else {
            // For preview instances, just set default direction
            this.direction = config.direction || 'right';
        }
        
        // Set up initial state for tracking
        this.isProcessing = false;
        this.processingProgress = 0;
        this.isSelected = false;
        
        // Initialize with base properties
        this.initBaseProperties();
        
        // Let child classes define their specific properties
        this.initMachineProperties();
        
        // Initialize inventories
        this.initInventories();
        
        // Only create visuals and add interactivity if not in preview mode
        // and we have a valid scene - AFTER properties are initialized
        if (!this.isPreview && this.scene) {
            // *** REMOVED Shape Rotation Logic from Constructor ***
            /*
            // Ensure shape is properly rotated based on the rotation value
            if (this.grid && this.shape) {
                // Log the shape before rotation
                
                // Apply the rotation to the shape if it wasn't already done in the child class
                if (this.rotation) {
                    // Convert rotation from radians to degrees for Grid.getRotatedShape
                    // Grid.getRotatedShape expects either a direction string or rotation in degrees, not radians
                    const rotationDegrees = (this.rotation * 180 / Math.PI) % 360;
                    
                    // Get the rotated shape using degrees
                    this.shape = this.grid.getRotatedShape(this.shape, rotationDegrees);
                    
                    // Ensure direction property is updated to match the rotation
                    // This ensures consistency between shape and direction
                    const directionFromRotation = this.getDirectionFromRotation(this.rotation);
                    if (this.direction !== directionFromRotation) {
                        this.direction = directionFromRotation;
                    }
                    
                }
            }
            */
            
            // Create visual representation
            this.createVisuals(); // createVisuals will now get the rotated shape itself
            
            // Add interactivity
            this.addInteractivity();
            
            // Initialize keyboard controls
            this.initKeyboardControls();
        }
    }
    
    /**
     * Initialize base machine properties
     * This gets called first during construction
     */
    initBaseProperties() {
        // Initialize machine properties with defaults
        this.id = 'base-machine';
        this.name = 'Base Machine';
        this.description = 'Base machine class';
        this.shape = [[1]]; // Default 1x1 shape
        this.inputTypes = [];
        this.outputTypes = [];
        this.processingTime = 1000; // Default 1 second
    }
    
    /**
     * Initialize machine-specific properties
     * Child classes should override this method to set their specific properties
     */
    initMachineProperties() {
        // This is intentionally empty in the base class
        // Child classes will override this method
    }
    
    /**
     * Initialize inventory objects based on input and output types
     */
    initInventories() {
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        // Add slots for each input type
        if (this.inputTypes && Array.isArray(this.inputTypes)) {
            this.inputTypes.forEach(type => {
                this.inputInventory[type] = 0;
            });
        }
        
        // Add slots for each output type
        if (this.outputTypes && Array.isArray(this.outputTypes)) {
            this.outputTypes.forEach(type => {
                this.outputInventory[type] = 0;
            });
        }
    }
    
    /**
     * Get the machine's ID
     * @returns {string} The machine ID
     */
    getId() {
        return this.id;
    }
    
    /**
     * Get the machine's display name
     * @returns {string} The display name
     */
    getDisplayName() {
        return this.name;
    }
    
    /**
     * Get the machine's description
     * @returns {string} The description
     */
    getDescription() {
        return this.description;
    }
    
    /**
     * Get the machine's shape
     * @returns {Array<Array<number>>} 2D array representing the machine's shape
     */
    getShape() {
        return this.shape;
    }
    
    /**
     * Get the machine's input types
     * @returns {Array<string>} Array of input resource types
     */
    getInputTypes() {
        return this.inputTypes;
    }
    
    /**
     * Get the machine's output types
     * @returns {Array<string>} Array of output resource types
     */
    getOutputTypes() {
        return this.outputTypes;
    }
    
    /**
     * Get the machine's processing time
     * @returns {number} Processing time in milliseconds
     */
    getProcessingTime() {
        return this.processingTime;
    }
    
    /**
     * Get the machine's default direction
     * @returns {string} Default direction ('right', 'down', 'left', 'up', or 'none')
     */
    getDefaultDirection() {
        return this.direction;
    }
    
    /**
     * Convert rotation to direction
     * @param {number} rotation - Rotation in radians
     * @returns {string} Direction ('right', 'down', 'left', 'up')
     */
    getDirectionFromRotation(rotation) {
        // Normalize rotation to 0-2π range
        const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Define epsilon for floating point comparison
        const epsilon = 0.01;
        
        // Check for exact values first (with epsilon tolerance)
        if (Math.abs(normalizedRotation) < epsilon || Math.abs(normalizedRotation - 2 * Math.PI) < epsilon) {
            return 'right';
        }
        
        if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
            return 'down';
        }
        
        if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
            return 'left';
        }
        
        if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < epsilon) {
            return 'up';
        }
        
        // Fallback to range-based checks
        if (normalizedRotation < Math.PI / 4 || normalizedRotation > 7 * Math.PI / 4) {
            return 'right';
        } else if (normalizedRotation < 3 * Math.PI / 4) {
            return 'down';
        } else if (normalizedRotation < 5 * Math.PI / 4) {
            return 'left';
        } else {
            return 'up';
        }
    }
    
    /**
     * Create the visual representation of the machine.
     * Handles container creation, shape drawing, progress bar, direction indicator, and interactivity.
     * Subclasses should call super.createVisuals() and then add machine-specific elements (labels, cores).
     */
    createVisuals() {
        if (this.isPreview) {
            console.warn(`[${this.id}] Skipping visuals for preview instance.`);
            return; // Don't create visuals for preview instances
        }
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot create visuals: grid reference is missing`);
            return;
        }

        // Get the current direction and rotated shape
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        let rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);

        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0 || !Array.isArray(rotatedShape[0])) {
            console.error(`[${this.id}] Failed to get valid rotated shape for direction ${currentDirection}. Using default [[1]].`);
            rotatedShape = [[1]];
        }
        const shapeWidth = rotatedShape[0].length;
        const shapeHeight = rotatedShape.length;

        // --- Enhanced Debugging for Rotation ---
        console.log(`[${this.id}] ----- ROTATION DEBUG START -----`);
        console.log(`Direction: ${currentDirection}`);
        console.log(`Original shape: ${JSON.stringify(this.shape)}`);
        console.log(`Rotated shape: ${JSON.stringify(rotatedShape)}`);
        console.log(`Original input: ${JSON.stringify(this.inputCoord)}`);
        console.log(`Original output: ${JSON.stringify(this.outputCoord)}`);
        console.log(`Shape dimensions after rotation: ${shapeWidth}x${shapeHeight}`);
        
        // --- Calculate Input/Output Coords --- 
        let rotatedInputPos = null;
        let rotatedOutputPos = null;
        
        // Use the single source of truth for I/O positions
        const ioPositions = this.constructor.getIOPositionsForDirection 
            ? this.constructor.getIOPositionsForDirection(this.id, currentDirection)
            : BaseMachine.getIOPositionsForDirection(this.id, currentDirection);
            
        rotatedInputPos = ioPositions.inputPos;
        rotatedOutputPos = ioPositions.outputPos;
        
        // Log the rotation result for debugging
        console.log(`Rotated input: ${JSON.stringify(rotatedInputPos)}`);
        console.log(`Rotated output: ${JSON.stringify(rotatedOutputPos)}`);
        console.log(`[${this.id}] ----- ROTATION DEBUG END -----`);

        // --- Container Setup --- 
        const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
        if (!topLeftPos) {
             console.error(`[${this.id}] Could not get top-left position for (${this.gridX}, ${this.gridY}). Aborting visuals.`);
             return;
            }
        this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);

        // --- Draw Shape Parts --- 
        this.inputSquare = null; // Reset references
        this.outputSquare = null;
        const cellSize = this.grid.cellSize;
        
        // Loop through each cell in the rotated shape
        for (let y = 0; y < shapeHeight; y++) {
            for (let x = 0; x < shapeWidth; x++) {
                if (rotatedShape[y][x] === 1) {
                    const partCenterX = x * cellSize + cellSize / 2;
                    const partCenterY = y * cellSize + cellSize / 2;
                    
                    // Determine if this is an input or output cell using rotated positions
                    let partColor = MACHINE_COLORS[this.id] || 0x44ff44; // Unique color per machine type
                    let isInput = false;
                    let isOutput = false;
                    let cellType = 'body';
                    // Check if this is the input cell using rotated coordinates
                    if (rotatedInputPos && x === rotatedInputPos.x && y === rotatedInputPos.y) {
                        if (rotatedShape[y][x] === 1) {
                            isInput = true;
                            partColor = 0x4aa8eb; // Blue for input
                            cellType = 'input';
                        } else {
                            console.warn(`[${this.id}] Input coordinates (${x},${y}) land on a 0 value in the shape! Keeping as normal cell.`);
                        }
                    }
                    else if (rotatedOutputPos && x === rotatedOutputPos.x && y === rotatedOutputPos.y) {
                        if (rotatedShape[y][x] === 1) {
                            isOutput = true;
                            partColor = 0xffa520; // Orange for output
                            cellType = 'output';
                        } else {
                            console.warn(`[${this.id}] Output coordinates (${x},${y}) land on a 0 value in the shape! Keeping as normal cell.`);
                        }
                    }
                    // Debug log for color and cell type
                    console.log(`[${this.id}] Drawing cell (${x},${y}) as ${cellType} with color: ${partColor.toString(16)}`);
                    
                    // Create the cell rectangle
                    const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333); 
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (isInput) {
                        this.inputSquare = part;
                        console.log(`[${this.id}] Set inputSquare at (${x},${y}) with color ${partColor.toString(16)}`);
                    }
                    if (isOutput) {
                        this.outputSquare = part;
                        console.log(`[${this.id}] Set outputSquare at (${x},${y}) with color ${partColor.toString(16)}`);
                    }
                }
            }
        }

        // --- Calculate Visual Center (relative to container 0,0) --- 
        const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
        const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
        
        // --- Progress Bar --- 
        // Position below the visual center
        this.progressBar = this.scene.add.rectangle(
            visualCenterX, 
            visualCenterY + cellSize * 0.6, 
            cellSize * shapeWidth * 0.8, // Adjust width based on shape width
            6, 
            0x000000 
        ).setOrigin(0.5);
        this.progressBar.setDepth(1); 
        this.container.add(this.progressBar);
        
        this.progressFill = this.scene.add.rectangle(
            this.progressBar.x - this.progressBar.width / 2,
            this.progressBar.y,
            0, 
            this.progressBar.height,
            0x00ff00 
        ).setOrigin(0, 0.5);
        this.progressFill.setDepth(2);
        this.container.add(this.progressFill);
        
        this.progressBar.setVisible(false);
        this.progressFill.setVisible(false);

        // --- Direction Indicator (Absolute Position) --- 
        if (this.direction !== 'none') {
            const absoluteCenterX = this.container.x + visualCenterX;
            const absoluteCenterY = this.container.y + visualCenterY;
            const indicatorColor = 0xff9500; 
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteCenterX, absoluteCenterY, -4, -6, -4, 6, 8, 0, indicatorColor
            ).setOrigin(0.5, 0.5);
            
            this.updateDirectionIndicatorVisuals(); // Use helper to set rotation
            this.directionIndicator.setDepth(this.container.depth + 10); // Ensure visibility
        }
        
        // --- Common additions --- 
        this.addPlacementAnimation();
        this.addInteractivity();
    }
    
    /**
     * Add resource type indicators to the machine
     */
    addResourceTypeIndicators() {
        // *** ADDED: Get rotated shape needed for calculations ***
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
             rotatedShape = [[1]]; // Fallback
        }

        // Calculate width and height based on shape
        // *** MODIFIED: Use rotatedShape ***
        const width = rotatedShape[0].length * this.grid.cellSize;
        const height = rotatedShape.length * this.grid.cellSize;
        
        // Since the container is now at the center, positions need to be relative to the center
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Add a more prominent input indicator
        if (this.inputTypes.length > 0) {
            // Determine input direction (opposite of output direction)
            let inputDirection = 'none';
            switch (this.direction) {
                case 'right': inputDirection = 'left'; break;
                case 'down': inputDirection = 'up'; break;
                case 'left': inputDirection = 'right'; break;
                case 'up': inputDirection = 'down'; break;
            }
            
            // Create input indicator at the appropriate edge
            if (inputDirection !== 'none') {
                // Position the indicator at the edge based on input direction, relative to center
                let indicatorX = 0; // Center by default
                let indicatorY = 0; // Center by default
                
                // Position the indicator at the edge based on input direction
                switch (inputDirection) {
                    case 'right': 
                        indicatorX = halfWidth - 8;
                        break;
                    case 'down': 
                        indicatorY = halfHeight - 8;
                        break;
                    case 'left': 
                        indicatorX = -halfWidth + 8;
                        break;
                    case 'up': 
                        indicatorY = -halfHeight + 8;
                        break;
                }
                
                // Create a blue triangle pointing inward
                // By default, the triangle points RIGHT (same as direction indicator)
                const inputTriangle = this.scene.add.triangle(
                    0, 
                    0, 
                    -4, -6,  // left top
                    -4, 6,   // left bottom
                    8, 0,    // right point
                    0x3498db  // Blue color
                ).setOrigin(0.5, 0.5);
                
                // Add a small circle at the base for better visibility
                const inputCircle = this.scene.add.circle(
                    0,
                    0,
                    4,
                    0x3498db  // Blue color
                ).setOrigin(0.5, 0.5);
                
                // Create a container for both shapes
                const inputContainer = this.scene.add.container(indicatorX, indicatorY, [inputCircle, inputTriangle]);
                
                // Rotate based on input direction - using the same rotation values as direction indicators
                switch (inputDirection) {
                    case 'right': inputContainer.rotation = 0; break;
                    case 'down': inputContainer.rotation = Math.PI / 2; break;
                    case 'left': inputContainer.rotation = Math.PI; break;
                    case 'up': inputContainer.rotation = 3 * Math.PI / 2; break;
                }
                
                inputContainer.isResourceIndicator = true;
                this.container.add(inputContainer);
            }
        }
        
        // The output indicator is already handled by the direction indicator
    }
    
    /**
     * Add placement animation to the machine
     */
    addPlacementAnimation() {
        // Start with a scale of 0 and grow to normal size
        this.container.setScale(0);
        
        // Add a grow animation
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Add a flash effect
        const flash = this.scene.add.rectangle(
            0, 0, 
            this.grid.cellSize * 3, 
            this.grid.cellSize * 3, 
            0xffffff, 0.8
        );
        this.container.add(flash);
        
        // Animate the flash
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    /**
     * Add interactive features to the machine
     */
    addInteractivity() {
        // Skip interactivity if explicitly requested (for preview/config purposes)
        if (this.config && this.config.skipInteractivity) {
            return;
        }
        
        // Skip if grid is not available
        if (!this.grid) {
            console.warn(`Cannot add interactivity to machine ${this.id || 'unknown'} - grid is undefined`);
            return;
        }

        // *** ADDED: Get rotated shape needed for calculations ***
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
             rotatedShape = [[1]]; // Fallback
        }

        // Calculate the width and height of the machine in pixels
        // *** MODIFIED: Use rotatedShape ***
        const width = rotatedShape[0].length * this.grid.cellSize;
        const height = rotatedShape.length * this.grid.cellSize;
        
        // Create a proper hit area for the container - centered around (0,0)
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        this.container.setInteractive(new Phaser.Geom.Rectangle(
            -halfWidth, -halfHeight, width, height
        ), Phaser.Geom.Rectangle.Contains);
        
        // Add hover effect
        this.container.on('pointerover', () => {
            // Highlight the machine
            this.container.list.forEach(part => {
                if (part.type === 'Rectangle' && part !== this.progressBar && !part.isResourceIndicator) {
                    // Don't change color of input/output squares
                    if (part === this.inputSquare || part === this.outputSquare) {
                        // Just make them slightly brighter
                        if (part === this.inputSquare) {
                            part.fillColor = 0x55c4ff; // Even brighter blue for input hover
                        } else {
                            part.fillColor = 0xffb640; // Brighter orange for hover
                        }
                    } else {
                        part.fillColor = 0x55ff55; // Brighter green for hover
                    }
                }
            });
            
            // Show machine info tooltip
            this.showTooltip();
        });
        
        this.container.on('pointerout', () => {
            // Remove highlight - restore to the same colors used in createVisuals (green scheme)
            this.container.list.forEach(part => {
                if (part.type === 'Rectangle' && part !== this.progressBar && !part.isResourceIndicator) {
                    // Restore original colors (matching the green scheme from createVisuals)
                    if (part === this.inputSquare) {
                        part.fillColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                    } else if (part === this.outputSquare) {
                        part.fillColor = 0xffa520; // Brighter orange (same as when dragging)
                    } else {
                        part.fillColor = MACHINE_COLORS[this.id] || 0x44ff44; // Restore unique color
                    }
                }
            });
            
            // Hide tooltip
            this.hideTooltip();
        });
        
        // Add click handler
        this.container.on('pointerdown', () => {
            // Show detailed info or controls
            this.showDetailedInfo();
        });
    }
    
    /**
     * Create resource visualizations for the machine
     */
    createResourceVisualizations() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
    }
    
    /**
     * Show tooltip with basic machine info
     */
    showTooltip() {
        // Remove existing tooltip if any
        this.hideTooltip();
        
        // --- MODIFIED: Calculate fixed position on the right side --- 
        const fixedX = this.scene.cameras.main.width - 260; // 10px padding from right edge (250 width + 10)
        const fixedY = 50; // 50px from the top
        const tooltipWidth = 250;
        const tooltipHeight = 80; // Initial height, might adjust later
        // --- END MODIFICATION ---
        
        // --- MODIFIED: Use fixed position for background, align top-left --- 
        const tooltipBg = this.scene.add.rectangle(
            fixedX, 
            fixedY, 
            tooltipWidth, 
            tooltipHeight, 
            0x000000, 
            0.8
        ).setOrigin(0, 0); // Align top-left
        tooltipBg.setStrokeStyle(1, 0xffffff);
        
        // Create tooltip text with inventory info
        let tooltipContent = `${this.name} (${this.direction})`;
        
        // Add processing status
        if (this.isProcessing) {
            const progressPercent = Math.floor((this.processingProgress / this.processingTime) * 100);
            tooltipContent += `\nProcessing: ${progressPercent}%`;
        } else if (this.canProcess()) {
            tooltipContent += '\nReady to process';
        } else {
            tooltipContent += '\nWaiting for resources';
        }
        
        // Check if the machine is a ConveyorMachine
        if (this instanceof ConveyorMachine) {
            tooltipContent += '\nItems on belt: ';
            if (this.itemsOnBelt && this.itemsOnBelt.length > 0) {
                const itemCounts = {};
                this.itemsOnBelt.forEach(itemObject => {
                    const itemType = itemObject.itemData.type;
                    itemCounts[itemType] = (itemCounts[itemType] || 0) + (itemObject.itemData.amount || 1);
                });
                if (Object.keys(itemCounts).length > 0) {
                    tooltipContent += Object.entries(itemCounts)
                        .map(([type, count]) => `${type}(${count})`)
                        .join(', ');
                } else {
                    tooltipContent += 'Empty';
                }
            } else {
                tooltipContent += 'Empty';
            }
        } else {
            // Existing inventory info for other machines
            if (this.inputTypes && this.inputTypes.length > 0) {
                tooltipContent += '\nInputs: ';
                this.inputTypes.forEach(type => {
                    const count = this.inputInventory[type] || 0;
                    tooltipContent += `${type}(${count}) `;
                });
            }
            
            if (this.outputTypes && this.outputTypes.length > 0) {
                tooltipContent += '\nOutputs: ';
                this.outputTypes.forEach(type => {
                    const count = this.outputInventory[type] || 0;
                    tooltipContent += `${type}(${count}) `;
                });
            }
        }
        
        // --- MODIFIED: Use fixed position and top-left origin for text --- 
        const tooltipText = this.scene.add.text(
            fixedX + 10, // Add padding from background edge
            fixedY + 10, // Add padding from background edge
            tooltipContent, 
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff',
                align: 'left', // Align text left
                wordWrap: { width: tooltipWidth - 20 } // Wrap text within padding
            }
        ).setOrigin(0, 0); // Align top-left
        
        // --- Optional: Adjust background height based on text height --- 
        tooltipBg.height = Math.max(tooltipHeight, tooltipText.height + 20); // Add padding

        // Store tooltip objects for later removal
        this.tooltip = {
            background: tooltipBg,
            text: tooltipText
        };
        
        // Set tooltip depth to ensure it appears above other objects
        tooltipBg.setDepth(1000);
        tooltipText.setDepth(1001);
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            if (this.tooltip.background) this.tooltip.background.destroy();
            if (this.tooltip.text) this.tooltip.text.destroy();
            this.tooltip = null;
        }
    }
    
    /**
     * Show detailed machine information
     */
    showDetailedInfo() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
    }
    
    /**
     * Hide detailed info panel
     */
    hideDetailedInfo() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
    }
    
    /**
     * Update method called by the scene
     * @param {number} time - The current time
     * @param {number} delta - The time since the last update
     */
    update(time, delta) {
        // --- Standard Processing Logic --- 
        if (this.isProcessing) {
            // Apply speed modifier if upgrade manager exists
            let effectiveDelta = delta;
            if (this.scene.upgradeManager && typeof this.scene.upgradeManager.getProcessorSpeedModifier === 'function') {
                 effectiveDelta = delta * this.scene.upgradeManager.getProcessorSpeedModifier();
            }

            this.processingProgress += effectiveDelta; // Use potentially modified delta

            // Update progress bar visual if it exists
            if (this.progressFill && this.progressBar) {
                 const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
                 this.progressFill.width = this.progressBar.width * progressRatio;
            } else {
                // If bar doesn't exist, log warning periodically? (Might be spammy)
                // if (this.scene.time.now % 5000 < 20) console.warn(`[${this.id}] isProcessing=true but no progress bar visuals.`);
            }
            
            // Check if processing is complete
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing(); // Handles outputting resources, resetting state
            }
        } else {
            // If not processing, check if we can start
            if (this.canProcess()) {
                this.startProcessing(); // Handles consuming resources, setting state
            }
            
            // NEW: Continuously try to push output when not processing
            // This ensures outputs move to belts/machines even when idle
            if (this.hasOutput()) {
                this.pushOutput();
            }
        }
        // --- End Standard Processing Logic ---

        try {
            // New: Attempt to pull from an adjacent input node
            if (!this.isProcessing) { // Only pull if not currently busy and can accept more
                this.tryPullFromInputNode();
            }

            // Call animation update if defined
            if (this.animateUpdate && typeof this.animateUpdate === 'function') {
                try {
                    this.animateUpdate(time, delta);
                } catch (animationError) {
                    console.error(`[${this.id || 'UnknownMachine'}] Animation error:`, animationError);
                    // Disable animation to prevent continuous errors
                    this.animateUpdate = null;
                }
            }
            
            // Update items on the machine
            if (this.items && this.items.length > 0) {
                try {
                    this.updateItems(delta);
                } catch (itemsError) {
                    console.error(`[${this.id || 'UnknownMachine'}] Items update error:`, itemsError);
                }
            }
            
            // Update indicators
            if (this.directionIndicator) {
                try {
                    // Check if the method exists either on this object or in the scene
                    if (typeof this.updateDirectionIndicator === 'function') {
                        this.updateDirectionIndicator();
                    } else if (this.scene && typeof this.scene.updateDirectionIndicator === 'function') {
                        this.scene.updateDirectionIndicator(this, this.direction);
                    }
                } catch (indicatorError) {
                    console.error(`[${this.id || 'UnknownMachine'}] Direction indicator update error:`, indicatorError);
                }
            }
        } catch (error) {
            console.error(`[${this.id || 'UnknownMachine'}] Unhandled error in update method:`, error);
        }
    }
    
    /**
     * NEW METHOD: Attempts to pull a resource from an adjacent ResourceNode
     * into the machine's input inventory.
     * Allows pulling from multiple adjacent nodes in the same tick if possible.
     */
    tryPullFromInputNode() {
        if (!this.grid || this.isProcessing || !this.getOccupiedCells) {
             if (this.scene.time.now % 3000 < 20) { console.log(`[${this.id}] tryPullFromInputNode: Skipping (no grid OR processing OR no getOccupiedCells)`); }
            return;
        }

        const occupiedCells = this.getOccupiedCells();
        if (!occupiedCells || occupiedCells.length === 0) {
            if (this.scene.time.now % 3000 < 20) { console.log(`[${this.id}] tryPullFromInputNode: Skipping (no occupied cells)`); }
            return;
        }

        // Periodic log for occupied cells to reduce spam if needed
        // if (this.scene.time.now % 5000 < 20) { 
        //     console.log(`[${this.id}] tryPullFromInputNode: Occupied cells:`, JSON.stringify(occupiedCells));
        // }

        for (const partCell of occupiedCells) { // For each cell the machine itself occupies
            const neighbors = [
                { dx: 0, dy: -1, side: 'up' },    // Up
                { dx: 0, dy: 1,  side: 'down' },  // Down
                { dx: -1, dy: 0, side: 'left' }, // Left
                { dx: 1, dy: 0,  side: 'right' }  // Right
            ];

            for (const offset of neighbors) {
                const potentialNodeX = partCell.x + offset.dx;
                const potentialNodeY = partCell.y + offset.dy;
                
                // Periodic log for checking neighbors to reduce spam
                // if (this.scene.time.now % 1000 < 20) {
                //      console.log(`[${this.id}] Checking neighbor of partCell (${partCell.x},${partCell.y}) at (${potentialNodeX}, ${potentialNodeY}) for node.`);
                // }

                // A. Check bounds
                if (potentialNodeX < 0 || potentialNodeX >= this.grid.width || potentialNodeY < 0 || potentialNodeY >= this.grid.height) {
                    continue;
                }

                // B. Check if it's part of the machine itself
                if (occupiedCells.some(oc => oc.x === potentialNodeX && oc.y === potentialNodeY)) {
                    continue;
                }

                const targetCell = this.grid.getCell(potentialNodeX, potentialNodeY);

                if (targetCell && targetCell.type === 'node' && targetCell.object && typeof targetCell.object.extractResource === 'function') {
                    const resourceNode = targetCell.object;

                    if (!resourceNode.resourceType || !resourceNode.resourceType.id) {
                        if (this.scene.time.now % 3000 < 20) { console.warn(`[${this.id}] ResourceNode at (${potentialNodeX},${potentialNodeY}) is missing resourceType.id`); }
                        continue; 
                    }
                    const resourceTypeFromNode = resourceNode.resourceType.id;

                    if (this.canAcceptInput(resourceTypeFromNode)) {
                        const extractedItem = resourceNode.extractResource();

                        if (extractedItem && extractedItem.type === resourceTypeFromNode && extractedItem.amount > 0) {
                            this.inputInventory[resourceTypeFromNode] = (this.inputInventory[resourceTypeFromNode] || 0) + extractedItem.amount;
                            console.log(`[${this.id}] at (${this.gridX},${this.gridY}) PULLED ${extractedItem.amount} ${resourceTypeFromNode} from ResourceNode at (${potentialNodeX},${potentialNodeY}) via partCell (${partCell.x},${partCell.y}). Input:`, JSON.stringify(this.inputInventory));
                            
                            this.scene.tweens.add({
                                targets: this.container,
                                scaleX: 1.02, scaleY: 1.02,
                                duration: 80, yoyo: true, ease: 'Sine.easeInOut'
                            });
                            // DO NOT return here, to allow pulling from other nodes if available
                        }
                    } 
                }
            }
        }
    }
    
    /**
     * Updates the items on this machine
     * @param {number} delta - The time since the last update
     */
    updateItems(delta) {
        if (!this.items || this.items.length === 0) {
            return;
        }
        
        // Calculate movement speed based on delta time (milliseconds)
        const moveSpeed = 0.05 * delta;
        
        // Process each item on the machine
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            if (!item) {
                console.warn(`[${this.id}] Null item found at index ${i}, removing`);
                this.items.splice(i, 1);
                continue;
            }
            
            try {
                // Update item position based on machine type and direction
                this.moveItemOnMachine(item, moveSpeed);
                
                // Check if item has reached the output position
                if (this.hasItemReachedOutput(item)) {
                    // Try to transfer to the next machine
                    const transferred = this.transferItemToNextMachine(item);
                    
                    if (transferred) {
                        // Item transferred successfully, remove from this machine
                        this.items.splice(i, 1);
                    }
                }
            } catch (itemError) {
                console.error(`[${this.id}] Error updating item:`, itemError);
                // Remove problematic item to prevent continuous errors
                this.items.splice(i, 1);
            }
        }
    }
    
    /**
     * Moves an item along the machine based on type and direction
     * @param {object} item - The item to move
     * @param {number} speed - Movement speed
     */
    moveItemOnMachine(item, speed) {
        // Default implementation - subclasses should override for specific behavior
        if (!item || !item.sprite) {
            return;
        }
        
        // For machines like conveyors, move along the direction
        switch (this.direction) {
            case 'right':
                item.sprite.x += speed;
                break;
            case 'down':
                item.sprite.y += speed;
                break;
            case 'left':
                item.sprite.x -= speed;
                break;
            case 'up':
                item.sprite.y -= speed;
                break;
        }
    }
    
    /**
     * Checks if an item has reached the output position
     * @param {object} item - The item to check
     * @returns {boolean} True if the item has reached the output position
     */
    hasItemReachedOutput(item) {
        if (!item || !item.sprite || !this.outputPosition) {
            return false;
        }
        
        // Check distance to output position
        const dx = item.sprite.x - this.outputPosition.x;
        const dy = item.sprite.y - this.outputPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Item has reached output if close enough to output position
        return distance < 5;
    }
    
    /**
     * Attempts to transfer an item to the connected machine
     * @param {object} item - The item to transfer
     * @returns {boolean} True if the transfer was successful
     */
    transferItemToNextMachine(item) {
        // This would require grid and factory logic to find the next machine
        // Default implementation - subclasses or factory should handle this
        return false;
    }
    
    /**
     * Check if the machine has enough input resources and output capacity to start processing.
     * Assumes requiredInputs and outputTypes are defined.
     * @returns {boolean} True if the machine can process, false otherwise.
     */
    canProcess() {
        if (this.isProcessing) {
             // console.log(`[${this.id}] canProcess: Already processing.`);
            return false; // Already processing
        }

        // Check if requiredInputs is defined
        if (!this.requiredInputs || Object.keys(this.requiredInputs).length === 0) {
            // console.log(`[${this.id}] canProcess: No required inputs defined.`);
            return false; // Cannot process if nothing is required (or definition missing)
        }

        // 1. Check if enough inputs are available
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            if ((this.inputInventory[resourceType] || 0) < amount) {
                // console.log(`[${this.id}] canProcess: Not enough ${resourceType}. Need ${amount}, Have ${(this.inputInventory[resourceType] || 0)}`);
                return false; // Not enough of this input resource
            }
        }

        // 2. Check if output inventory has space
        // Use a defined capacity or a default. Assumes single output type for simplicity for now.
        const outputCapacity = this.outputCapacity || 5; // Default capacity of 5 if not specified
        if (this.outputTypes && this.outputTypes.length > 0) {
            const outputType = this.outputTypes[0]; // Check capacity for the first output type
            if ((this.outputInventory[outputType] || 0) >= outputCapacity) {
                // console.log(`[${this.id}] canProcess: Output inventory full for ${outputType}. Capacity: ${outputCapacity}`);
                return false; // Output inventory for this type is full
            }
        } else {
             // console.log(`[${this.id}] canProcess: No output types defined.`);
             // If no output types, we technically can process, but it won't produce anything.
             // Let's allow it for now, maybe some machines just consume?
        }

        // console.log(`[${this.id}] canProcess: Checks passed. Ready to process.`);
        return true; // All checks passed
    }
    
    /**
     * Start processing resources
     * Consumes inputs based on requiredInputs and sets processing state.
     */
    startProcessing() {
        // Double-check if we can actually process (safety check)
        if (!this.canProcess()) {
            console.warn(`[${this.id}] startProcessing called but canProcess() is false.`);
            return;
        }

        // Consume required inputs
        if (this.requiredInputs) {
            for (const type in this.requiredInputs) {
                if (this.inputInventory[type] !== undefined) {
                    this.inputInventory[type] -= this.requiredInputs[type];
                } else {
                    console.error(`[${this.id}] Input inventory missing required type: ${type}`);
                    // Should not happen if canProcess passed, but good to check
                }
            }
        }
        
        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Show progress bar if it exists
        if (this.progressBar && this.progressFill) { 
             this.progressBar.setVisible(true);
             this.progressFill.setVisible(true);
             this.progressFill.width = 0; // Reset fill width
        }
        
        // Play processing sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('processing'); // Assuming a generic sound
        }
        
        console.log(`[${this.id}] Started processing. Inputs remaining:`, JSON.stringify(this.inputInventory));
    }
    
    /**
     * Complete processing resources
     * Adds outputs based on outputTypes, resets state, and calls pushOutput.
     */
    completeProcessing() {
        // Add output resources
        if (this.outputTypes) {
            this.outputTypes.forEach(type => {
                if (this.outputInventory[type] !== undefined) {
                    this.outputInventory[type]++;
                } else {
                    // Initialize if missing (shouldn't happen if initInventories ran)
                    console.warn(`[${this.id}] Output inventory was missing key: ${type}. Initializing to 1.`);
                    this.outputInventory[type] = 1;
                }
            });
        }
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Hide progress bar if it exists
        if (this.progressBar && this.progressFill) { 
            this.progressBar.setVisible(false);
            this.progressFill.setVisible(false);
        }
        
        // Play completion sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('complete'); // Assuming a generic sound
        }
        
        console.log(`[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`);
        
        // Immediately try to push the new output
        this.pushOutput();
    }

    /**
     * Checks if the machine has any resources in its output inventory.
     * @returns {boolean} True if there are output resources, false otherwise.
     */
    hasOutput() {
        if (!this.outputTypes || this.outputTypes.length === 0) {
            return false; // No defined output types means no output possible
        }

        for (const type of this.outputTypes) {
            if (this.outputInventory[type] && this.outputInventory[type] > 0) {
                return true; // Found at least one output resource
            }
        }

        return false; // No output resources found
    }
    
    /**
     * Attempts to push output resources to a connected machine or node.
     * This is typically called periodically or after processing completes.
     * It simply calls the transferResources method.
     */
    pushOutput() {
        this.transferResources();
    }
    
    /**
     * Transfer resources from this machine's output inventory to connected machines.
     * This is the base implementation, specific machines might override it.
     */
    transferResources() {
        // Find the target machine/node using the (potentially overridden) findTargetForOutput method
        // Note: findTargetForOutput might be defined in the base class or overridden in a subclass
        const findTargetMethod = this.findTargetForOutput || this.findConnectedMachine; // Fallback to old method name if needed
        if (!findTargetMethod || typeof findTargetMethod !== 'function') {
            console.warn(`[${this.name}] No findTargetForOutput or findConnectedMachine method found.`);
            return;
        }

        const targetInfo = findTargetMethod.call(this);
        // MODIFIED LOG to avoid cyclic error:
        if (targetInfo) {
            console.log(`[${this.id}] transferResources: findTargetMethod result - Type: ${targetInfo.type}, Target ID: ${targetInfo.target ? targetInfo.target.id : 'N/A'}, OutputFaceX: ${targetInfo.outputFaceX}, OutputFaceY: ${targetInfo.outputFaceY}`);
        } else {
            console.log(`[${this.id}] transferResources: findTargetMethod result: null or undefined`);
        }

        if (!targetInfo) {
            // findTargetForOutput should log if no target is found
            return; 
        }

        // Determine which resource type to try transferring (usually the first/only output type)
        // TODO: Handle machines with multiple output types more intelligently?
        if (!this.outputTypes || this.outputTypes.length === 0) {
            return; // No output types defined
        }
        const resourceTypeToTransfer = this.outputTypes[0];

        // Check if we actually have this resource in output
        if (!this.outputInventory[resourceTypeToTransfer] || this.outputInventory[resourceTypeToTransfer] <= 0) {
            return; // No resources of this type to transfer
        }

        let transferred = false;
        
        // Handle transfer to Delivery Node
        if (targetInfo.type === 'delivery-node') {
            const deliveryNode = targetInfo.target;
            // Check if deliveryNode exists and has the correct method
            if (deliveryNode && typeof deliveryNode.acceptItem === 'function') { 
                // Create the item object
                const itemToDeliver = {
                    type: resourceTypeToTransfer,
                    // Add texture if needed, assuming a mapping or default
                    texture: this.scene.registry.get('resourceTextures')?.[resourceTypeToTransfer] || 'default-resource' 
                };

                if (deliveryNode.acceptItem(itemToDeliver)) { // Renamed and passing item object
                    transferred = true;
                    // Pass the resource type for the effect, but target is the node object
                    this.createResourceTransferEffect(resourceTypeToTransfer, deliveryNode); 
                } else {
                    // console.warn(`[${this.name}] Delivery node rejected ${resourceTypeToTransfer}`);
                }
            } else {
                console.warn(`[${this.name}] Target Delivery Node is invalid or missing acceptItem method.`);
            }
        }
        // Handle transfer to another Machine
        else if (targetInfo.type === 'machine') {
            const targetMachine = targetInfo.target;
            console.log(`[${this.id}] transferResources: Target type is 'machine'. Target: ${targetMachine.id} at (${targetMachine.gridX}, ${targetMachine.gridY})`);
            
            // Check if the target machine is an Advanced Processor and we're transferring advanced-resource
            const isAdvancedProcessor = targetMachine.id === 'advanced-processor';
            const isAdvancedResource = resourceTypeToTransfer === 'advanced-resource';
            
            if (isAdvancedProcessor && isAdvancedResource) {
                console.log(`[${this.id}] transferResources: Attempting to send advanced-resource to Advanced Processor`);
            }
            
            // --- MODIFIED: Check for acceptItem method --- 
            if (targetMachine && typeof targetMachine.canAcceptInput === 'function' && typeof targetMachine.acceptItem === 'function') {
                console.log(`[${this.id}] transferResources: Target machine ${targetMachine.id} has canAcceptInput and acceptItem.`);
                
                // Check if target machine can accept the resource type and has space
                // Special handling for advanced processor to ensure it can accept advanced resources
                let canAccept = targetMachine.canAcceptInput(resourceTypeToTransfer);
                
                if (canAccept) {
                    console.log(`[${this.id}] transferResources: Target machine ${targetMachine.id} CAN accept ${resourceTypeToTransfer}.`);
                    
                    // *** ADDED: Directional check for conveyors ***
                    let allowTransfer = true;
                    if (targetMachine.id === 'conveyor') {
                        const targetDirection = targetMachine.direction;
                        const outputFaceX = targetInfo.outputFaceX; // Provided by the enhanced findTargetForOutput
                        const outputFaceY = targetInfo.outputFaceY; // Provided by the enhanced findTargetForOutput
                        const targetX = targetMachine.gridX;
                        const targetY = targetMachine.gridY;
                        
                        // Check if conveyor points back towards the cell this machine outputted from
                        if ((targetDirection === 'left'  && targetX === outputFaceX + 1 && targetY === outputFaceY) || // Target is right, points left
                            (targetDirection === 'right' && targetX === outputFaceX - 1 && targetY === outputFaceY) || // Target is left, points right
                            (targetDirection === 'up'    && targetY === outputFaceY + 1 && targetX === outputFaceX) || // Target is below, points up
                            (targetDirection === 'down'  && targetY === outputFaceY - 1 && targetX === outputFaceX)) { // Target is above, points down
                            
                            console.warn(`[${this.name}] Preventing transfer to Conveyor at (${targetX}, ${targetY}) because its direction (${targetDirection}) points back towards output face (${outputFaceX}, ${outputFaceY}).`);
                            allowTransfer = false;
                        }
                    }
                    // *** END Directional check ***

                    // Attempt transfer only if allowed (basic acceptance AND directional check passed)
                    if (allowTransfer) {
                        // Special handling for advanced processor if needed
                        if (isAdvancedProcessor && isAdvancedResource) {
                            // Give bonus or special effect when advanced resources go to advanced processor
                            if (this.scene && this.scene.addScore) {
                                // Award bonus points when feeding advanced resources to advanced processor
                                this.scene.addScore(10);
                            }
                        }

                        // --- MODIFIED: Call acceptItem with item object --- 
                        const itemToTransfer = { type: resourceTypeToTransfer, amount: 1 };
                        console.log(`[${this.id}] transferResources: Attempting to call acceptItem on ${targetMachine.id} with`, itemToTransfer);
                        if (targetMachine.acceptItem(itemToTransfer, this)) { // Pass this as sourceMachine for better tracing
                            transferred = true;
                            console.log(`[${this.id}] transferResources: Successfully transferred ${resourceTypeToTransfer} to ${targetMachine.id}`);
                            this.createResourceTransferEffect(resourceTypeToTransfer, targetMachine);
                        } else {
                            console.warn(`[${this.name}] Target machine ${targetMachine.name} acceptItem returned false for ${resourceTypeToTransfer}`);
                        }
                    }
                } else {
                   console.warn(`[${this.name}] Target machine ${targetMachine.name} cannot accept input type ${resourceTypeToTransfer}`);
                }
            } else {
                 // --- MODIFIED: Update warning message --- 
                 let reason = "is invalid";
                 if (targetMachine && typeof targetMachine.acceptItem !== 'function') reason = "is missing acceptItem method";
                 else if (targetMachine && typeof targetMachine.canAcceptInput !== 'function') reason = "is missing canAcceptInput method";
                 console.warn(`[${this.name}] Target machine ${targetMachine.id || '(no id)'} ${reason}.`);
            }
        }

        // If transfer was successful, decrement the output inventory
        if (transferred) {
            this.outputInventory[resourceTypeToTransfer]--;
        }
    }
    
    /**
     * Gets the grid coordinates of all cells occupied by this machine.
     * @returns {Array<{x: number, y: number}>} An array of coordinate objects.
     */
    getOccupiedCells() {
        const debugOccupied = false; // <-- Set to false to disable logs
        const cells = [];

        // *** ADDED: Get the correctly rotated shape (Consistent with createVisuals) ***
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot get occupied cells: grid reference missing.`);
            return cells;
        }
        // Use original shape if grid doesn't have rotation function (e.g., during early init)
        let rotatedShape = this.shape;
        if (typeof this.grid.getRotatedShape === 'function') {
            const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
            rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);
        } else {
            console.warn(`[${this.id}] Grid object missing getRotatedShape? Using original shape for occupied cells.`);
        }
        // *** VALIDATE the rotated shape ***
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
            console.error(`[${this.id}] Failed to get valid rotated shape for getOccupiedCells. Using default.`);
            rotatedShape = [[1]]; // Fallback to default shape
        }

        // *** Original null check using this.shape is now redundant, use rotatedShape ***
        // if (!this.shape || !this.grid) return cells; 
        
        if (typeof this.gridX !== 'number' || typeof this.gridY !== 'number') {
             console.error(`[${this.id}] Invalid gridX/gridY in getOccupiedCells: (${this.gridX}, ${this.gridY})`);
             return cells;
        }
        if (debugOccupied) {
            console.log(`  [getOccupiedCells for ${this.name} (${this.id})]`);
            console.log(`    > gridX=${this.gridX}, gridY=${this.gridY}`);
            // *** MODIFIED: Log original and rotated shape ***
            console.log(`    > Original shape= ${JSON.stringify(this.shape)}`);
            console.log(`    > Rotated shape Used= ${JSON.stringify(rotatedShape)}`);
        }
        
        // Use gridX/gridY as the top-left anchor for the shape
        const baseX = this.gridX;
        const baseY = this.gridY;

        // *** MODIFIED: Iterate over rotatedShape ***
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // *** MODIFIED: Check rotatedShape ***
                if (rotatedShape[y][x] === 1) { // Check if this part of the shape exists
                    // Calculate absolute grid position relative to the top-left anchor
                    const cellX = baseX + x;
                    const cellY = baseY + y;
                    
                    // *** ADDED BOUNDS CHECK ***
                    // Ensure the calculated cell is within the grid boundaries
                    if (this.grid && cellX >= 0 && cellX < this.grid.width && cellY >= 0 && cellY < this.grid.height) {
                        cells.push({ x: cellX, y: cellY });
                    } else if (debugOccupied) {
                         console.warn(`  [getOccupiedCells for ${this.name}] Calculated cell (${cellX}, ${cellY}) is out of bounds (${this.grid.width}x${this.grid.height}). Skipping.`);
                    }
                    // *** END BOUNDS CHECK ***
                }
            }
        }
        if (debugOccupied) {
             console.log(`    > Calculated Cells: ${JSON.stringify(cells)}`);
        }
        return cells;
    }
    
    /**
     * Find the adjacent machine or node in the machine's output direction.
     * Checks all cells along the output face of the machine.
     * @returns {object|null} An object { type: 'machine'/'delivery-node', target: object, outputFaceX: number, outputFaceY: number } or null if no valid target found.
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

        // Get the output position from the standard method based on the machine's direction
        let outputPos = null;
        try {
            // Use static method to get the output position based on machine ID and direction
            const machineId = this.id;
            const ioPositions = this.constructor.getIOPositionsForDirection(machineId, this.direction);
            if (ioPositions && ioPositions.outputPos) {
                outputPos = ioPositions.outputPos;
            }
        } catch (error) {
            console.warn(`[${this.id}] Error getting output position: ${error.message}`);
        }

        // If we found a specific output position, prioritize checking cells adjacent to it
        if (outputPos) {
            // Find cells that match the output position in our rotated shape
            let outputCells = [];
            
            // Get the rotated shape to correctly identify the output cell
            let rotatedShape = this.shape;
            if (typeof this.grid.getRotatedShape === 'function') {
                rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
            }
            
            // Find the cell(s) that match our output position in the rotated shape
            for (let y = 0; y < rotatedShape.length; y++) {
                for (let x = 0; x < rotatedShape[y].length; x++) {
                    if (rotatedShape[y][x] === 1 && x === outputPos.x && y === outputPos.y) {
                        // Found an output cell - convert to grid coordinates
                        outputCells.push({
                            x: this.gridX + x,
                            y: this.gridY + y
                        });
                    }
                }
            }
            
            // If we found output cells, check adjacent cells in all directions
            if (outputCells.length > 0) {
                const directions = [
                    {dx: 1, dy: 0},  // right
                    {dx: 0, dy: 1},  // down
                    {dx: -1, dy: 0}, // left
                    {dx: 0, dy: -1}  // up
                ];
                
                // First, try to find a target in the machine's facing direction
                const facingTarget = this.checkForTargetInDirection(
                    outputCells,
                    occupiedCells,
                    this.getDirectionOffset(this.direction)
                );
                if (facingTarget) return facingTarget;
                
                // If no target in the facing direction, check all other directions
                for (const dir of directions) {
                    // Skip if this is the facing direction we already checked
                    if (this.isDirectionOffset(dir, this.direction)) continue;
                    
                    const target = this.checkForTargetInDirection(outputCells, occupiedCells, dir);
                    if (target) return target;
                }
            }
        }
        
        // Fall back to checking all occupied cells in all directions if no output position or no target found
        const directions = [
            {dx: 1, dy: 0},  // right
            {dx: 0, dy: 1},  // down
            {dx: -1, dy: 0}, // left
            {dx: 0, dy: -1}  // up
        ];
        
        // Try each direction
        for (const dir of directions) {
            for (const cell of occupiedCells) {
                const outputFaceAbsX = cell.x;
                const outputFaceAbsY = cell.y;
                
                const targetX = outputFaceAbsX + dir.dx;
                const targetY = outputFaceAbsY + dir.dy;
                
                // Skip if out of bounds
                if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                    continue;
                }
                
                // Skip if target is part of this machine
                const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
                if (isSelf) {
                    continue;
                }
                
                // Check the target cell
                const targetCell = this.grid.getCell(targetX, targetY);
                if (!targetCell) {
                    continue;
                }
                
                // Check for delivery node
                if (targetCell.type === 'delivery-node' && targetCell.object) {
                    return { 
                        type: 'delivery-node', 
                        target: targetCell.object, 
                        outputFaceX: outputFaceAbsX, 
                        outputFaceY: outputFaceAbsY 
                    };
                }
                
                // Check for machine
                if (targetCell.object && (targetCell.type === 'machine' || targetCell.object instanceof BaseMachine)) {
                    return { 
                        type: 'machine', 
                        target: targetCell.object, 
                        outputFaceX: outputFaceAbsX, 
                        outputFaceY: outputFaceAbsY 
                    };
                }
            }
        }
        
        // No valid target found
        return null;
    }
    
    /**
     * Helper method to check for a target in a specific direction
     * @param {Array<{x: number, y: number}>} outputCells - Array of cells considered output cells
     * @param {Array<{x: number, y: number}>} occupiedCells - All cells occupied by this machine
     * @param {Object} direction - Direction to check {dx, dy}
     * @returns {Object|null} Target info object or null if no target found
     * @private
     */
    checkForTargetInDirection(outputCells, occupiedCells, direction) {
        for (const cell of outputCells) {
            const outputFaceAbsX = cell.x;
            const outputFaceAbsY = cell.y;
            
            const targetX = outputFaceAbsX + direction.dx;
            const targetY = outputFaceAbsY + direction.dy;
            
            // Skip if out of bounds
            if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                continue;
            }
            
            // Skip if target is part of this machine
            const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
            if (isSelf) {
                continue;
            }
            
            // Check the target cell
            const targetCell = this.grid.getCell(targetX, targetY);
            if (!targetCell) {
                continue;
            }
            
            // Check for delivery node
            if (targetCell.type === 'delivery-node' && targetCell.object) {
                return { 
                    type: 'delivery-node', 
                    target: targetCell.object, 
                    outputFaceX: outputFaceAbsX, 
                    outputFaceY: outputFaceAbsY 
                };
            }
            
            // Check for machine
            if (targetCell.object && (targetCell.type === 'machine' || targetCell.object instanceof BaseMachine)) {
                return { 
                    type: 'machine', 
                    target: targetCell.object, 
                    outputFaceX: outputFaceAbsX, 
                    outputFaceY: outputFaceAbsY 
                };
            }
        }
        
        return null;
    }
    
    /**
     * Helper method to convert a direction name to offset values
     * @param {string} direction - Direction name ('right', 'down', 'left', 'up')
     * @returns {Object} Direction offset {dx, dy}
     * @private
     */
    getDirectionOffset(direction) {
        switch (direction) {
            case 'right': return {dx: 1, dy: 0};
            case 'down': return {dx: 0, dy: 1};
            case 'left': return {dx: -1, dy: 0};
            case 'up': return {dx: 0, dy: -1};
            default: 
                console.warn(`[${this.id}] Invalid direction: ${direction} in getDirectionOffset`);
                return {dx: 0, dy: 0};
        }
    }
    
    /**
     * Helper method to check if a direction offset matches a direction name
     * @param {Object} offset - Direction offset {dx, dy}
     * @param {string} direction - Direction name ('right', 'down', 'left', 'up')
     * @returns {boolean} True if the offset matches the direction
     * @private
     */
    isDirectionOffset(offset, direction) {
        const dirOffset = this.getDirectionOffset(direction);
        return offset.dx === dirOffset.dx && offset.dy === dirOffset.dy;
    }
    
    /**
     * Find connected machine in the output direction
     * @returns {Machine|null} The connected machine or null if none
     */
    findConnectedMachine() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
        return null;
    }
    
    /**
     * Create a visual effect for resource transfer
     * @param {string} resourceType - The type of resource being transferred
     * @param {Machine} targetMachine - The machine receiving the resource
     */
    createResourceTransferEffect(resourceType, targetMachine) {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
    }
    
    /**
     * Destroy the machine and clean up resources
     */
    destroy() {
        // Destroy the main container and its children
        if (this.container) {
            this.container.destroy();
            this.container = null; // Nullify reference
        }

        // Destroy the direction indicator (added directly to scene)
        if (this.directionIndicator) {
            this.directionIndicator.destroy();
            this.directionIndicator = null; // Nullify reference
        }
        
        // Destroy tooltip if it exists
        if (this.tooltip) {
            this.hideTooltip(); // Should handle destroying tooltip objects
        }
        
        // Destroy info panel if it exists
        if (this.infoPanel) {
            this.hideDetailedInfo(); // Should handle destroying info panel objects
        }

        // Remove ESC key listener to prevent memory leaks
        if (this.escKey) {
            this.escKey.off('down', this.handleEscKey, this);
            this.escKey = null;
        }
    }
    
    /**
     * Get a preview sprite for the machine selection panel
     * This static method provides a standard preview for processor machines
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {Object} options - Configuration options:
     *   - {Array<Array<number>>} shape - The shape array for the machine
     *   - {string} label - The label to display (default is first letter of ID)
     *   - {Object} inputPos - The position of the input in the shape {x, y}
     *   - {Object} outputPos - The position of the output in the shape {x, y}
     *   - {string} direction - The direction for the preview ('right', 'down', 'left', 'up')
     *   - {Object} directionMap - Optional map of coordinates for each direction
     * @returns {Phaser.GameObjects.Container} The preview sprite
     */
    static getStandardPreviewSprite(scene, x, y, options = {}) {
        const container = scene.add.container(x, y);
        const shape = options.shape || [[1]];
        const cellSize = 16; // Smaller size for preview
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;
        const direction = options.direction || 'right';
        const machineId = options.machineId || 'unknown-machine';
        
        // Get input/output positions using the single source of truth
        let inputPos, outputPos;
        
        // Try to get positions from provided options first
        if (options.inputPos && options.outputPos) {
            inputPos = options.inputPos;
            outputPos = options.outputPos;
        } 
        // Then try direction-specific mapping
        else if (options.directionMap && options.directionMap[direction]) {
            const dirPositions = options.directionMap[direction];
            inputPos = dirPositions.inputPos;
            outputPos = dirPositions.outputPos;
        }
        // Finally use the shared getIOPositionsForDirection method
        else {
            // Use either the class-specific method or the BaseMachine default
            const ioPositions = BaseMachine.getIOPositionsForDirection(machineId, direction);
            inputPos = ioPositions.inputPos;
            outputPos = ioPositions.outputPos;
        }
        
        // --- Enhanced Debug for Preview ---
       

        // Draw the machine shape
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const partX = (c - shapeCenterX) * cellSize;
                    const partY = (r - shapeCenterY) * cellSize;
                    
                    // Determine cell color
                    //let color = 0x44ff44; // Default green
                    let color = MACHINE_COLORS[machineId] || 0x44ff44; // Unique color for this machine type
                    // Check for input/output cells directly (no rotation math)
                    if (c === inputPos.x && r === inputPos.y) {
                        // Verify this is a valid cell in the shape
                        if (shape[r][c] === 1) {
                            color = 0x4aa8eb; // Blue input
                            console.log(`[Preview] Colored cell (${c},${r}) BLUE for input`);
                        } else {
                            console.warn(`[Preview] WARNING: Input coord (${c},${r}) lands on a 0 in the shape! Keeping green.`);
                        }
                    } else if (c === outputPos.x && r === outputPos.y) {
                        // Verify this is a valid cell in the shape
                        if (shape[r][c] === 1) {
                            color = 0xffa520; // Orange output
                            console.log(`[Preview] Colored cell (${c},${r}) ORANGE for output`);
                        } else {
                            console.warn(`[Preview] WARNING: Output coord (${c},${r}) lands on a 0 in the shape! Keeping green.`);
                        }
                    }
                    
                    const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        
        // Add machine label
        const label = scene.add.text(0, 0, options.label || "?", { 
            fontSize: 12, color: '#ffffff' 
        }).setOrigin(0.5);
        container.add(label);
        
        return container;
    }

    /**
     * Create processor-style visuals that can be reused across different processor machines
     * @param {string} labelText - The label text to display at the center (usually a single letter)
     * @param {Object} options - Additional options (optional)
     *   - {boolean} addCore - Whether to add a processor core visual (default: true)
     *   - {number} coreColor - Color for the processor core (default: 0x00ccff)
     *   - {string} coreShape - Shape of core: 'circle' or 'square' (default: 'circle')
     *   - {number} fontSize - Font size for the label (default: 14)
     */
    createProcessorVisuals(labelText, options = {}) {
        // Ensure base visuals are created first
        if (!this.container) {
            super.createVisuals();
            if (!this.container) {
                console.error(`[${this.id}] Base visuals failed to create container. Aborting processor visuals.`);
                return;
            }
        }
        
        // Default options
        const addCore = options.addCore !== undefined ? options.addCore : true;
        const coreColor = options.coreColor || 0x00ccff; // Default cyan
        const coreShape = options.coreShape || 'circle';
        const fontSize = options.fontSize || 14;
        
        // Get dimensions from the rotated shape
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection);
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0 || !Array.isArray(rotatedShape[0])) {
            console.error(`[${this.id}] Cannot get valid rotated shape. Aborting processor visuals.`);
            return;
        }
        
        const shapeWidth = rotatedShape[0].length;
        const shapeHeight = rotatedShape.length;
        const cellSize = this.grid.cellSize;
        const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
        const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
        
        // Add machine type label
        const machineLabel = this.scene.add.text(visualCenterX, visualCenterY, labelText, {
            fontFamily: 'Arial', fontSize: fontSize, color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processor core if requested
        if (addCore) {
            if (coreShape === 'circle') {
                this.processorCore = this.scene.add.circle(
                    visualCenterX, visualCenterY, cellSize / 4, coreColor
                );
            } else {
                this.processorCore = this.scene.add.rectangle(
                    visualCenterX, visualCenterY, cellSize / 2, cellSize / 2, coreColor
                );
            }
            
            this.processorCore.setStrokeStyle(1, 0xffffff);
            this.container.add(this.processorCore);
            this.processorCore.setDepth(machineLabel.depth - 1); // Core below label
        }
        
        return {
            centerX: visualCenterX,
            centerY: visualCenterY,
            machineLabel: machineLabel,
            processorCore: this.processorCore
        };
    }
    
    /**
     * Initialize keyboard controls for the machine
     */
    initKeyboardControls() {
        // Add ESC key handler to unselect the machine
        this.escKey = this.scene.input.keyboard.addKey('ESC');
        this.escKey.on('down', this.handleEscKey, this);
    }
    
    /**
     * Handle ESC key press to unselect the machine
     */
    handleEscKey() {
        // If this machine is selected, unselect it
        if (this.isSelected) {
            this.setSelected(false);
            
            // Clear any selection in the machine factory
            if (this.scene.machineFactory) {
                this.scene.machineFactory.clearSelection();
            }
            
        }
    }
    
    /**
     * Set the selected state of the machine
     * @param {boolean} selected - Whether the machine is selected
     */
    setSelected(selected) {
        this.isSelected = selected;
        
        // Update visual appearance based on selection state
        if (this.isSelected) {
            // Add selection highlight
            if (!this.selectionHighlight) {
                this.selectionHighlight = this.scene.add.rectangle(
                    0,
                    0,
                    this.grid.cellSize * this.shape[0].length,
                    this.grid.cellSize * this.shape.length,
                    0xffff00,
                    0.3
                );
                this.container.add(this.selectionHighlight);
                this.selectionHighlight.setDepth(-1);
            }
        } else {
            // Remove selection highlight
            if (this.selectionHighlight) {
                this.selectionHighlight.destroy();
                this.selectionHighlight = null;
            }
        }
    }
    
    /**
     * Adjust the container position based on the shape and direction
     * This is a base implementation that does nothing - child classes should override
     * to provide machine-specific adjustments
     */
    adjustContainerPosition() {
        // Skip adjustment if we have a preset position - this is crucial for accurate placement
        if (this.presetPosition) {
            console.log(`[adjustContainerPosition] SKIPPED for ${this.id || 'unknown'} - using preset position`);
            return;
        }
        
        // Base implementation does nothing
        // Child classes should override this method as needed
        console.log(`BaseMachine.adjustContainerPosition: Base implementation called for ${this.id || 'unknown'} machine`);
        
        // Get the shape for this machine
        const shape = this.shape || (this.machineType && this.machineType.shape);
        if (!shape) return;
        
        // Calculate the cell size
        const cellSize = this.grid ? this.grid.cellSize : 32;
        
        // Calculate center offsets based on shape dimensions
        const width = shape[0].length;
        const height = shape.length;
        
        console.log(`Adjusting container for ${width}x${height} shape with direction ${this.direction}`);
        
        // No adjustments in the base class
        // Specific machine classes should override this method as needed
    }
    
    /**
     * Updates the direction indicator sprite based on the current direction
     * Delegates to the scene's updateDirectionIndicator method
     */
    updateDirectionIndicator() {
        if (this.scene && typeof this.scene.updateDirectionIndicator === 'function') {
            this.scene.updateDirectionIndicator(this, this.direction);
        } else {
            // Fallback implementation if scene method is not available
            if (this.directionIndicator) {
                // Update rotation based on direction
                switch (this.direction) {
                    case 'right':
                        this.directionIndicator.rotation = 0; // 0 degrees
                        break;
                    case 'down':
                        this.directionIndicator.rotation = Math.PI / 2; // 90 degrees
                        break;
                    case 'left':
                        this.directionIndicator.rotation = Math.PI; // 180 degrees
                        break;
                    case 'up':
                        this.directionIndicator.rotation = 3 * Math.PI / 2; // 270 degrees
                        break;
                }
            }
        }
    }
    
    /**
     * Check if the machine can accept a specific resource type into its input.
     * @param {string} resourceTypeId - The ID of the resource type.
     * @returns {boolean} True if the resource can be accepted, false otherwise.
     */
    canAcceptInput(resourceTypeId) {
        // Check if this machine type accepts the resource
        if (!this.inputTypes.includes(resourceTypeId)) {
            return false;
        }
        
        // Initialize inventory if needed
        if (this.inputInventory[resourceTypeId] === undefined) {
            this.inputInventory[resourceTypeId] = 0;
        }
        
        // Check if input inventory has space (e.g., less than a capacity of 5)
        const inputCapacity = 5; 
        return this.inputInventory[resourceTypeId] < inputCapacity;
    }

    /**
     * Accept an item from another machine or source.
     * Replaces the old receiveResource method.
     * @param {object} itemData - The item object { type: string, amount: number } being received.
     * @param {BaseMachine} [sourceMachine=null] - The machine sending the resource (optional).
     * @returns {boolean} True if the item was accepted, false otherwise.
     */
    acceptItem(itemData, sourceMachine = null) {
        if (!itemData || !itemData.type) {
             console.warn(`[${this.name}] received invalid itemData at (${this.gridX}, ${this.gridY})`);
             return false;
        }
        
        const itemType = itemData.type;
        // NOTE: Currently ignoring itemData.amount for processors, assuming they take 1 unit.

        if (this.canAcceptInput(itemType)) {
            // Ensure inventory slot exists (though initInventories should handle this)
            if (this.inputInventory[itemType] === undefined) {
                this.inputInventory[itemType] = 0;
            }
            this.inputInventory[itemType]++;
            console.log(`[${this.name}] at (${this.gridX}, ${this.gridY}) accepted ${itemType}. Input:`, this.inputInventory);
            
            // Optional: Trigger a visual effect
            this.scene.tweens.add({
                targets: this.container, // Or a specific part like inputSquare
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
            return true;
        }
        console.warn(`[${this.name}] at (${this.gridX}, ${this.gridY}) rejected ${itemType}. Input full or type mismatch.`);
        return false;
    }



    /** Helper to calculate rotated relative position within the shape matrix */
    getRelativeRotatedPos(originalPos, direction, shapeWidth, shapeHeight) {
        if (!originalPos) return null;

        // Debug the incoming parameters
        console.log(`[${this.id || 'unknown'}] ROTATION DEBUG - Original(${originalPos.x},${originalPos.y}), Direction=${direction}, Shape=${shapeWidth}x${shapeHeight}`);
        
        // Shorthand for original coordinates
        const ox = originalPos.x;
        const oy = originalPos.y;
        
        // The original shape dimensions (before rotation)
        const originalWidth = this.shape ? this.shape[0].length : shapeWidth;
        const originalHeight = this.shape ? this.shape.length : shapeHeight;
        
        console.log(`[${this.id || 'unknown'}] ROTATION DEBUG - Using originalSize=${originalWidth}x${originalHeight}`);
        
        let result;
        
        // Apply rotation based on direction - ENSURE CONSISTENCY WITH createVisuals
        switch (direction) {
            case 'right': // 0° - no change
                result = { x: ox, y: oy };
                break;
                
            case 'down': // 90° clockwise
                // Formula for 90° CW rotation:
                result = { x: oy, y: originalWidth - 1 - ox };
                break;
                
            case 'left': // 180° clockwise
                // Formula for 180° rotation:
                result = { x: originalWidth - 1 - ox, y: originalHeight - 1 - oy };
                break;
                
            case 'up': // 270° clockwise
                // Formula for 270° CW rotation:
                result = { x: originalHeight - 1 - oy, y: ox };
                break;
                
            default:
                console.warn(`[${this.id || 'unknown'}] Unknown direction: ${direction}, returning original position`);
                result = { x: ox, y: oy };
        }
        
        console.log(`[${this.id || 'unknown'}] ROTATION RESULT - Original(${ox},${oy}) -> Rotated(${result.x},${result.y}) for direction ${direction}`);
        return result;
    }

    /** Helper to set direction indicator rotation based on this.direction */
    updateDirectionIndicatorVisuals() {
        if (!this.directionIndicator) return;
        switch (this.direction) {
            case 'right': this.directionIndicator.rotation = 0; break;
            case 'down': this.directionIndicator.rotation = Math.PI / 2; break;
            case 'left': this.directionIndicator.rotation = Math.PI; break;
            case 'up': this.directionIndicator.rotation = 3 * Math.PI / 2; break;
        }
    }

    /**
     * Get a preview sprite for the machine selection panel
     * This method should be overridden by subclasses to provide custom previews
     * or it will use a default implementation.
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - The x coordinate 
     * @param {number} y - The y coordinate
     * @returns {Phaser.GameObjects.Container} A container with the preview sprite
     */
    getPreviewSprite(scene, x, y) {
        // Create a simplified version of the machine for the selection panel
        const container = scene.add.container(x, y);
        
        // Create a simple rectangle as a placeholder
        const rect = scene.add.rectangle(0, 0, 24, 24, 0x44ff44); // Default green color
        container.add(rect);
        
        // Add a label
        const label = scene.add.text(0, 0, this.id.charAt(0).toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        return container;
    }

    /**
     * Get standard machine configuration
     * This static method provides standard configuration that can be used by processor machines
     * @param {Object} options - Configuration options
     * @returns {Object} The machine configuration
     */
    static getStandardConfig(options = {}) {
        const id = options.id || 'unknown-machine';
        const defaultName = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        return {
            id: id,
            name: options.name || defaultName,
            description: options.description || 'Standard processor machine',
            shape: options.shape || [[1, 1], [1, 1]], // Default to 2x2
            inputTypes: options.inputTypes || ['basic-resource'],
            outputTypes: options.outputTypes || ['advanced-resource'],
            processingTime: options.processingTime || 3000,
            direction: options.direction || 'right',
            defaultDirection: options.defaultDirection || 'right',
            requiredInputs: options.requiredInputs || { 'basic-resource': 1 }
        };
    }

    /**
     * Get input and output positions for a given direction
     * This is the single source of truth for I/O positions for all machines
     * @param {string} machineId - The machine ID
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // Default implementation for simple machines
        // Specific machine classes should override this with their own static method
        
        // Default positions for a generic 1x1 machine
        let inputPos = { x: 0, y: 0 };
        let outputPos = { x: 0, y: 0 };
        
        // For a generic machine, place input on one side and output on the opposite
        switch(direction) {
            case 'right':
                inputPos = { x: 0, y: 0 };  // Left
                outputPos = { x: 0, y: 0 }; // Right (same coordinate, direction determines flow)
                break;
            case 'down':
                inputPos = { x: 0, y: 0 };  // Top
                outputPos = { x: 0, y: 0 }; // Bottom (same coordinate, direction determines flow)
                break;
            case 'left':
                inputPos = { x: 0, y: 0 };  // Right
                outputPos = { x: 0, y: 0 }; // Left (same coordinate, direction determines flow)
                break;
            case 'up':
                inputPos = { x: 0, y: 0 };  // Bottom
                outputPos = { x: 0, y: 0 }; // Top (same coordinate, direction determines flow)
                break;
        }
        
        // Log a warning if this base implementation is used for a specific machine
        if (machineId !== 'base-machine' && machineId !== 'unknown-machine' && machineId !== 'conveyor') {
            console.warn(`Using default I/O positions for ${machineId}. Should implement getIOPositionsForDirection in ${machineId} class.`);
        }
        
        return { inputPos, outputPos };
    }
} 