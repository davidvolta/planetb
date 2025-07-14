import Phaser from 'phaser';
import BoardScene, { EVENTS } from './scene/BoardScene';
import DebugScene from './scene/DebugScene';
import UIScene from './scene/UIScene';
import * as actions from './store/actions';
// Note: TILE_SIZE and TILE_HEIGHT imports removed as they're unused in this file
import { StateObserver } from './utils/stateObserver';
import { GameEnvironment } from './env/GameEnvironment';

// Compute game dimensions based on tile size and board dimensions
const GAME_WIDTH = 1080; //TILE_SIZE * GameEnvironment.boardWidth;
const GAME_HEIGHT = 720; //TILE_HEIGHT * (GameEnvironment.boardHeight + 10); // Add padding for UI elements

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
  // Add players based on GameEnvironment config
  for (const player of GameEnvironment.playerConfigs) {
    actions.addPlayer(player.name, player.color);
  }

  // Set up the board with configured dimensions
  actions.setupGameBoard({
    width: GameEnvironment.boardWidth,
    height: GameEnvironment.boardHeight
  });

  // Set fog-of-war mode if needed
  if (!GameEnvironment.fogOfWarEnabled) {
    actions.setFogOfWarEnabled(false);
  }
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
  
  // Add debug utilities for development
  if (process.env.NODE_ENV === 'development' || GameEnvironment.mode !== 'production') {
    StateObserver.addConsoleDebugUtilities();
  }
  
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