import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor D Machine
 * Processes basic resources into advanced resources (L-Shape)
 */
export default class ProcessorDMachine extends BaseMachine {
    constructor(scene, config) {
        super(scene, config);
        this.config = config;
    }

    initMachineProperties() {
        this.id = 'processor-d';
        this.name = 'Processor D';
        this.description = 'Processes basic resources into advanced resources. (L-Shape)';
        
        const originalShape = [
            [1, 1], // Rotated J-shape from ProcessorAMachine, effectively an L
            [1, 0],
            [1, 0]
        ];
        
        this.inputTypes = ['basic-resource'];
        this.outputTypes = ['advanced-resource'];
        this.processingTime = 3500; // Slightly different from A
        this.defaultDirection = 'right'; // Default output direction
        
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'basic-resource': 1 
        };
        
        this.shape = originalShape;
        
        this.inputInventory = {
            'basic-resource': 0
        };
        this.outputInventory = {
            'advanced-resource': 0
        };
        
        console.log(`[ProcessorD] Initialized.`);
    }

    // createVisuals can be largely inherited from BaseMachine or ProcessorAMachine.
    // We might only need to adjust the label if BaseMachine doesn't handle it well.
    // For now, let's assume BaseMachine's createVisuals or a simple override is sufficient.
    // If specific visual details (like input/output square calculations for this shape)
    // differ significantly from ProcessorA, we'll need to override createVisuals more fully.

    // For simplicity, we'll start by assuming most logic from ProcessorAMachine (via BaseMachine)
    // for update, canProcess, startProcessing, completeProcessing, findTargetForOutput
    // is applicable or handled by BaseMachine. If specific overrides are needed due to the
    // L-shape affecting these, they would be added here.

    // Example of a minimal createVisuals override if only the label needs changing:
    createVisuals() {
        super.createVisuals(); // Call base/parent createVisuals

        if (this.container && this.container.list) {
            const label = this.container.list.find(item => item instanceof Phaser.GameObjects.Text && item.text === "A"); 
            if (label) {
                label.setText("D");
            } else {
                let existingLabel = this.container.list.find(item => item instanceof Phaser.GameObjects.Text);
                if(existingLabel){
                    existingLabel.setText("D");
                } else {
                    const cellSize = this.grid.cellSize;
                    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction || this.defaultDirection);
                    const shapeCenterX = (rotatedShape[0].length - 1) / 2;
                    const shapeCenterY = (rotatedShape.length - 1) / 2;
                    const visualCenterX = shapeCenterX * cellSize + cellSize / 2;
                    const visualCenterY = shapeCenterY * cellSize + cellSize / 2;
                    const newLabel = this.scene.add.text(visualCenterX, visualCenterY, "D", {
                        fontFamily: 'Arial',
                        fontSize: 14,
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    this.container.add(newLabel);
                }
            }
        }

        // Add progress bar (copied from ProcessorAMachine)
        const cellSize = this.grid.cellSize; // Ensure cellSize is available
        // Re-calculate visualCenter for progress bar positioning, relative to container
        // This assumes the container origin is top-left of the shape's bounding box after super.createVisuals()
        // and parts are added relative to this.visualCenterX/Y which should be defined by BaseMachine or ProcessorA visuals.
        // If this.visualCenterX is not available, we need to calculate it based on shape.
        const rotatedShapeForBar = this.grid.getRotatedShape(this.shape, this.direction || this.defaultDirection);
        const shapeCenterXForBar = (rotatedShapeForBar[0].length - 1) / 2;
        const shapeCenterYForBar = (rotatedShapeForBar.length - 1) / 2;
        const adjustedVisualCenterX = shapeCenterXForBar * cellSize + cellSize / 2;
        const adjustedVisualCenterY = shapeCenterYForBar * cellSize + cellSize / 2;

        this.progressBar = this.scene.add.rectangle(
            adjustedVisualCenterX, 
            adjustedVisualCenterY + cellSize * 0.6, 
            cellSize * 1.5, 
            6, 
            0x000000 
        ).setOrigin(0.5);
        this.progressBar.setDepth(1); 
        this.container.add(this.progressBar);
        
        this.progressFill = this.scene.add.rectangle(
            this.progressBar.x - this.progressBar.width / 2,
            this.progressBar.y,
            0, 
            this.progressBar.height,
            0x00ff00 
        ).setOrigin(0, 0.5);
        this.progressFill.setDepth(2);
        this.container.add(this.progressFill);
        
        this.progressBar.setVisible(false);
        this.progressFill.setVisible(false);
    }

    update(time, delta) {
        super.update(time, delta); 
        
        if (this.isProcessing) {
            const speedModifier = this.scene.upgradeManager.getProcessorSpeedModifier();
            const effectiveDelta = delta * speedModifier; 

            this.processingProgress += effectiveDelta; 

            const progressRatio = Math.min(1, this.processingProgress / this.processingTime);
            if (this.progressFill && this.progressBar) {
                 this.progressFill.width = this.progressBar.width * progressRatio;
            }
            
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            if (this.canProcess()) {
                this.startProcessing();
            }
        }

        if (this.hasOutput()) {
            this.pushOutput(); 
        }
    }
    
    canProcess() {
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            const currentAmount = this.inputInventory[resourceType] || 0;
            if (currentAmount < amount) {
                return false;
            }
        }
        
        const outputType = this.outputTypes[0]; // Assuming single output type for this processor
        const currentOutput = this.outputInventory[outputType] || 0;
        if (currentOutput >= 5) { 
            return false;
        }
        
        return true;
    }
    
    startProcessing() {
        for (const type in this.requiredInputs) {
            this.inputInventory[type] -= this.requiredInputs[type];
        }
        
        this.isProcessing = true;
        this.processingProgress = 0;
        
        if (this.progressBar && this.progressFill) { 
             this.progressBar.setVisible(true);
             this.progressFill.setVisible(true);
             this.progressFill.width = 0; 
        }
        
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('processing');
        }
        
        console.log(`[${this.id}] Started processing.`);
    }
    
    completeProcessing() {
        this.outputTypes.forEach(type => {
            if (this.outputInventory[type] !== undefined) {
                this.outputInventory[type]++;
            } else {
                console.warn(`[${this.id}] Output inventory does not have key: ${type}`);
            }
        });
        
        this.isProcessing = false;
        this.processingProgress = 0;
        
        if (this.progressBar && this.progressFill) { 
            this.progressBar.setVisible(false);
            this.progressFill.setVisible(false);
        }
        
        if (this.scene && this.scene.playSound) {
            this.scene.playSound('complete');
        }
        
        console.log(`[${this.id}] Completed processing. Output: ${JSON.stringify(this.outputInventory)}`);
        
        this.pushOutput();
    }

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

        for (const cell of occupiedCells) {
            const outputFaceAbsX = cell.x;
            const outputFaceAbsY = cell.y;

            const targetX = outputFaceAbsX + dx;
            const targetY = outputFaceAbsY + dy;
            
            if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                continue; 
            }
            
            const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
            if (isSelf) {
                continue; 
            }

            const targetCell = this.grid.getCell(targetX, targetY);
            if (!targetCell) {
                continue; 
            }
            
            if (targetCell.type === 'delivery-node' && targetCell.object) {
                 return { type: 'delivery-node', target: targetCell.object, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
            if (targetCell.type === 'machine' && targetCell.machine) {
                 return { type: 'machine', target: targetCell.machine, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
        }
        
        return null;
    }

    // Static method for preview (optional, but good for consistency)
    static getPreviewSprite(scene, x, y) {
        // Adapted from ProcessorAMachine
        const container = scene.add.container(x, y);
        const shape = [ [1, 1], [1, 0], [1, 0] ];
        const cellSize = 16; // Smaller size for UI preview
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const partX = (c - shapeCenterX) * cellSize;
                    const partY = (r - shapeCenterY) * cellSize;
                    let color = 0x44ff44; // Default green
                    // Simple coloring for preview, can be refined
                    if (r === 0 && c === 0) color = 0x4aa8eb; // Input-ish
                    else if (r === 2 && c === 0) color = 0xffa520; // Output-ish
                    
                    const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        const label = scene.add.text(0, 0, "D", { fontSize: 9, color: '#ffffff' }).setOrigin(0.5);
        container.add(label);
        return container;
    }
} 