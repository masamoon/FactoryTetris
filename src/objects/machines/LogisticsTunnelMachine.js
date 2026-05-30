import BaseMachine from './BaseMachine';
import ConveyorMachine from './ConveyorMachine';
import Phaser from 'phaser';

/**
 * One-use logistics tunnel made from the belt draft shapes.
 * Only the first and last cells occupy the grid; the drawn route between them
 * is internal travel so it can pass under machines, belts, and blockers.
 */
export default class LogisticsTunnelMachine extends ConveyorMachine {
  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'logistics-tunnel';
    this.name = this.config?.pieceName || 'Logistics Tunnel';
    this.description = 'Transports resources under machines along a drafted route';
    this.tunnelPath = this.normalizePath(this.config?.logisticsTunnelPath || []);
    this.shape = this.normalizeShape(this.config?.logisticsTunnelShape, this.tunnelPath);
    this.acceptsDirectSource = true;
    this.acceptsBidirectionalTunnel = true;
  }

  normalizePath(path) {
    if (!Array.isArray(path))
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ];
    const normalized = path
      .map((cell) => ({
        x: Math.floor(Number(cell?.x) || 0),
        y: Math.floor(Number(cell?.y) || 0),
      }))
      .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y));
    return normalized.length >= 2
      ? normalized
      : [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ];
  }

  normalizeShape(shape, path) {
    if (Array.isArray(shape) && shape.length > 0 && Array.isArray(shape[0])) {
      return shape.map((row) => row.map((value) => (value ? 1 : 0)));
    }

    const width = Math.max(1, ...path.map((cell) => cell.x + 1));
    const height = Math.max(1, ...path.map((cell) => cell.y + 1));
    const endpointShape = Array.from({ length: height }, () => Array(width).fill(0));
    const start = path[0];
    const end = path[path.length - 1];
    endpointShape[start.y][start.x] = 1;
    endpointShape[end.y][end.x] = 1;
    return endpointShape;
  }

  rotatePathCell(cell, direction = this.direction) {
    const height = this.shape.length;
    const width = this.shape[0]?.length || 1;

    switch (direction) {
      case 'down':
        return { x: height - 1 - cell.y, y: cell.x };
      case 'left':
        return { x: width - 1 - cell.x, y: height - 1 - cell.y };
      case 'up':
        return { x: cell.y, y: width - 1 - cell.x };
      case 'right':
      default:
        return { x: cell.x, y: cell.y };
    }
  }

  getRotatedTunnelPath(direction = this.direction) {
    return this.tunnelPath.map((cell) => this.rotatePathCell(cell, direction));
  }

  getTravelVector(from, to) {
    const dx = Math.sign((to?.x ?? from.x) - from.x);
    const dy = Math.sign((to?.y ?? from.y) - from.y);
    if (dx !== 0 || dy !== 0) return { x: dx, y: dy };

    switch (this.direction) {
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'up':
        return { x: 0, y: -1 };
      case 'right':
      default:
        return { x: 1, y: 0 };
    }
  }

  getEndpointCells() {
    const path = this.getRotatedTunnelPath();
    const start = path[0];
    const end = path[path.length - 1];
    const startVector = this.getTravelVector(start, path[1]);
    const endVector = this.getTravelVector(path[path.length - 2], end);

    return {
      start,
      end,
      beforeStart: { x: start.x - startVector.x, y: start.y - startVector.y },
      afterEnd: { x: end.x + endVector.x, y: end.y + endVector.y },
    };
  }

  getTransferTargetCoords(itemOnBelt = null) {
    if (!this.grid) return null;

    const endpoints = this.getEndpointCells();
    const targetOffset = itemOnBelt?.reverseTunnelRoute
      ? endpoints.beforeStart
      : endpoints.afterEnd;
    const targetX = this.gridX + targetOffset.x;
    const targetY = this.gridY + targetOffset.y;

    if (targetX < 0 || targetX >= this.grid.width || targetY < 0 || targetY >= this.grid.height) {
      return null;
    }

    return { x: targetX, y: targetY };
  }

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
      if (sourceX < 0 || sourceX >= this.grid.width || sourceY < 0 || sourceY >= this.grid.height) {
        continue;
      }

      const sourceCell = this.grid.getCell(sourceX, sourceY);
      if (sourceCell?.type !== 'node' || typeof sourceCell.object?.extractResource !== 'function') {
        continue;
      }

      const extractedItem = sourceCell.object.extractResource();
      if (extractedItem?.type) {
        this.lastExtractTime = now;
        this.addItemVisual(extractedItem, {
          reverseTunnelRoute: option.reverseTunnelRoute,
        });
        return;
      }
    }
  }

  inferRouteOptionsFromSource(sourceMachine = null) {
    if (!sourceMachine) return { reverseTunnelRoute: false };

    const endpoints = this.getEndpointCells();
    const start = { x: this.gridX + endpoints.start.x, y: this.gridY + endpoints.start.y };
    const end = { x: this.gridX + endpoints.end.x, y: this.gridY + endpoints.end.y };
    const beforeStart = {
      x: this.gridX + endpoints.beforeStart.x,
      y: this.gridY + endpoints.beforeStart.y,
    };
    const afterEnd = {
      x: this.gridX + endpoints.afterEnd.x,
      y: this.gridY + endpoints.afterEnd.y,
    };

    if (typeof sourceMachine.getTransferTargetCoords === 'function') {
      const sourceTarget = sourceMachine.getTransferTargetCoords();
      if (sourceTarget?.x === start.x && sourceTarget?.y === start.y) {
        return { reverseTunnelRoute: false };
      }
      if (sourceTarget?.x === end.x && sourceTarget?.y === end.y) {
        return { reverseTunnelRoute: true };
      }
    }

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
    if (!itemData?.type) {
      console.log(`[LOGISTICS_TUNNEL] (${this.gridX}, ${this.gridY}) rejected invalid item.`);
      return false;
    }

    const routedItem = this.tagItemRoute(itemData, this.id);
    if (!this.canAcceptInput(routedItem.type)) return false;
    if (this.itemsOnBelt.length >= this.maxCapacity) return false;

    const firstItemProgress = this.itemsOnBelt.length > 0 ? this.itemsOnBelt[0].progress : 1;
    if (firstItemProgress < 0.1) return false;

    this.addItemVisual(routedItem, this.inferRouteOptionsFromSource(sourceMachine));
    return true;
  }

  getItemPosition(progress, itemOnBelt = null) {
    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
    const path = this.getRotatedTunnelPath();
    const travelPath = itemOnBelt?.reverseTunnelRoute ? [...path].reverse() : path;
    const segmentCount = Math.max(1, travelPath.length - 1);
    const scaledProgress = Phaser.Math.Clamp(progress, 0, 1) * segmentCount;
    const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaledProgress));
    const segmentProgress = scaledProgress - segmentIndex;
    const start = travelPath[segmentIndex];
    const end = travelPath[segmentIndex + 1] || start;
    const startX = start.x * cellSize + cellSize / 2 - visualCenterX;
    const startY = start.y * cellSize + cellSize / 2 - visualCenterY;
    const endX = end.x * cellSize + cellSize / 2 - visualCenterX;
    const endY = end.y * cellSize + cellSize / 2 - visualCenterY;

    return {
      x: Phaser.Math.Linear(startX, endX, segmentProgress),
      y: Phaser.Math.Linear(startY, endY, segmentProgress),
    };
  }

  createVisuals() {
    if (this.isPreview || !this.grid) return;

    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
    const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
    if (!topLeftPos) return;

    this.container = this.scene.add.container(
      topLeftPos.x + visualCenterX,
      topLeftPos.y + visualCenterY
    );
    this.itemVisualsGroup = this.scene.add.group();

    const path = this.getRotatedTunnelPath();
    const getCenter = (cell) => ({
      x: cell.x * cellSize + cellSize / 2 - visualCenterX,
      y: cell.y * cellSize + cellSize / 2 - visualCenterY,
    });

    const graphics = this.scene.add.graphics();
    graphics.lineStyle(Math.max(5, cellSize * 0.18), 0x07111a, 0.86);
    for (let i = 0; i < path.length - 1; i++) {
      const from = getCenter(path[i]);
      const to = getCenter(path[i + 1]);
      graphics.lineBetween(from.x, from.y, to.x, to.y);
    }
    graphics.lineStyle(Math.max(3, cellSize * 0.1), 0xb56cff, 0.9);
    graphics.setLineDash?.([6, 4]);
    for (let i = 0; i < path.length - 1; i++) {
      const from = getCenter(path[i]);
      const to = getCenter(path[i + 1]);
      graphics.lineBetween(from.x, from.y, to.x, to.y);
    }
    graphics.setLineDash?.([]);
    this.container.add(graphics);

    [path[0], path[path.length - 1]].forEach((cell, index) => {
      const center = getCenter(cell);
      const hatch = this.scene.add
        .rectangle(center.x, center.y, cellSize - 12, cellSize - 12, 0x2f2447)
        .setStrokeStyle(2, 0xb56cff, 0.92);
      const inner = this.scene.add.rectangle(
        center.x,
        center.y,
        cellSize * 0.48,
        cellSize * 0.48,
        index === 0 ? 0x151a24 : 0x3a285d
      );
      this.container.add(hatch);
      this.container.add(inner);
    });

    const label = this.scene.add
      .text(0, 0, 'T', {
        fontFamily: 'Arial Black',
        fontSize: '15px',
        color: '#d9b6ff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(label);

    this.addPlacementAnimation();
  }

  static getConfig() {
    return BaseMachine.getStandardConfig({
      id: 'logistics-tunnel',
      name: 'Logistics Tunnel',
      description: 'One-use routed tunnel from the logistics deck',
      shape: [[1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource', 'level-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource', 'level-resource'],
      processingTime: 1000,
      defaultDirection: 'right',
    });
  }
}
