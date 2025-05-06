import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor 2 Machine
 * Combines basic and advanced resources into mega resources (Long L-Shape)
 */
export default class AdvancedProcessor2Machine extends BaseMachine {
    constructor(scene, config) {
        super(scene, config);
    }

    initMachineProperties() {
        this.id = 'advanced-processor-2';
        this.name = 'Advanced Processor 2';
        this.description = 'Combines basic and advanced resources into mega resources. (Long L-Shape)';
        
        const originalShape = [
            [1, 1, 1, 1],
            [1, 0, 0, 0]
        ];
        
        this.inputTypes = ['basic-resource', 'advanced-resource'];
        this.outputTypes = ['mega-resource'];
        this.processingTime = 6000; // Different processing time
        this.defaultDirection = 'down'; 
        
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'basic-resource': 1,
            'advanced-resource': 1 
        };
        
        this.shape = originalShape;
        
        this.inputInventory = {
            'basic-resource': 0,
            'advanced-resource': 0
        };
        this.outputInventory = {
            'mega-resource': 0
        };
        
        console.log(`[AdvancedProcessor2] Initialized.`);
    }

    createVisuals() {
        super.createVisuals();
        if (this.container && this.container.list) {
            let existingLabel = this.container.list.find(item => item instanceof Phaser.GameObjects.Text && item.text === "ADV");
            if (existingLabel) {
                existingLabel.setText("MGA2");
            } else {
                existingLabel = this.container.list.find(item => item instanceof Phaser.GameObjects.Text);
                if(existingLabel) existingLabel.setText("MGA2");
                else {
                    const cellSize = this.grid.cellSize;
                    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction || this.defaultDirection);
                    const shapeCenterX = (rotatedShape[0].length - 1) / 2;
                    const shapeCenterY = (rotatedShape.length - 1) / 2;
                    const visualCenterX = shapeCenterX * cellSize + cellSize / 2;
                    const visualCenterY = shapeCenterY * cellSize + cellSize / 2;
                    const newLabel = this.scene.add.text(visualCenterX, visualCenterY, "MGA2", {
                        fontFamily: 'Arial',
                        fontSize: 10,
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    this.container.add(newLabel);
                }
            }
        }

        // Add progress bar (copied from AdvancedProcessorMachine/ProcessorAMachine)
        const cellSize = this.grid.cellSize; 
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

    static getPreviewSprite(scene, x, y) {
        const container = scene.add.container(x, y);
        const shape = [[1,1,1,1],[1,0,0,0]];
        const cellSize = 12; // Adjusted for larger shape preview
        const shapeCenterX = (shape[0].length - 1) / 2;
        const shapeCenterY = (shape.length - 1) / 2;
        // Simplified coloring for preview
        const inputColor = 0x4aa8eb;
        const outputColor = 0xffa520;
        const defaultColor = 0xaa44aa; 

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const partX = (c - shapeCenterX) * cellSize;
                    const partY = (r - shapeCenterY) * cellSize;
                    let color = defaultColor;
                    // Example input/output (highly dependent on actual rotated input/output logic)
                    if (r === 0 && c === 0) color = inputColor; // one input corner
                    else if (r === 1 && c === 0) color = inputColor; // another input corner
                    else if (r === 0 && c === 3) color = outputColor; // output corner
                    
                    const rect = scene.add.rectangle(partX, partY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x555555);
                    container.add(rect);
                }
            }
        }
        const label = scene.add.text(0, 0, "MGA2", { fontSize: 7, color: '#ffffff' }).setOrigin(0.5);
        container.add(label);
        return container;
    }
} 