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
        this.scene.input.on('pointerdown', this.handlePlaceMachine, this);
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
        const title = this.scene.add.text(
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
        this.container.add(title);
        
        // Create a container for the machine previews
        this.scrollContainer = this.scene.add.container(0, 0);
        this.container.add(this.scrollContainer);
        
        // Add some factory decorations
        this.addDecorations();
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
        // Nothing to update for now
    }
    
    createMachineSelectionPanel() {
        // Get all machine configurations from the registry
        const machineConfigs = this.machineRegistry.getAllMachineConfigs();
        
        // If no machines are registered yet, fall back to the game config
        const machineTypes = machineConfigs.length > 0 ? 
            machineConfigs : 
            GAME_CONFIG.machineTypes;
        
        // Calculate the number of machines per row
        const machinesPerRow = 3;
        const spacing = 80;
        const startX = -(machinesPerRow - 1) * spacing / 2;
        const startY = -this.height / 4;
        
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
            
            // Add to available machines
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
    
    // Select a machine type and create a ghost for placement
    selectMachineType(machineType) {
        // Clear any existing selection
        this.clearSelection();
        
        // Set the selected machine type
        this.selectedMachineType = machineType.id;
        
        console.log(`Selected machine type: ${machineType.id}`);
        
        // Highlight the selected machine in the UI
        if (this.availableMachines && Array.isArray(this.availableMachines)) {
            this.availableMachines.forEach(machineEntry => {
                // Check if we have the new structure (with preview and type properties)
                if (machineEntry.preview && machineEntry.type && machineEntry.type.id === machineType.id) {
                    const preview = machineEntry.preview;
                    
                    // Highlight with a green tint
                    if (preview.list) {
                        preview.list.forEach(part => {
                            if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                                part.fillColor = 0x44ff44; // Green tint
                            }
                        });
                    }
                    
                    // Scale up slightly
                    preview.setScale(1.2);
                    
                    // Add a glow effect
                    if (!preview.glowEffect) {
                        preview.glowEffect = this.scene.add.graphics();
                        preview.glowEffect.fillStyle(0x44ff44, 0.3);
                        const padding = 10;
                        preview.glowEffect.fillRoundedRect(
                            preview.x - 30, 
                            preview.y - 30, 
                            60, 
                            60, 
                            8
                        );
                        this.container.add(preview.glowEffect);
                        preview.glowEffect.setDepth(preview.depth - 1);
                    }
                    
                    // Add a pulse animation
                    if (!preview.pulseAnimation) {
                        preview.pulseAnimation = this.scene.tweens.add({
                            targets: preview,
                            scaleX: 1.3,
                            scaleY: 1.3,
                            duration: 800,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                }
                // Handle the old structure (where machineEntry is the machine itself)
                else if (machineEntry.machineTypeId === machineType.id) {
                    // Highlight with a green tint
                    machineEntry.list.forEach(part => {
                        if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                            part.fillColor = 0x44ff44; // Green tint
                        }
                    });
                    
                    // Scale up slightly
                    machineEntry.setScale(1.2);
                    
                    // Add a glow effect
                    if (!machineEntry.glowEffect) {
                        machineEntry.glowEffect = this.scene.add.graphics();
                        machineEntry.glowEffect.fillStyle(0x44ff44, 0.3);
                        const padding = 10;
                        machineEntry.glowEffect.fillRoundedRect(
                            machineEntry.x - (machineEntry.width * machineEntry.scaleX) / 2 - padding,
                            machineEntry.y - (machineEntry.height * machineEntry.scaleY) / 2 - padding,
                            machineEntry.width * machineEntry.scaleX + padding * 2,
                            machineEntry.height * machineEntry.scaleY + padding * 2,
                            8
                        );
                        this.container.add(machineEntry.glowEffect);
                        machineEntry.glowEffect.setDepth(machineEntry.depth - 1);
                    }
                    
                    // Add a pulse animation
                    if (!machineEntry.pulseAnimation) {
                        machineEntry.pulseAnimation = this.scene.tweens.add({
                            targets: machineEntry,
                            scaleX: 1.3,
                            scaleY: 1.3,
                            duration: 800,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                    
                    // Highlight the label
                    if (machineEntry.label) {
                        machineEntry.label.setColor('#44ff44');
                        machineEntry.label.setFontStyle('bold');
                    }
                }
            });
        }
        
        // Create a ghost machine for placement
        this.createGhostMachine(machineType);
        
        // Add a temporary instruction text
        if (!this.placementInstruction) {
            this.placementInstruction = this.scene.add.text(
                this.scene.cameras.main.width / 2,
                this.scene.cameras.main.height - 50,
                "Click to place machine, 'R' to rotate, 'ESC' to cancel",
                {
                    fontFamily: 'Arial',
                    fontSize: 16,
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 10, y: 5 }
                }
            ).setOrigin(0.5);
            this.placementInstruction.setDepth(1000);
        }
    }
    
    // Clear the current selection
    clearSelection() {
        // Remove highlight from all machines
        if (this.availableMachines && Array.isArray(this.availableMachines)) {
            this.availableMachines.forEach(machineEntry => {
                // Check if we have the new structure (with preview and type properties)
                if (machineEntry.preview && machineEntry.type) {
                    const preview = machineEntry.preview;
                    
                    // Reset scale
                    preview.setScale(1);
                    
                    // Reset colors if the preview has a list of parts
                    if (preview.list) {
                        preview.list.forEach(part => {
                            if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                                // Restore original color
                                if (part === preview.inputSquare) {
                                    part.fillColor = 0x3498db; // Blue for input
                                } else if (part === preview.outputSquare) {
                                    if (machineEntry.type.id === 'extractor') {
                                        part.fillColor = 0xd35400; // Darker orange for extractor output
                                    } else {
                                        part.fillColor = 0xff9500; // Regular orange for output
                                    }
                                } else {
                                    part.fillColor = 0x4a6fb5; // Default blue
                                }
                            }
                        });
                    }
                    
                    // Remove glow effect if it exists
                    if (preview.glowEffect) {
                        preview.glowEffect.destroy();
                        preview.glowEffect = null;
                    }
                    
                    // Stop pulse animation if it exists
                    if (preview.pulseAnimation) {
                        this.scene.tweens.remove(preview.pulseAnimation);
                        preview.pulseAnimation = null;
                    }
                } 
                // Handle the old structure (where machineEntry is the machine itself)
                else if (machineEntry.list) {
                    machineEntry.list.forEach(part => {
                        if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                            // Restore original color
                            if (part === machineEntry.inputSquare) {
                                part.fillColor = 0x3498db; // Blue for input
                            } else if (part === machineEntry.outputSquare) {
                                if (machineEntry.machineTypeId === 'extractor') {
                                    part.fillColor = 0xd35400; // Darker orange for extractor output
                                } else {
                                    part.fillColor = 0xff9500; // Regular orange for output
                                }
                            } else {
                                part.fillColor = 0x4a6fb5; // Default blue
                            }
                        }
                    });
                    
                    // Reset scale
                    machineEntry.setScale(1.1);
                    
                    // Remove glow effect if it exists
                    if (machineEntry.glowEffect) {
                        machineEntry.glowEffect.destroy();
                        machineEntry.glowEffect = null;
                    }
                    
                    // Stop pulse animation if it exists
                    if (machineEntry.pulseAnimation) {
                        this.scene.tweens.remove(machineEntry.pulseAnimation);
                        machineEntry.pulseAnimation = null;
                    }
                    
                    // Reset label color if it exists
                    if (machineEntry.label) {
                        machineEntry.label.setColor('#ffffff');
                        machineEntry.label.setFontStyle('normal');
                    }
                }
            });
        }
        
        // Clear any existing ghost machine
        if (this.placementGhost) {
            this.placementGhost.destroy();
            this.placementGhost = null;
        }
        
        // Clear any existing placement preview
        if (this.scene.placementPreview) {
            this.scene.removePlacementPreview();
        }
        
        // Clear any existing placement instruction
        if (this.placementInstruction) {
            this.placementInstruction.destroy();
            this.placementInstruction = null;
        }
        
        // Clear the selected machine type
        this.selectedMachineType = null;
        
        console.log('Selection cleared');
    }
    
    // Create a ghost machine for placement
    createGhostMachine(machineType) {
        // Remove existing ghost if any
        if (this.placementGhost) {
            this.placementGhost.destroy();
            
            // Also remove any existing placement preview
            if (this.scene.placementPreview) {
                this.scene.removePlacementPreview();
            }
        }
        
        // Create a new ghost machine
        const pointer = this.scene.input.activePointer;
        
        // Try to use the registry to create the preview if available
        if (this.machineRegistry && this.machineRegistry.hasMachineType(machineType.id)) {
            this.placementGhost = this.machineRegistry.createMachinePreview(
                machineType.id,
                this.scene,
                0,
                0
            );
        } else {
            // Fall back to the old method
            this.placementGhost = this.createMachinePreview(machineType, 0, 0);
        }
        
        if (this.placementGhost) {
            // Add to scene (not to the UI container)
            this.scene.add.existing(this.placementGhost);
            
            // Set initial position to pointer
            this.placementGhost.x = pointer.x;
            this.placementGhost.y = pointer.y;
            
            // Make semi-transparent
            this.placementGhost.alpha = 0.7;
            
            // Set a flag to identify this as a ghost
            this.placementGhost.isGhost = true;
            
            // Store the machine type for reference
            this.placementGhost.machineType = machineType;
            
            // Create placement preview
            this.scene.createPlacementPreview(this.placementGhost);
            
            console.log(`Created ghost machine of type ${machineType.id} at position ${pointer.x}, ${pointer.y}`);
        }
    }
    
    // Update ghost machine position with pointer
    updateGhostPosition(pointer) {
        if (this.placementGhost) {
            // Don't update position if pointer is over the UI
            if (this.isPointerOverUI(pointer)) {
                // Make the ghost semi-transparent when over UI
                this.placementGhost.alpha = 0.3;
                
                // Hide placement preview when over UI
                if (this.scene.placementPreview) {
                    this.scene.placementPreview.visible = false;
                }
                
                return;
            }
            
            // Restore normal transparency when not over UI
            this.placementGhost.alpha = 0.7;
            
            // Show placement preview when not over UI
            if (this.scene.placementPreview) {
                this.scene.placementPreview.visible = true;
            }
            
            // Update position to follow pointer
            this.placementGhost.x = pointer.x;
            this.placementGhost.y = pointer.y;
            
            // Update placement preview
            this.scene.updatePlacementPreview(this.placementGhost);
        }
    }
    
    // Handle machine placement
    handlePlaceMachine(pointer) {
        // First check if pointer is over the UI panel
        if (this.isPointerOverUI(pointer)) {
            // If we're clicking on the UI panel, we might be selecting a machine
            // This is handled by the individual machine's pointerdown event
            return;
        }
        
        // If we have a ghost machine, try to place it
        if (this.placementGhost && this.selectedMachineType) {
            // Check if the machine can be placed
            if (this.scene.factoryGrid.isInBounds(pointer.x, pointer.y)) {
                const gridPosition = this.scene.factoryGrid.worldToGrid(pointer.x, pointer.y);
                
                // Get the machine type
                const machineType = this.placementGhost.machineType;
                
                // Get the rotation (default to 0 if not set)
                const rotation = this.placementGhost.rotation !== undefined ? this.placementGhost.rotation : 0;
                
                // Try to place the machine using the scene's placeMachine method
                const placedMachine = this.scene.placeMachine(
                    machineType,
                    gridPosition.x,
                    gridPosition.y,
                    rotation
                );
                
                if (placedMachine) {
                    // Clear the selection after successful placement
                    this.clearSelection();
                    
                    // Set the machine's direction based on rotation
                    const direction = this.getDirectionFromRotation(rotation);
                    placedMachine.direction = direction;
                    console.log(`Machine direction: ${direction}`);
                    
                    // Ensure the machine is not selected after placement
                    if (placedMachine.setSelected) {
                        placedMachine.setSelected(false);
                    }
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
            console.error('Invalid machine type:', machineType);
            return null;
        }
        
        // Create a container for the machine preview
        const container = this.scene.add.container(xOffset, yOffset);
        
        // Store machine type
        container.machineType = machineType;
        
        // Set initial rotation based on the default direction
        container.direction = machineType.direction;
        switch (machineType.direction) {
            case 'right':
                container.rotation = 0;  // Point right (0 degrees)
                break;
            case 'down':
                container.rotation = Math.PI / 2;  // Point down (90 degrees)
                break;
            case 'left':
                container.rotation = Math.PI;  // Point left (180 degrees)
                break;
            case 'up':
                container.rotation = 3 * Math.PI / 2;  // Point up (270 degrees)
                break;
            default:
                container.rotation = 0;
                break;
        }
        
        // Calculate cell size based on machine shape
        const cellSize = 24;
        
        // Store references to input and output squares
        container.inputSquare = null;
        container.outputSquare = null;
        
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
        
        // Create machine parts based on shape
        for (let y = 0; y < machineType.shape.length; y++) {
            for (let x = 0; x < machineType.shape[y].length; x++) {
                if (machineType.shape[y][x] === 1) {
                    // Calculate part position relative to top-left corner
                    const partX = x * cellSize + cellSize / 2;
                    const partY = y * cellSize + cellSize / 2;
                    
                    // Determine part color based on whether it's an input, output, or regular part
                    let partColor = 0x4a6fb5; // Default blue color
                    
                    // For extractors, only color the output
                    if (machineType.id === 'extractor') {
                        if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xd35400; // Darker orange for extractor output
                        }
                    } 
                    // For cargo loaders, only color the inputs
                    else if (machineType.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === machineType.shape[0].length - 1 || y === 0 || y === machineType.shape.length - 1)) {
                            partColor = 0x3498db; // Blue for input
                        }
                    }
                    // For all other machines with direction
                    else if (machineType.direction !== 'none') {
                        if (x === inputPos.x && y === inputPos.y) {
                            partColor = 0x3498db; // Blue for input
                        } else if (x === outputPos.x && y === outputPos.y) {
                            partColor = 0xff9500; // Orange for output
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
        const centerX = (machineType.shape[0].length * cellSize) / 2;
        const centerY = (machineType.shape.length * cellSize) / 2;
        
        const machineLabel = this.scene.add.text(
            centerX, 
            centerY, 
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
            container.directionIndicator = this.createDirectionIndicator(centerX, centerY, machineType.direction);
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
        switch (direction) {
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
    
    createMachine(type, x, y, rotation = 0) {
        // Check if we can use the registry to create the machine
        if (this.machineRegistry.hasMachineType(type.id)) {
            // Use the registry to create the machine
            return this.machineRegistry.createMachine(type.id, this.scene, {
                grid: this.scene.grid,
                x: x,
                y: y,
                rotation: rotation
            });
        } else {
            // Fall back to the old method
            // This will be removed once all machine types are migrated
            const Machine = require('./Machine').default;
            return new Machine(this.scene, {
                grid: this.scene.grid,
                x: x,
                y: y,
                type: type,
                rotation: rotation
            });
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
} 