#!/bin/bash

# Gridforge Installation Script

echo "Installing Gridforge..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js before continuing."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm before continuing."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install
npm run prepare

# Create necessary directories
echo "Setting up project structure..."
mkdir -p dist
mkdir -p src/assets/images
mkdir -p src/assets/audio

# Copy placeholder assets if they don't exist
if [ ! -f src/assets/images/loading-background.png ]; then
    echo "Creating placeholder assets..."
    # This would normally copy placeholder assets, but we'll just create empty files
    touch src/assets/images/loading-background.png
    touch src/assets/images/button.png
    touch src/assets/images/button-hover.png
    touch src/assets/images/grid-cell.png
    touch src/assets/images/resource-node.png
    touch src/assets/images/machine-i.png
    touch src/assets/images/machine-l.png
    touch src/assets/images/machine-j.png
    touch src/assets/images/machine-o.png
    touch src/assets/images/machine-s.png
    touch src/assets/images/machine-t.png
    touch src/assets/images/machine-z.png
    touch src/assets/images/raw-resource.png
    touch src/assets/images/product-a.png
    touch src/assets/images/product-b.png
    touch src/assets/images/product-c.png
    touch src/assets/audio/click.mp3
    touch src/assets/audio/place.mp3
    touch src/assets/audio/clear.mp3
    touch src/assets/audio/game-over.mp3
    touch src/assets/audio/background-music.mp3
fi

# Make the script executable
chmod +x install.sh

echo "Installation complete! Run 'npm start' to start the development server." 