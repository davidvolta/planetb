import type { Player, Board, Animal, Biome } from '../store/gameStore';

export class FogOfWarController {
  /**
   * Calculate visibility for all players when fog of war is enabled
   */
  static calculateVisibilityForPlayers(
    players: Player[],
    board: Board,
    animals: Animal[],
    biomes: Map<string, Biome>,
    eggs: Record<string, any>
  ): Player[] {
    return players.map(player => {
      const coordSet = new Set<string>();
      
      // Add visibility around player's animals
      animals
        .filter(a => a.ownerId === player.id && !(a.id in eggs))
        .forEach(a => {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const x = a.position.x + dx;
              const y = a.position.y + dy;
              if (x >= 0 && x < board.width && y >= 0 && y < board.height) {
                coordSet.add(`${x},${y}`);
              }
            }
          }
        });
      
      // Add visibility for owned biomes
      biomes.forEach((biome, biomeId) => {
        if (biome.ownerId === player.id) {
          for (let yy = 0; yy < board.height; yy++) {
            for (let xx = 0; xx < board.width; xx++) {
              if (board.tiles[yy][xx].biomeId === biomeId) {
                coordSet.add(`${xx},${yy}`);
              }
            }
          }
        }
      });
      
      return {
        ...player,
        visibleTiles: new Set(coordSet)
      };
    });
  }

  /**
   * Calculate full visibility for all players when fog of war is disabled
   */
  static calculateFullVisibilityForPlayers(
    players: Player[],
    board: Board
  ): Player[] {
    const allCoords = new Set<string>();
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        allCoords.add(`${x},${y}`);
      }
    }
    
    return players.map(player => ({
      ...player,
      visibleTiles: new Set(allCoords)
    }));
  }

  /**
   * Toggle fog of war and return updated players and state
   */
  static toggleFogOfWar(
    enabled: boolean,
    currentState: {
      players: Player[];
      board: Board | null;
      animals: Animal[];
      biomes: Map<string, Biome>;
      eggs: Record<string, any>;
    }
  ): { fogOfWarEnabled: boolean; players: Player[] } {
    if (!currentState.board) {
      return { fogOfWarEnabled: enabled, players: currentState.players };
    }

    if (enabled) {
      const updatedPlayers = this.calculateVisibilityForPlayers(
        currentState.players,
        currentState.board,
        currentState.animals,
        currentState.biomes,
        currentState.eggs
      );
      return { fogOfWarEnabled: true, players: updatedPlayers };
    } else {
      const updatedPlayers = this.calculateFullVisibilityForPlayers(
        currentState.players,
        currentState.board
      );
      return { fogOfWarEnabled: false, players: updatedPlayers };
    }
  }
}