import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import MachineRegistry from './machines/MachineRegistry';
import { MACHINE_COLORS } from './machines/BaseMachine';

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
        
        // --- Processor Rotation State ---
        this.processorTypes = [];
        this.currentProcessorIndex = 0;
        this.processorPreviewContainer = null; // Will be created in createVisuals
        this.conveyorMachineType = null; // Store conveyor type separately
        // --- End Processor Rotation State ---
        
        // Create visual representation
        this.createVisuals();
        
        // Get processor types
        this.initializeProcessorTypes(); // Call method to populate processor types
        
        // Create machine selection panel (now specifically for the rotating processor)
        this.createProcessorSelectionPanel(); // Renamed for clarity
        
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
        
        // Create a dedicated container for the single rotating processor preview
        this.processorPreviewContainer = this.scene.add.container(0, 0); // Positioned at the center of the factory container
        this.container.add(this.processorPreviewContainer);
        
        // Add a title for the machine selection panel (Optional)
        /*const title = this.scene.add.text(
            0, 
            -this.height / 2 + 15, 
            "PROCESSOR", // Changed title
            {
                fontFamily: 'Arial',
                fontSize: 14,
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.container.add(title);*/
        
        // Create a container for the machine previews (No longer used for processors)
        // this.scrollContainer = this.scene.add.container(0, 0);
        // this.container.add(this.scrollContainer);
        
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
    
    // New method to filter and store processor types
    initializeProcessorTypes() {
        const machineConfigs = this.machineRegistry.getAllMachineConfigs();
        const allMachineTypes = machineConfigs.length > 0 ?
            machineConfigs :
            GAME_CONFIG.machineTypes;

        // Filter for machines whose ID includes 'processor' (case-insensitive)
        this.processorTypes = allMachineTypes.filter(
            type => type.id.toLowerCase().includes('processor')
        );
        
        // Get the conveyor type
        this.conveyorMachineType = allMachineTypes.find(
             type => type.id.toLowerCase() === 'conveyor'
        );

        if (this.processorTypes.length === 0) {
            console.warn("MachineFactory: No processor types found for rotation panel.");
        }
         if (!this.conveyorMachineType) {
             console.warn("MachineFactory: Conveyor machine type not found.");
         }
         console.log("MachineFactory: Initialization complete.");
         // console.log("Processors:", this.processorTypes.map(p => p.id));
         // console.log("Conveyor:", this.conveyorMachineType?.id);
    }
    
    // Renamed and repurposed method
    createProcessorSelectionPanel() {
        // Ensure we have processor types before displaying
        if (this.processorTypes.length === 0) {
            console.log("No processors available to display in the panel.");
            return;
        }
        // Display the initial processor
        this.displayCurrentProcessorPreview();
    }
    
    // New method to display the currently selected processor preview
    displayCurrentProcessorPreview() {
        // Clear any existing preview in the container
        this.processorPreviewContainer.removeAll(true); // Destroy children

        // --- Define positions for processor and conveyor ---
        // Place processor on the left, conveyor on the right using fixed pixel offsets
        const previewSpacing = 30; // Pixels from center
        const processorX = -previewSpacing; // Offset left
        const processorY = 0;
        const conveyorX = previewSpacing;  // Offset right
        const conveyorY = 0;
        // --- End Positions ---

        // --- Display Processor ---
        if (this.processorTypes.length > 0) {
            // Get the current processor type based on the index
            const machineType = this.processorTypes[this.currentProcessorIndex];
            if (!machineType) {
                 console.error(`Processor type at index ${this.currentProcessorIndex} is undefined.`);
                 // Potentially display an error placeholder
            } else {
                 // Create the machine preview sprite
                 let machinePreview;
                 try {
                     if (this.machineRegistry.hasMachineType(machineType.id)) {
                         console.log(`[MachineFactory.displayCurrentProcessorPreview] Found ${machineType.id} in registry. Attempting machineRegistry.createMachinePreview.`);
                         machinePreview = this.machineRegistry.createMachinePreview(
                             machineType.id,
                             this.scene,
                             processorX, // Use processor position
                             processorY
                         );
                     } else {
                         console.warn(`[MachineFactory.displayCurrentProcessorPreview] Processor type ${machineType.id} NOT in registry. Using Factory's own createMachinePreview.`);
                         machinePreview = this.createMachinePreview(machineType, processorX, processorY);
                     }
                 } catch (error) {
                      console.error(`Error creating processor preview for ${machineType.id}:`, error);
                      const errorText = this.scene.add.text(processorX, processorY, 'P Err', { fontSize: 8, color: '#ff0000' }).setOrigin(0.5);
                      this.processorPreviewContainer.add(errorText);
                      machinePreview = null; // Ensure it's null
                 }

                 if (machinePreview) {
                     this.processorPreviewContainer.add(machinePreview);
                     machinePreview.machineType = machineType;

                     // --- Processor Interactivity ---
                     const hitAreaSize = 60;
                     machinePreview.setInteractive(new Phaser.Geom.Rectangle(
                         -hitAreaSize / 2, -hitAreaSize / 2, hitAreaSize, hitAreaSize
                     ), Phaser.Geom.Rectangle.Contains);

                     machinePreview.on('pointerover', () => {
                         machinePreview.setScale(1.1);
                         this.showMachineTooltip(machineType, this.x + processorX, this.y + processorY + 40);
                     });

                     machinePreview.on('pointerout', () => {
                         machinePreview.setScale(1);
                         this.hideMachineTooltip();
                     });

                     // Click handler to select and rotate processor
                     machinePreview.on('pointerdown', (pointer) => {
                         pointer.event.stopPropagation();
                         this.selectAndRotateProcessor();
                     });
                     // --- End Processor Interactivity ---
                 } else {
                      // Optionally add error placeholder if creation failed and wasn't caught
                      console.error(`Failed to create processor preview for ${machineType.id}`);
                      const errorText = this.scene.add.text(processorX, processorY, 'P Fail', { fontSize: 8, color: '#ff0000' }).setOrigin(0.5);
                      this.processorPreviewContainer.add(errorText);
                 }
            }
        } else {
            // Optionally display a placeholder if no processors are found
             const noProcText = this.scene.add.text(processorX, processorY, 'No Proc', { fontSize: 8, color: '#888888' }).setOrigin(0.5);
             this.processorPreviewContainer.add(noProcText);
        }
        // --- End Display Processor ---

        // --- Display Conveyor ---
        if (this.conveyorMachineType) {
            let conveyorPreview;
            try {
                 if (this.machineRegistry.hasMachineType(this.conveyorMachineType.id)) {
                     conveyorPreview = this.machineRegistry.createMachinePreview(
                         this.conveyorMachineType.id,
                         this.scene,
                         conveyorX, // Use conveyor position
                         conveyorY
                     );
                 } else {
                      console.warn(`Conveyor type ${this.conveyorMachineType.id} not in registry, using fallback preview creation.`);
                      conveyorPreview = this.createMachinePreview(this.conveyorMachineType, conveyorX, conveyorY);
                 }
             } catch (error) {
                 console.error(`Error creating conveyor preview:`, error);
                 const errorText = this.scene.add.text(conveyorX, conveyorY, 'C Err', { fontSize: 8, color: '#ff0000' }).setOrigin(0.5);
                 this.processorPreviewContainer.add(errorText);
                 conveyorPreview = null; // Ensure it's null
             }

             if (conveyorPreview) {
                 this.processorPreviewContainer.add(conveyorPreview);
                 conveyorPreview.machineType = this.conveyorMachineType;

                 // --- Conveyor Interactivity ---
                 const hitAreaSize = 60;
                 conveyorPreview.setInteractive(new Phaser.Geom.Rectangle(
                     -hitAreaSize / 2, -hitAreaSize / 2, hitAreaSize, hitAreaSize
                 ), Phaser.Geom.Rectangle.Contains);

                 conveyorPreview.on('pointerover', () => {
                     conveyorPreview.setScale(1.1);
                     this.showMachineTooltip(this.conveyorMachineType, this.x + conveyorX, this.y + conveyorY + 40);
                 });

                 conveyorPreview.on('pointerout', () => {
                     conveyorPreview.setScale(1);
                     this.hideMachineTooltip();
                 });

                 // Click handler to select conveyor (no rotation)
                 conveyorPreview.on('pointerdown', (pointer) => {
                     pointer.event.stopPropagation();
                     console.log("Conveyor preview clicked");
                     this.selectMachineType(this.conveyorMachineType);
                 });
                 // --- End Conveyor Interactivity ---
             } else {
                 console.error(`Failed to create conveyor preview`);
                 const errorText = this.scene.add.text(conveyorX, conveyorY, 'C Fail', { fontSize: 8, color: '#ff0000' }).setOrigin(0.5);
                 this.processorPreviewContainer.add(errorText);
             }

        } else {
            // Optionally display placeholder if conveyor not found
             const noConvText = this.scene.add.text(conveyorX, conveyorY, 'No Conv', { fontSize: 8, color: '#888888' }).setOrigin(0.5);
             this.processorPreviewContainer.add(noConvText);
        }
        // --- End Display Conveyor ---
    }
    
    // New method to handle selection and rotation
    selectAndRotateProcessor() {
        if (this.processorTypes.length === 0) return;

        // 1. Select the currently displayed machine type
        const currentMachineType = this.processorTypes[this.currentProcessorIndex];
        this.selectMachineType(currentMachineType); // Existing method handles ghost, etc.

        // 2. Advance the index for the *next* display
        this.currentProcessorIndex = (this.currentProcessorIndex + 1) % this.processorTypes.length;

        // 3. Update the preview display
        this.displayCurrentProcessorPreview();

        console.log(`Selected ${currentMachineType.id}, next processor preview will be ${this.processorTypes[this.currentProcessorIndex].id}`);
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
            switch(machineType.id.toLowerCase()) { // Use lowercase for safety
                /* case 'extractor':
                    machineType.shape = [[1, 1], [1, 1]]; // 2x2 shape
                    break; */
                case 'processor-a':
                    machineType.shape = GAME_CONFIG.machineTypes.find(m => m.id === 'processor-a')?.shape || [[1, 1], [1, 0], [1, 0]];
                    break;
                case 'processor-b':
                     machineType.shape = GAME_CONFIG.machineTypes.find(m => m.id === 'processor-b')?.shape || [[0, 1, 0], [1, 1, 1]];
                    break;
                case 'advanced-processor':
                     machineType.shape = GAME_CONFIG.machineTypes.find(m => m.id === 'advanced-processor')?.shape || [[0, 1, 0], [1, 1, 1], [0, 1, 0]];
                    break;
                case 'conveyor':
                     machineType.shape = GAME_CONFIG.machineTypes.find(m => m.id === 'conveyor')?.shape || [[1, 1]];
                    break;
                case 'cargo-loader':
                     machineType.shape = GAME_CONFIG.machineTypes.find(m => m.id === 'cargo-loader')?.shape || [[1, 1], [1, 1]];
                    break;
                default:
                     console.warn(`No default shape found for ${machineType.id}, using 1x1.`);
                    machineType.shape = [[1]]; // 1x1 shape as fallback
            }
             console.log(`Assigned shape for ${machineType.id}:`, machineType.shape);
        }
        
        // Set the selected machine type
        this.selectedMachineType = machineType;
        
        // Notify any listeners (e.g., the scene)
        this.scene.events.emit('machineSelected', machineType);
        
        // Create placement preview in the scene
        if (this.scene.createPlacementPreview) {
            console.log("[MachineFactory] Requesting placement preview for:", machineType.id, "with shape:", machineType.shape);
             // Ensure shape is passed correctly
             const previewData = {
                 id: machineType.id,
                 type: machineType.id, // Keep type for potential legacy use
                 shape: machineType.shape, // Use the potentially updated shape
                 direction: machineType.defaultDirection || 'right',
                 rotation: 0,
                 machineType: machineType // Pass the full object
             };
             console.log("[MachineFactory] Preview data:", JSON.stringify(previewData));
            this.scene.createPlacementPreview(previewData);
        } else {
             console.warn("[MachineFactory] scene.createPlacementPreview not found!");
        }
    }
    
    // Clear the current selection
    clearSelection() {
        // Reset the selected machine type
        this.selectedMachineType = null;
        
        // Remove any selection graphics (Still relevant if we add selection feedback elsewhere)
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
     * Handle placing a machine at the pointer's current position
     * @param {Phaser.Input.Pointer} pointer - The pointer to use for placement
     */
    handlePlaceMachine(pointer) {
        console.log(`[Factory.handlePlaceMachine] Called. Selected: ${this.selectedMachineType ? this.selectedMachineType.id : 'None'}`); // LOG H1
        // Check if we have a selected machine type
        if (!this.selectedMachineType) {
            return;
        }
        
        // Prevent placing machines over UI elements
        if (this.isPointerOverUI(pointer)) {
            console.log('[Factory.handlePlaceMachine] Pointer is over UI. Aborting.'); // LOG H2
            return;
        }
        
        console.log('[Factory.handlePlaceMachine] Pointer NOT over UI.'); // LOG H3
        // Check if the pointer is over the factory grid
        if (this.scene.factoryGrid && this.scene.factoryGrid.isPointerOverGrid(pointer)) {
            console.log('[Factory.handlePlaceMachine] Pointer IS over grid.'); // LOG H4
            // Get the grid position from the pointer
            const gridPos = this.scene.factoryGrid.worldToGrid(pointer.x, pointer.y);
            if (!gridPos) {
                console.log('[Factory.handlePlaceMachine] Could not get gridPos. Aborting.'); // LOG H5
                return;
            }
            console.log(`[Factory.handlePlaceMachine] Got gridPos: (${gridPos.x}, ${gridPos.y})`); // LOG H6
            
            // Check if we can place the machine at the grid position
            console.log(`[Factory.handlePlaceMachine] Checking canPlaceMachine for ${this.selectedMachineType.id} at (${gridPos.x}, ${gridPos.y})`); // LOG H7
            const canPlace = this.scene.factoryGrid.canPlaceMachine(
                this.selectedMachineType,
                gridPos.x,
                gridPos.y,
                this.selectedMachineType.direction || 'right' // Use right if direction undefined
            );
            console.log(`[Factory.handlePlaceMachine] canPlaceMachine result: ${canPlace}`); // LOG H8
            
            if (canPlace) {
                try {
                    console.log(`[Factory.handlePlaceMachine] About to call scene.placeMachine for ${this.selectedMachineType.id}`); // LOG H9
                    // Place the machine using the scene's placeMachine method
                    const placedMachine = this.scene.placeMachine(
                        this.selectedMachineType,
                        gridPos.x,
                        gridPos.y,
                        this.selectedMachineType.rotation || 0
                    );
                    
                    if (placedMachine) {
                        console.log(`[Factory.handlePlaceMachine] scene.placeMachine SUCCESS for ${this.selectedMachineType.id}`); // LOG H10
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
        if (!machineType) {
             console.error("createMachinePreview called with undefined machineType");
             return null;
        }
         if (!machineType.shape) {
              console.warn(`Machine type ${machineType.id} has no shape for preview.`);
              // Maybe assign a default shape here if needed, or rely on the caller
             // machineType.shape = [[1]]; // Example default
              // return null; // Or return null/error indicator
         }

        // Get cell size from game config as a fallback
        const cellSize = GAME_CONFIG.previewCellSize || 16; // Use a config value or default

        // Create container for preview machine
        const container = this.scene.add.container(xOffset, yOffset);

        // --- Default Shape Handling for Preview (Example) ---
         // Use the shape from machineType if available, otherwise a default
         const shape = machineType.shape || [[1]]; // Default to 1x1 if shape is missing
         const shapeWidth = shape[0]?.length || 1;
         const shapeHeight = shape.length || 1;
         const shapeCenterX = (shapeWidth - 1) / 2;
         const shapeCenterY = (shapeHeight - 1) / 2;
        // --- End Default Shape Handling ---

        // Determine input and output positions based on direction (Use default 'right' for preview)
        const direction = machineType.defaultDirection || 'right';
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };

        // Simplified input/output logic for preview based on common patterns
        // This might need to be generalized or rely on static properties if machines vary greatly
        // Or better yet, use the static getPreviewSprite from the machine class itself!
        console.warn("Using generic createMachinePreview - prefer static getPreviewSprite on machine classes for accuracy.");

        // --- Generic Preview Drawing (Placeholder/Fallback) ---
        // Draw each cell based on the shape using center-relative positioning
        for (let y = 0; y < shapeHeight; y++) {
            for (let x = 0; x < shapeWidth; x++) {
                if (shape[y] && shape[y][x] === 1) {
                    const partX = (x - shapeCenterX) * cellSize;
                    const partY = (y - shapeCenterY) * cellSize;
                    // Use unique color for each machine type
                    let color = MACHINE_COLORS[machineType.id] || 0x44ff44;
                    // Input/output coloring
                    if (x === 0 && y === 0) color = 0x4aa8eb; // Input
                    else if (x === shapeWidth - 1 && y === shapeHeight - 1) color = 0xffa520; // Output
                    console.log(`[PREVIEW] ${machineType.id} cell (${x},${y}) color: ${color.toString(16)}`);
                    const rect = this.scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        // --- End Generic Preview Drawing ---

        // Add a label (use machine ID if available)
        const labelText = machineType.id ? machineType.id.substring(0, 3).toUpperCase() : '?';
        const label = this.scene.add.text(0, 0, labelText, {
            fontFamily: 'Arial',
            fontSize: Math.max(8, cellSize * 0.6), // Scale font size
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        // Add a simple direction indicator (pointing right by default for preview)
        const indicator = this.createDirectionIndicator(0, 0, 'right');
        container.add(indicator);

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
        if (machineType.inputTypes.length > 0) {
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
        console.log(`[MachineFactory] createMachine called. typeOrId:`, typeOrId, `Grid Pos: (${gridX},${gridY})`); // Log entry
        try {
            // Determine if we're using the new (ID string) or old (type object) format
            const isTypeObject = typeof typeOrId === 'object' && typeOrId !== null;
            const machineTypeId = isTypeObject ? typeOrId.id : typeOrId;
            console.log(`[MachineFactory] Determined machineTypeId: ${machineTypeId}`); // Log ID
            
            // Ensure we have a valid grid reference
            const gridRef = grid || this.scene.factoryGrid || this.scene.grid;
            
            if (!gridRef) {
                console.error("[MachineFactory] No valid grid reference found."); // Log error
                return null;
            }
            
            // Check if the registry has this machine type
            if (!this.machineRegistry || !this.machineRegistry.hasMachineType(machineTypeId)) {
                console.error(`[MachineFactory] Machine type '${machineTypeId}' not found in registry.`); // Log error
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
            console.log(`[MachineFactory] Config prepared:`, config);
            
            // Call the registry
            console.log(`[MachineFactory] Calling machineRegistry.createMachine for ${machineTypeId}...`);
            console.log(`[MachineFactory] --> Passing scene: ${this.scene ? this.scene.scene.key : 'INVALID'}, config keys: ${config ? Object.keys(config).join(', ') : 'N/A'}`); 
            const machine = this.machineRegistry.createMachine(machineTypeId, this.scene, config);
            console.log(`[MachineFactory] Result from machineRegistry.createMachine:`, machine ? 'Success' : 'Failed/Null');
            
            return machine;
        } catch (error) {
            console.error('[MachineFactory] Error in createMachine:', error); // Log caught error
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
        
        // Add machine description with safety check
        const description = machineType && typeof machineType.description === 'string' 
                          ? machineType.description 
                          : 'No description available.';

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
        console.warn("createMachineOfType is potentially redundant. Consider using createMachine.");
        // Create the machine using the registry/preview method - Needs review
        // This implementation seems wrong - it's creating another *preview* not a machine instance.
        // let machine = this.createMachinePreview(machineType, x, y);

        // Correct approach: Use the registry to create an actual machine instance
         let machineInstance = null;
         if (this.machineRegistry.hasMachineType(machineType.id)) {
            // This needs the actual grid config, not just x, y for a preview
            // We probably shouldn't call this from here. Placement logic should handle creation.
             console.error("createMachineOfType should likely not be called directly. Placement logic needed.");
             // Example of how it *might* look if grid/config were available:
             /*
             const config = {
                 grid: this.scene.factoryGrid, // Assuming scene has the grid
                 gridX: x, // Needs conversion from world/UI coords to grid coords
                 gridY: y,
                 direction: machineType.defaultDirection || 'right'
             };
             machineInstance = this.machineRegistry.createMachine(machineType.id, this.scene, config);
             */
         } else {
             console.error(`Machine type ${machineType.id} not found in registry for createMachineOfType`);
         }

         if (machineInstance) {
             // Add to scene, etc. - This logic belongs elsewhere (e.g., GameScene placement)
             console.log("Machine instance created (but not added/managed by this function):", machineInstance);
         }

         // Return the instance (or null)
         return machineInstance;


        /* Original problematic code:
        if (machine) {
            // Add to container (This adds a *preview* to the factory UI, not a game machine)
             this.container.add(machine); // This seems wrong

            // Make the preview interactive (Redundant with selection panel?)
            machine.setInteractive(new Phaser.Geom.Rectangle(
                -30, -30, 60, 60
            ), Phaser.Geom.Rectangle.Contains);

            // Add hover effect
            machine.on('pointerover', () => {
                machine.setScale(1.1);
                this.showMachineTooltip(machineType, x, y + 40);
            });

            machine.on('pointerout', () => {
                machine.setScale(1);
                this.hideMachineTooltip();
            });

            // Add click handler
            machine.on('pointerdown', () => {
                 // This selects the type again, causing potential issues
                this.selectMachineType(machineType);
            });

            // Store in available machines (Adds another preview reference)
            this.availableMachines.push({
                preview: machine,
                type: machineType
            });
        }

        return machine; // Returns the preview container
        */
    }


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
        
        // Since this method is used by rotateMachine, we'll update only necessary values
        // and not try to manipulate the deprecated placementGhost
        this.selectedMachineType.direction = direction;
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