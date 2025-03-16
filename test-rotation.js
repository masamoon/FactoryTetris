// Test script to verify rotation logic
console.log('Testing rotation logic with J-shaped piece');
const originalShape = [
    [1, 1],
    [1, 0],
    [1, 0]
];
console.log('Original shape:');
originalShape.forEach(row => console.log(row.join(' ')));

function rotateShapeClockwise(shape) {
    if (!shape || !Array.isArray(shape) || shape.length === 0) {
        return [[1]];
    }
    
    const width = shape[0].length;
    const height = shape.length;
    console.log(`Original dimensions: ${width}x${height}`);
    
    // Create a new matrix with flipped dimensions
    const rotated = Array(width).fill().map(() => Array(height).fill(0));
    
    // Perform rotation: (row, col) -> (col, height - 1 - row)
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const newRow = col;
            const newCol = height - 1 - row;
            rotated[newRow][newCol] = shape[row][col];
            console.log(`Rotating cell: (${row},${col}) -> (${newRow},${newCol}), value: ${shape[row][col]}`);
        }
    }
    
    console.log('Rotated shape:');
    rotated.forEach(row => console.log(row.join(' ')));
    
    return rotated;
}

const rotated = rotateShapeClockwise(originalShape);
console.log('Rotated dimensions:', rotated.length, 'x', rotated[0].length); 