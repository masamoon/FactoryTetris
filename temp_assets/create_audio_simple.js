const fs = require('fs');
const path = require('path');

// Create a simple MP3 file with minimal valid header
// This is a very basic approach for placeholder audio
function createMinimalMp3(filePath) {
  // This is a minimal valid MP3 header (not actually playable, but valid format)
  const minimalMp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  
  fs.writeFileSync(filePath, minimalMp3Header);
  console.log(`Created ${path.basename(filePath)}`);
}

// Create audio files
const audioFiles = [
  'click.mp3',
  'place.mp3',
  'clear.mp3',
  'game-over.mp3',
  'background-music.mp3'
];

audioFiles.forEach(file => {
  createMinimalMp3(`src/assets/audio/${file}`);
}); 