import type { GameState, Animal, Biome, Board, Egg } from '../store/gameStore';
import { isTerrainCompatible } from '../utils/SpeciesUtils';
import type { GameCommand } from '../game/CommandExecutor';
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

    // Helper: Track egg presence per biome (from egg record)
    const biomeHasEgg = new Map<string, boolean>();
    Object.values(this.gameState.eggs).forEach((egg: Egg) => {
      biomeHasEgg.set(egg.biomeId, true);
    });

    // --- EGG SPAWNING LOGIC ---
    // Gather eggs from record that meet hatching criteria
    const eggsToConsider: { id: string; posX: number; posY: number; biomeId: string }[] = [];
    Object.values(this.gameState.eggs).forEach((egg) => {
      if (egg.ownerId !== this.playerId) return;
      const biome = this.gameState.biomes.get(egg.biomeId);
      if (biome && biome.totalLushness >= 9.0) {
        eggsToConsider.push({ id: egg.id, posX: egg.position.x, posY: egg.position.y, biomeId: egg.biomeId });
      }
    });

    const eggs = [...eggsToConsider];
    eggs.forEach(egg => {
      commands.push({ type: 'spawn', unitId: egg.id });
      // Update working copy: if this egg was represented as dormant unit, mark it active.
      workingAnimals = workingAnimals.map(a =>
        a.id === egg.id ? { ...a, hasMoved: true } : a
      );
    });

    // Eligible units: active, owned by this AI, and not moved yet
    const eggsRecord3 = this.gameState.eggs || {};
    const units = workingAnimals.filter(a => a.ownerId === this.playerId && !(a.id in eggsRecord3) && !a.hasMoved);

    // --- DEFENSE ASSIGNMENT ---
    const defenderAssignments: Record<string, string> = {};
    const defenderAssignedUnits = new Set<string>();
    const aiOwnedBiomes = Array.from(this.gameState.biomes.values()).filter(b => b.ownerId === this.playerId);
    for (const b of aiOwnedBiomes) {
      const hx = b.habitat.position.x;
      const hy = b.habitat.position.y;
      // Threat if any enemy unit within 2 tiles
      const threat = workingAnimals.some(a => a.ownerId !== this.playerId && Math.abs(a.position.x - hx) + Math.abs(a.position.y - hy) <= 2);
      if (!threat) continue;
      let bestUnit: Animal | null = null;
      let bestDist = Infinity;
      for (const unit of units) {
        if (defenderAssignedUnits.has(unit.id)) continue;
        const dist = Math.abs(unit.position.x - hx) + Math.abs(unit.position.y - hy);
        if (dist < bestDist) {
          bestDist = dist;
          bestUnit = unit;
        }
      }
      if (bestUnit) {
        defenderAssignments[bestUnit.id] = b.id;
        defenderAssignedUnits.add(bestUnit.id);
      }
    }

    // --- MULTI-SEEKER ASSIGNMENT ---
    this.seekerAssignments = {};
    const capturableBiomes = capturable.slice();
    const unassignedUnits = units.filter(u => !defenderAssignedUnits.has(u.id));
    const assignedUnits = new Set<string>(defenderAssignedUnits);
    const assignedBiomes = new Set<string>();
    const occupancyPenalty = 2;
    // 1. Units already on target habitat (seeker)
    for (const unit of unassignedUnits) {
      for (const b of capturableBiomes) {
        if (assignedBiomes.has(b.id)) continue;
        const { x: ux, y: uy } = unit.position;
        const { x: bx, y: by } = b.habitat.position;
        if (ux === bx && uy === by) {
          this.seekerAssignments[unit.id] = b.id;
          assignedUnits.add(unit.id);
          assignedBiomes.add(b.id);
          break;
        }
      }
    }
    // 2. Weighted occupancy seekers
    const targets = capturableBiomes.map(b => {
      const hx = b.habitat.position.x;
      const hy = b.habitat.position.y;
      const occupied = workingAnimals.some(a => a.position.x === hx && a.position.y === hy);
      return { biome: b, hx, hy, occupied };
    });
    for (const unit of unassignedUnits) {
      if (assignedUnits.has(unit.id)) continue;
      let bestTarget: { biome: Biome; hx: number; hy: number; occupied: boolean } | null = null;
      let bestScore = Infinity;
      for (const t of targets) {
        if (assignedBiomes.has(t.biome.id)) continue;
        if (!isTerrainCompatible(unit.species, board.tiles[t.hy][t.hx].terrain)) continue;
        const dist = Math.abs(unit.position.x - t.hx) + Math.abs(unit.position.y - t.hy);
        const score = dist + (t.occupied ? 0 : occupancyPenalty);
        if (score < bestScore) {
          bestScore = score;
          bestTarget = t;
        }
      }
      if (bestTarget) {
        this.seekerAssignments[unit.id] = bestTarget.biome.id;
        assignedUnits.add(unit.id);
        assignedBiomes.add(bestTarget.biome.id);
      }
    }

    // --- COMMAND GENERATION ---
    for (const unit of units) {
      const { x: ux, y: uy } = unit.position;
      const tile = board.tiles[uy]?.[ux];
      // Defense override
      const defendTarget = defenderAssignments[unit.id];
      if (defendTarget) {
        const { x: bx, y: by } = this.gameState.biomes.get(defendTarget)!.habitat.position;
        // Move back to habitat if not already there
        if (ux !== bx || uy !== by) {
          const legal = MovementController.calculateValidMoves(unit, board, workingAnimals);
          let moveTarget = null;
          let bestDist = Math.abs(ux - bx) + Math.abs(uy - by);
          for (const m of legal) {
            const dist = Math.abs(m.x - bx) + Math.abs(m.y - by);
            if (dist < bestDist) {
              bestDist = dist;
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
      const lushness = this.gameState.biomes.get(biomeId)!.totalLushness;
      const hasEgg = biomeHasEgg.get(biomeId) || false;
      // If lushness <= 6.0 and no egg, move to a new biome with lushness > 6.0 and resources
      if (lushness <= 6.0 && !hasEgg) {
        // Find nearest biome with lushness > 6.0 and available resources
        let targetBiome: Biome | null = null;
        let bestDist = Infinity;
        for (const b of ownedBiomes) {
          const targetBiomeLushness = this.gameState.biomes.get(b.id)!.totalLushness;
          if (targetBiomeLushness > 6.0) {
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