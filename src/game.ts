import Phaser from 'phaser';
import BoardScene, { EVENTS } from './scenes/BoardScene';
import DebugScene from './scenes/DebugScene';
import UIScene from './scenes/UIScene';
import { useGameStore } from './store/gameStore';
import * as actions from './store/actions';
import { GAME_WIDTH, GAME_HEIGHT, BOARD_WIDTH_TILES, BOARD_HEIGHT_TILES } from './constants/gameConfig';
import { StateObserver } from './utils/stateObserver';

// Game configuration
const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1c1117',
  parent: 'game-container',
  scene: [BoardScene, DebugScene, UIScene],
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  }
};

// Global reference to the game instance
let gameInstance: Phaser.Game | null = null;

/**
 * Set up the initial game state with default settings
 */
function setupGameState() {
  // Ensure two players exist by default (batch add)
  if (useGameStore.getState().players.length === 0) {
    actions.addPlayer('Player 1', '#3498db');
    actions.addPlayer('Player 2', '#e74c3c');
  }
  
  // Set up the game board
  actions.setupGameBoard({
    width: BOARD_WIDTH_TILES,
    height: BOARD_HEIGHT_TILES
  });
}

/**
 * Set up the game's state observer to sync game state with Phaser
 */
function setupStateObserver(game: Phaser.Game) {
  // Single subscription to sync game state with Phaser's registry
  StateObserver.subscribe(
    'Game.gameStateSync',
    (state) => state, 
    (gameState) => {
      game.registry.set('gameState', gameState);
    },
    { immediate: true }
  );
}

/**
 * Set up asset loading listener for the board scene
 */
function setupAssetLoadedListener(game: Phaser.Game) {
  const boardScene = game.scene.getScene('BoardScene') as BoardScene;
  if (boardScene) {
    // Remove any existing listeners first
    boardScene.events.removeAllListeners(EVENTS.ASSETS_LOADED);
    
    // Listen for assets loaded event to initialize the game board
    boardScene.events.on(EVENTS.ASSETS_LOADED, setupGameState);
    
    return true;
  }
  return false;
}

/**
 * Creates and initializes the Phaser game engine
 */
export function createPhaserEngine(): Phaser.Game {
  // If game instance already exists, return it
  if (gameInstance) {
    return gameInstance;
  }
  
  // Create the game instance
  const game = new Phaser.Game(GAME_CONFIG);
  gameInstance = game;
  
  // Set up the state observer
  setupStateObserver(game);
  
  // Set up asset loaded listener with polling if needed
  if (!setupAssetLoadedListener(game)) {
    const interval = setInterval(() => {
      if (setupAssetLoadedListener(game)) {
        clearInterval(interval);
      }
    }, 100);
  }
  
  return game;
}

/**
 * Destroy the game instance and clean up resources
 */
export function destroyGame() {
  if (gameInstance) {
    StateObserver.unsubscribeAll();
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

// Initialize the game when the window loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    createPhaserEngine();
  });
} 