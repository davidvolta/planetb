import type { GameState, Animal, Biome, Egg, Resource } from '../store/gameStore';
import { getPlayerView } from '../selectors/getPlayerView';
import { isTerrainCompatible } from '../utils/SpeciesUtils';
import type { GameCommand } from '../game/CommandExecutor';
import { MovementController } from './MovementController';

/**
 * AIController generates a sequence of commands for an AI player.
 * Uses PlayerView to ensure AI has the same limited information as human players.
 */
export class AIController {
  private seekerAssignments: Record<string, string> = {}; // animalId -> biomeId
  private playerView: ReturnType<typeof getPlayerView>;

  constructor(private gameState: GameState, private playerId: number) {
    this.playerView = getPlayerView(gameState, playerId);
  }

  /**
   * Build a list of move, capture, and harvest commands for all active, unmoved AI units.
   * Uses PlayerView data to ensure AI has the same limited information as human players.
   */
  public generateCommands(): GameCommand[] {
    const commands: GameCommand[] = [];
    
    if (!this.playerView || !this.playerView.board) return commands;

    const board = this.playerView.board;
    const resourcesRec: Record<string, Resource> = {};
    this.playerView.resources.forEach(r => {
      resourcesRec[`${r.position.x},${r.position.y}`] = r;
    });

    // Work on a local copy of visible animals
    let workingAnimals = this.playerView.animals.map(a => ({ ...a }));

    // Helper: Get all biomes owned by this player (always visible)
    const ownedBiomes = Array.from(this.playerView.biomes.values()).filter(b => b.ownerId === this.playerId);
    
    // Helper: Get all capturable biomes (only visible enemy biomes)
    const capturable = Array.from(this.playerView.biomes.values()).filter(b => b.ownerId !== this.playerId && b.ownerId !== null);

    // Helper: Track egg presence per biome (only visible eggs)
    const biomeHasEgg = new Map<string, boolean>();
    this.playerView.eggs.forEach((egg: Egg) => {
      biomeHasEgg.set(egg.biomeId, true);
    });

    // --- EGG SPAWNING LOGIC ---
    // Gather visible eggs that meet hatching criteria
    const eggsToConsider: { id: string; posX: number; posY: number; biomeId: string }[] = [];
    this.playerView.eggs.forEach((egg) => {
      if (egg.ownerId !== this.playerId) return;
      const biome = this.playerView.biomes.get(egg.biomeId);
      if (biome && biome.totalLushness >= 9.0) {
        eggsToConsider.push({ id: egg.id, posX: egg.position.x, posY: egg.position.y, biomeId: egg.biomeId });
      }
    });

    const eggs = [...eggsToConsider];
    eggs.forEach(egg => {
      commands.push({ type: 'spawn', animalId: egg.id });
      // Update working copy: if this egg was represented as dormant unit, mark it active.
      workingAnimals = workingAnimals.map(a =>
        a.id === egg.id ? { ...a, hasMoved: true } : a
      );
    });

    // Eligible units: active, owned by this AI, and not moved yet
    // Only use animals that are visible to this player (should be all owned animals)
    const ownedAnimalIds = new Set(this.playerView.animals.filter(a => a.ownerId === this.playerId).map(a => a.id));
    const units = workingAnimals.filter(a => a.ownerId === this.playerId && ownedAnimalIds.has(a.id) && !a.hasMoved);

    // --- DEFENSE ASSIGNMENT ---
    const defenderAssignments: Record<string, string> = {};
    const defenderAssignedUnits = new Set<string>();
    
    // Only consider visible enemy animals for threat detection
    for (const b of ownedBiomes) {
      const hx = b.habitat.position.x;
      const hy = b.habitat.position.y;
      
      // Threat if any visible enemy unit within 2 tiles
      const threat = workingAnimals.some(a =
        a.ownerId !== this.playerId && 
        Math.abs(a.position.x - hx) + Math.abs(a.position.y - hy) <= 2
      );
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
      const resourceHere: Resource | undefined = resourcesRec[`${ux},${uy}`];

      // Defense override
      const defendTarget = defenderAssignments[unit.id];
      if (defendTarget) {
        const { x: bx, y: by } = this.playerView.biomes.get(defendTarget)!.habitat.position;
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
            commands.push({ type: 'move', animalId: unit.id, x: moveTarget.x, y: moveTarget.y });
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
        const targetBiome = seekerTargetBiomeId ? this.playerView.biomes.get(seekerTargetBiomeId) : null;
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
            commands.push({ type: 'move', animalId: unit.id, x: moveTarget.x, y: moveTarget.y });
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
      const lushness = this.playerView.biomes.get(biomeId)!.totalLushness;
      const hasEgg = biomeHasEgg.get(biomeId) || false;
      // If lushness <= 6.0 and no egg, move to a new biome with lushness > 6.0 and resources
      if (lushness <= 6.0 && !hasEgg) {
        // Find nearest biome with lushness > 6.0 and available resources
        let targetBiome: Biome | null = null;
        let bestDist = Infinity;
        for (const b of ownedBiomes) {
          const targetBiomeLushness = this.playerView.biomes.get(b.id)!.totalLushness;
          if (targetBiomeLushness > 6.0) {
            // Check for available resources in this biome
            const resourceTiles = this.getResourceTilesForBiome(b, resourcesRec);
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
          const resourceTiles = this.getResourceTilesForBiome(targetBiome, resourcesRec);
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
            commands.push({ type: 'move', animalId: unit.id, x: moveTarget.x, y: moveTarget.y });
            workingAnimals = workingAnimals.map(a =>
              a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
            );
          }
        }
        continue;
      }
      // If lushness > 6.0 or egg produced, harvest if on a resource tile, else move to one
      const resourceTiles = this.getResourceTilesForBiome(this.playerView.biomes.get(biomeId)!, resourcesRec);
      // If on a resource tile, harvest
      if (resourceHere && resourceHere.active && resourceHere.value > 0) {
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
        commands.push({ type: 'move', animalId: unit.id, x: moveTarget.x, y: moveTarget.y });
        workingAnimals = workingAnimals.map(a =>
          a.id === unit.id ? { ...a, position: { x: moveTarget.x, y: moveTarget.y }, hasMoved: true } : a
        );
      }
    }

    return commands;
  }

  // Helper: Get all resource tiles for a biome using visible resources
  private getResourceTilesForBiome(biome: Biome, resources: Record<string, Resource>): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    this.playerView.resources.forEach(r => {
      if (r.biomeId === biome.id && r.active && r.value > 0) {
        tiles.push({ x: r.position.x, y: r.position.y });
      }
    });
    return tiles;
  }
} 