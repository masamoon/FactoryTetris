import { App } from './ui/App';
import { AsteroidApp } from './asteroid/App';
import { RockhopperApp } from './rockhopper/App';

window.addEventListener('DOMContentLoaded', () => {
  const mode = new URLSearchParams(location.search).get('mode');
  const theme = document.getElementById('game-theme') as HTMLLinkElement;
  if (mode === 'tiles') {
    theme.href = 'style.css';
    new App();
  } else if (mode === 'works') {
    theme.href = 'asteroid.css';
    document.title = 'Gridforge — Asteroid Works';
    new AsteroidApp();
  } else {
    new RockhopperApp();
  }
});
