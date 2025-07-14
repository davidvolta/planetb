import { MovementController } from './MovementController';
import type { Animal, Board, Biome, Coordinate, ValidMove } from '../store/gameStore';

export interface SelectionState {
  selectedAnimalID: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  selectedEggId: string | null;
  selectedResource: Coordinate | null;
  selectedBiomeId?: string | null;
}

export class SelectionController {
  /**
   * Handle animal selection logic
   */
  static selectAnimal(
    animalId: string | null,
    animals: Animal[],
    board: Board | null
  ): SelectionState {
    if (!animalId) {
      return {
        selectedAnimalID: null,
        validMoves: [],
        moveMode: false,
        selectedEggId: null,
        selectedResource: null
      };
    }

    const animal = animals.find(a => a.id === animalId);
    if (animal && animal.hasMoved) {
      console.log(`Cannot select animal ${animalId} for movement - it has already moved this turn`);
      return {
        selectedAnimalID: animalId,
        validMoves: [],
        moveMode: false,
        selectedEggId: null,
        selectedResource: null
      };
    }

    const validMoves = animal && board
      ? MovementController.calculateValidMoves(animal, board, animals)
      : [];

    return {
      selectedAnimalID: animalId,
      validMoves,
      moveMode: true,
      selectedEggId: null,
      selectedResource: null
    };
  }

  /**
   * Handle biome selection logic
   */
  static selectBiome(
    biomeId: string | null,
    biomes: Map<string, Biome>
  ): SelectionState {
    if (biomeId === null) {
      return {
        selectedBiomeId: null,
        selectedAnimalID: null,
        validMoves: [],
        moveMode: false,
        selectedEggId: null,
        selectedResource: null
      };
    }

    const biome = biomes.get(biomeId);
    if (biome) {
      return {
        selectedBiomeId: biomeId,
        selectedAnimalID: null,
        validMoves: [],
        moveMode: false,
        selectedEggId: null,
        selectedResource: null
      };
    }

    return {
      selectedBiomeId: null,
      selectedAnimalID: null,
      validMoves: [],
      moveMode: false,
      selectedEggId: null,
      selectedResource: null
    };
  }

  /**
   * Create selection state for resource selection
   */
  static selectResource(coord: Coordinate | null): SelectionState {
    return {
      selectedResource: coord,
      selectedAnimalID: null,
      validMoves: [],
      moveMode: false,
      selectedEggId: null
    };
  }

  /**
   * Create selection state for egg selection
   */
  static selectEgg(eggId: string | null): SelectionState {
    return {
      selectedEggId: eggId,
      selectedAnimalID: null,
      validMoves: [],
      moveMode: false,
      selectedResource: null
    };
  }
}