import * as actions from '../store/actions';
import * as playerActions from '../selectors/playerActions';
import { useGameStore } from '../store/gameStore';

/**
 * Turn controller for online PVP games.
 * Handles turn synchronization between host and guest players.
 */
export class OnlineTurnController {
  private isHost: boolean;
  private localPlayerId: number;
  private multiplayerClient: any;

  constructor(isHost: boolean, localPlayerId: number, multiplayerClient: any) {
    this.isHost = isHost;
    this.localPlayerId = localPlayerId;
    this.multiplayerClient = multiplayerClient;
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
    await this.syncState();
  }

  /**
   * Wait for opponent's turn to complete (guest only)
   */
  public async waitForTurn(): Promise<void> {
    if (this.isHost) {
      console.warn('Host doesn't need to wait for turns');
      return;
    }

    return new Promise((resolve) => {
      const checkTurn = () => {
        if (this.isMyTurn()) {
          resolve();
        } else {
          setTimeout(checkTurn, 1000); // Check every second
        }
      };
      checkTurn();
    });
  }

  /**
   * Sync current game state to server (host only)
   */
  private async syncState(): Promise<void> {
    if (!this.isHost) return;

    const state = useGameStore.getState();
    try {
      await this.multiplayerClient.updateGameState({
        turn: state.turn,
        activePlayerId: state.activePlayerId,
        players: state.players,
        animals: state.animals,
        biomes: Array.from(state.biomes.entries()),
        eggs: state.eggs,
        resources: state.resources
      });
    } catch (error) {
      console.error('Failed to sync state:', error);
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
}