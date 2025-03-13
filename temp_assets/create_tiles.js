const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a grid cell
function createGridCell() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Draw cell background
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, 0, 32, 32);

  // Draw cell border
  ctx.strokeStyle = '#34495e';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 32, 32);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('src/assets/images/grid-cell.png', buffer);
  console.log('Created grid-cell.png');
}

// Create a resource node
function createResourceNode() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Draw node background
  ctx.fillStyle = '#8e44ad';
  ctx.fillRect(0, 0, 32, 32);

  // Draw node pattern
  ctx.fillStyle = '#9b59b6';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(i * 8, j * 8, 8, 8);
      }
    }
  }

  // Draw node border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 32, 32);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('src/assets/images/resource-node.png', buffer);
  console.log('Created resource-node.png');
}

// Create a machine piece
function createMachinePiece(type, color) {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  const cellSize = 32;

  // Define piece shapes (Tetris-like)
  const shapes = {
    'i': [[0, 0], [0, 1], [0, 2], [0, 3]],
    'j': [[0, 0], [1, 0], [1, 1], [1, 2]],
    'l': [[0, 0], [0, 1], [0, 2], [1, 2]],
    'o': [[0, 0], [0, 1], [1, 0], [1, 1]],
    's': [[0, 1], [0, 2], [1, 0], [1, 1]],
    't': [[0, 1], [1, 0], [1, 1], [1, 2]],
    'z': [[0, 0], [0, 1], [1, 1], [1, 2]]
  };

  // Draw piece
  ctx.fillStyle = color;
  shapes[type].forEach(([x, y]) => {
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    
    // Draw cell border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    
    // Draw connector lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw a circle in the middle of each cell
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x * cellSize + cellSize/2, y * cellSize + cellSize/2, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`src/assets/images/machine-${type}.png`, buffer);
  console.log(`Created machine-${type}.png`);
}

// Create resource and product images
function createResource(name, color) {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d');

  // Draw resource
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, Math.PI * 2);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`src/assets/images/${name}.png`, buffer);
  console.log(`Created ${name}.png`);
}

// Create all assets
createGridCell();
createResourceNode();

// Create machine pieces
createMachinePiece('i', '#3498db'); // Blue
createMachinePiece('j', '#2ecc71'); // Green
createMachinePiece('l', '#e74c3c'); // Red
createMachinePiece('o', '#f1c40f'); // Yellow
createMachinePiece('s', '#9b59b6'); // Purple
createMachinePiece('t', '#e67e22'); // Orange
createMachinePiece('z', '#1abc9c'); // Turquoise

// Create resources and products
createResource('raw-resource', '#8e44ad');
createResource('product-a', '#3498db');
createResource('product-b', '#2ecc71');
createResource('product-c', '#e74c3c'); 