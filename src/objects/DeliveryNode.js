import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { UPGRADE_PACKAGE_TYPE } from '../config/upgrades.js'; // Import upgrade package type

export default class DeliveryNode {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.gridX = config.gridX;
        this.gridY = config.gridY;
        // Delivery nodes might accept specific types later, for now generic
        // this.requiredResourceType = config.requiredResourceType; 
        this.lifespan = config.lifespan || GAME_CONFIG.nodeLifespan; // Use default lifespan if not provided

        console.log(`Created delivery node at (${this.gridX}, ${this.gridY})`);

        // Create visual representation
        this.createVisuals();
        
        // Set up lifespan timer
        this.lifespanTimer = scene.time.addEvent({
            delay: 1000,
            callback: this.updateLifespan,
            callbackScope: this,
            loop: true
        });
    }
    
    createVisuals() {
        // Create container for node parts
        this.container = this.scene.add.container(this.x, this.y);
        
        // Simple delivery node visuals - square, different color
        const nodeColor = 0x4a6fb5; // Blue color for delivery
        const borderColor = 0x3a5f95; 
        
        // Create node background (square instead of circle)
        this.background = this.scene.add.rectangle(0, 0, 24, 24, nodeColor);
        this.container.add(this.background);
        
        // Create node border
        this.border = this.scene.add.rectangle(0, 0, 24, 24);
        this.border.setStrokeStyle(2, borderColor);
        this.container.add(this.border);
        
        // Maybe an icon instead of text? For now, just the shape.
        // Remove resource indicator text
        
        // Create lifespan indicator
        this.lifespanBar = this.scene.add.rectangle(0, 16, 24, 4, 0x00ff00); // Position below the square
        this.container.add(this.lifespanBar);
        
        // Optional: Add a different animation? Or keep pulsing?
        this.scene.tweens.add({
            targets: this.background,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1200, // Slightly slower pulse?
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    /**
     * Accept an item delivered to this node.
     * Handles both regular resources and upgrade packages.
     * @param {object} item - The item object being delivered (e.g., { type: 'resourceA', texture: '...' } or { type: 'upgrade_package', texture: '...' }).
     * @returns {boolean} - True if the item was accepted, false otherwise.
     */
    acceptItem(item) { // Renamed and parameter changed
        if (!item || !item.type) {
            console.warn("DeliveryNode received invalid item:", item);
            return false;
        }

        // Check if it's an upgrade package
        if (item.type === UPGRADE_PACKAGE_TYPE) {
            console.log(`DeliveryNode at (${this.gridX}, ${this.gridY}) accepted an Upgrade Package!`);
            // Increment upgrade counter
            this.scene.upgradeManager.incrementUpgradesDelivered();

            // TODO: Trigger the Upgrade Selection UI
            // This will likely involve pausing the game and launching a new scene or UI panel.
            this.scene.events.emit('triggerUpgradeSelection'); // Emit an event that GameScene can listen for
            console.log("Triggering upgrade selection UI...");

            // Create a distinct effect for upgrade packages?
            this.createAcceptEffect('upgrade', 0); // Use a generic type/color, no points

            return true; // Upgrade package accepted
        }

        // --- Handle regular resources ---
        const resourceType = item.type; // Extract resource type from the item object

        // Find the score for this resource type from the config
        const resourceConfig = GAME_CONFIG.resourceTypes.find(r => r.id === resourceType);
        const points = resourceConfig ? resourceConfig.points : 0; // Default to 0 if not found

        if (points === 0 && resourceType !== 'upgrade') { // Check if it was a valid resource
             console.warn(`DeliveryNode received unknown resource type: ${resourceType}`);
             // Optional: Create a different visual effect for unknown items?
             return false; // Reject unknown resource types
        }

        // Add score
        this.scene.addScore(points);

        // Visual feedback for accepted resource
        this.createAcceptEffect(resourceType, points);

        console.log(`DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${resourceType}, +${points} points`);
        return true;
    }

    /**
     * Creates a visual effect when an item is accepted.
     * @param {string} itemType - The type of item accepted (resource ID or 'upgrade').
     * @param {number} points - The points awarded (0 for upgrades).
     */
    createAcceptEffect(itemType, points) {
        const color = itemType === 'upgrade' ? 0xcc00ff : (GAME_CONFIG.resourceColors[itemType] || 0xaaaaaa);
        const textToShow = itemType === 'upgrade' ? 'Upgrade!' : `+${points}`;
        const textColor = itemType === 'upgrade' ? '#cc00ff' : '#ffd700';

        // Score/Upgrade popup text
        const popupText = this.scene.add.text(
            this.container.x,
            this.container.y - 15,
            textToShow,
            {
                fontFamily: 'Arial',
                fontSize: 12,
                color: textColor,
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
        popupText.setDepth(this.container.depth + 2);

        this.scene.tweens.add({
            targets: popupText,
            y: this.container.y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => {
                popupText.destroy();
            }
        });

        // Particle burst effect
        const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', {
            color: [ color ],
            colorEase: 'quad.out',
            lifespan: 400,
            speed: { min: 50, max: 100 },
            scale: { start: 0.7, end: 0 },
            gravityY: 150,
            blendMode: 'ADD',
            emitting: false
        });
        particles.setDepth(this.container.depth + 1);
        particles.explode(10);

        // Optional: Brief flash of the node
        this.scene.tweens.add({
            targets: this.background,
            fillAlpha: 0.5,
            duration: 100,
            yoyo: true,
        });
    }
    
    /**
     * Update the node's visual representation
     */
    update() {
        // Update lifespan bar
        if (this.lifespanBar) {
            // Ensure GAME_CONFIG.nodeLifespan is accessible or store initial lifespan
            const initialLifespan = GAME_CONFIG.nodeLifespan; // Assuming it's constant
            this.lifespanBar.scaleX = Math.max(0, this.lifespan / initialLifespan);
            
            // Update color based on lifespan
            if (this.lifespan < initialLifespan * 0.25) {
                this.lifespanBar.fillColor = 0xff0000; // Red
            } else if (this.lifespan < initialLifespan * 0.5) {
                this.lifespanBar.fillColor = 0xffaa00; // Orange
            } else {
                 this.lifespanBar.fillColor = 0x00ff00; // Green
            }
        }
    }
    
    updateLifespan() {
        this.lifespan--;
        
        if (this.lifespan <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        console.log(`Destroying delivery node at (${this.gridX}, ${this.gridY})`);
        // Remove from grid
        if (this.scene && this.scene.factoryGrid) {
            this.scene.factoryGrid.removeDeliveryNode(this); 
        }
        
        // Remove from delivery nodes list in GameScene
        if (this.scene && this.scene.deliveryNodes) {
            const index = this.scene.deliveryNodes.indexOf(this);
            if (index !== -1) {
                this.scene.deliveryNodes.splice(index, 1);
            }
        }
        
        // Stop timer
        if (this.lifespanTimer) {
            this.lifespanTimer.remove();
        }
        
        // Destroy visuals
        if (this.container) {
            this.container.destroy();
        }
    }
} 