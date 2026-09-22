import { App } from './ui/App';
import { AsteroidApp } from './asteroid/App';

window.addEventListener('DOMContentLoaded', () => {
  const tiles = new URLSearchParams(location.search).get('mode') === 'tiles';
  (document.getElementById('game-theme') as HTMLLinkElement).href = tiles
    ? 'style.css'
    : 'asteroid.css';
  if (tiles) new App();
  else new AsteroidApp();
});
