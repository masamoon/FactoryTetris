import ConveyorMachine from './ConveyorMachine';
import BaseMachine from './BaseMachine';

/**
 * Underground Belt Machine
 * Transports resources under other machines.
 * Shape: [[1, 0, 0, 1]] (Entrance and Exit only)
 */
export default class UndergroundBeltMachine extends ConveyorMachine {
  constructor(scene, config) {
    super(scene, config);
  }

  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'underground-belt';
    this.name = 'Underground Belt';
    this.description = 'Transports resources under other machines';
    this.shape = [[1, 0, 0, 1]]; // 1x4 shape with a gap
    this.processingTime = 1000;
  }

  /**
   * Calculates the target coordinates for extraction.
   * For underground belts, the item travels from index 0 to index 1 of the shape.
   */
  getTransferTargetCoords() {
    if (!this.grid) return null;

    let targetX = this.gridX;
    let targetY = this.gridY;

    // The output is at the "end" of the shape
    switch (this.direction) {
      case 'right':
        targetX += 4;
        break;
      case 'down':
        targetY += 4;
        break;
      case 'left':
        targetX -= 1;
        break; // Origin is at 3, so output is at -1? No, origin is 0,0, shape is 1x4.
      case 'up':
        targetY -= 1;
        break;
    }

    // Wait, let's be more precise based on shape:
    // right: shape [[1,0,0,1]] at gridX, gridY. Input at (0,0), Output at (3,0). Target is (4,0).
    // left: shape [[1,0,0,1]] at gridX, gridY. Input at (3,0), Output at (0,0). Target is (-1,0).
    // down: shape [[1],[0],[0],[1]] at gridX, gridY. Input at (0,0), Output at (0,3). Target is (0,4).
    // up: shape [[1],[0],[0],[1]] at gridX, gridY. Input at (0,3), Output at (0,0). Target is (0,-1).

    targetX = this.gridX;
    targetY = this.gridY;

    switch (this.direction) {
      case 'right':
        targetX += 4;
        break;
      case 'down':
        targetY += 4;
        break;
      case 'left':
        targetX -= 1;
        break;
      case 'up':
        targetY -= 1;
        break;
    }

    if (
      !this.grid ||
      targetX < 0 ||
      targetX >= this.grid.width ||
      targetY < 0 ||
      targetY >= this.grid.height
    ) {
      return null;
    }

    return { x: targetX, y: targetY };
  }

  /**
   * Tries to extract a resource/package from an adjacent node at the entrance.
   */
  tryExtractFromSource() {
    if (!this.scene || !this.grid) return;

    const now = this.scene.time.now;
    if (now < this.lastExtractTime + this.extractCooldown) return;

    if (this.itemsOnBelt.length >= this.maxCapacity) return;

    const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
    if (firstItemProgress < 0.1) return;

    // Use static helper to find entrance coordinates
    const ioPos = UndergroundBeltMachine.getIOPositionsForDirection(this.id, this.direction);
    const entranceX = this.gridX + ioPos.inputPos.x;
    const entranceY = this.gridY + ioPos.inputPos.y;

    // Source cell is one step BACK from entrance
    let sourceX = entranceX;
    let sourceY = entranceY;

    switch (this.direction) {
      case 'right':
        sourceX -= 1;
        break;
      case 'down':
        sourceY -= 1;
        break;
      case 'left':
        sourceX += 1;
        break;
      case 'up':
        sourceY += 1;
        break;
    }

    if (sourceX < 0 || sourceX >= this.grid.width || sourceY < 0 || sourceY >= this.grid.height) {
      return;
    }

    const sourceCell = this.grid.getCell(sourceX, sourceY);
    if (!sourceCell || !sourceCell.object) return;

    let extractedItem = null;
    if (
      (sourceCell.type === 'node' || sourceCell.type === 'upgrade-node') &&
      typeof sourceCell.object.extractResource === 'function'
    ) {
      extractedItem = sourceCell.object.extractResource();
    }

    if (extractedItem && extractedItem.type) {
      this.lastExtractTime = now;
      this.addItemVisual(extractedItem);
    }
  }

  getItemPosition(progress) {
    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;

    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;

    // Find the relative positions of the input (progress 0) and output (progress 1) cells
    let startCell, endCell;

    switch (this.direction) {
      case 'right':
        startCell = { x: 0, y: 0 };
        endCell = { x: 3, y: 0 };
        break;
      case 'down':
        startCell = { x: 0, y: 0 };
        endCell = { x: 0, y: 3 };
        break;
      case 'left':
        startCell = { x: 3, y: 0 };
        endCell = { x: 0, y: 0 };
        break;
      case 'up':
        startCell = { x: 0, y: 3 };
        endCell = { x: 0, y: 0 };
        break;
    }

    const startX = startCell.x * cellSize + cellSize / 2 - visualCenterX;
    const startY = startCell.y * cellSize + cellSize / 2 - visualCenterY;
    const endX = endCell.x * cellSize + cellSize / 2 - visualCenterX;
    const endY = endCell.y * cellSize + cellSize / 2 - visualCenterY;

    return {
      x: startX + (endX - startX) * progress,
      y: startY + (endY - startY) * progress,
    };
  }

  createVisuals() {
    if (this.isPreview) return;
    if (!this.grid) return;

    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;

    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;

    const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
    this.container = this.scene.add.container(
      topLeftPos.x + visualCenterX,
      topLeftPos.y + visualCenterY
    );
    this.itemVisualsGroup = this.scene.add.group();

    const machineColor = 0x444444; // Matching MACHINE_COLORS['underground-belt']

    for (let r = 0; r < shapeHeight; r++) {
      for (let c = 0; c < shapeWidth; c++) {
        if (rotatedShape[r][c] === 1) {
          const partCenterX = c * cellSize + cellSize / 2 - visualCenterX;
          const partCenterY = r * cellSize + cellSize / 2 - visualCenterY;

          // Draw a hatch / entrance
          const base = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            cellSize - 4,
            cellSize - 4,
            machineColor
          );
          base.setStrokeStyle(1, 0x333333);
          this.container.add(base);

          const hatch = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            cellSize / 2,
            cellSize / 2,
            0x222222
          );
          this.container.add(hatch);
        }
      }
    }

    // Indicator (U for Underground)
    const label = this.scene.add
      .text(0, 0, 'U', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(label);

    // Add dashed line for underground path
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x888888, 0.5);

    // Draw from start cell to end cell center relative to container center
    const start = this.getItemPosition(0);
    const end = this.getItemPosition(1);

    graphics.beginPath();
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.strokePath();

    this.container.add(graphics);
    this.container.sendToBack(graphics);

    // --- Explicit Direction Arrow ---
    const arrowSize = cellSize * 0.4;
    this.directionIndicator = this.scene.add
      .triangle(
        0,
        0,
        -arrowSize * 0.75,
        -arrowSize * 0.7,
        -arrowSize * 0.75,
        arrowSize * 0.7,
        arrowSize * 0.75,
        0,
        0xffffff
      )
      .setOrigin(0.5, 0.5);
    this.container.add(this.directionIndicator);

    // Fix the rotation: 0=Right, PI/2=Down, PI=Left, 3PI/2=Up
    switch (this.direction) {
      case 'right':
        this.directionIndicator.rotation = 0;
        break;
      case 'down':
        this.directionIndicator.rotation = Math.PI / 2;
        break;
      case 'left':
        this.directionIndicator.rotation = Math.PI;
        break;
      case 'up':
        this.directionIndicator.rotation = (3 * Math.PI) / 2;
        break;
    }

    this.addPlacementAnimation();
  }

  /**
   * Get a preview sprite for the machine selection panel
   */
  static getPreviewSprite(scene, x, y, direction = 'right') {
    const shape = [[1, 0, 0, 1]];
    const ioPositions = UndergroundBeltMachine.getIOPositionsForDirection(
      'underground-belt',
      direction
    );

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'underground-belt',
      shape: shape,
      label: 'U',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  /**
   * Get input and output positions for each direction
   * @param {string} machineId - The machine ID
   * @param {string} direction - The direction
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    let inputPos, outputPos;
    // Underground belt shape is [[1, 0, 0, 1]] (4 cells)
    switch (direction) {
      case 'right':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 3, y: 0 };
        break;
      case 'down':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 3 };
        break;
      case 'left':
        inputPos = { x: 3, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'up':
        inputPos = { x: 0, y: 3 };
        outputPos = { x: 0, y: 0 };
        break;
      default:
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 3, y: 0 };
    }
    return { inputPos, outputPos };
  }

  /**
   * Get standard configuration for this machine type
   */
  static getConfig() {
    return BaseMachine.getStandardConfig({
      id: 'underground-belt',
      name: 'Underground Belt',
      description: 'Transports resources under other machines',
      shape: [[1, 0, 0, 1]], // 1x4 shape with a gap
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 1000,
      defaultDirection: 'right',
      inputCoord: { x: 0, y: 0 },
      outputCoord: { x: 3, y: 0 },
    });
  }
}
