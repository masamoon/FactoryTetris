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
        ]; // Square Tetris piece (2x2)
        this.inputTypes = ['product-a', 'product-b', 'product-c'];
        this.outputTypes = [];
        this.processingTime = 2000; // 2 seconds
        this.defaultDirection = 'none';
        
        // Apply shape rotation if needed
        this.shape = config.shape || (this.grid ? this.grid.getRotatedShape(this.shape, this.rotation) : this.shape);
        
        // Initialize loader-specific properties
        this.isLoading = false;
        this.loadingProgress = 0;
        this.loadingRate = 1; // 1 product per loading cycle
        
        // Initialize inventory
        this.inputInventory = {};
        this.inputTypes.forEach(type => {
            this.inputInventory[type] = 0;
        });
    }
    
    /**
     * Override the createVisuals method to customize the cargo loader appearance
     */
    createVisuals() {
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for machine: grid reference is missing');
            return;
        }
        
        // Calculate world position for the top-left corner of the machine
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Store references to input squares
        this.inputSquares = [];
        
        // Determine input positions - for cargo loader, we'll make the top-left and bottom-right corners inputs
        const inputPositions = [
            { x: 0, y: 0 }, // top-left
            { x: 1, y: 1 }  // bottom-right
        ];
        
        // Calculate cell size for consistent sizing
        const cellSize = this.grid.cellSize;
        
        // Create machine parts based on shape
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x] === 1) {
                    // Calculate part position relative to top-left corner
                    const partX = x * cellSize + cellSize / 2;
                    const partY = y * cellSize + cellSize / 2;
                    
                    // Determine part color based on whether it's an input or regular part
                    let partColor = 0x4a6fb5; // Default blue color
                    
                    // Check if this is an input position
                    const isInput = inputPositions.some(pos => pos.x === x && pos.y === y);
                    if (isInput) {
                        partColor = 0x3498db; // Blue for input
                    }
                    
                    // Create machine part
                    const part = this.scene.add.rectangle(partX, partY, cellSize - 4, cellSize - 4, partColor);
                    this.container.add(part);
                    
                    // Store references to input squares
                    if (isInput) {
                        this.inputSquares.push(part);
                    }
                }
            }
        }
        
        // Calculate the machine center for indicators and labels
        const centerX = (this.shape[0].length * cellSize) / 2;
        const centerY = (this.shape.length * cellSize) / 2;
        
        // Add machine type indicator at the center of the machine
        const machineLabel = this.scene.add.text(centerX, centerY, "CL", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add loading progress bar
        this.progressBar = this.scene.add.rectangle(
            centerX, 
            centerY + cellSize / 4, 
            cellSize - 10, 
            4, 
            0x00ff00
        );
        this.progressBar.scaleX = 0;
        this.container.add(this.progressBar);
        
        // Add placement animation
        this.addPlacementAnimation();
    }
    
    /**
     * Update method called by the scene
     * @param {number} time - The current time
     * @param {number} delta - The time since the last update
     */
    update(time, delta) {
        super.update(time, delta);
        
        // If we're loading, update progress
        if (this.isLoading) {
            this.loadingProgress += delta;
            
            // Update visual progress
            if (this.progressBar) {
                const progress = this.loadingProgress / this.processingTime;
                this.progressBar.scaleX = progress;
            }
            
            // Check if loading is complete
            if (this.loadingProgress >= this.processingTime) {
                this.completeLoading();
            }
        } 
        // If we're not loading, check if we can start loading
        else if (this.canLoad()) {
            this.startLoading();
        }
    }
    
    /**
     * Check if the machine can load products
     * @returns {boolean} Whether the machine can load products
     */
    canLoad() {
        // Check if any input has resources
        for (const type of this.inputTypes) {
            if (this.inputInventory[type] > 0) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Start loading products
     */
    startLoading() {
        // Find first product type with resources
        let resourceType = null;
        for (const type of this.inputTypes) {
            if (this.inputInventory[type] > 0) {
                resourceType = type;
                break;
            }
        }
        
        if (!resourceType) {
            return;
        }
        
        // Reduce input inventory
        this.inputInventory[resourceType] -= 1;
        
        // Set loading state
        this.isLoading = true;
        this.loadingProgress = 0;
        this.currentResourceType = resourceType;
        
        // Visual feedback for loading
        if (this.progressBar) {
            this.scene.tweens.add({
                targets: this.progressBar,
                scaleX: 1,
                duration: this.processingTime,
                ease: 'Linear'
            });
        }
        
        // Play loading animation for the resource
        this.createProductLoadingEffect(resourceType);
    }
    
    /**
     * Complete loading cycle
     */
    completeLoading() {
        // Reset loading state
        this.isLoading = false;
        this.loadingProgress = 0;
        
        // Add resources to the cargo bay
        if (this.scene.cargoManager) {
            this.scene.cargoManager.addProduct(this.currentResourceType, 1);
        }
        
        // Reset visual feedback
        if (this.progressBar) {
            this.progressBar.scaleX = 0;
        }
        
        console.log(`Cargo Loader loaded 1 ${this.currentResourceType}`);
    }
    
    /**
     * Create a visual effect for product loading
     * @param {string} resourceType - The type of resource being loaded
     */
    createProductLoadingEffect(resourceType) {
        // Get the resource color based on type
        let resourceColor;
        switch (resourceType) {
            case 'product-a':
                resourceColor = 0xff0000; // Red
                break;
            case 'product-b':
                resourceColor = 0x00ff00; // Green
                break;
            case 'product-c':
                resourceColor = 0xffff00; // Yellow
                break;
            default:
                resourceColor = 0xcccccc; // Gray
        }
        
        // Create a simple particle effect
        const cellSize = this.grid.cellSize;
        const centerX = (this.shape[0].length * cellSize) / 2;
        const centerY = (this.shape.length * cellSize) / 2;
        
        const particle = this.scene.add.circle(centerX, centerY, 5, resourceColor);
        this.container.add(particle);
        
        // Animate the particle
        this.scene.tweens.add({
            targets: particle,
            alpha: 0,
            scale: 2,
            duration: this.processingTime,
            onComplete: () => {
                particle.destroy();
            }
        });
    }
    
    /**
     * Create a new cargo loader machine preview sprite
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Container} The preview container
     */
    static getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Get the default shape from game config
        const shape = [
            [1, 1],
            [1, 1]
        ]; // Square Tetris piece
        
        // Base machine body
        const cellSize = 24; // Use a smaller size for previews
        
        // Calculate dimensions
        const width = shape[0].length * cellSize;
        const height = shape.length * cellSize;
        
        // Define input positions
        const inputPositions = [
            { x: 0, y: 0 }, // top-left
            { x: 1, y: 1 }  // bottom-right
        ];
        
        // Draw each cell based on the shape
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[0].length; x++) {
                if (shape[y][x] === 1) {
                    // Calculate position
                    const cellX = (x * cellSize) - (width / 2) + (cellSize / 2);
                    const cellY = (y * cellSize) - (height / 2) + (cellSize / 2);
                    
                    // Determine if this is an input cell
                    const isInput = inputPositions.some(pos => pos.x === x && pos.y === y);
                    const color = isInput ? 0x3498db : 0x4a6fb5;
                    
                    const rect = scene.add.rectangle(cellX, cellY, cellSize - 2, cellSize - 2, color);
                    rect.setStrokeStyle(1, 0x333333);
                    container.add(rect);
                }
            }
        }
        
        // Add a simple label
        const label = scene.add.text(0, 0, "CL", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        return container;
    }
} 