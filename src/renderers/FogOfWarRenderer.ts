import Phaser from 'phaser';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import * as playerActions from '../selectors/playerActions';

/**
 * Responsible for rendering and managing fog of war tiles
 */
export class FogOfWarRenderer extends BaseRenderer {
  private fogTiles: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private fogColor: number = 0x000000;
  private fogStrokeColor: number = 0x222222;
  private fogStrokeWidth: number = 1;
  private fadeAnimationDuration: number = 50;
  private onTileVisibilityChange: ((x: number, y: number, isVisible: boolean) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    layerManager: LayerManager,
    tileSize: number,
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  private createSingleFogTile(x: number, y: number): Phaser.GameObjects.Graphics {
    const world = this.gridToScreen(x, y);
    const tile = this.scene.add.graphics();
    const shape = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    tile.fillStyle(this.fogColor, 1);
    tile.lineStyle(this.fogStrokeWidth, this.fogStrokeColor, 1);
    tile.beginPath();
    shape.forEach((p, i) => (i ? tile.lineTo(p.x, p.y) : tile.moveTo(p.x, p.y)));
    tile.closePath();
    tile.fillPath();
    tile.strokePath();
    tile.setPosition(world.x, world.y);
    this.layerManager.addToLayer('fogOfWar', tile);
    this.fogTiles.set(this.key(x, y), tile);
    return tile;
  }

  public createFogOfWar(board: { width: number; height: number }): void {
    this.clearFogOfWar();
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        this.createSingleFogTile(x, y);
        this.onTileVisibilityChange?.(x, y, false);
      }
    }
  }

  /**
   * Reveal specified tiles by fading them out
   * @param coords Array of coordinates to reveal
   * @param instant If true, tiles will be removed immediately without animation
   */
  public revealTiles(coords: { x: number; y: number }[], instant: boolean = false): void {
    const toAnimate: Phaser.GameObjects.Graphics[] = [];
    coords.forEach(({ x, y }) => {
      const fog = this.fogTiles.get(this.key(x, y));
      if (fog) {
        toAnimate.push(fog);
        this.onTileVisibilityChange?.(x, y, true);
      }
    });
    
    if (!toAnimate.length) return;
    
    if (instant) {
      // Remove tiles instantly when requested
      toAnimate.forEach(f => f.destroy());
      coords.forEach(({ x, y }) => this.fogTiles.delete(this.key(x, y)));
    } else {
      // Otherwise use animation
    this.scene.tweens.add({
      targets: toAnimate,
      alpha: 0,
      duration: this.fadeAnimationDuration,
      onComplete: () => {
        toAnimate.forEach(f => f.destroy());
        coords.forEach(({ x, y }) => this.fogTiles.delete(this.key(x, y)));
      },
    });
    }
  }

  public hideTiles(coords: { x: number; y: number }[]): void {
    coords.forEach(({ x, y }) => {
      const key = this.key(x, y);
      if (!this.fogTiles.has(key)) {
        this.createSingleFogTile(x, y);
        this.onTileVisibilityChange?.(x, y, false);
      }
    });
  }

  public clearFogOfWar(): void {
    this.fogTiles.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      this.onTileVisibilityChange?.(x, y, true);
    });
    this.fogTiles.forEach(tile => tile.destroy());
    this.fogTiles.clear();
  }

  override destroy(): void {
    super.destroy();
    this.clearFogOfWar();
  }

  /**
   * Reveal tiles and update the game state visibility
   * @param tiles Array of tile coordinates to reveal
   */
  public revealAndUpdateState(tiles: { x: number; y: number }[]): void {
    if (tiles.length === 0) return;
    // Update state
    actions.updateTilesVisibility(tiles.map(({ x, y }) => ({ x, y, visible: true })));
    // Update rendering
    this.revealTiles(tiles);
  }

  /**
   * Hide tiles and update the game state visibility
   * @param tiles Array of tile coordinates to hide
   */
  public hideAndUpdateState(tiles: { x: number; y: number }[]): void {
    if (tiles.length === 0) return;
    // Update state
    actions.updateTilesVisibility(tiles.map(({ x, y }) => ({ x, y, visible: false })));
    // Update rendering
    this.hideTiles(tiles);
  }

  /**
   * Update fog of war for active player without flashing
   * @param playerId The active player ID
   */
  public updateFogForActivePlayer(playerId: number): void {
    const board = playerActions.getBoard();
    if (!board) return;
    
    // Get the coordinates of tiles visible to this player
    const visibleCoords = actions.getVisibleTilesForPlayer(playerId);
    
    // Get all board tiles for comparison
    const allBoardTiles: {x: number, y: number}[] = [];
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        allBoardTiles.push({x, y});
      }
    }
    
    // Find tiles that should be hidden (all board tiles minus visible tiles)
    const visibleCoordKeys = new Set(visibleCoords.map(coord => this.key(coord.x, coord.y)));
    const tilesToHide = allBoardTiles.filter(tile => 
      !visibleCoordKeys.has(this.key(tile.x, tile.y)) && 
      !this.fogTiles.has(this.key(tile.x, tile.y))
    );
    
    // Find tiles that should be revealed (visible tiles that currently have fog)
    const tilesToReveal = visibleCoords.filter(tile => 
      this.fogTiles.has(this.key(tile.x, tile.y))
    );
    
    // Add fog to tiles that should be hidden
    if (tilesToHide.length > 0) {
      this.hideTiles(tilesToHide);
    }
    
    // Remove fog from tiles that should be visible
    if (tilesToReveal.length > 0) {
      this.revealTiles(tilesToReveal);
    }
  }

  /**
   * Initialize visibility for starting units and habitats
   */
  public initializeVisibility(): void {
    const activePlayerId = playerActions.getActivePlayerId();
    const initialVisibleTiles = playerActions.getInitialVisibleTiles(activePlayerId);
    if (initialVisibleTiles.length > 0) {
      this.revealAndUpdateState(initialVisibleTiles);
    }
  }

  /**
   * Set up fog-of-war state subscriptions
   */
  public setupSubscriptions(): void {
    StateObserver.subscribe(
      'FogOfWarRenderer.visibility',
      (state) => ({
        board: state.board,
        activePlayerId: state.activePlayerId,
        visibleTiles: new Set(
          Array.from(state.players.find((p) => p.id === state.activePlayerId)?.visibleTiles || [])
        ),
        fogOfWarEnabled: state.fogOfWarEnabled,
        // Add turn to trigger updates when capturing biomes or spawning animals
        turn: state.turn
      }),
      ({ board, activePlayerId, visibleTiles, fogOfWarEnabled }, prev) => {
        if (!board) return;

        // Handle fog of war toggle
        if (prev?.fogOfWarEnabled !== fogOfWarEnabled) {
          if (fogOfWarEnabled) {
            // When enabling FOW, create initial fog then immediately reveal visible tiles
            this.createFogOfWar(board);
            const visibleCoords = Array.from(visibleTiles).map(key => {
              const [x, y] = key.split(',').map(Number);
              return { x, y };
            });
            if (visibleCoords.length > 0) {
              // Pass true to reveal instantly without animation on initial setup
              this.revealTiles(visibleCoords, true);
            }
          } else {
            this.clearFogOfWar();
          }
          return;
        }

        // Handle player change with our smooth transition method
        if (prev?.activePlayerId !== activePlayerId) {
          this.updateFogForActivePlayer(activePlayerId);
          return;
        }
        
        // Handle visibility changes
        if (prev?.visibleTiles) {
        const added: { x: number, y: number }[] = [];
        const removed: { x: number, y: number }[] = [];

          const prevVisible = new Set(prev.visibleTiles);

          visibleTiles.forEach((key) => {
          if (!prevVisible.has(key)) {
            const [x, y] = key.split(',').map(Number);
            added.push({ x, y });
          }
        });

          prevVisible.forEach((key) => {
          if (!visibleTiles.has(key)) {
            const [x, y] = key.split(',').map(Number);
            removed.push({ x, y });
          }
        });

          if (added.length > 0) {
        this.revealTiles(added);
          }
          
          if (removed.length > 0) {
        this.hideTiles(removed);
          }
        }
      },
      {
        immediate: true,
        debug: false
      }
    );
  }

  /**
   * Reveal tiles around a given coordinate
   * @param x X coordinate of the center tile
   * @param y Y coordinate of the center tile
   */
  public revealAround(x: number, y: number): void {
    const board = playerActions.getBoard();
    if (!board) return;
    
    // Get adjacent tiles including the center tile
    const tiles = CoordinateUtils.getAdjacentTiles(x, y, board.width, board.height);
    const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tiles);
    
    // Update both the visibility state and renderer
    this.revealAndUpdateState(uniqueTiles);
  }
}
