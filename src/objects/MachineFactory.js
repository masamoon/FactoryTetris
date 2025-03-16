import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import MachineRegistry from './machines/MachineRegistry';

export default class MachineFactory {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y - 10; // Move up slightly to prevent being cut off
        // Adjust the width and height for a better UI
        this.width = config.width * 2.0;  // Double the width for more spacing
        this.height = config.height * 1.0; // Use a more compact height
        
        // Initialize the machine registry
        this.machineRegistry = new MachineRegistry();
        
        // Available machines
        this.availableMachines = [];
        this.activeMachine = null;
        this.selectedMachineType = null;
        this.placementGhost = null;
        
        // Create visual representation
        this.createVisuals();
        
        // Create machine selection panel
        this.createMachineSelectionPanel();
        
        // Listen for pointer move to update ghost machine position
        this.scene.input.on('pointermove', this.updateGhostPosition, this);
        
        // Listen for pointer down to place machine
        this.scene.input.on('pointerdown', (pointer) => {
            this.handlePlaceMachine(pointer);
        }, this);
    }
    
    createVisuals() {
        // Create container for factory parts
        this.container = this.scene.add.container(this.x, this.y);
        
        // Create factory background with a more modern look
        this.background = this.scene.add.rectangle(0, 0, this.width, this.height, 0x2c3e50);
        this.background.setStrokeStyle(3, 0x34495e);
        this.container.add(this.background);
        
        // Create machine preview area with a cleaner look
        this.previewArea = this.scene.add.rectangle(0, 0, this.width - 30, this.height - 30, 0x1c2833);
        this.previewArea.setStrokeStyle(2, 0x2c3e50);
        this.container.add(this.previewArea);
        
        // Add a title for the machine selection panel
        /*const title = this.scene.add.text(
            0, 
            -this.height / 2 + 15, 
            "MACHINE SELECTION", 
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.container.add(title);*/
        
        // Create a container for the machine previews
        this.scrollContainer = this.scene.add.container(0, 0);
        this.container.add(this.scrollContainer);
        
        // Add some factory decorations
        //this.addDecorations();
    }
    
    addDecorations() {
        // Add some factory-themed decorations
        const gearSize = 20;
        const gear1 = this.scene.add.circle(-this.width / 2 + gearSize, -this.height / 2 + gearSize, gearSize, 0x666666);
        gear1.setStrokeStyle(2, 0x444444);
        this.container.add(gear1);
        
        const gear2 = this.scene.add.circle(this.width / 2 - gearSize, -this.height / 2 + gearSize, gearSize * 0.7, 0x666666);
        gear2.setStrokeStyle(2, 0x444444);
        this.container.add(gear2);
        
        // Add rotation animation
        this.scene.tweens.add({
            targets: gear1,
            rotation: Math.PI * 2,
            duration: 8000,
            repeat: -1,
            ease: 'Linear'
        });
        
        this.scene.tweens.add({
            targets: gear2,
            rotation: -Math.PI * 2,
            duration: 5000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    update() {
        // Skip update if no machine is selected
        if (!this.selectedMachineType) {
            return;
        }
        
        // Get the active pointer
        const pointer = this.scene.input.activePointer;
        
        // Only update placement preview if the pointer is over the game area
        if (!this.isPointerOverUI(pointer) && pointer.worldX && pointer.worldY) {
            // Call updatePlacementPreview with the selected machine type
            if (this.scene.updatePlacementPreview) {
                // Create a dummy machine object for the preview
                const previewMachine = {
                    id: this.selectedMachineType.id,
                    type: this.selectedMachineType.id,
                    shape: this.selectedMachineType.shape,
                    direction: this.selectedMachineType.direction || 'right',
                    rotation: this.selectedMachineType.rotation || 0,
                    machineType: this.selectedMachineType
                };
                
                this.scene.updatePlacementPreview(previewMachine);
            }
        }
    }
    
    createMachineSelectionPanel() {
        // Get all machine configurations from the registry
        const machineConfigs = this.machineRegistry.getAllMachineConfigs();
        
        // If no machines are registered yet, fall back to the game config
        const machineTypes = machineConfigs.length > 0 ? 
            machineConfigs : 
            GAME_CONFIG.machineTypes;
        
        // Reset availableMachines to ensure clean state
        this.availableMachines = [];
        
        // Calculate the number of machines per row
        const machinesPerRow = 3;
        const spacing = 80;
        const startX = -(machinesPerRow - 1) * spacing / 2;
        const startY = -this.height -25;
        
        
        // Create machine previews
        machineTypes.forEach((machineType, index) => {
            const row = Math.floor(index / machinesPerRow);
            const col = index % machinesPerRow;
            const x = startX + col * spacing;
            const y = startY + row * spacing;
            
            // Create machine preview
            let machinePreview;
            
            if (this.machineRegistry.hasMachineType(machineType.id)) {
                // Use the registry to create the preview
                machinePreview = this.machineRegistry.createMachinePreview(
                    machineType.id, 
                    this.scene, 
                    x, 
                    y
                );
            } else {
                // Fall back to the old method
                machinePreview = this.createMachinePreview(machineType, x, y);
            }
            
            // Add the preview to the container
            this.container.add(machinePreview);
            
            // Store the machine type with the preview
            machinePreview.machineType = machineType;
            
            // Make the preview interactive
            machinePreview.setInteractive(new Phaser.Geom.Rectangle(
                -30, -30, 60, 60
            ), Phaser.Geom.Rectangle.Contains);
            
            // Add hover effect
            machinePreview.on('pointerover', () => {
                // Scale up slightly
                machinePreview.setScale(1.1);
                
                // Show tooltip with machine info
                this.showMachineTooltip(machineType, x, y + 40);
            });
            
            machinePreview.on('pointerout', () => {
                // Reset scale
                machinePreview.setScale(1);
                
                // Hide tooltip
                this.hideMachineTooltip();
            });
            
            // Add click handler
            machinePreview.on('pointerdown', () => {
                // Select this machine type
                this.selectMachineType(machineType);
            });
            
            // Apply consistent colors to the preview
            if (machinePreview.list) {
                machinePreview.list.forEach(part => {
                    if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                        // Apply consistent color scheme
                        if (part === machinePreview.inputSquare) {
                            part.fillColor = 0x4aa8eb; // Brighter blue for input
                        } else if (part === machinePreview.outputSquare) {
                            part.fillColor = 0xffa520; // Brighter orange for output
                        } else {
                            part.fillColor = 0x44ff44; // Default green
                        }
                    }
                });
            }
            
            // Add to available machines only using the new structure
            this.availableMachines.push({
                preview: machinePreview,
                type: machineType
            });
        });
    }
    
    // Helper function to brighten a color
    brightenColor(color, percent) {
        const r = ((color >> 16) & 0xFF);
        const g = ((color >> 8) & 0xFF);
        const b = (color & 0xFF);
        
        const brightenedR = Math.min(255, r + (r * percent / 100));
        const brightenedG = Math.min(255, g + (g * percent / 100));
        const brightenedB = Math.min(255, b + (b * percent / 100));
        
        return (brightenedR << 16) | (brightenedG << 8) | brightenedB;
    }
    
    /**
     * Select a machine type and create a ghost for placement
     * @param {Object} machineType - The machine type to select
     */
    selectMachineType(machineType) {
        // Deselect any previously selected machine
        this.clearSelection();
        
        // Double check that the machine type has a proper shape
        if (!machineType.shape || !Array.isArray(machineType.shape)) {
            // Set appropriate default shapes based on machine type
            switch(machineType.id) {
                case 'extractor':
                    machineType.shape = [[1, 1], [1, 1]]; // 2x2 shape
                    break;
                case 'processor-a':
                    machineType.shape = [[1, 1, 1], [1, 0, 0]]; // 3x2 shape
                    break;
                case 'processor-b':
                    machineType.shape = [[0, 1, 0], [1, 1, 1]]; // 3x2 shape
                    break;
                case 'advanced-processor':
                    machineType.shape = [[0, 1, 0], [1, 1, 1], [0, 1, 0]]; // 3x3 shape
                    break;
                case 'conveyor':
                    machineType.shape = [[1, 1]]; // 2x1 shape
                    break;
                case 'cargo-loader':
                    machineType.shape = [[1, 1], [1, 1]]; // 2x2 shape
                    break;
                default:
                    machineType.shape = [[1]]; // 1x1 shape as fallback
            }
        }
        
        // Set the selected machine type
        this.selectedMachineType = machineType;
        
        // REMOVED GHOST MACHINE CREATION - Instead, create placement preview directly
        // No need to create a ghost machine here, we'll use the scene's placement preview
        
        // Highlight the selected machine preview
        const machinePreview = this.availableMachines.find(m => m.type.id === machineType.id);
        if (machinePreview) {
            machinePreview.preview.setAlpha(1);
            
            // Add a selection indicator around the machine
            const size = this.scene.game.config.width > 1000 ? 40 : 35;
            const selectionGraphics = this.scene.add.graphics();
            selectionGraphics.lineStyle(2, 0xffff00, 1);
            selectionGraphics.strokeRect(-size/2, -size/2, size, size);
            machinePreview.preview.add(selectionGraphics);
            this.selectionGraphics = selectionGraphics;
            
            // Add a pulsating effect
            this.scene.tweens.add({
                targets: selectionGraphics,
                alpha: { from: 1, to: 0.4 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }
        
        // Notify any listeners (e.g., the scene)
        this.scene.events.emit('machineSelected', machineType);
        
        // Create placement preview in the scene
        if (this.scene.createPlacementPreview) {
            this.scene.createPlacementPreview({
                id: machineType.id,
                type: machineType.id,
                shape: machineType.shape,
                direction: machineType.defaultDirection || 'right',
                rotation: 0,
                machineType: machineType
            });
        }
    }
    
    // Clear the current selection
    clearSelection() {
        // Reset the selected machine type
        this.selectedMachineType = null;
        
        // Reset all machine previews
        this.availableMachines.forEach(machine => {
            machine.preview.setAlpha(0.7);
        });
        
        // Remove any selection graphics
        if (this.selectionGraphics) {
            this.selectionGraphics.destroy();
            this.selectionGraphics = null;
        }
        
        // Remove any existing placement preview
        if (this.scene.removePlacementPreview) {
            this.scene.removePlacementPreview();
        }
        
        // Notify the scene about the deselection
        this.scene.events.emit('machineDeselected');
    }
    
    /**
     * Create a ghost machine to follow the cursor
     * @param {Object} machineType - The machine type to create
     */
    createGhostMachine(machineType) {
        // Clear any existing ghost machine
        if (this.placementGhost) {
            this.placementGhost.destroy();
            this.placementGhost = null;
        }
        
        // Create a new ghost container
        this.placementGhost = this.scene.add.container(0, 0);
        
        // Store the machine type for reference
        this.placementGhost.machineType = machineType;
        
        // Make sure the shape is valid
        if (!machineType.shape || !Array.isArray(machineType.shape)) {
            machineType.shape = [[1]]; // Fallback to 1x1 shape
        }
        
        // Set initial direction from machineType
        this.placementGhost.direction = machineType.direction || 'right';
        this.placementGhost.rotation = 0; // Initial rotation in degrees
        
        // Set shape properties
        this.placementGhost.shape = machineType.shape;
        this.placementGhost.id = machineType.id;
        this.placementGhost.type = machineType.id;
        
        // Draw the machine shape
        const cellSize = 32;
        const shapeWidth = machineType.shape[0].length;
        const shapeHeight = machineType.shape.length;
        
        for (let y = 0; y < shapeHeight; y++) {
            for (let x = 0; x < shapeWidth; x++) {
                if (machineType.shape[y][x] === 1) {
                    // Calculate position relative to center of shape
                    const offsetX = (x - (shapeWidth - 1) / 2) * cellSize;
                    const offsetY = (y - (shapeHeight - 1) / 2) * cellSize;
                    
                    // Create cell graphic
                    const cell = this.scene.add.rectangle(offsetX, offsetY, cellSize - 4, cellSize - 4, 0x44ff44, 0.6);
                    cell.setStrokeStyle(1, 0xffffff);
                    this.placementGhost.add(cell);
                }
            }
        }
        
        // Add direction indicator
        this.placementGhost.directionIndicator = this.createDirectionIndicator(0, 0, this.placementGhost.direction);
        this.placementGhost.add(this.placementGhost.directionIndicator);
        
        // Initialize rotation to match direction
        this.updateGhostRotation();
        
        // Notify scene that a machine has been selected
        this.scene.events.emit('machineSelected', machineType);
    }
    
    /**
     * Update the ghost machine position to follow the pointer
     * @param {Phaser.Input.Pointer} pointer - The pointer to follow
     */
    updateGhostPosition(pointer) {
        // Check if we have a ghost and are in placement mode
        if (!this.placementGhost || !this.selectedMachineType) {
            return;
        }
        
        // Move the ghost to follow the pointer
        this.placementGhost.x = pointer.x;
        this.placementGhost.y = pointer.y;
        
        // Get grid position
        if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
            const gridPos = this.scene.factoryGrid.worldToGrid(pointer.x, pointer.y);
            if (gridPos) {
                // Snap to grid
                const worldPos = this.scene.factoryGrid.gridToWorld(gridPos.x, gridPos.y);
                this.placementGhost.x = worldPos.x;
                this.placementGhost.y = worldPos.y;
                
                // Check if the machine can be placed here
                const canPlace = this.scene.factoryGrid.canPlaceMachine(
                    this.selectedMachineType,
                    gridPos.x,
                    gridPos.y,
                    this.placementGhost.rotation || 0
                );
                
                // Update ghost appearance based on placement validity
                const alpha = canPlace ? 0.8 : 0.4;
                this.placementGhost.list.forEach(item => {
                    if (item.type === 'Rectangle' && !item.isDirectionIndicator) {
                        item.fillColor = canPlace ? 0x44ff44 : 0xff4444;
                        item.alpha = alpha;
                    }
                });
                
                // Update placement preview if available
                if (this.scene.updatePlacementPreview) {
                    // Create a dummy machine with the necessary properties
                    const previewMachine = {
                        id: this.selectedMachineType.id,
                        type: this.selectedMachineType.id,
                        shape: this.selectedMachineType.shape,
                        direction: this.placementGhost.direction,
                        rotation: this.placementGhost.rotation,
                        machineType: this.selectedMachineType
                    };
                    
                    this.scene.updatePlacementPreview(previewMachine);
                }
            }
        } else {
            // Pointer is outside the grid
            this.placementGhost.list.forEach(item => {
                if (item.type === 'Rectangle' && !item.isDirectionIndicator) {
                    item.fillColor = 0xff4444;
                    item.alpha = 0.4;
                }
            });
        }
    }
    
    /**
     * Handle placing a machine at the pointer's current position
     * @param {Phaser.Input.Pointer} pointer - The pointer to use for placement
     */
    handlePlaceMachine(pointer) {
        // Check if we have a selected machine type
        if (!this.selectedMachineType) {
            return;
        }
        
        // Prevent placing machines over UI elements
        if (this.isPointerOverUI(pointer)) {
            return;
        }
        
        // Check if the pointer is over the factory grid
        if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
            // Get the grid position from the pointer
            const gridPos = this.scene.factoryGrid.worldToGrid(pointer.x, pointer.y);
            if (!gridPos) {
                return;
            }
            
            // Check if we can place the machine at the grid position
            const canPlace = this.scene.factoryGrid.canPlaceMachine(
                this.selectedMachineType,
                gridPos.x,
                gridPos.y,
                this.selectedMachineType.direction || 0
            );
            
            if (canPlace) {
                try {
                    // Place the machine using the scene's placeMachine method
                    const placedMachine = this.scene.placeMachine(
                        this.selectedMachineType,
                        gridPos.x,
                        gridPos.y,
                        this.selectedMachineType.rotation || 0
                    );
                    
                    if (placedMachine) {
                        // Play a placement sound
                        this.scene.playSound('place');
                        
                        // We may NOT want to clear the selection to allow placing multiple machines
                        // Uncomment the next line to clear selection after placement
                        // this.clearSelection();
                    }
                } catch (error) {
                    // Error during machine placement
                }
            }
        }
    }
    
    // Check if pointer is over the UI panel
    isPointerOverUI(pointer) {
        // Calculate UI bounds
        const uiBounds = {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
        
        // Check if pointer is within UI bounds
        return (
            pointer.x >= uiBounds.left &&
            pointer.x <= uiBounds.right &&
            pointer.y >= uiBounds.top &&
            pointer.y <= uiBounds.bottom
        );
    }
    
    // Helper function to get direction from rotation
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
    
    // Create a machine preview for display or placement
    createMachinePreview(machineType, xOffset = 0, yOffset = 0) {
        if (!machineType || !machineType.shape) {
            return null;
        }
        
        // Get cell size from grid
        const cellSize = this.scene.factoryGrid ? this.scene.factoryGrid.cellSize : 24;
        
        // Create container for preview machine
        const container = this.scene.add.container(xOffset, yOffset);
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        if (machineType.direction !== 'none') {
            // For machines with direction, determine input and output positions
            switch (machineType.direction) {
                case 'right':
                    // Input on left side, output on right side
                    inputPos = { x: 0, y: Math.floor(machineType.shape.length / 2) };
                    outputPos = { x: machineType.shape[0].length - 1, y: Math.floor(machineType.shape.length / 2) };
                    break;
                case 'down':
                    // Input on top side, output on bottom side
                    inputPos = { x: Math.floor(machineType.shape[0].length / 2), y: 0 };
                    outputPos = { x: Math.floor(machineType.shape[0].length / 2), y: machineType.shape.length - 1 };
                    break;
                case 'left':
                    // Input on right side, output on left side
                    inputPos = { x: machineType.shape[0].length - 1, y: Math.floor(machineType.shape.length / 2) };
                    outputPos = { x: 0, y: Math.floor(machineType.shape.length / 2) };
                    break;
                case 'up':
                    // Input on bottom side, output on top side
                    inputPos = { x: Math.floor(machineType.shape[0].length / 2), y: machineType.shape.length - 1 };
                    outputPos = { x: Math.floor(machineType.shape[0].length / 2), y: 0 };
                    break;
            }
        }
        
        // Calculate the shape center in terms of cells
        const shapeCenterX = (machineType.shape[0].length - 1) / 2;
        const shapeCenterY = (machineType.shape.length - 1) / 2;
        
        // Create machine parts based on shape
        for (let y = 0; y < machineType.shape.length; y++) {
            for (let x = 0; x < machineType.shape[y].length; x++) {
                if (machineType.shape[y][x] === 1) {
                    // Calculate part position relative to center of the machine
                    const offsetX = (x - shapeCenterX) * cellSize;
                    const offsetY = (y - shapeCenterY) * cellSize;
                    const partX = offsetX;
                    const partY = offsetY;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x44ff44; // Default green color
                    
                    // For extractors, only color the output
                    if (machineType.id === 'extractor') {
                        if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xffa520; // Brighter orange for extractor output
                        }
                    } 
                    // For cargo loaders, only color the inputs
                    else if (machineType.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === machineType.shape[0].length - 1 || y === 0 || y === machineType.shape.length - 1)) {
                            partColor = 0x4aa8eb; // Brighter blue for input
                        }
                    }
                    // For all other machines with direction
                    else if (machineType.direction !== 'none') {
                        if (x === inputPos.x && y === inputPos.y) {
                            partColor = 0x4aa8eb; // Brighter blue for input
                        } else if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xffa520; // Brighter orange for output
                        }
                    }
                    
                    // Create machine part
                    const part = this.scene.add.rectangle(partX, partY, cellSize - 4, cellSize - 4, partColor);
                    container.add(part);
                    
                    // Store references to input and output squares
                    if (machineType.id !== 'extractor' && machineType.direction !== 'none' && x === inputPos.x && y === inputPos.y) {
                        container.inputSquare = part;
                    } else if (machineType.direction !== 'none' && x === outputPos.x && y === outputPos.y) {
                        container.outputSquare = part;
                    }
                }
            }
        }
        
        // Add machine type indicator at the center of the machine
        const machineLabel = this.scene.add.text(
            0, 
            0, 
            machineType.id.charAt(0).toUpperCase(), 
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        container.add(machineLabel);
        
        // Add direction indicator if not a cargo loader
        if (machineType.direction !== 'none') {
            container.directionIndicator = this.createDirectionIndicator(0, 0, machineType.direction);
            container.add(container.directionIndicator);
        }
        
        // Add input/output indicators
        this.addResourceIndicators(container, machineType, cellSize);
        
        return container;
    }
    
    // Create a direction indicator for machine previews
    createDirectionIndicator(centerX, centerY, direction) {
        // Determine color based on machine type
        let indicatorColor = 0xff9500;  // Default orange color
        
        // Create a triangle pointing in the direction of output - directly at the specified position
        const indicator = this.scene.add.triangle(
            centerX, 
            centerY, 
            -4, -6,  // left top
            -4, 6,   // left bottom
            8, 0,    // right point
            indicatorColor
        ).setOrigin(0.5, 0.5);
        
        // Rotate based on direction
        switch (direction) {
            case 'right':
                indicator.rotation = 0; // Point right (0 degrees)
                break;
            case 'down':
                indicator.rotation = Math.PI / 2; // Point down (90 degrees)
                break;
            case 'left':
                indicator.rotation = Math.PI; // Point left (180 degrees)
                break;
            case 'up':
                indicator.rotation = 3 * Math.PI / 2; // Point up (270 degrees)
                break;
        }
        
        return indicator;
    }
    
    // Add input and output resource indicators to the machine preview
    addResourceIndicators(container, machineType, cellSize) {
        const width = machineType.shape[0].length * cellSize;
        const height = machineType.shape.length * cellSize;
        
        // Add a more prominent input indicator
        if (machineType.inputTypes.length > 0 && machineType.id !== 'extractor') {
            // Determine input direction (opposite of output direction)
            let inputDirection = 'none';
            switch (machineType.direction) {
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
                container.add(inputContainer);
            }
        }
        
        // The output indicator is already handled by the direction indicator
    }
    
    /**
     * Creates a machine instance
     * @param {string|Object} typeOrId - The machine type ID or object
     * @param {number} gridX - The x coordinate on the grid
     * @param {number} gridY - The y coordinate on the grid
     * @param {string} direction - The direction the machine is facing
     * @param {number} rotation - The rotation of the machine in degrees
     * @param {Grid} grid - The grid to place the machine on
     * @param {Object} presetPosition - Optional exact position override
     * @returns {BaseMachine} The created machine instance
     */
    createMachine(typeOrId, gridX, gridY, direction, rotation = 0, grid = null, presetPosition = null) {
        try {
            // Determine if we're using the new (ID string) or old (type object) format
            const isTypeObject = typeof typeOrId === 'object' && typeOrId !== null;
            const machineTypeId = isTypeObject ? typeOrId.id : typeOrId;
            
            // Ensure we have a valid grid reference
            const gridRef = grid || this.scene.factoryGrid || this.scene.grid;
            
            if (!gridRef) {
                return null;
            }
            
            // Check if the registry has this machine type
            if (!this.machineRegistry || !this.machineRegistry.hasMachineType(machineTypeId)) {
                return null;
            }
            
            // Build the configuration with all parameters
            const config = {
                grid: gridRef,
                gridX: gridX,
                gridY: gridY,
                direction: direction,
                rotation: rotation
            };
            
            // Add preset position if provided
            if (presetPosition) {
                config.presetPosition = presetPosition;
            }
            
            // Use the registry to create the machine
            const machine = this.machineRegistry.createMachine(machineTypeId, this.scene, config);
            
            return machine;
        } catch (error) {
            return null;
        }
    }

    /**
     * Show a tooltip with machine information
     * @param {Object} machineType - The machine type to show info for
     * @param {number} x - X position for the tooltip
     * @param {number} y - Y position for the tooltip
     */
    showMachineTooltip(machineType, x, y) {
        // Remove any existing tooltip
        this.hideMachineTooltip();
        
        // Create tooltip container
        this.tooltip = this.scene.add.container(x, y);
        this.container.add(this.tooltip);
        
        // Create tooltip background
        const padding = 10;
        const tooltipBg = this.scene.add.rectangle(
            0, 
            0, 
            200, 
            80, 
            0x000000, 
            0.8
        );
        tooltipBg.setStrokeStyle(1, 0xffffff, 0.5);
        this.tooltip.add(tooltipBg);
        
        // Add machine name
        const nameText = this.scene.add.text(
            0, 
            -25, 
            machineType.name, 
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.tooltip.add(nameText);
        
        // Add machine description (truncated if too long)
        let description = machineType.description;
        if (description.length > 60) {
            description = description.substring(0, 57) + '...';
        }
        
        const descText = this.scene.add.text(
            0, 
            0, 
            description, 
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#cccccc',
                align: 'center',
                wordWrap: { width: 180 }
            }
        ).setOrigin(0.5);
        this.tooltip.add(descText);
        
        // Add input/output info
        let ioText = '';
        if (machineType.inputTypes && machineType.inputTypes.length > 0) {
            ioText += 'In: ' + machineType.inputTypes.join(', ');
        }
        if (machineType.outputTypes && machineType.outputTypes.length > 0) {
            if (ioText) ioText += '\n';
            ioText += 'Out: ' + machineType.outputTypes.join(', ');
        }
        
        const ioInfoText = this.scene.add.text(
            0, 
            25, 
            ioText, 
            {
                fontFamily: 'Arial',
                fontSize: 10,
                color: '#aaaaaa',
                align: 'center'
            }
        ).setOrigin(0.5);
        this.tooltip.add(ioInfoText);
        
        // Adjust background height based on content
        tooltipBg.height = Math.max(80, 50 + descText.height + ioInfoText.height);
        
        // Add a small animation
        this.tooltip.setScale(0.9);
        this.scene.tweens.add({
            targets: this.tooltip,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }

    /**
     * Hide the machine tooltip
     */
    hideMachineTooltip() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }
    
    /**
     * Create a machine of the specified type at the given position
     * @param {Object} machineType - The machine type to create
     * @param {number} x - X position for the machine
     * @param {number} y - Y position for the machine
     * @returns {Phaser.GameObjects.Container} The created machine
     */
    createMachineOfType(machineType, x, y) {
        // Create the machine using the preview method
        const machine = this.createMachinePreview(machineType, x, y);
        
        if (machine) {
            // Add to container
            this.container.add(machine);
            
            // Make the preview interactive
            machine.setInteractive(new Phaser.Geom.Rectangle(
                -30, -30, 60, 60
            ), Phaser.Geom.Rectangle.Contains);
            
            // Add hover effect
            machine.on('pointerover', () => {
                // Scale up slightly
                machine.setScale(1.1);
                
                // Show tooltip with machine info
                this.showMachineTooltip(machineType, x, y + 40);
            });
            
            machine.on('pointerout', () => {
                // Reset scale
                machine.setScale(1);
                
                // Hide tooltip
                this.hideMachineTooltip();
            });
            
            // Add click handler
            machine.on('pointerdown', () => {
                // Select this machine type
                this.selectMachineType(machineType);
            });
            
            // Store in available machines
            this.availableMachines.push({
                preview: machine,
                type: machineType
            });
        }
        
        return machine;
    }

    /**
     * Get machine type information by ID
     * @param {string} id - The machine type ID
     * @returns {Object|null} The machine type object or null if not found
     */
    getMachineTypeById(id) {
        try {
            // Check if we have a machineRegistry
            if (this.machineRegistry && typeof this.machineRegistry.getMachineConfig === 'function') {
                // Use the registry to get the machine configuration
                return this.machineRegistry.getMachineConfig(id);
            }
            
            // Look in the availableMachines array as a fallback
            if (this.availableMachines && Array.isArray(this.availableMachines)) {
                for (const machineEntry of this.availableMachines) {
                    if (machineEntry.type && machineEntry.type.id === id) {
                        return machineEntry.type;
                    }
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Updates the ghost machine's rotation to match the selected machine type
     */
    updateGhostRotation() {
        if (!this.placementGhost) {
            return;
        }
        
        if (!this.selectedMachineType) {
            return;
        }
        
        // Get the rotation from the selected machine type
        let rotationDegrees = 0;
        if (this.selectedMachineType.rotationDegrees !== undefined) {
            rotationDegrees = this.selectedMachineType.rotationDegrees;
        } else if (this.selectedMachineType.rotation !== undefined) {
            // Convert from radians if needed
            if (this.selectedMachineType.rotation < 10) { // Likely radians
                rotationDegrees = Math.round(this.selectedMachineType.rotation * 180 / Math.PI);
            } else { // Already in degrees
                rotationDegrees = this.selectedMachineType.rotation;
            }
        }
        
        // Update the ghost's direction based on rotation
        let direction;
        switch (rotationDegrees) {
            case 0:
                direction = 'right';
                break;
            case 90:
                direction = 'down';
                break;
            case 180:
                direction = 'left';
                break;
            case 270:
                direction = 'up';
                break;
            default:
                direction = 'right'; // Default
        }
        
        this.placementGhost.direction = direction;
        
        // Update the direction indicator
        if (this.placementGhost.directionIndicator) {
            // Remove the old indicator
            this.placementGhost.remove(this.placementGhost.directionIndicator);
            this.placementGhost.directionIndicator.destroy();
            
            // Create a new indicator with the updated direction
            this.placementGhost.directionIndicator = this.createDirectionIndicator(0, 0, direction);
            this.placementGhost.add(this.placementGhost.directionIndicator);
        }
    }

    /**
     * Rotates the currently selected machine 90 degrees clockwise
     */
    rotateMachine() {
        console.log('[MACHINE_FACTORY] rotateMachine called');
        
        // Only rotate if we have a machine type selected
        if (!this.selectedMachineType) {
            console.log('[MACHINE_FACTORY] No machine selected to rotate');
            return;
        }
        
        // Instead of using radians, use degrees directly (0, 90, 180, 270)
        // Get current rotation in degrees or default to 0
        let currentRotationDegrees = 0;
        
        if (this.selectedMachineType.rotationDegrees !== undefined) {
            currentRotationDegrees = this.selectedMachineType.rotationDegrees;
        } else if (this.selectedMachineType.rotation !== undefined) {
            // Convert from radians if we have that instead
            if (this.selectedMachineType.rotation < 10) { // Likely radians
                currentRotationDegrees = Math.round(this.selectedMachineType.rotation * 180 / Math.PI);
            } else { // Already in degrees
                currentRotationDegrees = this.selectedMachineType.rotation;
            }
        }
        
        // Add 90 degrees for clockwise rotation
        let newRotationDegrees = (currentRotationDegrees + 90) % 360;
        
        // Store both radians and degrees for compatibility
        const newRotationRadians = newRotationDegrees * Math.PI / 180;
        this.selectedMachineType.rotation = newRotationRadians;
        this.selectedMachineType.rotationDegrees = newRotationDegrees;
        
        // Update direction based on rotation degrees
        let newDirection;
        switch (newRotationDegrees) {
            case 0:
                newDirection = 'right';
                break;
            case 90:
                newDirection = 'down';
                break;
            case 180:
                newDirection = 'left';
                break;
            case 270:
                newDirection = 'up';
                break;
            default:
                newDirection = 'right'; // Default
        }
        
        this.selectedMachineType.direction = newDirection;
        
        // Update the ghost machine's rotation
        this.updateGhostRotation();
        
        // Update the placement preview
        if (this.scene.updatePlacementPreview) {
            const previewMachine = {
                id: this.selectedMachineType.id,
                type: this.selectedMachineType.id,
                shape: this.selectedMachineType.shape,
                direction: this.selectedMachineType.direction,
                rotation: newRotationDegrees, // Pass rotation in degrees
                rotationDegrees: newRotationDegrees, // Explicit degrees property
                machineType: this.selectedMachineType
            };
            
            this.scene.updatePlacementPreview(previewMachine);
        }
    }
} 