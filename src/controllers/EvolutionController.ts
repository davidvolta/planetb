import { Animal, Board, Biome, Egg } from "../store/gameStore";
import { TerrainType } from "../types/gameTypes";
import { MovementController } from "./MovementController";
import { EcosystemController } from "./EcosystemController";
import { generateAnimalId } from "../utils/IdGenerator";
import { DisplacementEvent, BLANK_DISPLACEMENT_EVENT } from "../types/events";

interface SpawnAnimalParams {
  eggId: string;
  animals: Animal[];
  eggs: Record<string, Egg>;
  biomes: Map<string, Biome>;
  board: Board;
  turn: number;
}

interface SpawnAnimalResult {
  animals: Animal[];
  board: Board;
  biomes: Map<string, Biome>;
  eggs: Record<string, Egg>;
  displacementEvent: DisplacementEvent;
  newAnimalId: string;
  biomeIdAffected: string | null;
}

export class EvolutionController {
  /**
   * Spawn an animal from the given eggId. Returns a fully-formed diff with no side-effects.
   */
  public static spawnAnimal({ eggId, animals, eggs, biomes, board }: SpawnAnimalParams): SpawnAnimalResult {

    const defaultDisp: DisplacementEvent = { ...BLANK_DISPLACEMENT_EVENT };

    const egg = eggs[eggId];
    if (!egg) {
      console.warn(`[EvolutionController] spawnAnimal failed – egg ${eggId} not found`);
      return {
        animals,
        board,
        biomes,
        eggs,
        displacementEvent: defaultDisp,
        newAnimalId: "",
        biomeIdAffected: null,
      };
    }

    const { position } = egg;
    let updatedAnimals = animals;
    let displacementEvent: DisplacementEvent = { ...defaultDisp };

    // ---------------------------------------------------------------------
    // Resolve collision via MovementController helper
    // ---------------------------------------------------------------------
    const collisionResult = MovementController.resolveSpawnCollision(
      position.x,
      position.y,
      animals,
      board
    );
    updatedAnimals = collisionResult.animals;
    displacementEvent = collisionResult.displacementEvent;

    // ---------------------------------------------------------------------
    // Spawn the new animal
    // ---------------------------------------------------------------------
    const tile = board.tiles[position.y][position.x];
    const species = EvolutionController.getSpeciesForTerrain(tile.terrain);
    const newAnimal: Animal = {
      id: generateAnimalId(species),
      species,
      position: { ...position },
      previousPosition: null,
      hasMoved: true, // newly spawned counts as moved this turn
      ownerId: egg.ownerId,
      facingDirection: 'left',
    };

    const finalAnimals: Animal[] = [...updatedAnimals, newAnimal];

    // ---------------------------------------------------------------------
    // Update biome lushness only for the affected biome (if any)
    // ---------------------------------------------------------------------
    const biomeId = tile.biomeId;
    const newBiomes = biomeId
      ? EcosystemController.recalcBiomeLushness(biomes, biomeId, board)
      : biomes;

    // ---------------------------------------------------------------------
    // Remove egg from record
    // ---------------------------------------------------------------------
    const { [eggId]: _removed, ...remainingEggs } = eggs;

    return {
      animals: finalAnimals,
      board,
      biomes: newBiomes,
      eggs: remainingEggs,
      displacementEvent,
      newAnimalId: newAnimal.id,
      biomeIdAffected: biomeId ?? null,
    };
  }

  /**
   * Helper to derive species from terrain.
   */
  private static getSpeciesForTerrain(terrain: TerrainType): string {
    const terrainSpeciesMap: Record<TerrainType, string> = {
      [TerrainType.GRASS]: "buffalo",
      [TerrainType.MOUNTAIN]: "bird",
      [TerrainType.WATER]: "turtle",
      [TerrainType.UNDERWATER]: "octopus",
      [TerrainType.BEACH]: "snake",
    };
    return terrainSpeciesMap[terrain] || "snake";
  }
} 