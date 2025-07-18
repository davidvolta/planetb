import Phaser from 'phaser';
import { EVENTS } from './BoardScene';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload() {
    // Standard Phaser loading screen setup
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

    // Loading text
    this.add.text(width / 2, height / 2 - 50, 'Planet B', {
      fontSize: '48px',
      fontFamily: 'Orbitron',
      color: '#00cc99'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, 'Loading shared map...', {
      fontSize: '24px',
      fontFamily: 'Orbitron',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Loading bar background
    const loadingBar = this.add.graphics();
    const loadingBox = this.add.graphics();
    
    loadingBox.fillStyle(0x222222, 1);
    loadingBox.fillRect(width / 2 - 160, height / 2 + 50, 320, 20);

    // Progress bar
    loadingBar.fillStyle(0x00cc99, 1);
    loadingBar.fillRect(width / 2 - 150, height / 2 + 55, 300, 10);

    // Animate the progress
    this.tweens.add({
      targets: loadingBar,
      scaleX: 1,
      duration: 2000,
      ease: 'Power2'
    });
  }

  async create() {
    const multiplayerContext = (window as any).gameMultiplayerContext;
    
    if (multiplayerContext) {
      // DEV MODE: Skip server for dev-room
      if (multiplayerContext.roomId === 'dev-room') {
        await this.generateDevMultiplayerState(multiplayerContext);
      } else {
        await this.loadMultiplayerState(multiplayerContext);
      }
      
      // Small delay to ensure state observers have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      // Only setup local game state if not in multiplayer mode
      this.setupGameState();
    }
    
    this.scene.start('BoardScene');
  }

  async setupGameState() {
    // Use existing setup - LoadingScene handles async coordination
    const { GameEnvironment } = await import('../env/GameEnvironment');
    const { BoardController } = await import('../controllers/BoardController');
    
    // Import actions dynamically
    const { addPlayer, setupGameBoard } = await import('../store/actions');
    
    for (const player of GameEnvironment.playerConfigs) {
      addPlayer(player.name, player.color);
    }

    setupGameBoard({
      width: GameEnvironment.boardWidth,
      height: GameEnvironment.boardHeight
    });
  }

  async loadMultiplayerState(multiplayerContext: { roomId: string, isHost: boolean, playerId?: string }) {
    const { MultiplayerClient } = await import('../utils/MultiplayerClient');
    const client = new MultiplayerClient();
    
    // Override the playerId if provided in context
    if (multiplayerContext.playerId) {
      (client as any).playerId = multiplayerContext.playerId;
    }
    (client as any).roomId = multiplayerContext.roomId;
    (client as any).isHost = multiplayerContext.isHost;
    
    try {
      if (multiplayerContext.isHost) {
        await this.generateAndSubmitInitialState(multiplayerContext, client);
      } else {
        await this.loadSharedState(multiplayerContext, client);
      }
    } catch (error) {
      console.error('Failed to load multiplayer state:', error);
      // Fallback to local generation
    }
  }

  async generateAndSubmitInitialState(multiplayerContext: any, client: any) {
    // Import actions dynamically to avoid circular dependencies
    const { BoardController } = await import('../controllers/BoardController');
    const { GameEnvironment } = await import('../env/GameEnvironment');
    
    // Generate initial state with proper parameters
    // Create proper Player objects with IDs from playerConfigs
    const { PlayerController } = await import('../controllers/PlayerController');
    const playerConfigs = GameEnvironment.playerConfigs;
    
    const players: any[] = [];
    for (const config of playerConfigs) {
      const player = PlayerController.createPlayer(config.name, config.color, players);
      players.push(player);
    }
    
    const result = BoardController.initializeBoard(
      GameEnvironment.boardWidth,
      GameEnvironment.boardHeight,
      players
    );
    
    const gameState = {
      board: result.board,
      animals: result.animals,
      biomes: Array.from(result.biomes.entries()),
      players: result.updatedPlayers
    };

    // Submit to server
    await client.submitInitialState(gameState);
    
    // Apply to game store
    await this.applyStateToStore(gameState, multiplayerContext);
  }

  async loadSharedState(multiplayerContext: any, client: any) {
    let attempts = 0;
    while (attempts < 10) {
      try {
        const response = await client.getInitialState();
        if (response.gameState) {
          await this.applyStateToStore(response.gameState, multiplayerContext);
          return;
        }
      } catch (error) {
        // Waiting for host to submit state
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error('Timed out waiting for initial state');
  }

  async applyStateToStore(initialState: any, multiplayerContext: { isHost: boolean }) {
    const actions = await import('../store/actions');
    const { useGameStore } = await import('../store/gameStore');
    
    // Don't use actions.addPlayer() - it creates new IDs
    // Instead, directly use the players from shared state to preserve IDs
    
    // Apply the shared board state using store method directly
    useGameStore.getState().initializeBoard(
      initialState.board,
      initialState.animals,
      new Map(initialState.biomes),
      initialState.players
    );
    
    // Set correct activePlayerId based on host/guest
    const activePlayerId = multiplayerContext.isHost ? 0 : 1; // Host = Player 1 (ID 0), Guest = Player 2 (ID 1)
    useGameStore.getState().setActivePlayer(initialState.players, activePlayerId);
  }

  // DEV MODE: Generate multiplayer state locally without server
  async generateDevMultiplayerState(multiplayerContext: { isHost: boolean }) {
    // Reuse the host generation logic but apply locally
    const { BoardController } = await import('../controllers/BoardController');
    const { GameEnvironment } = await import('../env/GameEnvironment');
    const { PlayerController } = await import('../controllers/PlayerController');
    
    // Create proper Player objects with IDs
    const playerConfigs = GameEnvironment.playerConfigs;
    const players: any[] = [];
    for (const config of playerConfigs) {
      const player = PlayerController.createPlayer(config.name, config.color, players);
      players.push(player);
    }
    
    const result = BoardController.initializeBoard(
      GameEnvironment.boardWidth,
      GameEnvironment.boardHeight,
      players
    );
    
    const gameState = {
      board: result.board,
      animals: result.animals,
      biomes: Array.from(result.biomes.entries()),
      players: result.updatedPlayers
    };
    
    // Apply directly to store
    await this.applyStateToStore(gameState, multiplayerContext);
  }
}