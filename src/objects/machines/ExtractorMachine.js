import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Resource Extractor Machine
 * Extracts resources from resource nodes
 */
export default class ExtractorMachine extends BaseMachine {
    /**
     * Create a new extractor machine
     * @param {Phaser.Scene} scene - The scene this machine belongs to
     * @param {Object} config - Configuration object
     */
    constructor(scene, config) {
        super(scene, config);
        
        // Override base machine properties with extractor-specific values
        this.id = 'extractor';
        this.name = 'Resource Extractor';
        this.description = 'Extracts resources from nodes';
        this.shape = [[1]]; // 1x1 shape
        this.inputTypes = [];
        this.outputTypes = ['basic-resource', 'advanced-resource'];
        this.processingTime = 2000; // 2 seconds
        this.defaultDirection = 'down';
        
        // Initialize extractor-specific properties
        this.resourceNode = null;
        this.resourceType = null;
        this.extractionRate = 1; // Resources per extraction
        this.isExtracting = false;
        this.extractionProgress = 0;
        this.extractionTimer = null;
        
        // Apply shape rotation if needed
        this.shape = config.shape || (this.grid ? this.grid.getRotatedShape(this.shape, this.rotation) : this.shape);
        
        // Initialize inventories
        this.inputInventory = {};
        this.outputInventory = {};
        
        // Explicitly initialize the output inventory for each output type
        this.outputTypes.forEach(type => {
            this.outputInventory[type] = 0;
        });
        
        ////console.log*(`Initialized extractor with output types: ${this.outputTypes.join(', ')}`);
        ////console.log*(`Initial output inventory:`, JSON.stringify(this.outputInventory));
        
        // Check for resource node at this position
        this.checkForResourceNode();
        
        // If we found a resource node, make sure its type is in our output types
        if (this.resourceNode && this.resourceType) {
            const resourceTypeId = this.resourceType.id;
            if (!this.outputTypes.includes(resourceTypeId)) {
                ////console.log*(`Adding resource type ${resourceTypeId} to output types`);
                this.outputTypes.push(resourceTypeId);
                this.outputInventory[resourceTypeId] = 0;
            }
        }
    }
    
    /**
     * Override the createVisuals method to customize the extractor appearance
     */
    createVisuals() {
        // Calculate the center position of the machine
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        const cellSize = this.grid.cellSize;
        
        // Create a container for all visual elements - gridToWorld now returns the center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Base machine body - positioned at (0,0) which is the center of the container
        this.body = this.scene.add.rectangle(0, 0, cellSize * 0.9, cellSize * 0.9, 0x555555);
        this.body.setStrokeStyle(2, 0x333333);
        this.container.add(this.body);
        
        // Drill bit in the center
        this.drillBit = this.scene.add.circle(0, 0, cellSize * 0.2, 0x888888);
        this.drillBit.setStrokeStyle(2, 0x666666);
        this.container.add(this.drillBit);
        
        // Add rotating animation to the drill bit
        this.scene.tweens.add({
            targets: this.drillBit,
            angle: 360,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Output indicator (darker orange for extractor)
        this.outputSquare = this.scene.add.rectangle(
            0, cellSize * 0.3, 
            cellSize * 0.3, cellSize * 0.3, 
            0xffa520  // Updated to brighter orange to match dragging preview
        );
        this.outputSquare.setStrokeStyle(1, 0x000000);
        this.container.add(this.outputSquare);
        
        // Create direction indicator
        // Get the absolute position of the machine in the world
        const absoluteX = this.container.x;
        const absoluteY = this.container.y;
        
        // Create the direction indicator directly in the scene, not in the container
        const indicatorColor = 0xffffff; // White for extractors
        
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
        
        // Add resource type indicators
        this.addResourceTypeIndicators();
        
        // Add placement animation
        this.addPlacementAnimation();
        
        // Add interactivity
        this.addInteractivity();
    }
    
    /**
     * Check for a resource node at this machine's position
     */
    checkForResourceNode() {
        if (!this.grid) {
            ////console.log*('No grid reference in checkForResourceNode');
            return;
        }
        
        ////console.log*(`Checking for resource node at (${this.gridX}, ${this.gridY})`);
        
        // First, check the cell directly at our position
        const gridCell = this.grid.getCell(this.gridX, this.gridY);
        
        if (gridCell && gridCell.type === 'node' && gridCell.object) {
            this.resourceNode = gridCell.object;
            this.resourceType = this.resourceNode.resourceType;
            
           // //console.log*(`Found resource node directly at (${this.gridX}, ${this.gridY}), type: ${this.resourceType.id}`);
           // //console.log*(`Resource node has ${this.resourceNode.resources}/${this.resourceNode.maxResources} resources`);
            return;
        }
        
        // Check if the cell has a resourceNode property (might be set during placement)
        if (gridCell && gridCell.resourceNode) {
            this.resourceNode = gridCell.resourceNode;
            this.resourceType = this.resourceNode.resourceType;
            
            ////console.log*(`Found resource node in cell data at (${this.gridX}, ${this.gridY}), type: ${this.resourceType.id}`);
            ////console.log*(`Resource node has ${this.resourceNode.resources}/${this.resourceNode.maxResources} resources`);
            return;
        }
        
        // If not found directly, search the entire grid (this is a fallback)
        ////console.log*('No resource node found directly, searching grid...');
        
        // Get grid dimensions
        const gridWidth = this.grid.width;
        const gridHeight = this.grid.height;
        
        // Search all cells in the grid
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const gridCell = this.grid.getCell(x, y);
                
                // Check for resource nodes that might be at our position
                if (gridCell && gridCell.type === 'node' && gridCell.object) {
                    const node = gridCell.object;
                    if (node && node.gridX === this.gridX && node.gridY === this.gridY) {
                        this.resourceNode = node;
                        this.resourceType = this.resourceNode.resourceType;
                        
                        ////console.log*(`Found resource node in grid search at (${x}, ${y}), type: ${this.resourceType.id}`);
                        ////console.log*(`Resource node has ${this.resourceNode.resources}/${this.resourceNode.maxResources} resources`);
                        return;
                    }
                }
                
                // Also check for cells that have a resourceNode property
                if (gridCell && gridCell.resourceNode) {
                    const node = gridCell.resourceNode;
                    if (node && node.gridX === this.gridX && node.gridY === this.gridY) {
                        this.resourceNode = node;
                        this.resourceType = this.resourceNode.resourceType;
                        
                        ////console.log*(`Found resource node in cell data during grid search at (${x}, ${y}), type: ${this.resourceType.id}`);
                        ////console.log*(`Resource node has ${this.resourceNode.resources}/${this.resourceNode.maxResources} resources`);
                        return;
                    }
                }
            }
        }
        
       // //console.log*(`No resource node found at position (${this.gridX}, ${this.gridY})`);
    }
    
