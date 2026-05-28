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
   * Calculates the target coordinates for the side this item should exit.
   */
  getTransferTargetCoords(itemOnBelt = null) {
    if (!this.grid) return null;

    const endpoints = this.getEndpointCells();
    const targetOffset = itemOnBelt?.reverseTunnelRoute
      ? endpoints.beforeStart
      : endpoints.afterEnd;
    const targetX = this.gridX + targetOffset.x;
    const targetY = this.gridY + targetOffset.y;

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

    const endpoints = this.getEndpointCells();
    const sourceOptions = [
      { offset: endpoints.beforeStart, reverseTunnelRoute: false },
      { offset: endpoints.afterEnd, reverseTunnelRoute: true },
    ];

    for (const option of sourceOptions) {
      const sourceX = this.gridX + option.offset.x;
      const sourceY = this.gridY + option.offset.y;

      if (
        sourceX < 0 ||
        sourceX >= this.grid.width ||
        sourceY < 0 ||
        sourceY >= this.grid.height
      ) {
        continue;
      }

      const sourceCell = this.grid.getCell(sourceX, sourceY);
      if (
        !sourceCell ||
        sourceCell.type !== 'node' ||
        typeof sourceCell.object?.extractResource !== 'function'
      ) {
        continue;
      }

      const extractedItem = sourceCell.object.extractResource();
      if (extractedItem && extractedItem.type) {
        this.lastExtractTime = now;
        this.addItemVisual(extractedItem, {
          reverseTunnelRoute: option.reverseTunnelRoute,
        });
        return;
      }
    }
  }

  getItemPosition(progress, itemOnBelt = null) {
    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;

    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;

    const endpoints = this.getEndpointCells();
    const startCell = itemOnBelt?.reverseTunnelRoute ? endpoints.end : endpoints.start;
    const endCell = itemOnBelt?.reverseTunnelRoute ? endpoints.start : endpoints.end;

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

    const machineColor = this.isBoardLoaner ? 0x21445a : 0x444444;
    const hatchColor = this.isBoardLoaner ? 0x83f7ff : 0x222222;
    const pathColor = this.isBoardLoaner ? 0x83f7ff : 0x888888;
    const labelText = this.isBoardLoaner ? 'FIXED' : 'U';

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
            hatchColor
          );
          this.container.add(hatch);
        }
      }
    }

    // Indicator (U for Underground)
    const label = this.scene.add
      .text(0, 0, labelText, {
        fontFamily: 'Arial Black',
        fontSize: this.isBoardLoaner ? '9px' : '16px',
        color: this.isBoardLoaner ? '#b9f7ff' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(label);

    // Add dashed line for underground path
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(this.isBoardLoaner ? 3 : 2, pathColor, this.isBoardLoaner ? 0.75 : 0.5);

    // Draw from start cell to end cell center relative to container center
    const start = this.getItemPosition(0);
    const end = this.getItemPosition(1);

    graphics.beginPath();
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.strokePath();

    this.container.add(graphics);
    this.container.sendToBack(graphics);

    // --- Bidirectional Orientation Arrows ---
    const arrowSize = cellSize * 0.4;
    this.directionIndicator = this.scene.add.container(0, 0);
    const arrowForward = this.scene.add
      .triangle(
        arrowSize * 0.45,
        0,
        -arrowSize * 0.45,
        -arrowSize * 0.55,
        -arrowSize * 0.45,
        arrowSize * 0.55,
        arrowSize * 0.45,
        0,
        0xffffff
      )
      .setOrigin(0.5, 0.5);
    const arrowBack = this.scene.add
      .triangle(
        -arrowSize * 0.45,
        0,
        arrowSize * 0.45,
        -arrowSize * 0.55,
        arrowSize * 0.45,
        arrowSize * 0.55,
        -arrowSize * 0.45,
        0,
        0xffffff
      )
      .setOrigin(0.5, 0.5);
    this.directionIndicator.add([arrowForward, arrowBack]);
    this.container.add(this.directionIndicator);

    this.directionIndicator.rotation =
      this.direction === 'down' || this.direction === 'up' ? Math.PI / 2 : 0;

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

  getEndpointCells(direction = this.direction) {
    switch (direction) {
      case 'down':
        return {
          start: { x: 0, y: 0 },
          end: { x: 0, y: 3 },
          beforeStart: { x: 0, y: -1 },
          afterEnd: { x: 0, y: 4 },
        };
      case 'left':
        return {
          start: { x: 3, y: 0 },
          end: { x: 0, y: 0 },
          beforeStart: { x: 4, y: 0 },
          afterEnd: { x: -1, y: 0 },
        };
      case 'up':
        return {
          start: { x: 0, y: 3 },
          end: { x: 0, y: 0 },
          beforeStart: { x: 0, y: 4 },
          afterEnd: { x: 0, y: -1 },
        };
      case 'right':
      default:
        return {
          start: { x: 0, y: 0 },
          end: { x: 3, y: 0 },
          beforeStart: { x: -1, y: 0 },
          afterEnd: { x: 4, y: 0 },
        };
    }
  }

  inferRouteOptionsFromSource(sourceMachine = null) {
    if (!sourceMachine) {
      return { reverseTunnelRoute: false };
    }

    const endpoints = this.getEndpointCells();
    const beforeStart = {
      x: this.gridX + endpoints.beforeStart.x,
      y: this.gridY + endpoints.beforeStart.y,
    };
    const afterEnd = {
      x: this.gridX + endpoints.afterEnd.x,
      y: this.gridY + endpoints.afterEnd.y,
    };

    const sourceCells =
      typeof sourceMachine.getOccupiedCells === 'function'
        ? sourceMachine.getOccupiedCells()
        : [{ x: sourceMachine.gridX, y: sourceMachine.gridY }];

    const touchesBeforeStart = sourceCells.some(
      (cell) => cell.x === beforeStart.x && cell.y === beforeStart.y
    );
    const touchesAfterEnd = sourceCells.some(
      (cell) => cell.x === afterEnd.x && cell.y === afterEnd.y
    );

    return { reverseTunnelRoute: touchesAfterEnd && !touchesBeforeStart };
  }

  acceptItem(itemData, sourceMachine = null) {
    if (!itemData || !itemData.type) {
      console.log(`[UNDERGROUND] (${this.gridX}, ${this.gridY}) rejected: Invalid itemData.`);
      return false;
    }

    const routedItem = this.tagItemRoute(itemData, this.id);
    if (!this.canAcceptInput(routedItem.type)) {
      console.log(
        `[UNDERGROUND] (${this.gridX}, ${this.gridY}) rejected: Type ${routedItem.type} not accepted.`
      );
      return false;
    }

    if (this.itemsOnBelt.length >= this.maxCapacity) {
      console.log(
        `[UNDERGROUND] (${this.gridX}, ${this.gridY}) rejected: Tunnel full (${this.itemsOnBelt.length}/${this.maxCapacity}).`
      );
      return false;
    }

    const routeOptions = this.inferRouteOptionsFromSource(sourceMachine);
    const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
    if (firstItemProgress < 0.1) {
      console.log(
        `[UNDERGROUND] (${this.gridX}, ${this.gridY}) rejected: Entrance blocked (first item progress: ${firstItemProgress.toFixed(2)}).`
      );
      return false;
    }

    this.addItemVisual(routedItem, routeOptions);
    return true;
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
