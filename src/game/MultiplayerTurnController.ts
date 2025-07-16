import * as actions from '../store/actions';
import * as playerActions from '../selectors/playerActions';
import { useGameStore } from '../store/gameStore';
import { GameEnvironment } from '../env/GameEnvironment';

/**
 * Multiplayer turn controller that handles turn synchronization between host and guest
 * Builds on existing TurnController but adds online turn management
 */
export class MultiplayerTurnController {
  private isHost: boolean;
  private localPlayerId: number;
  private multiplayerClient: any;
  private isInitialized = false;

  constructor(isHost: boolean, localPlayerId: number, multiplayerClient: any) {
    this.isHost = isHost;
    this.localPlayerId = localPlayerId;
    this.multiplayerClient = multiplayerClient;
  }

  /**
   * Initialize the multiplayer turn system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set game mode to PVPONLINE
    GameEnvironment.mode = 'pvponline';

    // Set up state change listener for turn synchronization
    this.setupTurnSyncListener();
    
    this.isInitialized = true;
  }

  /**
   * Check if it's currently this player's turn
   */
  public isMyTurn(): boolean {
    const state = useGameStore.getState();
    return state.activePlayerId === this.localPlayerId;
  }

  /**
   * Check if the current player can take actions
   */
  public canTakeAction(): boolean {
    // In PVPONLINE, only allow actions on your turn
    return this.isMyTurn();
  }

  /**
   * Advance to the next player's turn (host only)
   */
  public async nextTurn(): Promise<void> {
    if (!this.isHost) {
      console.warn('Only host can advance turns');
      return;
    }

    const state = useGameStore.getState();
    const players = state.players;
    const currentPlayerId = state.activePlayerId;
    
    // Find next player
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayerId = players[nextIndex].id;

    // Update active player
    actions.setActivePlayer(players, nextPlayerId);
    actions.resetPlayerMovementAndEvents(nextPlayerId);

    // Sync state to server
    await this.syncTurnState();
  }

  /**
   * Wait for turn change from opponent
   */
  public async waitForTurnChange(): Promise<void> {
    if (this.isHost) {
      console.warn('Host controls turns, no need to wait');
      return;
    }

    return new Promise((resolve) => {
      const checkTurn = async () => {
        try {
          const response = await this.multiplayerClient.getGameState();
          const gameState = response.gameState;
          
          if (gameState && gameState.activePlayerId === this.localPlayerId) {
            // Update local state with new turn
            if (gameState.turn !== useGameStore.getState().turn) {
              actions.setActivePlayer(gameState.players, gameState.activePlayerId);
              actions.resetPlayerMovementAndEvents(gameState.activePlayerId);
            }
            resolve();
          } else {
            setTimeout(checkTurn, 1000); // Check every second
          }
        } catch (error) {
          console.error('Error checking turn state:', error);
          setTimeout(checkTurn, 1000);
        }
      };
      
      checkTurn();
    });
  }

  /**
   * Set up automatic turn synchronization
   */
  private setupTurnSyncListener(): void {
    if (!this.isHost) {
      // Guest: poll for turn changes
      const pollInterval = setInterval(async () => {
        try {
          const response = await this.multiplayerClient.getGameState();
          const gameState = response.gameState;
          
          if (gameState) {
            const currentState = useGameStore.getState();
            
            // Check if turn has changed
            if (gameState.activePlayerId !== currentState.activePlayerId || 
                gameState.turn !== currentState.turn) {
              
              // Update local state
              actions.setActivePlayer(gameState.players, gameState.activePlayerId);
              actions.resetPlayerMovementAndEvents(gameState.activePlayerId);
            }
          }
        } catch (error) {
          console.error('Error polling turn state:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Store interval for cleanup
      (window as any).turnSyncInterval = pollInterval;
    }
  }

  /**
   * Sync turn state to server (host only)
   */
  private async syncTurnState(): Promise<void> {
    if (!this.isHost) return;

    const state = useGameStore.getState();
    try {
      await this.multiplayerClient.updateGameState({
        turn: state.turn,
        activePlayerId: state.activePlayerId,
        players: state.players
      });
    } catch (error) {
      console.error('Failed to sync turn state:', error);
    }
  }

  /**
   * Get current turn status for UI
   */
  public getTurnStatus(): {
    isMyTurn: boolean;
    currentPlayerId: number;
    currentPlayerName: string;
    waitingForOpponent: boolean;
  } {
    const state = useGameStore.getState();
    const currentPlayer = state.players.find(p => p.id === state.activePlayerId);
    
    return {
      isMyTurn: this.isMyTurn(),
      currentPlayerId: state.activePlayerId,
      currentPlayerName: currentPlayer?.name || 'Unknown',
      waitingForOpponent: !this.isMyTurn()
    };
  }

  /**
   * Clean up turn synchronization
   */
  public cleanup(): void {
    if ((window as any).turnSyncInterval) {
      clearInterval((window as any).turnSyncInterval);
      delete (window as any).turnSyncInterval;
    }
  }
}