    /**
     * Manually add resources to the output inventory (for testing)
     * This is a direct way to add resources to the inventory
     */
    addTestResources() {
        // Add one of each resource type to the output inventory
        this.outputTypes.forEach(type => {
            this.outputInventory[type] = 1;
            ////console.log*(`Added 1 test ${type} to output inventory`);
        });
        
        // If we have a resource node, add its specific resource type
        if (this.resourceNode && this.resourceType) {
            const resourceTypeId = this.resourceType.id;
            if (!this.outputTypes.includes(resourceTypeId)) {
                this.outputTypes.push(resourceTypeId);
                this.outputInventory[resourceTypeId] = 0;
            }
            this.outputInventory[resourceTypeId] += 2;
            ////console.log*(`Added 2 test ${resourceTypeId} from resource node to output inventory`);
        }
        
        ////console.log*(`Test resources added. Current inventory:`, JSON.stringify(this.outputInventory));
    }
    
    /**
     * Override the update method to handle extraction logic
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Debug the current state
        if (this.scene.time.now % 3000 < 16) { // Log every ~3 seconds to avoid spam
            ////console.log*(`Extractor at (${this.gridX}, ${this.gridY}):`);
            ////console.log*(`- Has resource node: ${this.resourceNode ? 'Yes' : 'No'}`);
            if (this.resourceNode) {
                ////console.log*(`- Resource node type: ${this.resourceNode.resourceType?.id || 'unknown'}`);
                ////console.log*(`- Resource node resources: ${this.resourceNode.resources}/${this.resourceNode.maxResources}`);
            }
            ////console.log*(`- Is extracting: ${this.isExtracting}`);
            ////console.log*(`- Extraction progress: ${this.extractionProgress}/${this.processingTime}`);
            ////console.log*(`- Output inventory:`, JSON.stringify(this.outputInventory));
            
            // Force a check for resource node if we don't have one
            if (!this.resourceNode) {
               // //console.log*('Forcing resource node check...');
                this.checkForResourceNode();
            }
            
            // TEMPORARY: Add test resources every few seconds if inventory is empty
            const hasResources = Object.values(this.outputInventory).some(count => count > 0);
            if (!hasResources) {
                ////console.log*('Inventory is empty, adding test resources...');
                this.addTestResources();
            }
        }
        
        // If we have a resource node, extract from it
        if (this.resourceNode) {
            // Check if the resource node has resources
            if (this.resourceNode.resources > 0) {
                if (!this.isExtracting) {
                   // //console.log*(`Starting extraction from node with ${this.resourceNode.resources} resources of type ${this.resourceNode.resourceType?.id || 'unknown'}`);
                    this.startExtracting();
                }
            } else {
                // If we're not extracting and the node has no resources, log it
                if (!this.isExtracting) {
                   // //console.log*(`Resource node has no resources to extract (${this.resourceNode.resources}/${this.resourceNode.maxResources})`);
                }
            }
        } else {
            // If we don't have a resource node, try to find one
           // //console.log*('No resource node found, checking for one...');
            this.checkForResourceNode();
        }
        
        // If we're extracting, update the progress
        if (this.isExtracting) {
            this.extractionProgress += delta;
            
            // Log progress every 500ms
            if (Math.floor(this.extractionProgress / 500) > Math.floor((this.extractionProgress - delta) / 500)) {
               // //console.log*(`Extraction progress: ${Math.floor((this.extractionProgress / this.processingTime) * 100)}%`);
            }
            
            // If we've reached the processing time, complete the extraction
            if (this.extractionProgress >= this.processingTime) {
               // //console.log*(`Extraction complete, processing time reached`);
                this.completeExtraction();
            }
        }
        
        // Try to transfer resources to connected machines
        this.transferResources();
    }
    
    /**
     * Start the extraction process
     */
    startExtracting() {
        if (!this.resourceNode) {
            //console.log*('Cannot start extraction: no resource node');
            return;
        }
        
        if (this.resourceNode.resources <= 0) {
            //console.log*('Cannot start extraction: resource node has no resources');
            return;
        }
        
        //console.log*(`Starting extraction from node with ${this.resourceNode.resources} resources of type ${this.resourceNode.resourceType?.id || 'unknown'}`);
        
        this.isExtracting = true;
        this.extractionProgress = 0;
        
        // Visual feedback for extraction
        if (this.drillBit) {
            this.scene.tweens.add({
                targets: this.drillBit,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: this.processingTime,
                yoyo: true
            });
        }
        
        // Make sure the resource type is in our output types
        const resourceTypeId = this.resourceNode.resourceType?.id;
        if (resourceTypeId && !this.outputTypes.includes(resourceTypeId)) {
            //console.log*(`Adding resource type ${resourceTypeId} to output types`);
            this.outputTypes.push(resourceTypeId);
            this.outputInventory[resourceTypeId] = 0;
        }
    }
    
