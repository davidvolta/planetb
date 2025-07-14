import { useGameStore, Player } from '../gameStore';
import { PlayerController } from '../../controllers/PlayerController';

/**
 * Get the current active player's ID
 */
export function getActivePlayerId(): number {
  return useGameStore.getState().activePlayerId;
}

/**
 * Get all players in the game
 */
export function getPlayers(): Player[] {
  return useGameStore.getState().players;
}

/**
 * Set the active player by ID
 * @param playerId The ID of the player to set as active
 */
export function setActivePlayer(playerId: number): void {
  const state = useGameStore.getState();
  const result = PlayerController.updateActivePlayer(playerId, state.players);
  useGameStore.getState().setActivePlayer(result.players, result.activePlayerId);
}

/**
 * Add a player to the game
 * @param name Player name
 * @param color Player color in hex format
 */
export function addPlayer(name: string, color: string): void {
  const state = useGameStore.getState();
  const newPlayer = PlayerController.createPlayer(name, color, state.players);
  useGameStore.getState().addPlayer(newPlayer);
}