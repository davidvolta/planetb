import type { GameCommand } from '../game/CommandExecutor';
import type { GameState, Animal, Tile } from '../store/gameStore';
import { MovementController } from '../controllers/MovementController';

export function canExecuteCommand(cmd: GameCommand, state: GameState, playerId: number): boolean {
  const { board, animals, eggs, biomes } = state;

  switch (cmd.type) {
    case 'move': {
      if (!board) return false;
      const unit = animals.find((a: Animal) => a.id === cmd.animalId);
      if (!unit || unit.hasMoved) return false;

      const legalMoves = MovementController.calculateValidMoves(unit, board, animals);
      return legalMoves.some(m => m.x === cmd.x && m.y === cmd.y);
    }

    case 'spawn': {
      return !!eggs[cmd.animalId];
    }

    case 'capture': {
      // Check biome exists
      const biome = biomes.get(cmd.biomeId ?? '');
      if (!biome) return false;
      // Biome must not already be owned by the player
      // We assume cmd has a playerId property (add to your command type if not present)
      if (biome.ownerId === playerId) return false;
      // There must be a unit owned by the player on the habitat tile with hasMoved === false
      const { x, y } = biome.habitat.position;
      const unitOnHabitat = animals.find(
        (a: Animal) => a.ownerId === playerId && a.position.x === x && a.position.y === y && !a.hasMoved
      );
      return !!unitOnHabitat;
    }

    case 'harvest': {
      if (!board) return false;
      const tile = board.tiles?.[cmd.y]?.[cmd.x] as Tile | undefined;
      return !!tile && !!tile.resourceType && tile.resourceValue > 0;
    }

    default:
      return false;
  }
}
