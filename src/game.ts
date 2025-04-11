import Phaser from 'phaser';
import BoardScene, { EVENTS } from './scenes/BoardScene';
import DebugScene from './scenes/DebugScene';
import UIScene from './scenes/UIScene';
import { MapGenerationType, useGameStore } from './store/gameStore';
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
  antialias: true,
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
 * Initialize the game board with default settings
 */
function initializeGameBoard() {
  const gameState = useGameStore.getState();
  if (gameState.players.length === 0) {
    useGameStore.getState().addPlayer('Player 1', '#3498db');
  }
  
  // Initialize the game board
  actions.initializeBoard({
    width: BOARD_WIDTH_TILES,
    height: BOARD_HEIGHT_TILES,
    mapType: MapGenerationType.ISLAND
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
    boardScene.events.on(EVENTS.ASSETS_LOADED, initializeGameBoard);
    
    return true;
  }
  return false;
}

/**
 * Initializes and returns the Phaser game instance
 */
export function initializeGame(): Phaser.Game {
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
    initializeGame();
  });
} 