    /**
     * Complete the extraction process
     */
    completeExtraction() {
        if (!this.resourceNode) {
            //console.log*(`Cannot complete extraction: no resource node`);
            return;
        }
        
        //console.log*(`Completing extraction from node with ${this.resourceNode.resources} resources`);
        
        // Get the resource type from the node
        const resourceType = this.resourceNode.resourceType;
        
        if (!resourceType || !resourceType.id) {
            //console.log*(`Invalid resource type:`, resourceType);
            return;
        }
        
        //console.log*(`Resource type: ${resourceType.id}`);
        
        // Check if the node has resources to extract
        if (this.resourceNode.resources > 0) {
            // Reduce the node's resources
            this.resourceNode.resources--;
            
            //console.log*(`Reduced resource node resources to ${this.resourceNode.resources}`);
            
            // Make sure the output inventory is initialized
            if (!this.outputInventory) {
                this.outputInventory = {};
                this.outputTypes.forEach(type => {
                    this.outputInventory[type] = 0;
                });
                //console.log*(`Initialized output inventory:`, this.outputInventory);
            }
            
            // Check if this resource type is in our output types
            if (!this.outputTypes.includes(resourceType.id)) {
                //console.log*(`Resource type ${resourceType.id} is not in our output types: ${this.outputTypes.join(', ')}`);
                // Add it to our output types if it's not there
                this.outputTypes.push(resourceType.id);
                this.outputInventory[resourceType.id] = 0;
                //console.log*(`Added ${resourceType.id} to output types`);
            }
            
            // Add the resource to the output inventory
            this.outputInventory[resourceType.id] += this.extractionRate;
            //console.log*(`Extracted ${this.extractionRate} ${resourceType.id}, now have ${this.outputInventory[resourceType.id]}`);
            
            // Log the entire output inventory for debugging
            //console.log*(`Current output inventory:`, JSON.stringify(this.outputInventory));
            
            // Visual feedback for successful extraction
            this.createExtractionEffect(resourceType.id);
        } else {
            //console.log*(`Resource node has no resources to extract (${this.resourceNode.resources}/${this.resourceNode.maxResources})`);
        }
        
        // Reset extraction state
        this.isExtracting = false;
        this.extractionProgress = 0;
    }
    
