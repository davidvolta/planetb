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
async function setupGameState() {
  const multiplayerContext = (window as any).gameMultiplayerContext;
  
  if (multiplayerContext) {
    // Multiplayer mode - use shared initial state
    await setupMultiplayerGameState(multiplayerContext);
  } else {
    // Single player mode - generate locally
    setupSinglePlayerGameState();
  }
}

/**
 * Set up single player game state (local generation)
 */
function setupSinglePlayerGameState() {
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
 * Set up multiplayer game state with shared initial state
 */
async function setupMultiplayerGameState(multiplayerContext: { roomId: string, isHost: boolean }) {
  const { MultiplayerClient } = await import('./utils/MultiplayerClient');
  const client = new MultiplayerClient();
  
  let initialState;
  
  if (multiplayerContext.isHost) {
    // Host: generate state and submit to server
    console.log('Host generating initial game state...');
    
    // Generate the initial state locally
    for (const player of GameEnvironment.playerConfigs) {
      actions.addPlayer(player.name, player.color);
    }
    
    const gameState = await generateInitialGameState();
    
    // Submit to server
    await client.submitInitialState(gameState);
    initialState = gameState;
    
  } else {
    // Guest: load shared state from server
    console.log('Guest loading shared game state...');
    
    const response = await client.getInitialState();
    initialState = response.gameState;
    
    // Apply the shared state
    await applySharedGameState(initialState);
  }
  
  // Set fog-of-war mode if needed
  if (!GameEnvironment.fogOfWarEnabled) {
    actions.setFogOfWarEnabled(false);
  }
}

/**
 * Generate initial game state (used by host)
 */
async function generateInitialGameState() {
  // This replicates the existing setupGameBoard behavior
  for (const player of GameEnvironment.playerConfigs) {
    actions.addPlayer(player.name, player.color);
  }
  
  const { BoardController } = await import('./controllers/BoardController');
  const result = BoardController.initializeBoard({
    width: GameEnvironment.boardWidth,
    height: GameEnvironment.boardHeight
  });
  
  return {
    board: result.board,
    animals: result.animals,
    biomes: Array.from(result.biomes.entries()),
    players: result.updatedPlayers
  };
}

/**
 * Apply shared game state (used by guest)
 */
async function applySharedGameState(initialState: any) {
  // Apply the shared state to the game store
  const { Board, Animal, Biome } = await import('./store/gameStore');
  
  // Add players
  for (const player of initialState.players) {
    actions.addPlayer(player);
  }
  
  // Apply the shared board state
  actions.initializeBoard(
    initialState.board,
    initialState.animals,
    new Map(initialState.biomes),
    initialState.players
  );
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
async function setupAssetLoadedListener(game: Phaser.Game) {
  const boardScene = game.scene.getScene('BoardScene') as BoardScene;
  if (boardScene) {
    // Remove any existing listeners first
    boardScene.events.removeAllListeners(EVENTS.ASSETS_LOADED);
    
    // Listen for assets loaded event to initialize the game board
    boardScene.events.on(EVENTS.ASSETS_LOADED, async () => {
      await setupGameState();
    });
    
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
    const interval = setInterval(async () => {
      if (await setupAssetLoadedListener(game)) {
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

// Export initialization function for manual control
// (Lobby will call this when ready)
export function initializeGame() {
  return createPhaserEngine();
} 