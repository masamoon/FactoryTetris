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
        
        // Only set grid-related properties if not in preview mode
        if (!this.isPreview) {
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
        
        // Initialize machine properties
        this.id = 'base-machine';
        this.name = 'Base Machine';
        this.description = 'Base machine class';
        this.shape = [[1]]; // Default 1x1 shape
        this.inputTypes = [];
        this.outputTypes = [];
        this.processingTime = 1000; // Default 1 second
        this.processingProgress = 0;
        this.isProcessing = false;
        this.isSelected = false;
        
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        // Only create visuals and add interactivity if not in preview mode
        // and we have a valid scene
        if (!this.isPreview && this.scene) {
            // Create visual representation
            this.createVisuals();
            
            // Add interactivity
            this.addInteractivity();
            
            // Initialize keyboard controls
            this.initKeyboardControls();
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
        
        // Create machine parts based on shape
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                // Only create visuals for cells with value 1 (occupied)
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to top-left corner
                    const partX = x * this.grid.cellSize + this.grid.cellSize / 2;
                    const partY = y * this.grid.cellSize + this.grid.cellSize / 2;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    // For extractors, only color the output
                    if (this.id === 'extractor') {
                        if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xffa520; // Brighter orange for extractor output (same as when dragging)
                        }
                    } 
                    // For cargo loaders, only color the inputs
                    else if (this.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === this.shape[0].length - 1 || y === 0 || y === this.shape.length - 1)) {
                            partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        }
                    }
                    // For all other machines with direction
                    else if (this.direction !== 'none') {
                        if (x === inputPos.x && y === inputPos.y) {
                            partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        } else if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xffa520; // Brighter orange for output (same as when dragging)
                        }
                    }
                    
                    // Create machine part
                    const part = this.scene.add.rectangle(partX, partY, this.grid.cellSize - 4, this.grid.cellSize - 4, partColor);
                    this.container.add(part);
                    
                    // Store references to input and output squares
                    if (this.id !== 'extractor' && this.direction !== 'none' && x === inputPos.x && y === inputPos.y) {
                        this.inputSquare = part;
                    } else if (this.direction !== 'none' && x === outputPos.x && y === outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Add machine type indicator at the center of the machine
        const centerX = (this.shape[0].length * this.grid.cellSize) / 2;
        const centerY = (this.shape.length * this.grid.cellSize) / 2;
        
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
        
        // Add direction indicator if not a cargo loader
        if (this.direction !== 'none') {
            this.directionIndicator = this.createDirectionIndicator(centerX, centerY);
            this.container.add(this.directionIndicator);
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
     * Create a direction indicator for the machine
     * @param {number} centerX - X coordinate of the center of the machine
     * @param {number} centerY - Y coordinate of the center of the machine
     * @returns {Phaser.GameObjects.Container} The direction indicator container
     */
    createDirectionIndicator(centerX, centerY) {
        // Determine color based on machine type
        let indicatorColor = 0xff9500;  // Default orange color
        
        // Use a contrasting color for extractors
        if (this.id === 'extractor') {
            indicatorColor = 0xffffff;  // White for extractors
        }
        
        // Create a triangle pointing in the direction of output
        const indicator = this.scene.add.triangle(
            0, 
            0, 
            -4, -6,  // left top
            -4, 6,   // left bottom
            8, 0,    // right point
            indicatorColor
        ).setOrigin(0.5, 0.5);
        
        // Create a container for the triangle at the specified position
        const container = this.scene.add.container(centerX, centerY, [indicator]);
        
        // Rotate based on direction
        switch (this.direction) {
            case 'right':
                container.rotation = 0; // Point right (0 degrees)
                break;
            case 'down':
                container.rotation = Math.PI / 2; // Point down (90 degrees)
                break;
            case 'left':
                container.rotation = Math.PI; // Point left (180 degrees)
                break;
            case 'up':
                container.rotation = 3 * Math.PI / 2; // Point up (270 degrees)
                break;
        }
        
        return container;
    }
    
    /**
     * Add resource type indicators to the machine
     */
    addResourceTypeIndicators() {
        const width = this.shape[0].length * this.grid.cellSize;
        const height = this.shape.length * this.grid.cellSize;
        
        // Add a more prominent input indicator
        if (this.inputTypes.length > 0 && this.id !== 'extractor') {
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
                let indicatorX = width / 2;
                let indicatorY = height / 2;
                
                // Position the indicator at the edge based on input direction
                switch (inputDirection) {
                    case 'right': 
                        indicatorX = width - 8;
                        break;
                    case 'down': 
                        indicatorY = height - 8;
                        break;
                    case 'left': 
                        indicatorX = 8;
                        break;
                    case 'up': 
                        indicatorY = 8;
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
        
        // Create a proper hit area for the container
        this.container.setInteractive(new Phaser.Geom.Rectangle(
            0, 0, width, height
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
                            part.fillColor = 0x4aa8eb; // Brighter blue for input
                        } else {
                            // For extractor output, use a brighter version of the darker orange
                            if (this.id === 'extractor') {
                                part.fillColor = 0xff6b22; // Brighter dark orange
                            } else {
                                part.fillColor = 0xffa520; // Regular bright orange
                            }
                        }
                    } else {
                        part.fillColor = 0x5a8fd5; // Regular highlight color
                    }
                }
            });
            
            // Show machine info tooltip
            this.showTooltip();
        });
        
        this.container.on('pointerout', () => {
            // Remove highlight
            this.container.list.forEach(part => {
                if (part.type === 'Rectangle' && part !== this.progressBar && !part.isResourceIndicator) {
                    // Restore original colors
                    if (part === this.inputSquare) {
                        part.fillColor = 0x3498db; // Blue for input
                    } else if (part === this.outputSquare) {
                        if (this.id === 'extractor') {
                            part.fillColor = 0xd35400; // Darker orange for extractor output
                        } else {
                            part.fillColor = 0xff9500; // Orange for output
                        }
                    } else {
                        part.fillColor = 0x4a6fb5; // Default blue
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
        
        // Calculate the center position of the machine
        const centerX = this.container.x + (this.shape[0].length * this.grid.cellSize) / 2;
        const centerY = this.container.y - 40; // Position above the machine
        
        // Create tooltip background
        const tooltipBg = this.scene.add.rectangle(
            centerX, 
            centerY, 
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
        } else if (this.canProcess && this.canProcess()) {
            tooltipContent += '\nReady to process';
        } else {
            tooltipContent += '\nWaiting for resources';
        }
        
        // Add inventory info
        if (this.inputTypes.length > 0) {
            tooltipContent += '\nInputs: ';
            this.inputTypes.forEach((type, index) => {
                const count = this.inputInventory[type] || 0;
                tooltipContent += `${type}(${count}) `;
            });
        }
        
        if (this.outputTypes.length > 0) {
            tooltipContent += '\nOutputs: ';
            this.outputTypes.forEach((type, index) => {
                const count = this.outputInventory[type] || 0;
                tooltipContent += `${type}(${count}) `;
            });
        }
        
        // Create tooltip text
        const tooltipText = this.scene.add.text(
            centerX, 
            centerY, 
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
     * Update the machine state
     */
    update() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
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
     * Transfer resources to connected machines
     */
    transferResources() {
        // Implementation will be similar to the original Machine class
        // This is a placeholder for now
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
        if (this.container) {
            this.container.destroy();
        }
        
        if (this.tooltip) {
            this.hideTooltip();
        }
        
        if (this.infoPanel) {
            this.hideDetailedInfo();
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
        const rect = scene.add.rectangle(0, 0, 24, 24, 0x4a6fb5);
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
} 