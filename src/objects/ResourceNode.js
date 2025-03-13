import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export default class ResourceNode {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.gridX = config.gridX;
        this.gridY = config.gridY;
        this.resourceType = GAME_CONFIG.resourceTypes[config.resourceType];
        this.lifespan = config.lifespan;
        
        // Initialize with some resources instead of starting at 0
        this.resources = Phaser.Math.Between(3, 5); // Start with 3-5 resources
        this.maxResources = 10;
        
        //console.log*(`Created resource node at (${this.gridX}, ${this.gridY}) with ${this.resources} ${this.resourceType.id}`);
        
        // Create visual representation
        this.createVisuals();
        
        // Set up lifespan timer
        this.lifespanTimer = scene.time.addEvent({
            delay: 1000,
            callback: this.updateLifespan,
            callbackScope: this,
            loop: true
        });
        
        // Set up resource generation timer
        this.resourceTimer = scene.time.addEvent({
            delay: GAME_CONFIG.resourceGenerationRate,
            callback: this.generateResource,
            callbackScope: this,
            loop: true
        });
    }
    
    createVisuals() {
        // Create container for node parts
        const cellSize = this.scene.factoryGrid.cellSize;
        this.container = this.scene.add.container(this.x + cellSize / 2, this.y + cellSize / 2);
        
        // Set color based on resource type
        let nodeColor;
        switch (this.resourceType.id) {
            case 'raw-resource':
                nodeColor = 0x00aa44; // Green for raw resources
                break;
            case 'copper-ore':
                nodeColor = 0xd2691e; // Copper color
                break;
            case 'iron-ore':
                nodeColor = 0xa19d94; // Iron color
                break;
            case 'coal':
                nodeColor = 0x36454f; // Coal color
                break;
            default:
                nodeColor = 0x00aa44; // Default green
        }
        
        // Create node background
        this.background = this.scene.add.circle(0, 0, 12, nodeColor);
        this.container.add(this.background);
        
        // Create node border
        this.border = this.scene.add.circle(0, 0, 12);
        this.border.setStrokeStyle(2, 0x008833);
        this.container.add(this.border);
        
        // Create resource indicator
        this.resourceIndicator = this.scene.add.text(0, 0, '0', {
            fontFamily: 'Arial',
            fontSize: 10,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(this.resourceIndicator);
        
        // Create lifespan indicator
        this.lifespanBar = this.scene.add.rectangle(0, 16, 24, 4, 0x00ff00);
        this.container.add(this.lifespanBar);
        
        // Add pulsing animation
        this.scene.tweens.add({
            targets: this.background,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    /**
     * Generate a new resource
     */
    generateResource() {
        if (this.resources < this.maxResources) {
            this.resources++;
            //console.log*(`Resource node at (${this.gridX}, ${this.gridY}) generated resource: ${this.resources}/${this.maxResources} ${this.resourceType.id}`);
            
            // Visual feedback for resource generation
            const resourceParticle = this.scene.add.circle(
                this.container.x, 
                this.container.y, 
                4, 
                0xffff00
            );
            this.scene.tweens.add({
                targets: resourceParticle,
                alpha: 0,
                y: this.container.y - 20,
                duration: 500,
                onComplete: () => {
                    resourceParticle.destroy();
                }
            });
        } else {
            //console.log*(`Resource node at (${this.gridX}, ${this.gridY}) is full: ${this.resources}/${this.maxResources}`);
        }
        
        // Update the visual indicator
        if (this.resourceIndicator) {
            this.resourceIndicator.setText(this.resources.toString());
        }
    }
    
    /**
     * Update the node's visual representation
     */
    update() {
        // Update resource indicator
        if (this.resourceIndicator) {
            this.resourceIndicator.setText(this.resources.toString());
        }
        
        // Update lifespan bar
        if (this.lifespanBar) {
            this.lifespanBar.scaleX = this.lifespan / GAME_CONFIG.nodeLifespan;
            
            // Update color based on lifespan
            if (this.lifespan < GAME_CONFIG.nodeLifespan * 0.25) {
                this.lifespanBar.fillColor = 0xff0000;
            } else if (this.lifespan < GAME_CONFIG.nodeLifespan * 0.5) {
                this.lifespanBar.fillColor = 0xffaa00;
            }
        }
        
        // Periodically log the node's status
        if (this.scene.time.now % 5000 < 16) { // Log every ~5 seconds
            //console.log*(`ResourceNode at (${this.gridX}, ${this.gridY}):`);
            //console.log*(`- Type: ${this.resourceType.id}`);
            //console.log*(`- Resources: ${this.resources}/${this.maxResources}`);
            //console.log*(`- Lifespan: ${this.lifespan}/${GAME_CONFIG.nodeLifespan}`);
        }
    }
    
    updateLifespan() {
        this.lifespan--;
        
        if (this.lifespan <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        // Remove from grid
        this.scene.factoryGrid.removeResourceNode(this);
        
        // Remove from resource nodes list
        const index = this.scene.resourceNodes.indexOf(this);
        if (index !== -1) {
            this.scene.resourceNodes.splice(index, 1);
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