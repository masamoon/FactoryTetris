import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor B Machine
 * Processes basic resources into advanced resources
 */
export default class ProcessorBMachine extends BaseMachine {
    /**
     * Create a new processor B machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        // Call the parent constructor first
        super(scene, config);
        
        // Store the config for later use (optional, BaseMachine likely handles necessary props)
        this.config = config; 
        
        // Initialization is handled by initMachineProperties called from BaseMachine constructor
    }
    
    /**
     * Override the base class method to define processor-specific properties
     */
    initMachineProperties() {
        // Define machine identifier properties
        this.id = 'processor-b';
        this.name = 'Processor B';
        this.description = 'Processes basic resources into advanced resources'; // Corrected description
        
        // Define the original T-shape (relative to its top-left)
        const originalShape = [
            [0, 1, 0],
            [1, 1, 1]
        ];
        
        // Set input/output types based on GAME_CONFIG
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3000; // ms
        this.defaultDirection = 'right'; // Matches GAME_CONFIG
        
        // Initialize processor-specific properties
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'basic-resource': 1 // Requires 1 basic resource
        };
        
        // Set the original shape - rotation will be applied by BaseMachine constructor
        this.shape = originalShape;
        
        // Initialize inventories based on input/output types
        // BaseMachine constructor calls this.initInventories() after this method
        // So, no need to initialize inventories here explicitly
        
