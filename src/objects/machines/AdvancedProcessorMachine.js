import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Advanced Processor Machine
 * Combines Products A and B with coal to create Product C
 */
export default class AdvancedProcessorMachine extends BaseMachine {
    /**
     * Create a new advanced processor machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with processor-specific values
        this.id = 'advanced-processor';
        this.name = 'Advanced Processor';
        this.description = 'Combines Products A and B with coal to create Product C';
        this.shape = [
            [1, 1, 1],
            [0, 1, 0]
        ]; // T-shape
        this.inputTypes = ['product-a', 'product-b', 'coal'];
        this.outputTypes = ['product-c'];
        this.processingTime = 5000; // 5 seconds
        this.defaultDirection = 'down';
        
        // Initialize processor-specific properties
        this.isProcessing = false;
        this.processingProgress = 0;
        this.requiredInputs = {
            'product-a': 1,
            'product-b': 1,
            'coal': 1
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
        
        // Base machine body - larger for the T shape
        this.body = this.scene.add.rectangle(0, 0, cellSize * 2.8, cellSize * 1.8, 0x4a6fb5);
        this.body.setStrokeStyle(2, 0x333333);
        this.container.add(this.body);
        
        // Cut out the corners to make the T shape
        this.cornerCutout1 = this.scene.add.rectangle(
            -cellSize * 0.9, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        this.container.add(this.cornerCutout1);
        
        this.cornerCutout2 = this.scene.add.rectangle(
            cellSize * 0.9, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        this.container.add(this.cornerCutout2);
        
        // Processing mechanism in the center
        this.processorCore = this.scene.add.circle(0, 0, cellSize * 0.4, 0xffaa00);
        this.processorCore.setStrokeStyle(2, 0xcc8800);
        this.container.add(this.processorCore);
        
        // Input indicators (blue)
        this.inputSquare1 = this.scene.add.rectangle(
            -cellSize * 0.9, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare1.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare1);
        
        this.inputSquare2 = this.scene.add.rectangle(
            0, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare2.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare2);
        
        this.inputSquare3 = this.scene.add.rectangle(
            cellSize * 0.9, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare3.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare3);
        
        // Output indicator (orange)
        this.outputSquare = this.scene.add.rectangle(
            0, -cellSize * 0.45, 
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
                this.processorCore.scale = 1 + (progress * 0.3);
                
                // Add pulsing effect
                if (progress > 0.5) {
                    const pulseIntensity = Math.sin(progress * 10) * 0.2 + 0.8;
                    this.processorCore.alpha = pulseIntensity;
                }
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
        if (this.outputInventory['product-c'] >= 3) { // Limit output storage
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
        
        console.log('Advanced Processor started processing');
    }
    
    /**
     * Complete the processing operation
     */
    completeProcessing() {
        // Add the product to the output inventory
        this.outputInventory['product-c']++;
        
        // Reset processing state
        this.isProcessing = false;
        this.processingProgress = 0;
        
        // Reset visual feedback
        if (this.processorCore) {
            this.processorCore.alpha = 1;
            this.processorCore.scale = 1;
            this.processorCore.angle = 0;
        }
        
        console.log('Advanced Processor completed processing, produced 1 product-c');
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
        const cellSize = 20; // Use a smaller size for previews
        
        // Base machine body - T shape
        const body = scene.add.rectangle(0, 0, cellSize * 2.8, cellSize * 1.8, 0x4a6fb5);
        body.setStrokeStyle(2, 0x333333);
        container.add(body);
        
        // Cut out the corners to make the T shape
        const cornerCutout1 = scene.add.rectangle(
            -cellSize * 0.9, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        container.add(cornerCutout1);
        
        const cornerCutout2 = scene.add.rectangle(
            cellSize * 0.9, -cellSize * 0.45, 
            cellSize * 0.9, cellSize * 0.9, 
            0x1a2e3b
        );
        container.add(cornerCutout2);
        
        // Processing mechanism in the center
        const processorCore = scene.add.circle(0, 0, cellSize * 0.4, 0xffaa00);
        processorCore.setStrokeStyle(2, 0xcc8800);
        container.add(processorCore);
        
        // Input indicators (blue)
        const inputSquare1 = scene.add.rectangle(
            -cellSize * 0.9, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare1.setStrokeStyle(1, 0x000000);
        container.add(inputSquare1);
        
        const inputSquare2 = scene.add.rectangle(
            0, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare2.setStrokeStyle(1, 0x000000);
        container.add(inputSquare2);
        
        const inputSquare3 = scene.add.rectangle(
            cellSize * 0.9, cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare3.setStrokeStyle(1, 0x000000);
        container.add(inputSquare3);
        
        // Output indicator (orange)
        const outputSquare = scene.add.rectangle(
            0, -cellSize * 0.45, 
            cellSize * 0.3, cellSize * 0.3, 
            0xff9500
        );
        outputSquare.setStrokeStyle(1, 0x000000);
        container.add(outputSquare);
        
        // Add a simple direction indicator
        const directionIndicator = scene.add.triangle(
            0, -cellSize * 0.45,
            -cellSize * 0.1, -cellSize * 0.25,
            cellSize * 0.1, -cellSize * 0.25,
            0, -cellSize * 0.35,
            0xffffff
        );
        container.add(directionIndicator);
        
        return container;
    }
} 