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
            console.log(`[BaseMachine] Constructor received preset position: (${this.presetPosition.x}, ${this.presetPosition.y})`);
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
            // Ensure shape is properly rotated based on the rotation value
            if (this.grid && this.shape) {
                // Log the shape before rotation
                console.log(`[BaseMachine] Before rotation - Shape: ${JSON.stringify(this.shape)}, Rotation: ${this.rotation}, Direction: ${this.direction}`);
                
                // Apply the rotation to the shape if it wasn't already done in the child class
                if (this.rotation) {
                    // Convert rotation from radians to degrees for Grid.getRotatedShape
                    // Grid.getRotatedShape expects either a direction string or rotation in degrees, not radians
                    const rotationDegrees = (this.rotation * 180 / Math.PI) % 360;
                    console.log(`[BaseMachine] Converting rotation from ${this.rotation} radians to ${rotationDegrees} degrees`);
                    
                    // Get the rotated shape using degrees
                    this.shape = this.grid.getRotatedShape(this.shape, rotationDegrees);
                    
                    // Ensure direction property is updated to match the rotation
                    // This ensures consistency between shape and direction
                    const directionFromRotation = this.getDirectionFromRotation(this.rotation);
                    if (this.direction !== directionFromRotation) {
                        console.log(`[BaseMachine] Updating direction from ${this.direction} to ${directionFromRotation} to match rotation`);
                        this.direction = directionFromRotation;
                    }
                    
                    console.log(`[BaseMachine] After rotation - Shape: ${JSON.stringify(this.shape)}, Direction: ${this.direction}`);
                }
            }
            
            // Create visual representation
            this.createVisuals();
            
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

        console.log("BaseMachine createVisuals START");

        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for machine: grid reference is missing');
            return;
        }

        
        
        // Calculate world position for the machine - gridToWorld now returns the center of the cell
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Add more detailed logging to track positions
        console.log(`[BaseMachine VISUALS START]`);
        console.log(`  Machine type: ${this.id}`);
        console.log(`  Grid position: (${this.gridX}, ${this.gridY})`);
        console.log(`  Calculated world position: (${worldPos.x}, ${worldPos.y})`);
        
        // Create container for machine parts
        if (this.presetPosition) {
            // If a preset position was provided in the config, use it directly
            console.log(`  Using PRESET position: (${this.presetPosition.x}, ${this.presetPosition.y})`);
            this.container = this.scene.add.container(this.presetPosition.x, this.presetPosition.y);
        } else {
            // Use the calculated grid position (gridToWorld now returns the center)
            console.log(`  Using calculated position: (${worldPos.x}, ${worldPos.y})`);
            this.container = this.scene.add.container(worldPos.x, worldPos.y);
        }
        
        // Now that we've created the container, set a reference to it in the scene for debugging
        if (!this.scene.machineContainers) {
            this.scene.machineContainers = [];
        }
        this.scene.machineContainers.push(this.container);
        
        console.log(`[BaseMachine VISUALS END]`);
        
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
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                // Only create visuals for cells with value 1 (occupied)
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to container center
                    // Since the container is now positioned at cell center, we need to offset parts correctly
                    const offsetX = (x - shapeCenterX) * this.grid.cellSize;
                    const offsetY = (y - shapeCenterY) * this.grid.cellSize;
                    const partX = offsetX;
                    const partY = offsetY;
                    
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    // For cargo loaders, color all outer edges blue
                    if (this.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === this.shape[0].length - 1 || y === 0 || y === this.shape.length - 1)) {
                            partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        }
                    }
                    
                    const part = this.scene.add.rectangle(partX, partY, this.grid.cellSize - 4, this.grid.cellSize - 4, partColor);
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (this.direction !== 'none' && x === outputPos.x && y === outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Add machine type indicator at the center of the machine
        // Use a distinctive background to make it stand out
        const centerX = 0;
        const centerY = 0;
        
        // Create a background circle for the label
        const labelBackground = this.scene.add.circle(centerX, centerY, 10, 0x000000, 0.3);
        this.container.add(labelBackground);
        
        // Create the machine label
        const machineLabel = this.scene.add.text(centerX, centerY, this.id.charAt(0).toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing indicator
        this.progressBar = this.scene.add.rectangle(
            centerX, 
            centerY + this.grid.cellSize / 2, 
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
            // Get the absolute position of the machine in the world
            const absoluteX = this.container.x;
            const absoluteY = this.container.y;
            
            // Create the direction indicator directly in the scene, not in the container
            const indicatorColor = 0xff9500; // Default orange color, removed extractor check
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteX,  // Place exactly at machine center X
                absoluteY,  // Place exactly at machine center Y
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
            
            console.log(`Direction indicator created at absolute position (${absoluteX}, ${absoluteY})`);
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
        // Calculate width and height based on shape
        const width = this.shape[0].length * this.grid.cellSize;
        const height = this.shape.length * this.grid.cellSize;
        
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
        // Calculate the width and height of the machine in pixels
        const width = this.shape[0].length * this.grid.cellSize;
        const height = this.shape.length * this.grid.cellSize;
        
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
            console.log(`[TOOLTIP] Positioning at container coords: (${tooltipX}, ${tooltipY})`);
        } else if (this.grid && this.gridX !== undefined && this.gridY !== undefined) {
            // Fall back to grid position if container is not available
            const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
            tooltipX = worldPos.x;
            tooltipY = worldPos.y - 40; // Position above the machine
            console.log(`[TOOLTIP] Positioning at grid-based world coords: (${tooltipX}, ${tooltipY})`);
        } else {
            // Fallback for preview or other cases
            tooltipX = 0;
            tooltipY = -40;
            console.log(`[TOOLTIP] Using fallback position: (${tooltipX}, ${tooltipY})`);
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
     * Transfer resources to adjacent Delivery Nodes or Conveyors.
     * Called periodically or after processing completes.
     */
    transferResources() {
        if (!this.grid || !this.outputInventory) {
            return; // Cannot transfer without grid or output inventory
        }

        const adjacentOffsets = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];

        // Iterate through output inventory items
        for (const resourceType in this.outputInventory) {
            if (this.outputInventory[resourceType] > 0) {
                // Try to push this resource type
                Phaser.Utils.Array.Shuffle(adjacentOffsets); // Randomize check order

                for (const offset of adjacentOffsets) {
                    const targetX = this.gridX + offset.dx;
                    const targetY = this.gridY + offset.dy;

                    // Check bounds
                    if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                        continue;
                    }

                    const cell = this.grid.getCell(targetX, targetY);
                    if (!cell) continue;

                    // --- Priority 1: Push to Delivery Node ---
                    if (cell.type === 'delivery-node' && cell.object) {
                        const deliveryNode = cell.object;
                        if (deliveryNode.acceptResource && deliveryNode.acceptResource(resourceType)) {
                            this.outputInventory[resourceType]--;
                            // Optional: Create transfer effect
                            if (typeof this.createResourceTransferEffect === 'function') {
                                this.createResourceTransferEffect(resourceType, deliveryNode); 
                            }
                            console.log(`[${this.name}] Pushed ${resourceType} to DeliveryNode at (${targetX}, ${targetY})`);
                            return; // Pushed one item, exit for this cycle
                        }
                    }
                    // --- Priority 2: Push to Conveyor pointing AWAY ---
                    else if (cell.type === 'machine' && cell.machine && cell.machine.id === 'conveyor') {
                        const conveyor = cell.machine;
                        let isPointingAway = false;
                        // Check if conveyor points away from this machine's cell
                        if (offset.dx === 1 && conveyor.direction !== 'left') isPointingAway = true;  
                        if (offset.dx === -1 && conveyor.direction !== 'right') isPointingAway = true; 
                        if (offset.dy === 1 && conveyor.direction !== 'up') isPointingAway = true;    
                        if (offset.dy === -1 && conveyor.direction !== 'down') isPointingAway = true; 

                        if (isPointingAway && conveyor.canAcceptInput && conveyor.canAcceptInput(resourceType)) {
                            if (conveyor.receiveResource(resourceType, this)) {
                                this.outputInventory[resourceType]--;
                                if (typeof this.createResourceTransferEffect === 'function') {
                                    this.createResourceTransferEffect(resourceType, conveyor);
                                }
                                console.log(`[${this.name}] Pushed ${resourceType} to Conveyor at (${targetX}, ${targetY})`);
                                return; // Pushed one item, exit for this cycle
                            }
                        }
                    }
                } // End adjacent cell loop
            } // End check for >0 resources of this type
        } // End output inventory loop
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