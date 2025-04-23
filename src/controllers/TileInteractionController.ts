import * as actions from '../store/actions';

export class TileInteractionController {
  private scene: any;
  private inputManager: any;
  private toggleState: Record<string, number> = {};

  constructor(scene: any, inputManager: any) {
    this.scene = scene;
    this.inputManager = inputManager;
  }

  /**
   * Handle a tile click by cycling through possible actions based on tile contents:
   * Case 7: ignore hidden tiles
   * Case 2: valid move target
   * Case 1: select active unit
   * Case 5: select dormant unit
   * Case 3: select unowned habitat
   * Case 4: select resource in owned biome
   * Case 8: clear selection
   */
  public handleClick(x: number, y: number) {
    const board = actions.getBoard();
    if (!board || !board.tiles[y] || !board.tiles[y][x].visible) {
      // Case 7: ignore clicks on hidden or out-of-bounds tiles
      return;
    }

    // Case 2: valid move target has priority over selection
    if (this.scene.moveRangeRenderer.isValidMoveTarget(x, y)) {
      const selectedUnitId = actions.getSelectedUnitId();
      const animals = actions.getAnimals();
      const selectedAnimal = animals.find((a: any) => a.id === selectedUnitId);
      if (selectedUnitId && selectedAnimal) {
        const fromX = selectedAnimal.position.x;
        const fromY = selectedAnimal.position.y;
        this.scene.startUnitMovement(selectedUnitId, fromX, fromY, x, y);
      }
      return;
    }

    // Gather contents for selection cases
    const contents = this.scene.checkTileContents(x, y);
    const playerId = actions.getCurrentPlayerId();

    // Build list of handlers in priority order
    const handlers: ((x: number, y: number) => void)[] = [];

    // Case 1: active unit selection (only if unit hasn't moved)
    if (contents.activeUnits.length > 0 && !contents.activeUnits[0].hasMoved) {
      handlers.push((x, y) => {
        actions.selectUnit(contents.activeUnits[0].id);
        this.scene.selectionRenderer.showSelectionAt(x, y);
      });
    }

    // Case 5: dormant unit selection
    if (contents.dormantUnits.length > 0) {
      handlers.push((x, y) => {
        actions.selectUnit(contents.dormantUnits[0].id);
        this.scene.selectionRenderer.showRedSelectionAt(x, y);
      });
    }

    // Case 3: habitat selection (owned or unowned)
    if (contents.biomes.length > 0) {
      const biome = contents.biomes[0];
      handlers.push((x, y) => {
        actions.selectBiome(biome.id);
        this.scene.selectionRenderer.showRedSelectionAt(x, y);
      });
    }

    // Case 4: select resource in owned biome
    const tile = board.tiles[y][x];
    if (tile.active && tile.resourceType !== null && tile.biomeId) {
      const biome = actions.getBiomes().get(tile.biomeId);
      if (biome && biome.ownerId === playerId) {
        handlers.push((x, y) => {
          actions.selectResourceTile({ x, y });
          this.scene.selectionRenderer.showRedSelectionAt(x, y);
        });
      }
    }

    // Case 8: clear all selections and highlights
    handlers.push((x, y) => {
      actions.selectUnit(null);
      actions.selectBiome(null);
      actions.selectResourceTile(null);
      this.scene.moveRangeRenderer.clearMoveHighlights();
      this.scene.selectionRenderer.hideSelection();
    });

    // Cycle through handlers on repeated clicks
    const key = `${x},${y}`;
    const idx = this.toggleState[key] || 0;
    handlers[idx % handlers.length](x, y);
    this.toggleState[key] = (idx + 1) % handlers.length;
  }
} 