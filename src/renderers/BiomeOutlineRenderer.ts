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
  
    const drawnEdges = new Set<string>();
  
    for (const [biomeId, biome] of biomes.entries()) {
      if (biome.ownerId !== activePlayerId) continue;
  
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          const tile = board.tiles[y][x];
          if (tile.biomeId !== biomeId) continue;
  
          const verts = this.getDiamondVertices(x, y);
  
          const directions = [
            { dx: 0, dy: -1, a: 0, b: 1 }, // top edge (connect top → right)
            { dx: 1, dy: 0, a: 1, b: 2 },  // right edge (right → bottom)
            { dx: 0, dy: 1, a: 2, b: 3 },  // bottom edge (bottom → left)
            { dx: -1, dy: 0, a: 3, b: 0 }, // left edge (left → top)
          ];
          
  
          for (const { dx, dy, a, b } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const neighbor = board.tiles[ny]?.[nx];
            const neighborBiome = neighbor?.biomeId ? biomes.get(neighbor.biomeId) : null;
  
            const sameOwner = neighborBiome?.ownerId === activePlayerId;
            if (sameOwner) continue;
  
            const p1 = verts[a];
            const p2 = verts[b];
            const key = this.normalizeEdgeKey(p1, p2);
  
            if (!drawnEdges.has(key)) {
              drawnEdges.add(key);
              this.drawDashedLine(p1.x, p1.y, p2.x, p2.y, 3, 2);
            }
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
  private normalizeEdgeKey(p1: Phaser.Math.Vector2, p2: Phaser.Math.Vector2): string {
    // Ensures same key for both directions
    if (p1.y < p2.y || (p1.y === p2.y && p1.x < p2.x)) {
      return `${p1.x},${p1.y}:${p2.x},${p2.y}`;
    } else {
      return `${p2.x},${p2.y}:${p1.x},${p1.y}`;
    }
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
