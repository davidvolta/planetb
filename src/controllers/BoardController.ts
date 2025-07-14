import { initializeBoard as initGameBoard } from '../game/GameInitializer';
import type { Board, Animal, Biome, Player, Tile } from '../store/gameStore';

export class BoardController {
  /**
   * Pure function to initialize board state
   * Returns new state objects without side effects
   */
  static initializeBoard(
    width: number, 
    height: number, 
    players: Player[]
  ): { board: Board; animals: Animal[]; biomes: Map<string, Biome>; updatedPlayers: Player[] } {
    const numPlayers = players.length;
    const { board, animals, biomes } = initGameBoard(width, height, numPlayers);
    
    // Calculate fog-of-war visibility for each player
    const updatedPlayers = players.map(player => {
      const coordSet = new Set<string>();
      
      // Add visibility around player's animals
      animals
        .filter(a => a.ownerId === player.id)
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

    return { board, animals, biomes, updatedPlayers };
  }

  /**
   * Pure function to get tile at coordinates
   */
  static getTile(x: number, y: number, board: Board | null): Tile | undefined {
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) return undefined;
    return board.tiles[y][x];
  }
}