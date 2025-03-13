import Phaser from 'phaser';
import Grid from '../objects/Grid';
import MachineFactory from '../objects/MachineFactory';
import CargoBay from '../objects/CargoBay';
import ResourceNode from '../objects/ResourceNode';
import { GRID_CONFIG, GAME_CONFIG } from '../config/gameConfig';
import TestUtils from '../utils/TestUtils';
import MachineRegistry from '../objects/machines/MachineRegistry';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        // Game state
        this.score = 0;
        this.gameTime = 0; // in seconds
        this.gameOver = false;
        this.paused = false;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Check if audio is available
        this.audioAvailable = this.registry.get('audioAvailable') || false;
        
        // Initialize the machine registry
        this.machineRegistry = new MachineRegistry();
        
        // Initialize machines array
        this.machines = [];
        
        // Create background
        this.createBackground();
        
        // Create factory grid
        this.factoryGrid = new Grid(this, {
            x: width * 0.25,
            y: height * 0.5,
            width: GRID_CONFIG.factoryWidth,
            height: GRID_CONFIG.factoryHeight,
            cellSize: GRID_CONFIG.cellSize
        });
        
        // Create cargo bay
        this.cargoBay = new CargoBay(this, {
            x: width * 0.75,
            y: height * 0.5,
            width: GRID_CONFIG.cargoBayWidth,
            height: GRID_CONFIG.cargoBayHeight,
            cellSize: GRID_CONFIG.cellSize
        });
        
        // Create machine factory
        this.machineFactory = new MachineFactory(this, {
            x: width * 0.25,
            y: height * 0.9,
            width: GRID_CONFIG.factoryWidth * GRID_CONFIG.cellSize,
            height: GRID_CONFIG.cellSize * 3
        });
        
        // Create resource nodes
        this.resourceNodes = [];
        this.createInitialResourceNodes();
        
        // Create UI elements
        this.createUI();
        
        // Set up input handlers
        this.setupInput();
        
        // Start game timer
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateGameTime,
            callbackScope: this,
            loop: true
        });
        
        // Resource generation timer
        this.resourceTimer = this.time.addEvent({
            delay: GAME_CONFIG.resourceGenerationRate,
            callback: this.generateResources,
            callbackScope: this,
            loop: true
        });
        
        // Resource node spawn timer
        this.nodeSpawnTimer = this.time.addEvent({
            delay: GAME_CONFIG.nodeSpawnRate,
            callback: this.spawnResourceNode,
            callbackScope: this,
            loop: true
        });
        
        // Initialize test utilities
        this.testUtils = new TestUtils(this);
    }
    
    update() {
        if (this.gameOver || this.paused) return;
        
        // Update all game objects
        this.factoryGrid.update();
        this.cargoBay.update();
        this.machineFactory.update();
        
        // Update resource nodes
        this.resourceNodes.forEach(node => node.update());
        
        // Check for game over condition
        if (this.cargoBay.isOverflowing()) {
            this.endGame();
        }
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
            
        // Cargo bay area
        this.add.rectangle(width * 0.55, height * 0.1, width * 0.4, height * 0.6, 0x0a1a2a)
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
        
        // Score display
        this.scoreText = this.add.text(width * 0.55, height * 0.75, 'SCORE: 0', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        });
        
        // Time display
        this.timeText = this.add.text(width * 0.55, height * 0.8, 'TIME: 0:00', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        });
        
        // Factory label
        this.add.text(width * 0.25, height * 0.05, 'FACTORY', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5, 0);
        
        // Cargo bay label
        this.add.text(width * 0.75, height * 0.05, 'CARGO BAY', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff'
        }).setOrigin(0.5, 0);
        
        // Pause button
        this.createButton(width * 0.9, height * 0.05, 'PAUSE', () => {
            this.togglePause();
        });
    }
    
    setupInput() {
        // Set up drag and drop for machine placement
        this.input.on('dragstart', (pointer, gameObject) => {
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
        });
        
        // Add ESC key handler to clear selection
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.machineFactory) {
                this.machineFactory.clearSelection();
            }
        });
        
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            // Update the machine position to follow the cursor exactly
            gameObject.x = pointer.x;
            gameObject.y = pointer.y;
            
            // Update placement preview
            this.updatePlacementPreview(gameObject);
        });
        
        this.input.on('dragend', (pointer, gameObject) => {
            // Reset tint on all rectangle parts
            if (gameObject.list) {
                gameObject.list.forEach(part => {
                    if (part.type === 'Rectangle') {
                        // Keep input/output colors but make them reddish
                        if (part === gameObject.inputSquare) {
                            part.fillColor = 0x9a3434; // Reddish blue for input
                        } else if (part === gameObject.outputSquare) {
                            part.fillColor = 0xff4444; // Reddish orange for output
                        } else {
                            part.fillColor = 0xff4444; // Red for regular parts
                        }
                    }
                });
            }
            
            // Remove placement preview
            this.removePlacementPreview();
            
            // Check if the machine is dropped on the factory grid
            if (this.factoryGrid.isInBounds(gameObject.x, gameObject.y)) {
                const gridPosition = this.factoryGrid.worldToGrid(gameObject.x, gameObject.y);
                
                // Store the current direction and rotation for consistency
                const currentRotation = gameObject.rotation;
                const currentDirection = this.getDirectionFromRotation(currentRotation);
                
                // Try to place the machine
                if (this.factoryGrid.canPlaceMachine(gameObject.machineType, gridPosition.x, gridPosition.y, currentRotation)) {
                    // Place the machine
                    const placedMachine = this.factoryGrid.placeMachine(gameObject.machineType, gridPosition.x, gridPosition.y, currentRotation);
                    
                    // Ensure the direction indicator is correctly set
                    if (placedMachine && placedMachine.directionIndicator) {
                        // Use the same direction as the dragged machine
                        placedMachine.direction = currentDirection;
                        this.updateDirectionIndicator(placedMachine, currentDirection);
                    }
                    
                    // Play sound if available
                    if (this.audioAvailable && this.sound && typeof this.sound.play === 'function') {
                        try {
                            this.sound.play('place');
                        } catch (error) {
                            this.audioAvailable = false;
                            this.registry.set('audioAvailable', false);
                        }
                    }
                    
                    // Create a new machine of the same type to replace the one that was placed
                    const machineType = gameObject.machineType;
                    
                    // Calculate the original position relative to the scroll container
                    let originalX = 0;
                    let originalY = 0;
                    
                    if (gameObject.wasInScrollContainer && gameObject.parentFactory) {
                        // For machines from the selection panel, use the original index position
                        // Find the index of this machine type in the machine types array
                        const machineTypes = GAME_CONFIG.machineTypes;
                        const machineTypeIndex = machineTypes.findIndex(type => type.id === machineType.id);
                        
                        // Calculate position based on index and fixed spacing
                        const fixedSpacing = 120; // Same as in MachineFactory.createMachineSelectionPanel
                        originalX = machineTypeIndex * fixedSpacing;
                        originalY = 0; // Vertical position is always 0 in the scroll container
                    }
                    
                    // Remove the dragged machine
                    gameObject.destroy();
                    
                    // Create a new machine of the same type at the original position
                    if (this.machineFactory) {
                        const newMachine = this.machineFactory.createMachineOfType(machineType, originalX, originalY);
                        
                        // Make the machine preview larger (same as in createMachineSelectionPanel)
                        if (newMachine) {
                            newMachine.setScale(1.1);
                            
                            // Add a label below the machine
                            const labelText = this.add.text(
                                originalX,
                                30, // Position closer to the machine
                                machineType.name,
                                {
                                    fontFamily: 'Arial',
                                    fontSize: 12, // Slightly smaller font size
                                    color: '#ffffff',
                                    align: 'center',
                                    fontStyle: 'bold'
                                }
                            ).setOrigin(0.5);
                            
                            // Add a subtle shadow to the text for better visibility
                            labelText.setShadow(1, 1, '#000000', 3);
                            
                            // Add the label to the scroll container
                            this.machineFactory.scrollContainer.add(labelText);
                            
                            // Store the label with the machine
                            newMachine.label = labelText;
                            
                            // Add pulse animation
                            this.tweens.add({
                                targets: newMachine,
                                scaleX: newMachine.scaleX * 1.05,
                                scaleY: newMachine.scaleY * 1.05,
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                        }
                    }
                } else {
                    // Return to original position with animation
                    this.returnMachineToOriginalPosition(gameObject);
                }
            } else {
                // Always return to original position with animation when dropped outside the grid
                this.returnMachineToOriginalPosition(gameObject);
            }
        });
        
        // Handle rotation key press
        this.input.keyboard.on('keydown-R', () => {
            let machineToRotate = null;
            
            // Check if there's a dragged object with the active pointer
            if (this.input.activePointer.isDragging && 
                this.input.activePointer.dragData && 
                this.input.activePointer.dragData.gameObject) {
                machineToRotate = this.input.activePointer.dragData.gameObject;
            }
            
            // If no dragged machine found, check for the placement ghost
            if (!machineToRotate && this.machineFactory.placementGhost) {
                machineToRotate = this.machineFactory.placementGhost;
            }
            
            // Skip the rest of the code to find machines in the selection panel
            // ...

            if (machineToRotate) {
                console.log("=== ROTATION DEBUG ===");
                this.debugRotation("BEFORE", machineToRotate);
                
                // Normalize any negative rotation to the positive equivalent
                let currentRotation = machineToRotate.rotation;
                if (currentRotation < 0) {
                    // Convert negative rotation to equivalent positive rotation in [0, 2π]
                    currentRotation = (2 * Math.PI + (currentRotation % (2 * Math.PI))) % (2 * Math.PI);
                    console.log(`Normalized negative rotation ${machineToRotate.rotation} to positive ${currentRotation}`);
                    
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
                
                console.log(`Rotating from ${oldDirection} to ${newDirection} (${newRotation.toFixed(4)} rad)`);
                
                // Set the new rotation
                machineToRotate.rotation = newRotation;
                
                // Update the direction directly instead of deriving it from rotation
                machineToRotate.direction = newDirection;
                
                // Update direction indicator if it exists
                if (machineToRotate.directionIndicator) {
                    this.updateDirectionIndicator(machineToRotate, newDirection);
                }
                
                // Update input indicator if it exists
                if (machineToRotate.inputIndicator) {
                    this.updateInputIndicator(machineToRotate);
                }
                
                this.debugRotation("AFTER", machineToRotate);
                
                // If this is a ghost machine, update the placement preview
                if (machineToRotate.isGhost && this.placementPreview) {
                    this.updatePlacementPreview(machineToRotate);
                }
                
                // If this is the placement ghost, also update the ghost machine in the factory
                if (machineToRotate === this.machineFactory.placementGhost) {
                    // Make sure the factory's ghost machine has the updated rotation and direction
                    this.machineFactory.placementGhost.rotation = newRotation;
                    this.machineFactory.placementGhost.direction = newDirection;
                }
                
                console.log("=====================");
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
    }
    
    // Create a visual preview of where the machine will be placed
    createPlacementPreview(machine) {
        // Create a graphics object for the preview
        this.placementPreview = this.add.graphics();
        this.updatePlacementPreview(machine);
    }
    
    // Update the placement preview based on current machine position
    updatePlacementPreview(machine) {
        if (!this.placementPreview) return;
        
        this.placementPreview.clear();
        
        // Get the machine type - handle both old and new structures
        const machineType = machine.machineType;
        if (!machineType) {
            return;
        }
        
        // Check if the machine is over the grid
        if (this.factoryGrid.isInBounds(machine.x, machine.y)) {
            const gridPosition = this.factoryGrid.worldToGrid(machine.x, machine.y);
            
            // Check if placement is valid
            const canPlace = this.factoryGrid.canPlaceMachine(
                machineType, 
                gridPosition.x, 
                gridPosition.y, 
                machine.rotation
            );
            
            // Get the rotated shape
            const shape = this.factoryGrid.getRotatedShape(machineType.shape, machine.rotation);
            
            // Calculate the correct origin position based on the shape's center
            const originX = gridPosition.x - Math.floor(shape[0].length / 2);
            const originY = gridPosition.y - Math.floor(shape.length / 2);
            
            // Draw preview cells
            const cellSize = this.factoryGrid.cellSize;
            const gridWidth = this.factoryGrid.width * cellSize;
            const gridHeight = this.factoryGrid.height * cellSize;
            const startX = this.factoryGrid.x - gridWidth / 2;
            const startY = this.factoryGrid.y - gridHeight / 2;
            
            // Set color based on validity
            this.placementPreview.lineStyle(2, canPlace ? 0x00ff00 : 0xff0000);
            this.placementPreview.fillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.3);
            
            // Draw each cell of the machine shape
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] === 1) {
                        const cellX = startX + (originX + x) * cellSize;
                        const cellY = startY + (originY + y) * cellSize;
                        this.placementPreview.fillRect(cellX, cellY, cellSize, cellSize);
                        this.placementPreview.strokeRect(cellX, cellY, cellSize, cellSize);
                    }
                }
            }
            
            // Make the preview visible
            this.placementPreview.setVisible(true);
        } else {
            // Hide the preview if not over the grid
            this.placementPreview.setVisible(false);
        }
    }
    
    // Remove the placement preview
    removePlacementPreview() {
        if (this.placementPreview) {
            this.placementPreview.clear();
            this.placementPreview.destroy();
            this.placementPreview = null;
        }
    }
    
    createInitialResourceNodes() {
        // Create initial resource nodes
        for (let i = 0; i < GAME_CONFIG.initialNodeCount; i++) {
            this.spawnResourceNode();
        }
    }
    
    spawnResourceNode() {
        if (this.gameOver || this.paused) return;
        
        // Find an empty spot on the factory grid
        const emptySpot = this.factoryGrid.findEmptyCell();
        if (emptySpot) {
            const worldPos = this.factoryGrid.gridToWorld(emptySpot.x, emptySpot.y);
            
            // Select a random resource type
            const resourceTypeIndex = Phaser.Math.Between(0, GAME_CONFIG.resourceTypes.length - 1);
            const resourceType = GAME_CONFIG.resourceTypes[resourceTypeIndex];
            
            // Create a new resource node
            const node = new ResourceNode(this, {
                x: worldPos.x,
                y: worldPos.y,
                gridX: emptySpot.x,
                gridY: emptySpot.y,
                resourceType: resourceTypeIndex,
                lifespan: GAME_CONFIG.nodeLifespan
            });
            
            this.resourceNodes.push(node);
            this.factoryGrid.setCell(emptySpot.x, emptySpot.y, { type: 'node', object: node });
        }
    }
    
    generateResources() {
        if (this.gameOver || this.paused) return;
        
        // Each resource node generates resources
        this.resourceNodes.forEach(node => {
            node.generateResource();
        });
    }
    
    updateGameTime() {
        if (this.gameOver || this.paused) return;
        
        this.gameTime++;
        
        // Update time display
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.timeText.setText(`TIME: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        
        // Check for game end condition (time limit)
        if (this.gameTime >= GAME_CONFIG.gameTimeLimit) {
            this.endGame();
        }
        
        // Increase difficulty over time
        this.updateDifficulty();
    }
    
    updateDifficulty() {
        // Early game (0-10 min)
        if (this.gameTime < 600) {
            // Easier settings
        } 
        // Mid game (10-20 min)
        else if (this.gameTime < 1200) {
            // Medium difficulty
            if (this.gameTime === 600) {
                this.resourceTimer.delay = GAME_CONFIG.resourceGenerationRate * 0.8;
                this.nodeSpawnTimer.delay = GAME_CONFIG.nodeSpawnRate * 1.2;
            }
        } 
        // Late game (20-30 min)
        else {
            // Hard difficulty
            if (this.gameTime === 1200) {
                this.resourceTimer.delay = GAME_CONFIG.resourceGenerationRate * 0.6;
                this.nodeSpawnTimer.delay = GAME_CONFIG.nodeSpawnRate * 1.5;
            }
        }
    }
    
    addScore(points) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);
    }
    
    togglePause() {
        this.paused = !this.paused;
        
        if (this.paused) {
            // Pause all timers
            this.gameTimer.paused = true;
            this.resourceTimer.paused = true;
            this.nodeSpawnTimer.paused = true;
            
            // Show pause screen
            this.showPauseScreen();
        } else {
            // Resume all timers
            this.gameTimer.paused = false;
            this.resourceTimer.paused = false;
            this.nodeSpawnTimer.paused = false;
            
            // Hide pause screen
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
        this.resourceTimer.remove();
        this.nodeSpawnTimer.remove();
        
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
        this.add.rectangle(width * 0.5, height * 0.1, width * 0.02, height * 0.8, 0x333333).setOrigin(0.5, 0);
        this.add.rectangle(width * 0.5, height * 0.1, width * 0.01, height * 0.8, 0x555555).setOrigin(0.5, 0);
        
        // Add some pipes and industrial elements
        this.addPipe(width * 0.05, height * 0.1, width * 0.4, 0x555555);
        this.addPipe(width * 0.55, height * 0.1, width * 0.4, 0x555555);
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
            width = machine.type.shape[0].length * 24;
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
                                            part.fillColor = 0x3498db; // Blue for input
                                        } else if (part === gameObject.outputSquare) {
                                            if (gameObject.machineType && gameObject.machineType.id === 'extractor') {
                                                part.fillColor = 0xd35400; // Darker orange for extractor output
                                            } else {
                                                part.fillColor = 0xff9500; // Orange for output
                                            }
                                        } else {
                                            part.fillColor = 0x4a6fb5; // Default blue
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
                                    part.fillColor = 0x3498db; // Blue for input
                                } else if (part === gameObject.outputSquare) {
                                    if (gameObject.machineType && gameObject.machineType.id === 'extractor') {
                                        part.fillColor = 0xd35400; // Darker orange for extractor output
                                    } else {
                                        part.fillColor = 0xff9500; // Orange for output
                                    }
                                } else {
                                    part.fillColor = 0x4a6fb5; // Default blue
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
    
    placeMachine(machineType, gridX, gridY, rotation = 0) {
        // Check if the position is valid
        if (!this.factoryGrid.isInBounds(
            this.factoryGrid.gridToWorld(gridX, gridY).x, 
            this.factoryGrid.gridToWorld(gridX, gridY).y
        )) {
            return null;
        }
        
        // Check if the machine can be placed at this position
        const shape = this.factoryGrid.getRotatedShape(machineType.shape, rotation);
        if (!this.factoryGrid.canPlaceMachine(machineType, gridX, gridY, rotation)) {
            return null;
        }
        
        // Create the machine
        let machine;
        
        // Use the registry to create the machine
        if (this.machineRegistry && this.machineRegistry.hasMachineType(machineType.id)) {
            // Create the machine with the correct grid position
            machine = this.machineRegistry.createMachine(machineType.id, this, {
                grid: this.factoryGrid,
                gridX: gridX,  // Use gridX instead of x
                gridY: gridY,  // Use gridY instead of y
                rotation: rotation
            });
            
            // Explicitly set the grid position again to ensure it's correct
            machine.gridX = gridX;
            machine.gridY = gridY;
            
            // Add the machine to the grid
            this.factoryGrid.placeMachine(machine, gridX, gridY, shape);
            
            // Add the machine to the machines array
            if (!this.machines) {
                this.machines = [];
            }
            this.machines.push(machine);
            
            // Play placement sound
            this.playSound('place');
            
            return machine;
        } else {
            return null;
        }
    }

    // Add this debug method after the constructor
    debugRotation(prefix, object) {
        if (!object) return;
        
        const rotationRad = object.rotation || 0;
        const direction = object.direction || this.getDirectionFromRotation(rotationRad);
        const indicatorRotation = object.directionIndicator ? object.directionIndicator.rotation : 'no indicator';
        
        console.log(`${prefix} - rotation: ${rotationRad.toFixed(4)} rad (${(rotationRad * 180 / Math.PI).toFixed(2)}°), direction: ${direction}, indicator: ${typeof indicatorRotation === 'number' ? indicatorRotation.toFixed(4) : indicatorRotation}`);
    }
} 