import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Processor B Machine
 * Processes raw resources into Product B
 */
export default class ProcessorBMachine extends BaseMachine {
    /**
     * Create a new processor B machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with processor-specific values
        this.id = 'processor-b';
        this.name = 'Processor B';
        this.description = 'Processes raw resources into Product B';
        this.shape = [
            [1, 1],
            [1, 0]
        ]; // Reverse L-shape
        this.inputTypes = ['raw-resource', 'iron-ore'];
        this.outputTypes = ['product-b'];
        this.processingTime = 3000; // 3 seconds
        this.defaultDirection = 'right';
        
        // Initialize processor-specific properties
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'raw-resource': 1,
            'iron-ore': 1
        };
        
        // Apply shape rotation if needed
        this.shape = config.shape || (this.grid ? this.grid.getRotatedShape(this.shape, this.rotation) : this.shape);
        
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        this.inputTypes.forEach(type => {
            this.inputInventory[type] = 0;
        });
        
        this.outputTypes.forEach(type => {
            this.outputInventory[type] = 0;
        });
    }
    
    /**
     * Override the createVisuals method to customize the processor appearance
     */
    createVisuals() {
        // Calculate the center position of the machine
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        const cellSize = this.grid.cellSize;
        
        // Create a container for all visual elements
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Base machine body - larger for the reverse L shape
        this.body = this.scene.add.rectangle(0, 0, cellSize * 1.8, cellSize * 1.8, 0x4a6fb5);
        this.body.setStrokeStyle(2, 0x333333);
        this.container.add(this.body);
        
        // Cut out the corner to make the reverse L shape
        this.cornerCutout = this.scene.add.rectangle(
            cellSize * 0.45, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        this.container.add(this.cornerCutout);
        
        // Processing mechanism in the center
        this.processorCore = this.scene.add.circle(0, 0, cellSize * 0.3, 0x0000ff);
        this.processorCore.setStrokeStyle(2, 0x000099);
        this.container.add(this.processorCore);
        
        // Input indicator (blue)
        this.inputSquare = this.scene.add.rectangle(
            -cellSize * 0.6, 0, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare);
        
        // Output indicator (orange)
        this.outputSquare = this.scene.add.rectangle(
            cellSize * 0.6, 0, 
            cellSize * 0.3, cellSize * 0.3, 
            0xff9500
        );
        this.outputSquare.setStrokeStyle(1, 0x000000);
        this.container.add(this.outputSquare);
        
        // Create direction indicator
        this.createDirectionIndicator(0, 0);
        
        // Add resource type indicators
        this.addResourceTypeIndicators();
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Add interactivity
        this.addInteractivity();
        
        // Adjust container position based on shape and rotation
        this.adjustContainerPosition();
    }
    
    /**
     * Adjust the container position based on the shape and rotation
     */
    adjustContainerPosition() {
        const cellSize = this.grid.cellSize;
        
        // Adjust based on rotation
        switch (this.direction) {
            case 'right': // Default reverse L shape
                this.container.x += cellSize * 0.25;
                this.container.y += cellSize * 0.25;
                break;
            case 'down': // Rotated 90 degrees
                this.container.x -= cellSize * 0.25;
                this.container.y += cellSize * 0.25;
                break;
            case 'left': // Rotated 180 degrees
                this.container.x -= cellSize * 0.25;
                this.container.y -= cellSize * 0.25;
                break;
            case 'up': // Rotated 270 degrees
                this.container.x += cellSize * 0.25;
                this.container.y -= cellSize * 0.25;
                break;
        }
        
        // Rotate the container to match the machine rotation
        this.container.rotation = this.rotation;
    }
    
    /**
     * Override the update method to handle processing logic
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Check if we can start processing
        if (!this.isProcessing && this.canProcess()) {
            this.startProcessing();
        }
        
        // If we're processing, update the progress
        if (this.isProcessing) {
            this.processingProgress += delta;
            
            // Update visual feedback
            if (this.processorCore) {
                const progress = this.processingProgress / this.processingTime;
                this.processorCore.alpha = 0.5 + (progress * 0.5);
                this.processorCore.scale = 1 + (progress * 0.2);
            }
            
            // If we've reached the processing time, complete the processing
            if (this.processingProgress >= this.processingTime) {
                this.completeProcessing();
            }
        }
        
        // Try to transfer resources to connected machines
        this.transferResources();
    }
    
    /**
     * Check if the machine can start processing
     * @returns {boolean} True if the machine can process
     */
    canProcess() {
        // Check if we have enough of each required input
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            if (!this.inputInventory[resourceType] || this.inputInventory[resourceType] < amount) {
                return false;
            }
        }
        
        // Check if there's room in the output inventory
        if (this.outputInventory['product-b'] >= 5) { // Limit output storage
            return false;
        }
        
        return true;
    }
    
    /**
     * Start the processing operation
     */
    startProcessing() {
        // Consume the required inputs
        for (const [resourceType, amount] of Object.entries(this.requiredInputs)) {
            this.inputInventory[resourceType] -= amount;
        }
        
        // Set processing state
        this.isProcessing = true;
        this.processingProgress = 0;
        
        // Visual feedback for processing
        if (this.processorCore) {
            this.scene.tweens.add({
                targets: this.processorCore,
                angle: 360,
                duration: this.processingTime,
                ease: 'Linear'
            });
        }
        
        console.log('Processor B started processing');
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add the product to the output inventory
        this.outputInventory['product-b']++;
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visual feedback
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
        
        console.log('Processor B completed processing, produced 1 product-b');
    }
    
    /**
     * Get a preview sprite for this machine type
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - The x position
     * @param {number} y - The y position
     * @returns {Phaser.GameObjects.Container} The preview sprite
     */
    getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Base machine body
        const cellSize = 24; // Use a smaller size for previews
        
        // Base machine body - reverse L shape
        const body = scene.add.rectangle(0, 0, cellSize * 1.8, cellSize * 1.8, 0x4a6fb5);
        body.setStrokeStyle(2, 0x333333);
        container.add(body);
        
        // Cut out the corner to make the reverse L shape
        const cornerCutout = scene.add.rectangle(
            cellSize * 0.45, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        container.add(cornerCutout);
        
        // Processing mechanism in the center
        const processorCore = scene.add.circle(0, 0, cellSize * 0.3, 0x0000ff);
        processorCore.setStrokeStyle(2, 0x000099);
        container.add(processorCore);
        
        // Input indicator (blue)
        const inputSquare = scene.add.rectangle(
            -cellSize * 0.6, 0, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare.setStrokeStyle(1, 0x000000);
        container.add(inputSquare);
        
        // Output indicator (orange)
        const outputSquare = scene.add.rectangle(
            cellSize * 0.6, 0, 
            cellSize * 0.3, cellSize * 0.3, 
            0xff9500
        );
        outputSquare.setStrokeStyle(1, 0x000000);
        container.add(outputSquare);
        
        // Add a simple direction indicator
        const directionIndicator = scene.add.triangle(
            cellSize * 0.6, 0,
            cellSize * 0.4, -cellSize * 0.1,
            cellSize * 0.4, cellSize * 0.1,
            cellSize * 0.5, 0,
            0xffffff
        );
        container.add(directionIndicator);
        
        return container;
    }
} 