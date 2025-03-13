const fs = require('fs');
const { exec } = require('child_process');

// Create empty audio files
const audioFiles = [
  'click.mp3',
  'place.mp3',
  'clear.mp3',
  'game-over.mp3',
  'background-music.mp3'
];

// We'll use ffmpeg to create silent audio files
// This is a simple approach for placeholder audio
audioFiles.forEach(file => {
  const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame src/assets/audio/${file}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating ${file}: ${error.message}`);
      return;
    }
    console.log(`Created ${file}`);
  });
}); 