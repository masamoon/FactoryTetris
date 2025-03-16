import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Conveyor Belt Machine
 * Transports resources between machines
 */
export default class ConveyorMachine extends BaseMachine {
    /**
     * Create a new conveyor belt machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with conveyor-specific values
        this.id = 'conveyor';
        this.name = 'Conveyor Belt';
        this.description = 'Transports resources between machines';
        this.shape = [[1]]; // 1x1 shape
        this.inputTypes = ['basic-resource', 'advanced-resource'];
        this.outputTypes = ['basic-resource', 'advanced-resource'];
        this.processingTime = 1000; // 1 second
        this.defaultDirection = 'right';
        
        // Initialize conveyor-specific properties
        this.transportSpeed = 1.5; // Speed multiplier for resource movement
        this.maxCapacity = 3; // Maximum number of resources on the conveyor at once
        this.currentItems = []; // Items currently on the conveyor
        
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
     * Override the createVisuals method to customize the conveyor appearance
     */
    createVisuals() {
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for conveyor machine: grid reference is missing');
            return;
        }
        
        // gridToWorld now returns the center of the cell
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts positioned at the center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Create the conveyor base - parts are now positioned relative to the center (0,0)
        const centerX = 0;
        const centerY = 0;
        
        // Create the conveyor base (slightly darker blue)
        const base = this.scene.add.rectangle(
            centerX, 
            centerY, 
            this.grid.cellSize - 4, 
            this.grid.cellSize - 4, 
            0x44ff44  // Updated to green to match our color scheme
        );
        this.container.add(base);
        
        // Create conveyor belt lines
        const beltWidth = this.grid.cellSize - 12;
        const beltHeight = 6;
        
        // Create three belt lines
        for (let i = -1; i <= 1; i++) {
            const offset = i * 10;
            const belt = this.scene.add.rectangle(
                centerX, 
                centerY + offset, 
                beltWidth, 
                beltHeight, 
                0x666666
            );
            this.container.add(belt);
            
            // Add animation to simulate movement
            this.scene.tweens.add({
                targets: belt,
                x: this.direction === 'left' ? centerX - 10 : 
                   this.direction === 'right' ? centerX + 10 : centerX,
                y: this.direction === 'up' ? centerY - 10 : 
                   this.direction === 'down' ? centerY + 10 : centerY + offset,
                duration: 500,
                ease: 'Linear',
                yoyo: true,
                repeat: -1
            });
        }
        
        // Add rollers at the ends
        const rollerRadius = 6;
        
        // Position rollers based on direction
        let roller1X, roller1Y, roller2X, roller2Y;
        
        switch (this.direction) {
            case 'right':
            case 'left':
                roller1X = centerX - beltWidth / 2;
                roller1Y = centerY;
                roller2X = centerX + beltWidth / 2;
                roller2Y = centerY;
                break;
            case 'down':
            case 'up':
                roller1X = centerX;
                roller1Y = centerY - beltWidth / 2;
                roller2X = centerX;
                roller2Y = centerY + beltWidth / 2;
                break;
        }
        
        const roller1 = this.scene.add.circle(roller1X, roller1Y, rollerRadius, 0x888888);
        const roller2 = this.scene.add.circle(roller2X, roller2Y, rollerRadius, 0x888888);
        this.container.add(roller1);
        this.container.add(roller2);
        
        // Add direction indicator
        // Get the absolute position of the machine in the world
        const absoluteX = this.container.x;
        const absoluteY = this.container.y;
        
        // Create the direction indicator directly in the scene, not in the container
        const indicatorColor = 0xff9500;
        
        this.directionIndicator = this.scene.add.triangle(
            absoluteX,  // Place exactly at machine center X
            absoluteY,  // Place exactly at machine center Y
            -4, -6,     // left top
            -4, 6,      // left bottom
            8, 0,       // right point
            indicatorColor
        ).setOrigin(0.5, 0.5);
        
        // Rotate based on direction
        switch (this.direction) {
            case 'right':
                this.directionIndicator.rotation = 0; // Point right (0 degrees)
                break;
            case 'down':
                this.directionIndicator.rotation = Math.PI / 2; // Point down (90 degrees)
                break;
            case 'left':
                this.directionIndicator.rotation = Math.PI; // Point left (180 degrees)
                break;
            case 'up':
                this.directionIndicator.rotation = 3 * Math.PI / 2; // Point up (270 degrees)
                break;
        }
        
