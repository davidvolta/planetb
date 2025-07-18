// EggProducer: pure helper to generate eggs each turn
import { Board, Biome, Egg } from '../store/gameStore';
import { EcosystemController } from './EcosystemController';
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
   * @param resources Current resources record
   */
  static produce(
    turn: number,
    playerId: number,
    board: Board,
    biomes: Map<string, Biome>,
    resources: Record<string, import('../store/gameStore').Resource>
  ): ProduceResult {
    const updatedBiomes = new Map(biomes);
    const newEggs: Egg[] = [];

    // Only produce eggs on even turns
    if (turn % 2 !== 0) {
      return { eggs: newEggs, biomes: updatedBiomes };
    }

    biomes.forEach((biome, biomeId) => {
      if (biome.ownerId !== playerId) return;
      // Egg production is now purely based on production rate and lushness threshold
      if (biome.totalLushness < EGG_PRODUCTION_THRESHOLD) return;

      // Valid placement tiles prioritized by resource adjacency
      const placementTiles = EcosystemController.getValidEggPlacementTiles(
        biomeId,
        board,
        resources,
        biomes
      );
      if (placementTiles.length === 0) return;

      const eggsToPlace = Math.min(biome.productionRate, placementTiles.length);

      for (let i = 0; i < eggsToPlace; i++) {
        const tile = placementTiles[i];
        const eggId = generateEggId(biomeId);
        const egg: Egg = {
          id: eggId,
          ownerId: playerId,
          position: tile,
          biomeId,
          createdAtTurn: turn
        };
        newEggs.push(egg);
      }

      // Update biome turn stamp
      updatedBiomes.set(biomeId, { ...biome, lastProductionTurn: turn });
    });

    return { eggs: newEggs, biomes: updatedBiomes };
  }
} 