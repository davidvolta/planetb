import Phaser from "phaser";

export default class DebugScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "DebugScene" });
  }

  create() {
    // Position in top right corner with a small margin
    const x = this.cameras.main.width - 100;
    const y = 10;
    
    this.fpsText = this.add.text(x, y, "FPS: 0", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000); // Ensure it stays on top
    
    // Right-align the text
    this.fpsText.setOrigin(1, 0);
  }

  update() {
    const fps = this.game.loop.actualFps.toFixed(1);
    this.fpsText.setText(`FPS: ${fps}`);
  }
} 