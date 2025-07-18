// Import and initialize the game
import './index.css';
import { createPhaserEngine } from './game';

// Initialize the game when the page loads
window.addEventListener('load', () => {
  console.log('Window loaded, starting game...');
  createPhaserEngine();
});