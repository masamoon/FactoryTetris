import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

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
     * Accept a resource delivered to this node.
     * @param {string} resourceType - The ID of the resource being delivered.
     * @returns {boolean} - True if the resource was accepted, false otherwise.
     */
    acceptResource(resourceType) {
        // For now, accept any resource type
        // Later, could check against this.requiredResourceType

        // Find the score for this resource type from the config
        const resourceConfig = GAME_CONFIG.resourceTypes.find(r => r.id === resourceType);
        const points = resourceConfig ? resourceConfig.points : 0; // Default to 0 if not found
        
        // Add score
        this.scene.addScore(points); 
        
        // Visual feedback for accepted resource
        this.createAcceptEffect(resourceType, points); // Pass points to the effect method
        
        console.log(`DeliveryNode at (${this.gridX}, ${this.gridY}) accepted ${resourceType}, +${points} points`);
        return true;
    }

    /**
     * Creates a visual effect when a resource is accepted.
     * @param {string} resourceType - The type of resource accepted.
     * @param {number} points - The points awarded for this resource.
     */
    createAcceptEffect(resourceType, points) {
        const color = GAME_CONFIG.resourceColors[resourceType] || 0xaaaaaa;
        
        // Score popup text
        const scoreText = this.scene.add.text(
            this.container.x, 
            this.container.y - 15, // Start above the node
            `+${points}`, // Use the actual points awarded
            { 
                fontFamily: 'Arial', 
                fontSize: 12, 
                color: '#ffd700', // Gold color for score
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
        scoreText.setDepth(this.container.depth + 2); // Ensure visibility

        this.scene.tweens.add({
            targets: scoreText,
            y: this.container.y - 40, // Move upwards
            alpha: 0, // Fade out
            duration: 800,
            ease: 'Power1',
            onComplete: () => {
                scoreText.destroy();
            }
        });

        // Particle burst effect
        const particles = this.scene.add.particles(this.container.x, this.container.y, 'particle', { // Assuming a 'particle' texture exists
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
        particles.explode(10); // Explode 10 particles

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