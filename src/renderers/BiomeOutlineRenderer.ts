import Phaser from 'phaser';
import type { Board, Biome, Player, Tile } from '../store/gameStore';

export class BiomeOutlineRenderer {
  private outlineGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(
    private scene: Phaser.Scene,
    private tileWidth: number,
    private tileHeight: number,
    private anchorX: number,
    private anchorY: number
  ) {}

  public clear(): void {
    this.outlineGraphics?.clear();
  }

  public renderOutlines(
    board: Board,
    biomes: Map<string, Biome>,
    players: Player[],
    activePlayerId: number
  ): void {
    this.clear();

    const player = players.find(p => p.id === activePlayerId);
    if (!player || !player.color) return;

    const color = parseInt(player.color.replace('#', ''), 16);
    if (!this.outlineGraphics) {
      this.outlineGraphics = this.scene.add.graphics();
      this.outlineGraphics.setDepth(5);
    }
    this.outlineGraphics.clear();
    this.outlineGraphics.lineStyle(1, 0xffffff, 1);

    for (const [biomeId, biome] of biomes.entries()) {
      if (biome.ownerId !== activePlayerId) continue;

      const tiles: Tile[] = [];
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          const tile = board.tiles[y][x];
          if (tile.biomeId === biomeId) {
            tiles.push({ ...tile, coordinate: { x, y } });
          }
        }
      }
      if (tiles.length === 0) continue;

      for (const tile of tiles) {
        const { x, y } = tile.coordinate;
        const neighbors = [
          board.tiles[y - 1]?.[x], // north
          board.tiles[y]?.[x + 1], // east
          board.tiles[y + 1]?.[x], // south
          board.tiles[y]?.[x - 1], // west
        ];

        const edges = [
          { condition: !neighbors[0] || neighbors[0].biomeId !== biomeId, a: 0, b: 1 },
          { condition: !neighbors[1] || neighbors[1].biomeId !== biomeId, a: 1, b: 2 },
          { condition: !neighbors[2] || neighbors[2].biomeId !== biomeId, a: 2, b: 3 },
          { condition: !neighbors[3] || neighbors[3].biomeId !== biomeId, a: 3, b: 0 },
        ];

        const verts = this.getDiamondVertices(x, y);

        for (const edge of edges) {
          if (edge.condition) {
            const p1 = verts[edge.a];
            const p2 = verts[edge.b];
            this.drawDashedLine(p1.x, p1.y, p2.x, p2.y, 3, 2);
          }
        }
      }
    }
  }

  private getDiamondVertices(x: number, y: number): Phaser.Math.Vector2[] {
    const cx = (x - y) * (this.tileWidth / 2) + this.anchorX;
    const cy = (x + y) * (this.tileHeight / 2) + this.anchorY;
    return [
      new Phaser.Math.Vector2(cx, cy - this.tileHeight / 2), // top
      new Phaser.Math.Vector2(cx + this.tileWidth / 2, cy),   // right
      new Phaser.Math.Vector2(cx, cy + this.tileHeight / 2), // bottom
      new Phaser.Math.Vector2(cx - this.tileWidth / 2, cy),   // left
    ];
  }

  private drawDashedLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number,
    gapLength: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const steps = Math.floor(length / (dashLength + gapLength));

    for (let i = 0; i < steps; i++) {
      const start = i * (dashLength + gapLength);
      const end = start + dashLength;

      const sx = x1 + Math.cos(angle) * start;
      const sy = y1 + Math.sin(angle) * start;
      const ex = x1 + Math.cos(angle) * Math.min(end, length);
      const ey = y1 + Math.sin(angle) * Math.min(end, length);

      this.outlineGraphics!.beginPath();
      this.outlineGraphics!.moveTo(sx, sy);
      this.outlineGraphics!.lineTo(ex, ey);
      this.outlineGraphics!.strokePath();
    }
  }
}
