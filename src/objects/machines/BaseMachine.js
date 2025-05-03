import Phaser from 'phaser';
import { GAME_CONFIG } from '../../config/gameConfig';

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
     * Create the visual representation of the machine
     * This method can be overridden by subclasses to customize appearance
     */
    createVisuals() {
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for machine: grid reference is missing');
            return;
        }

        // *** ADDED: Get the correctly rotated shape for visuals ***
        // Use the current direction if available, otherwise derive from rotation
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection); // Use direction string

        // *** VALIDATE the rotated shape ***
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
            console.error(`[${this.id}] Failed to get valid rotated shape for direction ${currentDirection}. Using default.`);
            rotatedShape = [[1]]; // Fallback to default shape
        }

        // *** MODIFIED: Calculate world position using top-left of the anchor cell ***
        const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
        
        // Add more detailed logging to track positions
  
        
        // Create container for machine parts
        if (this.presetPosition) {
            // If a preset position was provided in the config, use it directly
            // TODO: Re-evaluate if presetPosition is still needed/correct with this change
            console.warn(`[${this.id}] Using presetPosition, visual alignment might be incorrect.`);
            this.container = this.scene.add.container(this.presetPosition.x, this.presetPosition.y);
        } else {
            // *** MODIFIED: Use the calculated top-left position for the container ***
            this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);
        }
        
        // Now that we've created the container, set a reference to it in the scene for debugging
        if (!this.scene.machineContainers) {
            this.scene.machineContainers = [];
        }
        this.scene.machineContainers.push(this.container);
        
        
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
                    inputPos = { x: 0, y: Math.floor(this.shape.length / 2) };
                    outputPos = { x: this.shape[0].length - 1, y: Math.floor(this.shape.length / 2) };
                    break;
                case 'down':
                    // Input on top side, output on bottom side
                    inputPos = { x: Math.floor(this.shape[0].length / 2), y: 0 };
                    outputPos = { x: Math.floor(this.shape[0].length / 2), y: this.shape.length - 1 };
                    break;
                case 'left':
                    // Input on right side, output on left side
                    inputPos = { x: this.shape[0].length - 1, y: Math.floor(this.shape.length / 2) };
                    outputPos = { x: 0, y: Math.floor(this.shape.length / 2) };
                    break;
                case 'up':
                    // Input on bottom side, output on top side
                    inputPos = { x: Math.floor(this.shape[0].length / 2), y: this.shape.length - 1 };
                    outputPos = { x: Math.floor(this.shape[0].length / 2), y: 0 };
                    break;
            }
        }
        
        // Calculate the center point of the shape in terms of cell coordinates
        const shapeCenterX = (this.shape[0].length - 1) / 2;
        const shapeCenterY = (this.shape.length - 1) / 2;
        
        // Create machine parts based on shape
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // Only create visuals for cells with value 1 (occupied)
                if (rotatedShape[y][x] === 1) {
                    // *** MODIFIED: Calculate part position relative to container's top-left origin ***
                    // Position the center of the part rectangle correctly within its cell
                    const partCenterX = x * this.grid.cellSize + this.grid.cellSize / 2;
                    const partCenterY = y * this.grid.cellSize + this.grid.cellSize / 2;
                    
                    // *** REMOVED old adjustedX/Y calculation ***
                    // const partX = x * this.grid.cellSize;
                    // const partY = y * this.grid.cellSize;
                    // const adjustedX = partX - this.grid.cellSize; 
                    // const adjustedY = partY - this.grid.cellSize;
                    
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    // For cargo loaders, color all outer edges blue
                    if (this.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === rotatedShape[0].length - 1 || y === 0 || y === rotatedShape.length - 1)) {
                            partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        }
                    }
                    
                    // *** MODIFIED: Create part using calculated center positions ***
                    const part = this.scene.add.rectangle(partCenterX, partCenterY, this.grid.cellSize - 4, this.grid.cellSize - 4, partColor);
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (this.direction !== 'none' && x === outputPos.x && y === outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Add machine type indicator at the center of the machine
        // Position relative to the VISUAL center of the shape, not container (0,0)
        const visualCenterX = shapeCenterX * this.grid.cellSize;
        const visualCenterY = shapeCenterY * this.grid.cellSize;
        
        // *** MODIFIED: Adjust center based on container origin (top-left) and part centering ***
        const adjustedVisualCenterX = visualCenterX + this.grid.cellSize / 2;
        const adjustedVisualCenterY = visualCenterY + this.grid.cellSize / 2;
        
        // Create a background circle for the label
        // *** MODIFIED: Use adjusted center position ***
        const labelBackground = this.scene.add.circle(adjustedVisualCenterX, adjustedVisualCenterY, 10, 0x000000, 0.3);
        this.container.add(labelBackground);
        
        // Create the machine label
        // *** MODIFIED: Use adjusted center position ***
        const machineLabel = this.scene.add.text(adjustedVisualCenterX, adjustedVisualCenterY, this.id.charAt(0).toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing indicator relative to adjusted visual center
        // *** MODIFIED: Use adjusted center position ***
        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, 
            adjustedVisualCenterY + this.grid.cellSize / 2, 
            this.grid.cellSize - 10, 
            4, 
            0x00ff00
        );
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // COMPLETELY NEW APPROACH FOR DIRECTION INDICATOR
        // Instead of adding it to the container, add it directly to the scene
        // at the absolute position where the machine is
        if (this.direction !== 'none') {
            // *** MODIFIED: Calculate absolute center based on top-left container pos + visual center offset ***
            const absoluteCenterX = this.container.x + adjustedVisualCenterX;
            const absoluteCenterY = this.container.y + adjustedVisualCenterY;
            
            // Create the direction indicator directly in the scene, not in the container
            const indicatorColor = 0xff9500; // Default orange color, removed extractor check
            
            // *** MODIFIED: Use calculated absolute center position ***
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
        
        // Add input/output indicators
        this.addResourceTypeIndicators();
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Add interactive features
        this.addInteractivity();
        
        // Create resource visualizations
        this.createResourceVisualizations();
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
                        part.fillColor = 0x44ff44; // Default green (same as when dragging)
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
        
        // Get the machine's position in the world
        let tooltipX, tooltipY;
        
        if (this.container) {
            // Use the container's direct x and y coordinates instead of transform matrix
            tooltipX = this.container.x;
            tooltipY = this.container.y - 40; // Position above the machine
        } else if (this.grid && this.gridX !== undefined && this.gridY !== undefined) {
            // Fall back to grid position if container is not available
            const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
            tooltipX = worldPos.x;
            tooltipY = worldPos.y - 40; // Position above the machine
        } else {
            // Fallback for preview or other cases
            tooltipX = 0;
            tooltipY = -40;
        }
        
        // Create tooltip background
        const tooltipBg = this.scene.add.rectangle(
            tooltipX, 
            tooltipY, 
            250, 
            80, 
            0x000000, 
            0.8
        );
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
        
        // Add inventory info
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
        
        // Create tooltip text
        const tooltipText = this.scene.add.text(
            tooltipX, 
            tooltipY, 
            tooltipContent, 
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
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
        try {
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
     * Check if the machine can process resources
     * @returns {boolean} True if the machine can process, false otherwise
     */
    canProcess() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
        return false;
    }
    
    /**
     * Start processing resources
     */
    startProcessing() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
    }
    
    /**
     * Complete processing resources
     */
    completeProcessing() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
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
            if (deliveryNode && typeof deliveryNode.acceptResource === 'function') {
                if (deliveryNode.acceptResource(resourceTypeToTransfer)) {
                    transferred = true;
                    this.createResourceTransferEffect(resourceTypeToTransfer, deliveryNode);
                } else {
                    // console.warn(`[${this.name}] Delivery node rejected ${resourceTypeToTransfer}`);
                }
            }
        }
        // Handle transfer to another Machine
        else if (targetInfo.type === 'machine') {
            const targetMachine = targetInfo.target;
            
            if (targetMachine && typeof targetMachine.canAcceptInput === 'function' && typeof targetMachine.receiveResource === 'function') {
                // Check if target machine can accept the resource type and has space
                if (targetMachine.canAcceptInput(resourceTypeToTransfer)) {
                    
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
                            
                            // console.warn(`[${this.name}] Preventing transfer to Conveyor at (${targetX}, ${targetY}) because its direction (${targetDirection}) points back towards output face (${outputFaceX}, ${outputFaceY}).`);
                            allowTransfer = false;
                        }
                    }
                    // *** END Directional check ***

                    // Attempt transfer only if allowed (basic acceptance AND directional check passed)
                    if (allowTransfer) {
                        if (targetMachine.receiveResource(resourceTypeToTransfer, this)) {
                            transferred = true;
                            this.createResourceTransferEffect(resourceTypeToTransfer, targetMachine);
                        } else {
                            // console.warn(`[${this.name}] Target machine ${targetMachine.name} receiveResource returned false for ${resourceTypeToTransfer}`);
                        }
                    }
                } else {
                   // console.warn(`[${this.name}] Target machine ${targetMachine.name} cannot accept input ${resourceTypeToTransfer}`);
                }
            } else {
                 console.warn(`[${this.name}] Target machine is invalid or missing methods.`);
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
     * This method should be overridden by subclasses
     * @returns {Phaser.GameObjects.Container} A container with the preview sprite
     */
    getPreviewSprite(scene, x, y) {
        // Create a simplified version of the machine for the selection panel
        const container = scene.add.container(x, y);
        
        // Create a simple rectangle as a placeholder
        const rect = scene.add.rectangle(0, 0, 24, 24, 0x44ff44); // Default green color (same as when dragging)
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
        // Child classes should override this method to provide machine-specific adjustments
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
     * Receive a resource from another machine or source.
     * @param {string} resourceType - The ID of the resource being received.
     * @param {BaseMachine} sourceMachine - The machine sending the resource (optional).
     * @returns {boolean} True if the resource was accepted, false otherwise.
     */
    receiveResource(resourceType, sourceMachine = null) {
        if (this.canAcceptInput(resourceType)) {
            this.inputInventory[resourceType]++;
            console.log(`[${this.name}] at (${this.gridX}, ${this.gridY}) received ${resourceType}. Input:`, this.inputInventory);
            
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
        console.warn(`[${this.name}] at (${this.gridX}, ${this.gridY}) rejected ${resourceType}. Input full or type mismatch.`);
        return false;
    }
} 