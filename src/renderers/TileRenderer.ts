import * as Phaser from "phaser";
import { TerrainType } from '../types/gameTypes';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing board tiles
 */
export class TileRenderer extends BaseRenderer {
  private tiles: Map<string, { sprite: Phaser.GameObjects.Sprite, terrain: TerrainType }> = new Map();

  constructor(
    scene: Phaser.Scene,
    layerManager: LayerManager,
    tileSize: number,
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }

  public renderBoard(
    board: { width: number, height: number, tiles: any[][] },
    centerX?: number,
    centerY?: number
  ): void {
    const anchorX = centerX ?? this.scene.cameras.main.width / 2;
    const anchorY = centerY ?? this.scene.cameras.main.height / 2;
    this.setAnchor(anchorX, anchorY);

    const terrainSpriteMap: Record<TerrainType, string> = {
      [TerrainType.BEACH]: 'beach',
      [TerrainType.GRASS]: 'grass',
      [TerrainType.WATER]: 'water',
      [TerrainType.MOUNTAIN]: 'mountain',
      [TerrainType.UNDERWATER]: 'underwater',
    };

    const newTileKeys = new Set<string>();

    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const terrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
        const key = `${x},${y}`;
        newTileKeys.add(key);

        const existing = this.tiles.get(key);
        if (existing && existing.terrain === terrain) continue;

        if (existing) {
          existing.sprite.destroy();
          this.tiles.delete(key);
        }

        const worldPos = CoordinateUtils.gridToWorld(x, y, this.tileSize, this.tileHeight, anchorX, anchorY);

        const tileGraphics = this.scene.add.graphics();
        tileGraphics.setPosition(worldPos.x, worldPos.y);
        tileGraphics.setInteractive(
          new Phaser.Geom.Polygon(CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight)),
          Phaser.Geom.Polygon.Contains
        );
        tileGraphics.setData('gridX', x);
        tileGraphics.setData('gridY', y);
        this.layerManager.addToLayer('terrain', tileGraphics);

        const assetKey = terrainSpriteMap[terrain as TerrainType];
        if (assetKey) {
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, assetKey);
          sprite.setOrigin(0.5, 0.5);
          const scale = Math.min(this.tileSize / 192, this.tileHeight / 96);
          sprite.setScale(scale);
          sprite.setDepth(1.5);
          this.layerManager.addToLayer('terrain', sprite);

          this.tiles.set(key, { sprite, terrain });
        }
      }
    }

    // Remove old tiles that no longer exist
    for (const key of this.tiles.keys()) {
      if (!newTileKeys.has(key)) {
        const entry = this.tiles.get(key);
        if (entry) {
          entry.sprite.destroy();
        }
        this.tiles.delete(key);
      }
    }
  }

  public clearTiles(): void {
    this.tiles.forEach(({ sprite }) => sprite.destroy());
    this.tiles.clear();
  }

  public destroy(): void {
    this.clearTiles();
    super.destroy();
  }
}