    /**
     * Create a visual effect for extraction
     * @param {string} resourceType - The type of resource being extracted
     */
    createExtractionEffect(resourceType) {
        // Get resource color from config
        const resourceColor = GAME_CONFIG.resourceColors[resourceType] || 0xffffff;
        
        // Create a small circle representing the resource
        const resourceSprite = this.scene.add.circle(
            this.container.x, 
            this.container.y, 
            5, 
            resourceColor
        );
        
        // Animate the resource moving up slightly and then back to the extractor
        this.scene.tweens.add({
            targets: resourceSprite,
            y: this.container.y - 15,
            scale: 1.5,
            duration: 300,
            yoyo: true,
            onComplete: () => {
                resourceSprite.destroy();
            }
        });
    }
    
    /**
     * Override the transferResources method to handle resource transfer
     */
    transferResources() {
        // Find connected machine in the output direction
        const connectedMachine = this.findConnectedMachine();
        if (!connectedMachine) {
            //console.log*(`No connected machine found in direction: ${this.direction}`);
            return;
        }
        
        //console.log*(`Found connected machine: ${connectedMachine.id || connectedMachine.type?.id} at (${connectedMachine.gridX}, ${connectedMachine.gridY})`);
        
        // Debug the output inventory
        //console.log*(`Current output inventory before transfer:`, JSON.stringify(this.outputInventory));
        
        // Get the actual resource type we have in our inventory
        const availableResourceTypes = Object.keys(this.outputInventory).filter(
            type => this.outputInventory[type] > 0
        );
        
        if (availableResourceTypes.length === 0) {
            //console.log*('No resources available to transfer');
            return;
        }
        
        //console.log*(`Available resource types: ${availableResourceTypes.join(', ')}`);
        
        // Log the connected machine's input types
        const connectedInputTypes = connectedMachine.inputTypes || 
                                   (connectedMachine.getInputTypes ? connectedMachine.getInputTypes() : []);
        
        //console.log*(`Connected machine input types: ${connectedInputTypes.join(', ')}`);
        
        // Try to transfer each available resource type
        for (const resourceType of availableResourceTypes) {
            // Skip if we don't have any of this resource
            if (!this.outputInventory[resourceType] || this.outputInventory[resourceType] <= 0) {
                //console.log*(`No ${resourceType} available to transfer`);
                continue;
            }
            
            //console.log*(`Attempting to transfer ${resourceType}, have ${this.outputInventory[resourceType]}`);
            
            // Check if the connected machine can accept this resource type
            // First try the inputTypes property, then try the getInputTypes method
            const canAcceptResource = 
                (connectedMachine.inputTypes && connectedMachine.inputTypes.includes(resourceType)) ||
                (connectedMachine.getInputTypes && connectedMachine.getInputTypes().includes(resourceType));
            
            if (canAcceptResource) {
                // Transfer one unit of the resource
                this.outputInventory[resourceType]--;
                
                // Add to the connected machine's input inventory
                if (connectedMachine.inputInventory) {
                    if (connectedMachine.inputInventory[resourceType] !== undefined) {
                        connectedMachine.inputInventory[resourceType]++;
                    } else {
                        connectedMachine.inputInventory[resourceType] = 1;
                    }
                    
                    // Create visual effect for the transfer
                    this.createResourceTransferEffect(resourceType, connectedMachine);
                    
                    //console.log*(`Transferred 1 ${resourceType} to connected machine`);
                    //console.log*(`Updated output inventory:`, JSON.stringify(this.outputInventory));
                    break; // Only transfer one resource per update
                } else {
                    //console.log*(`Connected machine has no inputInventory property`);
                    // Restore the resource we tried to transfer
                    this.outputInventory[resourceType]++;
                }
            } else {
                //console.log*(`Connected machine cannot accept resource type: ${resourceType}`);
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
        
        //console.log*(`Creating resource transfer effect from (${startX}, ${startY}) to (${endX}, ${endY})`);
        
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
            //console.log*('No grid reference in findConnectedMachine');
            return null;
        }
        
        // Determine the target cell based on the direction
        let targetX = this.gridX;
        let targetY = this.gridY;
        
        //console.log*(`Finding connected machine from (${this.gridX}, ${this.gridY}) in direction: ${this.direction}`);
        
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
                //console.log*(`Unknown direction: ${this.direction}`);
                return null;
        }
        
        //console.log*(`Looking for machine at target cell (${targetX}, ${targetY})`);
        
        // Get the cell at the target position
        const targetCell = this.grid.getCell(targetX, targetY);
        
        if (!targetCell) {
            //console.log*(`No cell found at target position (${targetX}, ${targetY})`);
            return null;
        }
        
        //console.log*(`Target cell type: ${targetCell.type}`);
        
        // Check if the cell has a machine
        if (targetCell.type === 'machine' && targetCell.machine) {
            const machine = targetCell.machine;
            //console.log*(`Found machine of type: ${machine.id || machine.type?.id}`);
            return machine;
        }
        
        //console.log*(`No machine found at target position (${targetX}, ${targetY})`);
        return null;
    }
    
