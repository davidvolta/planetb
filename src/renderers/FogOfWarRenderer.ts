import Phaser from 'phaser';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { StateObserver } from '../utils/stateObserver';

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

  public revealTiles(coords: { x: number; y: number }[]): void {
    const toAnimate: Phaser.GameObjects.Graphics[] = [];
    coords.forEach(({ x, y }) => {
      const fog = this.fogTiles.get(this.key(x, y));
      if (fog) {
        toAnimate.push(fog);
        this.onTileVisibilityChange?.(x, y, true);
      }
    });
    if (!toAnimate.length) return;
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
   * Set up fog-of-war state subscriptions
   */
  public setupSubscriptions(scene: any): void {
    StateObserver.subscribe(
      'FogOfWarRenderer.visibility',
      (state) => ({
        board: state.board,
        visibleTiles: new Set(
          Array.from(state.players.find((p: any) => p.id === state.activePlayerId)?.visibleTiles || []).map((t: any) => `${t.x},${t.y}`)
        )
      }),
      ({ board, visibleTiles }, prev) => {
        if (!board) return;

        const added: { x: number, y: number }[] = [];
        const removed: { x: number, y: number }[] = [];

        const prevVisible = new Set(prev?.visibleTiles || []);

        (visibleTiles as Set<string>).forEach((key: string) => {
          if (!prevVisible.has(key)) {
            const [x, y] = key.split(',').map(Number);
            added.push({ x, y });
          }
        });

        (prevVisible as Set<string>).forEach((key: string) => {
          if (!visibleTiles.has(key)) {
            const [x, y] = key.split(',').map(Number);
            removed.push({ x, y });
          }
        });

        this.revealTiles(added);
        this.hideTiles(removed);
      },
      {
        immediate: true,
        debug: false,
        equalityFn: (a, b) => {
          if (!a || !b) return false;
          if (typeof a !== 'object' || typeof b !== 'object') return false;
          if (!('board' in a) || !('board' in b)) return false;
          if (!('visibleTiles' in a) || !('visibleTiles' in b)) return false;
          if (a.board !== b.board) return false;
          if ((a.visibleTiles as Set<string>).size !== (b.visibleTiles as Set<string>).size) return false;
          for (const key of a.visibleTiles as Set<string>) {
            if (!(b.visibleTiles as Set<string>).has(key)) return false;
          }
          return true;
        }
      }
    );
  }
}
