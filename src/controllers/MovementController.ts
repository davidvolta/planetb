import { Animal, Board, Coordinate } from "../store/gameStore";
import { isTerrainCompatible, getSpeciesMoveRange } from "../utils/SpeciesUtils";
import { getEggs } from "../store/actions";

export class MovementController {
  /**
   * Get adjacent tiles valid for displacement
   */
  public static getValidDisplacementTiles(
    position: Coordinate,
    animals: Animal[],
    board: Board | null
  ): Coordinate[] {
    if (!board) return [];
    const { x, y } = position;
    const validTiles: Coordinate[] = [];
    const directions = [
      { dx: 0, dy: -1 },{ dx: 1, dy: -1 },{ dx: 1, dy: 0 },{ dx: 1, dy: 1 },
      { dx: 0, dy: 1 },{ dx: -1, dy: 1 },{ dx: -1, dy: 0 },{ dx: -1, dy: -1 }
    ];
    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) continue;
      const eggsRecord = getEggs();
      const occupied = animals.some(a =>
        a.position.x === nx && a.position.y === ny && !(a.id in eggsRecord)
      );
      if (!occupied) validTiles.push({ x: nx, y: ny });
    }
    return validTiles;
  }

  /**
   * Determine previous movement direction for an animal
   */
  public static determinePreviousDirection(
    animal: Animal
  ): { dx: number; dy: number } | null {
    if (!animal.previousPosition) return null;
    const dx = animal.position.x - animal.previousPosition.x;
    const dy = animal.position.y - animal.previousPosition.y;
    if (dx === 0 && dy === 0) return null;
    return { dx: Math.sign(dx), dy: Math.sign(dy) };
  }

  /**
   * Pick a random tile from valid tiles
   */
  public static randomTile(validTiles: Coordinate[]): Coordinate | null {
    if (validTiles.length === 0) return null;
    const idx = Math.floor(Math.random() * validTiles.length);
    return validTiles[idx];
  }

  /**
   * Find a continuation tile based on previous direction
   */
  public static findContinuationTile(
    animal: Animal,
    validTiles: Coordinate[],
    previousDirection: { dx: number; dy: number } | null
  ): Coordinate | null {
    if (!previousDirection || validTiles.length === 0) {
      return this.randomTile(validTiles);
    }
    const { dx, dy } = previousDirection;
    const sameX = animal.position.x + dx;
    const sameY = animal.position.y + dy;
    const sameTile = validTiles.find(t => t.x === sameX && t.y === sameY);
    if (sameTile) return sameTile;
    const options: Coordinate[] = [];
    if (dx && dy) {
      options.push({ x: animal.position.x + dx, y: animal.position.y });
      options.push({ x: animal.position.x, y: animal.position.y + dy });
    } else if (dx) {
      options.push({ x: animal.position.x + dx, y: animal.position.y + 1 });
      options.push({ x: animal.position.x + dx, y: animal.position.y - 1 });
    } else if (dy) {
      options.push({ x: animal.position.x + 1, y: animal.position.y + dy });
      options.push({ x: animal.position.x - 1, y: animal.position.y + dy });
    }
    for (const opt of options) {
      const tile = validTiles.find(t => t.x === opt.x && t.y === opt.y);
      if (tile) return tile;
    }
    return this.randomTile(validTiles);
  }

  /**
   * Calculate valid moves for a unit via breadth-first search
   */
  public static calculateValidMoves(
    unit: Animal,
    board: Board,
    animals: Animal[]
  ): Coordinate[] {
    const eggsRecord = getEggs();
    if (unit.id in eggsRecord) return [];
    if (unit.hasMoved) return [];
    const startX = unit.position.x;
    const startY = unit.position.y;
    const maxDist = getSpeciesMoveRange(unit.species);
    const valid: Coordinate[] = [];
    const visited = new Set<string>();
    const queue: [number, number, number][] = [[startX, startY, 0]];
    visited.add(`${startX},${startY}`);
    const directions = [
      { dx: 0, dy: -1 },{ dx: 1, dy: -1 },{ dx: 1, dy: 0 },{ dx: 1, dy: 1 },
      { dx: 0, dy: 1 },{ dx: -1, dy: 1 },{ dx: -1, dy: 0 },{ dx: -1, dy: -1 }
    ];
    while (queue.length) {
      const [x, y, dist] = queue.shift()!;
      if (dist > 0) valid.push({ x, y });
      if (dist >= maxDist) continue;
      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) continue;
        const tile = board.tiles[ny][nx];
        if (!isTerrainCompatible(unit.species, tile.terrain)) continue;
        const eggsRecord = getEggs();
        const occ = animals.some(a => a.id !== unit.id && !(a.id in eggsRecord) && a.position.x === nx && a.position.y === ny);
        if (occ) continue;
        visited.add(key);
        queue.push([nx, ny, dist + 1]);
      }
    }
    return valid;
  }

  /**
   * Handle displacement when an active unit is bumped
   */
  public static handleDisplacement(
    x: number,
    y: number,
    activeUnit: Animal,
    animalsList: Animal[],
    board: Board
  ): Animal[] {
    const neighborPositions = [
      { x: x - 1, y: y - 1 },{ x: x, y: y - 1 },{ x: x + 1, y: y - 1 },
      { x: x - 1, y: y },{ x: x + 1, y: y },
      { x: x - 1, y: y + 1 },{ x: x, y: y + 1 },{ x: x + 1, y: y + 1 }
    ];
    const validDisp = neighborPositions.filter(pos => {
      if (pos.x < 0 || pos.x >= board.width || pos.y < 0 || pos.y >= board.height) return false;
      const tile = board.tiles[pos.y][pos.x];
      if (!isTerrainCompatible(activeUnit.species, tile.terrain)) return false;
      const eggsRecord = getEggs();
      return !animalsList.some(a => !(a.id in eggsRecord) && a.position.x === pos.x && a.position.y === pos.y);
    });
    // Determine displacement tile: use previous direction if available, otherwise random
    const prevDir = this.determinePreviousDirection(activeUnit);
    let dispPos = prevDir
      ? this.findContinuationTile(activeUnit, validDisp, prevDir)
      : this.randomTile(validDisp);
    if (!dispPos && validDisp.length > 0) {
      dispPos = validDisp[Math.floor(Math.random() * validDisp.length)];
    }
    if (!dispPos) return animalsList;
    return animalsList.map(a =>
      a.id === activeUnit.id
        ? { ...a, previousPosition: a.position, position: dispPos! }
        : a
    );
  }

  /**
   * Resolve collision at spawn time. If another animal already occupies the spawn
   * tile, it will be displaced using the same rules as handleDisplacement. A
   * displacementEvent object is returned alongside the updated animal list so
   * UI layers can animate the nudge.
   */
  public static resolveSpawnCollision(
    x: number,
    y: number,
    animals: Animal[],
    board: Board
  ): {
    animals: Animal[];
    displacementEvent: {
      occurred: boolean;
      unitId: string | null;
      fromX: number | null;
      fromY: number | null;
      toX: number | null;
      toY: number | null;
      timestamp: number | null;
    };
  } {
    // Default no-op event structure
    const dispEvent = {
      occurred: false,
      unitId: null,
      fromX: null,
      fromY: null,
      toX: null,
      toY: null,
      timestamp: null,
    };

    // Look for an occupying animal
    const collider = animals.find(a => a.position.x === x && a.position.y === y);
    if (!collider) {
      return { animals, displacementEvent: dispEvent };
    }

    const movedAnimals = MovementController.handleDisplacement(
      x,
      y,
      collider,
      animals,
      board
    );

    const displaced = movedAnimals.find(a => a.id === collider.id)!;
    const event = {
      occurred: true,
      unitId: collider.id,
      fromX: collider.position.x,
      fromY: collider.position.y,
      toX: displaced.position.x,
      toY: displaced.position.y,
      timestamp: Date.now(),
    };
    return { animals: movedAnimals, displacementEvent: event };
  }
} 