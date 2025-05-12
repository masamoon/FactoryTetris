import BaseMachine from '../objects/machines/BaseMachine.js';

export const UPGRADE_TYPES = {
    RESOURCE_BOUNTY: 'resource_bounty',
    RESOURCE_REGEN: 'resource_regen',
    PROCESSOR_EFFICIENCY: 'processor_efficiency',
    CONVEYOR_SPEED: 'conveyor_speed',
    NODE_LONGEVITY: 'node_longevity',
    INVENTORY_CAPACITY: 'inventory_capacity',
    EXTRACTION_SPEED: 'extraction_speed',
};

export const upgradesConfig = {
    [UPGRADE_TYPES.RESOURCE_BOUNTY]: {
        name: 'Resource Bounty',
        description: 'Resource nodes spawn with more resources.',
        tiers: [
            { level: 1, modifier: 1.25, description: '+25% Starting Resources' },
            { level: 2, modifier: 1.60, description: '+60% Starting Resources' },
            { level: 3, modifier: 2.00, description: '+100% Starting Resources' },
        ],
        // Add visual representation info later if needed
        // icon: 'resource_bounty_icon'
    },
    [UPGRADE_TYPES.RESOURCE_REGEN]: {
        name: 'Resource Regeneration',
        description: 'Resource nodes replenish faster.',
        tiers: [
            { level: 1, modifier: 1.20, description: '+20% Replenish Rate' },
            { level: 2, modifier: 1.50, description: '+50% Replenish Rate' },
            { level: 3, modifier: 2.00, description: '+100% Replenish Rate' },
        ],
        // icon: 'resource_regen_icon'
    },
    [UPGRADE_TYPES.PROCESSOR_EFFICIENCY]: {
        name: 'Processor Efficiency',
        description: 'Processors work faster.',
        tiers: [
            { level: 1, modifier: 1.15, description: '+15% Processor Speed' },
            { level: 2, modifier: 1.40, description: '+40% Processor Speed' },
            { level: 3, modifier: 1.75, description: '+75% Processor Speed' },
        ],
        // icon: 'processor_efficiency_icon'
    },
    [UPGRADE_TYPES.CONVEYOR_SPEED]: {
        name: 'Conveyor Speed',
        description: 'Conveyors move items faster.',
        tiers: [
            { level: 1, modifier: 1.20, description: '+20% Conveyor Speed' },
            { level: 2, modifier: 1.50, description: '+50% Conveyor Speed' },
            { level: 3, modifier: 2.00, description: '+100% Conveyor Speed' },
        ],
        // icon: 'conveyor_speed_icon'
    },
    [UPGRADE_TYPES.NODE_LONGEVITY]: {
        name: 'Node Longevity',
        description: 'Resource nodes last longer.',
        tiers: [
            { level: 1, modifier: 1.15, description: '+15% Node Lifespan' },
            { level: 2, modifier: 1.40, description: '+40% Node Lifespan' },
            { level: 3, modifier: 2.00, description: '+100% Node Lifespan' },
        ],
        // icon: 'node_longevity_icon'
    },
    [UPGRADE_TYPES.INVENTORY_CAPACITY]: {
        name: 'Inventory Expansion',
        description: 'Increases capacity of all machines.',
        tiers: [
            { level: 1, modifier: 1.25, description: '+25% Inventory Capacity' },
            { level: 2, modifier: 1.50, description: '+50% Inventory Capacity' },
            { level: 3, modifier: 2.00, description: '+100% Inventory Capacity' },
        ],
        // icon: 'inventory_capacity_icon'
    },
    [UPGRADE_TYPES.EXTRACTION_SPEED]: {
        name: 'Rapid Extraction',
        description: 'Resource extraction is faster.',
        tiers: [
            { level: 1, modifier: 0.75, description: '25% Faster Extraction' },
            { level: 2, modifier: 0.50, description: '50% Faster Extraction' },
            { level: 3, modifier: 0.33, description: '67% Faster Extraction' },
        ],
        // icon: 'extraction_speed_icon'
    },
    // --- Procedural/Random Upgrades ---
    quantum_splitter: {
        name: 'Quantum Splitter',
        description: 'Processors have a 20% chance to duplicate output.',
        rarity: 'epic',
        effect: (game) => { 
            // Hook into the BaseMachine's completeProcessing method
            // Apply monkeypatch at runtime to all processor machines
            const originalCompleteProcessing = BaseMachine.prototype.completeProcessing;
            
            BaseMachine.prototype.completeProcessing = function() {
                // Store the state of output inventory before processing
                const beforeState = {};
                if (this.outputTypes) {
                    this.outputTypes.forEach(type => {
                        beforeState[type] = this.outputInventory[type] || 0;
                    });
                }
                
                // Call the original method first
                originalCompleteProcessing.call(this);
                
                // Log the state after normal processing
                const afterNormalProcessing = {};
                if (this.outputTypes) {
                    this.outputTypes.forEach(type => {
                        afterNormalProcessing[type] = this.outputInventory[type] || 0;
                    });
                }
                
                // Only apply to processor machines
                if (this.id && this.id.includes('processor')) {
                    // 20% chance to duplicate output
                    if (Math.random() < 0.2 && this.outputTypes) {
                        console.log(`[QUANTUM SPLITTER] Activated on ${this.id} at (${this.gridX}, ${this.gridY})`);
                        console.log(`[QUANTUM SPLITTER] Before processing: ${JSON.stringify(beforeState)}`);
                        console.log(`[QUANTUM SPLITTER] After normal processing: ${JSON.stringify(afterNormalProcessing)}`);
                        
                        // Add extra output for each output type
                        this.outputTypes.forEach(type => {
                            if (this.outputInventory[type] !== undefined) {
                                this.outputInventory[type]++;
                            }
                        });
                        
                        // Log final state after quantum effect
                        console.log(`[QUANTUM SPLITTER] After quantum effect: ${JSON.stringify(this.outputInventory)}`);
                        
                        // Create floating text animation
                        if (this.scene) {
                            // Create floating text that says "QUANTUM!"
                            const floatingText = this.scene.add.text(
                                this.container.x, 
                                this.container.y - 20, 
                                "QUANTUM!", 
                                { 
                                    fontFamily: 'Arial',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#bb44ff',
                                    stroke: '#000000',
                                    strokeThickness: 4,
                                    shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
                                }
                            ).setOrigin(0.5);
                            floatingText.setDepth(this.container.depth + 10);
                            
                            // Scale up and then down for "pop" effect
                            this.scene.tweens.add({
                                targets: floatingText,
                                scaleX: { from: 0.5, to: 1.5 },
                                scaleY: { from: 0.5, to: 1.5 },
                                duration: 200,
                                ease: 'Back.easeOut',
                                yoyo: true,
                                hold: 100,
                                onComplete: () => {
                                    // Float upward and fade out
                                    this.scene.tweens.add({
                                        targets: floatingText,
                                        y: this.container.y - 60,
                                        alpha: 0,
                                        duration: 800,
                                        ease: 'Cubic.easeOut',
                                        onComplete: () => {
                                            floatingText.destroy();
                                        }
                                    });
                                }
                            });
                            
                            // Create particles or visual indicator
                            const particles = this.scene.add.particles(
                                this.container.x, 
                                this.container.y, 
                                'particle', {
                                    color: [ 0x8800ff ],
                                    lifespan: 600,
                                    speed: { min: 30, max: 80 },
                                    scale: { start: 0.6, end: 0 },
                                    gravityY: 50,
                                    blendMode: 'ADD',
                                    emitting: false
                                }
                            );
                            particles.setDepth(this.container.depth + 1);
                            particles.explode(15);
                            
                            // Camera shake for extra satisfaction
                            this.scene.cameras.main.shake(100, 0.005);
                            
                            // Immediate push attempt for the duplicated output
                            this.pushOutput();
                        }
                    }
                }
            };
        },
    },
    overflow_buffer: {
        name: 'Overflow Buffer',
        description: 'Output inventory can exceed its cap.',
        rarity: 'rare',
        effect: (game) => {
            // Hook into the canProcess method to modify capacity check
            const originalCanProcess = BaseMachine.prototype.canProcess;
            
            BaseMachine.prototype.canProcess = function() {
                // Store current output capacity
                const originalCapacity = this.outputCapacity || 5;
                
                // Get current inventory level
                let currentLevel = 0;
                if (this.outputTypes && this.outputTypes.length > 0) {
                    const outputType = this.outputTypes[0];
                    currentLevel = this.outputInventory[outputType] || 0;
                }
                
                // Check if we would be using overflow buffer
                const wouldUseOverflow = currentLevel >= originalCapacity;
                
                // Temporarily increase capacity by 2 for the check
                this.outputCapacity = originalCapacity + 2;
                
                // Call original method with increased capacity
                const result = originalCanProcess.call(this);
                
                // If we would use overflow and the result is true, log the event
                if (wouldUseOverflow && result) {
                    console.log(`[OVERFLOW BUFFER] Activated on ${this.id} at (${this.gridX}, ${this.gridY})`);
                    console.log(`[OVERFLOW BUFFER] Current inventory: ${currentLevel}/${originalCapacity} (normal cap)`);
                    console.log(`[OVERFLOW BUFFER] Using extended capacity: ${currentLevel}/${originalCapacity + 2} (with overflow)`);
                    console.log(`[OVERFLOW BUFFER] Can process result: ${result}`);
                    
                    // Create floating text animation only when newly entering overflow state
                    if (this.scene && (!this._lastOverflowState || !this.overflowIndicator)) {
                        // Create floating text that says "OVERFLOW!"
                        const floatingText = this.scene.add.text(
                            this.container.x, 
                            this.container.y - 20, 
                            "OVERFLOW!", 
                            { 
                                fontFamily: 'Arial',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#ff9900',
                                stroke: '#000000',
                                strokeThickness: 4,
                                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
                            }
                        ).setOrigin(0.5);
                        floatingText.setDepth(this.container.depth + 10);
                        
                        // Elastic bounce effect
                        this.scene.tweens.add({
                            targets: floatingText,
                            scaleX: { from: 0.2, to: 1.2 },
                            scaleY: { from: 0.2, to: 1.2 },
                            duration: 300,
                            ease: 'Elastic.easeOut',
                            yoyo: true,
                            hold: 200,
                            onComplete: () => {
                                // Float upward and fade out
                                this.scene.tweens.add({
                                    targets: floatingText,
                                    y: this.container.y - 60,
                                    alpha: 0,
                                    duration: 800,
                                    ease: 'Quad.easeOut',
                                    onComplete: () => {
                                        floatingText.destroy();
                                    }
                                });
                            }
                        });
                        
                        // Small burst particles
                        const particles = this.scene.add.particles(
                            this.container.x, 
                            this.container.y, 
                            'particle', {
                                color: [ 0xff9900 ],
                                lifespan: 500,
                                speed: { min: 20, max: 60 },
                                scale: { start: 0.4, end: 0 },
                                gravityY: 100,
                                blendMode: 'ADD',
                                emitting: false
                            }
                        );
                        particles.setDepth(this.container.depth + 1);
                        particles.explode(10);
                    }
                    
                    // Track that we're using overflow state
                    this._lastOverflowState = true;
                } else {
                    this._lastOverflowState = false;
                }
                
                // Restore original capacity
                this.outputCapacity = originalCapacity;
                
                // If result is true and we're in overflow territory, add visual cue
                if (result && this.outputTypes) {
                    const outputType = this.outputTypes[0];
                    if ((this.outputInventory[outputType] || 0) >= originalCapacity) {
                        // Visual indicator for overflow state
                        if (this.container && !this.overflowIndicator) {
                            this.overflowIndicator = this.scene.add.sprite(
                                0, -25, 'particle' // Using particle as placeholder
                            ).setScale(0.5).setTint(0xff9900);
                            
                            this.container.add(this.overflowIndicator);
                            
                            this.scene.tweens.add({
                                targets: this.overflowIndicator,
                                alpha: { from: 0.8, to: 0.2 },
                                duration: 800,
                                yoyo: true,
                                repeat: -1
                            });
                        }
                    } else if (this.overflowIndicator) {
                        // No longer in overflow state, remove indicator
                        this.overflowIndicator.destroy();
                        this.overflowIndicator = null;
                    }
                }
                
                return result;
            };
        },
    },
    
};

export const UPGRADE_PACKAGE_TYPE = 'upgrade_package';

// Tier availability thresholds (example: number of upgrades delivered)
export const TIER_THRESHOLDS = {
    1: 0,
    2: 3, // Tier 2 available after 3 upgrades
    3: 8, // Tier 3 available after 8 upgrades
}; 