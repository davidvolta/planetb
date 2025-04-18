import Phaser from "phaser";
import BoardScene from "./BoardScene";
import { GameConfig } from "../store/gameStore";

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
  
  // Resource percentage slider elements
  private resourceSlider!: Phaser.GameObjects.Container;
  private resourceSliderText!: Phaser.GameObjects.Text;
  private resourceSliderTrack!: Phaser.GameObjects.Rectangle;
  private resourceSliderHandle!: Phaser.GameObjects.Rectangle;
  private resourcePercentText!: Phaser.GameObjects.Text;
  private resourcePercentage: number = 0.5; // Default to 50%
  private isDraggingSlider: boolean = false;

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
    this.createResourceSlider(leftX, bottomY - 90); // Above biome toggle
    
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
    
    // Listen for pointer up event on the entire scene for slider handling
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  // Create a resource percentage slider
  private createResourceSlider(x: number, y: number): void {
    // Create container for the slider and label
    this.resourceSlider = this.add.container(x, y);
    this.resourceSlider.setDepth(1000);
    
    // Create label first
    this.resourceSliderText = this.add.text(0, 0, "Resources", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 0.5);
    
    // Get width of text to position slider after it
    const textWidth = this.resourceSliderText.width;
    
    // Create slider track
    const trackWidth = 100;
    this.resourceSliderTrack = this.add.rectangle(textWidth + 15, 0, trackWidth, 10, 0x333333)
      .setStrokeStyle(1, 0x00FF00)
      .setOrigin(0, 0.5);
    
    // Create slider handle
    this.resourceSliderHandle = this.add.rectangle(
      textWidth + 15 + (trackWidth * this.resourcePercentage), 
      0, 
      12, 
      16, 
      0x00FF00
    ).setOrigin(0.5, 0.5)
     .setInteractive({ useHandCursor: true });
    
    // Create text to show the percentage
    this.resourcePercentText = this.add.text(
      textWidth + trackWidth + 25, 
      0, 
      `${Math.round(this.resourcePercentage * 100)}%`, 
      {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#00FF00",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: { x: 5, y: 2 },
      }
    ).setOrigin(0, 0.5);
    
    // Add components to container
    this.resourceSlider.add([
      this.resourceSliderText, 
      this.resourceSliderTrack, 
      this.resourceSliderHandle,
      this.resourcePercentText
    ]);
    
    // Setup slider interaction
    this.resourceSliderHandle
      .on('pointerdown', this.startDraggingSlider, this)
      .on('pointermove', this.dragSlider, this);
    
    // Make the track also interactive
    this.resourceSliderTrack.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.clickSliderTrack, this);
  }
  
  // Handler for clicking on the slider track
  private clickSliderTrack(pointer: Phaser.Input.Pointer): void {
    const x = pointer.x - this.resourceSlider.x - this.resourceSliderTrack.x;
    const trackWidth = this.resourceSliderTrack.width;
    
    // Calculate percentage based on click position
    let percentage = Math.max(0, Math.min(1, x / trackWidth));
    this.updateSliderUI(percentage);
    
    // Update the resource percentage and regenerate resources
    this.updateResourcePercentage(percentage);
  }
  
  // Start dragging the slider handle
  private startDraggingSlider(): void {
    this.isDraggingSlider = true;
  }
  
  // Handle slider dragging
  private dragSlider(pointer: Phaser.Input.Pointer): void {
    if (!this.isDraggingSlider) return;
    
    const trackStart = this.resourceSlider.x + this.resourceSliderTrack.x;
    const trackWidth = this.resourceSliderTrack.width;
    const x = pointer.x - trackStart;
    
    // Calculate percentage based on drag position
    let percentage = Math.max(0, Math.min(1, x / trackWidth));
    this.updateSliderUI(percentage);
    
    // Update the resource percentage and regenerate resources
    this.updateResourcePercentage(percentage);
  }
  
  // Handle pointer up to stop dragging
  private handlePointerUp(): void {
    this.isDraggingSlider = false;
  }
  
  // Update the slider UI based on the percentage
  private updateSliderUI(percentage: number): void {
    // Position the handle
    const trackStart = this.resourceSliderTrack.x;
    const trackWidth = this.resourceSliderTrack.width;
    this.resourceSliderHandle.x = trackStart + (trackWidth * percentage);
    
    // Update percentage text
    this.resourcePercentText.setText(`${Math.round(percentage * 100)}%`);
    
    // Update the stored percentage
    this.resourcePercentage = percentage;
  }
  
  // Update the resource percentage and regenerate resources
  private updateResourcePercentage(percentage: number): void {
    // Set the resource percentage in GameConfig
    GameConfig.setResourcePercentage(percentage);
    
    // Regenerate resources if board scene exists
    if (this.boardScene && typeof this.boardScene.regenerateResources === 'function') {
      this.boardScene.regenerateResources();
    }
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
    
    if (this.resourceSlider) {
      // Update position to be above the biome toggle
      this.resourceSlider.setPosition(10, bottomY - 90);
    }
  }

  // Clean up when scene is shutdown
  shutdown() {
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
    
    // Remove pointer event listeners
    this.input.off('pointerup', this.handlePointerUp, this);
  }
} 