    /**
     * Get a preview sprite for the machine selection panel
     * @param {Phaser.Scene} scene - The scene to create the sprite in
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Container} The preview container
     */
    static getPreviewSprite(scene, x, y) {
        // Create a container for the preview
        const container = scene.add.container(x, y);
        
        // Base machine body
        const cellSize = 32; // Use a standard size for previews
        const body = scene.add.rectangle(0, 0, cellSize * 0.9, cellSize * 0.9, 0x555555);
        body.setStrokeStyle(2, 0x333333);
        container.add(body);
        
        // Drill bit in the center
        const drillBit = scene.add.circle(0, 0, cellSize * 0.2, 0x888888);
        drillBit.setStrokeStyle(2, 0x666666);
        container.add(drillBit);
        
        // Output indicator
        const outputSquare = scene.add.rectangle(
            0, cellSize * 0.3, 
            cellSize * 0.3, cellSize * 0.3, 
            0xd35400
        );
        outputSquare.setStrokeStyle(1, 0x000000);
        container.add(outputSquare);
        
        // Add a simple direction indicator
        const directionIndicator = scene.add.triangle(
            0, cellSize * 0.3,
            -cellSize * 0.1, cellSize * 0.1,
            cellSize * 0.1, cellSize * 0.1,
            0, cellSize * 0.2,
            0xffffff
        );
        container.add(directionIndicator);
        
        // Add a simple label at the center
        const label = scene.add.text(0, 0, "E", {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        return container;
    }
    
    /**
     * Override the showTooltip method to show extractor-specific information
     */
    showTooltip() {
        // Remove existing tooltip if any
        this.hideTooltip();
        
        // Calculate the center position of the machine - use direct container coordinates
        const centerX = this.container.x;
        const centerY = this.container.y - 40; // Position above the machine
        
        // Create tooltip background
        const tooltipBg = this.scene.add.rectangle(
            centerX, 
            centerY, 
            250, 
            100, 
            0x000000, 
            0.8
        );
        tooltipBg.setStrokeStyle(1, 0xffffff);
        
        // Create tooltip text with inventory info
        let tooltipContent = `${this.name} (${this.direction})`;
        
        // Add resource node info
        if (this.resourceNode) {
            const resourceTypeName = this.resourceType ? this.resourceType.name : 'Unknown';
            tooltipContent += `\nExtracting: ${resourceTypeName}`;
            tooltipContent += `\nNode Resources: ${this.resourceNode.resources}/${this.resourceNode.maxResources}`;
        } else {
            tooltipContent += '\nNo resource node connected';
        }
        
        // Add processing status
        if (this.isExtracting) {
            const progressPercent = Math.floor((this.extractionProgress / this.processingTime) * 100);
            tooltipContent += `\nExtracting: ${progressPercent}%`;
        } else if (this.resourceNode && this.resourceNode.resources > 0) {
            tooltipContent += '\nReady to extract';
        } else if (this.resourceNode) {
            tooltipContent += '\nWaiting for resources';
        }
        
        // Add inventory info
        tooltipContent += '\nInventory: ';
        let hasResources = false;
        
        for (const type in this.outputInventory) {
            if (this.outputInventory[type] > 0) {
                tooltipContent += `${type}(${this.outputInventory[type]}) `;
                hasResources = true;
            }
        }
        
        if (!hasResources) {
            tooltipContent += 'Empty';
        }
        
        // Create tooltip text
        const tooltipText = this.scene.add.text(
            centerX, 
            centerY, 
            tooltipContent, 
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Store tooltip objects for later removal
        this.tooltip = {
            background: tooltipBg,
            text: tooltipText
        };
        
        // Set tooltip depth to ensure it appears above other objects
        tooltipBg.setDepth(1000);
        tooltipText.setDepth(1001);
    }
} 