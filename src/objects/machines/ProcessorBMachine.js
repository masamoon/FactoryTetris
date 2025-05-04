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
        
        // Create container for machine parts at the cell top-left
        // *** MODIFIED: Use topLeftPos ***
        this.container = this.scene.add.container(topLeftPos.x, topLeftPos.y);
        //console.log(`[${this.id}] Created container at world position (${topLeftPos.x}, ${topLeftPos.y})`);
        
        // Store references to input and output squares
        this.inputSquare = null;
        this.outputSquare = null;
        
        // Determine input and output relative positions (relative to shape's 0,0) for the *default* orientation ('right')
        // Shape: [[0, 1, 0], [1, 1, 1]]
        // For 'right' direction: Input on left (0,1), Output on right (2,1)
        const defaultInputPos = { x: 0, y: 1 }; 
        const defaultOutputPos = { x: 2, y: 1 };

        // Rotate these default positions based on the actual machine direction
        // *** MODIFIED: Use rotatedShape dimensions for calculation ***
        this.inputPos = this.getRelativeRotatedPos(defaultInputPos, this.direction, rotatedShape[0].length, rotatedShape.length);
        this.outputPos = this.getRelativeRotatedPos(defaultOutputPos, this.direction, rotatedShape[0].length, rotatedShape.length);

        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Calculate the shape center in terms of cells (relative to shape's 0,0)
        // *** MODIFIED: Use rotatedShape dimensions ***
        const shapeCenterX = (rotatedShape[0].length - 1) / 2;
        const shapeCenterY = (rotatedShape.length - 1) / 2;

        // Create machine parts based on shape using center-relative positioning
        // *** MODIFIED: Use rotatedShape ***
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // *** MODIFIED: Use rotatedShape ***
                if (rotatedShape[y][x] === 1) {
                    // *** MODIFIED: Use top-left positioning logic from BaseMachine ***
                    const partCenterX = x * cellSize + cellSize / 2;
                    const partCenterY = y * cellSize + cellSize / 2;
                    
                    // *** REMOVED Old adjustedX/Y ***
                    // let partX = 0;
                    // let partY = 0;
                    // partX = x * cellSize;
                    // partY = y * cellSize;
                    // const adjustedX = partX - cellSize;
                    // const adjustedY = partY - cellSize ;
                    
                    // Determine part color
                    let partColor = 0x44ff44; // Default green
                    // *** Use calculated this.inputPos/outputPos which are already relative to rotated shape ***
                    let isInputPart = (x === this.inputPos.x && y === this.inputPos.y);
                    let isOutputPart = (x === this.outputPos.x && y === this.outputPos.y);

                    if (isInputPart) {
                        partColor = 0x4aa8eb; // Blue for input
                    } else if (isOutputPart) {
                        partColor = 0xffa520; // Orange for output
                    }
                    
                    // Create machine part
                    // *** MODIFIED: Use partCenterX/Y for positioning ***
                    const part = this.scene.add.rectangle(partCenterX, partCenterY, cellSize - 4, cellSize - 4, partColor);
                    part.setStrokeStyle(1, 0x333333); // Subtle stroke
                    this.container.add(part);
                    
                    // Add text indicator for input/output parts
                    if (isInputPart) {
                        // *** MODIFIED: Use partCenterX/Y for positioning ***
                         const inputIndicator = this.scene.add.text(
                             partCenterX, 
                             partCenterY, 
                             "IN", {
                            fontFamily: 'Arial', fontSize: 10, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(inputIndicator);
                        this.inputSquare = part; // Store reference
                    } else if (isOutputPart) {
                        // *** MODIFIED: Use partCenterX/Y for positioning ***
                        const outputIndicator = this.scene.add.text(
                             partCenterX, 
                             partCenterY, 
                             "OUT", {
                            fontFamily: 'Arial', fontSize: 9, color: '#ffffff'
                        }).setOrigin(0.5);
                        this.container.add(outputIndicator);
                        this.outputSquare = part; // Store reference
                    }
                }
            }
        }
        
        // Position relative to the VISUAL center of the shape within the container
        const visualCenterX = shapeCenterX * cellSize;
        const visualCenterY = shapeCenterY * cellSize;
        
        // Adjust center based on user's part offset
        // *** MODIFIED: Use positioning logic from BaseMachine ***
        const adjustedVisualCenterX = visualCenterX + cellSize / 2;
        const adjustedVisualCenterY = visualCenterY + cellSize / 2;

        // Add machine type label at the center
        const machineLabel = this.scene.add.text(adjustedVisualCenterX, adjustedVisualCenterY, "B", {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff'
        }).setOrigin(0.5);
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

        // Add processor core visual (similar to Processor A) relative to adjusted center
        this.processorCore = this.scene.add.circle(adjustedVisualCenterX, adjustedVisualCenterY, cellSize / 4, 0x00ccff); // Different color (e.g., cyan)
        this.processorCore.setStrokeStyle(1, 0xffffff);
        this.container.add(this.processorCore);
        this.processorCore.setDepth(machineLabel.depth - 1); // Behind label
        
        // Add direction indicator *to the scene* if applicable
        if (this.direction !== 'none') {
            // *** MODIFIED: Use absolute positioning logic from BaseMachine ***
            const absoluteCenterX = this.container.x + adjustedVisualCenterX;
            const absoluteCenterY = this.container.y + adjustedVisualCenterY;
            const indicatorColor = 0xff9500;
            
            this.directionIndicator = this.scene.add.triangle(
                absoluteCenterX, absoluteCenterY, -4, -6, -4, 6, 8, 0, indicatorColor
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

        // *** Use the ORIGINAL shape dimensions for rotation calculation ***
        // The rotation formulas depend on the dimensions of the *original* matrix being transformed
        const originalWidth = this.shape[0].length; 
        const originalHeight = this.shape.length;

        switch (direction) {
            case 'down': // 90 deg CW
                // Original formula: (row, col) -> (col, H-1-row)
                x = originalPos.y; // New x is original column index
                y = originalHeight - 1 - originalPos.x; // New y based on original height and original row index
                break;
            case 'left': // 180 deg CW
                 // Original formula: (row, col) -> (W-1-col, H-1-row)
                x = originalWidth - 1 - originalPos.x;
                y = originalHeight - 1 - originalPos.y;
                break;
            case 'up': // 270 deg CW
                 // Original formula: (row, col) -> (W-1-row, col) -> My trace was wrong again! It's (H-1-col, row)?
                 // Let's use standard 270 deg CW: (y, W-1-x)
                 x = originalHeight - 1 - originalPos.y; // New x is H-1-original_y
                 y = originalPos.x; // New y is original_x
                break;
            // case 'right': // 0 deg - no change
        }
        return { x, y };
    }

    /**
     * Override the update method to handle processing logic
     */
    update(time, delta) {
        // Call base class update first
        super.update(time, delta);

        // If processing, update progress
        if (this.isProcessing) {
            this.processingProgress += delta;

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
    
    /**
     * Override findTargetForOutput to correctly identify the adjacent cell
     * based on the Processor B's specific T-shape and direction.
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
        // console.warn(`[${this.id} @ (${this.gridX},${this.gridY})] Finding target (Dir: ${this.direction}). Occupied Cells: ${JSON.stringify(occupiedCells)}`); // REMOVED LOG
        for (const cell of occupiedCells) {
            const outputFaceAbsX = cell.x; // Absolute X of the cell occupied by this machine
            const outputFaceAbsY = cell.y; // Absolute Y of the cell occupied by this machine

            // Calculate the coordinates of the potential target cell adjacent to this occupied cell
            const targetX = outputFaceAbsX + dx;
            const targetY = outputFaceAbsY + dy;
            // console.warn(`  [${this.id}] Checking adjacent to occupied (${outputFaceAbsX},${outputFaceAbsY}) -> Target coords (${targetX},${targetY})`); // REMOVED LOG
            
            // Check 1: Is the target cell within grid bounds?
            if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
                // console.warn(`    -> Target (${targetX},${targetY}) out of bounds.`); // REMOVED LOG
                continue; // Skip if out of bounds
            }
            
            // Check 2: Is the target cell part of this machine itself?
            const isSelf = occupiedCells.some(occupied => occupied.x === targetX && occupied.y === targetY);
            if (isSelf) {
                // console.warn(`    -> Target (${targetX},${targetY}) is part of self.`); // REMOVED LOG
                continue; // Skip if target is part of this machine
            }

            // If the target cell is valid and not part of self, check its content
            const targetCell = this.grid.getCell(targetX, targetY);
            if (!targetCell) {
                // console.warn(`    -> Target (${targetX},${targetY}) has null/undefined cell data.`); // REMOVED LOG
                continue; 
            }
            
            // console.warn(`    -> Target (${targetX},${targetY}) contains type: ${targetCell.type}`); // REMOVED LOG

            // Check if the target cell contains a valid machine or node
            if (targetCell.type === 'delivery-node' && targetCell.object) {
                // console.warn(`    -> SUCCESS: Found target Delivery Node at (${targetX}, ${targetY})`); // REMOVED LOG
                // Return info about the node and WHICH cell of this machine is outputting to it
                 return { type: 'delivery-node', target: targetCell.object, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
            if (targetCell.type === 'machine' && targetCell.machine) {
                // console.warn(`    -> SUCCESS: Found target machine ${targetCell.machine.name} at (${targetX}, ${targetY})`); // REMOVED LOG
                 // Return info about the machine and WHICH cell of this machine is outputting to it
                 return { type: 'machine', target: targetCell.machine, outputFaceX: outputFaceAbsX, outputFaceY: outputFaceAbsY };
            }
        }
        
        // If the loop completes without finding a valid target
        // console.warn(`[${this.id}] No valid target found adjacent to any output face cell in direction ${this.direction}`); // REMOVED LOG
        return null;
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