import type { Player } from '../store/gameStore';

export class PlayerController {
  /**
   * Create a new player with appropriate defaults
   */
  static createPlayer(name: string, color: string, existingPlayers: Player[]): Player {
    console.log(`[${new Date().toISOString()}] Player created: ${name} (ID: ${existingPlayers.length})`);
    
    return {
      id: existingPlayers.length,
      name,
      color,
      isActive: existingPlayers.length === 0, // First player starts active
      energy: 0,
      visibleTiles: new Set<string>()
    };
  }

  /**
   * Update which player is active
   */
  static updateActivePlayer(playerId: number, players: Player[]): { players: Player[]; activePlayerId: number } {
    const updatedPlayers = players.map(player => ({
      ...player,
      isActive: player.id === playerId
    }));
    
    return { players: updatedPlayers, activePlayerId: playerId };
  }
}