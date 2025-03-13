const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a button image
function createButton(filename, color) {
  const canvas = createCanvas(200, 50);
  const ctx = canvas.getContext('2d');

  // Draw button background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, 200, 50, 10);
  ctx.fill();

  // Draw button border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, 200, 50, 10);
  ctx.stroke();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
}

// Create buttons
createButton('src/assets/images/button.png', '#3498db');
createButton('src/assets/images/button-hover.png', '#2980b9'); 