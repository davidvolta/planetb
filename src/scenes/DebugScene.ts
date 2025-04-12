import Phaser from "phaser";
import BoardScene from "./BoardScene";

export default class DebugScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;
  private boardScene: BoardScene | null = null;
  
  // FOW toggle elements
  private fowCheckbox!: Phaser.GameObjects.Container;
  private fowCheckboxText!: Phaser.GameObjects.Text;
  private fowCheckboxBox!: Phaser.GameObjects.Rectangle;
  private fowCheckboxInner!: Phaser.GameObjects.Rectangle;
  private fowEnabled: boolean = true;
  
  // Biome visualization toggle elements
  private biomeCheckbox!: Phaser.GameObjects.Container;
  private biomeCheckboxText!: Phaser.GameObjects.Text;
  private biomeCheckboxBox!: Phaser.GameObjects.Rectangle;
  private biomeCheckboxInner!: Phaser.GameObjects.Rectangle;
  private biomeEnabled: boolean = false;

  constructor() {
    super({
      key: 'DebugScene',
      active: true
    });
  }

  init() {
    // Make this scene transparent so it only shows our UI elements
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }

  create() {
    // Position FPS in bottom left corner with a margin
    const leftX = 10;
    const bottomY = this.cameras.main.height - 10;
    
    // Get the board scene
    this.boardScene = this.scene.get('BoardScene') as BoardScene;
    
    // Create UI elements stacked from bottom to top
    this.createFowCheckbox(leftX, bottomY - 30);
    this.createBiomeCheckbox(leftX, bottomY - 60); // Above FOW toggle
    
    this.fpsText = this.add.text(leftX, bottomY, "FPS: 0", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000); // Ensure it stays on top
    
    // Left-align the text, bottom-aligned
    this.fpsText.setOrigin(0, 1);
    
    // Listen for resize events to reposition the debug elements
    this.scale.on('resize', this.handleResize, this);
  }

  // Create a biome visualization toggle checkbox
  private createBiomeCheckbox(x: number, y: number): void {
    // Create container for the checkbox and label
    this.biomeCheckbox = this.add.container(x, y);
    this.biomeCheckbox.setDepth(1000);
    
    // Create label first
    this.biomeCheckboxText = this.add.text(0, 0, "Biomes", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 0.5);
    
    // Get width of text to position checkbox after it
    const textWidth = this.biomeCheckboxText.width;
    
    // Create checkbox background (outline) after the text
    this.biomeCheckboxBox = this.add.rectangle(textWidth + 10, 0, 16, 16, 0x00FF00, 0)
      .setStrokeStyle(2, 0x00FF00)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    
    // Create checkbox inner fill (shown when checked)
    this.biomeCheckboxInner = this.add.rectangle(textWidth + 10, 0, 10, 10, 0x00FF00, 1)
      .setOrigin(0, 0.5)
      .setPosition(textWidth + 13, 0); // Center in the box
    
    // Set initial state
    this.biomeCheckboxInner.setVisible(this.biomeEnabled);
    
    // Add components to container
    this.biomeCheckbox.add([this.biomeCheckboxText, this.biomeCheckboxBox, this.biomeCheckboxInner]);
    
    // Set up click handler
    this.biomeCheckboxBox.on('pointerdown', this.toggleBiome, this);
    this.biomeCheckboxText.setInteractive({ useHandCursor: true });
    this.biomeCheckboxText.on('pointerdown', this.toggleBiome, this);
  }
  
  // Toggle biome visualization state
  private toggleBiome(): void {
    this.biomeEnabled = !this.biomeEnabled;
    this.biomeCheckboxInner.setVisible(this.biomeEnabled);
    
    // Call BoardScene's toggleBiomeVisualization method
    if (this.boardScene) {
      this.boardScene.toggleBiomeVisualization(this.biomeEnabled);
    }
  }

  // Create a FOW toggle checkbox
  private createFowCheckbox(x: number, y: number): void {
    // Create container for the checkbox and label
    this.fowCheckbox = this.add.container(x, y);
    this.fowCheckbox.setDepth(1000);
    
    // Create label first
    this.fowCheckboxText = this.add.text(0, 0, "FOW", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 0.5);
    
    // Get width of text to position checkbox after it
    const textWidth = this.fowCheckboxText.width;
    
    // Create checkbox background (outline) after the text
    this.fowCheckboxBox = this.add.rectangle(textWidth + 10, 0, 16, 16, 0x00FF00, 0)
      .setStrokeStyle(2, 0x00FF00)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    
    // Create checkbox inner fill (shown when checked)
    this.fowCheckboxInner = this.add.rectangle(textWidth + 10, 0, 10, 10, 0x00FF00, 1)
      .setOrigin(0, 0.5)
      .setPosition(textWidth + 13, 0); // Center in the box
    
    // Set initial state
    this.fowCheckboxInner.setVisible(this.fowEnabled);
    
    // Add components to container
    this.fowCheckbox.add([this.fowCheckboxText, this.fowCheckboxBox, this.fowCheckboxInner]);
    
    // Set up click handler
    this.fowCheckboxBox.on('pointerdown', this.toggleFow, this);
    this.fowCheckboxText.setInteractive({ useHandCursor: true });
    this.fowCheckboxText.on('pointerdown', this.toggleFow, this);
  }
  
  // Toggle fog of war state
  private toggleFow(): void {
    this.fowEnabled = !this.fowEnabled;
    this.fowCheckboxInner.setVisible(this.fowEnabled);
    
    // Call BoardScene's toggleFogOfWar method
    if (this.boardScene) {
      this.boardScene.toggleFogOfWar(this.fowEnabled);
    }
  }

  update() {
    const fps = this.game.loop.actualFps.toFixed(1);
    this.fpsText.setText(`FPS: ${fps}`);
  }

  // Handle window resize
  private handleResize() {
    const bottomY = this.cameras.main.height - 10;
    
    if (this.fpsText) {
      // Update position to bottom left of new screen size
      this.fpsText.setPosition(10, bottomY);
    }
    
    if (this.fowCheckbox) {
      // Update position to be above the FPS counter
      this.fowCheckbox.setPosition(10, bottomY - 30);
    }
    
    if (this.biomeCheckbox) {
      // Update position to be above the FOW toggle
      this.biomeCheckbox.setPosition(10, bottomY - 60);
    }
  }

  // Clean up when scene is shutdown
  shutdown() {
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
  }
} 