        // Set the depth to ensure it appears above the machine
        this.directionIndicator.setDepth(this.container.depth + 1);
        
        console.log(`Direction indicator created at absolute position (${absoluteX}, ${absoluteY})`);
        
        // Add machine type indicator
        const machineLabel = this.scene.add.text(centerX, centerY, 'C', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(machineLabel);
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Add interactive features
        this.addInteractivity();
    }
    
    /**
     * Override the update method to handle conveyor-specific logic
     */
    update(time, delta) {
        // Debug the current state
        if (this.scene.time.now % 3000 < 16) { // Log every ~3 seconds to avoid spam
           /* console.log(`Conveyor at (${this.gridX}, ${this.gridY}):`);
            console.log(`- Direction: ${this.direction}`);
            console.log(`- Input inventory:`, JSON.stringify(this.inputInventory));
            console.log(`- Output inventory:`, JSON.stringify(this.outputInventory));
            console.log(`- Input types:`, this.inputTypes.join(', '));
            console.log(`- Output types:`, this.outputTypes.join(', ')); */
        }
        
        // Move items along the conveyor
        this.moveItems(delta);
        
        // Check if we can transfer resources to connected machines
        this.transferResources();
    }
    
    /**
     * Move items along the conveyor
     * @param {number} delta - Time elapsed since last update in ms
     */
    moveItems(delta) {
        // Transfer resources from input to output inventory
        for (const resourceType of this.inputTypes) {
            if (this.inputInventory[resourceType] > 0) {
                // Move one resource from input to output
                this.inputInventory[resourceType]--;
                
                // Ensure the resource type is in our output inventory
                if (this.outputInventory[resourceType] === undefined) {
                    this.outputInventory[resourceType] = 0;
                }
                
                this.outputInventory[resourceType]++;
               // console.log(`Conveyor moved 1 ${resourceType} from input to output inventory`);
            }
        }
    }
    
    /**
     * Override the canProcess method for conveyor-specific logic
     * @returns {boolean} True if the conveyor can accept more items
     */
    canProcess() {
        // Conveyor can accept items if it's not at max capacity
        return this.currentItems.length < this.maxCapacity;
    }
    
    /**
     * Override the transferResources method for conveyor-specific logic
     */
    transferResources() {
        // Find connected machine in the output direction
        const connectedMachine = this.findConnectedMachine();
        
        if (!connectedMachine) {
            //console.log(`Conveyor at (${this.gridX}, ${this.gridY}): No connected machine found in direction ${this.direction}`);
            return;
        }
        
        //console.log(`Conveyor at (${this.gridX}, ${this.gridY}): Found connected machine: ${connectedMachine.id} at (${connectedMachine.gridX}, ${connectedMachine.gridY})`);
        
        // Check if the connected machine can accept any of our resources
        for (const resourceType of this.outputTypes) {
            // If we have this resource type in our output inventory
            if (this.outputInventory[resourceType] > 0) {
                //console.log(`Conveyor has ${this.outputInventory[resourceType]} ${resourceType} to transfer`);
                
                // Get the connected machine's input types
                let connectedInputTypes = [];
                
                // Try different ways to get input types (for compatibility with different machine classes)
                if (connectedMachine.inputTypes) {
                    connectedInputTypes = connectedMachine.inputTypes;
                } else if (connectedMachine.getInputTypes && typeof connectedMachine.getInputTypes === 'function') {
                    connectedInputTypes = connectedMachine.getInputTypes();
                }
                
                //console.log(`Connected machine input types: ${connectedInputTypes.join(', ')}`);
                
                // Check if the connected machine accepts this resource type
                if (connectedInputTypes.includes(resourceType)) {
                    // Make sure the connected machine has an input inventory
                    if (!connectedMachine.inputInventory) {
                        connectedMachine.inputInventory = {};
                    }
                    
                    // Initialize the resource type in the connected machine's inventory if needed
                    if (connectedMachine.inputInventory[resourceType] === undefined) {
                        connectedMachine.inputInventory[resourceType] = 0;
                    }
                    
                    // Transfer the resource
                    this.outputInventory[resourceType]--;
                    connectedMachine.inputInventory[resourceType]++;
                    
                   // console.log(`Transferred 1 ${resourceType} from conveyor at (${this.gridX}, ${this.gridY}) to machine at (${connectedMachine.gridX}, ${connectedMachine.gridY})`);
                    
                    // Create a visual effect for the transfer
                    this.createResourceTransferEffect(resourceType, connectedMachine);
                    
                    // Only transfer one resource per update
                    break;
                } else {
                    //console.log(`Connected machine cannot accept resource type: ${resourceType}`);
                }
            }
        }
    }
    
