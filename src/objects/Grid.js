import Phaser from 'phaser';

export default class Grid {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.cellSize = config.cellSize;
        
        // Create grid cells
        this.cells = [];
        this.createGrid();
        
        // Create graphics for grid visualization
        this.graphics = scene.add.graphics();
        this.drawGrid();
        
        // Machines placed on the grid
        this.machines = [];
    }
    
    createGrid() {
        // Initialize empty grid
        for (let y = 0; y < this.height; y++) {
            this.cells[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = { type: 'empty' };
            }
        }
    }
    
    drawGrid() {
        this.graphics.clear();
        
        // Calculate grid position
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        // Draw background
        this.graphics.fillStyle(0x0a1a2a);
        this.graphics.fillRect(startX, startY, gridWidth, gridHeight);
        
        // Draw grid lines
        this.graphics.lineStyle(1, 0x3a5a7a);
        
        // Vertical lines
        for (let x = 0; x <= this.width; x++) {
            const lineX = startX + x * this.cellSize;
            this.graphics.beginPath();
            this.graphics.moveTo(lineX, startY);
            this.graphics.lineTo(lineX, startY + gridHeight);
            this.graphics.strokePath();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y++) {
            const lineY = startY + y * this.cellSize;
            this.graphics.beginPath();
            this.graphics.moveTo(startX, lineY);
            this.graphics.lineTo(startX + gridWidth, lineY);
            this.graphics.strokePath();
        }
        
        // Draw cell contents
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                const cellX = startX + x * this.cellSize + this.cellSize / 2;
                const cellY = startY + y * this.cellSize + this.cellSize / 2;
                
                if (cell.type === 'machine') {
                    // Machine cells are drawn by the machine objects
                } else if (cell.type === 'node') {
                    // Resource nodes are drawn by the node objects
                } else {
                    // Empty cell
                    this.graphics.fillStyle(0x1a2e3b, 0.5);
                    this.graphics.fillRect(
                        startX + x * this.cellSize + 1,
                        startY + y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    );
                }
            }
        }
        
        // Add a subtle grid highlight effect
        this.addGridHighlight();
    }
    
    // Add a subtle highlight effect to the grid to make it more visually appealing
    addGridHighlight() {
        // If we already have a highlight effect, remove it
        if (this.highlightEffect) {
            this.highlightEffect.destroy();
        }
        
        // Calculate grid position
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        // Create a gradient overlay
        this.highlightEffect = this.scene.add.graphics();
        this.highlightEffect.fillGradientStyle(
            0xffffff, 0xffffff, 0xffffff, 0xffffff,
            0.1, 0.05, 0.05, 0.1
        );
        this.highlightEffect.fillRect(startX, startY, gridWidth, gridHeight);
        
        // Set a lower depth to ensure it doesn't interfere with interactions
        this.highlightEffect.setDepth(-1);
        
        // Add a pulsing animation to the highlight
        this.scene.tweens.add({
            targets: this.highlightEffect,
            alpha: { from: 0.5, to: 0.2 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    // Check if a pointer is over the grid
    isPointerOverGrid(pointer) {
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        return (
            pointer.x >= startX && 
            pointer.x <= startX + gridWidth && 
            pointer.y >= startY && 
            pointer.y <= startY + gridHeight
        );
    }
    
    update() {
        // Update all machines
        this.machines.forEach(machine => machine.update());
        
        // Redraw grid
        this.drawGrid();
    }
    
    // Convert world coordinates to grid coordinates
    worldToGrid(worldX, worldY) {
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        const gridX = Math.floor((worldX - startX) / this.cellSize);
        const gridY = Math.floor((worldY - startY) / this.cellSize);
        
        return { x: gridX, y: gridY };
    }
    
    // Convert grid coordinates to world coordinates
    gridToWorld(gridX, gridY) {
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        // Return the top-left corner of the grid cell instead of the center
        const worldX = startX + gridX * this.cellSize;
        const worldY = startY + gridY * this.cellSize;
        
        return { x: worldX, y: worldY };
    }
    
    // Check if world coordinates are within grid bounds
    isInBounds(worldX, worldY) {
        const gridPos = this.worldToGrid(worldX, worldY);
        return gridPos.x >= 0 && gridPos.x < this.width && gridPos.y >= 0 && gridPos.y < this.height;
    }
    
    // Get cell at grid coordinates
    getCell(gridX, gridY) {
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return this.cells[gridY][gridX];
        }
        return null;
    }
    
    // Set cell at grid coordinates
    setCell(gridX, gridY, value) {
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            this.cells[gridY][gridX] = value;
        }
    }
    
    // Find an empty cell in the grid
    findEmptyCell() {
        // Try random positions first for better distribution
        for (let attempts = 0; attempts < 10; attempts++) {
            const x = Phaser.Math.Between(0, this.width - 1);
            const y = Phaser.Math.Between(0, this.height - 1);
            
            if (this.cells[y][x].type === 'empty') {
                return { x, y };
            }
        }
        
        // If random attempts fail, check systematically
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].type === 'empty') {
                    return { x, y };
                }
            }
        }
        
        return null; // No empty cells found
    }
    
    // Check if a machine can be placed at the given position
    canPlaceMachine(machineType, gridX, gridY, rotation) {
        const shape = this.getRotatedShape(machineType.shape, rotation);
        
        // Calculate the correct origin position based on the shape's center
        const originX = gridX - Math.floor(shape[0].length / 2);
        const originY = gridY - Math.floor(shape.length / 2);
        
        // For extractors, check if at least one cell overlaps with a resource node
        let overlapsResourceNode = false;
        const isExtractor = machineType.id === 'extractor';
        
        // Check each cell of the machine shape
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] === 1) {
                    const cellX = originX + x;
                    const cellY = originY + y;
                    
                    // Check if cell is within grid bounds
                    if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) {
                        return false;
                    }
                    
                    // Get the cell type
                    const cellType = this.cells[cellY][cellX].type;
                    
                    // For extractors, check if it overlaps with a resource node
                    if (isExtractor && cellType === 'node') {
                        overlapsResourceNode = true;
                    }
                    
                    // Check if cell is empty or (for extractors) a resource node
                    if (cellType !== 'empty' && !(isExtractor && cellType === 'node')) {
                        return false;
                    }
                }
            }
        }
        
        // For extractors, ensure at least one cell overlaps with a resource node
        if (isExtractor && !overlapsResourceNode) {
            return false;
        }
        
        return true;
    }
    
    // Place a machine on the grid
    placeMachine(machineOrType, gridX, gridY, rotationOrShape) {
        // Check if we're being called with a machine instance or a machine type
        const isMachineInstance = typeof machineOrType.type === 'object' || typeof machineOrType.id === 'string';
        
        let machine, shape;
        
        if (isMachineInstance) {
            // We were passed a machine instance
            machine = machineOrType;
            shape = rotationOrShape; // In this case, rotationOrShape is the shape
            
            // Set the machine's grid position
            machine.gridX = gridX;
            machine.gridY = gridY;
            
            // Update the machine's world position
            const worldPos = this.gridToWorld(gridX, gridY);
            machine.x = worldPos.x;
            machine.y = worldPos.y;
            
            console.log(`Grid.placeMachine: Placing existing machine at grid position (${gridX}, ${gridY}), world position (${worldPos.x}, ${worldPos.y})`);
        } else {
            // This code path should no longer be used - machines should be created by GameScene.placeMachine
            console.warn('Grid.placeMachine called with machine type instead of machine instance. This is deprecated.');
            return null;
        }
        
        // Check if this is an extractor machine
        const isExtractor = (isMachineInstance && 
            ((machine.type && machine.type.id === 'extractor') || // Old machine system
             (machine.id === 'extractor'))) || // New machine system
            (!isMachineInstance && machineOrType.id === 'extractor');
        
        console.log(`Grid.placeMachine: Machine is extractor: ${isExtractor}`);
        
        // Calculate the origin position based on the shape's center
        const originX = gridX - Math.floor(shape[0].length / 2);
        const originY = gridY - Math.floor(shape.length / 2);
        
        // Set the machine's rotation if it has one
        if (machine.rotation !== undefined) {
            // Ensure the direction is set based on rotation
            machine.direction = this.scene.getDirectionFromRotation(machine.rotation);
            console.log(`Grid.placeMachine: Set machine direction to ${machine.direction} with rotation ${machine.rotation}`);
            
            // Update direction indicator if it exists
            if (machine.directionIndicator) {
                this.scene.updateDirectionIndicator(machine, machine.direction);
            }
        }
        
        // Check for resource nodes before placing the machine
        if (isExtractor) {
            console.log(`Grid.placeMachine: Checking for resource nodes at extractor position (${gridX}, ${gridY})`);
            
            // Check the cell directly at the extractor's position
            const cell = this.getCell(gridX, gridY);
            if (cell && cell.type === 'node' && cell.object) {
                const resourceNode = cell.object;
                console.log(`Grid.placeMachine: Found resource node at (${gridX}, ${gridY}), type: ${resourceNode.resourceType.id}`);
                
                // Set the extractor's resourceNode property directly
                machine.resourceNode = resourceNode;
                machine.resourceType = resourceNode.resourceType;
                
                console.log(`Grid.placeMachine: Set extractor's resourceNode directly to node at (${gridX}, ${gridY})`);
            }
        }
        
        // Mark cells as occupied by the machine
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] === 1) {
                    const cellX = originX + x;
                    const cellY = originY + y;
                    
                    // Ensure we're within grid bounds
                    if (cellX >= 0 && cellX < this.width && cellY >= 0 && cellY < this.height) {
                        // If this is an extractor and the cell has a resource node, preserve the node info
                        const currentCell = this.cells[cellY][cellX];
                        let resourceNode = null;
                        
                        // Check if the current cell has a resource node
                        if (isExtractor && currentCell.type === 'node') {
                            resourceNode = currentCell.object;
                            console.log(`Grid.placeMachine: Found resource node at (${cellX}, ${cellY}) when placing extractor`);
                        }
                        
                        // Create the new cell data
                        this.cells[cellY][cellX] = {
                            type: 'machine',
                            machine: machine,
                            localX: x,
                            localY: y
                        };
                        
                        // If there was a resource node, store it in the cell data
                        if (resourceNode) {
                            this.cells[cellY][cellX].resourceNode = resourceNode;
                            console.log(`Grid.placeMachine: Preserved resource node in cell data at (${cellX}, ${cellY})`);
                            
                            // If this is an extractor, also set its resourceNode property directly
                            if (isExtractor && machine.id === 'extractor') {
                                machine.resourceNode = resourceNode;
                                machine.resourceType = resourceNode.resourceType;
                                console.log(`Grid.placeMachine: Set extractor's resourceNode directly to node at (${cellX}, ${cellY})`);
                                
                                // Make sure the resource type is in the extractor's output types
                                if (machine.outputTypes && !machine.outputTypes.includes(resourceNode.resourceType.id)) {
                                    machine.outputTypes.push(resourceNode.resourceType.id);
                                    machine.outputInventory[resourceNode.resourceType.id] = 0;
                                    console.log(`Grid.placeMachine: Added resource type ${resourceNode.resourceType.id} to extractor's output types`);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Add machine to the list if it's not already there
        if (!this.machines.includes(machine)) {
            this.machines.push(machine);
        }
        
        return machine;
    }
    
    // Get the shape of a machine rotated by a certain amount
    getRotatedShape(shape, rotation) {
        // Normalize rotation to 0-2π range
        const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        console.log(`Grid.getRotatedShape: Normalizing rotation ${rotation} to ${normalizedRotation}`);
        
        // Define epsilon for floating point comparison
        const epsilon = 0.1;  // Use a slightly larger epsilon for better tolerance
        
        // Check if rotation is close to 0, 90, 180, or 270 degrees
        // No rotation (0 degrees or close to 0)
        if (Math.abs(normalizedRotation) < epsilon || Math.abs(normalizedRotation - 2 * Math.PI) < epsilon) {
            console.log("Grid.getRotatedShape: No rotation (0 degrees/right)");
            return shape;
        }
        
        // 90 degrees (down)
        if (Math.abs(normalizedRotation - Math.PI / 2) < epsilon) {
            console.log("Grid.getRotatedShape: 90 degrees rotation (down)");
            return this.rotateShapeClockwise(shape);
        }
        
        // 180 degrees (left)
        if (Math.abs(normalizedRotation - Math.PI) < epsilon) {
            console.log("Grid.getRotatedShape: 180 degrees rotation (left)");
            return this.rotateShape180(shape);
        }
        
        // 270 degrees (up)
        if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < epsilon) {
            console.log("Grid.getRotatedShape: 270 degrees rotation (up)");
            return this.rotateShapeCounterClockwise(shape);
        }
        
        // Default: no rotation if not close to a cardinal direction
        console.log(`Grid.getRotatedShape: Rotation ${normalizedRotation} not close to a cardinal direction, using default`);
        return shape;
    }
    
    // Rotate a shape 90 degrees clockwise
    rotate90Degrees(shape) {
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let x = 0; x < width; x++) {
            rotated[x] = [];
            for (let y = 0; y < height; y++) {
                rotated[x][height - y - 1] = shape[y][x];
            }
        }
        
        return rotated;
    }
    
    // Rotate a shape 180 degrees
    rotateShape180(shape) {
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let y = 0; y < height; y++) {
            rotated[height - y - 1] = shape[y].slice().reverse();
        }
        
        return rotated;
    }
    
    // Rotate a shape counterclockwise
    rotateShapeCounterClockwise(shape) {
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let x = 0; x < width; x++) {
            rotated[width - x - 1] = shape.slice().reverse().map(row => row[x]);
        }
        
        return rotated;
    }
    
    // Rotate a shape clockwise
    rotateShapeClockwise(shape) {
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let x = 0; x < width; x++) {
            rotated[width - x - 1] = shape.slice().map(row => row[height - x - 1]);
        }
        
        return rotated;
    }
    
    // Remove a machine from the grid
    removeMachine(machine) {
        // Find and remove the machine from the list
        const index = this.machines.indexOf(machine);
        if (index !== -1) {
            this.machines.splice(index, 1);
        }
        
        // Clear cells occupied by the machine
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].type === 'machine' && this.cells[y][x].machine === machine) {
                    this.cells[y][x] = { type: 'empty' };
                }
            }
        }
        
        // Destroy the machine object
        machine.destroy();
    }
    
    // Remove a resource node from the grid
    removeResourceNode(node) {
        // Clear the cell occupied by the node
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].type === 'node' && this.cells[y][x].object === node) {
                    this.cells[y][x] = { type: 'empty' };
                }
            }
        }
    }
    
    // Get all machines in the grid
    getAllMachines() {
        const allMachines = [];
        
        // Iterate through all cells in the grid
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell && cell.machine && !allMachines.includes(cell.machine)) {
                    allMachines.push(cell.machine);
                }
            }
        }
        
        console.log(`[Grid] Found ${allMachines.length} unique machines in the grid`);
        return allMachines;
    }
} 