        // Log initialization (optional)
        console.log(`[${this.name}] Initialized.`);
    }
    
    /**
     * Override the createVisuals method to customize the processor appearance
     */
    createVisuals() {
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot create visuals: grid reference is missing`);
            return;
        }
        
        // gridToWorld now returns the center of the cell
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts at the cell center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        console.log(`[${this.id}] Created container at world position (${worldPos.x}, ${worldPos.y})`);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output relative positions (relative to shape's 0,0) for the *default* orientation ('right')
        // Shape: [[0, 1, 0], [1, 1, 1]]
        // For 'right' direction: Input on left (0,1), Output on right (2,1)
        const defaultInputPos = { x: 0, y: 1 }; 
        const defaultOutputPos = { x: 2, y: 1 };

        // Rotate these default positions based on the actual machine direction
        this.inputPos = this.getRelativeRotatedPos(defaultInputPos, this.direction, this.shape[0].length, this.shape.length);
        this.outputPos = this.getRelativeRotatedPos(defaultOutputPos, this.direction, this.shape[0].length, this.shape.length);

        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Calculate the shape center in terms of cells (relative to shape's 0,0)
        const shapeCenterX = (this.shape[0].length - 1) / 2;
        const shapeCenterY = (this.shape.length - 1) / 2;

        // Create machine parts based on shape using center-relative positioning
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    let partX = 0;
                    let partY = 0;
                    // Calculate part position relative to container center (0,0)
                    if (this.direction === 'none') {
                         partX = ((x - shapeCenterX) * cellSize) ;
                         partY = ((y - shapeCenterY) * cellSize) - cellSize * 0.5;
                    } else if (this.direction === 'right') {
                        partX = ((x - shapeCenterX) * cellSize) ;
                        partY = ((y - shapeCenterY) * cellSize) - cellSize * 0.5;
                    } else if (this.direction === 'down') {
                        partX = ((x - shapeCenterX) * cellSize) - cellSize * 0.5;
                        partY = ((y - shapeCenterY) * cellSize) ;
                    } else if (this.direction === 'left') {
                        partX = ((x - shapeCenterX) * cellSize) ;
                        partY = ((y - shapeCenterY) * cellSize) - cellSize * 0.5;
                    } else if (this.direction === 'up') {
                        partX = ((x - shapeCenterX) * cellSize) - cellSize * 0.5;
                        partY = ((y - shapeCenterY) * cellSize) ;
                    }
                    
                    // Determine part color
                    let partColor = 0x44ff44; // Default green
                    let isInputPart = (x === this.inputPos.x && y === this.inputPos.y);
                    let isOutputPart = (x === this.outputPos.x && y === this.outputPos.y);

                    if (isInputPart) {
                        partColor = 0x4aa8eb; // Blue for input
                    } else if (isOutputPart) {
                        partColor = 0xffa520; // Orange for output
                    }
                    
                    // Create machine part
                    const part = this.scene.add.rectangle(partX, partY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333); // Subtle stroke
                    this.container.add(part);
                    
                    // Add text indicator for input/output parts
                    if (isInputPart) {
                         const inputIndicator = this.scene.add.text(partX, partY, "IN", {
                            fontFamily: 'Arial', fontSize: 10, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                        this.inputSquare = part; // Store reference
                    } else if (isOutputPart) {
                        const outputIndicator = this.scene.add.text(partX, partY, "OUT", {
                            fontFamily: 'Arial', fontSize: 9, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(outputIndicator);
                        this.outputSquare = part; // Store reference
                    }
                }
            }
        }
        
        // Add machine type label at the center
        const machineLabel = this.scene.add.text(0, 0, "B", {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing progress bar below the center
        this.progressBar = this.scene.add.rectangle(
            0, cellSize / 2 + 2, // Position below center
            cellSize * 1.5, 4, // Make it wider
            0x00ff00
        ).setOrigin(0.5, 0);
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // Add processor core visual (similar to Processor A)
        this.processorCore = this.scene.add.circle(0, 0, cellSize / 4, 0x00ccff); // Different color (e.g., cyan)
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        this.processorCore.setDepth(machineLabel.depth - 1); // Behind label
        
        // Add direction indicator *to the scene* if applicable
        if (this.direction !== 'none') {
            const absoluteX = this.container.x;
            const absoluteY = this.container.y;
            const indicatorColor = 0xff9500;
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteX, absoluteY, -4, -6, -4, 6, 8, 0, indicatorColor
            ).setOrigin(0.5, 0.5);
            
            // Set initial rotation based on direction
            this.updateDirectionIndicatorVisuals(); // Use helper to set rotation
            this.directionIndicator.setDepth(this.container.depth + 1); // Ensure visibility
        }
        
        // Add placement animation (from BaseMachine)
        this.addPlacementAnimation();
        
        // Add interactivity (from BaseMachine)
        this.addInteractivity();
    }

    /** Helper to set direction indicator rotation */
    updateDirectionIndicatorVisuals() {
        if (!this.directionIndicator) return;
        switch (this.direction) {
            case 'right': this.directionIndicator.rotation = 0; break;
            case 'down': this.directionIndicator.rotation = Math.PI / 2; break;
            case 'left': this.directionIndicator.rotation = Math.PI; break;
            case 'up': this.directionIndicator.rotation = 3 * Math.PI / 2; break;
        }
    }

    /** Helper to calculate rotated relative position */
    getRelativeRotatedPos(originalPos, direction, shapeWidth, shapeHeight) {
        let { x, y } = originalPos;
        switch (direction) {
            case 'down': // 90 deg CW
                [x, y] = [shapeHeight - 1 - originalPos.y, originalPos.x];
                break;
            case 'left': // 180 deg CW
                [x, y] = [shapeWidth - 1 - originalPos.x, shapeHeight - 1 - originalPos.y];
                break;
            case 'up': // 270 deg CW
                [x, y] = [originalPos.y, shapeWidth - 1 - originalPos.x];
                break;
            // case 'right': // 0 deg - no change
        }
        return { x, y };
    }

    /**
     * Override the update method to handle processing logic
     */
    update(time, delta) {
        super.update(time, delta); // Call base update if needed

        delta = Number(delta) || 16.67;
        if (delta > 0 && delta < 100) delta *= 1000; 

        if (this.isProcessing) {
            this.processingProgress += delta;
            
            if (this.progressBar) {
                const progress = Math.min(1, this.processingProgress / this.processingTime);
                this.progressBar.scaleX = progress;
            }
            
            if (this.processorCore) {
                const progress = Math.min(1, this.processingProgress / this.processingTime);
                this.processorCore.alpha = 0.5 + (progress * 0.5);
                this.processorCore.scale = 1 + (progress * 0.2);
                this.processorCore.angle += delta * 0.1; // Spin effect
            }
            
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            if (this.canProcess()) {
                this.startProcessing();
            }
        }
        
        // Try to transfer output resources
        const outputType = this.outputTypes[0];
        if (this.outputInventory[outputType] > 0) {
            this.transferResources();
        }
    }
    
    /** Check if the machine can start processing */
    canProcess() {
        if (this.isProcessing) return false;

        // Check inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            if ((this.inputInventory[resourceType] || 0) < amount) {
                return false;
            }
        }
        
        // Check output capacity (e.g., max 5)
        const outputType = this.outputTypes[0];
        if ((this.outputInventory[outputType] || 0) >= 5) { 
            return false;
        }
        
        return true;
    }
    
    /** Start the processing operation */
    startProcessing() {
        if (!this.canProcess()) return;

        // Consume inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            this.inputInventory[resourceType] -= amount;
        }
        
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Reset visuals
        if (this.progressBar) this.progressBar.scaleX = 0;
        if (this.processorCore) {
            this.processorCore.alpha = 0.5;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
        console.log(`[${this.id}] Processing started.`);
    }
    
    /** Complete the processing operation */
    completeProcessing() {
        const outputType = this.outputTypes[0];
        this.outputInventory[outputType] = (this.outputInventory[outputType] || 0) + 1;
        
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visuals
        if (this.progressBar) this.progressBar.scaleX = 0;
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
        }
        console.log(`[${this.id}] Processing complete. Output:`, this.outputInventory);
    }

    /** Transfer resources to connected machines/nodes */
    transferResources() {
        const outputType = this.outputTypes[0];
        if (this.outputInventory[outputType] <= 0) return; 

        const targetInfo = this.findTargetForOutput(); // Find machine or delivery node

        if (targetInfo) {
            let transferred = false;
            if (targetInfo.type === 'delivery-node') {
                if (targetInfo.target.acceptResource(outputType)) {
                    transferred = true;
                    this.createResourceTransferEffect(outputType, targetInfo.target); 
                }
            } else if (targetInfo.type === 'machine') {
                // Use receiveResource method which checks canAcceptInput
                if (targetInfo.target.receiveResource(outputType, this)) {
                    transferred = true;
                    this.createResourceTransferEffect(outputType, targetInfo.target);
                }
            }

            if (transferred) {
                this.outputInventory[outputType]--;
            }
        }
    }

    /** Find the machine or delivery node in the output direction */
    findTargetForOutput() {
        if (!this.grid) return null;

        let targetX = this.gridX;
        let targetY = this.gridY;

        switch (this.direction) {
            case 'right': targetX += 1; break;
            case 'down': targetY += 1; break;
            case 'left': targetX -= 1; break;
            case 'up': targetY -= 1; break;
            default: return null; // Should not happen if direction is set
        }

        // Check grid bounds
        if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
            return null;
        }

        const targetCell = this.grid.getCell(targetX, targetY);

        if (!targetCell) return null;

        if (targetCell.type === 'delivery-node' && targetCell.object) {
            return { type: 'delivery-node', target: targetCell.object };
        } else if (targetCell.type === 'machine' && targetCell.machine) {
            return { type: 'machine', target: targetCell.machine };
        }

        return null;
    }

    /** Create a visual effect for resource transfer */
    createResourceTransferEffect(resourceType, target) {
        if (!this.container) {
            console.error(`[${this.id}] ERROR: this.container is null in createResourceTransferEffect!`);
            return; 
        }
        if (!target.container) {
             console.error(`[${this.id}] ERROR: target.container is null in createResourceTransferEffect! Target:`, target);
            return; 
        }

        const sourcePos = { x: this.container.x, y: this.container.y };
        const targetPos = { x: target.container.x, y: target.container.y };
        const color = GAME_CONFIG.resourceColors[resourceType] || 0xaaaaaa;
        const particle = this.scene.add.circle(sourcePos.x, sourcePos.y, 5, color);
        particle.setDepth(this.container.depth + 1); 
        
        this.scene.tweens.add({
            targets: particle,
            x: targetPos.x,
            y: targetPos.y,
            duration: 300, 
            ease: 'Power1',
            onComplete: () => { particle.destroy(); }
        });
    }
    
    /** Create a preview sprite for the machine selection panel */
    static getPreviewSprite(scene, x, y) {
        const container = scene.add.container(x, y);
        const shape = [[0, 1, 0], [1, 1, 1]];
        const cellSize = 16; // Smaller size for preview
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;
        const defaultInputPos = { x: 0, y: 1 }; // For default 'right' direction
        const defaultOutputPos = { x: 2, y: 1 }; // For default 'right' direction

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const partX = (c - shapeCenterX) * cellSize;
                    const partY = (r - shapeCenterY) * cellSize;
                    let color = 0x44ff44; // Default green
                    if (c === defaultInputPos.x && r === defaultInputPos.y) color = 0x4aa8eb; // Blue input
                    if (c === defaultOutputPos.x && r === defaultOutputPos.y) color = 0xffa520; // Orange output
                    
                    const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        const label = scene.add.text(0, 0, "B", { fontSize: 12, color: '#ffffff' }).setOrigin(0.5);
        container.add(label);
        return container;
    }
} 