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
        
        // Factory reference (needs to be set later)
        this.factory = null;
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
        this.machines.forEach(machineObj => {
            if (machineObj.machine && typeof machineObj.machine.update === 'function') {
                machineObj.machine.update();
            }
        });
        
        // Redraw grid
        this.drawGrid();
    }
    
    // Check if world coordinates are within grid bounds
    isInBounds(worldX, worldY) {
        try {
            // Validate inputs
            if (worldX === undefined || worldY === undefined) {
                console.error(`[GRID] isInBounds called with invalid coordinates: (${worldX}, ${worldY})`);
                return false;
            }
            
            const gridWidth = this.width * this.cellSize;
            const gridHeight = this.height * this.cellSize;
            const startX = this.x - gridWidth / 2;
            const startY = this.y - gridHeight / 2;
            
            // Quick check using raw world coordinates
            if (worldX < startX || worldX >= startX + gridWidth || 
                worldY < startY || worldY >= startY + gridHeight) {
                return false;
            }
            
            // Convert to grid coordinates for a more precise check
            const gridPos = this.worldToGrid(worldX, worldY);
            return gridPos.x >= 0 && gridPos.x < this.width && gridPos.y >= 0 && gridPos.y < this.height;
        } catch (error) {
            console.error(`[GRID] Error in isInBounds:`, error);
            return false;
        }
    }
    
    /**
     * Convert world coordinates to grid coordinates
     * @param {number} worldX - X coordinate in world space
     * @param {number} worldY - Y coordinate in world space 
     * @returns {Object} Grid coordinates
     */
    worldToGrid(worldX, worldY) {
        try {
            // Validate inputs
            if (worldX === undefined || worldY === undefined) {
                return { x: undefined, y: undefined };
            }
            
            const gridWidth = this.width * this.cellSize;
            const gridHeight = this.height * this.cellSize;
            const startX = this.x - gridWidth / 2;
            const startY = this.y - gridHeight / 2;
            
            // Calculate grid coordinates
            let gridX = Math.floor((worldX - startX) / this.cellSize);
            let gridY = Math.floor((worldY - startY) / this.cellSize);
            
            // Add proper boundary checking to clamp values within grid range
            gridX = Math.max(0, Math.min(gridX, this.width - 1));
            gridY = Math.max(0, Math.min(gridY, this.height - 1));
            
            return { x: gridX, y: gridY };
        } catch (error) {
            return { x: undefined, y: undefined };
        }
    }
    
    /**
     * Convert grid coordinates to world coordinates
     * @param {number} gridX - X coordinate in grid space
     * @param {number} gridY - Y coordinate in grid space
     * @returns {Object} World coordinates (center of the cell)
     */
    gridToWorld(gridX, gridY) {
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        // Return the center of the grid cell (not the top-left corner)
        // Add half a cell size to x and y to get the center
        const worldX = startX + gridX * this.cellSize + (this.cellSize / 2);
        const worldY = startY + gridY * this.cellSize + (this.cellSize / 2);
        
        return { x: worldX, y: worldY };
    }
    
    // Get cell at grid coordinates
    getCell(gridX, gridY) {
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return this.cells[gridY][gridX];
        }
        return null;
    }
    
    // Get cell content at grid coordinates (used by canPlaceMachine)
    getCellContent(gridX, gridY) {
        const cell = this.getCell(gridX, gridY);
        if (!cell) {
            return null;
        }
        return cell.type === 'empty' ? null : cell;
    }
    
    // Set cell at grid coordinates
    setCell(gridX, gridY, value) {
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            this.cells[gridY][gridX] = value;
        }
    }
    
    // Find an empty cell in the grid
    findEmptyCell() {
        try {
            // Check if grid cells are initialized
            if (!this.cells || !Array.isArray(this.cells) || this.cells.length === 0) {
                console.error('[GRID] findEmptyCell: Grid cells not properly initialized');
                return null;
            }

            // Try random positions first for better distribution
            for (let attempts = 0; attempts < 10; attempts++) {
                const x = Phaser.Math.Between(0, this.width - 1);
                const y = Phaser.Math.Between(0, this.height - 1);
                
                if (this.cells[y] && this.cells[y][x] && this.cells[y][x].type === 'empty') {
                    console.log(`[GRID] findEmptyCell: Found empty cell at (${x}, ${y})`);
                    return { x, y };
                }
            }
            
            // If random attempts fail, check systematically
            for (let y = 0; y < this.height; y++) {
                if (this.cells[y]) {
                    for (let x = 0; x < this.width; x++) {
                        if (this.cells[y][x] && this.cells[y][x].type === 'empty') {
                            console.log(`[GRID] findEmptyCell: Found empty cell at (${x}, ${y}) (systematic search)`);
                            return { x, y };
                        }
                    }
                }
            }
            
            console.warn('[GRID] findEmptyCell: No empty cells found in grid');
            return null; // No empty cells found
        } catch (error) {
            console.error('[GRID] Error in findEmptyCell:', error);
            return null;
        }
    }
    
    /**
     * Sets the machine factory reference
     * @param {MachineFactory} factory - The machine factory
     */
    setFactory(factory) {
        console.log('[GRID] Setting factory reference');
        this.factory = factory;
    }
    
    /**
     * Checks if a machine can be placed at the given grid coordinates
     * @param {string|object} machineId - The ID of the machine to place or machine object
     * @param {number} gridX - The X coordinate on the grid
     * @param {number} gridY - The Y coordinate on the grid
     * @param {string} direction - The direction the machine is facing
     * @returns {boolean} Whether the machine can be placed
     */
    canPlaceMachine(machineId, gridX, gridY, direction) {
        console.log(`--------- PLACEMENT CHECK ---------`);
        console.log(`[GRID] canPlaceMachine checking: ${typeof machineId === 'object' ? machineId.id || 'unknown' : machineId} at (${gridX}, ${gridY}), direction: ${direction}`);
        
        if (!this.factory) {
            console.log(`[GRID] canPlaceMachine: Factory reference is missing, returning false`);
            return false;
        }

        // Handle both object and ID string
        const machineIdStr = typeof machineId === 'object' ? machineId.id || machineId.machineId || machineId.type : machineId;
        console.log(`[GRID] Using machine ID: ${machineIdStr}`);

        // Get the machine's shape from the factory
        const machineConfig = this.factory.getMachineTypeById(machineIdStr);
        if (!machineConfig || !machineConfig.shape) {
            console.log(`[GRID] canPlaceMachine: Invalid machine config for ${machineIdStr}, returning false`);
            return false;
        }

        // Get the shape with proper rotation
        const shape = this.getRotatedShape(machineConfig.shape, direction);
        console.log(`[GRID] canPlaceMachine: Final rotated shape for placement check: ${JSON.stringify(shape)}`);
        
        const shapeHeight = shape.length;
        const shapeWidth = shape[0].length;
        console.log(`[GRID] canPlaceMachine: Shape dimensions: ${shapeWidth}x${shapeHeight}`);

        // Calculate the "origin" based on the shape's center
        const originX = Math.floor(shapeWidth / 2);
        const originY = Math.floor(shapeHeight / 2);
        console.log(`[GRID] canPlaceMachine: Shape origin (center): (${originX}, ${originY})`);
        
        // Grid dimensions check
        console.log(`[GRID] canPlaceMachine: Grid dimensions: ${this.width}x${this.height}`);
        
        // Check each cell of the shape
        for (let y = 0; y < shapeHeight; y++) {
            for (let x = 0; x < shapeWidth; x++) {
                // Skip empty cells in the shape
                if (shape[y][x] !== 1) {
                    continue;
                }

                // Calculate the actual grid position for this cell
                const cellX = gridX + (x - originX);
                const cellY = gridY + (y - originY);
                console.log(`[GRID] Checking shape cell (${x},${y}) maps to grid cell (${cellX},${cellY})`);

                // Boundary check
                if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) {
                    console.log(`[GRID] FAIL: Cell (${cellX},${cellY}) is out of grid bounds`);
                    return false;
                }

                // Check if the cell is already occupied by another machine
                const cellContent = this.getCellContent(cellX, cellY);
                if (cellContent && cellContent.type === 'machine') {
                    console.log(`[GRID] FAIL: Cell (${cellX},${cellY}) is already occupied by machine: ${cellContent.id}`);
                    return false;
                }

                // Check if there's a resource node that can't be built on
                if (cellContent && cellContent.type === 'node' && !cellContent.canBuildOn) {
                    console.log(`[GRID] FAIL: Cell (${cellX},${cellY}) contains node that cannot be built on`);
                    return false;
                }
            }
        }

        console.log(`[GRID] SUCCESS: Machine ${machineIdStr} can be placed at (${gridX},${gridY})`);
        console.log(`---------------------------------`);
        return true;
    }
    
    /**
     * Places a machine on the grid
     * @param {object} machine - The machine to place
     * @param {number} gridX - The X coordinate on the grid
     * @param {number} gridY - The Y coordinate on the grid
     * @param {string} direction - The direction the machine is facing
     * @returns {boolean} Whether the machine was placed successfully
     */
    placeMachine(machine, gridX, gridY, direction) {
        console.log(`[GRID] Attempting to place ${machine.id} at (${gridX}, ${gridY}) with direction: ${direction}`);
        
        // Check if the machine can be placed
        const machineId = machine.machineType?.id || machine.id || machine.type;
        if (!this.canPlaceMachine(machineId, gridX, gridY, direction)) {
            console.log(`[GRID] Cannot place machine ${machine.id} at (${gridX}, ${gridY})`);
            return false;
        }
        
        // Get the shape with proper rotation
        const shape = this.getRotatedShape(machine.shape, direction);
        console.log(`[GRID] Placing machine with shape: ${JSON.stringify(shape)}`);
        
        // Calculate origin based on the center of the shape
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const originX = Math.floor(shapeWidth / 2);
        const originY = Math.floor(shapeHeight / 2);
        
        // Register the machine on the grid
        this.machines.push({
            machine: machine,
            gridX: gridX,
            gridY: gridY,
            direction: direction
        });
        
        // Mark cells as occupied by this machine
        for (let y = 0; y < shapeHeight; y++) {
            for (let x = 0; x < shapeWidth; x++) {
                if (shape[y][x] === 1) {
                    const cellX = gridX + (x - originX);
                    const cellY = gridY + (y - originY);
                    console.log(`[GRID] Occupying cell (${cellX}, ${cellY}) with machine ${machine.id}`);
                    
                    const cell = this.getCell(cellX, cellY);
                    if (cell) {
                        // Update the cell with machine data
                        cell.type = 'machine';  // Set the cell type to 'machine'
                        cell.machine = machine; // Store a reference to the machine
                        cell.occupiedBy = {
                            type: 'machine',
                            id: machine.id,
                            machineLocalX: x,
                            machineLocalY: y
                        };
                    } else {
                        console.log(`[GRID] Warning: Cell (${cellX}, ${cellY}) does not exist`);
                    }
                }
            }
        }
        
        console.log(`[GRID] Successfully placed machine ${machine.id} at (${gridX}, ${gridY})`);
        return true;
    }
    
    /**
     * Returns a shape with the appropriate rotation
     * @param {Array<Array<number>>|string} shape - The shape to rotate, or a JSON string representation
     * @param {string|number} direction - The direction to rotate to (string) or rotation in degrees (number)
     * @returns {Array<Array<number>>} The rotated shape
     */
    getRotatedShape(shape, direction) {
        // Handle undefined shape
        if (!shape) {
            console.log("[GRID] getRotatedShape: Shape is undefined, using default 1x1");
            return [[1]];
        }
        
        // Parse the shape if it's a string
        let parsedShape = shape;
        if (typeof shape === 'string') {
            try {
                parsedShape = JSON.parse(shape);
                console.log(`[GRID] Parsed shape from string: ${JSON.stringify(parsedShape)}`);
            } catch (error) {
                console.log(`[GRID] Error parsing shape string, using default 1x1`);
                return [[1]];
            }
        }
        
        // For debugging, log the initial shape
        console.log(`[GRID] Original shape: ${JSON.stringify(parsedShape)}`);
        
        // Handle numeric rotation values (degrees)
        if (typeof direction === 'number') {
            const normalizedRotation = ((direction % 360) + 360) % 360; // Normalize to 0-359
            console.log(`[GRID] Numeric rotation: ${direction} normalized to ${normalizedRotation} degrees`);
            
            // Convert rotation to direction string
            let directionStr = 'right'; // Default
            if (normalizedRotation === 0) {
                directionStr = 'right';
            } else if (normalizedRotation === 90) {
                directionStr = 'down';
            } else if (normalizedRotation === 180) {
                directionStr = 'left';
            } else if (normalizedRotation === 270) {
                directionStr = 'up';
            } else {
                console.log(`[GRID] Non-standard rotation value: ${normalizedRotation}, finding nearest cardinal direction`);
                // Find closest cardinal direction
                if (normalizedRotation > 315 || normalizedRotation <= 45) {
                    directionStr = 'right';
                } else if (normalizedRotation > 45 && normalizedRotation <= 135) {
                    directionStr = 'down';
                } else if (normalizedRotation > 135 && normalizedRotation <= 225) {
                    directionStr = 'left';
                } else {
                    directionStr = 'up';
                }
            }
            console.log(`[GRID] Numeric rotation ${normalizedRotation}° converted to direction: "${directionStr}"`);
            direction = directionStr;
        }
        
        // Normalize string direction
        const normalizedDirection = typeof direction === 'string' ? direction.toLowerCase() : 'right';
        console.log(`[GRID] Using normalized direction: "${normalizedDirection}"`);
        
        // No rotation needed for right direction
        if (normalizedDirection === 'right') {
            console.log(`[GRID] No rotation needed for "right" direction`);
            return parsedShape;
        }
        
        let resultShape;
        // Handle different rotations based on direction
        if (normalizedDirection === 'down') {
            resultShape = this.rotateShapeClockwise(parsedShape);
            console.log(`[GRID] Rotated shape 90° for "down", result: ${JSON.stringify(resultShape)}`);
            return resultShape;
        } else if (normalizedDirection === 'left') {
            resultShape = this.rotateShapeClockwise(this.rotateShapeClockwise(parsedShape));
            console.log(`[GRID] Rotated shape 180° for "left", result: ${JSON.stringify(resultShape)}`);
            return resultShape;
        } else if (normalizedDirection === 'up') {
            resultShape = this.rotateShapeClockwise(this.rotateShapeClockwise(this.rotateShapeClockwise(parsedShape)));
            console.log(`[GRID] Rotated shape 270° for "up", result: ${JSON.stringify(resultShape)}`);
            return resultShape;
        }
        
        // Default to original shape if direction is unrecognized
        console.log(`[GRID] Unrecognized direction: ${normalizedDirection}, using original shape`);
        return parsedShape;
    }
    
    /**
     * Rotates a shape 90 degrees clockwise
     * @param {Array<Array<number>>} shape - The shape to rotate
     * @returns {Array<Array<number>>} The rotated shape
     */
    rotateShapeClockwise(shape) {
        console.log(`[GRID] rotateShapeClockwise - Input shape: ${JSON.stringify(shape)}`);
        
        if (!shape || !Array.isArray(shape) || shape.length === 0) {
            console.log(`[GRID] rotateShapeClockwise - Invalid shape, returning default 1x1`);
            return [[1]];
        }
        
        const width = shape[0].length;
        const height = shape.length;
        console.log(`[GRID] rotateShapeClockwise - Original dimensions: ${width}x${height}`);
        
        // Create a new matrix with flipped dimensions
        const rotated = Array(width).fill().map(() => Array(height).fill(0));
        
        // Perform rotation: (row, col) -> (col, height - 1 - row)
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                rotated[col][height - 1 - row] = shape[row][col];
            }
        }
        
        console.log(`[GRID] rotateShapeClockwise - Output shape: ${JSON.stringify(rotated)}`);
        console.log(`[GRID] rotateShapeClockwise - New dimensions: ${rotated[0].length}x${rotated.length}`);
        
        return rotated;
    }
    
    // Rotate a shape 180 degrees
    rotateShape180(shape) {
        if (!shape || shape.length === 0) return shape;
        
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let i = 0; i < height; i++) {
            rotated[i] = [];
            for (let j = 0; j < width; j++) {
                rotated[i][j] = shape[height - 1 - i][width - 1 - j];
            }
        }
        
        console.log("Rotated 180 degrees (left):");
        rotated.forEach(row => console.log(row.join(' ')));
        return rotated;
    }
    
    // Rotate a shape 270 degrees clockwise (or 90 counterclockwise)
    rotate270Degrees(shape) {
        if (!shape || shape.length === 0) return shape;
        
        const height = shape.length;
        const width = shape[0].length;
        const rotated = [];
        
        for (let i = 0; i < width; i++) {
            rotated[i] = [];
            for (let j = 0; j < height; j++) {
                rotated[i][j] = shape[j][width - 1 - i];
            }
        }
        
        console.log("Rotated 270 degrees (up):");
        rotated.forEach(row => console.log(row.join(' ')));
        return rotated;
    }
    
    // These original methods were causing issues, keep them for compatibility but use the newer methods
    rotateShapeCounterClockwise(shape) {
        return this.rotate270Degrees(shape);
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
    
    /**
     * Marks grid cells as occupied by a machine
     * @param {number} gridX - The x coordinate on the grid
     * @param {number} gridY - The y coordinate on the grid
     * @param {Array<Array<number>>} shape - The shape of the machine
     * @param {Machine} machine - The machine instance
     */
    markGridCellsOccupied(gridX, gridY, shape, machine) {
        try {
            if (!shape || !Array.isArray(shape) || shape.length === 0 || !machine) {
                return;
            }
            
            // Calculate the origin position based on the shape's center
            const originX = gridX - Math.floor(shape[0].length / 2);
            const originY = gridY - Math.floor(shape.length / 2);
            
            let markedCells = 0;
            
            // Mark cells as occupied by the machine
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] === 1) {
                        const cellX = originX + x;
                        const cellY = originY + y;
                        
                        // Ensure we're within grid bounds
                        if (cellX >= 0 && cellX < this.width && cellY >= 0 && cellY < this.height) {
                            // Preserve resource node information for extractors
                            let resourceNode = null;
                            const currentCell = this.cells[cellY][cellX];
                            
                            // Check if current cell has a resource node
                            if (currentCell.type === 'node') {
                                resourceNode = currentCell.object;
                            }
                            
                            // Create the new cell data
                            this.cells[cellY][cellX] = {
                                type: 'machine',
                                machine: machine,
                                localX: x,
                                localY: y
                            };
                            
                            markedCells++;
                            
                            // If there was a resource node, store it in the cell data
                            if (resourceNode) {
                                this.cells[cellY][cellX].resourceNode = resourceNode;
                            }
                        }
                    }
                }
            }
            
            // Add machine to the list if it's not already there
            if (!this.machines.includes(machine)) {
                this.machines.push(machine);
            }
        } catch (error) {
            throw error; // Rethrow to allow caller to handle cleanup
        }
    }
    
    /**
     * Clears a machine from the grid
     * @param {Machine} machine - The machine to clear
     */
    clearMachineFromGrid(machine) {
        try {
            if (!machine) {
                console.warn('[GRID] clearMachineFromGrid called with undefined machine');
                return;
            }
            
            let cellsCleared = 0;
            
            // Remove machine from cells
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.cells[y][x];
                    if (cell && cell.type === 'machine' && cell.machine === machine) {
                        // Restore to empty cell
                        this.cells[y][x] = { type: 'empty' };
                        cellsCleared++;
                    }
                }
            }
            
            // Remove from machines list
            const index = this.machines.indexOf(machine);
            if (index !== -1) {
                this.machines.splice(index, 1);
                console.log(`[GRID] Removed machine from grid's machines list, remaining: ${this.machines.length}`);
            }
            
            console.log(`[GRID] Cleared ${cellsCleared} cells for machine ${machine.id || 'unknown'}`);
        } catch (error) {
            console.error('[GRID] Error in clearMachineFromGrid:', error);
        }
    }
    
    /**
     * Sets up an extractor on a resource node
     * @param {Machine} machine - The extractor machine
     * @param {number} gridX - The x coordinate on the grid
     * @param {number} gridY - The y coordinate on the grid
     */
    placeExtractor(machine, gridX, gridY) {
        try {
            if (!machine) {
                console.warn('[GRID] placeExtractor called with undefined machine');
                return;
            }
            
            const isExtractor = machine.type === 'extractor' || 
                                (machine.machineType && machine.machineType.id === 'extractor');
            
            if (!isExtractor) {
                console.warn('[GRID] placeExtractor called with non-extractor machine');
                return;
            }
            
            // Check for resource nodes under the machine
            const shape = machine.shape;
            if (!shape || !Array.isArray(shape)) {
                console.error('[GRID] Extractor missing valid shape');
                return;
            }
            
            // Calculate the origin position based on the shape's center
            const originX = gridX - Math.floor(shape[0].length / 2);
            const originY = gridY - Math.floor(shape.length / 2);
            
            let foundResourceNode = null;
            
            // Check each cell occupied by the machine
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] === 1) {
                        const cellX = originX + x;
                        const cellY = originY + y;
                        
                        // Check if we're within grid bounds
                        if (cellX >= 0 && cellX < this.width && cellY >= 0 && cellY < this.height) {
                            // Check the cell for a resource node
                            const cell = this.cells[cellY][cellX];
                            
                            if (cell.type === 'node' && cell.object) {
                                foundResourceNode = cell.object;
                                break;
                            } else if (cell.type === 'machine' && cell.resourceNode) {
                                foundResourceNode = cell.resourceNode;
                                break;
                            }
                        }
                    }
                }
                if (foundResourceNode) break;
            }
            
            // Connect the extractor to the resource node if found
            if (foundResourceNode) {
                machine.resourceNode = foundResourceNode;
                machine.resourceType = foundResourceNode.resourceType;
                
                // Initialize output inventory for this resource type
                if (!machine.outputInventory) {
                    machine.outputInventory = {};
                }
                
                if (!machine.outputTypes) {
                    machine.outputTypes = [];
                }
                
                // Make sure the resource type is in the output types
                if (!machine.outputTypes.includes(foundResourceNode.resourceType.id)) {
                    machine.outputTypes.push(foundResourceNode.resourceType.id);
                    machine.outputInventory[foundResourceNode.resourceType.id] = 0;
                }
            } else {
                console.warn(`[GRID] No resource node found for extractor at (${gridX}, ${gridY})`);
            }
        } catch (error) {
            console.error('[GRID] Error in placeExtractor:', error);
        }
    }
} 