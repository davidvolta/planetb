import type { GameState, Animal, Biome, Board } from '../store/gameStore';
import { AnimalState, isTerrainCompatible } from '../store/gameStore';
import type { GameCommand } from './CommandExecutor';
import { MovementController } from './MovementController';

/**
 * AIController generates a sequence of commands for an AI player.
 */
export class AIController {
  // No longer a single seeker; use a map for multiple seekers
  private seekerAssignments: Record<string, string> = {}; // unitId -> biomeId

  constructor(private gameState: GameState, private playerId: number) {}

  /**
   * Build a list of move, capture, and harvest commands for all active, unmoved AI units.
   */
  public generateCommands(): GameCommand[] {
    const commands: GameCommand[] = [];
    const board = this.gameState.board;
    if (!board) return commands;

    // Work on a local copy of animals so we can update positions/states as commands are generated
    let workingAnimals = this.gameState.animals.map(a => ({ ...a }));

    // Helper: Get all biomes owned by this player
    const ownedBiomes = Array.from(this.gameState.biomes.values()).filter(b => b.ownerId === this.playerId);
    // Helper: Get all capturable biomes
    const capturable = Array.from(this.gameState.biomes.values()).filter(b => b.ownerId !== this.playerId);

    // Helper: Track egg production per biome (dormant units in biome)
    const biomeHasEgg = new Map<string, boolean>();
    for (const a of workingAnimals) {
      if (a.state === AnimalState.DORMANT) {
        const tile = board.tiles[a.position.y]?.[a.position.x];
        if (tile?.biomeId) biomeHasEgg.set(tile.biomeId, true);
      }
    }

    // Helper: Get lushness for a biome
    const getLushness = (biomeId: string) => this.gameState.biomes.get(biomeId)?.totalLushness ?? 0;

    // --- EGG SPAWNING (EVOLVE) LOGIC ---
    const eggs = workingAnimals.filter(a => {
      if (a.ownerId !== this.playerId || a.state !== AnimalState.DORMANT) return false;
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

    // --- MULTI-SEEKER ASSIGNMENT ---
    // For each eligible unit, assign the nearest capturable biome (no duplicates unless forced)
    this.seekerAssignments = {};
    const capturableBiomes = capturable.slice();
    const unassignedUnits = units.slice();
    const assignedBiomes = new Set<string>();
    // 1. First, assign units already standing on a capturable biome's habitat
    for (const unit of unassignedUnits) {
      for (const b of capturableBiomes) {
        if (assignedBiomes.has(b.id) && assignedBiomes.size < capturableBiomes.length) continue;
        const { x: ux, y: uy } = unit.position;
        const { x: bx, y: by } = b.habitat.position;
        const habitatTile = board.tiles[by][bx];
        if (!habitatTile) continue;
        if (!isTerrainCompatible(unit.species, habitatTile.terrain)) continue;
        if (ux === bx && uy === by) {
          this.seekerAssignments[unit.id] = b.id;
          assignedBiomes.add(b.id);
          break; // Don't assign this unit to any other biome
        }
      }
    }
    // 2. Then, assign remaining units to their nearest capturable biome
    for (const unit of unassignedUnits) {
      if (this.seekerAssignments[unit.id]) continue; // Already assigned above
      let bestBiome: Biome | null = null;
      let bestDist = Infinity;
      for (const b of capturableBiomes) {
        if (assignedBiomes.has(b.id) && assignedBiomes.size < capturableBiomes.length) continue;
        const habitatTile = board.tiles[b.habitat.position.y][b.habitat.position.x];
        if (!habitatTile) continue;
        if (!isTerrainCompatible(unit.species, habitatTile.terrain)) continue;
        const dist = Math.abs(unit.position.x - b.habitat.position.x) + Math.abs(unit.position.y - b.habitat.position.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestBiome = b;
        }
      }
      if (bestBiome) {
        this.seekerAssignments[unit.id] = bestBiome.id;
        assignedBiomes.add(bestBiome.id);
      }
    }

    // --- COMMAND GENERATION ---
    for (const unit of units) {
      const { x: ux, y: uy } = unit.position;
      const tile = board.tiles[uy]?.[ux];
      const biomeId = tile?.biomeId;
      const seekerTargetBiomeId = this.seekerAssignments[unit.id];
      const isSeeker = !!seekerTargetBiomeId;

      // --- SEEKER LOGIC ---
      if (isSeeker) {
        const targetBiome = seekerTargetBiomeId ? this.gameState.biomes.get(seekerTargetBiomeId) : null;
        if (targetBiome) {
          const { x: bx, y: by } = targetBiome.habitat.position;
          if (ux === bx && uy === by && tile?.isHabitat && tile.biomeId === targetBiome.id) {
            commands.push({ type: 'capture', biomeId: tile.biomeId });
            // After capture, this unit will be available for reassignment next turn
            continue;
          }
          // Move toward the target biome's habitat
          const legal = MovementController.calculateValidMoves(unit, board, workingAnimals);
          let moveTarget = null;
          let moveDist = Math.abs(ux - bx) + Math.abs(uy - by);
          for (const m of legal) {
            const dist = Math.abs(m.x - bx) + Math.abs(m.y - by);
            if (dist < moveDist) {
              moveDist = dist;
              moveTarget = m;
            }
          }
          if (moveTarget) {
            commands.push({ type: 'move', unitId: unit.id, x: moveTarget.x, y: moveTarget.y });
            workingAnimals = workingAnimals.map(a =>
              a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
            );
          }
        }
        continue;
      }

      // --- HARVESTER LOGIC ---
      // If not on a biome, skip
      if (!biomeId) continue;
      const lushness = getLushness(biomeId);
      const hasEgg = biomeHasEgg.get(biomeId) || false;
      // If lushness <= 6.0 and no egg, move to a new biome with lushness > 6.0 and resources
      if (lushness <= 6.0 && !hasEgg) {
        // Find nearest biome with lushness > 6.0 and available resources
        let targetBiome: Biome | null = null;
        let bestDist = Infinity;
        for (const b of ownedBiomes) {
          if (getLushness(b.id) > 6.0) {
            // Check for available resources in this biome
            const resourceTiles = this.getResourceTilesForBiome(b, board);
            if (resourceTiles.length > 0) {
              // Find distance to nearest resource tile in this biome
              for (const t of resourceTiles) {
                const dist = Math.abs(ux - t.x) + Math.abs(uy - t.y);
                if (dist < bestDist) {
                  bestDist = dist;
                  targetBiome = b;
                }
              }
            }
          }
        }
        if (targetBiome) {
          // Move toward the nearest resource tile in the target biome
          const resourceTiles = this.getResourceTilesForBiome(targetBiome, board);
          let moveTarget = null;
          let moveDist = Infinity;
          for (const t of resourceTiles) {
            const legal = MovementController.calculateValidMoves(unit, board, workingAnimals);
            for (const m of legal) {
              const dist = Math.abs(m.x - t.x) + Math.abs(m.y - t.y);
              if (dist < moveDist) {
                moveDist = dist;
                moveTarget = m;
              }
            }
          }
          if (moveTarget) {
            commands.push({ type: 'move', unitId: unit.id, x: moveTarget.x, y: moveTarget.y });
            workingAnimals = workingAnimals.map(a =>
              a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
            );
          }
        }
        continue;
      }
      // If lushness > 6.0 or egg produced, harvest if on a resource tile, else move to one
      const resourceTiles = this.getResourceTilesForBiome(this.gameState.biomes.get(biomeId)!, board);
      // If on a resource tile, harvest
      if (tile.active && tile.resourceType && tile.resourceValue > 0) {
        commands.push({ type: 'harvest', x: ux, y: uy, amount: 3 });
        workingAnimals = workingAnimals.map(a =>
          a.id === unit.id ? { ...a, hasMoved: true } : a
        );
        continue;
      }
      // Otherwise, move to nearest resource tile in this biome
      let moveTarget = null;
      let moveDist = Infinity;
      for (const t of resourceTiles) {
        const legal = MovementController.calculateValidMoves(unit, board, workingAnimals);
        for (const m of legal) {
          const dist = Math.abs(m.x - t.x) + Math.abs(m.y - t.y);
          if (dist < moveDist) {
            moveDist = dist;
            moveTarget = m;
          }
        }
      }
      if (moveTarget) {
        commands.push({ type: 'move', unitId: unit.id, x: moveTarget.x, y: moveTarget.y });
        workingAnimals = workingAnimals.map(a =>
          a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
        );
      }
    }

    return commands;
  }

  // Helper: Get all resource tiles for a biome
  private getResourceTilesForBiome(biome: Biome, board: Board): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.biomeId === biome.id && tile.active && tile.resourceType && tile.resourceValue > 0) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  }
} 