import Phaser from 'phaser';
import Grid from '../objects/Grid';
import MachineFactory from '../objects/MachineFactory';
import ResourceNode from '../objects/ResourceNode';
import DeliveryNode from '../objects/DeliveryNode'; // Add import
import { GRID_CONFIG, GAME_CONFIG } from '../config/gameConfig';
import TestUtils from '../utils/TestUtils';
import MachineRegistry from '../objects/machines/MachineRegistry';
import { UpgradeManager } from '../managers/UpgradeManager.js';
import { UpgradeNode } from '../objects/UpgradeNode.js'; // Import UpgradeNode
import { UPGRADE_PACKAGE_TYPE, upgradesConfig, UPGRADE_TYPES } from '../config/upgrades.js'; // Import package type for check in clear AND upgradesConfig + UPGRADE_TYPES
import { UpgradeScene } from './UpgradeScene.js'; // Import UpgradeScene
import ConveyorMachine from '../objects/machines/ConveyorMachine.js'; // *** ADDED IMPORT ***
import BaseMachine from '../objects/machines/BaseMachine.js'; // Import BaseMachine for getIOPositionsForDirection
import { MACHINE_COLORS } from '../objects/machines/BaseMachine';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        // Game state
        this.score = 0;
        this.gameTime = 0; // in seconds
        this.gameOver = false;
        this.paused = false;
        this.currentRound = 1; // Add current round tracking
        this.currentRoundScoreThreshold = 0; // Add score threshold tracking
        
        // Momentum state
        this.currentMomentum = 0;
        this.maxMomentum = 100; // Example max value
        this.momentumDecayRate = 1; // Example: 1 unit per second
        this.momentumGainFactor = 0.5; // Example: Gain 0.5 momentum per score point
        
        // Initialize collections
        this.resourceNodes = [];
        this.machines = [];
        this.deliveryNodes = []; // Add deliveryNodes array
        this.upgradeNodes = []; // Use this instead of single tracker for consistency? Let's stick to single for now.
        this.currentUpgradeNode = null; // Tracks the active upgrade node
        this.upgradeNodeSpawnTimer = null; // Timer for spawning upgrade nodes

        // --- REMOVED CLEAR FACTORY COOLDOWN STATE ---
/*
        this.lastClearTime = -Infinity; // Allow first use immediately
        this.currentClearCooldown = GAME_CONFIG.initialClearCooldown;
        this.clearButton = null;
        this.clearStatusText = null;
*/

        // Initialize Upgrade Manager
        this.upgradeManager = new UpgradeManager();

        // Example: Log initial modifier (remove later)
        console.log("Initial Processor Speed Mod:", this.upgradeManager.getProcessorSpeedModifier());

        // TODO: Add logic to spawn UpgradeNode periodically

        this.isPausedForUpgrade = false; // Flag for upgrade pause state
        this.inputMode = 'desktop'; // 'desktop' or 'touch'
        this.isTouchPlacing = false;
        this.touchPreviewGridPos = null;
    }
        
    preload() {
        // ... existing preload ...
        this.load.image('upgrade-node', 'assets/sprites/upgrade_node.png'); // Placeholder path
        this.load.image('upgrade-package', 'assets/sprites/upgrade_package.png'); // Placeholder path
    }
    
    create() {
        // Create game objects
        this.createBackground();
        this.grid = new Grid(this, GRID_CONFIG);
        // Add a reference to the grid as factoryGrid for compatibility with existing code
        this.factoryGrid = this.grid; // Revert to using the existing Grid instance
        
        // Initialize MachineFactory in the machine selection area, not at the grid position
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // Position the MachineFactory in the machine selection area (center of it)
        const machineFactoryX = width * 0.05 + (width * 0.4) / 2;
        const machineFactoryY = height * 0.70 + (height * 0.25) / 2;
        this.machineFactory = new MachineFactory(this, {
            x: machineFactoryX,
            y: machineFactoryY,
            width: 10,
            height: 5,
            cellSize: GRID_CONFIG.cellSize
        });
        
        // Connect the Grid to the MachineFactory
        this.grid.setFactory(this.machineFactory);
        
        // Setup input handlers
        this.setupInput();
        
        // Create UI elements
        this.createUI();
        
        // Add decorative elements
        this.addDecorations();
        
        // Create initial resource nodes
        this.createInitialResourceNodes();
        
        // Setup game timers
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateGameTime,
            callbackScope: this,
            loop: true
        });
        
        // ADD NODE SPAWN TIMER
        this.nodeSpawnTimer = this.time.addEvent({
            delay: GAME_CONFIG.nodeSpawnRate, // Use config value
            callback: this.spawnNode, // Restore original callback
            // callback: () => { console.error("[TIMER_DEBUG] Minimal nodeSpawnTimer CALLBACK FIRED!"); }, // Remove simple log
            callbackScope: this,
            loop: true
        });
        //console.log(`[TIMER_DEBUG] nodeSpawnTimer created:`, this.nodeSpawnTimer ? `Exists, Delay: ${this.nodeSpawnTimer.delay}, Paused: ${this.nodeSpawnTimer.paused}` : 'FAILED TO CREATE');
        
        // ADD UPGRADE NODE SPAWN TIMER
        this.upgradeNodeSpawnTimer = this.time.addEvent({
            delay: GAME_CONFIG.upgradeNodeSpawnDelay, 
            callback: this.trySpawnUpgradeNode, // Restore original callback
            // callback: () => { console.error("[TIMER_DEBUG] Minimal upgradeNodeSpawnTimer CALLBACK FIRED!"); }, // Remove test callback
            callbackScope: this,
            loop: true
        });
        // ---> ADD LOG HERE <---
        console.log(`[TIMER_DEBUG] upgradeNodeSpawnTimer created:`, this.upgradeNodeSpawnTimer ? `Exists, Delay: ${this.upgradeNodeSpawnTimer.delay}, Paused: ${this.upgradeNodeSpawnTimer.paused}` : 'FAILED TO CREATE');
        
        // Setup difficulty timer
        this.difficultyTimer = this.time.addEvent({
            delay: 30000, // 30 seconds
            callback: this.updateDifficulty,
            callbackScope: this,
            loop: true
        });
        
        // Initialize game state
        this.score = 0;
        this.gameTime = 0;
        this.gameOver = false;
        this.currentRound = 1; // Start at round 1
        this.currentRoundScoreThreshold = this.getScoreThresholdForRound(this.currentRound); // Get initial threshold
        this.currentMomentum = this.maxMomentum / 2; // Start with half momentum

        // Play background music
        this.playBackgroundMusic();

        // --- REMOVED CLEAR COOLDOWN INITIALIZATION ---
