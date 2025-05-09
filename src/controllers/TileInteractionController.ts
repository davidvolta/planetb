import * as actions from '../store/actions';
import { Biome, Animal, Egg, Tile } from '../store/gameStore';
import type BoardScene from '../scene/BoardScene';

type ToggleState = Record<string, number>;
type ClickHandler = (x: number, y: number) => void;

export class TileInteractionController {
  private scene: BoardScene;
  private toggleState: ToggleState = {};
  private lastClickedKey: string | null = null;

  constructor(scene: BoardScene) {
    this.scene = scene;
  }

  /**
   * Handle a tile click by cycling through possible actions based on tile contents
   */
  public handleClick(x: number, y: number): void {
    try {
      if (!this.isValidClick(x, y)) {
        return;
      }

      const key = `${x},${y}`;
      this.resetToggleStateForNewTile(key);

      // Handle move target first as it has highest priority
      if (this.handleMoveTarget(x, y)) {
        return;
      }

      const handlers = this.buildClickHandlers(x, y);
      this.executeHandler(x, y, key, handlers);
    } catch (error) {
      console.error('Error handling tile click:', error);
    }
  }

  private isValidClick(x: number, y: number): boolean {
    const playerId = actions.getActivePlayerId();
    const board = actions.getBoard();
    
    if (!board?.tiles[y]?.[x]) {
      return false;
    }

    const visibleCoords = actions.getVisibleTilesForPlayer(playerId);
    return visibleCoords.some(coord => coord.x === x && coord.y === y);
  }

  private resetToggleStateForNewTile(key: string): void {
    if (key !== this.lastClickedKey) {
      this.toggleState[key] = 0;
    }
  }

  private handleMoveTarget(x: number, y: number): boolean {
    if (!this.scene.getMoveRangeRenderer().isValidMoveTarget(x, y)) {
      return false;
    }

    const selectedAnimalId = actions.getSelectedAnimalID();
    const animals = actions.getAnimals();
    const selectedAnimal = animals.find((a: Animal) => a.id === selectedAnimalId);

    if (selectedAnimalId && selectedAnimal) {
      // 1) Clear UI indicators
      this.scene.getMoveRangeRenderer().clearMoveHighlights();
      this.scene.getSelectionRenderer().hideSelection();

      // 2) Fog-of-war reveal around destination (use global FOW flag)
      if (actions.getFogOfWarEnabled()) {
        this.scene.getVisibilityController().revealAround(x, y);
      }

      // 3) Execute the move via GameController (animation + state)
      this.scene.getGameController().moveAnimal(selectedAnimalId, x, y);
      return true;
    }

    return false;
  }

  private buildClickHandlers(x: number, y: number): ClickHandler[] {
    const playerId = actions.getActivePlayerId();
    const handlers: ClickHandler[] = [];

    // Get all relevant game state
    const animalsAtTile = this.getPlayerAnimalsAtTile(x, y, playerId);
    const eggsAtTile = this.getPlayerEggsAtTile(x, y, playerId);
    const biomesAtLocation = this.getBiomesAtLocation(x, y);
    const board = actions.getBoard();
    if (!board) return handlers;
    const tile = board.tiles[y][x];

    // Add handlers in priority order
    this.addAnimalSelectionHandler(handlers, animalsAtTile);
    this.addEggSelectionHandler(handlers, eggsAtTile);
    this.addBiomeSelectionHandler(handlers, biomesAtLocation);
    this.addResourceSelectionHandler(handlers, tile, animalsAtTile, playerId);
    this.addClearSelectionHandler(handlers);

    return handlers;
  }

  private getPlayerAnimalsAtTile(x: number, y: number, playerId: number): Animal[] {
    return actions.getAnimalsAt(x, y).filter(a => a.ownerId === playerId);
  }

  private getPlayerEggsAtTile(x: number, y: number, playerId: number): Egg[] {
    return actions.getEggsAt(x, y).filter(e => e.ownerId === playerId);
  }

  private getBiomesAtLocation(x: number, y: number): Biome[] {
    const habitatTiles = actions.getHabitatTiles().filter(t => t.x === x && t.y === y);
    return habitatTiles
      .map(({ tile }) => actions.getBiomes().get(tile.biomeId!))
      .filter((b): b is Biome => !!b);
  }

  private addAnimalSelectionHandler(handlers: ClickHandler[], animalsAtTile: Animal[]): void {
    if (animalsAtTile.length > 0 && !animalsAtTile[0].hasMoved) {
      handlers.push(() => actions.selectAnimal(animalsAtTile[0].id));
    }
  }

  private addEggSelectionHandler(handlers: ClickHandler[], eggsAtTile: Egg[]): void {
    if (eggsAtTile.length > 0) {
      handlers.push(() => actions.selectEgg(eggsAtTile[0].id));
    }
  }

  private addBiomeSelectionHandler(handlers: ClickHandler[], biomesAtLocation: Biome[]): void {
    if (biomesAtLocation.length > 0) {
      handlers.push(() => actions.selectBiome(biomesAtLocation[0].id));
    }
  }

  private addResourceSelectionHandler(
    handlers: ClickHandler[],
    tile: Tile,
    animalsAtTile: Animal[],
    playerId: number
  ): void {
    if (tile.active && tile.resourceType !== null && tile.biomeId) {
      const biome = actions.getBiomes().get(tile.biomeId);
      const animalHere = animalsAtTile.find(a => a.ownerId === playerId && !a.hasMoved);
      
      if (biome?.ownerId === playerId && animalHere) {
        handlers.push(() => {
          actions.selectResourceTile({ x: tile.coordinate.x, y: tile.coordinate.y });
          actions.selectBiome(null);
        });
      }
    }
  }

  private addClearSelectionHandler(handlers: ClickHandler[]): void {
    handlers.push(() => {
      actions.selectAnimal(null);
      actions.selectBiome(null);
      actions.selectResourceTile(null);
    });
  }

  private executeHandler(x: number, y: number, key: string, handlers: ClickHandler[]): void {
    const idx = this.toggleState[key] || 0;
    handlers[idx % handlers.length](x, y);
    this.toggleState[key] = (idx + 1) % handlers.length;
    this.lastClickedKey = key;
  }
} 