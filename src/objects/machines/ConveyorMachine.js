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
        
        // Initialize conveyor-specific properties
        this.transportSpeed = 1.5; // Speed multiplier for resource movement
        this.maxCapacity = 3; // Maximum number of resources on the conveyor at once
        this.currentItems = []; // Items currently on the conveyor
    }

    /**
     * Initialize machine-specific properties
     * Override this method to set properties for specific machine types
     */
    initMachineProperties() {
        // Override base machine properties with conveyor-specific values
        this.id = 'conveyor';
        this.name = 'Conveyor Belt';
        this.description = 'Transports resources between machines';
        this.shape = [[1]]; // 1x1 shape
        this.inputTypes = ['basic-resource', 'advanced-resource'];
        this.outputTypes = ['basic-resource', 'advanced-resource'];
        this.processingTime = 1000; // 1 second
        this.defaultDirection = 'right';

        console.log(`[${this.name}] Initialized with shape dimensions: ${this.shape.length}x${this.shape[0].length}`);
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
        // Determine target cell based on direction
        let targetX = this.gridX;
        let targetY = this.gridY;

        switch (this.direction) {
            case 'right': targetX += 1; break;
            case 'down': targetY += 1; break;
            case 'left': targetX -= 1; break;
            case 'up': targetY -= 1; break;
        }

        // Check grid bounds
        if (!this.grid || targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
            // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): Target (${targetX}, ${targetY}) is out of bounds.`);
            return; // Target cell is out of bounds
        }

        // Get the target cell content
        const targetCell = this.grid.getCell(targetX, targetY);

        if (!targetCell) {
            // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): No cell found at target (${targetX}, ${targetY}).`);
            return; // No cell found
        }

        // --- Check for Delivery Node FIRST ---
        if (targetCell.type === 'delivery-node' && targetCell.object) {
            const deliveryNode = targetCell.object;
            
            // Try to deliver any resource we have in output
            for (const resourceType in this.outputInventory) {
                if (this.outputInventory[resourceType] > 0) {
                    // Attempt to deliver the resource
                    if (deliveryNode.acceptResource(resourceType)) {
                        // Decrease output inventory
                        this.outputInventory[resourceType]--;
                        
                        // Optional: Create visual effect for transfer to delivery node
                        this.createResourceTransferEffect(resourceType, deliveryNode); // Pass node as target
                        
                       // console.log(`Conveyor at (${this.gridX}, ${this.gridY}) delivered ${resourceType} to DeliveryNode at (${targetX}, ${targetY})`);
                        
                        // Delivered one item, return for this cycle
                        return; 
                    } else {
                       // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): DeliveryNode at (${targetX}, ${targetY}) rejected ${resourceType}`);
                        // Node might be full or inactive (though our current node doesn't reject)
                    }
                }
            }
            // If we reached here, either no resources in output or node rejected all
            return; 
        }

        // --- Original Logic: Check for Connected Machine ---
        if (targetCell.type === 'machine' && targetCell.machine) {
            const connectedMachine = targetCell.machine;
           // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): Found connected machine: ${connectedMachine.name} at (${targetX}, ${targetY})`);

            // Check if the connected machine can accept any of our resources
            for (const resourceType of this.outputTypes) {
                // If we have this resource type in our output inventory
                if (this.outputInventory[resourceType] > 0) {
                    
                    // Get the connected machine's input types
                    let connectedInputTypes = [];
                    if (connectedMachine.inputTypes) {
                        connectedInputTypes = connectedMachine.inputTypes;
                    } else if (connectedMachine.getInputTypes && typeof connectedMachine.getInputTypes === 'function') {
                        connectedInputTypes = connectedMachine.getInputTypes();
                    }
                    
                    // Check if the connected machine accepts this resource type AND can accept input now
                    if (connectedInputTypes.includes(resourceType) && 
                        connectedMachine.canAcceptInput && connectedMachine.canAcceptInput(resourceType)) {
                        
                        // Attempt to transfer the resource
                        if (connectedMachine.receiveResource(resourceType, this)) {
                            // Decrease our output inventory
                            this.outputInventory[resourceType]--;
                            
                            // Optional: Create visual effect (already handled by receiveResource? Maybe not)
                            // If receiveResource doesn't handle the visual, uncomment this:
                            // this.createResourceTransferEffect(resourceType, connectedMachine);

                           // console.log(`Conveyor at (${this.gridX}, ${this.gridY}) transferred ${resourceType} to ${connectedMachine.name} at (${targetX}, ${targetY})`);
                            
                            // Transferred one item, return for this cycle
                            return;
                        } else {
                           // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): ${connectedMachine.name} at (${targetX}, ${targetY}) failed to receive ${resourceType}`);
                        }
                    } else {
                       // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): ${connectedMachine.name} at (${targetX}, ${targetY}) does not accept ${resourceType} or cannot accept input now.`);
                    }
                }
            }
            // If we reached here, either no transferable resources or machine rejected/can't accept
            return;
        }

       // console.log(`Conveyor at (${this.gridX}, ${this.gridY}): Target cell (${targetX}, ${targetY}) is not a machine or delivery node (type: ${targetCell.type}).`);
    }
    
    /**
     * Creates a visual effect for resource transfer
     * @param {string} resourceType - The type of resource being transferred
     * @param {BaseMachine | DeliveryNode} target - The target machine or delivery node
     */
    createResourceTransferEffect(resourceType, target) {
        // --- SAFETY CHECK --- 
        // Ensure this machine's container and the scene exist before creating effect
        if (!this.container || !this.scene) {
            console.warn(`Conveyor at (${this.gridX}, ${this.gridY}): Cannot create transfer effect, container or scene missing.`);
            return; 
        }
        // --- END SAFETY CHECK --- 

        // Determine target position (machine containers are centered, nodes might need adjustment)
        let targetX, targetY;
        if (target instanceof BaseMachine && target.container) {
            targetX = target.container.x;
            targetY = target.container.y;
        } else if (target.container) { // Assumes DeliveryNode also has a container
            targetX = target.container.x;
            targetY = target.container.y;
        } else {
            // Fallback if container is not available (shouldn't happen often)
            const targetPos = this.grid.gridToWorld(target.gridX, target.gridY);
            targetX = targetPos.x;
            targetY = targetPos.y;
        }

        // Get source position (center of the conveyor)
        const sourceX = this.container.x;
        const sourceY = this.container.y;
        
        // Create resource particle
        const color = GAME_CONFIG.resourceColors[resourceType] || 0xaaaaaa;
        const particle = this.scene.add.circle(sourceX, sourceY, 5, color);
        particle.setDepth(this.container.depth + 2); // Ensure visibility over machines/nodes
        
        // Animate particle moving to target
        this.scene.tweens.add({
            targets: particle,
            x: targetX,
            y: targetY,
            duration: 300, // Make transfer visually quick
            ease: 'Power1',
            onComplete: () => {
                particle.destroy();
            }
        });
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

    /**
     * Check if the conveyor can accept a specific resource type into its input.
     * @param {string} resourceTypeId - The ID of the resource type.
     * @returns {boolean} True if the resource can be accepted, false otherwise.
     */
    canAcceptInput(resourceTypeId) {
        // Initialize inventory if needed
        if (this.inputInventory[resourceTypeId] === undefined) {
            this.inputInventory[resourceTypeId] = 0;
        }
        // Check if input inventory has space (e.g., less than 5)
        const inputCapacity = 5;
        return this.inputInventory[resourceTypeId] < inputCapacity;
    }

    /**
     * Accept a resource directly from a ResourceNode.
     * @param {string} resourceTypeId - The ID of the resource type to accept.
     * @returns {boolean} True if the resource was accepted, false otherwise.
     */
    acceptResourceFromMine(resourceTypeId) {
        if (this.canAcceptInput(resourceTypeId)) {
            this.inputInventory[resourceTypeId]++;
            // Optional: Trigger a small visual effect on the conveyor
            this.scene.tweens.add({
                targets: this.container, // Or a specific part
                scaleY: 1.1, // Briefly pulse
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
            return true;
        }
        return false;
    }
} 