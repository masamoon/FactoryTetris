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
        this.outputTypes = ['advanced-resource']; // Produces advanced
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
        
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        console.log(`[${this.id}] Created container at world position (${worldPos.x}, ${worldPos.y})`);
        
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Default input/output positions for 'down' direction (relative to shape 0,0)
        // Shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]]
        // For 'down': Input top (1,0), Output bottom (1,2)
        const defaultInputPos = { x: 1, y: 0 }; 
        const defaultOutputPos = { x: 1, y: 2 };

        // Rotate based on actual direction
        this.inputPos = this.getRelativeRotatedPos(defaultInputPos, this.direction, this.shape[0].length, this.shape.length);
        this.outputPos = this.getRelativeRotatedPos(defaultOutputPos, this.direction, this.shape[0].length, this.shape.length);

        const cellSize = this.grid.cellSize;
        const shapeCenterX = (this.shape[0].length - 1) / 2;
        const shapeCenterY = (this.shape.length - 1) / 2;
        const corePartPos = { x: 1, y: 1 }; // Center of the cross shape

        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    const partX = (x - shapeCenterX) * cellSize;
                    const partY = (y - shapeCenterY) * cellSize;
                    
                    let partColor = 0x44ff44; // Default green
                    let isInputPart = (x === this.inputPos.x && y === this.inputPos.y);
                    let isOutputPart = (x === this.outputPos.x && y === this.outputPos.y);
                    let isCorePart = (x === corePartPos.x && y === corePartPos.y);

                    if (isInputPart) partColor = 0x4aa8eb; // Blue input
                    else if (isOutputPart) partColor = 0xffa520; // Orange output
                    else if (isCorePart) partColor = 0xcc5599; // Distinct core color (e.g., purple/magenta)
                    
                    const part = this.scene.add.rectangle(partX, partY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333);
                    this.container.add(part);
                    
                    if (isInputPart) this.inputSquare = part;
                    if (isOutputPart) this.outputSquare = part;
                }
            }
        }
        
        const machineLabel = this.scene.add.text(0, 0, "ADV", { fontSize: 10, color: '#ffffff' }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        this.progressBar = this.scene.add.rectangle(0, cellSize * 0.75, cellSize * 2, 4, 0x00ff00).setOrigin(0.5, 0);
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // Add processor core visual effect (maybe a different shape?)
        this.processorCore = this.scene.add.star(0, 0, 4, cellSize / 4, cellSize / 3, 0xffdd00); // Yellow star
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        this.processorCore.setDepth(machineLabel.depth - 1);
        
        // Add direction indicator to the scene
        if (this.direction !== 'none') {
            const absoluteX = this.container.x;
            const absoluteY = this.container.y;
            const indicatorColor = 0xff9500;
            this.directionIndicator = this.scene.add.triangle(absoluteX, absoluteY, -4, -6, -4, 6, 8, 0, indicatorColor).setOrigin(0.5, 0.5);
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
        switch (direction) {
            case 'left': // 90 deg CW from 'down' (default)
                [x, y] = [shapeHeight - 1 - originalPos.y, originalPos.x];
                break;
            case 'up': // 180 deg CW from 'down'
                [x, y] = [shapeWidth - 1 - originalPos.x, shapeHeight - 1 - originalPos.y];
                break;
            case 'right': // 270 deg CW from 'down'
                [x, y] = [originalPos.y, shapeWidth - 1 - originalPos.x];
                break;
             // case 'down': // 0 deg from default - no change
        }
        return { x, y };
    }

    /** Override the update method */
    update(time, delta) {
        super.update(time, delta);
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
                this.processorCore.alpha = 0.6 + (progress * 0.4);
                this.processorCore.scale = 1 + (progress * 0.3);
                this.processorCore.angle += delta * 0.2; // Faster spin
            }
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            if (this.canProcess()) {
                this.startProcessing();
            }
        }
        const outputType = this.outputTypes[0];
        if (this.outputInventory[outputType] > 0) {
            this.transferResources();
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
        if (!this.canProcess()) return;
        // Consume BOTH inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            this.inputInventory[resourceType] -= amount;
        }
        this.isProcessing = true;
        this.processingProgress = 0;
        if (this.progressBar) this.progressBar.scaleX = 0;
        if (this.processorCore) {
            this.processorCore.alpha = 0.6;
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
        if (this.progressBar) this.progressBar.scaleX = 0;
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
        }
        console.log(`[${this.id}] Processing complete. Output:`, this.outputInventory);
    }

    /** Transfer resources (Identical to Processor B, uses findTargetForOutput) */
    transferResources() {
        const outputType = this.outputTypes[0];
        if (this.outputInventory[outputType] <= 0) return; 
        const targetInfo = this.findTargetForOutput();
        if (targetInfo) {
            let transferred = false;
            if (targetInfo.type === 'delivery-node') {
                if (targetInfo.target.acceptResource(outputType)) {
                    transferred = true;
                    this.createResourceTransferEffect(outputType, targetInfo.target);
                }
            } else if (targetInfo.type === 'machine') {
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

    /** Find target (Identical to Processor B) */
    findTargetForOutput() {
        if (!this.grid) return null;
        let targetX = this.gridX, targetY = this.gridY;
        switch (this.direction) {
            case 'right': targetX += 1; break;
            case 'down': targetY += 1; break;
            case 'left': targetX -= 1; break;
            case 'up': targetY -= 1; break;
            default: return null;
        }
        if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) return null;
        const targetCell = this.grid.getCell(targetX, targetY);
        if (!targetCell) return null;
        if (targetCell.type === 'delivery-node' && targetCell.object) return { type: 'delivery-node', target: targetCell.object };
        if (targetCell.type === 'machine' && targetCell.machine) return { type: 'machine', target: targetCell.machine };
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