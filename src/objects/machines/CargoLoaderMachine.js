import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Cargo Loader Machine
 * Loads products into the cargo bay
 */
export default class CargoLoaderMachine extends BaseMachine {
    /**
     * Create a new cargo loader machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with cargo loader-specific values
        this.id = 'cargo-loader';
        this.name = 'Cargo Loader';
        this.description = 'Loads products into the cargo bay';
        this.shape = [
            [1, 1],
            [1, 1]
        ]; // 2x2 square shape
        this.inputTypes = ['product-a', 'product-b', 'product-c'];
        this.outputTypes = [];
        this.processingTime = 2000; // 2 seconds
        this.defaultDirection = 'none';
        
        // Initialize cargo loader-specific properties
        this.isLoading = false;
        this.loadingProgress = 0;
        this.loadingRate = 1; // Products per loading cycle
        
        // Apply shape rotation if needed
        this.shape = config.shape || (this.grid ? this.grid.getRotatedShape(this.shape, this.rotation) : this.shape);
        
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        this.inputTypes.forEach(type => {
            this.inputInventory[type] = 0;
        });
    }
    
    /**
     * Override the createVisuals method to customize the cargo loader appearance
     */
    createVisuals() {
        // Calculate the center position of the machine
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        const cellSize = this.grid.cellSize;
        
        // Create a container for all visual elements
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Base machine body - larger for the 2x2 shape
        this.body = this.scene.add.rectangle(0, 0, cellSize * 1.9, cellSize * 1.9, 0x4a6fb5);
        this.body.setStrokeStyle(2, 0x333333);
        this.container.add(this.body);
        
        // Loading mechanism in the center
        this.loaderCore = this.scene.add.rectangle(0, 0, cellSize * 1.2, cellSize * 0.6, 0x888888);
        this.loaderCore.setStrokeStyle(2, 0x666666);
        this.container.add(this.loaderCore);
        
        // Conveyor belt visual
        this.conveyor = this.scene.add.rectangle(0, 0, cellSize * 1.2, cellSize * 0.3, 0x333333);
        this.container.add(this.conveyor);
        
        // Conveyor belt rollers
        for (let i = -2; i <= 2; i++) {
            const roller = this.scene.add.rectangle(
                i * cellSize * 0.2, 0,
                cellSize * 0.1, cellSize * 0.3,
                0x555555
            );
            this.container.add(roller);
        }
        
        // Input indicators (blue) - one on each side
        this.inputSquare1 = this.scene.add.rectangle(
            -cellSize * 0.7, -cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare1.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare1);
        
        this.inputSquare2 = this.scene.add.rectangle(
            cellSize * 0.7, -cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare2.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare2);
        
        this.inputSquare3 = this.scene.add.rectangle(
            -cellSize * 0.7, cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare3.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare3);
        
        this.inputSquare4 = this.scene.add.rectangle(
            cellSize * 0.7, cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        this.inputSquare4.setStrokeStyle(1, 0x000000);
        this.container.add(this.inputSquare4);
        
        // Add resource type indicators
        this.addResourceTypeIndicators();
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Add interactivity
        this.addInteractivity();
    }
    
    /**
     * Override the update method to handle loading logic
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Check if we can start loading
        if (!this.isLoading && this.canLoad()) {
            this.startLoading();
        }
        
        // If we're loading, update the progress
        if (this.isLoading) {
            this.loadingProgress += delta;
            
            // Update visual feedback
            if (this.loaderCore) {
                const progress = this.loadingProgress / this.processingTime;
                this.loaderCore.alpha = 0.5 + (progress * 0.5);
            }
            
            // Animate the conveyor belt
            if (this.conveyor) {
                // Move the rollers to simulate conveyor movement
                this.container.list.forEach(item => {
                    if (item !== this.conveyor && item !== this.body && item !== this.loaderCore && 
                        item !== this.inputSquare1 && item !== this.inputSquare2 && 
                        item !== this.inputSquare3 && item !== this.inputSquare4) {
                        item.x += (delta / 1000) * 20;
                        if (item.x > cellSize * 0.6) {
                            item.x = -cellSize * 0.6;
                        }
                    }
                });
            }
            
            // If we've reached the processing time, complete the loading
            if (this.loadingProgress >= this.processingTime) {
                this.completeLoading();
            }
        }
    }
    
    /**
     * Check if the machine can start loading
     * @returns {boolean} True if the machine can load
     */
    canLoad() {
        // Check if we have any products to load
        for (const resourceType of this.inputTypes) {
            if (this.inputInventory[resourceType] && this.inputInventory[resourceType] > 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Start the loading operation
     */
    startLoading() {
        // Set loading state
        this.isLoading = true;
        this.loadingProgress = 0;
        
        // Visual feedback for loading
        if (this.loaderCore) {
            this.scene.tweens.add({
                targets: this.loaderCore,
                scaleY: 1.2,
                duration: this.processingTime / 2,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        }
        
        console.log('Cargo Loader started loading');
    }
    
    /**
     * Complete the loading operation
     */
    completeLoading() {
        // Find a product to load
        let loadedProduct = null;
        
        for (const resourceType of this.inputTypes) {
            if (this.inputInventory[resourceType] && this.inputInventory[resourceType] > 0) {
                // Consume one unit of the product
                this.inputInventory[resourceType]--;
                loadedProduct = resourceType;
                break;
            }
        }
        
        if (loadedProduct) {
            // Send the product to the cargo bay
            if (this.scene.cargoBay) {
                this.scene.cargoBay.addProduct(loadedProduct);
                
                // Create visual effect for the transfer
                this.createProductLoadingEffect(loadedProduct);
                
                // Add score
                const productConfig = GAME_CONFIG.productRequirements.find(p => p.type === loadedProduct);
                if (productConfig && this.scene.addScore) {
                    this.scene.addScore(productConfig.points);
                }
                
                console.log(`Cargo Loader completed loading, sent 1 ${loadedProduct} to cargo bay`);
            } else {
                console.warn('Cargo Loader could not find cargo bay to send product to');
            }
        }
        
        // Reset loading state
        this.isLoading = false;
        this.loadingProgress = 0;
        
        // Reset visual feedback
        if (this.loaderCore) {
            this.loaderCore.alpha = 1;
            this.loaderCore.scaleY = 1;
        }
    }
    
    /**
     * Create a visual effect for product loading
     * @param {string} resourceType - The type of resource being loaded
     */
    createProductLoadingEffect(resourceType) {
        // Get resource color from config
        const resourceColor = GAME_CONFIG.resourceColors[resourceType] || 0xffffff;
        
        // Calculate start position
        const startPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Calculate end position (cargo bay)
        const endPos = {
            x: this.scene.cargoBay.x,
            y: this.scene.cargoBay.y
        };
        
        // Create a small circle representing the resource
        const resourceSprite = this.scene.add.circle(startPos.x, startPos.y, 8, resourceColor);
        
        // Animate the resource moving to the cargo bay
        this.scene.tweens.add({
            targets: resourceSprite,
            x: endPos.x,
            y: endPos.y,
            scale: 0.5,
            duration: 1000,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Add a flash effect at the cargo bay
                const flash = this.scene.add.circle(endPos.x, endPos.y, 20, resourceColor, 0.7);
                this.scene.tweens.add({
                    targets: flash,
                    scale: 2,
                    alpha: 0,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        flash.destroy();
                    }
                });
                
                resourceSprite.destroy();
            }
        });
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
        
        // Base machine body - 2x2 shape
        const body = scene.add.rectangle(0, 0, cellSize * 1.9, cellSize * 1.9, 0x4a6fb5);
        body.setStrokeStyle(2, 0x333333);
        container.add(body);
        
        // Loading mechanism in the center
        const loaderCore = scene.add.rectangle(0, 0, cellSize * 1.2, cellSize * 0.6, 0x888888);
        loaderCore.setStrokeStyle(2, 0x666666);
        container.add(loaderCore);
        
        // Conveyor belt visual
        const conveyor = scene.add.rectangle(0, 0, cellSize * 1.2, cellSize * 0.3, 0x333333);
        container.add(conveyor);
        
        // Input indicators (blue) - one on each corner
        const inputSquare1 = scene.add.rectangle(
            -cellSize * 0.7, -cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare1.setStrokeStyle(1, 0x000000);
        container.add(inputSquare1);
        
        const inputSquare2 = scene.add.rectangle(
            cellSize * 0.7, -cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare2.setStrokeStyle(1, 0x000000);
        container.add(inputSquare2);
        
        const inputSquare3 = scene.add.rectangle(
            -cellSize * 0.7, cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare3.setStrokeStyle(1, 0x000000);
        container.add(inputSquare3);
        
        const inputSquare4 = scene.add.rectangle(
            cellSize * 0.7, cellSize * 0.7, 
            cellSize * 0.3, cellSize * 0.3, 
            0x3498db
        );
        inputSquare4.setStrokeStyle(1, 0x000000);
        container.add(inputSquare4);
        
        return container;
    }
} 