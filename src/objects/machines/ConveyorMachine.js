import BaseMachine from './BaseMachine';
import { GAME_CONFIG } from '../../config/gameConfig';
import { UPGRADE_PACKAGE_TYPE } from '../../config/upgrades.js'; // Import upgrade package type
import ResourceNode from '../ResourceNode'; // Import ResourceNode
import UpgradeNode from '../UpgradeNode'; // Import UpgradeNode

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
        
        // Items currently on this belt
        this.itemsOnBelt = [];
        this.itemVisualsGroup = scene ? scene.add.group() : null;
        this.baseMaxCapacity = 3; // Base maximum items allowed on the belt at once
        this.maxCapacity = this.baseMaxCapacity;
        this.transportSpeed = 40; // Speed in pixels per second
        
        // Add extraction cooldown properties
        this.baseExtractionCooldown = 1000; // 1 second base cooldown between extractions
        this.extractCooldown = this.baseExtractionCooldown;
        this.lastExtractTime = 0; // Last time we extracted a resource
        
        // Apply upgrade modifiers if upgrade manager exists (with safety check)
        try {
            this.updateFromUpgrades();
        } catch (error) {
            console.error('[CONVEYOR] Error in constructor during updateFromUpgrades:', error);
            // Ensure default values are set if update fails
            this.maxCapacity = this.baseMaxCapacity;
            this.extractCooldown = this.baseExtractionCooldown;
        }
    }

    /**
     * Updates properties based on current upgrade levels
     * Called after construction and whenever upgrades change
     */
    updateFromUpgrades() {
        // Add protection against null scene
        if (!this.scene) {
            console.warn('[CONVEYOR] updateFromUpgrades called with null scene reference');
            // Set default values
            this.maxCapacity = this.baseMaxCapacity || 3;
            this.extractCooldown = this.baseExtractionCooldown || 1000;
            // Belt speed is handled in updateItemsOnBelt
            return;
        }
        
        // Normal upgrade handling when scene is available
        if (this.scene.upgradeManager) {
            // Apply inventory capacity upgrade
            const capacityMod = this.scene.upgradeManager.getInventoryCapacityModifier();
            this.maxCapacity = Math.floor(this.baseMaxCapacity * capacityMod);
            
            // Apply extraction speed upgrade (lower cooldown = faster extraction)
            const extractionMod = this.scene.upgradeManager.getExtractionSpeedModifier();
            this.extractCooldown = Math.floor(this.baseExtractionCooldown * extractionMod);
            
            // Transport speed is already handled by getConveyorSpeedModifier
        }
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
        this.inputTypes = ['basic-resource', 'advanced-resource', 'mega-resource', UPGRADE_PACKAGE_TYPE];
        this.outputTypes = ['basic-resource', 'advanced-resource', 'mega-resource', UPGRADE_PACKAGE_TYPE];
        this.processingTime = 1000; // 1 second
        this.defaultDirection = 'right';

        console.log(`[${this.name}] Initialized with shape dimensions: ${this.shape.length}x${this.shape[0].length}`);
    }
    
    /**
     * Override the createVisuals method to customize the conveyor appearance
     */
    createVisuals() {
        // Add debug log for conveyor creation
        console.log('[CONVEYOR] Creating conveyor visuals with base color 0x888888 (gray)');
        
        // Skip visual creation if we don't have a grid reference
        if (!this.grid) {
            console.warn('Cannot create visuals for conveyor machine: grid reference is missing');
            return;
        }
        
        // gridToWorld now returns the center of the cell
        const worldPos = this.grid.gridToWorld(this.gridX, this.gridY);
        
        // Create container for machine parts positioned at the center
        this.container = this.scene.add.container(worldPos.x, worldPos.y);
        
        // Create a group to manage item visuals within the container
        this.itemVisualsGroup = this.scene.add.group();
        
        // Create the conveyor base - parts are now positioned relative to the center (0,0)
        const centerX = 0;
        const centerY = 0;
        
        // Create the conveyor base (slightly darker blue)
        const base = this.scene.add.rectangle(
            centerX, 
            centerY, 
            this.grid.cellSize - 4, 
            this.grid.cellSize - 4, 
            0x888888  // Updated to gray for conveyor base
        );
        this.container.add(base);
        console.log('[CONVEYOR] Created base with color:', base.fillColor.toString(16));
        
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
                0x666666  // Keep dark gray for belt lines
            );
            this.container.add(belt);
            console.log('[CONVEYOR] Created belt line with color:', belt.fillColor.toString(16));
            
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
        
        const roller1 = this.scene.add.circle(roller1X, roller1Y, rollerRadius, 0x888888);  // Gray rollers
        const roller2 = this.scene.add.circle(roller2X, roller2Y, rollerRadius, 0x888888);  // Gray rollers
        this.container.add(roller1);
        this.container.add(roller2);
        console.log('[CONVEYOR] Created rollers with color:', roller1.fillColor.toString(16));
        
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
        // Safety check - if scene is null, we can't proceed
        if (!this.scene) {
            console.warn('[CONVEYOR] Update called with null scene at', this.gridX, this.gridY);
            return;
        }
        
        // NEW: Check for resources in BaseMachine inventory and transfer to conveyor belt
        this.checkBaseMachineInventory();
        
        // Call base update
        super.update(time, delta);

        // Periodically update from upgrades (every 2 seconds)
        if (time % 2000 < 20) {
            try {
                this.updateFromUpgrades();
            } catch (error) {
                console.error('[CONVEYOR] Error during updateFromUpgrades in update:', error);
            }
        }
        
        // --- ADDED: Try to extract from source node --- 
        try {
            this.tryExtractFromSource();
        } catch (error) {
            console.error('[CONVEYOR] Error during tryExtractFromSource:', error);
        }

        // Move items along the conveyor and attempt transfer
        try {
            this.updateItemsOnBelt(delta);
        } catch (error) {
            console.error('[CONVEYOR] Error during updateItemsOnBelt:', error);
        }
        
        // Ensure the base stays gray even if other code changes it
        if (this.container && this.container.list) {
            // Find the base rectangle (first non-belt, non-roller rectangle)
            const base = this.container.list.find(part => 
                part.type === 'Rectangle' && 
                part !== this.progressBar && 
                part !== this.progressFill &&
                part.width >= this.grid.cellSize - 10  // Base is the largest rectangle
            );
            
            if (base && base.fillColor !== 0x888888) {
                console.log(`[CONVEYOR] Fixing base color from 0x${base.fillColor.toString(16)} back to 0x888888`);
                base.fillColor = 0x888888; // Force gray color
            }
        }
    }
    
    /**
     * NEW METHOD: Checks if there are resources in the BaseMachine inventory and transfers them to the belt
     */
    checkBaseMachineInventory() {
        // Get inputInventory from BaseMachine parent class
        if (!this.inputInventory) return;
        
        // Check for any resources in the input inventory
        let resourcesFound = false;
        for (const resourceType in this.inputInventory) {
            const count = this.inputInventory[resourceType];
            if (count > 0) {
                resourcesFound = true;
                // Limit to transferring one resource per update to prevent belt overload
                console.log(`[CONVEYOR] Found ${count} ${resourceType} in BaseMachine inventory at (${this.gridX}, ${this.gridY})`);
                
                // Create item data to add to belt
                const itemData = { type: resourceType, amount: 1 };
                
                // Try to add it to the belt
                const success = this.addItemVisual(itemData);
                
                if (success) {
                    // Decrement the inventory count
                    this.inputInventory[resourceType]--;
                    console.log(`[CONVEYOR] Transferred 1 ${resourceType} from inventory to belt. Remaining: ${this.inputInventory[resourceType]}`);
                    break; // Only transfer one item per update to prevent overwhelming the belt
                }
            }
        }
        
        // Log if no resources were found or everything was transferred
        if (!resourcesFound && this.debugInventoryCheck) {
            this.debugInventoryCheck = false;
            console.log(`[CONVEYOR] No resources in BaseMachine inventory at (${this.gridX}, ${this.gridY})`);
        }
    }

    /**
     * NEW METHOD: Tries to extract a resource/package from an adjacent node.
     */
    tryExtractFromSource() {
        // Additional safety check for scene
        if (!this.scene || !this.grid) {
            return; // Skip extraction if critical dependencies are missing
        }
        
        // Check conveyor's own cooldown timer
        const now = this.scene.time.now;
        if (now < this.lastExtractTime + this.extractCooldown) {
            return; // Conveyor still on cooldown
        }
        
        // Check if belt is at capacity
        if (this.itemsOnBelt.length >= this.maxCapacity) {
            console.log(`[CONVEYOR_EXTRACT] Belt full at (${this.gridX}, ${this.gridY}): ${this.itemsOnBelt.length}/${this.maxCapacity}`);
            return; // Belt is at maximum capacity
        }

        // Check if the start of the belt is blocked
        const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
        if (firstItemProgress < 0.1) { // Only extract if the first item has moved at least 10% along the belt
            console.log(`[CONVEYOR_EXTRACT] Start of belt blocked at (${this.gridX}, ${this.gridY}), progress: ${firstItemProgress.toFixed(2)}`);
            return; // Start of belt is blocked
        }

        // Determine source cell coordinates based on direction (opposite of transfer target)
        let sourceX = this.gridX;
        let sourceY = this.gridY;

        switch (this.direction) {
            case 'right': sourceX -= 1; break; // Check Left
            case 'down':  sourceY -= 1; break; // Check Up
            case 'left':  sourceX += 1; break; // Check Right
            case 'up':    sourceY += 1; break; // Check Down
        }

        // Check grid bounds
        if (!this.grid || sourceX < 0 || sourceX >= this.grid.width || sourceY < 0 || sourceY >= this.grid.height) {
            return; // Source cell is out of bounds
        }

        // Get the source cell content
        const sourceCell = this.grid.getCell(sourceX, sourceY);

        if (!sourceCell || !sourceCell.object) {
            // No log needed for empty cells - would be too noisy
            return; // No object in source cell
        }
        
        let extractedItem = null;
        // Check if it's a ResourceNode or UpgradeNode and try extracting
        if ((sourceCell.type === 'node' || sourceCell.type === 'upgrade-node') && typeof sourceCell.object.extractResource === 'function') {
            console.log(`[CONVEYOR_EXTRACT] Attempting extraction from ${sourceCell.type} at (${sourceX}, ${sourceY})`);
            extractedItem = sourceCell.object.extractResource(); 
        }

        // If an item was successfully extracted
        if (extractedItem && extractedItem.type) {
            // Set last extract time when successful
            this.lastExtractTime = now;
            
            console.log(`[CONVEYOR_EXTRACT] Extracted item \'${extractedItem.type}\' (amount: ${extractedItem.amount || 1}) from (${sourceX}, ${sourceY}) onto conveyor (${this.gridX}, ${this.gridY})`);
            
            // --- ADD ITEM VISUAL LOGIC ---
            if (this.itemsOnBelt.length < this.maxCapacity) {
                // Check if the first item on the belt (if any) is near the start
                // Prevent stacking visuals right at the beginning
                const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
                console.log(`[CONVEYOR_EXTRACT] First item progress check: ${firstItemProgress.toFixed(2)} (needs > 0.1)`);
                
                if (firstItemProgress > 0.1) { // Only add if start is clear (10% progress)
                    console.log(`[CONVEYOR_EXTRACT] Adding visual for ${extractedItem.type} on conveyor at (${this.gridX}, ${this.gridY})`);
                    this.addItemVisual(extractedItem); 
                    console.log(`[CONVEYOR_EXTRACT] Current belt items: ${this.itemsOnBelt.length}`);
                } else {
                    console.log(`[CONVEYOR_EXTRACT] Start of belt blocked at (${this.gridX}, ${this.gridY}), progress ${firstItemProgress.toFixed(2)} < 0.1`);
                }
            } else {
                 console.log(`[CONVEYOR_EXTRACT] Belt full at (${this.gridX}, ${this.gridY}), cannot add visual.`);
            }
            // --- END ITEM VISUAL LOGIC ---
        } else if (sourceCell.type === 'node' || sourceCell.type === 'upgrade-node') {
            // Only log this occasionally to avoid spam
            if (now % 3000 < 16) {
                console.log(`[CONVEYOR_EXTRACT] Node at (${sourceX}, ${sourceY}) returned no item during extraction attempt`);
            }
        }
    }
    
    /**
     * Adds a visual representation of an item to the belt.
     * @param {object} itemData - The item data {type, amount}
     * @returns {boolean} True if the item was successfully added, false otherwise
     */
    addItemVisual(itemData) {
        try {
            // --- ADDED Safety Check ---
            if (!this.container || !this.grid || !this.itemVisualsGroup) {
                console.error(`[CONVEYOR] Cannot add item visual at (${this.gridX}, ${this.gridY}): Container, grid, or group missing.`);
                return false; 
            }
            // --- END Safety Check ---
    
            // Additional safety check for item data
            if (!itemData || !itemData.type) {
                console.error(`[CONVEYOR] Cannot add item visual: Invalid item data`, itemData);
                return false;
            }
            
            // Check belt capacity
            if (this.itemsOnBelt.length >= this.maxCapacity) {
                console.log(`[CONVEYOR] Cannot add visual: Belt full (${this.itemsOnBelt.length}/${this.maxCapacity})`);
                return false;
            }
            
            // Check start of belt clearance
            const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
            if (firstItemProgress < 0.1) {
                console.log(`[CONVEYOR] Cannot add visual: Start of belt blocked (progress: ${firstItemProgress.toFixed(2)})`);
                return false;
            }
    
            const visual = this.createItemVisual(itemData.type);
            if (!visual) {
                console.error(`[CONVEYOR] Could not create visual for item type: ${itemData.type}`);
                return false; // Could not create visual
            }
    
            const startPos = this.getItemPosition(0); // Position at progress 0
            visual.setPosition(startPos.x, startPos.y);
            
            // Add visual to the container for rendering AND to the group for management
            this.container.add(visual); 
            this.itemVisualsGroup.add(visual); 
    
            this.itemsOnBelt.unshift({ // Add to the beginning of the array (items move index 0 -> end)
                visual: visual,
                itemData: itemData,
                progress: 0
            });
            console.log(`[CONVEYOR] Added visual for ${itemData.type} to belt (${this.gridX}, ${this.gridY}). Total items: ${this.itemsOnBelt.length}`);
            return true; // Successfully added
        } catch (error) {
            console.error(`[CONVEYOR] Error adding item visual:`, error);
            return false;
        }
    }
    
    /**
     * Creates a visual GameObject for a given item type.
     * @param {string} itemType 
     * @returns {Phaser.GameObjects.GameObject | null}
     */
    createItemVisual(itemType) {
        // --- ADDED Safety Check ---
        if (!this.grid) { 
            console.error(`[CONVEYOR] Cannot create item visual at (${this.gridX}, ${this.gridY}): Grid missing.`);
            return null; 
        }
        // --- END Safety Check ---

        const size = this.grid.cellSize * 0.3; // Visual size relative to cell
        let visual = null;

        if (itemType === UPGRADE_PACKAGE_TYPE) {
            // Use the preloaded sprite if available
            if (this.scene.textures.exists('upgrade-package')) {
                 visual = this.scene.add.sprite(0, 0, 'upgrade-package');
                 visual.setDisplaySize(size * 1.2, size * 1.2); // Make package slightly larger
            } else {
                 // Fallback to square if sprite missing
                 visual = this.scene.add.rectangle(0, 0, size, size, 0xff00ff); // Magenta fallback
            }
        } else {
            // For resources, use colored squares based on type (get color from config?)
            const resourceConf = GAME_CONFIG.resourceTypes.find(rt => rt.id === itemType);
            const color = resourceConf ? resourceConf.color : 0xaaaaaa; // Default grey
            visual = this.scene.add.rectangle(0, 0, size, size, color);
            visual.setStrokeStyle(1, 0x333333); // Add a small border
        }

        if (visual) {
           visual.setDepth(1); // Ensure item is above belt graphics
           // We add the visual to the itemVisualsGroup which is already in the container
           // this.container.add(visual); // DON'T add directly to container if using group
        }
        return visual;
    }
    
    /**
     * Calculates the position along the conveyor belt for a given progress.
     * @param {number} progress - Value from 0 (start) to 1 (end).
     * @returns {{x: number, y: number}}
     */
    getItemPosition(progress) {
        const halfCell = this.grid.cellSize / 2;
        let startX = 0, startY = 0, endX = 0, endY = 0;

        // Positions are relative to the container center (0,0)
        switch (this.direction) {
            case 'right':
                startX = -halfCell + 5; startY = 0;
                endX = halfCell - 5; endY = 0;
                break;
            case 'down':
                startX = 0; startY = -halfCell + 5;
                endX = 0; endY = halfCell - 5;
                break;
            case 'left':
                startX = halfCell - 5; startY = 0;
                endX = -halfCell + 5; endY = 0;
                break;
            case 'up':
                startX = 0; startY = halfCell - 5;
                endX = 0; endY = -halfCell + 5;
                break;
        }

        // Linear interpolation
        const currentX = Phaser.Math.Linear(startX, endX, progress);
        const currentY = Phaser.Math.Linear(startY, endY, progress);

        return { x: currentX, y: currentY };
    }
    
    /**
     * Moves items along the conveyor and attempts transfer when they reach the end.
     * @param {number} delta - Time elapsed since last frame in milliseconds.
     */
    updateItemsOnBelt(delta) {
        if (!this.itemsOnBelt || this.itemsOnBelt.length === 0) {
            return; // No items to move
        }

        const secondsDelta = delta / 1000;
        const distanceToMove = this.transportSpeed * secondsDelta;
        const progressIncrement = distanceToMove / this.grid.cellSize; // Progress relative to cell size

        // Iterate backwards for safe removal
        for (let i = this.itemsOnBelt.length - 1; i >= 0; i--) {
            const currentItem = this.itemsOnBelt[i];

            // If item already reached the end, skip movement, just check transfer
            if (currentItem.progress >= 1) {
                if (this.tryTransferItem(currentItem, i)) {
                     // Item was transferred and removed, continue loop
                } else {
                    // Item still blocked at the end
                }
                continue; // Move to next item
            }

            // Check if the path immediately ahead is blocked by the next item
            if (i < this.itemsOnBelt.length - 1) {
                const itemAhead = this.itemsOnBelt[i + 1];
                // Calculate required spacing (e.g., 1/3 of belt length)
                const requiredSpacingProgress = 1 / this.maxCapacity; 
                if (itemAhead.progress - currentItem.progress < requiredSpacingProgress) {
                     //console.log(`[CONVEYOR] Item at index ${i} blocked by item ${i+1} at (${this.gridX}, ${this.gridY})`);
                     continue; // Blocked by item ahead, stop moving this one
                }
            }

            // Update progress
            currentItem.progress += progressIncrement;
            currentItem.progress = Phaser.Math.Clamp(currentItem.progress, 0, 1);

            // Update visual position
            const newPos = this.getItemPosition(currentItem.progress);
            currentItem.visual.setPosition(newPos.x, newPos.y);

            // If item reached the end this frame, attempt transfer
            if (currentItem.progress >= 1) {
                //console.log(`[CONVEYOR] Item reached end at (${this.gridX}, ${this.gridY}). Attempting transfer.`);
                this.tryTransferItem(currentItem, i); // Attempt transfer, result handled inside
            }
        }
    }
    
    /**
     * Attempts to transfer a specific item that has reached the end of the belt.
     * @param {object} itemToTransfer - The item object from itemsOnBelt { visual, itemData, progress }
     * @param {number} index - The index of the item in the itemsOnBelt array.
     * @returns {boolean} True if the item was successfully transferred and removed, false otherwise.
     */
    tryTransferItem(itemToTransfer, index) {
        const targetCoords = this.getTransferTargetCoords();
        if (!targetCoords) return false; // No valid target cell

        const targetCell = this.grid.getCell(targetCoords.x, targetCoords.y);

        let targetEntity = null;
        let targetEntityType = 'none';

        // Check for an object in the target cell first
        if (targetCell && targetCell.object) {
            targetEntity = targetCell.object;
            // Determine if it's a machine or another type of node based on its properties or type
            if (targetEntity instanceof BaseMachine) { // Check if it's a machine instance
            targetEntityType = 'machine';
            } else if (targetCell.type === 'delivery-node' || targetCell.type === 'upgrade-node' || targetCell.type === 'node') {
                targetEntityType = targetCell.type; // e.g., 'delivery-node', 'upgrade-node'
            } else {
                // Could be an unknown object, or a machine not inheriting BaseMachine but still having acceptItem
                // For now, if it has acceptItem, let's try to treat it as a generic target
                if (typeof targetEntity.acceptItem === 'function') {
                    targetEntityType = 'generic-target'; 
                } else {
                    targetEntity = null; // Not a valid target if it can't accept items
                }
            }
        }

        // Check if we found a valid target entity with the necessary methods
        if (targetEntity && typeof targetEntity.acceptItem === 'function' && typeof targetEntity.canAcceptInput === 'function') {
            
            // --- ADDED DEBUG LOG --- 
            console.log(`[DEBUG] Conveyor (${this.gridX}, ${this.gridY}) checking if target ${targetEntityType} (${targetEntity.id || 'node'} at ${targetCoords.x}, ${targetCoords.y}) can accept type: '${itemToTransfer.itemData.type}'`);
            // --- END DEBUG LOG --- 
            
            // Now check if the target can accept this specific item type
            if (targetEntity.canAcceptInput(itemToTransfer.itemData.type)) {
                // Attempt to transfer the item object ({type, amount})
                if (targetEntity.acceptItem(itemToTransfer.itemData)) {
                    console.log(`[CONVEYOR] Transferred ${itemToTransfer.itemData.type} from (${this.gridX}, ${this.gridY}) to ${targetEntityType} at (${targetCoords.x}, ${targetCoords.y})`);
                    
                    // Transfer successful: Remove item from belt and destroy visual
                    itemToTransfer.visual.destroy();
                    this.itemsOnBelt.splice(index, 1);
                    return true; // Indicate success
                } else {
                    console.log(`[CONVEYOR] Transfer failed: Target ${targetEntityType} rejected item at (${targetCoords.x}, ${targetCoords.y})`);
                    return false; // Target rejected
                }
            } else {
                 console.log(`[CONVEYOR] Transfer failed: Target ${targetEntityType} cannot accept type ${itemToTransfer.itemData.type} at (${targetCoords.x}, ${targetCoords.y})`);
                 return false; // Target cannot accept type
            }
        } else {
            // Log details if the check fails
            let reason = "Unknown";
            if (!targetCell) {
                reason = "No target cell found";
            } else if (!targetEntity) {
                 reason = `Target cell is empty or has no machine/object (Type: ${targetCell.type})`;
            } else if (typeof targetEntity.acceptItem !== 'function') {
                reason = `Target entity (${targetEntity.id || targetEntity.constructor.name}) lacks 'acceptItem' method`;
            } else if (typeof targetEntity.canAcceptInput !== 'function') {
                 reason = `Target entity (${targetEntity.id || targetEntity.constructor.name}) lacks 'canAcceptInput' method`;
            }
            console.log(`[CONVEYOR] Transfer failed (${reason}) at (${targetCoords.x}, ${targetCoords.y})`);
            return false; // No valid target or method missing
        }
    }
    
    /**
     * Calculates the coordinates of the cell this conveyor should transfer resources to.
     * @returns {{x: number, y: number} | null} Target coordinates or null if invalid.
     */
    getTransferTargetCoords() {
        if (!this.grid) return null;

        let targetX = this.gridX;
        let targetY = this.gridY;

        switch (this.direction) {
            case 'right': targetX += 1; break;
            case 'down':  targetY += 1; break;
            case 'left':  targetX -= 1; break;
            case 'up':    targetY -= 1; break;
            default:
                console.warn(`[CONVEYOR] Invalid direction: ${this.direction} at (${this.gridX}, ${this.gridY})`);
                return null;
        }

        // Check grid bounds
        if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
            return null;
        }

        return { x: targetX, y: targetY };
    }
    
    /**
     * Method for receiving an item from another machine/source.
     * Overrides BaseMachine.receiveResource
     * @param {object} itemData - The item object { type: string, amount: number }
     * @param {BaseMachine} [sourceMachine=null] - The machine that sent the resource (optional)
     * @returns {boolean} True if the item was accepted, false otherwise.
     */
    acceptItem(itemData, sourceMachine = null) {
         // --- Add Reason Logging ---
         if (!itemData || !itemData.type) {
             console.log(`[CONVEYOR] (${this.gridX}, ${this.gridY}) rejected: Invalid itemData.`);
             return false;
         }
         if (!this.canAcceptInput(itemData.type)) {
             console.log(`[CONVEYOR] (${this.gridX}, ${this.gridY}) rejected: Type ${itemData.type} not accepted.`);
             return false;
         }
         // --- End Reason Logging ---

        // Check capacity
        if (this.itemsOnBelt.length >= this.maxCapacity) {
            // --- Add Reason Logging ---
            console.log(`[CONVEYOR] (${this.gridX}, ${this.gridY}) rejected: Belt full (${this.itemsOnBelt.length}/${this.maxCapacity}).`);
            return false;
        }

        // Check if the start of the belt is blocked
        const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
        if (firstItemProgress < 0.1) { // Adjust threshold as needed
             // --- Add Reason Logging ---
             console.log(`[CONVEYOR] (${this.gridX}, ${this.gridY}) rejected: Start blocked (first item progress: ${firstItemProgress.toFixed(2)}).`);
            return false; 
        }

        // Add item visual to the start of the belt
        this.addItemVisual(itemData); // This adds to itemsOnBelt with progress 0

        console.log(`[CONVEYOR] (${this.gridX}, ${this.gridY}) accepted item: ${itemData.type} (amount: ${itemData.amount || 1})`);
        return true;
    }

    /**
     * Check if the conveyor can accept a specific resource type into its input.
     * This overrides the BaseMachine implementation.
     * For conveyors, we only care about the type, not inventory capacity (handled by visual belt check).
     * @param {string} resourceTypeId - The ID of the resource type.
     * @returns {boolean} True if the resource type is accepted, false otherwise.
     */
    canAcceptInput(resourceTypeId) {
        const acceptsType = this.inputTypes.includes(resourceTypeId);
        // Log removed for brevity now, re-add if needed:
        // console.log(`[DEBUG] Conveyor at (${this.gridX}, ${this.gridY}) checking canAcceptInput for type '${resourceTypeId}': Result=${acceptsType}`);
        return acceptsType;
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

    /**
     * Clean up resources and visuals when the machine is destroyed
     */
    destroy() {
        // Destroy item visuals
        if (this.itemVisualsGroup) {
            this.itemVisualsGroup.destroy(true); // Destroy the group and its children
        }
        this.itemsOnBelt = []; // Clear the tracking array

        // Call the base destroy method for common cleanup (container, etc.)
        super.destroy();
    }

    /**
     * Get input and output positions for each direction
     * This is the single source of truth for Conveyor I/O positions
     * @param {string} machineId - The machine ID (should be 'conveyor')
     * @param {string} direction - The direction ('right', 'down', 'left', 'up')
     * @returns {Object} An object with inputPos and outputPos coordinates
     */
    static getIOPositionsForDirection(machineId, direction) {
        // Conveyors are simple - input and output are at the same position (flow is determined by direction)
        const pos = { x: 0, y: 0 };  // For 1x1 conveyor
        return { inputPos: pos, outputPos: pos };
    }

    /**
     * Get a preview sprite for the machine selection panel
     */
    static getPreviewSprite(scene, x, y, direction = 'right') {
        // Define the machine's 1x1 shape
        const shape = [[1]];
        
        // Get input/output positions using the single source of truth
        const ioPositions = ConveyorMachine.getIOPositionsForDirection('conveyor', direction);
        
        return BaseMachine.getStandardPreviewSprite(scene, x, y, {
            machineId: 'conveyor',
            shape: shape,
            label: "→",
            inputPos: ioPositions.inputPos,
            outputPos: ioPositions.outputPos,
            direction: direction
        });
    }

    /**
     * Override the addInteractivity method to customize hover behavior
     */
    addInteractivity() {
        // Skip interactivity if explicitly requested
        if (this.config && this.config.skipInteractivity) {
            return;
        }
        
        // Skip if grid is not available
        if (!this.grid) {
            console.warn(`Cannot add interactivity to conveyor - grid is undefined`);
            return;
        }

        // Calculate the width and height of the machine in pixels
        const width = this.grid.cellSize;
        const height = this.grid.cellSize;
        
        // Create a proper hit area for the container
        this.container.setInteractive(new Phaser.Geom.Rectangle(
            -width/2, -height/2, width, height
        ), Phaser.Geom.Rectangle.Contains);
        
        // Add hover effect that keeps the conveyor gray
        this.container.on('pointerover', () => {
            // Find the base part to highlight
            const base = this.container.list.find(part => 
                part.type === 'Rectangle' && 
                part !== this.progressBar && 
                part !== this.progressFill &&
                part.width >= this.grid.cellSize - 10  // Base is the largest rectangle
            );
            
            if (base) {
                // Use a slightly lighter gray for hover
                base.fillColor = 0x999999;
            }
            
            // Show machine info tooltip
            this.showTooltip();
        });
        
        this.container.on('pointerout', () => {
            // Find the base part to restore color
            const base = this.container.list.find(part => 
                part.type === 'Rectangle' && 
                part !== this.progressBar && 
                part !== this.progressFill &&
                part.width >= this.grid.cellSize - 10  // Base is the largest rectangle
            );
            
            if (base) {
                // Restore to normal gray
                base.fillColor = 0x888888;
            }
            
            // Hide tooltip
            this.hideTooltip();
        });
        
        // Add click handler
        this.container.on('pointerdown', () => {
            // Show detailed info or controls
            this.showDetailedInfo();
        });
    }
} 