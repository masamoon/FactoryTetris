import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export default class ResourceNode {
    constructor(scene, config, round) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.gridX = config.gridX;
        this.gridY = config.gridY;
        this.resourceType = GAME_CONFIG.resourceTypes[config.resourceType];
        this.lifespan = config.lifespan;
        this.round = round || 1;
        
        // Calculate properties based on round
        const baseInitialMin = 3;
        const baseInitialMax = 5;
        const baseMaxResources = 100;
        const baseGenerationRate = 2000; // Base rate ms
        const minGenerationRate = 500;  // Minimum delay ms
        const roundFactorInitialMin = 1;
        const roundFactorInitialMax = 2;
        const roundFactorMaxResources = 25;
        const roundFactorGenerationRate = 100; // ms reduction per round
        
        // Initialize with resources based on round (using round-1 as factor starts from round 1)
        const initialMin = baseInitialMin + (this.round - 1) * roundFactorInitialMin;
        const initialMax = baseInitialMax + (this.round - 1) * roundFactorInitialMax;
        this.resources = Phaser.Math.Between(initialMin, initialMax); // Start with resources based on round
        
        // Max resources based on round
        this.maxResources = baseMaxResources + (this.round - 1) * roundFactorMaxResources;
        
        // Calculate generation delay based on round
        const generationDelay = Math.max(minGenerationRate, baseGenerationRate - (this.round - 1) * roundFactorGenerationRate);
        
        // Add cooldown for pushing resources
        this.pushCooldown = 500; // ms - Push resources every 0.5 seconds if possible
        this.lastPushTime = 0;
        
        //console.log(`Created resource node at (${this.gridX}, ${this.gridY}) for round ${this.round} with ${this.resources}/${this.maxResources} ${this.resourceType.id}, gen delay: ${generationDelay}ms`);
        
        // Create visual representation
        this.createVisuals();
        
        // Set up lifespan timer
        this.lifespanTimer = scene.time.addEvent({
            delay: 1000,
            callback: this.updateLifespan,
            callbackScope: this,
            loop: true
        });
        
        // Set up resource generation timer using calculated delay
        this.resourceTimer = scene.time.addEvent({
            delay: generationDelay, // Use calculated delay
            callback: this.generateResource,
            callbackScope: this,
            loop: true
        });
    }
    
    createVisuals() {
        // Create container for node parts
        const cellSize = this.scene.factoryGrid.cellSize;
        this.container = this.scene.add.container(this.x, this.y);
        
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
            //console.log(`Resource node at (${this.gridX}, ${this.gridY}) generated resource: ${this.resources}/${this.maxResources} ${this.resourceType.id}`);
            
            // Visual feedback for resource generation
            const resourceParticle = this.scene.add.circle(
                this.container.x, 
                this.container.y, 
                4, 
                0xffff00 // Use a distinct color for generation feedback maybe?
            ).setDepth(this.container.depth + 1); // Ensure particle is visible
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
            //console.log(`Resource node at (${this.gridX}, ${this.gridY}) is full: ${this.resources}/${this.maxResources}`);
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
        
        // Push resources to adjacent conveyors
        this.pushResourcesToConveyors();
        
        // Periodically log the node's status
        if (this.scene.time.now % 5000 < 16) { // Log every ~5 seconds
            //console.log*(`ResourceNode at (${this.gridX}, ${this.gridY}):`);
            //console.log*(`- Type: ${this.resourceType.id}`);
            //console.log*(`- Resources: ${this.resources}/${this.maxResources}`);
            //console.log*(`- Lifespan: ${this.lifespan}/${GAME_CONFIG.nodeLifespan}`);
        }
    }
    
    /**
     * Check adjacent cells and push resources to valid conveyors OR machines
     */
    pushResourcesToConveyors() {
        // Check cooldown
        const now = this.scene.time.now;
        if (now < this.lastPushTime + this.pushCooldown) {
            return; // Still on cooldown
        }

        // Check if we have resources to push
        if (this.resources <= 0) {
            return; // No resources
        }

        const adjacentOffsets = [
            { dx: 1, dy: 0, requiredDirection: 'right' }, // Right
            { dx: -1, dy: 0, requiredDirection: 'left' }, // Left
            { dx: 0, dy: 1, requiredDirection: 'down' },  // Down
            { dx: 0, dy: -1, requiredDirection: 'up' }    // Up
        ];

        // Shuffle offsets to push randomly if multiple conveyors are available
        Phaser.Utils.Array.Shuffle(adjacentOffsets);

        for (const offset of adjacentOffsets) {
            const targetX = this.gridX + offset.dx;
            const targetY = this.gridY + offset.dy;

            // Check grid bounds
            if (targetX < 0 || targetX >= this.scene.factoryGrid.width || targetY < 0 || targetY >= this.scene.factoryGrid.height) {
                continue;
            }

            const cell = this.scene.factoryGrid.getCell(targetX, targetY);

            // --- Priority 1: Push directly to adjacent Machine (non-conveyor) ---
            if (cell && cell.type === 'machine' && cell.machine && cell.machine.id !== 'conveyor') {
                const targetMachine = cell.machine;
                if (targetMachine.canAcceptInput && targetMachine.canAcceptInput(this.resourceType.id)) {
                    if (targetMachine.receiveResource(this.resourceType.id, this)) {
                        this.resources--; // Decrement node resources
                        this.lastPushTime = now; // Reset cooldown
                        if (this.resourceIndicator) {
                            this.resourceIndicator.setText(this.resources.toString());
                        }
                        this.createTransferEffect(targetMachine);
                        return; // Pushed successfully to machine
                    }
                }
            }
            
            // --- Priority 2: Push to adjacent Conveyor pointing AWAY ---
            else if (cell && cell.type === 'machine' && cell.machine && cell.machine.id === 'conveyor') {
                const conveyor = cell.machine;
                
                // Check if conveyor is pointing away from the node
                let isPointingAway = false;
                if (offset.dx === 1 && conveyor.direction !== 'left') isPointingAway = true;  // Target is right, conveyor not pointing left
                if (offset.dx === -1 && conveyor.direction !== 'right') isPointingAway = true; // Target is left, conveyor not pointing right
                if (offset.dy === 1 && conveyor.direction !== 'up') isPointingAway = true;    // Target is down, conveyor not pointing up
                if (offset.dy === -1 && conveyor.direction !== 'down') isPointingAway = true;  // Target is up, conveyor not pointing down

                if (isPointingAway && conveyor.canAcceptInput && conveyor.canAcceptInput(this.resourceType.id)) {
                    // Use receiveResource for consistency, assuming acceptResourceFromMine isn't strictly needed
                    if (conveyor.receiveResource(this.resourceType.id, this)) {
                        this.resources--; // Decrement node resources
                        this.lastPushTime = now; // Reset cooldown
                        if (this.resourceIndicator) {
                            this.resourceIndicator.setText(this.resources.toString());
                        }
                        this.createTransferEffect(conveyor);
                        return; // Pushed successfully to conveyor
                    }
                }
            }
        }
    }

    /**
     * Creates a visual effect for resource transfer
     * @param {BaseMachine} targetMachine - The machine receiving the resource
     */
    createTransferEffect(targetMachine) {
        const targetPos = targetMachine.container ? { x: targetMachine.container.x, y: targetMachine.container.y } : this.scene.factoryGrid.gridToWorld(targetMachine.gridX, targetMachine.gridY);
        
        const particle = this.scene.add.circle(
            this.container.x, 
            this.container.y, 
            5, 
            this.resourceType.color || 0xaaaaaa
        );
        particle.setDepth(this.container.depth + 1);
        
        this.scene.tweens.add({
            targets: particle,
            x: targetPos.x,
            y: targetPos.y,
            duration: 300, // Faster transfer effect
            ease: 'Power1',
            onComplete: () => {
                particle.destroy();
            }
        });
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
        // Also stop the resource generation timer
        if (this.resourceTimer) {
            this.resourceTimer.remove();
        }
        
        // Destroy visuals
        if (this.container) {
            this.container.destroy();
        }
    }
} 