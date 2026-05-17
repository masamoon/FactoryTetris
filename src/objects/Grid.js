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
        if (cell && cell.type === 'machine') {
          // Machine cells are drawn by the machine objects
        } else if (cell && cell.type === 'node') {
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
      0xffffff,
      0xffffff,
      0xffffff,
      0xffffff,
      0.1,
      0.05,
      0.05,
      0.1
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
      ease: 'Sine.easeInOut',
    });
  }

  // Check if a pointer is over the grid
  isPointerOverGrid(pointer) {
    const gridWidth = this.width * this.cellSize;
    const gridHeight = this.height * this.cellSize;
    const startX = this.x - gridWidth / 2;
    const startY = this.y - gridHeight / 2;

    // Use world coordinates since the grid is positioned in world space
    const worldX = pointer.worldX !== undefined ? pointer.worldX : pointer.x;
    const worldY = pointer.worldY !== undefined ? pointer.worldY : pointer.y;

    return (
      worldX >= startX &&
      worldX <= startX + gridWidth &&
      worldY >= startY &&
      worldY <= startY + gridHeight
    );
  }

  update(time, delta) {
    // Update all machines
    this.machines.forEach((machineObj) => {
      if (machineObj.machine && typeof machineObj.machine.update === 'function') {
        machineObj.machine.update(time, delta);
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
        console.warn(`[Grid.isInBounds] Received invalid coordinates: (${worldX}, ${worldY})`);
        return false;
      }

      const gridWidth = this.width * this.cellSize;
      const gridHeight = this.height * this.cellSize;
      const startX = this.x - gridWidth / 2;
      const startY = this.y - gridHeight / 2;
      const endX = startX + gridWidth;
      const endY = startY + gridHeight;

      // Log the check
      console.log(
        `[Grid.isInBounds] Checking point (${worldX.toFixed(1)}, ${worldY.toFixed(1)}). Bounds: X[${startX.toFixed(1)} to ${endX.toFixed(1)}], Y[${startY.toFixed(1)} to ${endY.toFixed(1)}]`
      );

      // Check using raw world coordinates
      const isWithin = worldX >= startX && worldX < endX && worldY >= startY && worldY < endY;
      console.log(`[Grid.isInBounds] Result: ${isWithin}`);

      return isWithin; // Return the direct check result

      /* // Old logic with redundant worldToGrid check removed
            // Quick check using raw world coordinates
            if (worldX < startX || worldX >= startX + gridWidth || 
                worldY < startY || worldY >= startY + gridHeight) {
                return false;
            }
            
            // Convert to grid coordinates for a more precise check
            const gridPos = this.worldToGrid(worldX, worldY);
            return gridPos.x >= 0 && gridPos.x < this.width && gridPos.y >= 0 && gridPos.y < this.height;
            */
    } catch (_error) {
      console.error('[Grid.isInBounds] Error:', _error);
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
    const debugGridConv = false; // <-- Disable logs
    try {
      // Validate inputs
      if (worldX === undefined || worldY === undefined) {
        if (debugGridConv) console.error(`[worldToGrid] Invalid input: (${worldX}, ${worldY})`);
        return { x: undefined, y: undefined };
      }

      const gridWidth = this.width * this.cellSize;
      const gridHeight = this.height * this.cellSize;
      const startX = this.x - gridWidth / 2;
      const startY = this.y - gridHeight / 2;
      if (debugGridConv) {
        console.log(
          `[worldToGrid] Input: worldX=${worldX.toFixed(2)}, worldY=${worldY.toFixed(2)}`
        );
        console.log(
          `           Grid Start: startX=${startX.toFixed(2)}, startY=${startY.toFixed(2)}, CellSize=${this.cellSize}`
        );
      }

      // Calculate grid coordinates
      let gridX = Math.floor((worldX - startX) / this.cellSize);
      let gridY = Math.floor((worldY - startY) / this.cellSize);
      if (debugGridConv) {
        console.log(`[worldToGrid] Calculated Raw: gridX=${gridX}, gridY=${gridY}`);
      }

      // Add proper boundary checking to clamp values within grid range
      gridX = Math.max(0, Math.min(gridX, this.width - 1));
      gridY = Math.max(0, Math.min(gridY, this.height - 1));
      if (debugGridConv) {
        console.log(`           Clamped Result: gridX=${gridX}, gridY=${gridY}`);
      }

      return { x: gridX, y: gridY };
    } catch (_error) {
      if (debugGridConv) console.error('[worldToGrid] Error:', _error);
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
    const worldX = startX + gridX * this.cellSize + this.cellSize / 2;
    const worldY = startY + gridY * this.cellSize + this.cellSize / 2;

    return { x: worldX, y: worldY };
  }

  /**
   * Convert grid coordinates to world coordinates (top-left corner of the cell).
   * @param {number} gridX - X coordinate on the grid.
   * @param {number} gridY - Y coordinate on the grid.
   * @returns {object} World coordinates {x, y} or null if outside grid.
   */
  gridToWorldTopLeft(gridX, gridY) {
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return null; // Coordinates are outside the grid
    }

    // Calculate the grid's top-left corner in world coordinates
    const gridWorldWidth = this.width * this.cellSize;
    const gridWorldHeight = this.height * this.cellSize;
    const startX = this.x - gridWorldWidth / 2; // Grid top-left X
    const startY = this.y - gridWorldHeight / 2; // Grid top-left Y

    // Calculate the top-left of the specific cell
    const worldX = startX + gridX * this.cellSize;
    const worldY = startY + gridY * this.cellSize;
    return { x: worldX, y: worldY };
  }

  // Get cell at grid coordinates
  getCell(gridX, gridY) {
    // Make sure coordinates are valid numbers first
    const x = Number(gridX);
    const y = Number(gridY);

    // Check if coordinates are valid numbers
    if (isNaN(x) || isNaN(y)) {
      return null;
    }

    // Check grid bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    // Make sure the cells array and the row exist before accessing
    if (!this.cells || !Array.isArray(this.cells) || !this.cells[y]) {
      return null;
    }

    return this.cells[y][x];
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
        return null;
      }

      // Try random positions first for better distribution
      for (let attempts = 0; attempts < 10; attempts++) {
        const x = Phaser.Math.Between(0, this.width - 1);
        const y = Phaser.Math.Between(0, this.height - 1);

        if (this.cells[y] && this.cells[y][x] && this.cells[y][x].type === 'empty') {
          return { x, y };
        }
      }

      // If random attempts fail, check systematically
      for (let y = 0; y < this.height; y++) {
        if (this.cells[y]) {
          for (let x = 0; x < this.width; x++) {
            if (this.cells[y][x] && this.cells[y][x].type === 'empty') {
              return { x, y };
            }
          }
        }
      }

      return null; // No empty cells found
    } catch (_error) {
      return null;
    }
  }

  /**
   * Find an empty cell in a specific column of the grid
   * @param {number} column - The column index to search in
   * @returns {Object|null} The grid coordinates {x, y} or null if no empty cell found
   */
  findEmptyCellInColumn(column) {
    try {
      // Validate column is within grid bounds
      if (column < 0 || column >= this.width) {
        console.warn(`[Grid.findEmptyCellInColumn] Invalid column: ${column}`);
        return null;
      }

      // Check if grid cells are initialized
      if (!this.cells || !Array.isArray(this.cells) || this.cells.length === 0) {
        return null;
      }

      // Collect all empty cells in the specified column
      const emptyCells = [];
      for (let y = 0; y < this.height; y++) {
        if (this.cells[y] && this.cells[y][column] && this.cells[y][column].type === 'empty') {
          emptyCells.push({ x: column, y });
        }
      }

      // If no empty cells found in this column, return null
      if (emptyCells.length === 0) {
        return null;
      }

      // Return a random empty cell from the column
      const randomIndex = Phaser.Math.Between(0, emptyCells.length - 1);
      return emptyCells[randomIndex];
    } catch (_error) {
      return null;
    }
  }

  /**
   * Sets the machine factory reference
   * @param {MachineFactory} factory - The machine factory
   */
  setFactory(factory) {
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
    // Ensure gridX and gridY are valid numbers
    if (
      gridX === undefined ||
      gridY === undefined ||
      isNaN(Number(gridX)) ||
      isNaN(Number(gridY))
    ) {
      return false;
    }

    // Check if coordinates are within grid bounds
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return false;
    }

    // Check if we have a valid factory reference
    if (!this.factory) {
      return false;
    }

    // Handle both machine ID string and machine type object
    let machineType;

    if (typeof machineId === 'object') {
      machineType = machineId;
    } else {
      machineType = this.factory.getMachineTypeById(machineId);
    }

    // Check if we have a valid machine config
    if (!machineType || !machineType.shape) {
      return false;
    }

    // Get the original non-rotated shape
    const originalShape = machineType.shape;

    // Get the rotated shape
    const shape = this.getRotatedShape(originalShape, direction);

    // Validate shape has valid dimensions
    if (
      !Array.isArray(shape) ||
      shape.length === 0 ||
      !Array.isArray(shape[0]) ||
      shape[0].length === 0
    ) {
      return false;
    }

    // Get shape dimensions after rotation
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;

    // *** ADDED Top-left anchor coordinates ***
    const baseX = gridX;
    const baseY = gridY;

    // Flag to track if we found at least one resource node (for extractors)
    // let foundResourceNode = false;

    // Check each cell in the shape
    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        // Only check cells with value 1 (occupied by the machine)
        if (shape[y][x] === 1) {
          // Calculate grid coordinates for this shape cell
          // *** MODIFIED: Using top-left anchor logic ***
          const cellX = baseX + x;
          const cellY = baseY + y;

          // Check if cell is within grid bounds before checking content
          if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) {
            return false;
          }

          // Check if cell is already occupied - using try/catch to prevent errors
          try {
            const cell = this.getCell(cellX, cellY);

            // Don't allow conveyors on nodes anymore (removing this exception)

            // Check if cell is occupied by anything other than 'empty'
            if (cell && cell.type !== 'empty') {
              return false;
            }
          } catch (_error) {
            return false;
          }
        }
      }
    }

    // For extractors, require at least one resource node to be found
    /* if (isExtractor && !foundResourceNode) {
            return false;
        } */

    // If we've reached here, all cells are valid for placement
    return true;
  }

  /**
   * Helper method to convert rotation in degrees to a direction string
   * @param {number} degrees - The rotation in degrees
   * @returns {string} The direction as a string ('right', 'down', 'left', 'up')
   */
  convertDegreesToDirection(degrees) {
    if (typeof degrees !== 'number') {
      return 'right'; // Default
    }

    const normalizedRotation = ((degrees % 360) + 360) % 360; // Normalize to 0-359

    if (normalizedRotation >= 315 || normalizedRotation < 45) {
      return 'right';
    } else if (normalizedRotation >= 45 && normalizedRotation < 135) {
      return 'down';
    } else if (normalizedRotation >= 135 && normalizedRotation < 225) {
      return 'left';
    } else {
      // 225 to 315
      return 'up';
    }
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
    // Validate input parameters
    if (!machine) {
      return false;
    }

    // Ensure gridX and gridY are valid numbers
    if (
      gridX === undefined ||
      gridY === undefined ||
      isNaN(Number(gridX)) ||
      isNaN(Number(gridY))
    ) {
      return false;
    }

    // Check if coordinates are within grid bounds
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return false;
    }

    try {
      // Check if the machine can be placed
      const machineId = machine.machineType?.id || machine.id || machine.type;
      if (!this.canPlaceMachine(machineId, gridX, gridY, direction)) {
        return false;
      }

      // *** ALWAYS get the rotated shape based on the placement direction argument ***
      const shape = this.getRotatedShape(machine.shape, direction);

      // Validate shape has valid dimensions
      if (
        !Array.isArray(shape) ||
        shape.length === 0 ||
        !Array.isArray(shape[0]) ||
        shape[0].length === 0
      ) {
        return false;
      }

      // Get the dimensions of the rotated shape
      const shapeWidth = shape[0].length;
      const shapeHeight = shape.length;

      // *** ADDED Top-left anchor coordinates ***
      const baseX = gridX;
      const baseY = gridY;

      // Register the machine on the grid
      this.machines.push({
        machine: machine,
        gridX: gridX,
        gridY: gridY,
        direction: direction,
      });

      // Mark cells as occupied by this machine
      for (let y = 0; y < shapeHeight; y++) {
        for (let x = 0; x < shapeWidth; x++) {
          if (shape[y][x] === 1) {
            // Calculate grid coordinates for this shape cell
            // *** MODIFIED: Using top-left anchor logic ***
            const cellX = baseX + x;
            const cellY = baseY + y;

            // Verify cell is within grid bounds before accessing
            if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) {
              continue;
            }

            const cell = this.getCell(cellX, cellY);
            if (cell) {
              // Update the cell with machine data
              cell.type = 'machine'; // Set the cell type to 'machine'
              cell.object = machine; // *** ADD THIS LINE: Store a direct reference to the machine object ***
              cell.machine = machine; // Compatibility with older flow code that checks cell.machine

              // *** ADDED LOGGING ***
              // console.log(`[Grid.placeMachine] Marked cell (${cellX}, ${cellY}) as 'machine' for ${machine.id}`);

              // You can keep occupiedBy if it's used elsewhere, but cell.object is key for the click detection
              cell.occupiedBy = {
                type: 'machine',
                id: machine.id,
                machineLocalX: x,
                machineLocalY: y,
              };
            }
          }
        }
      }

      // If this is an extractor, set up the connection to resource nodes
      /* if (machine.id === 'extractor') {
                this.placeExtractor(machine, gridX, gridY);
            } */

      return true;
    } catch (_error) {
      return false;
    }
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
      return [[1]];
    }

    // Parse the shape if it's a string
    let parsedShape = shape;
    if (typeof shape === 'string') {
      try {
        parsedShape = JSON.parse(shape);
      } catch (_error) {
        return [[1]];
      }
    }

    // Handle numeric rotation values. Most placement code stores radians, while
    // older callers sometimes pass degrees.
    if (typeof direction === 'number') {
      const rotationDegrees =
        Math.abs(direction) <= Math.PI * 2 + 0.01 ? (direction * 180) / Math.PI : direction;
      const normalizedRotation = ((rotationDegrees % 360) + 360) % 360; // Normalize to 0-359

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
      direction = directionStr;
    }

    // Normalize string direction
    const normalizedDirection = typeof direction === 'string' ? direction.toLowerCase() : 'right';

    // No rotation needed for right direction
    if (normalizedDirection === 'right') {
      return parsedShape;
    }

    let resultShape;
    // Handle different rotations based on direction
    if (normalizedDirection === 'down') {
      resultShape = this.rotateShapeClockwise(parsedShape);
      return resultShape;
    } else if (normalizedDirection === 'left') {
      resultShape = this.rotateShapeClockwise(this.rotateShapeClockwise(parsedShape));
      return resultShape;
    } else if (normalizedDirection === 'up') {
      resultShape = this.rotateShapeClockwise(
        this.rotateShapeClockwise(this.rotateShapeClockwise(parsedShape))
      );
      return resultShape;
    }

    // Default to original shape if direction is unrecognized
    return parsedShape;
  }

  /**
   * Rotates a shape 90 degrees clockwise
   * @param {Array<Array<number>>} shape - The shape to rotate
   * @returns {Array<Array<number>>} The rotated shape
   */
  rotateShapeClockwise(shape) {
    if (!shape || !Array.isArray(shape) || shape.length === 0) {
      return [[1]];
    }

    const height = shape.length;
    const width = shape[0].length;

    // Create a new matrix with flipped dimensions (width becomes height, height becomes width)
    const rotated = Array(width)
      .fill()
      .map(() => Array(height).fill(0));

    // Perform rotation: (row, col) -> (col, height - 1 - row)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const newRow = col;
        const newCol = height - 1 - row;
        rotated[newRow][newCol] = shape[row][col];
      }
    }

    return rotated;
  }

  // Remove a machine from the grid
  removeMachine(machineInstanceToRemove) {
    if (!machineInstanceToRemove) return;

    // Find and remove the machine from the internal tracking array
    // this.machines stores objects like { machine: machineInstance, gridX, ... }
    const machineEntryIndex = this.machines.findIndex(
      (entry) => entry.machine === machineInstanceToRemove
    );

    if (machineEntryIndex !== -1) {
      this.machines.splice(machineEntryIndex, 1);
      console.log(
        `[Grid.removeMachine] Removed ${machineInstanceToRemove.id} from internal machines array.`
      );
    } else {
      // Potentially already removed by another process (e.g. GameScene logic)
      // No need to warn as it's a common double-call scenario during destruction
      console.log(
        `[Grid.removeMachine] ${machineInstanceToRemove.id} was already removed or not found in tracking array.`
      );
    }

    // Clear cells occupied by the machine
    // Iterate through all cells and check if the cell's object is the machine to remove
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        // Check if the cell is of type 'machine' AND if its 'object' property matches the machine to remove
        if (cell && cell.type === 'machine' && cell.object === machineInstanceToRemove) {
          this.cells[y][x] = { type: 'empty' }; // Reset the cell to empty
          // console.log(`[Grid.removeMachine] Cleared cell (${x}, ${y}) that was occupied by ${machineInstanceToRemove.id}`);
        }
      }
    }

    // The GameScene's deleteConveyorOnClick method should handle destroying the machine object itself.
    // So, we should NOT call machineInstanceToRemove.destroy() here in Grid.js
    // to avoid potential double-destruction or errors if destroy() is called on an already destroyed object.
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

  // Remove a delivery node from the grid
  removeDeliveryNode(node) {
    // Clear the cell occupied by the node
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Check for the specific type 'delivery-node'
        if (this.cells[y][x].type === 'delivery-node' && this.cells[y][x].object === node) {
          this.cells[y][x] = { type: 'empty' };
          // Assuming a node only occupies one cell
          return;
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
    if (!shape || !Array.isArray(shape) || shape.length === 0 || !machine) {
      return;
    }

    // Get the dimensions of the shape
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;

    // Calculate center point for the shape (using top-left as anchor to match other methods)
    const baseX = gridX;
    const baseY = gridY;

    // Mark cells as occupied by the machine
    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (shape[y][x] === 1) {
          // Calculate grid coordinates for this shape cell
          const cellX = baseX + x;
          const cellY = baseY + y;

          // Ensure we're within grid bounds
          if (cellX >= 0 && cellX < this.width && cellY >= 0 && cellY < this.height) {
            // Create the new cell data
            this.cells[cellY][cellX] = {
              type: 'machine',
              object: machine, // Consistent with placeMachine
              localX: x,
              localY: y,
            };
          }
        }
      }
    }

    // Add machine to the list if it's not already there
    // Note: this.machines stores {machine, gridX, gridY, direction} in placeMachine,
    // but here it seems to want just the machine instance.
    // However, placeMachine already pushes to this.machines.
    // Let's check if we should keep this consistency.
    const machineExists = this.machines.some((m) => (m.machine || m) === machine);
    if (!machineExists) {
      this.machines.push(machine);
    }
  }

  /**
   * Clears a machine from the grid
   * @param {Machine} machine - The machine to clear
   */
  clearMachineFromGrid(machine) {
    try {
      if (!machine) {
        return;
      }

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const cell = this.cells[y][x];
          if (
            cell &&
            cell.type === 'machine' &&
            (cell.object === machine || cell.machine === machine)
          ) {
            // Restore to empty cell
            this.cells[y][x] = { type: 'empty' };
          }
        }
      }

      // Remove from machines list
      const index = this.machines.indexOf(machine);
      if (index !== -1) {
        this.machines.splice(index, 1);
      }
    } catch {
      // Error handling - ignore
    }
  }

  /**
   * Sets up an extractor on a resource node
   * @param {Machine} machine - The extractor machine
   * @param {number} gridX - The x coordinate on the grid
   * @param {number} gridY - The y coordinate on the grid
   */
  /* placeExtractor(machine, gridX, gridY) {
       // ... entire method commented out ...
    } */

  /**
   * Resizes the grid to new dimensions
   * @param {number} newWidth - The new width in cells
   * @param {number} newHeight - The new height in cells
   */
  resize(newWidth, newHeight) {
    if (newWidth <= 0 || newHeight <= 0) {
      console.error(`[Grid.resize] Invalid dimensions: ${newWidth}x${newHeight}`);
      return false;
    }

    console.log(
      `[Grid.resize] Resizing grid from ${this.width}x${this.height} to ${newWidth}x${newHeight}`
    );

    // Store current dimensions
    const oldWidth = this.width;
    const oldHeight = this.height;

    // Update dimensions
    this.width = newWidth;
    this.height = newHeight;

    // Update grid center position (this.x, this.y) so that the Top-Left corner remains constant
    // Original Top-Left: startX = oldX - (oldW * cell) / 2
    // New Top-Left: startX = newX - (newW * cell) / 2
    // We want new Top-Left == Original Top-Left
    // newX - (newW * cell) / 2 = oldX - (oldW * cell) / 2
    // newX = oldX + (newW - oldW) * cell / 2

    this.x = this.x + ((newWidth - oldWidth) * this.cellSize) / 2;
    this.y = this.y + ((newHeight - oldHeight) * this.cellSize) / 2;
    // Note: We don't change this.x/y if width/height didn't change (diff is 0)

    // Create new cells for expanded area
    if (!this.cells) {
      this.cells = [];
    }

    // Resize existing rows and add new rows
    for (let y = 0; y < newHeight; y++) {
      // For existing rows, extend if needed
      if (y < oldHeight) {
        // Extend existing row if new width is greater
        if (newWidth > oldWidth) {
          for (let x = oldWidth; x < newWidth; x++) {
            this.cells[y][x] = { type: 'empty' };
          }
        }
      } else {
        // Create a new row
        this.cells[y] = [];
        for (let x = 0; x < newWidth; x++) {
          this.cells[y][x] = { type: 'empty' };
        }
      }
    }

    // Redraw the grid with new dimensions
    this.drawGrid();

    console.log(`[Grid.resize] Grid resized successfully to ${this.width}x${this.height}`);
    return true;
  }
}
