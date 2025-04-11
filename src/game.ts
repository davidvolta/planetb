import Phaser from 'phaser';
import BoardScene, { EVENTS } from './scenes/BoardScene';
import DebugScene from './scenes/DebugScene';
import UIScene from './scenes/UIScene';
import { MapGenerationType, useGameStore } from './store/gameStore';
import * as actions from './store/actions';
import { GAME_WIDTH, GAME_HEIGHT, BOARD_WIDTH_TILES, BOARD_HEIGHT_TILES } from './constants/gameConfig';
import { StateObserver } from './utils/stateObserver';

// Add a global console message to confirm the script is loading
console.log('Planet B: Standalone mode script loaded');

// Default game config
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
  // Add a default player if none exists
  const gameState = useGameStore.getState();
  if (gameState.players.length === 0) {
    // Use the store's addPlayer method directly
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
 * Set up the game's state observer
 * This replaces the React-Phaser bridge functionality
 */
function setupStateObserver(game: Phaser.Game) {
  // Set up state observer to sync game state with Phaser registry
  StateObserver.subscribe(
    'Game.gameStateSync',
    (state) => state, // Select the entire state
    (gameState) => {
      // Update the registry with the current game state
      game.registry.set('gameState', gameState);
      console.log('Updated game registry with latest game state');
    },
    { immediate: true } // Immediately sync the current state
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
    
    // Listen for assets loaded event
    boardScene.events.on(EVENTS.ASSETS_LOADED, () => {
      console.log('Assets loaded, initializing board');
      // Initialize the game board
      initializeGameBoard();
    });
    
    return true;
  }
  return false;
}

/**
 * Initializes and returns the Phaser game instance
 * @returns The Phaser game instance
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
  
  // Try to set up the listener immediately, or poll until the scene is available
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
 * Destroy the game instance
 */
export function destroyGame() {
  if (gameInstance) {
    // Clean up subscriptions
    StateObserver.unsubscribeAll();
    
    // Destroy the game
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

// When this file is loaded directly, automatically initialize the game
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('Initializing standalone Phaser game');
    initializeGame();
  });
} 