    /**
     * Create a visual effect for resource transfer
     * @param {string} resourceType - The type of resource being transferred
     * @param {BaseMachine} targetMachine - The machine receiving the resource
     */
    createResourceTransferEffect(resourceType, targetMachine) {
        // Get resource color from config
        const resourceColor = GAME_CONFIG.resourceColors[resourceType] || 0xffffff;
        
        // Calculate start and end positions - gridToWorld now returns the center of the cell
        const startWorldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        const endWorldPos = this.grid.gridToWorld(targetMachine.gridX, targetMachine.gridY);
        
        // No need to add half cell size since gridToWorld now returns the center
        const startX = startWorldPos.x;
        const startY = startWorldPos.y;
        const endX = endWorldPos.x;
        const endY = endWorldPos.y;
        
        // Create a small circle representing the resource
        const resourceSprite = this.scene.add.circle(startX, startY, 5, resourceColor);
        
        // Animate the resource moving to the target machine
        this.scene.tweens.add({
            targets: resourceSprite,
            x: endX,
            y: endY,
            duration: 500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                resourceSprite.destroy();
            }
        });
    }
    
    /**
     * Find a machine connected to this one in the output direction
     * @returns {BaseMachine|null} The connected machine or null if none found
     */
    findConnectedMachine() {
        if (!this.grid) {
            console.log('No grid reference in findConnectedMachine');
            return null;
        }
        
        // Determine the target cell based on the direction
        let targetX = this.gridX;
        let targetY = this.gridY;
        
        switch (this.direction) {
            case 'right':
                targetX += 1;
                break;
            case 'down':
                targetY += 1;
                break;
            case 'left':
                targetX -= 1;
                break;
            case 'up':
                targetY -= 1;
                break;
            default:
                console.log(`Unknown direction: ${this.direction}`);
                return null;
        }
        
        // Get the cell at the target position
        const targetCell = this.grid.getCell(targetX, targetY);
        
        if (!targetCell) {
            return null;
        }
        
        // Check if the cell has a machine
        if (targetCell.type === 'machine' && targetCell.machine) {
            return targetCell.machine;
        }
        
        return null;
    }
    
    /**
     * Override the getPreviewSprite method for the machine selection panel
     */
    getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Set default cell size for preview
        const cellSize = 24;
        
        // Create the conveyor base
        const base = scene.add.rectangle(0, 0, cellSize - 4, cellSize - 4, 0x3a5fa5);
        container.add(base);
        
        // Create conveyor belt lines
        const beltWidth = cellSize - 12;
        const beltHeight = 3;
        
        // Create three belt lines
        for (let i = -1; i <= 1; i++) {
            const offset = i * 5;
            const belt = scene.add.rectangle(0, offset, beltWidth, beltHeight, 0x666666);
            container.add(belt);
        }
        
        // Add rollers at the ends
        const roller1 = scene.add.circle(-beltWidth/2 + 2, 0, 3, 0x888888);
        const roller2 = scene.add.circle(beltWidth/2 - 2, 0, 3, 0x888888);
        container.add(roller1);
        container.add(roller2);
        
        // Add direction indicator
        const indicator = scene.add.triangle(0, 0, -2, -3, -2, 3, 4, 0, 0xff9500);
        container.add(indicator);
        
        // Add label
        const label = scene.add.text(0, 0, 'C', {
            fontFamily: 'Arial',
            fontSize: 10,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        return container;
    }
} 