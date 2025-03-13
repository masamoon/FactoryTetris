import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export default class CargoBay {
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
                
                if (cell.type === 'product') {
                    // Get color from game config
                    const color = GAME_CONFIG.resourceColors[cell.productType] || 0xaaaaaa;
                    
                    // Draw product with appropriate color
                    this.graphics.fillStyle(color);
                    this.graphics.fillRect(
                        startX + x * this.cellSize + 2,
                        startY + y * this.cellSize + 2,
                        this.cellSize - 4,
                        this.cellSize - 4
                    );
                    
                    // Add a label for the product type
                    if (!cell.label) {
                        const worldPos = this.gridToWorld(x, y);
                        cell.label = this.scene.add.text(
                            worldPos.x, 
                            worldPos.y, 
                            cell.productType.charAt(0).toUpperCase(), 
                            {
                                fontFamily: 'Arial',
                                fontSize: 10,
                                color: '#ffffff'
                            }
                        ).setOrigin(0.5);
                    }
                } else {
                    // Empty cell
                    this.graphics.fillStyle(0x1a2e3b, 0.5);
                    this.graphics.fillRect(
                        startX + x * this.cellSize + 1,
                        startY + y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    );
                    
                    // Remove label if exists
                    if (cell.label) {
                        cell.label.destroy();
                        delete cell.label;
                    }
                }
            }
        }
    }
    
    update() {
        // Check for completed rows
        this.checkCompletedRows();
        
        // Redraw grid
        this.drawGrid();
    }
    
    addProduct(productType) {
        // Find the first available cell from the bottom up
        for (let y = this.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].type === 'empty') {
                    // Place product in cell
                    this.cells[y][x] = {
                        type: 'product',
                        productType: productType
                    };
                    return true;
                }
            }
        }
        
        return false; // No space available
    }
    
    checkCompletedRows() {
        const completedRows = [];
        
        // Check each row
        for (let y = 0; y < this.height; y++) {
            let isRowComplete = true;
            
            // Check if all cells in the row have products
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].type !== 'product') {
                    isRowComplete = false;
                    break;
                }
            }
            
            if (isRowComplete) {
                completedRows.push(y);
            }
        }
        
        // If we have completed rows, clear them and add score
        if (completedRows.length > 0) {
            this.clearRows(completedRows);
            
            // Calculate score based on combo multiplier
            const comboMultiplier = GAME_CONFIG.comboMultipliers.find(
                combo => combo.rows === completedRows.length
            ) || GAME_CONFIG.comboMultipliers[0];
            
            // Base score is 100 points per row
            const baseScore = completedRows.length * 100;
            const totalScore = baseScore * comboMultiplier.multiplier;
            
            // Add score
            this.scene.addScore(totalScore);
            
            // Play clear sound
            this.scene.sound.play('clear');
        }
    }
    
    clearRows(rowIndices) {
        // Sort row indices in descending order
        rowIndices.sort((a, b) => b - a);
        
        // Clear each row
        for (const rowIndex of rowIndices) {
            // Remove products from the row
            for (let x = 0; x < this.width; x++) {
                this.cells[rowIndex][x] = { type: 'empty' };
            }
            
            // Move all rows above down
            for (let y = rowIndex - 1; y >= 0; y--) {
                for (let x = 0; x < this.width; x++) {
                    this.cells[y + 1][x] = this.cells[y][x];
                    this.cells[y][x] = { type: 'empty' };
                }
            }
        }
    }
    
    isOverflowing() {
        // Check if the top row has any products
        for (let x = 0; x < this.width; x++) {
            if (this.cells[0][x].type === 'product') {
                return true;
            }
        }
        
        return false;
    }
    
    // Convert grid coordinates to world coordinates
    gridToWorld(gridX, gridY) {
        const gridWidth = this.width * this.cellSize;
        const gridHeight = this.height * this.cellSize;
        const startX = this.x - gridWidth / 2;
        const startY = this.y - gridHeight / 2;
        
        const worldX = startX + gridX * this.cellSize + this.cellSize / 2;
        const worldY = startY + gridY * this.cellSize + this.cellSize / 2;
        
        return { x: worldX, y: worldY };
    }
} 