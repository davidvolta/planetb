// EggProducer: pure helper to generate eggs each turn
import { Board, Biome, Egg } from '../store/gameStore';
import { getEggPlacementTiles } from '../store/actions';
import { generateEggId } from '../utils/IdGenerator';
import { EGG_PRODUCTION_THRESHOLD } from '../constants/gameConfig';

interface ProduceResult {
  eggs: Egg[];
  biomes: Map<string, Biome>;
}

export class EggProducer {
  /**
   * Produce eggs for a single player across their owned biomes.
   * @param turn Current turn number
   * @param playerId Active player id
   * @param board Current board snapshot (not mutated)
   * @param biomes Biome map (will be cloned & updated)
   * @param existingEggs Existing eggs record – used to avoid double-ids
   */
  static produce(
    turn: number,
    playerId: number,
    board: Board,
    biomes: Map<string, Biome>,
    existingEggs: Record<string, Egg>
  ): ProduceResult {
    const updatedBiomes = new Map(biomes);
    const newEggs: Egg[] = [];

    biomes.forEach((biome, biomeId) => {
      if (biome.ownerId !== playerId) return;
      // Simple cooldown: every even turn, like before (can tweak later)
      if (turn % 2 !== 0) return;
      if (biome.totalLushness < EGG_PRODUCTION_THRESHOLD) return;

      // Valid placement tiles
      const blankTiles = getEggPlacementTiles(biomeId);
      if (blankTiles.length === 0) return;

      const eggsToPlace = Math.min(biome.productionRate, blankTiles.length);

      for (let i = 0; i < eggsToPlace; i++) {
        const tile = blankTiles[i];
        const eggId = generateEggId(biomeId);
        const egg: Egg = {
          id: eggId,
          ownerId: playerId,
          position: tile,
          biomeId,
          createdAtTurn: turn
        };
        console.log(`[EggProducer] Egg created: ${eggId} biome=${biomeId} owner=${playerId} at (${tile.x},${tile.y})`);
        newEggs.push(egg);
      }

      // Update biome turn stamp
      updatedBiomes.set(biomeId, { ...biome, lastProductionTurn: turn });
    });

    return { eggs: newEggs, biomes: updatedBiomes };
  }
} 