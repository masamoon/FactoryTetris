import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export default class Machine {
    constructor(scene, config) {
        try {
            this.scene = scene;
            
            // Store configuration values safely
            this.grid = config.grid;
            this.gridX = config.x !== undefined ? config.x : 0;
            this.gridY = config.y !== undefined ? config.y : 0;
            this.type = config.type;
            this.rotation = config.rotation !== undefined ? config.rotation : 0;
            this.direction = config.direction || this.getDirectionFromRotation(this.rotation);
            
            // Validate grid and required properties
            if (!this.grid) {
                console.error('[MACHINE] Missing grid reference');
                throw new Error('Missing grid reference in Machine constructor');
            }
            
            if (!this.type) {
                console.error('[MACHINE] Missing machine type');
                throw new Error('Missing machine type in Machine constructor');
            }
            
            // Handle preset position if provided
            if (config.presetPosition) {
                this.presetPosition = config.presetPosition;
                console.log(`[MACHINE] Using preset position: (${this.presetPosition.x}, ${this.presetPosition.y})`);
            }
            
            // Get the shape based on rotation
            try {
                if (this.type.shape) {
                    this.shape = config.shape || this.grid.getRotatedShape(this.type.shape, this.rotation);
                } else {
                    console.error('[MACHINE] Missing machine shape in type definition');
                    throw new Error('Missing shape in machine type');
                }
            } catch (shapeError) {
                console.error('[MACHINE] Error getting rotated shape:', shapeError);
                // Use a fallback shape (1x1) if there's an error
                this.shape = [[1]];
            }
            
            // Machine state
            this.inputInventory = {};
            this.outputInventory = {};
            this.processingTime = 0;
            this.isProcessing = false;
            
            // Initialize inventories if input/output types are defined
            if (this.type.inputTypes && Array.isArray(this.type.inputTypes)) {
                this.type.inputTypes.forEach(type => {
                    this.inputInventory[type] = 0;
                });
            } else {
                this.inputInventory = {}; // Empty inventory if no types defined
            }
            
            if (this.type.outputTypes && Array.isArray(this.type.outputTypes)) {
                this.type.outputTypes.forEach(type => {
                    this.outputInventory[type] = 0;
                });
            } else {
                this.outputInventory = {}; // Empty inventory if no types defined
            }
            
            // Resource visualization
            this.resourceSprites = {
                input: [],
                output: []
            };
            
            // Create visual representation
            this.createVisuals();
        } catch (error) {
            console.error('[MACHINE] Error in constructor:', error);
            throw error; // Re-throw to ensure callers know there was a problem
        }
    }
    
    getDirectionFromRotation(rotation) {
        // Normalize rotation to 0-2π range
        const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Define epsilon for floating point comparison
        const epsilon = 0.01;
        
        console.log(`[Machine] getDirectionFromRotation - Raw rotation: ${rotation}, Normalized: ${normalizedRotation.toFixed(4)}`);
        
        // Check for exact values first (with epsilon tolerance)
        if (Math.abs(normalizedRotation) < epsilon || Math.abs(normalizedRotation - 2 * Math.PI) < epsilon) {
            console.log(`[Machine] Direction determined as 'right' (exact match for 0 or 2π)`);
            return 'right';
        }
        
        if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
            console.log(`[Machine] Direction determined as 'down' (exact match for π/2)`);
            return 'down';
        }
        
        if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
            console.log(`[Machine] Direction determined as 'left' (exact match for π)`);
            return 'left';
        }
        
        if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < epsilon) {
            console.log(`[Machine] Direction determined as 'up' (exact match for 3π/2)`);
            return 'up';
        }
        
        // Fallback to range-based checks
        if (normalizedRotation < Math.PI / 4 || normalizedRotation > 7 * Math.PI / 4) {
            console.log(`[Machine] Direction determined as 'right' (range check: ${normalizedRotation.toFixed(4)} radians)`);
            return 'right';
        } else if (normalizedRotation < 3 * Math.PI / 4) {
            console.log(`[Machine] Direction determined as 'down' (range check: ${normalizedRotation.toFixed(4)} radians)`);
            return 'down';
        } else if (normalizedRotation < 5 * Math.PI / 4) {
            console.log(`[Machine] Direction determined as 'left' (range check: ${normalizedRotation.toFixed(4)} radians)`);
            return 'left';
        } else {
            console.log(`[Machine] Direction determined as 'up' (range check: ${normalizedRotation.toFixed(4)} radians)`);
            return 'up';
        }
    }
    
    createVisuals() {
        // gridToWorld now returns the center of the cell
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts at the cell center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        if (this.type.direction !== 'none') {
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
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to top-left corner
                    const partX = x * this.grid.cellSize + this.grid.cellSize / 2;
                    const partY = y * this.grid.cellSize + this.grid.cellSize / 2;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color (same as when dragging)
                    
                    // For cargo loaders, color all outer edges blue
                    if (this.type.id === 'cargo-loader') {
                        if ((x === 0 || x === this.shape[0].length - 1 || y === 0 || y === this.shape.length - 1)) {
                            partColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                        }
                    }
                    // For all other machines with direction
                    else if (this.type.direction !== 'none') {
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
                    if (this.type.direction !== 'none' && x === inputPos.x && y === inputPos.y) {
                        this.inputSquare = part;
                    } else if (this.type.direction !== 'none' && x === outputPos.x && y === outputPos.y) {
                        this.outputSquare = part;
                    }
                }
            }
        }
        
        // Add machine type indicator at the center of the machine
        const centerX = (this.shape[0].length * this.grid.cellSize) / 2;
        const centerY = (this.shape.length * this.grid.cellSize) / 2;
        
        const machineLabel = this.scene.add.text(centerX, centerY, this.type.id.charAt(0).toUpperCase(), {
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
        if (this.type.direction !== 'none') {
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
    
    createDirectionIndicator(centerX, centerY) {
        // Create a triangle pointing in the direction of output
        const indicator = this.scene.add.triangle(
            0, 
            0, 
            -4, -6,  // left top
            -4, 6,   // left bottom
            8, 0,    // right point
            0xffa520  // Brighter orange color (same as when dragging)
        );
        
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
        
        console.log(`Machine direction indicator created: type=${this.type.id}, direction=${this.direction}, rotation=${this.rotation}, indicator rotation=${container.rotation}`);
        
        return container;
    }
    
    createResourceVisualizations() {
        // Clear existing resource sprites
        this.resourceSprites.input.forEach(sprite => sprite.destroy());
        this.resourceSprites.output.forEach(sprite => sprite.destroy());
        this.resourceSprites.input = [];
        this.resourceSprites.output = [];
        
        // Create input resource visualizations
        const inputX = this.grid.cellSize / 4;
        const inputY = this.grid.cellSize / 4;
        
        this.type.inputTypes.forEach((type, index) => {
            if (this.inputInventory[type] > 0) {
                const color = GAME_CONFIG.resourceColors[type] || 0xaaaaaa;
                const sprite = this.scene.add.circle(
                    inputX + (index * 10), 
                    inputY, 
                    5, 
                    color
                );
                this.container.add(sprite);
                this.resourceSprites.input.push(sprite);
            }
        });
        
        // Create output resource visualizations
        const outputX = (this.shape[0].length * this.grid.cellSize) - this.grid.cellSize / 4;
        const outputY = (this.shape.length * this.grid.cellSize) - this.grid.cellSize / 4;
        
        this.type.outputTypes.forEach((type, index) => {
            if (this.outputInventory[type] > 0) {
                const color = GAME_CONFIG.resourceColors[type] || 0xaaaaaa;
                const sprite = this.scene.add.circle(
                    outputX - (index * 10), 
                    outputY, 
                    5, 
                    color
                );
                this.container.add(sprite);
                this.resourceSprites.output.push(sprite);
            }
        });
    }
    
    // Add placement animation
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
    
    // Add interactive features to the machine
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
                    // Apply the consistent green color scheme
                    if (part === this.inputSquare) {
                        part.fillColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                    } else if (part === this.outputSquare) {
                        part.fillColor = 0xffa520; // Brighter orange for output (same as when dragging)
                    } else {
                        part.fillColor = 0x44ff44; // Default green (same as when dragging)
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
                    // Apply the consistent green color scheme
                    if (part === this.inputSquare) {
                        part.fillColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                    } else if (part === this.outputSquare) {
                        part.fillColor = 0xffa520; // Brighter orange for output (same as when dragging)
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
    
    // Show tooltip with basic machine info
    showTooltip() {
        // Remove existing tooltip if any
        this.hideTooltip();
        
        // Calculate the center position of the machine - use direct container position
        const centerX = this.container.x;
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
        let tooltipContent = `${this.type.name} (${this.direction})`;
        
        // Add processing status
        if (this.isProcessing) {
            const progressPercent = Math.floor((this.processingTime / this.type.processingTime) * 100);
            tooltipContent += `\nProcessing: ${progressPercent}%`;
        } else if (this.canProcess()) {
            tooltipContent += '\nReady to process';
        } else {
            tooltipContent += '\nWaiting for resources';
        }
        
        // Add input inventory
        if (this.type.inputTypes.length > 0) {
            tooltipContent += '\nInputs: ';
            this.type.inputTypes.forEach(type => {
                tooltipContent += `${type}(${this.inputInventory[type] || 0}/5) `;
            });
        }
        
        // Add output inventory
        if (this.type.outputTypes.length > 0) {
            tooltipContent += '\nOutputs: ';
            this.type.outputTypes.forEach(type => {
                tooltipContent += `${type}(${this.outputInventory[type] || 0}/5) `;
            });
        }
        
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
        
        // Store tooltip elements
        this.tooltip = {
            background: tooltipBg,
            text: tooltipText
        };
        
        // Set tooltip depth to ensure it appears above other objects
        tooltipBg.setDepth(1000);
        tooltipText.setDepth(1001);
    }
    
    // Hide tooltip
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.background.destroy();
            this.tooltip.text.destroy();
            this.tooltip = null;
        }
    }
    
    // Show detailed machine information
    showDetailedInfo() {
        // Display machine info in a more detailed panel
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Create panel background
        const panelBg = this.scene.add.rectangle(
            width / 2,
            height / 2,
            300,
            200,
            0x000000,
            0.9
        );
        panelBg.setStrokeStyle(2, 0xffffff);
        
        // Create panel title
        const panelTitle = this.scene.add.text(
            width / 2,
            height / 2 - 80,
            this.type.name,
            {
                fontFamily: 'Arial',
                fontSize: 18,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Create panel content
        let contentText = `Direction: ${this.direction}\n`;
        contentText += `Description: ${this.type.description}\n\n`;
        
        // Add input inventory
        if (this.type.inputTypes.length > 0) {
            contentText += 'Inputs:\n';
            this.type.inputTypes.forEach(type => {
                contentText += `- ${type}: ${this.inputInventory[type] || 0}/5\n`;
            });
        } else {
            contentText += 'Inputs: None\n';
        }
        
        // Add output inventory
        if (this.type.outputTypes.length > 0) {
            contentText += '\nOutputs:\n';
            this.type.outputTypes.forEach(type => {
                contentText += `- ${type}: ${this.outputInventory[type] || 0}/5\n`;
            });
        } else {
            contentText += '\nOutputs: None\n';
        }
        
        contentText += `\nProcessing time: ${this.type.processingTime}ms`;
        
        const panelContent = this.scene.add.text(
            width / 2,
            height / 2,
            contentText,
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff',
                align: 'left'
            }
        ).setOrigin(0.5, 0);
        
        // Create close button
        const closeButton = this.scene.add.rectangle(
            width / 2 + 140,
            height / 2 - 90,
            20,
            20,
            0xff0000
        ).setInteractive();
        
        const closeText = this.scene.add.text(
            width / 2 + 140,
            height / 2 - 90,
            'X',
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Store panel elements
        this.infoPanel = {
            background: panelBg,
            title: panelTitle,
            content: panelContent,
            closeButton: closeButton,
            closeText: closeText
        };
        
        // Add close handler
        closeButton.on('pointerdown', () => {
            this.hideDetailedInfo();
        });
    }
    
    // Hide detailed info panel
    hideDetailedInfo() {
        if (this.infoPanel) {
            this.infoPanel.background.destroy();
            this.infoPanel.title.destroy();
            this.infoPanel.content.destroy();
            this.infoPanel.closeButton.destroy();
            this.infoPanel.closeText.destroy();
            this.infoPanel = null;
        }
    }
    
    update() {
        // Process resources
        if (this.canProcess()) {
            if (!this.isProcessing) {
                this.startProcessing();
            }
            
            this.processingTime += this.scene.game.loop.delta;
            
            // Update progress bar
            this.progressBar.scaleX = Math.min(1, this.processingTime / this.type.processingTime);
            
            // Check if processing is complete
            if (this.processingTime >= this.type.processingTime) {
                this.completeProcessing();
            }
        } else {
            // Reset processing if conditions are no longer met
            if (this.isProcessing) {
                this.isProcessing = false;
                this.processingTime = 0;
                this.progressBar.scaleX = 0;
            }
        }
        
        // Try to transfer resources to connected machines
        this.transferResources();
        
        // Update resource visualizations
        this.createResourceVisualizations();
    }
    
    canProcess() {
        // Cargo loader just needs inputs
        if (this.type.id === 'cargo-loader') {
            for (const inputType of this.type.inputTypes) {
                if (this.inputInventory[inputType] > 0) {
                    return true;
                }
            }
            return false;
        }
        
        // Conveyor just needs any input
        if (this.type.id === 'conveyor') {
            for (const inputType of this.type.inputTypes) {
                if (this.inputInventory[inputType] > 0) {
                    return true;
                }
            }
            return false;
        }
        
        // For processors, check if we have all required inputs
        for (const inputType of this.type.inputTypes) {
            if (!this.inputInventory[inputType] || this.inputInventory[inputType] <= 0) {
                return false;
            }
        }
        
        // Check if we have space for outputs
        for (const outputType of this.type.outputTypes) {
            if (this.outputInventory[outputType] && this.outputInventory[outputType] >= 5) {
                return false;
            }
        }
        
        return true;
    }
    
    findResourceNodeUnderMachine() {
        // Check each cell occupied by the machine
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    const cellX = this.gridX + x;
                    const cellY = this.gridY + y;
                    
                    // Check if there's a resource node at this position
                    const cell = this.grid.getCell(cellX, cellY);
                    
                    // Check for a regular resource node
                    if (cell && cell.type === 'node') {
                        return cell.object;
                    }
                }
            }
        }
        
        return null;
    }
    
    startProcessing() {
        this.isProcessing = true;
        this.processingTime = 0;
        
        // For cargo loaders, don't consume yet (will be consumed on completion)
        if (this.type.id === 'cargo-loader') {
            return;
        }
        
        // For conveyors, don't consume (will be handled in transferResources)
        if (this.type.id === 'conveyor') {
            return;
        }
        
        // Consume input resources for processors
        for (const inputType of this.type.inputTypes) {
            if (this.inputInventory[inputType] > 0) {
                this.inputInventory[inputType]--;
            }
        }
    }
    
    completeProcessing() {
        this.isProcessing = false;
        this.processingTime = 0;
        this.progressBar.scaleX = 0;
        
        // Handle different machine types
        if (this.type.id === 'cargo-loader') {
            // Send resources to cargo bay
            for (const inputType of this.type.inputTypes) {
                if (this.inputInventory[inputType] > 0) {
                    // Try to add to cargo bay
                    if (this.scene.cargoBay.addProduct(inputType)) {
                        this.inputInventory[inputType]--;
                        
                        // Add score
                        const productReq = GAME_CONFIG.productRequirements.find(req => req.type === inputType);
                        if (productReq) {
                            this.scene.addScore(productReq.points);
                        }
                    }
                }
            }
        } else if (this.type.id === 'conveyor') {
            // For conveyors, move resources from input to output inventory
            for (const inputType of this.type.inputTypes) {
                if (this.inputInventory[inputType] > 0) {
                    // Initialize output inventory for this type if needed
                    if (!this.outputInventory[inputType]) {
                        this.outputInventory[inputType] = 0;
                    }
                    
                    // Move from input to output if there's space
                    if (this.outputInventory[inputType] < 5) {
                        this.inputInventory[inputType]--;
                        this.outputInventory[inputType]++;
                    }
                    
                    // Only process one resource type per cycle
                    break;
                }
            }
        } else {
            // For processors, produce output
            for (const outputType of this.type.outputTypes) {
                if (!this.outputInventory[outputType]) {
                    this.outputInventory[outputType] = 0;
                }
                
                if (this.outputInventory[outputType] < 5) {
                    this.outputInventory[outputType]++;
                }
            }
        }
    }
    
    transferResources() {
        // Skip if this is a cargo loader (it sends to cargo bay directly)
        if (this.type.id === 'cargo-loader') {
            return;
        }
        
        // Find connected machines in the output direction
        const connectedMachine = this.findConnectedMachine();
        if (!connectedMachine) {
            return;
        }
        
        // Try to transfer each output resource
        for (const outputType of this.type.outputTypes) {
            // Skip if we don't have this resource
            if (!this.outputInventory[outputType] || this.outputInventory[outputType] <= 0) {
                continue;
            }
            
            // Skip if the connected machine doesn't accept this resource
            if (!connectedMachine.type.inputTypes.includes(outputType)) {
                continue;
            }
            
            // Skip if the connected machine's input inventory is full
            if (connectedMachine.inputInventory[outputType] >= 5) {
                continue;
            }
            
            // Transfer the resource
            this.outputInventory[outputType]--;
            connectedMachine.inputInventory[outputType]++;
            
            // Create a visual effect for the transfer
            this.createResourceTransferEffect(outputType, connectedMachine);
            
            // Only transfer one resource per update
            break;
        }
    }
    
    findConnectedMachine() {
        // Get the position of the cell in the output direction
        let targetX = this.gridX;
        let targetY = this.gridY;
        
        // Adjust based on machine size and direction
        switch (this.direction) {
            case 'right':
                targetX = this.gridX + this.shape[0].length;
                targetY = this.gridY + Math.floor(this.shape.length / 2);
                break;
            case 'down':
                targetX = this.gridX + Math.floor(this.shape[0].length / 2);
                targetY = this.gridY + this.shape.length;
                break;
            case 'left':
                targetX = this.gridX - 1;
                targetY = this.gridY + Math.floor(this.shape.length / 2);
                break;
            case 'up':
                targetX = this.gridX + Math.floor(this.shape[0].length / 2);
                targetY = this.gridY - 1;
                break;
            case 'none':
                return null; // No output direction
        }
        
        // Check if there's a machine at the target position
        const cell = this.grid.getCell(targetX, targetY);
        if (cell && cell.type === 'machine') {
            return cell.machine;
        }
        
        return null;
    }
    
    createResourceTransferEffect(resourceType, targetMachine) {
        // Get source and target positions - containers are already centered
        const sourcePos = {
            x: this.container.x,
            y: this.container.y
        };
        
        const targetPos = {
            x: targetMachine.container.x,
            y: targetMachine.container.y
        };
        
        // Create resource particle
        const color = GAME_CONFIG.resourceColors[resourceType] || 0xaaaaaa;
        const particle = this.scene.add.circle(sourcePos.x, sourcePos.y, 5, color);
        
        // Animate particle moving to target
        this.scene.tweens.add({
            targets: particle,
            x: targetPos.x,
            y: targetPos.y,
            duration: 500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                particle.destroy();
            }
        });
    }
    
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
    
    // Add input and output resource type indicators
    addResourceTypeIndicators() {
        const width = this.shape[0].length * this.grid.cellSize;
        const height = this.shape.length * this.grid.cellSize;
        
        // Add a more prominent input indicator
        if (this.type.inputTypes.length > 0) {
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
                const inputTriangle = this.scene.add.triangle(
                    0, 
                    0, 
                    -4, -6,  // left top
                    -4, 6,   // left bottom
                    8, 0,    // right point
                    0x4aa8eb  // Brighter blue color (same as when dragging)
                ).setOrigin(0.5, 0.5);
                
                // Add a small circle at the base for better visibility
                const inputCircle = this.scene.add.circle(
                    0,
                    0,
                    4,
                    0x4aa8eb  // Brighter blue color (same as when dragging)
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
                
                console.log(`Input indicator for ${this.type.id}: direction=${inputDirection}, rotation=${inputContainer.rotation}`);
                
                inputContainer.isResourceIndicator = true;
                this.container.add(inputContainer);
            }
        }
        
        // The output indicator is already handled by the direction indicator
    }
} 