import * as actions from '../store/actions';
import { Biome } from '../store/gameStore';
import type BoardScene from '../scene/BoardScene';

export class TileInteractionController {
  private scene: BoardScene;
  private toggleState: Record<string, number> = {};
  private lastClickedKey: string | null = null;

  constructor(scene: BoardScene) {
    this.scene = scene;
  }

  /**
   * Handle a tile click by cycling through possible actions based on tile contents:
   * Case 7: ignore hidden tiles
   * Case 2: valid move target
   * Case 1: select active animal
   * Case 5: select dormant animal
   * Case 3: select unowned habitat
   * Case 4: select resource in owned biome
   * Case 8: clear selection
   */
  public handleClick(x: number, y: number) {
    const playerId = actions.getActivePlayerId();
    const board = actions.getBoard();
    if (!board || !board.tiles[y] || !board.tiles[y][x]) {
      return;
    }
    const visibleCoords = actions.getVisibleTilesForPlayer(playerId);
    if (!visibleCoords.some(coord => coord.x === x && coord.y === y)) {
      return;
    }

    // Reset toggleState for newly clicked tile so first click always fires
    const key = `${x},${y}`;
    if (key !== this.lastClickedKey) {
      this.toggleState[key] = 0;
    }

    // Case 2: valid move target has priority over selection
    if (this.scene.getMoveRangeRenderer().isValidMoveTarget(x, y)) {
      const selectedAnimalId = actions.getSelectedAnimalID();
      const animals = actions.getAnimals();
      const selectedAnimal = animals.find((a: any) => a.id === selectedAnimalId);
      if (selectedAnimalId && selectedAnimal) {
        const fromX = selectedAnimal.position.x;
        const fromY = selectedAnimal.position.y;
        this.scene.startAnimalMovement(selectedAnimalId, fromX, fromY, x, y);
      }
      return;
    }

    // Build content arrays for selection cases using store helpers
    const animalsAtTile = actions.getAnimalsAt(x, y).filter(a => a.ownerId === playerId);
    const eggs = actions.getEggsAt(x, y).filter(e => e.ownerId === playerId);
    const habitatTiles = actions.getHabitatTiles().filter(t => t.x === x && t.y === y);
    const biomesAtLocation = habitatTiles
      .map(({ tile }) => actions.getBiomes().get(tile.biomeId!))
      .filter((b): b is Biome => !!b);

    // Build list of handlers in priority order
    const handlers: ((x: number, y: number) => void)[] = [];

    // Case 1: active animal selection (only if animal hasn't moved)
    if (animalsAtTile.length > 0 && !animalsAtTile[0].hasMoved) {
      handlers.push((x, y) => {
        actions.selectAnimal(animalsAtTile[0].id);
        // Selection UI handled by StateSubscriptionManager
      });
    }

    // Case 5: egg selection
    if (eggs.length > 0) {
      handlers.push((x, y) => {
        actions.selectEgg(eggs[0].id);
        // Selection UI handled by StateSubscriptionManager
      });
    }

    // Case 3: habitat selection (owned or unowned)
    if (biomesAtLocation.length > 0) {
      const biome = biomesAtLocation[0];
      handlers.push((x, y) => {
        actions.selectBiome(biome.id);
        // Selection UI handled by StateSubscriptionManager
      });
    }

    // Case 4: select resource in owned biome
    const tile = board.tiles[y][x];
    if (tile.active && tile.resourceType !== null && tile.biomeId) {
      const biome = actions.getBiomes().get(tile.biomeId);
      // Only allow harvesting if an active animal owned by current player that hasn't moved is on this tile
      const animalHere = animalsAtTile.find(a => a.ownerId === playerId && !a.hasMoved);
      if (biome && biome.ownerId === playerId && animalHere) {
        handlers.push((x, y) => {
          actions.selectResourceTile({ x, y });
          actions.selectBiome(null);
          // Selection UI handled by StateSubscriptionManager
        });
      }
    }

    // Case 8: clear all selections and highlights
    handlers.push((x, y) => {
      actions.selectAnimal(null);
      actions.selectBiome(null);
      actions.selectResourceTile(null);
      // Selection UI handled by StateSubscriptionManager
    });

    // Cycle through handlers on repeated clicks
    const idx = this.toggleState[key] || 0;
    handlers[idx % handlers.length](x, y);
    this.toggleState[key] = (idx + 1) % handlers.length;
    this.lastClickedKey = key;
  }
} 