/*
        this.lastClearTime = -Infinity; // Allow first use
        this.currentClearCooldown = GAME_CONFIG.initialClearCooldown;
*/

        // Momentum UI
        this.momentumBarBg = this.add.graphics();
        this.momentumBar = this.add.graphics();
        const momentumBarWidth = 150;
        const momentumBarHeight = 20;
        const momentumBarX = width * 0.55;
        const momentumBarY = height * 0.87; // Position below time/round

        // Background for the bar
        this.momentumBarBg.fillStyle(0x555555, 1); // Dark grey background
        this.momentumBarBg.fillRect(momentumBarX, momentumBarY, momentumBarWidth, momentumBarHeight);

        // The actual momentum bar (will be updated)
        this.momentumLabel = this.add.text(momentumBarX + momentumBarWidth + 10, momentumBarY, 'Momentum', {
             fontFamily: 'Arial',
             fontSize: 18, // Slightly smaller
             color: '#ffffff'
        });

        // Add momentum value text on top of the bar
        this.momentumValueText = this.add.text(
            momentumBarX + momentumBarWidth / 2,
            momentumBarY + momentumBarHeight / 2,
            `${Math.round(this.currentMomentum)} / ${this.maxMomentum}`,
            {
                fontFamily: 'Arial',
                fontSize: 16,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        this.momentumValueText.setDepth(10);

        // Call the initial update for the bar
        this.updateMomentumUI();

        // --- ADD CLEAR FACTORY UI HERE --- 
        // Clear Factory Button
        this.clearButton = this.createButton(width * 0.77, height * 0.9, 'CLEAR FACTORY', () => {
            this.clearPlacedItems();
        });
        // Adjust button size for text
        this.clearButton.button.width = 180; 
        this.clearButton.text.x = this.clearButton.button.x;

        // --- END CLEAR FACTORY UI --- 

        // ADD EVENT LISTENER FOR UPGRADE TRIGGER
        this.events.on('triggerUpgradeSelection', this.showUpgradeScreen, this);
        // ADD EVENT LISTENER FOR UPGRADE COMPLETION
        this.events.on('upgradeSelected', this.resumeFromUpgrade, this); // Listen for signal from UpgradeScene

        // Add a toggle button or key for switching input modes
        this.input.keyboard.on('keydown-M', () => {
            this.inputMode = this.inputMode === 'desktop' ? 'touch' : 'desktop';
            this.showInputModeMessage();
        });
        // Optionally, add a UI button for mobile users
        // ... existing code ...
    }
    
    update(time, delta) { // Add time, delta parameters
        // PAUSE CHECK
        if (this.gameOver || this.paused || this.isPausedForUpgrade) return;
        
        // ---> ADD TIMER PROGRESS LOG HERE <---
        if (this.nodeSpawnTimer && this.time.now % 1000 < 20) { // Log roughly once per second
            //console.log(`[TIMER_DEBUG] nodeSpawnTimer Progress: ${(this.nodeSpawnTimer.getProgress() * 100).toFixed(1)}% (${this.nodeSpawnTimer.getRemaining().toFixed(0)}ms remaining) Paused: ${this.nodeSpawnTimer.paused}`);
        }
        
        // --- Momentum Decay ---
        const deltaTimeSeconds = delta / 1000;
        this.currentMomentum -= this.momentumDecayRate * deltaTimeSeconds;
        this.currentMomentum = Math.max(0, this.currentMomentum); // Clamp at 0

        // --- Update Momentum UI ---
        this.updateMomentumUI();

        // --- Check Game Over Condition ---
        if (this.currentMomentum <= 0) {
            this.endGame();
            return; // Stop further updates if game is over
        }
        
        // Update all game objects
        this.factoryGrid.update(time, delta); // Pass time, delta to Grid.update()
        this.machineFactory.update(); // Does MachineFactory need time/delta?
        
        // Update resource nodes
        this.resourceNodes.forEach(node => node.update(time, delta)); // Pass time/delta just in case
        // Update delivery nodes
        this.deliveryNodes.forEach(node => node.update(time, delta)); // Pass time/delta just in case
        
        // --- REMOVED CLEAR COOLDOWN UI UPDATE ---
        // this.updateClearCooldownUI(); 
        
        // Check for game over condition
        
        
        

        // this.updateScore(); // Remove this call, addScore handles UI update
        // this.updateResourceDisplay(); // Remove this call, likely handled elsewhere or undefined
    }
    
    createBackground() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Main background
        this.add.rectangle(0, 0, width, height, 0x1a2e3b).setOrigin(0, 0);
        
        // Factory area
        this.add.rectangle(width * 0.05, height * 0.1, width * 0.4, height * 0.6, 0x0a1a2a)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x3a5a7a);
            
        // Machine selection area
        this.add.rectangle(width * 0.05, height * 0.70, width * 0.4, height * 0.25, 0x0a1a2a)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x3a5a7a);
            
        // Add some decorative elements
        this.addDecorations();
    }
    
    createUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Score display (Adjust position slightly)
        this.scoreText = this.add.text(width * 0.55, height * 0.72, `SCORE: 0 / ${this.currentRoundScoreThreshold}`, {
            fontFamily: 'Arial',
            fontSize: 20, // Slightly smaller
            color: '#ffffff'
        });
        
        // Round Display
        this.roundText = this.add.text(width * 0.55, height * 0.77, `ROUND: ${this.currentRound}`, {
             fontFamily: 'Arial',
             fontSize: 20, // Slightly smaller
             color: '#ffffff'
        });

        // Time display (Keep for now, maybe useful later?)
        this.timeText = this.add.text(width * 0.55, height * 0.82, 'TIME: 0:00', {
            fontFamily: 'Arial',
            fontSize: 20, // Slightly smaller
            color: '#ffffff'
        });
        
        // Factory label
       /* this.add.text(width * 0.25, height * 0.05, 'FACTORY', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5, 0); */	
        
        // Pause button
        this.createButton(width * 0.9, height * 0.05, 'PAUSE', () => {
            this.togglePause();
        });
        
        // --- ADD CLEAR FACTORY UI HERE --- 
        // Clear Factory Button
        this.clearButton = this.createButton(width * 0.77, height * 0.9, 'CLEAR FACTORY', () => {
            this.clearPlacedItems();
        });
        // Adjust button size for text
        this.clearButton.button.width = 180; 
        this.clearButton.text.x = this.clearButton.button.x;

        // --- END CLEAR FACTORY UI --- 

        // Active Upgrades Display
        this.activeUpgradesText = this.add.text(width * 0.55, height * 0.05, 'Active Upgrades:', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            align: 'left',
            wordWrap: { width: width * 0.25 } // Adjust width as needed
        });
        this.updateActiveUpgradesDisplay(); // Initial update
    }
    
    setupInput() {
        // Set up drag and drop for machine placement
        /*this.input.on('dragstart', (pointer, gameObject) => {
            // Store original position for returning if placement fails
            gameObject.input.dragStartX = gameObject.x;
            gameObject.input.dragStartY = gameObject.y;
            
            // Store the parent container's position for reference
            if (gameObject.parentFactory) {
                gameObject.input.parentX = gameObject.parentFactory.x;
                gameObject.input.parentY = gameObject.parentFactory.y;
                gameObject.input.scrollX = gameObject.parentFactory.scrollContainer.x;
                
                // Temporarily move the object to the scene's root container for dragging
                // This prevents issues with the scroll container's mask
                
                // Calculate the world position correctly
                const worldX = gameObject.parentFactory.x + gameObject.parentFactory.scrollContainer.x + gameObject.x;
                const worldY = gameObject.parentFactory.y + gameObject.y;
                
                // Store the scale before removing from container
                const originalScaleX = gameObject.scaleX;
                const originalScaleY = gameObject.scaleY;
                
                // Remove from scroll container and add to scene at the correct world position
                gameObject.parentFactory.scrollContainer.remove(gameObject);
                this.add.existing(gameObject);
                
                // Calculate the center of the machine
                const machineWidth = gameObject.width * originalScaleX;
                const machineHeight = gameObject.height * originalScaleY;
                
                // Position at the pointer location, centering the machine on the cursor
                gameObject.x = pointer.x;
                gameObject.y = pointer.y;
                
                // Restore original scale
                gameObject.setScale(originalScaleX, originalScaleY);
                
                // Store that this object was moved from scroll container
                gameObject.wasInScrollContainer = true;
            }
            
            // Add visual feedback - tint all rectangle parts in the container
            if (gameObject.list) {
                gameObject.list.forEach(part => {
                    if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                        // Don't change color of input/output squares
                        if (part === gameObject.inputSquare || part === gameObject.outputSquare) {
                            // Just make them slightly brighter
                            part.fillColor = part === gameObject.inputSquare ? 0x4aa8eb : 0xffa520;
                        } else {
                            part.fillColor = 0x44ff44; // Green tint for regular parts
                        }
                    }
                });
            }
            
            // Create placement preview
            this.createPlacementPreview(gameObject);
        });*/
        
        // Add ESC key handler to clear selection
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.machineFactory) {
                this.machineFactory.clearSelection();
            }
        });
        
        /*this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            try {
                // Validate the gameObject
                if (!gameObject) {
                    console.error('[DRAG] Invalid game object in drag event');
                    return;
                }
                
                // Ensure valid pointer position
                if (!pointer || typeof pointer.x !== 'number' || typeof pointer.y !== 'number') {
                    console.error('[DRAG] Invalid pointer in drag event');
                    return;
                }
                
                // Update the machine position to follow the cursor exactly
                gameObject.x = pointer.x;
                gameObject.y = pointer.y;
                
                // Update placement preview - handle errors within the method
                if (gameObject.machineType || gameObject.isGhost) {
                    try {
                        this.updatePlacementPreview(gameObject);
                    } catch (previewError) {
                        console.error('[DRAG] Error updating preview:', previewError);
                    }
                }
            } catch (error) {
                console.error('[DRAG] Unhandled error in drag event:', error);
            }
        });*/
        
        /*this.input.on('dragend', (pointer, gameObject) => {
            try {
                // Validate the gameObject and pointer
                if (!gameObject) {
                    console.error('[DRAGEND] Invalid game object in dragend event');
                    return;
                }
                
                if (!pointer || typeof pointer.x !== 'number' || typeof pointer.y !== 'number') {
                    console.error('[DRAGEND] Invalid pointer in dragend event');
                    // Try to return object to original position if available
                    if (gameObject.input && typeof gameObject.input.dragStartX === 'number' && typeof gameObject.input.dragStartY === 'number') {
                        gameObject.x = gameObject.input.dragStartX;
                        gameObject.y = gameObject.input.dragStartY;
                    }
                    return;
                }
                
                // Check if the machine is dropped on the factory grid
                let isInBounds = false;
                try {
                    isInBounds = this.factoryGrid.isInBounds(gameObject.x, gameObject.y);
                } catch (boundsError) {
                    console.error('[DRAGEND] Error checking bounds:', boundsError);
                    isInBounds = false;
                }
                
                if (isInBounds) {
                    let gridPosition;
                    try {
                        gridPosition = this.factoryGrid.worldToGrid(gameObject.x, gameObject.y);
                    } catch (gridError) {
                        console.error('[DRAGEND] Error converting to grid position:', gridError);
                        this.returnMachineToOriginalPosition(gameObject);
                        return;
                    }
                    
                    // Store the current direction and rotation for consistency
                    const currentRotation = gameObject.rotation !== undefined ? gameObject.rotation : 0;
                    
                    // Check if machine type exists
                    if (!gameObject.machineType) {
                        console.error('[DRAGEND] Machine object has no machineType');
                        this.returnMachineToOriginalPosition(gameObject);
                        return;
                    }
                    
                    // Try to place the machine using the scene's placeMachine method
                    let canPlace = false;
                    try {
                        canPlace = this.factoryGrid.canPlaceMachine(
                            gameObject.machineType, 
                            gridPosition.x, 
                            gridPosition.y, 
                            currentRotation
                        );
                    } catch (placementCheckError) {
                        console.error('[DRAGEND] Error checking if can place:', placementCheckError);
                        canPlace = false;
                    }
                    
                    if (canPlace) {
                        try {
                            // Place machine is specifically designed to work with lastPreviewPosition
                            //console.log(`[dragend] Placing machine at grid (${gridPosition.x}, ${gridPosition.y}) with rotation ${currentRotation}`);
                            const placedMachine = this.placeMachine(gameObject.machineType, gridPosition.x, gridPosition.y, currentRotation);
                            
                            if (placedMachine) {
                                // Successfully placed machine, now clean up and create a new one
                                
                                // Calculate the original position relative to the scroll container
                                let originalX = 0;
                                let originalY = 0;
                                
                                if (gameObject.wasInScrollContainer && gameObject.parentFactory) {
                                    try {
                                        // For machines from the selection panel, use the original index position
                                        // Find the index of this machine type in the machine types array
                                        const machineTypes = GAME_CONFIG.machineTypes;
                                        const machineTypeIndex = machineTypes.findIndex(type => type.id === gameObject.machineType.id);
                                        
                                        // Calculate position based on index and fixed spacing
                                        const fixedSpacing = 120; // Same as in MachineFactory.createMachineSelectionPanel
                                        originalX = machineTypeIndex * fixedSpacing;
                                        originalY = 0; // Vertical position is always 0 in the scroll container
                                    } catch (positionError) {
                                        console.error('[DRAGEND] Error calculating original position:', positionError);
                                        originalX = 0;
                                        originalY = 0;
                                    }
                                }
                                
                                // Remove the dragged machine
                                try {
                                    gameObject.destroy();
                                } catch (destroyError) {
                                    console.error('[DRAGEND] Error destroying gameObject:', destroyError);
                                }
                                
                                // Create a new machine of the same type at the original position
                                if (this.machineFactory) {
                                    try {
                                        const newMachine = this.machineFactory.createMachineOfType(gameObject.machineType, originalX, originalY);
                                        
                                        // Make the machine preview larger (same as in createMachineSelectionPanel)
                                        if (newMachine) {
                                            newMachine.setScale(1.1);
                                            
                                            // Apply consistent color scheme to the new machine
                                            if (newMachine.list) {
                                                newMachine.list.forEach(part => {
                                                    if (part.type === 'Rectangle' && !part.isResourceIndicator) {
                                                        // Apply the same color scheme as the placed machine
                                                        if (part === newMachine.inputSquare) {
                                                            part.fillColor = 0x4aa8eb; // Brighter blue for input
                                                        } else if (part === newMachine.outputSquare) {
                                                            part.fillColor = 0xffa520; // Brighter orange for output
                                                        } else {
                                                            part.fillColor = 0x44ff44; // Green for regular parts
                                                        }
                                                    }
                                                });
                                            }
                                            
                                            // Add other modifications to the new machine (label, animation, etc.)
                                            // ...
                                        }
                                    } catch (createError) {
                                        console.error('[DRAGEND] Error creating new machine:', createError);
                                    }
                                }
                            } else {
                                // Placement failed, return to original position
                                console.error('[DRAGEND] Failed to place machine');
                                this.returnMachineToOriginalPosition(gameObject);
                            }
                        } catch (placementError) {
                            console.error('[DRAGEND] Error in machine placement:', placementError);
                            this.returnMachineToOriginalPosition(gameObject);
                        }
                    } else {
                        // Can't place, return to original position with animation
                        this.returnMachineToOriginalPosition(gameObject);
                    }
                } else {
                    // Outside bounds, return to original position with animation
                    this.returnMachineToOriginalPosition(gameObject);
                }
                
                // Remove placement preview AFTER placing the machine to ensure lastPreviewPosition is used
                try {
                    this.removePlacementPreview();
                } catch (previewError) {
                    console.error('[DRAGEND] Error removing placement preview:', previewError);
                }
                
                // Clear the last preview position after it's been used
                this.lastPreviewPosition = null;
                
            } catch (error) {
                console.error('[DRAGEND] Unhandled error in dragend event:', error);
                
                // Try to clean up in case of errors
                try {
                    if (gameObject) {
                        this.returnMachineToOriginalPosition(gameObject);
                    }
                    
                    this.removePlacementPreview();
                    this.lastPreviewPosition = null;
                } catch (e) {
                    // Ignore errors in cleanup
                }
            }
        });*/
        
        // Handle rotation key press
        this.input.keyboard.on('keydown-R', () => {
            //console.log("[ROTATION KEY] R key pressed - DIRECT LOG");
            //console.log("[ROTATION KEY] R key pressed");
            try {
                // If we have a machine factory with a selected machine type, rotate it
                if (this.machineFactory && this.machineFactory.selectedMachineType) {
                    //console.log("[ROTATION KEY] Rotating selected machine type");
                    this.machineFactory.rotateMachine();
                    return;
                }
                
                // For compatibility with existing code, still handle rotation for dragged machines
                let machineToRotate = null;
                
                // Check if there's a dragged object with the active pointer
                if (this.input.activePointer && 
                    this.input.activePointer.isDragging && 
                    this.input.activePointer.dragData && 
                    this.input.activePointer.dragData.gameObject) {
                    machineToRotate = this.input.activePointer.dragData.gameObject;
                }
                
                if (machineToRotate) {
                    // Debug rotation
                    //console.log("[ROTATION] === ROTATION DEBUG ===");
                    this.debugRotation("BEFORE", machineToRotate);
                    
                    try {
                        // Normalize any negative rotation to the positive equivalent
                        let currentRotation = machineToRotate.rotation !== undefined ? machineToRotate.rotation : 0;
                        if (currentRotation < 0) {
                            // Convert negative rotation to equivalent positive rotation in [0, 2π]
                            currentRotation = (2 * Math.PI + (currentRotation % (2 * Math.PI))) % (2 * Math.PI);
                            //console.log(`[ROTATION] Normalized negative rotation ${machineToRotate.rotation} to positive ${currentRotation}`);
                            
                            // Update the rotation to the normalized value
                            machineToRotate.rotation = currentRotation;
                        }
                        
                        // Get the current direction
                        const oldDirection = machineToRotate.direction || this.getDirectionFromRotation(machineToRotate.rotation);
                        
                        // Calculate the new rotation - use exact values for cardinal directions
                        let newRotation;
                        let newDirection;
                        
                        // Determine the next rotation based on the current direction
                        switch (oldDirection) {
                            case 'right':
                                newRotation = Math.PI / 2; // Exactly 90 degrees (down)
                                newDirection = 'down';
                                break;
                            case 'down':
                                newRotation = Math.PI; // Exactly 180 degrees (left)
                                newDirection = 'left';
                                break;
                            case 'left':
                                newRotation = 3 * Math.PI / 2; // Exactly 270 degrees (up) - ALWAYS use 3*PI/2, never -PI/2
                                newDirection = 'up';
                                break;
                            case 'up':
                            default:
                                newRotation = 0; // Exactly 0 degrees (right)
                                newDirection = 'right';
                                break;
                        }
                        
                        //console.log(`[ROTATION] Rotating from ${oldDirection} to ${newDirection} (${newRotation.toFixed(4)} rad)`);
                        
                        // Set the new rotation
                        machineToRotate.rotation = newRotation;
                        
                        // Update the direction directly instead of deriving it from rotation
                        machineToRotate.direction = newDirection;
                        
                        // Update direction indicator if it exists
                        if (machineToRotate.directionIndicator) {
                            try {
                                this.updateDirectionIndicator(machineToRotate, newDirection);
                            } catch (indicatorError) {
                                console.error('[ROTATION] Error updating direction indicator:', indicatorError);
                            }
                        }
                        
                        // Update input indicator if it exists
                        if (machineToRotate.inputIndicator) {
                            try {
                                this.updateInputIndicator(machineToRotate);
                            } catch (inputError) {
                                console.error('[ROTATION] Error updating input indicator:', inputError);
                            }
                        }
                        
                        this.debugRotation("AFTER", machineToRotate);
                        
                        // Update the placement preview
                        if (machineToRotate.shape) {
                            try {
                                this.updatePlacementPreview(machineToRotate);
                            } catch (previewError) {
                                console.error('[ROTATION] Error updating placement preview:', previewError);
                            }
                        }
                    } catch (rotationError) {
                        console.error('[ROTATION] Error rotating machine:', rotationError);
                        // Try to reset rotation to a safe value
                        try {
                            machineToRotate.rotation = 0;
                            machineToRotate.direction = 'right';
                        } catch (e) {
                            // Ignore errors in recovery
                        }
                    }
                }
            } catch (error) {
                console.error('[ROTATION] Unhandled error in rotation handler:', error);
            }
        });
        
        // Add automated test key
        this.input.keyboard.on('keydown-Y', () => {
            this.testUtils.runAutomatedTests();
        });
        
        // Add auto-fix key
        this.input.keyboard.on('keydown-U', () => {
            this.testUtils.autoFixDirectionIndicators();
        });
        
        // Add help key for test instructions
        this.input.keyboard.on('keydown-H', () => {
            this.testUtils.showTestInstructions();
        });
        
        // Add back the test key for direction indicators
        this.input.keyboard.on('keydown-T', () => {
            this.testDirectionIndicators();
        });
        
        // Add mouse click handler for machine placement
        this.input.on('pointerdown', (pointer) => {
            if (this.inputMode === 'touch') {
                // Touch mode: first tap shows preview, second tap confirms
                const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);
                if (!this.isPlacingMachine) return;
                if (!this.isTouchPlacing) {
                    // First tap: show preview
                    this.isTouchPlacing = true;
                    this.touchPreviewGridPos = gridPos;
                    this.updatePlacementPreviewAt(gridPos);
                    // Show a floating 'Place' button
                    this.showPlaceButton(gridPos);
                } else {
                    // Second tap: confirm placement
                    this.tryPlaceMachineAt(this.touchPreviewGridPos);
                    this.isTouchPlacing = false;
                    this.touchPreviewGridPos = null;
                    this.removePlaceButton();
                }
            } else {
                // Desktop mode: normal placement
                console.log('[POINTERDOWN] Click detected.');
                if (pointer.leftButtonDown()) {
                    console.log('[POINTERDOWN] Left button down.');
                    const worldX = pointer.worldX;
                    const worldY = pointer.worldY;

                    // Priority 1: Check for conveyor deletion if NOT in active machine placement mode
                    const isPlacingMachine = this.machineFactory && this.machineFactory.selectedMachineType;
                    console.log(`[POINTERDOWN] Is placing machine? ${isPlacingMachine}`);

                    if (!isPlacingMachine) {
                        console.log('[POINTERDOWN] Not actively placing. Checking for conveyor deletion.');
                        if (this.grid.isInBounds(worldX, worldY)) {
                            console.log('[POINTERDOWN] Click is in grid bounds.');
                            const gridPos = this.grid.worldToGrid(worldX, worldY);
                            if (gridPos) {
                                console.log(`[POINTERDOWN] Grid position: (${gridPos.x}, ${gridPos.y})`);
                                const cell = this.grid.getCell(gridPos.x, gridPos.y);
                                if (cell && cell.object) {
                                    console.log(`[POINTERDOWN] Cell object type: ${cell.object.constructor.name}`);
                                    if (cell.object instanceof ConveyorMachine) {
                                        console.log('[POINTERDOWN] Conveyor detected! Calling deleteConveyorOnClick.');
                                        this.deleteConveyorOnClick(cell.object);
                                        return; // Deletion handled, stop further processing for this click
                                    } else {
                                        console.log('[POINTERDOWN] Cell object is not a ConveyorMachine.');
                                    }
                                } else {
                                    console.log('[POINTERDOWN] Cell is empty or has no object.');
                                }
                            } else {
                                console.log('[POINTERDOWN] Could not convert to grid position.');
                            }
                        } else {
                            console.log('[POINTERDOWN] Click is out of grid bounds for deletion check.');
                        }
                    }

                    // Priority 2: Handle machine placement if a machine type is selected
                    if (isPlacingMachine) {
                        console.log('[POINTERDOWN] Attempting machine placement.');
                        // Ensure the click is within the factory grid for placement
                        console.log(`[POINTERDOWN] About to check isInBounds for (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`); // <<< LOG 1
                        const isBoundsOk = this.grid.isInBounds(worldX, worldY);
                        console.log(`[POINTERDOWN] isInBounds returned: ${isBoundsOk}`); // <<< LOG 2

                        if (isBoundsOk) { 
                             console.log('[POINTERDOWN] Bounds OK. Calling handlePlaceMachine.'); // <<< LOG 3
                this.machineFactory.handlePlaceMachine(pointer);
                        } else {
                            console.log('[POINTERDOWN] Bounds NOT OK. Click is out of grid bounds.'); // <<< LOG 4 (This should NOT appear if isBoundsOk is true)
                            // Optionally, you might want to clear selection if clicking outside
                            // this.machineFactory.clearSelection();
                        }
                    }

                } else {
                    console.log('[POINTERDOWN] Not left button or button not down.');
                }
            }
        });
        this.input.on('pointermove', (pointer) => {
            if (this.inputMode === 'touch' && this.isTouchPlacing) {
                const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);
                if (gridPos && (!this.touchPreviewGridPos || gridPos.x !== this.touchPreviewGridPos.x || gridPos.y !== this.touchPreviewGridPos.y)) {
                    this.touchPreviewGridPos = gridPos;
                    this.updatePlacementPreviewAt(gridPos);
                    this.movePlaceButton(gridPos);
                }
            }
        });
    }
    
    // Create a visual preview of where the machine will be placed
    createPlacementPreview(machine) {
        // Create a graphics object for the preview
        this.placementPreview = this.add.graphics();
        
        // Add a debug marker at the preview position to help track it
        /*this.placementPreviewMarker = this.add.graphics();
        this.placementPreviewMarker.lineStyle(2, 0xff0000);
        this.placementPreviewMarker.strokeCircle(0, 0, 5);
        this.placementPreviewMarker.lineStyle(2, 0x00ff00);
        this.placementPreviewMarker.strokeCircle(0, 0, 10);
        this.placementPreviewMarker.setPosition(0, 0); // Set initial position*/
        
        // If no machine is provided, try to use the selectedMachine property
        if (!machine) {
            machine = this.selectedMachine;
            if (!machine) {
                //console.log('[PREVIEW] No machine to preview, creating empty preview');
                return;
            }
        }
        
        // Update the preview with the available machine
        this.updatePlacementPreview(machine);
        
        const machineName = machine.id || (machine.machineType ? machine.machineType.id : 'unknown');
        //console.log(`[PREVIEW] Created placement preview for ${machineName}`);
    }
    
    /**
     * Updates the placement preview graphics
     */
    updatePlacementPreview(machine) {
        //console.log('[PLACEMENT PREVIEW] updatePlacementPreview called - DIRECT LOG');
        
        // If placementPreview doesn't exist, create it first
        if (!this.placementPreview) {
            //console.log('[PLACEMENT PREVIEW] Creating new placement preview graphics');
            this.createPlacementPreview(machine);
            return; // createPlacementPreview will call updatePlacementPreview again
        }

        // Clear existing preview graphics
        this.placementPreview.clear();

        // If no machine provided, try to use the selectedMachine property
        if (!machine) {
            machine = this.selectedMachine;
        }

        // Still no machine? Early return
        if (!machine) {
            //console.log('[PLACEMENT PREVIEW] No machine to preview');
                return;
            }
            
        // Make sure the machine has a shape, and it's an array
        if (!machine.shape || !Array.isArray(machine.shape)) {
            //console.log('[PLACEMENT PREVIEW] Machine shape is missing or invalid, using default 1x1 shape');
            machine.shape = [[1]];
        }

        // Get the rotated shape of the machine
        let rotatedShape;
        try {
            // Prepare rotation value - handle both radians and degrees
            let rotationValue;
            
            // If we have a numeric rotation
            if (typeof machine.rotation === 'number') {
                // Check if it's in radians (0-2π) or degrees (0-360)
                if (machine.rotation < 10) { // Likely radians
                    //console.log(`[PLACEMENT PREVIEW] Rotation value appears to be in radians: ${machine.rotation}`);
                    // Convert to degrees for grid
                    rotationValue = Math.round(machine.rotation * 180 / Math.PI);
                } else { // Likely degrees
                    //console.log(`[PLACEMENT PREVIEW] Rotation value appears to be in degrees: ${machine.rotation}`);
                    rotationValue = Math.round(machine.rotation);
                }
            } else {
                // Use direction string if no rotation
                rotationValue = machine.direction || 'right';
            }
            
            rotatedShape = this.grid.getRotatedShape(machine.shape, rotationValue);
        } catch (error) {
            console.error('[PLACEMENT PREVIEW] Error getting rotated shape:', error);
            // If we can't get the rotated shape, use the original shape as fallback
            rotatedShape = machine.shape;
        }
            
            // Get the grid position from the pointer position
            const gridPos = this.grid.worldToGrid(this.input.activePointer.x, this.input.activePointer.y);
        if (!gridPos) {
            return; // Pointer is outside the grid
        }

        // Get the direction from the rotation
        const direction = this.getDirectionFromRotation(machine.rotation);

        // Create a minimal machineType object for canPlaceMachine if it doesn't exist
        const machineTypeForCheck = {
            shape: rotatedShape,
            id: machine.id || (machine.machineType ? machine.machineType.id : 'unknown'),
            direction: direction // Add the direction to prevent double rotation
        };
        // Check if we can place the machine here
        const canPlace = this.grid.canPlaceMachine(machineTypeForCheck, gridPos.x, gridPos.y, direction);

        // Get the world position of the center of the grid cell
        const centerWorldPos = this.grid.gridToWorld(gridPos.x, gridPos.y);
        
        // Update the placement preview marker position
        if (this.placementPreviewMarker) {
            this.placementPreviewMarker.clear();
            this.placementPreviewMarker.lineStyle(2, 0xff0000);
            this.placementPreviewMarker.strokeCircle(0, 0, 5);
            this.placementPreviewMarker.lineStyle(2, 0x00ff00);
            this.placementPreviewMarker.strokeCircle(0, 0, 10);
            this.placementPreviewMarker.setPosition(centerWorldPos.x, centerWorldPos.y);
        }
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        // Don't set input/output for cargo loaders
        if (machine.id !== 'cargo-loader' && direction !== 'none') {
            // Get machine ID from the machine object
            const machineId = machine.id || (machine.machineType ? machine.machineType.id : 'unknown');
            
            // Get the machine constructor from the registry
            let machineConstructor = null;
            if (this.machineFactory && this.machineFactory.machineRegistry && 
                typeof this.machineFactory.machineRegistry.machineTypes === 'object') {
                machineConstructor = this.machineFactory.machineRegistry.machineTypes.get(machineId);
            }
            
            // Use the getIOPositionsForDirection method from the constructor if available
            if (machineConstructor && typeof machineConstructor.getIOPositionsForDirection === 'function') {
                // Get positions from the machine's own implementation
                const ioPositions = machineConstructor.getIOPositionsForDirection(machineId, direction);
                inputPos = ioPositions.inputPos;
                outputPos = ioPositions.outputPos;
                console.log(`[PREVIEW] Using ${machineId}'s getIOPositionsForDirection: in(${inputPos.x},${inputPos.y}), out(${outputPos.x},${outputPos.y})`);
            } 
            // Otherwise, fallback to BaseMachine's implementation
            else if (typeof BaseMachine !== 'undefined' && BaseMachine.getIOPositionsForDirection) {
                const ioPositions = BaseMachine.getIOPositionsForDirection(machineId, direction);
                inputPos = ioPositions.inputPos;
                outputPos = ioPositions.outputPos;
                console.log(`[PREVIEW] Using BaseMachine.getIOPositionsForDirection for ${machineId}: in(${inputPos.x},${inputPos.y}), out(${outputPos.x},${outputPos.y})`);
            }
            // If neither method is available, use the backup hardcoded positions (should rarely happen)
            else {
                console.warn(`[PREVIEW] getIOPositionsForDirection not found for ${machineId}. Using fallbacks.`);
                switch (direction) {
                    case 'right':
                        // Input on left side, output on right side
                        inputPos = { x: 0, y: Math.floor(rotatedShape.length / 2) };
                        outputPos = { x: rotatedShape[0].length - 1, y: Math.floor(rotatedShape.length / 2) };
                        break;
                    case 'down':
                        // Input on top side, output on bottom side
                        inputPos = { x: Math.floor(rotatedShape[0].length / 2), y: 0 };
                        outputPos = { x: Math.floor(rotatedShape[0].length / 2), y: rotatedShape.length - 1 };
                        break;
                    case 'left':
                        // Input on right side, output on left side
                        inputPos = { x: rotatedShape[0].length - 1, y: Math.floor(rotatedShape.length / 2) };
                        outputPos = { x: 0, y: Math.floor(rotatedShape.length / 2) };
                        break;
                    case 'up':
                        // Input on bottom side, output on top side
                        inputPos = { x: Math.floor(rotatedShape[0].length / 2), y: rotatedShape.length - 1 };
                        outputPos = { x: Math.floor(rotatedShape[0].length / 2), y: 0 };
                        break;
                }
            }
        }
        
        // Use direct positioning instead of offsets
        // Draw each cell at its exact grid position
        for (let y = 0; y < rotatedShape.length; y++) {
            for (let x = 0; x < rotatedShape[y].length; x++) {
                // Only draw cells with value 1 (occupied)
                if (rotatedShape[y][x] === 1) {
                    // *** MODIFIED: Calculate grid coordinates using top-left anchor logic ***
                    const cellGridX = gridPos.x + x; 
                    const cellGridY = gridPos.y + y;
                    
                    // *** REMOVED Center-based offset logic ***
                    // const offsetX = Math.floor(rotatedShape[0].length / 2);
                    // const offsetY = Math.floor(rotatedShape.length / 2);
                    // const cellGridX = Math.floor(gridPos.x + (x - offsetX));
                    // const cellGridY = Math.floor(gridPos.y + (y - offsetY));
                    
                    // *** MODIFIED: Get world coordinates for the top-left of this exact cell ***
                    const cellWorldTopLeftPos = this.grid.gridToWorldTopLeft(cellGridX, cellGridY);

                    // If the cell is out of bounds, gridToWorldTopLeft returns null
                    if (!cellWorldTopLeftPos) {
                        continue; // Don't draw parts that are out of bounds
                    }

                    // Determine cell color based on position in the shape
                    let cellColor = MACHINE_COLORS[machine.id] || 0x44ff44; // Unique color for this machine type
                    
                    // Change color for input/output cells
                    if (machine.id === 'cargo-loader') {
                        // For cargo loader, all sides can be input
                        if ((x === 0 || x === rotatedShape[0].length - 1 || y === 0 || y === rotatedShape.length - 1)) {
                            cellColor = 0x4aa8eb; // Brighter blue for input
                        }
                    }
                    else if (direction !== 'none') {
                        // For normal processors
                        if (x === inputPos.x && y === inputPos.y) {
                            cellColor = 0x4aa8eb; // Brighter blue for input
                        } else if (x === outputPos.x && y === outputPos.y) {
                            cellColor = 0xffa520; // Brighter orange for output
                        }
                    }
                    
                    // Draw the cell directly at its world position
                    this.placementPreview.fillStyle(cellColor, canPlace ? 0.7 : 0.3);
                    this.placementPreview.fillRect(
                        cellWorldTopLeftPos.x + 2, // Use top-left X + margin
                        cellWorldTopLeftPos.y + 2, // Use top-left Y + margin
                        this.grid.cellSize - 4, // Account for 2px margin on each side
                        this.grid.cellSize - 4  // Account for 2px margin on each side
                    );
                    
                    // --- Adjust Input/Output indicator positioning --- 
                    // Get the center of the current cell for placing circles/text
                    const cellWorldCenterPos = this.grid.gridToWorld(cellGridX, cellGridY);

                    // If this is an input cell, draw 'IN' text
                    if (x === inputPos.x && y === inputPos.y) {
                        this.placementPreview.lineStyle(1, 0xffffff, 0.8);
                        this.placementPreview.fillStyle(0x000000, 0.5);
                        // *** MODIFIED: Use cell center position ***
                        this.placementPreview.fillCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
                        this.placementPreview.strokeCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
                    }
                    
                    // If this is an output cell, draw 'OUT' text
                    if (x === outputPos.x && y === outputPos.y) {
                        this.placementPreview.lineStyle(1, 0xffffff, 0.8);
                        this.placementPreview.fillStyle(0x000000, 0.5);
                        // *** MODIFIED: Use cell center position ***
                        this.placementPreview.fillCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
                        this.placementPreview.strokeCircle(cellWorldCenterPos.x, cellWorldCenterPos.y, 8);
                    }
                }
            }
        }

        // Draw a marker at the center position
        this.placementPreview.lineStyle(1, 0xffffff, 0.8);
        this.placementPreview.strokeCircle(centerWorldPos.x, centerWorldPos.y, 3);
        
        // Draw direction indicator if we have a direction
        if (direction !== 'none') {
            const indicatorColor = 0xff9500; // Orange
            const indicatorSize = this.grid.cellSize / 3;
            
            // Draw a triangle pointing in the direction
            this.placementPreview.lineStyle(2, indicatorColor, 0.9);
            this.placementPreview.fillStyle(indicatorColor, 0.7);
            
            // Calculate indicator position offset from center
            let indicatorX = centerWorldPos.x;
            let indicatorY = centerWorldPos.y;
            
            // Create a triangle path for the direction indicator
            const trianglePath = [];
            
            switch (direction) {
                case 'right':
                    trianglePath.push({ x: indicatorX + indicatorSize, y: indicatorY });
                    trianglePath.push({ x: indicatorX - indicatorSize/2, y: indicatorY - indicatorSize/2 });
                    trianglePath.push({ x: indicatorX - indicatorSize/2, y: indicatorY + indicatorSize/2 });
                    break;
                case 'down':
                    trianglePath.push({ x: indicatorX, y: indicatorY + indicatorSize });
                    trianglePath.push({ x: indicatorX - indicatorSize/2, y: indicatorY - indicatorSize/2 });
                    trianglePath.push({ x: indicatorX + indicatorSize/2, y: indicatorY - indicatorSize/2 });
                    break;
                case 'left':
                    trianglePath.push({ x: indicatorX - indicatorSize, y: indicatorY });
                    trianglePath.push({ x: indicatorX + indicatorSize/2, y: indicatorY - indicatorSize/2 });
                    trianglePath.push({ x: indicatorX + indicatorSize/2, y: indicatorY + indicatorSize/2 });
                    break;
                case 'up':
                    trianglePath.push({ x: indicatorX, y: indicatorY - indicatorSize });
                    trianglePath.push({ x: indicatorX - indicatorSize/2, y: indicatorY + indicatorSize/2 });
                    trianglePath.push({ x: indicatorX + indicatorSize/2, y: indicatorY + indicatorSize/2 });
                    break;
            }
            
            // Draw the triangle
            if (trianglePath.length === 3) {
                this.placementPreview.beginPath();
                this.placementPreview.moveTo(trianglePath[0].x, trianglePath[0].y);
                this.placementPreview.lineTo(trianglePath[1].x, trianglePath[1].y);
                this.placementPreview.lineTo(trianglePath[2].x, trianglePath[2].y);
                this.placementPreview.closePath();
                this.placementPreview.fillPath();
                this.placementPreview.strokePath();
            }
        }
    }
    
    // Remove the placement preview
    removePlacementPreview() {
        try {
            if (this.placementPreview) {
                this.placementPreview.clear();
                this.placementPreview.destroy();
                this.placementPreview = null;
            }
            
            if (this.placementPreviewMarker) {
                this.placementPreviewMarker.clear();
                this.placementPreviewMarker.destroy();
                this.placementPreviewMarker = null;
            }
        } catch (error) {
            console.error('Error removing placement preview:', error);
            // Make sure we still set these to null to avoid further issues
            this.placementPreview = null;
            this.placementPreviewMarker = null;
        }
    }
    
    createInitialResourceNodes() {
        // Ensure resourceNodes is initialized
        if (!this.resourceNodes) {
            this.resourceNodes = [];
        }
        // Ensure deliveryNodes is initialized
        if (!this.deliveryNodes) {
            this.deliveryNodes = [];
        }

        // Create initial resource nodes using the spawn method, which now handles rounds
        for (let i = 0; i < GAME_CONFIG.initialNodeCount; i++) {
            this.spawnResourceNode(); // Will use this.currentRound (should be 1)
        }

        // Spawn one initial delivery node (no changes needed here for resource node scaling)
        try {
            const emptySpot = this.grid.findEmptyCell();
            if (!emptySpot) {
                console.warn('[GAME] No empty cell found for initial delivery node placement.');
                return;
            }

            const worldPos = this.grid.gridToWorld(emptySpot.x, emptySpot.y);
            if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
                console.error('[GAME] Invalid world position for initial delivery node:', worldPos);
                return;
            }

            const deliveryNode = new DeliveryNode(this, {
                x: worldPos.x,
                y: worldPos.y,
                gridX: emptySpot.x,
                gridY: emptySpot.y,
                lifespan: GAME_CONFIG.nodeLifespan,
                pointsPerResource: 10
            });

            this.deliveryNodes.push(deliveryNode);
            this.grid.setCell(emptySpot.x, emptySpot.y, { type: 'delivery-node', object: deliveryNode });
            console.log(`[GAME] Created initial delivery node at grid (${emptySpot.x}, ${emptySpot.y})`);

        } catch (error) {
            console.error('[GAME] Error creating initial delivery node:', error);
        }
    }

    // Modify spawnResourceNode to pass the current round
    spawnResourceNode() {
        try {
            if (this.gameOver || this.paused) return;

            // Ensure resourceNodes is initialized
            if (!this.resourceNodes) {
                this.resourceNodes = [];
            }

            // Find an empty spot on the factory grid
            const emptySpot = this.grid.findEmptyCell();
            if (!emptySpot) {
                console.warn('[GAME] No empty cells found for resource node placement');
                return;
            }

            // Convert grid position to world coordinates
            const worldPos = this.grid.gridToWorld(emptySpot.x, emptySpot.y);
            if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
                console.error('[GAME] Invalid world position for resource node:', worldPos);
                return;
            }

            // Select a random resource type (currently hardcoded to basic)
            const resourceTypeIndex = 0;

            // Create a new resource node, passing the current round AND upgradeManager
            const node = new ResourceNode(this, {
                x: worldPos.x,
                y: worldPos.y,
                gridX: emptySpot.x,
                gridY: emptySpot.y,
                resourceType: resourceTypeIndex,
                lifespan: GAME_CONFIG.nodeLifespan
            }, this.currentRound, this.upgradeManager); // Pass this.upgradeManager here

            this.resourceNodes.push(node);
            this.grid.setCell(emptySpot.x, emptySpot.y, { type: 'node', object: node });

            //console.log(`[GAME] Created resource node for round ${this.currentRound} at grid (${emptySpot.x}, ${emptySpot.y})`);
        } catch (error) {
            console.error('[GAME] Error creating resource node:', error);
        }
    }

    generateResources() {
        if (this.gameOver || this.paused) return;

        // Each resource node generates resources based on its own internal timer (now round-dependent).
        // This loop is no longer needed.
        /*
        this.resourceNodes.forEach(node => {
            node.generateResource(); // This is handled by the node's internal timer now
        });
        */
    }
    
    updateGameTime() {
        if (this.gameOver || this.paused) return;
        
        this.gameTime++;
        
        // Update time display
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.timeText.setText(`TIME: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        
        // REMOVED: Game end condition based on time limit
        // if (this.gameTime >= GAME_CONFIG.gameTimeLimit) {
        
        
        
        // Keep difficulty update based on time for now? Or move to round advance?
        // Let's keep the timer-based difficulty for now, can adjust later.
        // this.updateDifficulty(); // Called by its own timer
    }
    
    updateDifficulty() {
        // Option 1: Keep difficulty based on time (as it is now)
        // Option 2: Base difficulty on this.currentRound
        // Let's switch to round-based difficulty scaling

        const round = this.currentRound;

        // Example scaling based on round:
        let newNodeSpawnDelay = GAME_CONFIG.nodeSpawnRate; // Default

        if (round >= 5 && round < 10) {
             newNodeSpawnDelay *= 0.8; // Faster spawns in rounds 5-9
        } else if (round >= 10) {
             newNodeSpawnDelay *= 0.6; // Even faster spawns in round 10+
        }
        // More complex scaling can be added here based on round milestones

        // ---> ADD LOGS HERE <---
        console.log(`[DIFFICULTY_DEBUG] Calculated newNodeSpawnDelay: ${newNodeSpawnDelay} (Round: ${round})`);

        // Apply changes (only if different to avoid resetting timer unnecessarily)
        if (this.nodeSpawnTimer && this.nodeSpawnTimer.delay !== newNodeSpawnDelay) {
             // Add validity check before applying
             if (!isNaN(newNodeSpawnDelay) && newNodeSpawnDelay > 0 && isFinite(newNodeSpawnDelay)) {
                 console.log(`[DIFFICULTY_DEBUG] Applying new delay ${newNodeSpawnDelay}ms to nodeSpawnTimer.`);
                 this.nodeSpawnTimer.delay = newNodeSpawnDelay;
             } else {
                 console.error(`[DIFFICULTY_DEBUG] Invalid delay calculated: ${newNodeSpawnDelay}. Not applying.`);
             }
        }
        
        // Could also adjust:
        // - Resource generation rate
        // - Node lifespan
        // - Cargo bay speed/penalty
        // - Introduce new hazards/challenges
    }
    
    addScore(points) {
        if (this.gameOver) return; // Don't add score if game is over

        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score} / ${this.currentRoundScoreThreshold}`);

        // Increase Momentum
        this.currentMomentum += points * this.momentumGainFactor;
        this.currentMomentum = Phaser.Math.Clamp(this.currentMomentum, 0, this.maxMomentum);

        // Update UI Texts
        // this.updateMomentumUI(); // Update is called every frame anyway

        // Check if round threshold is met
        if (this.score >= this.currentRoundScoreThreshold) {
            this.advanceRound();
        }
    }

    getScoreThresholdForRound(round) {
        const thresholds = GAME_CONFIG.roundScoreThresholds;
        // Round is 1-based, array is 0-based
        if (round - 1 < thresholds.length) {
            return thresholds[round - 1];
        } else {
            // Calculate threshold for rounds beyond the defined array
            // Use the last defined threshold and multiply by the factor for each subsequent round
            let threshold = thresholds[thresholds.length - 1];
            const factor = GAME_CONFIG.scoreIncreaseFactorPerRound;
            for (let i = thresholds.length; i < round; i++) {
                threshold = Math.floor(threshold * factor); // Use Math.floor to keep it integer
            }
            return threshold;
        }
    }

    advanceRound() {
        console.log(`Round ${this.currentRound} completed! Advancing to next round.`);

        // Optional: Play a sound effect for round completion
        this.playSound('round-complete');

        // --- REMOVED camera flash ***
        this.cameras.main.flash(300, 255, 255, 255, true);

        // 1. Clear the factory grid (will now have animations)
        this.clearPlacedItems();
        
        // 2. Increment round number
        this.currentRound++;
        
        // 3. GROW THE GRID if configured to do so
        if (GRID_CONFIG.growthPerRound > 0 && this.grid) {
            // Calculate new dimensions based on growth parameters
            const newWidth = Math.min(
                this.grid.width + GRID_CONFIG.growthPerRound,
                GRID_CONFIG.maxWidth
            );
            const newHeight = Math.min(
                this.grid.height + GRID_CONFIG.growthPerRound,
                GRID_CONFIG.maxHeight
            );
            
            // Only resize if dimensions will actually change
            if (newWidth > this.grid.width || newHeight > this.grid.height) {
                console.log(`[GameScene.advanceRound] Growing grid for round ${this.currentRound}`);
                this.grid.resize(newWidth, newHeight);
                
                // Add a visual effect to highlight the grid expansion
                this.cameras.main.flash(500, 0, 255, 0, 0.3); // Green flash
                
                // Create a visual indicator for the new grid cells
                const gridHighlight = this.add.graphics();
                gridHighlight.fillStyle(0x00ff00, 0.3); // Semi-transparent green
                
                // Calculate grid position
                const gridWidth = this.grid.width * this.grid.cellSize;
                const gridHeight = this.grid.height * this.grid.cellSize;
                const startX = this.grid.x - gridWidth / 2;
                const startY = this.grid.y - gridHeight / 2;
                
                gridHighlight.fillRect(startX, startY, gridWidth, gridHeight);
                
                // Fade out the highlight
                this.tweens.add({
                    targets: gridHighlight,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => {
                        gridHighlight.destroy();
                    }
                });
            }
        }

        // 4. Spawn initial nodes for the new round
        console.log(`[RoundStart] Spawning initial nodes for round ${this.currentRound}...`);
        const nodesToSpawn = GAME_CONFIG.initialNodeCount || 3; // Default to 3 if not set
        for (let i = 0; i < nodesToSpawn; i++) {
            this.spawnNode(); // Spawn one pair (Resource + Delivery)
        }

        // 5. Reset score
        this.score = 0;

        // 6. Reset score threshold for the new round
        this.currentRoundScoreThreshold = this.getScoreThresholdForRound(this.currentRound);

        // 7. Update UI displays
        this.scoreText.setText(`SCORE: ${this.score} / ${this.currentRoundScoreThreshold}`);
        this.roundText.setText(`ROUND: ${this.currentRound}`);

        // 8. Update difficulty explicitly upon advancing round (affects node SPAWN rate)
        this.updateDifficulty();

        console.log(`Advanced to round ${this.currentRound}. New score threshold: ${this.currentRoundScoreThreshold}. Grid size: ${this.grid.width}x${this.grid.height}`);
    }
    
    togglePause() {
        if (this.isPausedForUpgrade) return; 
        this.paused = !this.paused;
        
        if (this.paused) {
            // Pause timers
            this.gameTimer.paused = true;
            if (this.nodeSpawnTimer) {
                 this.nodeSpawnTimer.paused = true;
                 console.log("[TIMER_DEBUG] Paused nodeSpawnTimer via togglePause."); // Log pause
            }
            if (this.upgradeNodeSpawnTimer) {
                 this.upgradeNodeSpawnTimer.paused = true; 
                 console.log("[TIMER_DEBUG] Paused upgradeNodeSpawnTimer via togglePause.");
            }
            this.showPauseScreen();
        } else {
            // Resume timers
            this.gameTimer.paused = false;
            if (this.nodeSpawnTimer) {
                 this.nodeSpawnTimer.paused = false;
                 console.log("[TIMER_DEBUG] Resumed nodeSpawnTimer via togglePause."); // Log resume
            }
            if (this.upgradeNodeSpawnTimer) {
                 this.upgradeNodeSpawnTimer.paused = false; 
                 console.log("[TIMER_DEBUG] Resumed upgradeNodeSpawnTimer via togglePause.");
            }
            this.hidePauseScreen();
        }
    }
    
    showPauseScreen() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create a semi-transparent background
        this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0);
        
        // Pause text
        this.pauseText = this.add.text(width / 2, height / 2, 'PAUSED', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Resume button
        this.resumeButton = this.createButton(width / 2, height / 2 + 80, 'RESUME', () => {
            this.togglePause();
        });
        
        // Main menu button
        this.menuButton = this.createButton(width / 2, height / 2 + 150, 'MAIN MENU', () => {
            this.scene.start('MainMenuScene');
        });
    }
    
    hidePauseScreen() {
        if (this.pauseOverlay) this.pauseOverlay.destroy();
        if (this.pauseText) this.pauseText.destroy();
        if (this.resumeButton) {
            this.resumeButton.button.destroy();
            this.resumeButton.text.destroy();
        }
        if (this.menuButton) {
            this.menuButton.button.destroy();
            this.menuButton.text.destroy();
        }
    }
    
    endGame() {
        this.gameOver = true;
        
        // Stop all timers
        this.gameTimer.remove();
        if (this.nodeSpawnTimer) {
            console.log("[TIMER_DEBUG] Removing nodeSpawnTimer in endGame."); // Log removal
            this.nodeSpawnTimer.remove();
        }
        if (this.upgradeNodeSpawnTimer) {
             console.log("[TIMER_DEBUG] Removing upgradeNodeSpawnTimer in endGame.");
             this.upgradeNodeSpawnTimer.remove(); 
        }
        
        // Transition to game over scene
        this.scene.start('GameOverScene', {
            score: this.score,
            timeSurvived: this.gameTime
        });
    }
    
    createButton(x, y, text, callback) {
        const button = this.add.rectangle(x, y, 200, 50, 0x4a6fb5).setInteractive();
        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5);
        
        button.on('pointerover', () => {
            button.fillColor = 0x5a8fd5;
        });
        
        button.on('pointerout', () => {
            button.fillColor = 0x4a6fb5;
        });
        
        button.on('pointerdown', () => {
            if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
                try {
                    this.sound.play('click');
                } catch (error) {
                    this.audioAvailable = false;
                    this.registry.set('audioAvailable', false);
                }
            }
            callback();
        });
        
        return { button, text: buttonText };
    }
    
    addDecorations() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Add some factory-themed decorations
        //this.add.rectangle(width * 0.5, height * 0.1, width * 0.02, height * 0.8, 0x333333).setOrigin(0.5, 0);
        //this.add.rectangle(width * 0.5, height * 0.1, width * 0.01, height * 0.8, 0x555555).setOrigin(0.5, 0);
        
        // Add some pipes and industrial elements
        //this.addPipe(width * 0.05, height * 0.1, width * 0.4, 0x555555);
        //this.addPipe(width * 0.55, height * 0.1, width * 0.4, 0x555555);
    }
    
    addPipe(x, y, width, color) {
        const pipeHeight = 15;
        const connectorRadius = 8;
        
        // Main pipe
        this.add.rectangle(x, y - pipeHeight / 2, width, pipeHeight, color).setOrigin(0, 0);
        
        // Connectors
        const connectorCount = Math.floor(width / 50);
        for (let i = 0; i <= connectorCount; i++) {
            const connectorX = x + (i * (width / connectorCount));
            this.add.circle(connectorX, y, connectorRadius, 0x333333);
        }
    }
    
    // Helper method to get direction from rotation
    getDirectionFromRotation(rotation) {
        // Ensure rotation is a number
        if (rotation === undefined || rotation === null) {
            rotation = 0;
        }
        
        // Convert to number if it's not already
        rotation = Number(rotation);
        
        // Check if conversion was successful
        if (isNaN(rotation)) {
            rotation = 0;
        }
        
        // Normalize rotation to 0-2π range
        const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Convert rotation to direction - using exact values for better precision
        let direction;
        
        // Use a small epsilon value to handle floating point precision issues
        const epsilon = 0.01; // Increased epsilon for better tolerance
        
        // Check for specific rotation values that correspond to cardinal directions
        if (Math.abs(normalizedRotation - 0) < epsilon || Math.abs(normalizedRotation - 2 * Math.PI) < epsilon) {
            direction = 'right';
        } else if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
            direction = 'down';
        } else if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
            direction = 'left';
        } else if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < epsilon) {
            direction = 'up';
        } 
        // Fallback to range-based checks if not exact
        else if (normalizedRotation < Math.PI / 4 || normalizedRotation >= 7 * Math.PI / 4) {
            direction = 'right';
        } else if (normalizedRotation >= Math.PI / 4 && normalizedRotation < 3 * Math.PI / 4) {
            direction = 'down';
        } else if (normalizedRotation >= 3 * Math.PI / 4 && normalizedRotation < 5 * Math.PI / 4) {
            direction = 'left';
        } else {
            direction = 'up';
        }
        
        return direction;
    }
    
    // Update direction indicator for a machine
    updateDirectionIndicator(machine, direction) {
        if (machine && machine.directionIndicator) {
            // Update the rotation based on direction
            switch (direction) {
                case 'right':
                    machine.directionIndicator.rotation = 0; // Point right (0 degrees)
                    break;
                case 'down':
                    machine.directionIndicator.rotation = Math.PI / 2; // Point down (90 degrees)
                    break;
                case 'left':
                    machine.directionIndicator.rotation = Math.PI; // Point left (180 degrees)
                    break;
                case 'up':
                    machine.directionIndicator.rotation = 3 * Math.PI / 2; // Point up (270 degrees)
                    break;
                default:
                    machine.directionIndicator.rotation = 0;
                    break;
            }
        }
    }
    
    // Update input indicator based on machine rotation
    updateInputIndicator(machine) {
        if (!machine.inputIndicator) return;
        
        // Determine input direction (opposite of output direction)
        const outputDirection = this.getDirectionFromRotation(machine.rotation);
        let inputDirection = 'none';
        
        switch (outputDirection) {
            case 'right': inputDirection = 'left'; break;
            case 'down': inputDirection = 'up'; break;
            case 'left': inputDirection = 'right'; break;
            case 'up': inputDirection = 'down'; break;
        }
        
        // Safely get width and height, providing fallbacks if properties are missing
        let width = 24;  // Default width
        let height = 24; // Default height
        
        if (machine.originalWidth) {
            width = machine.originalWidth;
        } else if (machine.machineType && machine.machineType.shape) {
            width = machine.machineType.shape[0].length * 24;
        } else if (machine.type && machine.type.shape) {
            width = machine.type.shape.length * 24;
        }
        
        if (machine.originalHeight) {
            height = machine.originalHeight;
        } else if (machine.machineType && machine.machineType.shape) {
            height = machine.machineType.shape.length * 24;
        } else if (machine.type && machine.type.shape) {
            height = machine.type.shape.length * 24;
        }
        
        // Update position based on new input direction
        switch (inputDirection) {
            case 'right':
                machine.inputIndicator.x = width - 8;
                machine.inputIndicator.y = height / 2;
                machine.inputIndicator.rotation = 0;
                break;
            case 'down':
                machine.inputIndicator.x = width / 2;
                machine.inputIndicator.y = height - 8;
                machine.inputIndicator.rotation = Math.PI / 2;
                break;
            case 'left':
                machine.inputIndicator.x = 8;
                machine.inputIndicator.y = height / 2;
                machine.inputIndicator.rotation = Math.PI;
                break;
            case 'up':
                machine.inputIndicator.x = width / 2;
                machine.inputIndicator.y = 8;
                machine.inputIndicator.rotation = 3 * Math.PI / 2;
                break;
        }
    }
    
    // Helper method to return a machine to its original position
    returnMachineToOriginalPosition(gameObject) {
        // If the machine was in a scroll container, we need to return it there
        if (gameObject.wasInScrollContainer && gameObject.parentFactory) {
            // For machines from the selection panel, use the original index position
            // Find the index of this machine type in the machine types array
            const machineTypes = GAME_CONFIG.machineTypes;
            const machineTypeIndex = machineTypes.findIndex(type => type.id === gameObject.machineType.id);
            
            // Calculate position based on index and fixed spacing
            const fixedSpacing = 120; // Same as in MachineFactory.createMachineSelectionPanel
            const localX = machineTypeIndex * fixedSpacing;
            const localY = 0; // Vertical position is always 0 in the scroll container
            
            // Store the original rotation to preserve it
            const originalRotation = gameObject.rotation;
            const originalDirection = this.getDirectionFromRotation(originalRotation);
            
            // Animate the return to a position just above the panel
            this.tweens.add({
                targets: gameObject,
                x: gameObject.parentFactory.x + gameObject.parentFactory.scrollContainer.x + localX,
                y: gameObject.parentFactory.y - 50, // Position above the panel
                duration: 200,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Then animate down into the panel
                    this.tweens.add({
                        targets: gameObject,
                        y: gameObject.parentFactory.y + localY,
                        duration: 200,
                        ease: 'Bounce.easeOut',
                        onComplete: () => {
                            // Reset tint on all rectangle parts
                            if (gameObject.list) {
                                gameObject.list.forEach(part => {
                                    if (part.type === 'Rectangle') {
                                        // Restore original colors
                                        if (part === gameObject.inputSquare) {
                                            part.fillColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                                        } else if (part === gameObject.outputSquare) {
                                            if (gameObject.machineType && gameObject.machineType.id === 'extractor') {
                                                part.fillColor = 0xffa520; // Brighter orange (same as when dragging)
                                            } else {
                                                part.fillColor = 0xffa520; // Brighter orange (same as when dragging)
                                            }
                                        } else {
                                            part.fillColor = 0x44ff44; // Default green (same as when dragging)
                                        }
                                    }
                                });
                            }
                            
                            // Remove from scene
                            this.children.remove(gameObject);
                            
                            // Set the position within the scroll container
                            gameObject.x = localX;
                            gameObject.y = localY;
                            
                            // Restore original scale if needed
                            gameObject.setScale(1.1);
                            
                            // Add back to the scroll container
                            gameObject.parentFactory.scrollContainer.add(gameObject);
                            
                            // Ensure the rotation and direction are preserved
                            gameObject.rotation = originalRotation;
                            
                            // Update direction indicator if it exists
                            if (gameObject.directionIndicator) {
                                this.updateDirectionIndicator(gameObject, originalDirection);
                            }
                            
                            // Restart the pulse animation
                            this.tweens.add({
                                targets: gameObject,
                                scaleX: gameObject.scaleX * 1.05,
                                scaleY: gameObject.scaleY * 1.05,
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                        }
                    });
                }
            });
        } else {
            // Regular return animation for machines not from scroll container
            this.tweens.add({
                targets: gameObject,
                x: gameObject.input.dragStartX,
                y: gameObject.input.dragStartY,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Reset tint on all rectangle parts
                    if (gameObject.list) {
                        gameObject.list.forEach(part => {
                            if (part.type === 'Rectangle') {
                                // Restore original colors
                                if (part === gameObject.inputSquare) {
                                    part.fillColor = 0x4aa8eb; // Brighter blue for input (same as when dragging)
                                } else if (part === gameObject.outputSquare) {
                                    if (gameObject.machineType && gameObject.machineType.id === 'extractor') {
                                        part.fillColor = 0xffa520; // Brighter orange (same as when dragging)
                                    } else {
                                        part.fillColor = 0xffa520; // Brighter orange (same as when dragging)
                                    }
                                } else {
                                    part.fillColor = 0x44ff44; // Default green (same as when dragging)
                                }
                            }
                        });
                    }
                }
            });
        }
    }
    
    // Test and diagnose direction indicators
    testDirectionIndicators() {
        // Test all machines in the factory grid
        const gridMachines = this.factoryGrid.getAllMachines();
        
        gridMachines.forEach((machine, index) => {
            if (!machine || !machine.directionIndicator) return;
            
            const actualRotation = machine.rotation;
            const actualDirection = machine.direction || this.getDirectionFromRotation(actualRotation);
            const indicatorRotation = machine.directionIndicator.rotation;
            
            // Update the direction indicator to ensure it's correct
            this.updateDirectionIndicator(machine, actualDirection);
        });
        
        // Test all machines in the selection panel
        const selectionMachines = this.machineFactory.availableMachines;
        
        selectionMachines.forEach((machine, index) => {
            if (!machine || !machine.directionIndicator) return;
            
            const actualRotation = machine.rotation;
            const actualDirection = machine.direction || this.getDirectionFromRotation(actualRotation);
            const indicatorRotation = machine.directionIndicator.rotation;
            
            // Update the direction indicator to ensure it's correct
            this.updateDirectionIndicator(machine, actualDirection);
        });
    }
    
    // Play a sound if audio is available
    playSound(key) {
        if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
            try {
                this.sound.play(key);
            } catch (error) {
                this.audioAvailable = false;
                this.registry.set('audioAvailable', false);
            }
        }
    }
    
    // Play background music if audio is available
    playBackgroundMusic() {
        //console.log('Attempting to play background music');
        // Check if audio is available from registry
        this.audioAvailable = this.registry.get('audioAvailable') || false;
        
        if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
            try {
                this.sound.play('background-music', {
                    loop: true,
                    volume: 0.5
                });
                //console.log('Background music started');
            } catch (error) {
                console.error('Failed to play background music:', error);
                this.audioAvailable = false;
                this.registry.set('audioAvailable', false);
            }
        } else {
            //console.log('Audio not available, skipping background music');
        }
    }
    
    /**
     * Places a machine on the grid at the specified position
     * @param {Object} machineType - The type of machine to place
     * @param {number} gridX - The x coordinate on the grid
     * @param {number} gridY - The y coordinate on the grid
     * @param {number} rotation - The rotation of the machine in degrees
     * @returns {Object|null} The placed machine object or null if placement failed
     */
    placeMachine(machineType, gridX, gridY, rotation = 0) {
        console.log(`[GameScene.placeMachine] ENTERED for ${machineType ? machineType.id : 'INVALID TYPE'} at (${gridX}, ${gridY}), rotation ${rotation}`); // LOG P0
        try {
            // Check 1: Initial bounds check (using gridToWorld)
            const worldPosCheck = this.grid.gridToWorld(gridX, gridY);
            if (!this.grid.isInBounds(worldPosCheck.x, worldPosCheck.y)) {
                console.warn(`[GameScene.placeMachine] Exit P1: Initial bounds check failed for world pos derived from (${gridX}, ${gridY})`); 
                return null;
            }
            
            // Check 2: Validate machineType object
            if (!machineType) {
                 console.warn(`[GameScene.placeMachine] Exit P2: Invalid machineType object passed (null/undefined).`); 
                return null;
            }
            // Check 3: Validate machineType format
            if (typeof machineType !== 'object' || !machineType.id) {
                 console.warn(`[GameScene.placeMachine] Exit P3: Invalid machineType format (not object or no id). Type: ${typeof machineType}, ID: ${machineType ? machineType.id : 'N/A'}`); 
                return null;
            }
            
            // Get direction from rotation (assuming degrees for now)
            const direction = this.getDirectionFromRotation(rotation);
            console.log(`[GameScene.placeMachine] Calculated direction: ${direction} from rotation ${rotation}`); // LOG P4
            
            // Check 5: Validate shape generation (use shape from machineType passed in)
            let shape;
            try {
                if (!machineType.shape) {
                    console.warn(`[GameScene.placeMachine] Exit P5a: machineType object is missing .shape property.`); 
                    return null;
                }
                shape = this.grid.getRotatedShape(machineType.shape, rotation); 
                if (!Array.isArray(shape) || shape.length === 0 || !Array.isArray(shape[0])) {
                     console.warn(`[GameScene.placeMachine] Exit P5b: Invalid rotated shape generated. Shape was:`, shape); 
                    return null;
                }
            } catch (shapeError) {
                console.error('[GameScene.placeMachine] Exit P5c: Error getting rotated shape:', shapeError); 
                return null;
            }
            
            // Check 6: Final placement check using derived direction
            let canPlace = false;
            try {
                canPlace = this.grid.canPlaceMachine(machineType, gridX, gridY, direction); 
            } catch (canPlaceError) {
                console.error('[GameScene.placeMachine] Exit P6a: Error checking canPlaceMachine:', canPlaceError);
                return null; // Exit on error during check
            }
            if (!canPlace) {
                console.warn(`[GameScene.placeMachine] Exit P6b: Final canPlace check failed for ${machineType.id} at (${gridX}, ${gridY}), direction ${direction}`); 
                return null;
            }
            console.log(`[GameScene.placeMachine] Check P6 passed: Can place ${machineType.id}`); // LOG P6

            // Create the machine using the factory
            let machineObj;
            try {
                if (!this.machineFactory || typeof this.machineFactory.createMachine !== 'function') {
                     console.error("[GameScene.placeMachine] Exit P7a: this.machineFactory is invalid or missing createMachine method."); 
                    return null; 
                }
                console.log(`[GameScene.placeMachine] Calling machineFactory.createMachine for ${machineType.id} at (${gridX},${gridY})`); // LOG P7
                machineObj = this.machineFactory.createMachine(
                    machineType.id, 
                    gridX,
                    gridY,
                    direction,
                    rotation,
                    this.grid 
                );
                 console.log(`[GameScene.placeMachine] machineFactory.createMachine result: ${machineObj ? 'Success' : 'Failed/Null'}`); // LOG P8

                 if (!machineObj) { // Explicit check if creation failed
                    console.error("[GameScene.placeMachine] Exit P8a: machineFactory.createMachine returned null/undefined.");
                return null;
            }
            
            } catch (createError) {
                console.error(`[GameScene.placeMachine] Exit P7b: Error during machineFactory.createMachine call:`, createError); 
                return null;
            }
            
            // --- If we get here, machineObj should be valid --- 
            console.log(`[GameScene.placeMachine] Machine object created successfully:`, machineObj); // LOG P9
            
            // Ensure the machine is visible
            if (machineObj.container) {
                machineObj.container.setVisible(true);
                machineObj.container.setAlpha(1);
                
                // Check if the container has any children
                if (machineObj.container.list) {
                    // Make sure all children are visible
                    machineObj.container.list.forEach((child, index) => {
                        if (child) {
                            child.setVisible(true);
                            child.setAlpha(1);
                        }
                    });
                }
            }
            
           
            
            // Register the machine with the factory grid
            try {
                this.grid.placeMachine(
                    machineObj,
                    gridX,
                    gridY,
                    direction
                );
                console.log(`[GameScene.placeMachine] Called grid.placeMachine for ${machineObj.id}`); // LOG P10
            } catch (gridError) {
                console.error('[GameScene.placeMachine] Error during grid.placeMachine:', gridError);
                // Decide if we should destroy the created machineObj if grid placement fails
                if (machineObj && typeof machineObj.destroy === 'function') machineObj.destroy();
                return null; // Exit if grid placement fails
            }
            
            // Add the machine to the scene's tracking array
            this.machines.push(machineObj);
            console.log(`[GameScene.placeMachine] Added ${machineObj.id} to machines array. Total machines: ${this.machines.length}`); // LOG P11
            
            // Always play a sound when placing a machine
            try {
                this.playSound('place');
            } catch (soundError) {
                // Continue even if sound playback fails
            }
            
            // Always exit machine placement mode after successful placement
            // This ensures consistency regardless of how the machine was placed
            if (this.isPlacingMachine) {
                try {
                    this.exitMachinePlacementMode();
                } catch (modeError) {
                    // Continue even if exit mode fails
                }
            }
            
            console.log(`[GameScene.placeMachine] Successfully placed ${machineObj.id}`); // LOG P12
            return machineObj;

        } catch (error) {
            console.error(`[GameScene.placeMachine] Unhandled error in placeMachine for ${machineType ? machineType.id : 'unknown'}:`, error); 
            return null;
        }
    }

   

    /**
     * Helper method to debug machine rotation information
     * @param {string} label - Label for debug information (e.g., "BEFORE" or "AFTER")
     * @param {object} machine - The machine object being rotated
     */
    debugRotation(label, machine) {
        if (!machine) {
            console.warn(`[ROTATION] ${label}: No machine provided for debug`);
            return;
        }
        
        const rotationRad = machine.rotation !== undefined ? machine.rotation : 0;
        const rotationDeg = (rotationRad * 180 / Math.PI).toFixed(1);
        const direction = machine.direction || this.getDirectionFromRotation(rotationRad);
        
        //console.log(`[ROTATION] ${label}: rotation=${rotationRad.toFixed(4)} rad (${rotationDeg}°), direction=${direction}`);
        
        if (machine.machineType) {
            //console.log(`[ROTATION] ${label}: machineType=${machine.machineType.id || 'unknown'}`);
        }
        
        if (machine.gridX !== undefined && machine.gridY !== undefined) {
            //console.log(`[ROTATION] ${label}: gridPos=(${machine.gridX}, ${machine.gridY})`);
        }
        
        if (machine.x !== undefined && machine.y !== undefined) {
            //console.log(`[ROTATION] ${label}: worldPos=(${machine.x.toFixed(1)}, ${machine.y.toFixed(1)})`);
        }
    }

    // Add this helper method to ensure input/output references are correctly set
    fixMachineInputOutputReferences(machine) {
        if (!machine || !machine.container || !machine.container.list) return;
        
        //console.log(`[DEBUG] Fixing input/output references for ${machine.id}`);
        //console.log(`[DEBUG] Machine shape:`, machine.shape);
        //console.log(`[DEBUG] Machine direction: ${machine.direction}`);
        //console.log(`[DEBUG] Total parts in container:`, machine.container.list.length);
        
        // Determine input and output positions based on direction
        let inputPos = { x: -1, y: -1 };
        let outputPos = { x: -1, y: -1 };
        
        if (machine.direction !== 'none') {
            // For machines with direction, determine input and output positions
            switch (machine.direction) {
                case 'right':
                    // Input on left side, output on right side
                    inputPos = { x: 0, y: Math.floor(machine.shape.length / 2) };
                    outputPos = { x: machine.shape[0].length - 1, y: Math.floor(machine.shape.length / 2) };
                    break;
                case 'down':
                    // Input on top side, output on bottom side
                    inputPos = { x: Math.floor(machine.shape[0].length / 2), y: 0 };
                    outputPos = { x: Math.floor(machine.shape[0].length / 2), y: machine.shape.length - 1 };
                    break;
                case 'left':
                    // Input on right side, output on left side
                    inputPos = { x: machine.shape[0].length - 1, y: Math.floor(machine.shape.length / 2) };
                    outputPos = { x: 0, y: Math.floor(machine.shape.length / 2) };
                    break;
                case 'up':
                    // Input on bottom side, output on top side
                    inputPos = { x: Math.floor(machine.shape[0].length / 2), y: machine.shape.length - 1 };
                    outputPos = { x: Math.floor(machine.shape[0].length / 2), y: 0 };
                    break;
            }
        }
        
        //console.log(`[DEBUG] Expected input position: (${inputPos.x}, ${inputPos.y})`);
        //console.log(`[DEBUG] Expected output position: (${outputPos.x}, ${outputPos.y})`);
        
        // Reset inputSquare and outputSquare references
        machine.inputSquare = null;
        machine.outputSquare = null;
        
        // Direct approach: manually set the input and output squares
        // First get the parts ordered by position
        const cellSize = machine.grid.cellSize;
        const parts = [];
        
        // Log each part first for debugging
        machine.container.list.forEach((part, index) => {
            /*console.log(`[DEBUG] Part ${index}:`, part.type, 
                        part.fillColor ? part.fillColor.toString(16) : 'no fillColor',
                        part.x, part.y);*/
        });
        
        // Collect all rectangle parts - be more inclusive
        machine.container.list.forEach(part => {
            // Check if the part has a fillColor property (is a shape)
            if (part.fillColor !== undefined && part !== machine.progressBar && !part.isResourceIndicator) {
                // Store the part with its grid position
                parts.push({
                    part: part,
                    x: Math.round(part.x / cellSize),
                    y: Math.round(part.y / cellSize)
                });
                //console.log(`[DEBUG] Found part at calculated position (${Math.round(part.x / cellSize)}, ${Math.round(part.y / cellSize)})`);
            }
        });
        
        // Find the leftmost part for input (right direction)
        if (machine.direction === 'right') {
            let leftmost = null;
            parts.forEach(item => {
                if (leftmost === null || item.x < leftmost.x) {
                    leftmost = item;
                }
            });
            if (leftmost) {
                machine.inputSquare = leftmost.part;
                //console.log(`[DEBUG] Set input square to leftmost part at (${leftmost.x}, ${leftmost.y})`);
            }
            
            // Find the rightmost part for output
            let rightmost = null;
            parts.forEach(item => {
                if (rightmost === null || item.x > rightmost.x) {
                    rightmost = item;
                }
            });
            if (rightmost) {
                machine.outputSquare = rightmost.part;
                //console.log(`[DEBUG] Set output square to rightmost part at (${rightmost.x}, ${rightmost.y})`);
            }
        }
        // Find the topmost part for input (down direction)
        else if (machine.direction === 'down') {
            let topmost = null;
            parts.forEach(item => {
                if (topmost === null || item.y < topmost.y) {
                    topmost = item;
                }
            });
            if (topmost) {
                machine.inputSquare = topmost.part;
                //console.log(`[DEBUG] Set input square to topmost part at (${topmost.x}, ${topmost.y})`);
            }
            
            // Find the bottommost part for output
            let bottommost = null;
            parts.forEach(item => {
                if (bottommost === null || item.y > bottommost.y) {
                    bottommost = item;
                }
            });
            if (bottommost) {
                machine.outputSquare = bottommost.part;
                //console.log(`[DEBUG] Set output square to bottommost part at (${bottommost.x}, ${bottommost.y})`);
            }
        }
        // Find the rightmost part for input (left direction)
        else if (machine.direction === 'left') {
            let rightmost = null;
            parts.forEach(item => {
                if (rightmost === null || item.x > rightmost.x) {
                    rightmost = item;
                }
            });
            if (rightmost) {
                machine.inputSquare = rightmost.part;
                //console.log(`[DEBUG] Set input square to rightmost part at (${rightmost.x}, ${rightmost.y})`);
            }
            
            // Find the leftmost part for output
            let leftmost = null;
            parts.forEach(item => {
                if (leftmost === null || item.x < leftmost.x) {
                    leftmost = item;
                }
            });
            if (leftmost) {
                machine.outputSquare = leftmost.part;
                //console.log(`[DEBUG] Set output square to leftmost part at (${leftmost.x}, ${leftmost.y})`);
            }
        }
        // Find the bottommost part for input (up direction)
        else if (machine.direction === 'up') {
            let bottommost = null;
            parts.forEach(item => {
                if (bottommost === null || item.y > bottommost.y) {
                    bottommost = item;
                }
            });
            if (bottommost) {
                machine.inputSquare = bottommost.part;
                //console.log(`[DEBUG] Set input square to bottommost part at (${bottommost.x}, ${bottommost.y})`);
            }
            
            // Find the topmost part for output
            let topmost = null;
            parts.forEach(item => {
                if (topmost === null || item.y < topmost.y) {
                    topmost = item;
                }
            });
            if (topmost) {
                machine.outputSquare = topmost.part;
                //console.log(`[DEBUG] Set output square to topmost part at (${topmost.x}, ${topmost.y})`);
            }
        }
    }

    /**
     * Simulate machine placement to calculate accurate position adjustments
     * @param {string} machineId - The ID of the machine type
     * @param {number} gridX - The x coordinate on the grid
     * @param {number} gridY - The y coordinate on the grid
     * @param {string} direction - The direction the machine is facing
     * @param {number} rotation - The rotation of the machine in degrees
     * @returns {Object} The world position and adjustments
     */
    simulateMachinePlacement(machineId, gridX, gridY, direction, rotation) {
        try {
            // Ensure we have valid inputs
            if (machineId === undefined || machineId === null) {
                machineId = 'unknown';
            }
            
            // Ensure machineId is a string
            machineId = String(machineId);
            
            // Validate grid position
            if (gridX === undefined || gridY === undefined || gridX === null || gridY === null) {
                gridX = 0;
                gridY = 0;
            }
            
            // Ensure grid coordinates are numbers
            gridX = Number(gridX);
            gridY = Number(gridY);
            
            // Handle NaN values
            if (isNaN(gridX) || isNaN(gridY)) {
                gridX = 0;
                gridY = 0;
            }
            
            // Ensure we have a valid direction, defaulting to 'right' if missing
            if (!direction || typeof direction !== 'string' || !['right', 'down', 'left', 'up'].includes(direction)) {
                direction = 'right';
            }
            
            // Ensure rotation is a number, defaulting to 0 if missing or invalid
            if (rotation === undefined || rotation === null || isNaN(Number(rotation))) {
                rotation = 0;
            } else {
                rotation = Number(rotation);
            }
            
            // Get base world position from grid coordinates
            let worldPos;
            try {
                // This gives us the center of the grid cell
                worldPos = this.grid.gridToWorld(gridX, gridY);
                
                // Validate world position
                if (!worldPos || typeof worldPos !== 'object' || 
                    worldPos.x === undefined || worldPos.y === undefined ||
                    isNaN(worldPos.x) || isNaN(worldPos.y)) {
                    throw new Error('Invalid world position returned');
                }
            } catch (gridError) {
                // Create a fallback world position
                worldPos = { 
                    x: gridX * (this.grid.cellSize || 24), 
                    y: gridY * (this.grid.cellSize || 24) 
                };
            }
            
            // Initialize adjustments - for most machines these should be 0
            const adjustments = { x: 0, y: 0 };
            
            // Apply direction-specific adjustments based on machine type
            const cellSize = this.grid.cellSize || 24;
            
            // Now ensure the position is always an integer value to avoid rounding errors
            worldPos.x = Math.round(worldPos.x);
            worldPos.y = Math.round(worldPos.y);
            
            return {
                worldPos: worldPos,
                adjustments: adjustments
            };
        } catch (error) {
            // Provide a fallback result
            const cellSize = this.grid ? (this.grid.cellSize || 24) : 24;
            return {
                worldPos: { 
                    x: gridX * cellSize, 
                    y: gridY * cellSize 
                },
                adjustments: { x: 0, y: 0 }
            };
        }
    }

    // Handle machine placement from UI
    handleMachinePlacement(machineType) {
        // Exit placement mode if already placing this machine type
        if (this.isPlacingMachine && this.selectedMachineType === machineType) {
            this.exitMachinePlacementMode();
            return;
        }
        
        // Enter placement mode with the selected machine type
        this.enterMachinePlacementMode(machineType);
    }
    
    // Exit machine placement mode
    exitMachinePlacementMode() {
        try {
            this.isPlacingMachine = false;
            this.selectedMachineType = null;
            
            // Use our robust placement preview removal method
            try {
                this.removePlacementPreview();
            } catch (previewError) {
                console.error('[EXIT] Error removing placement preview:', previewError);
                // Force reset preview objects
                this.placementPreview = null;
                this.placementPreviewMarker = null;
            }
            
            // Clear any ghost machines
            if (this.machineFactory && this.machineFactory.clearGhostMachine) {
                try {
                    this.machineFactory.clearGhostMachine();
                } catch (ghostError) {
                    console.error('[EXIT] Error clearing ghost machine:', ghostError);
                }
            }
            
            //console.log('[PLACEMENT] Exited machine placement mode');
        } catch (error) {
            console.error('[EXIT] Unhandled error in exitMachinePlacementMode:', error);
            // Force reset state
            this.isPlacingMachine = false;
            this.selectedMachineType = null;
            this.placementPreview = null;
            this.placementPreviewMarker = null;
        }
    }
    
    // Enter machine placement mode with the given machine type
    enterMachinePlacementMode(machineType) {
        try {
            // Validate machine type
            if (!machineType) {
                console.error('[ENTER] Missing machine type, cannot enter placement mode');
                return;
            }
            
            if (typeof machineType !== 'object' || !machineType.id) {
                console.error('[ENTER] Invalid machine type:', machineType);
                return;
            }
            
            // First exit any existing placement mode
            this.exitMachinePlacementMode();
            
            // Set the new machine type and enter placement mode
            this.isPlacingMachine = true;
            this.selectedMachineType = machineType;
            
            // Create a placement preview for the selected machine type
            if (this.machineFactory) {
                try {
                    // Create a ghost machine using the factory
                    this.machineFactory.createGhostMachine(machineType);
                } catch (ghostError) {
                    console.error('[ENTER] Error creating ghost machine:', ghostError);
                    // Continue even if ghost creation fails
                }
            } else {
                console.warn('[ENTER] Machine factory not available, cannot create ghost machine');
            }
            
            //console.log(`[PLACEMENT] Entered machine placement mode with type: ${machineType.id}`);
        } catch (error) {
            console.error('[ENTER] Unhandled error in enterMachinePlacementMode:', error);
            // Try to clean up
            this.exitMachinePlacementMode();
        }
    }

    /**
     * Handle mouse interactions with draggable machine
     */
    handleDraggableMachine() {
        // Create a placeholder machine for preview
        if (!this.selectedMachine && this.uiSelectedMachine) {
            const machineType = this.uiSelectedMachine;
            
            // Log the machineType for debugging
            /*console.log('[DRAG] Machine type selected:', JSON.stringify({
                id: machineType.id,
                shape: machineType.shape,
                defaultDirection: machineType.defaultDirection
            }));*/
            
            // Ensure the shape is valid
            let shape = machineType.shape;
            if (!shape || !Array.isArray(shape)) {
                //console.log('[DRAG] Creating default shape for machine');
                shape = [[1]]; // Default 1x1 shape
            } else {
                //console.log('[DRAG] Using shape from machineType:', JSON.stringify(shape));
            }
            
            this.selectedMachine = {
                type: machineType.id,
                id: machineType.id,
                shape: shape,
                direction: machineType.defaultDirection || 'right',
                rotation: 0,
                // Add a machineType property to avoid errors in Grid.js
                machineType: {
                    id: machineType.id,
                    shape: shape,
                    direction: machineType.defaultDirection || 'right'
                },
                getRotatedShape: function() {
                    return this.grid.getRotatedShape(this.shape, this.rotation);
                }.bind(this)
            };
            
            // Log the created selectedMachine
            /*console.log('[DRAG] Created selectedMachine:', JSON.stringify({
                type: this.selectedMachine.type,
                shape: this.selectedMachine.shape,
                direction: this.selectedMachine.direction,
                rotation: this.selectedMachine.rotation
            }));*/
            
            // Create placement preview
            this.createPlacementPreview(this.selectedMachine);
        }

        // Update the machine preview on pointer move
        if (this.selectedMachine) {
            this.pointer = this.input.activePointer;
            
            // Handle rotation on right click
            if (this.input.mousePointer.rightButtonDown() && !this.rightClickProcessed) {
                this.rightClickProcessed = true;
                
                // Rotate 90 degrees clockwise
                this.selectedMachine.rotation = (this.selectedMachine.rotation + 90) % 360;
                
                // Update the direction based on rotation
                switch (this.selectedMachine.rotation) {
                    case 0:
                        this.selectedMachine.direction = 'right';
                        break;
                    case 90:
                        this.selectedMachine.direction = 'down';
                        break;
                    case 180:
                        this.selectedMachine.direction = 'left';
                        break;
                    case 270:
                        this.selectedMachine.direction = 'up';
                        break;
                }
                
                // Also update the direction in the machineType
                if (this.selectedMachine.machineType) {
                    this.selectedMachine.machineType.direction = this.selectedMachine.direction;
                }
                
                // Log rotation
                //console.log(`[DRAG] Machine rotated: ${this.selectedMachine.rotation}° (${this.selectedMachine.direction})`);
                
                // Update the placement preview after rotation
                this.updatePlacementPreview(this.selectedMachine);
            }
            
            // Reset right click processing when mouse button is released
            if (!this.input.mousePointer.rightButtonDown()) {
                this.rightClickProcessed = false;
            }
            
            // Update the placement preview
            this.updatePlacementPreview(this.selectedMachine);
            
            // Handle machine placement on left click
            if (this.input.mousePointer.leftButtonDown() && !this.leftClickProcessed) {
                this.leftClickProcessed = true;
                
                // Get grid position from pointer
                const gridPos = this.grid.worldToGrid(this.pointer.worldX, this.pointer.worldY);
                
                if (gridPos) {
                    // Try to place the machine
                    const placementResult = this.grid.placeMachine(
                        this.selectedMachine,
                        gridPos.x,
                        gridPos.y,
                        this.selectedMachine.rotation
                    );
                    
                    if (placementResult.success) {
                        //console.log(`Machine placed at grid (${gridPos.x}, ${gridPos.y})`);
                        
                        // Create the machine in the world
                        this.createMachine(
                            this.selectedMachine.id,
                            gridPos.x,
                            gridPos.y,
                            this.selectedMachine.direction
                        );
                        
                        // Play placement sound
                        this.sound.play('place', { volume: 0.5 });
                    } else {
                        //console.log(`Cannot place machine: ${placementResult.reason}`);
                        
                        // Play error sound
                        this.sound.play('error', { volume: 0.3 });
                    }
                }
            }
            
            // Reset left click processing when mouse button is released
            if (!this.input.mousePointer.leftButtonDown()) {
                this.leftClickProcessed = false;
            }
        }
    }

    // Add a debug button creation method
    createDebugButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, { 
            fontSize: '16px', 
            fill: '#fff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 }
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback)
        .on('pointerover', () => button.setStyle({ fill: '#ff0' }))
        .on('pointerout', () => button.setStyle({ fill: '#fff' }));
        
        // Make sure it's on top of other elements
        button.setDepth(1000);
        
        return button;
    }

    // --- Clear Factory Ability --- 

    clearPlacedItems() {
        if (this.paused || this.gameOver) return;

        console.log('Clearing all placed machines, belts, and nodes with effects...');

        // --- 1. Score Remaining Items ---
        let salvagedScore = 0;
        const resourceValue = GAME_CONFIG.resourceValueMap;

        // Score items on conveyor belts
        this.machines.forEach(machine => {
            if (machine instanceof ConveyorMachine && machine.itemsOnBelt) {
                machine.itemsOnBelt.forEach(itemOnBelt => {
                    const itemType = itemOnBelt.itemData.type;
                    if (itemType !== UPGRADE_PACKAGE_TYPE && resourceValue[itemType]) {
                        salvagedScore += resourceValue[itemType];
                    }
                });
            }
            // Score items in machine inventories (optional, might double count if belts feed machines)
            // Consider if needed based on how inventories work
            // for (const type in machine.inputInventory) {
            //     if (type !== UPGRADE_PACKAGE_TYPE && resourceValue[type]) {
            //         salvagedScore += (machine.inputInventory[type] * resourceValue[type]);
            //     }
            
            // for (const type in machine.outputInventory) {
            //      if (type !== UPGRADE_PACKAGE_TYPE && resourceValue[type]) {
            //          salvagedScore += (machine.outputInventory[type] * resourceValue[type]);
            //      }
            
        });

        // Score items still in Resource Nodes
        this.resourceNodes.forEach(node => {
            if (node.resources > 0 && resourceValue[node.resourceType.id]) {
                salvagedScore += node.resources * resourceValue[node.resourceType.id];
            }
        });

        if (salvagedScore > 0) {
             console.log(`Adding ${salvagedScore} from salvaged resources.`);
             // --- MODIFIED: Add score directly, bypassing advanceRound check ---
             this.score += salvagedScore;
             this.scoreText.setText(`SCORE: ${this.score} / ${this.currentRoundScoreThreshold}`);
             // We explicitly DO NOT call this.addScore() here to prevent recursion.
             // --- END MODIFICATION ---
        }

        // --- 2. Clear Entities with Animation ---
        const clearDelay = 50; // Short delay between each item's effect start
        const effectDuration = 300; // How long the disintegration effect takes

        // --- Helper function for disintegration effect ---
        const disintegrate = (targetObject, index, isMachine = false) => {
             if (!targetObject) return;
             
             let targetContainer = targetObject.container || targetObject; // Use container if machine, else the object itself (for nodes)
             if (!targetContainer || !targetContainer.scene) return; // Safety checks
             
             this.time.delayedCall(index * clearDelay, () => {
                 // Sound
                 this.playSound('destroy'); // Assuming a 'destroy' sound effect exists

                 // Particle Effect (at container's center)
                 const emitter = this.add.particles(targetContainer.x, targetContainer.y, 'particle', { // Assume 'particle' texture exists
                     speed: { min: 50, max: 150 },
                     angle: { min: 0, max: 360 },
                     scale: { start: 0.5, end: 0 },
                     alpha: { start: 1, end: 0 },
                     lifespan: effectDuration,
                     gravityY: 100,
                     quantity: 10, // Number of particles
                     blendMode: 'ADD' // Brighter particles
                 });
                 // Make particles disappear after duration
                 this.time.delayedCall(effectDuration, () => emitter.destroy());

                 // Disintegration Tween
                 this.tweens.add({
                     targets: targetContainer,
                     duration: effectDuration,
                     ease: 'Quad.easeIn', // Start slow, accelerate
                     // 1. Flash White
                     scaleX: targetContainer.scaleX * 1.1, // Optional: slight scale up
                     scaleY: targetContainer.scaleY * 1.1,
                     alpha: 0.5, // Semi-transparent
                     tint: 0xffffff, // Flash white
                     yoyo: true, // Go back to normal tint/alpha briefly
                     hold: 50, // Hold the white flash briefly
                     onComplete: () => {
                          // 2. Shrink & Fade Out Fast
                         this.tweens.add({
                             targets: targetContainer,
                             scaleX: 0,
                             scaleY: 0,
                             alpha: 0,
                             duration: effectDuration * 0.6, // Faster fade out
                             ease: 'Quad.easeIn',
                             onComplete: () => {
                                 // 3. Final Cleanup after animation
                                 if (this.grid && targetObject.gridX !== undefined && targetObject.gridY !== undefined) {
                                     if (isMachine) {
                                        this.grid.removeMachine(targetObject); // Remove from grid data
                                        if (targetObject && typeof targetObject.destroy === 'function') {
                                            targetObject.destroy(); // Then destroy the machine object itself
                                        }
                                     } else {
                                         // Assumes nodes occupy single cells
                                         const cell = this.grid.getCell(targetObject.gridX, targetObject.gridY);
                                         if(cell && cell.object === targetObject) {
                                             this.grid.setCell(targetObject.gridX, targetObject.gridY, { type: 'empty' });
                                         }
                                         if (targetObject && typeof targetObject.destroy === 'function') {
                                            targetObject.destroy(); // Destroy the node object
                                         }
                                     }
                                 } else if (isMachine) {
                                      console.warn(`[Disintegrate] Machine missing grid/coords, destroying directly.`);
                                      if (targetObject && typeof targetObject.destroy === 'function') {
                                      targetObject.destroy(); 
                                      }
                                 } else { // Is a Node, missing grid/coords
                                       console.warn(`[Disintegrate] Node missing grid/coords, destroying directly.`);
                                      if (targetObject && typeof targetObject.destroy === 'function') {
                                      targetObject.destroy(); 
                                 }
                                 }
                             }
                         });
                     }
                 });
             });
        };
        // --- End Helper function ---

        // --- Clear Machines ---
        const machinesToClear = [...this.machines];
        this.machines = []; // Clear the main array
        machinesToClear.forEach((machine, index) => disintegrate(machine, index, true));

        // --- Clear Resource Nodes ---
        const resourceNodesToClear = [...this.resourceNodes];
        this.resourceNodes = []; // Clear the main array
        resourceNodesToClear.forEach((node, index) => disintegrate(node, machinesToClear.length + index, false));

        // --- Clear Delivery Nodes ---
        const deliveryNodesToClear = [...this.deliveryNodes];
        this.deliveryNodes = []; // Clear the main array
        deliveryNodesToClear.forEach((node, index) => disintegrate(node, machinesToClear.length + resourceNodesToClear.length + index, false));

        // --- Clear Upgrade Node ---
        if (this.currentUpgradeNode) {
            disintegrate(this.currentUpgradeNode, machinesToClear.length + resourceNodesToClear.length + deliveryNodesToClear.length, false);
            this.currentUpgradeNode = null; // Clear the reference
        }

        // --- Grid visual clear (optional, can be removed if animation handles it) ---
        // this.grid.clearGrid(); // Might interfere with animations, clear via cell removal instead

        console.log('Factory clear initiated. Items will disintegrate.');
    }

    updateMomentumUI() {
        this.momentumBar.clear();

        const percentage = Phaser.Math.Clamp(this.currentMomentum / this.maxMomentum, 0, 1);
        const barWidth = 150; // Must match the width used in createUI
        const barHeight = 20; // Must match the height used in createUI
        const barX = this.cameras.main.width * 0.55; // Must match the X used in createUI
        const barY = this.cameras.main.height * 0.87; // Must match the Y used in createUI

        // Determine color based on percentage (Green -> Yellow -> Red)
        let color;
        if (percentage > 0.6) {
            color = 0x00ff00; // Green
        } else if (percentage > 0.25) {
            color = 0xffff00; // Yellow
        } else {
            color = 0xff0000; // Red
        }

        this.momentumBar.fillStyle(color, 1);
        this.momentumBar.fillRect(barX, barY, barWidth * percentage, barHeight);

        // Update the momentum value text
        if (this.momentumValueText) {
            this.momentumValueText.setText(`${Math.round(this.currentMomentum)} / ${this.maxMomentum}`);
        }
    }

    /** Spawns a Resource Node and a Delivery Node pair */
    spawnNode() { 
        // Log `this` context FIRST and use double quotes for the string
        //console.log("[SPAWN_DEBUG] Verifying 'this' context:", this instanceof GameScene ? 'Correct (GameScene)' : 'INCORRECT CONTEXT!', this);
        
        try { // <-- Add try here
            // --- Start of original spawnNode logic --- 
            //console.log(`[SPAWN_DEBUG] spawnNode called at time ${this.time.now.toFixed(0)}`); 

            if (this.gameOver || this.paused || this.isPausedForUpgrade) { 
                 //console.log(`[SPAWN_DEBUG] Aborted spawn due to game state (gameOver/paused).`);
                 return;
            }
            
            if (!this.resourceNodes) { this.resourceNodes = []; }
            if (!this.deliveryNodes) { this.deliveryNodes = []; }

            if (!this.grid) {
                 console.error('[SPAWN_DEBUG] Aborted spawn: Grid is not available.');
                 return;
            }
        
            const emptySpot1 = this.grid.findEmptyCell();
            console.log(`[SPAWN_DEBUG] findEmptyCell (1st attempt) result:`, emptySpot1); 
            if (!emptySpot1) {
                console.warn('[SPAWN_DEBUG] No empty cells found for node pair spawning (1st attempt).');
                return;
            }

            const originalCellType1 = this.grid.getCell(emptySpot1.x, emptySpot1.y)?.type || 'unknown'; 
            this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'temp-reserved-for-spawn' });
            console.log(`[SPAWN_DEBUG] Temporarily marked (${emptySpot1.x}, ${emptySpot1.y}) as reserved.`);

            const emptySpot2 = this.grid.findEmptyCell();
            console.log(`[SPAWN_DEBUG] findEmptyCell (2nd attempt) result:`, emptySpot2); 

            this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: originalCellType1 === 'temp-reserved-for-spawn' ? 'empty' : originalCellType1 }); 
            console.log(`[SPAWN_DEBUG] Restored (${emptySpot1.x}, ${emptySpot1.y}) to type: ${this.grid.getCell(emptySpot1.x, emptySpot1.y)?.type}`);

            if (!emptySpot2) {
                console.warn('[SPAWN_DEBUG] Only one empty cell found. Cannot spawn node pair (2nd attempt failed).');
                return;
            }

            const worldPos1 = this.grid.gridToWorld(emptySpot1.x, emptySpot1.y);
            if (!worldPos1 || typeof worldPos1.x !== 'number' || typeof worldPos1.y !== 'number') {
                console.error('[SPAWN_DEBUG] Invalid world position for resource node:', worldPos1);
                return; 
            }

            const resourceTypeIndex = 0; 
            console.log(`[SPAWN_DEBUG] Spawning Resource Node at (${emptySpot1.x}, ${emptySpot1.y})`);
            const resourceNode = new ResourceNode(this, {
                x: worldPos1.x,
                y: worldPos1.y,
                gridX: emptySpot1.x,
                gridY: emptySpot1.y,
                resourceType: resourceTypeIndex,
                lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier() 
            }, this.currentRound, this.upgradeManager); // Pass this.upgradeManager here
            this.resourceNodes.push(resourceNode);
            this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'node', object: resourceNode });
            console.log(`[SPAWN_DEBUG] Successfully created resource node at grid (${emptySpot1.x}, ${emptySpot1.y})`);

            const worldPos2 = this.grid.gridToWorld(emptySpot2.x, emptySpot2.y);
             if (!worldPos2 || typeof worldPos2.x !== 'number' || typeof worldPos2.y !== 'number') {
                console.error('[SPAWN_DEBUG] Invalid world position for delivery node:', worldPos2);
                console.error('[SPAWN_DEBUG] Rolling back resource node spawn due to delivery node position error.');
                this.grid.setCell(emptySpot1.x, emptySpot1.y, { type: 'empty' }); 
                const index = this.resourceNodes.indexOf(resourceNode);
                if (index !== -1) this.resourceNodes.splice(index, 1);
                resourceNode.destroy(); 
                return; 
            }

            console.log(`[SPAWN_DEBUG] Spawning Delivery Node at (${emptySpot2.x}, ${emptySpot2.y})`);
            const deliveryNode = new DeliveryNode(this, {
                x: worldPos2.x,
                y: worldPos2.y,
                gridX: emptySpot2.x,
                gridY: emptySpot2.y,
                lifespan: GAME_CONFIG.nodeLifespan * this.upgradeManager.getNodeLongevityModifier(), 
                pointsPerResource: 10 
            });
            this.deliveryNodes.push(deliveryNode);
            this.grid.setCell(emptySpot2.x, emptySpot2.y, { type: 'delivery-node', object: deliveryNode });
            console.log(`[SPAWN_DEBUG] Successfully created delivery node at grid (${emptySpot2.x}, ${emptySpot2.y})`);
           // --- End of original spawnNode logic ---

        } catch (error) { // <-- Add catch here
            console.error('[SPAWN_ERROR] Uncaught error inside spawnNode:', error);
        }
    }

    /** Attempts to spawn an Upgrade Node if one doesn't exist */
    trySpawnUpgradeNode() {
        // ---> ADD LOG HERE <---
        console.log(`[UPGRADE_SPAWN_DEBUG] trySpawnUpgradeNode called at time ${this.time.now.toFixed(0)}`);

        // Only spawn if there isn't an active (non-depleted) upgrade node
        if (this.currentUpgradeNode) {
            // ---> ADD LOG HERE <---
            console.log("[UPGRADE_SPAWN_DEBUG] Aborted: currentUpgradeNode already exists.", this.currentUpgradeNode);
            return;
        }

        // ---> ADD LOG HERE <---
        console.log("[UPGRADE_SPAWN_DEBUG] No existing upgrade node found, attempting spawn...");

        try {
             // Check grid existence first
             if (!this.grid) {
                console.error('[UPGRADE_SPAWN_DEBUG] Aborted spawn: Grid is not available.');
                return;
             }

            const emptySpot = this.grid.findEmptyCell();
            // ---> ADD LOG HERE <---
            console.log(`[UPGRADE_SPAWN_DEBUG] findEmptyCell result:`, emptySpot);
            if (!emptySpot) {
                console.warn('[UPGRADE_SPAWN_DEBUG] No empty cells found for upgrade node placement');
                return;
            }

            const worldPos = this.grid.gridToWorld(emptySpot.x, emptySpot.y);
             // ---> ADD LOG HERE <---
            console.log(`[UPGRADE_SPAWN_DEBUG] Calculated worldPos:`, worldPos);
            if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') { // Added validation
                console.error('[UPGRADE_SPAWN_DEBUG] Invalid world position calculated:', worldPos);
                return;
            }

            // ---> ADD LOG HERE <---
            console.log(`[UPGRADE_SPAWN_DEBUG] Spawning UpgradeNode at grid (${emptySpot.x}, ${emptySpot.y}), world (${worldPos.x}, ${worldPos.y})`);
            // Create the upgrade node
            this.currentUpgradeNode = new UpgradeNode(this, worldPos.x, worldPos.y, emptySpot.x, emptySpot.y);
            
            // Mark the grid
            this.grid.setCell(emptySpot.x, emptySpot.y, { type: 'upgrade-node', object: this.currentUpgradeNode });

            // Listen for when it's depleted
            this.currentUpgradeNode.once('depleted', this.handleUpgradeNodeDepleted, this);

            console.log(`[UPGRADE_SPAWN_DEBUG] Successfully created upgrade node at grid (${emptySpot.x}, ${emptySpot.y})`);

        } catch (error) {
            console.error('[UPGRADE_SPAWN_ERROR] Uncaught error inside trySpawnUpgradeNode:', error);
            this.currentUpgradeNode = null; // Ensure tracker is clear on error
        }
    }

    /** Handles the depletion of the current Upgrade Node */
    handleUpgradeNodeDepleted(node) {
        console.log(`[UPGRADE] Upgrade node at (${node.gridX}, ${node.gridY}) depleted.`);
        
        // Double-check it's the current node we're tracking
        if (this.currentUpgradeNode === node) {
            // Clear the grid cell 
            if (this.grid) {
                this.grid.setCell(node.gridX, node.gridY, { type: 'empty' });
            }
            // Clear the reference so a new one can spawn
            this.currentUpgradeNode = null;

            // ---> ADD DESTROY CALL HERE <---
            console.log(`[UPGRADE] Destroying depleted node object.`);
            node.destroy(); // Explicitly destroy the node object
            
            // Optional: Restart or adjust the spawn timer if needed
            // this.upgradeNodeSpawnTimer.reset({...}); 
        } else {
            console.warn('[UPGRADE] Depleted event received for an unknown/old upgrade node.');
            // Still try to clear its grid cell just in case
             if (this.grid) {
                this.grid.setCell(node.gridX, node.gridY, { type: 'empty' });
            }
            // ---> ADD DESTROY CALL HERE TOO (Safety) <---
            // If an old node somehow lingered, destroy it anyway
            if (node && typeof node.destroy === 'function') {
                console.log(`[UPGRADE] Destroying lingering unknown node object.`);
                node.destroy();
            }
        }
        // Node destruction is now handled here.
    }

    showUpgradeScreen() {
        if (this.isPausedForUpgrade) return; // Prevent multiple launches

        console.log("Showing Upgrade Screen...");
        this.isPausedForUpgrade = true;

        // Pause timers
        this.gameTimer.paused = true;
        if (this.nodeSpawnTimer) {
            this.nodeSpawnTimer.paused = true;
            //console.log("[TIMER_DEBUG] Paused nodeSpawnTimer for upgrade screen."); // Log pause
        }
        if (this.upgradeNodeSpawnTimer) {
            this.upgradeNodeSpawnTimer.paused = true;
            //console.log("[TIMER_DEBUG] Paused upgradeNodeSpawnTimer for upgrade screen."); 
        }

        // Pause physics if necessary (optional, depending on your game)
        // this.physics.pause(); 

        // Launch Upgrade Scene, passing the manager
        this.scene.launch('UpgradeScene', { 
            upgradeManager: this.upgradeManager,
            callingSceneKey: this.scene.key // Pass own key
        });
    }

    resumeFromUpgrade() {
        console.log("[GameScene] Resuming from upgrade selection.");
        this.isPausedForUpgrade = false;
        // Potentially re-enable game systems if they were specifically paused beyond the scene's pause
        this.physics.world.resume();
        this.time.paused = false;

        // Resume timers explicitly if they were paused
        if (this.nodeSpawnTimer && this.nodeSpawnTimer.paused) {
            this.nodeSpawnTimer.paused = false;
            //console.log("[TIMER_DEBUG] Node Spawn Timer Resumed in resumeFromUpgrade");
        }
        if (this.upgradeNodeSpawnTimer && this.upgradeNodeSpawnTimer.paused) {
            this.upgradeNodeSpawnTimer.paused = false;
            //console.log("[TIMER_DEBUG] Upgrade Node Spawn Timer Resumed in resumeFromUpgrade");
        }
        if (this.gameTimer && this.gameTimer.paused) {
            this.gameTimer.paused = false;
        }
        if (this.difficultyTimer && this.difficultyTimer.paused) {
            this.difficultyTimer.paused = false;
        }
        
        // Make sure the main scene is responsive to input again
        this.input.enabled = true; 

        this.updateActiveUpgradesDisplay(); // Update the display after an upgrade might have been selected
    }

    updateActiveUpgradesDisplay() {
        if (!this.upgradeManager || !this.activeUpgradesText) {
            return;
        }

        const activeUpgrades = this.upgradeManager.currentUpgrades;
        let displayText = 'Active Upgrades:\n';

        if (Object.keys(activeUpgrades).length === 0) {
            displayText += '- None';
        } else {
            for (const upgradeType in activeUpgrades) {
                const level = activeUpgrades[upgradeType];
                const config = upgradesConfig[upgradeType];
                if (config) {
                    const tierInfo = config.tiers.find(t => t.level === level);
                    displayText += `- ${config.name} (Lvl ${level}): ${tierInfo ? tierInfo.description : ''}\n`;
                }
            }
        }
        this.activeUpgradesText.setText(displayText);
    }

    deleteConveyorOnClick(conveyor) {
        if (this.paused || this.gameOver || !conveyor) return;

        console.log(`Attempting to delete conveyor at grid (${conveyor.gridX}, ${conveyor.gridY})`);

        // 1. Delete items on the belt
        if (conveyor.itemsOnBelt && conveyor.itemsOnBelt.length > 0) {
            console.log(`Deleting ${conveyor.itemsOnBelt.length} items from conveyor.`);
            conveyor.itemsOnBelt.forEach(itemSprite => {
                if (itemSprite && typeof itemSprite.destroy === 'function') {
                    itemSprite.destroy();
                }
            });
            conveyor.itemsOnBelt = []; // Clear the array
        }

        // 2. Remove from the scene's machines array
        const machineIndex = this.machines.indexOf(conveyor);
        if (machineIndex > -1) {
            this.machines.splice(machineIndex, 1);
            console.log('Removed conveyor from scene machines array.');
        }

        // 3. Remove from grid
        if (this.grid && typeof this.grid.removeMachine === 'function') {
            this.grid.removeMachine(conveyor); // removeMachine should handle clearing grid cells
            console.log('Called grid.removeMachine.');
        }

        // 4. Destroy the conveyor game object (container and its contents)
        if (typeof conveyor.destroy === 'function') {
            conveyor.destroy();
            console.log('Destroyed conveyor game object.');
        }

        // 5. Play a sound
        this.playSound('destroy'); // Assuming you have a 'destroy' sound effect
    }

    // -------------------------

    showInputModeMessage() {
        const msg = `Input mode: ${this.inputMode.toUpperCase()}`;
        if (this.inputModeText) this.inputModeText.destroy();
        this.inputModeText = this.add.text(10, 10, msg, { fontSize: 18, color: '#fff', backgroundColor: '#222' }).setScrollFactor(0).setDepth(2000);
        this.time.delayedCall(1500, () => { if (this.inputModeText) this.inputModeText.destroy(); }, [], this);
    }

    updatePlacementPreviewAt(gridPos) {
        if (!this.selectedMachineType) return;
        // Create a dummy machine object for the preview at gridPos
        const previewMachine = {
            id: this.selectedMachineType.id,
            type: this.selectedMachineType.id,
            shape: this.selectedMachineType.shape,
            direction: this.selectedMachineType.direction || 'right',
            rotation: this.selectedMachineType.rotation || 0,
            machineType: this.selectedMachineType,
            gridX: gridPos.x,
            gridY: gridPos.y
        };
        this.updatePlacementPreview(previewMachine);
    }

    showPlaceButton(gridPos) {
        this.removePlaceButton();
        const world = this.grid.gridToWorld(gridPos.x, gridPos.y);
        this.placeBtn = this.add.text(world.x, world.y - 32, 'Place', { fontSize: 18, color: '#fff', backgroundColor: '#4a6fb5', padding: { x: 10, y: 4 } })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(2000);
        this.placeBtn.on('pointerdown', () => {
            if (this.isTouchPlacing && this.touchPreviewGridPos) {
                this.tryPlaceMachineAt(this.touchPreviewGridPos);
                this.isTouchPlacing = false;
                this.touchPreviewGridPos = null;
                this.removePlaceButton();
            }
        });
    }
    movePlaceButton(gridPos) {
        if (this.placeBtn) {
            const world = this.grid.gridToWorld(gridPos.x, gridPos.y);
            this.placeBtn.setPosition(world.x, world.y - 32);
        }
    }
    removePlaceButton() {
        if (this.placeBtn) {
            this.placeBtn.destroy();
            this.placeBtn = null;
        }
    }
    tryPlaceMachineAt(gridPos) {
        if (!this.selectedMachineType || !gridPos) return;
        this.placeMachine(this.selectedMachineType, gridPos.x, gridPos.y, this.selectedMachineType.rotation || 0);
    }
} 
