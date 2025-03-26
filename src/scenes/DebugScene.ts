import Phaser from "phaser";
import BoardScene from "./BoardScene";

export default class DebugScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;
  // private mousePositionText!: Phaser.GameObjects.Text;
  // private gridCoordinatesText!: Phaser.GameObjects.Text;
  // private terrainTypeText!: Phaser.GameObjects.Text;
  private boardScene: BoardScene | null = null;

  constructor() {
    super({ 
      key: "DebugScene",
      active: true,
      visible: true 
    });
  }

  init() {
    // Make this scene transparent so it only shows our UI elements
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }

  create() {
    // Position FPS in top right corner with a margin
    const rightX = this.cameras.main.width - 10;
    const topY = 10;
    
    this.fpsText = this.add.text(rightX, topY, "FPS: 0", {
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
    
    /* 
    // Add mouse position text (starts at 10px below FPS)
    this.mousePositionText = this.add.text(rightX, topY + 25, "Mouse: X: 0, Y: 0", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000);
    
    // Right-align the text
    this.mousePositionText.setOrigin(1, 0);
    */
    
    /* 
    // Add grid coordinates text (starts 10px below mouse position)
    this.gridCoordinatesText = this.add.text(rightX, topY + 25, "Grid: X: --, Y: --", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000);
    
    // Right-align the text
    this.gridCoordinatesText.setOrigin(1, 0);
    */
    
    /* 
    // Add terrain type text (starts 10px below grid coordinates)
    this.terrainTypeText = this.add.text(rightX, topY + 75, "Terrain: --", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000);
    
    // Right-align the text
    this.terrainTypeText.setOrigin(1, 0);
    */
    
    // Get the board scene
    this.boardScene = this.scene.get('BoardScene') as BoardScene;
  }

  update() {
    const fps = this.game.loop.actualFps.toFixed(1);
    this.fpsText.setText(`FPS: ${fps}`);
    
    /*
    // Update mouse position (screen coordinates)
    const pointer = this.input.activePointer;
    this.mousePositionText.setText(`Mouse: X: ${Math.floor(pointer.x)}, Y: ${Math.floor(pointer.y)}`);
    */
    
    /*
    // Update grid coordinates if board scene is available
    if (this.boardScene && this.boardScene.scene.isActive()) {
      const hoveredPosition = this.boardScene.getHoveredGridPosition();
      
      if (hoveredPosition) {
        // Show grid coordinates
        this.gridCoordinatesText.setText(`Grid: X: ${hoveredPosition.x}, Y: ${hoveredPosition.y}`);
        
        /* 
        // Show terrain type
        const terrain = this.boardScene.getTerrainAtPosition(hoveredPosition.x, hoveredPosition.y);
        if (terrain) {
          this.terrainTypeText.setText(`Terrain: ${terrain}`);
        } else {
          this.terrainTypeText.setText(`Terrain: --`);
        }
        *//*
      } else {
        // Show placeholder when not hovering a valid tile
        this.gridCoordinatesText.setText(`Grid: X: --, Y: --`);
        // this.terrainTypeText.setText(`Terrain: --`);
      }
    }
    */
  }
} 