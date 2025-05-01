import type { GameState, Animal, Biome, Board } from '../store/gameStore';
import { AnimalState } from '../store/gameStore';
import type { GameCommand } from './CommandExecutor';
import { MovementController } from './MovementController';

/**
 * AIController generates a sequence of commands for an AI player.
 */
export class AIController {
  constructor(private gameState: GameState, private playerId: number) {}

  /**
   * Build a list of move and capture commands for all active, unmoved AI units.
   */
  public generateCommands(): GameCommand[] {
    const commands: GameCommand[] = [];
    const board = this.gameState.board;
    if (!board) return commands;

    // Work on a local copy of animals so we can update positions/states as commands are generated
    let workingAnimals = this.gameState.animals.map(a => ({ ...a }));

    // Spawn eggs only from biomes with total lushness >= 9.0
    const eggs = workingAnimals.filter(a => {
      if (a.ownerId !== this.playerId || a.state !== AnimalState.DORMANT) return false;
      const board = this.gameState.board;
      if (!board) return false;
      const tile = board.tiles[a.position.y]?.[a.position.x];
      if (!tile?.biomeId) return false;
      const biome = this.gameState.biomes.get(tile.biomeId);
      return biome !== undefined && biome.totalLushness >= 9.0;
    });
    eggs.forEach(egg => {
      commands.push({ type: 'evolve', unitId: egg.id });
      // Update working copy: egg becomes active and flagged moved
      workingAnimals = workingAnimals.map(a =>
        a.id === egg.id ? { ...a, state: AnimalState.ACTIVE, hasMoved: true } : a
      );
    });

    // Eligible units: active, owned by this AI, and not moved yet
    const units = workingAnimals.filter(a => a.ownerId === this.playerId && a.state === AnimalState.ACTIVE && !a.hasMoved);
    // Biomes that can be captured (ownerId === null)
    const capturable = Array.from(this.gameState.biomes.values()).filter(b => b.ownerId === null);

    for (const unit of units) {
      const { x: ux, y: uy } = unit.position;
      const tile = board.tiles[uy]?.[ux];
      // If on a capturable habitat tile, capture it
      if (tile?.isHabitat && tile.biomeId && capturable.find(b => b.id === tile.biomeId)) {
        commands.push({ type: 'capture', biomeId: tile.biomeId });
        continue;
      }
      // Find nearest capturable biome by Manhattan distance from the habitat
      let nearest: { biome: Biome; habitat: { x: number; y: number } } | null = null;
      let bestDist = Infinity;
      for (const b of capturable) {
        const { x: bx, y: by } = b.habitat.position;
        const dist = Math.abs(ux - bx) + Math.abs(uy - by);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = { biome: b, habitat: { x: bx, y: by } };
        }
      }
      if (!nearest) continue;

      // Choose the valid move that gets closer to that biome's habitat
      const legal = MovementController.calculateValidMoves(unit, board, workingAnimals);
      let moveTarget = null;
      let moveDist = bestDist;
      for (const m of legal) {
        const dist = Math.abs(m.x - nearest.habitat.x) + Math.abs(m.y - nearest.habitat.y);
        if (dist < moveDist) {
          moveDist = dist;
          moveTarget = m;
        }
      }
      if (moveTarget) {
        commands.push({ type: 'move', unitId: unit.id, x: moveTarget.x, y: moveTarget.y });
        // Update working copy to prevent later collisions
        workingAnimals = workingAnimals.map(a =>
          a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
        );
      }
    }

    return commands;
  }
} 