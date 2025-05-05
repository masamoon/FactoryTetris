import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor Machine
 * Combines basic and advanced resources
 */
export default class AdvancedProcessorMachine extends BaseMachine {
    /**
     * Create a new advanced processor machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        // Initialization is handled by initMachineProperties called from BaseMachine constructor
    }

    /**
     * Initialize machine-specific properties
     */
    initMachineProperties() {
        this.id = 'advanced-processor';
        this.name = 'Advanced Processor';
        this.description = 'Combines basic and advanced resources';
        
        // Original cross-shape
        const originalShape = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ]; 
        
        this.inputTypes = ['basic-resource', 'advanced-resource'];
        this.outputTypes = ['mega-resource']; // REMOVED: Will use config value
        this.processingTime = 5000; // 5 seconds
        this.defaultDirection = 'down'; // Default direction
        
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'basic-resource': 1,
            'advanced-resource': 1
        };
        
        // Set the original shape - rotation handled by BaseMachine
        this.shape = originalShape;
        
        console.log(`[${this.name}] Initialized.`);
    }
    
    /**
     * Override the createVisuals method to customize the processor appearance
     */
    createVisuals() {
        if (!this.grid) {
            console.warn(`[${this.id}] Cannot create visuals: grid reference is missing`);
            return;
        }

        // *** ADDED: Get the correctly rotated shape for visuals (Copied from BaseMachine) ***
        const currentDirection = this.direction || this.getDirectionFromRotation(this.rotation);
        const rotatedShape = this.grid.getRotatedShape(this.shape, currentDirection); // Use direction string

        // *** VALIDATE the rotated shape ***
        if (!rotatedShape || !Array.isArray(rotatedShape) || rotatedShape.length === 0) {
            console.error(`[${this.id}] Failed to get valid rotated shape for direction ${currentDirection}. Using default.`);
            rotatedShape = [[1]]; // Fallback to default shape
        }
        
        // *** MODIFIED: Use gridToWorldTopLeft consistent with BaseMachine ***
        const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
        
        // *** MODIFIED: Use topLeftPos for container ***
        this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);
        // console.log(`[${this.id}] Created container at world position (${topLeftPos.x}, ${topLeftPos.y})`);
        
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Default input/output positions for 'down' direction (relative to shape 0,0)
        // Shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]]
        // For 'down': Input top (1,0), Output bottom (1,2)
        const defaultInputPos = { x: 1, y: 0 }; 
        const defaultOutputPos = { x: 1, y: 2 };

        // Rotate based on actual direction
        // *** MODIFIED: Use rotatedShape dimensions ***
        this.inputPos = this.getRelativeRotatedPos(defaultInputPos, this.direction, rotatedShape[0].length, rotatedShape.length);
        this.outputPos = this.getRelativeRotatedPos(defaultOutputPos, this.direction, rotatedShape[0].length, rotatedShape.length);

        const cellSize = this.grid.cellSize;
        // *** MODIFIED: Use rotatedShape dimensions ***
        const shapeCenterX = (rotatedShape[0].length - 1) / 2;
        const shapeCenterY = (rotatedShape.length - 1) / 2;
        // *** MODIFIED: Calculate core part position relative to rotated shape ***
        const corePartPos = this.getRelativeRotatedPos({ x: 1, y: 1 }, this.direction, rotatedShape[0].length, rotatedShape.length); 

        // *** MODIFIED: Use rotatedShape ***
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // *** MODIFIED: Use rotatedShape ***
                if (rotatedShape[y][x] === 1) {
                    // *** MODIFIED: Use top-left positioning logic from BaseMachine ***
                    const partCenterX = x * cellSize + cellSize / 2;
                    const partCenterY = y * cellSize + cellSize / 2;

                    // *** REMOVED Old center-relative positioning ***
                    // const partX = (x - shapeCenterX) * cellSize;
                    // const partY = (y - shapeCenterY) * cellSize;
                    
                    let partColor = 0x44ff44; // Default green
                    let isInputPart = (x === this.inputPos.x && y === this.inputPos.y);
                    let isOutputPart = (x === this.outputPos.x && y === this.outputPos.y);
                    let isCorePart = (x === corePartPos.x && y === corePartPos.y);

                    if (isInputPart) partColor = 0x4aa8eb; // Blue input
                    else if (isOutputPart) partColor = 0xffa520; // Orange output
                    else if (isCorePart) partColor = 0xcc5599; // Distinct core color (e.g., purple/magenta)
                    
                    // *** MODIFIED: Use partCenterX/Y for positioning ***
                    const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333);
                    this.container.add(part);
                    
                    if (isInputPart) this.inputSquare = part;
                    if (isOutputPart) this.outputSquare = part;
                }
            }
        }
        
        // *** ADDED: Calculate visual center consistent with BaseMachine ***
        const visualCenterX = shapeCenterX * cellSize;
        const visualCenterY = shapeCenterY * cellSize;
        const adjustedVisualCenterX = visualCenterX + cellSize / 2;
        const adjustedVisualCenterY = visualCenterY + cellSize / 2;

        // *** MODIFIED: Use adjusted center for label, progress bar, core ***
        const machineLabel = this.scene.add.text(adjustedVisualCenterX, adjustedVisualCenterY, "ADV", { fontSize: 10, color: '#ffffff' }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add processing progress bar (Copied from ProcessorC)
        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, 
            adjustedVisualCenterY + cellSize * 0.6, // Position below the center label
            cellSize * 1.5, // Width based on cell size (adjust multiplier if needed for shape)
            6, // Height
            0x000000 // Background color
        ).setOrigin(0.5);
        this.progressBar.setDepth(1); // Ensure progress bar is visible
        this.container.add(this.progressBar);
        
        this.progressFill = this.scene.add.rectangle(
            this.progressBar.x - this.progressBar.width / 2,
            this.progressBar.y,
            0, // Initial width
            this.progressBar.height,
            0x00ff00 // Fill color
        ).setOrigin(0, 0.5);
        this.progressFill.setDepth(2);
        this.container.add(this.progressFill);
        
        // Hide progress bar initially
        this.progressBar.setVisible(false);
        this.progressFill.setVisible(false);
        // --- End Progress Bar ---

        // Add processor core visual effect (maybe a different shape?)
        // *** MODIFIED: Position relative to adjusted center ***
        this.processorCore = this.scene.add.star(adjustedVisualCenterX, adjustedVisualCenterY, 4, cellSize / 4, cellSize / 3, 0xffdd00); // Yellow star
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        this.processorCore.setDepth(machineLabel.depth - 1);
        
        // Add direction indicator to the scene
        if (this.direction !== 'none') {
            // *** MODIFIED: Use absolute positioning logic from BaseMachine ***
            const absoluteCenterX = this.container.x + adjustedVisualCenterX;
            const absoluteCenterY = this.container.y + adjustedVisualCenterY;
            const indicatorColor = 0xff9500;
            
            // *** MODIFIED: Use calculated absolute center ***
            this.directionIndicator = this.scene.add.triangle(absoluteCenterX, absoluteCenterY, -4, -6, -4, 6, 8, 0, indicatorColor).setOrigin(0.5, 0.5);
            this.updateDirectionIndicatorVisuals(); 
            this.directionIndicator.setDepth(this.container.depth + 1);
        }
        
        this.addPlacementAnimation();
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

        // *** Use the ORIGINAL shape dimensions for rotation calculation ***
        const originalWidth = this.shape[0].length; 
        const originalHeight = this.shape.length;

        // *** Rotation relative to ORIGINAL default direction ('down') ***
        // Need to adjust the target direction based on the default
        let effectiveDirection = direction;
        if (this.defaultDirection === 'down') {
            // Map target direction relative to 'down' as the 0-degree rotation
            if (direction === 'left') effectiveDirection = 'right'; // 90 deg CW from down is left --> Treat as effective 'right'
            else if (direction === 'up') effectiveDirection = 'down'; // 180 deg CW from down is up --> Treat as effective 'down'
            else if (direction === 'right') effectiveDirection = 'left'; // 270 deg CW from down is right --> Treat as effective 'left'
            // else direction === 'down', effectiveDirection remains 'down' (no rotation needed from default) --> Treat as effective 'up'?? No, treat as 'right' 0 deg
            else if (direction === 'down') effectiveDirection = 'right'; // Default 'down' means no rotation relative to 'right' logic
        } // Add similar blocks here if other machines have different defaults like 'left' or 'up'
        
        // *** APPLY standard rotation formulas based on effectiveDirection relative to 'right' ***
        // NOTE: Formulas map original (x,y) to new (x,y) after rotation relative to 'right'
        switch (effectiveDirection) { 
            case 'right': // 0 deg (or target is 'down' when default is 'down')
                 // No change
                 break; 
            case 'down': // 90 deg CW rotation (or target is 'up' when default is 'down')
                x = originalPos.y;
                y = originalWidth - 1 - originalPos.x; // Corrected: Use original W/H
                break;
            case 'left': // 180 deg rotation (or target is 'right' when default is 'down')
                x = originalWidth - 1 - originalPos.x; // Corrected: Use original W/H
                y = originalHeight - 1 - originalPos.y; // Corrected: Use original W/H
                break;
            case 'up': // 270 deg CW rotation (or target is 'left' when default is 'down')
                 x = originalHeight - 1 - originalPos.y; // Corrected: Use original W/H
                 y = originalPos.x; // Corrected: Use original W/H
                break;
        }
        return { x, y };
    }

    /** Override the update method */
    update(time, delta) {
        // Call base class update first
        super.update(time, delta);

        // If processing, update progress
        if (this.isProcessing) {
            const speedModifier = this.scene.upgradeManager.getProcessorSpeedModifier();
            const effectiveDelta = delta * speedModifier; // Apply modifier to delta time

            this.processingProgress += effectiveDelta; // Use modified delta

            // *** ADDED: Update progress bar visual ***
            const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
            if (this.progressFill && this.progressBar) { // Check if bar exists
                 this.progressFill.width = this.progressBar.width * progressRatio;
            }
            // *** END ADDED ***

            // Check if processing is complete
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            // If not processing, check if we can start
            if (this.canProcess()) {
                this.startProcessing();
            }
        }

        // Try to push output if available
        if (this.hasOutput()) {
            this.pushOutput();
        }
    }
    
    /** Check if the machine can start processing */
    canProcess() {
        if (this.isProcessing) return false;
        // Check for BOTH required inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            if ((this.inputInventory[resourceType] || 0) < amount) {
                return false;
            }
        }
        const outputType = this.outputTypes[0];
        if ((this.outputInventory[outputType] || 0) >= 5) { 
            return false;
        }
        return true;
    }
    
    /** Start the processing operation */
    startProcessing() {
        // Consume required inputs
        for (const type in this.requiredInputs) {
            this.inputInventory[type] -= this.requiredInputs[type];
        }

        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;

        // *** ADDED: Show progress bar ***
        if (this.progressBar && this.progressFill) { // Check if bar exists
             this.progressBar.setVisible(true);
             this.progressFill.setVisible(true);
             this.progressFill.width = 0; // Reset fill width
        }
        // *** END ADDED ***

        // Play processing sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('processing');
        }

        console.log(`[${this.id}] Started processing.`);
    }
    
    /** Complete the processing operation */
    completeProcessing() {
        // Add output resources
        this.outputTypes.forEach(type => {
            if (this.outputInventory[type] !== undefined) {
                this.outputInventory[type]++;
            } else {
                console.warn(`[${this.id}] Output inventory does not have key: ${type}`);
            }
        });

        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;

        // *** ADDED: Hide progress bar ***
        if (this.progressBar && this.progressFill) { // Check if bar exists
            this.progressBar.setVisible(false);
            this.progressFill.setVisible(false);
        }
        // *** END ADDED ***

        // Play completion sound (if available)
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('complete');
        }

        console.log(`[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`);

        // Immediately try to push the new output
        this.pushOutput();
    }

    /** Transfer resources (Identical to Processor B, uses findTargetForOutput) */
    transferResources() {
        const outputType = this.outputTypes[0];
        if (this.outputInventory[outputType] <= 0) return; 
        
        const targetInfo = this.findTargetForOutput(); 
        
        if (targetInfo) {
            let transferred = false;
            if (targetInfo.type === 'delivery-node') {
                // Create item object
                const itemToDeliver = {
                    type: outputType,
                    texture: this.scene.registry.get('resourceTextures')?.[outputType] || 'default-resource'
                };
                if (targetInfo.target && typeof targetInfo.target.acceptItem === 'function') { // Check method exists
                    if (targetInfo.target.acceptItem(itemToDeliver)) { // Renamed and passing item object
                        transferred = true;
                        this.createResourceTransferEffect(outputType, targetInfo.target);
                    } else {
                        // Target rejected
                    }
                } else {
                    console.warn(`[${this.id}] Target Delivery Node is invalid or missing acceptItem method.`);
                }
            } else if (targetInfo.type === 'machine') {
                // --- Machine transfer logic (remains the same) ---
                if (targetInfo.target && typeof targetInfo.target.receiveResource === 'function') {
                    if (targetInfo.target.receiveResource(outputType, this)) {
                        transferred = true;
                        this.createResourceTransferEffect(outputType, targetInfo.target);
                    } else {
                        // Target rejected
                    }
                } else {
                     console.warn(`[${this.id}] Target Machine is invalid or missing receiveResource method.`);
                }
                // --- End Machine transfer logic ---
            }
            if (transferred) {
                this.outputInventory[outputType]--;
            } else {
                // Transfer failed or was rejected
            }
        } else {
            // No target found
        }
    }

    /**
     * Override findTargetForOutput to correctly identify the adjacent cell
     * based on the Advanced Processor's specific shape and direction.
     * This version checks all cells along the output face.
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

        // Determine the offset to check based on direction
        let dx = 0, dy = 0;
        switch (this.direction) {
            case 'right': dx = 1; break;
            case 'down':  dy = 1; break;
            case 'left':  dx = -1; break;
            case 'up':    dy = -1; break;
            default:
                console.warn(`[${this.id}] Invalid direction: ${this.direction}`);
                return null;
        }

        // Iterate through all cells occupied by this machine
        for (const cell of occupiedCells) {
            const outputFaceAbsX = cell.x; // Absolute X of the cell occupied by this machine
            const outputFaceAbsY = cell.y; // Absolute Y of the cell occupied by this machine

            // Calculate the coordinates of the potential target cell adjacent to this occupied cell
            const targetX = outputFaceAbsX + dx;
            const targetY = outputFaceAbsY + dy;
            
            // Check 1: Is the target cell within grid bounds?
            if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                continue; // Skip if out of bounds
            }
            
            // Check 2: Is the target cell part of this machine itself?
            const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
            if (isSelf) {
                continue; // Skip if target is part of this machine
            }

            // If the target cell is valid and not part of self, check its content
            const targetCell = this.grid.getCell(targetX, targetY);
            if (!targetCell) {
                continue; // Should not happen if bounds check passed, but good safety check
            }
            
            // Check if the target cell contains a valid machine or node
            if (targetCell.type === 'delivery-node' && targetCell.object) {
                 // Return info about the node and WHICH cell of this machine is outputting to it
                 return { type: 'delivery-node', target: targetCell.object, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
            if (targetCell.type === 'machine' && targetCell.machine) {
                // Already checked for self above, so this is a different machine
                 // Return info about the machine and WHICH cell of this machine is outputting to it
                 return { type: 'machine', target: targetCell.machine, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
            
            // If we reach here, the adjacent cell was empty or contained something non-targetable
        }
        
        return null;
    }

    /** Create transfer effect (Identical to Processor B) */
    createResourceTransferEffect(resourceType, target) {
        if (!this.container) { console.error(`[${this.id}] ERROR: this.container is null`); return; }
        if (!target.container) { console.error(`[${this.id}] ERROR: target.container is null`); return; }
        const sourcePos = { x: this.container.x, y: this.container.y };
        const targetPos = { x: target.container.x, y: target.container.y };
        const color = GAME_CONFIG.resourceColors[resourceType] || 0xaaaaaa;
        const particle = this.scene.add.circle(sourcePos.x, sourcePos.y, 5, color);
        particle.setDepth(this.container.depth + 1);
        this.scene.tweens.add({
            targets: particle,
            x: targetPos.x, y: targetPos.y,
            duration: 300, ease: 'Power1',
            onComplete: () => { particle.destroy(); }
        });
    }
    
    /** Create a preview sprite */
    static getPreviewSprite(scene, x, y) {
        const container = scene.add.container(x, y);
        const shape = [[0, 1, 0], [1, 1, 1], [0, 1, 0]];
        const cellSize = 14; // Smaller size for preview
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;
        const defaultInputPos = { x: 1, y: 0 }; // For default 'down' direction
        const defaultOutputPos = { x: 1, y: 2 }; // For default 'down' direction

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const partX = (c - shapeCenterX) * cellSize;
                    const partY = (r - shapeCenterY) * cellSize;
                    let color = 0x44ff44; // Default green
                    if (c === 1 && r === 1) color = 0xcc5599; // Core color
                    else if (c === defaultInputPos.x && r === defaultInputPos.y) color = 0x4aa8eb; // Blue input
                    else if (c === defaultOutputPos.x && r === defaultOutputPos.y) color = 0xffa520; // Orange output
                    
                    const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        const label = scene.add.text(0, 0, "ADV", { fontSize: 9, color: '#ffffff' }).setOrigin(0.5);
        container.add(label);
        return container;
    }
} 