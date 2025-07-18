import Phaser from "phaser";
import BoardScene from "./BoardScene";
import { RESOURCE_GENERATION_PERCENTAGE } from "../constants/gameConfig";
import { setFogOfWarEnabled, getFogOfWarEnabled } from "../store/actions";
import { GameEnvironment } from '../env/GameEnvironment';

export default class DebugScene extends Phaser.Scene {
  
  private fpsText!: Phaser.GameObjects.Text;
  private boardScene: BoardScene | null = null;
  private pauseButton!: Phaser.GameObjects.Text;
  private isPaused: boolean = false;
  
  // FOW toggle elements
  private fowCheckbox!: Phaser.GameObjects.Container;
  private fowCheckboxText!: Phaser.GameObjects.Text;
  private fowCheckboxBox!: Phaser.GameObjects.Rectangle;
  private fowCheckboxInner!: Phaser.GameObjects.Rectangle;
  private fowEnabled: boolean = true;
  
  // Resource percentage slider elements
  private resourceSlider!: Phaser.GameObjects.Container;
  private resourceSliderText!: Phaser.GameObjects.Text;
  private resourceSliderTrack!: Phaser.GameObjects.Rectangle;
  private resourceSliderHandle!: Phaser.GameObjects.Rectangle;
  private resourcePercentText!: Phaser.GameObjects.Text;
  private resourcePercentage: number = RESOURCE_GENERATION_PERCENTAGE; // Initialize from constant
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
    const padding = 10;
    const leftX = 30;
    const bottomY = this.cameras.main.height - 10;
    const lineHeight = 25;
    
    // Get the board scene
    this.boardScene = this.scene.get('BoardScene') as BoardScene;
    
    // Initialize FOW toggle from store
    this.fowEnabled = getFogOfWarEnabled();
    
    // Stack all controls vertically on the left
    let currentY = bottomY;
    
    // Create game mode display (bottom of stack)
    const modeText = this.add.text(leftX, currentY, `Mode: ${GameEnvironment.mode}`, {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000)
    .setOrigin(0, 1);
    
    currentY -= lineHeight;
    
    // Create resource slider
    this.createResourceSlider(leftX, currentY);
    
    currentY -= lineHeight;
    
    // Create FOW checkbox
    this.createFowCheckbox(leftX, currentY);
    
    currentY -= lineHeight;
    
    // Create pause button if in SIM mode
    if (GameEnvironment.mode === 'sim') {
      this.createPauseButton(leftX, currentY);
    }
    
    // Create FPS display on the far right (unchanged)
    this.fpsText = this.add.text(this.cameras.main.width - padding, bottomY, "FPS: 0", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    })
    .setScrollFactor(0)
    .setDepth(1000)
    .setOrigin(1, 1);
    
    // Store reference to mode text for resize handler
    (this as any).modeText = modeText;
    
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
    }).setOrigin(0, 1); // Align with bottom
    
    // Get width of text to position slider after it
    const textWidth = this.resourceSliderText.width;
    
    // Create slider track with matching height
    const trackWidth = 100;
    this.resourceSliderTrack = this.add.rectangle(textWidth + 15, 0, trackWidth, 16, 0x333333)
      .setStrokeStyle(1, 0x00FF00)
      .setOrigin(0, 1); // Align with bottom
    
    // Initialize the handle position based on the current resource percentage
    // Already initialized from constant in class declaration
    
    // Create slider handle at correct position
    this.resourceSliderHandle = this.add.rectangle(
      textWidth + 15 + (trackWidth * this.resourcePercentage), 
      0, 
      12, 
      16, 
      0x00FF00
    ).setOrigin(0.5, 1) // Align with bottom
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
    ).setOrigin(0, 1); // Align with bottom
    
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
    const percentage = Math.max(0, Math.min(1, x / trackWidth));
    this.updateSliderUI(percentage);
    
    // Update the resource percentage and reset resources
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
    const percentage = Math.max(0, Math.min(1, x / trackWidth));
    this.updateSliderUI(percentage);
    
    // Update the resource percentage and reset resources
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
  
  // Update the resource percentage and reset resources
  private updateResourcePercentage(percentage: number): void {
    // Update the instance value
    this.resourcePercentage = percentage;
    
    // Reset resources if board scene exists
    if (this.boardScene && typeof this.boardScene.resetResources === 'function') {
      this.boardScene.resetResources(percentage);
    }
  }

  // Create a FOW toggle checkbox
  private createFowCheckbox(x: number, y: number): void {
    // Create container for the checkbox and label
    this.fowCheckbox = this.add.container(x, y);
    this.fowCheckbox.setDepth(1000);
    
    // Create checkbox outline on the left
    this.fowCheckboxBox = this.add.rectangle(0, 0, 16, 16, 0x00FF00, 0)
      .setStrokeStyle(2, 0x00FF00)
      .setOrigin(0, 1) // Align with bottom
      .setInteractive({ useHandCursor: true });
    
    // Create checkbox inner fill (centered in the 16x16 box)
    this.fowCheckboxInner = this.add.rectangle(8, -8, 10, 10, 0x00FF00, 1)
      .setOrigin(0.5, 0.5); // Center the inner square
    this.fowCheckboxInner.setVisible(this.fowEnabled);
    
    // Create label to the right of checkbox
    const labelOffset = 16 + 10;
    this.fowCheckboxText = this.add.text(labelOffset, 0, "FOW", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 1); // Align with bottom
    
    // Add components to container in order
    this.fowCheckbox.add([this.fowCheckboxBox, this.fowCheckboxInner, this.fowCheckboxText]);
    
    // Set up click handlers
    this.fowCheckboxBox.on('pointerdown', this.toggleFow, this);
    this.fowCheckboxText.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.toggleFow, this);
  }
  
  // Toggle fog of war state
  private toggleFow(): void {
    this.fowEnabled = !this.fowEnabled;
    this.fowCheckboxInner.setVisible(this.fowEnabled);
    // Update fog-of-war state via actions
    setFogOfWarEnabled(this.fowEnabled);
    // The FOWRenderer will handle the rest through subscriptions
  }

  private createPauseButton(x: number, y: number): void {
    this.pauseButton = this.add.text(x, y, "Pause", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00FF00",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 1) // Align with bottom
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.togglePause, this);
  }

  private togglePause(): void {
    if (this.isPaused) {
      this.scene.resume('BoardScene');
      this.pauseButton.setText('Pause');
    } else {
      this.scene.pause('BoardScene');
      this.pauseButton.setText('Resume');
    }
    this.isPaused = !this.isPaused;
  }

  update() {
    const fps = this.game.loop.actualFps.toFixed(1);
    this.fpsText.setText(`FPS: ${fps}`);
  }

  // Handle window resize
  private handleResize() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bottomY = height - 10;
    const padding = 10;
    const leftX = 30;
    const lineHeight = 25;
    
    let currentY = bottomY;
    
    // Position game mode display (bottom of stack)
    const modeText = (this as any).modeText;
    if (modeText) {
      modeText.setPosition(leftX, currentY);
    }
    
    currentY -= lineHeight;
    
    // Position resource slider
    if (this.resourceSlider) {
      this.resourceSlider.setPosition(leftX, currentY);
    }
    
    currentY -= lineHeight;
    
    // Position FOW checkbox
    if (this.fowCheckbox) {
      this.fowCheckbox.setPosition(leftX, currentY);
    }
    
    currentY -= lineHeight;
    
    // Position pause button
    if (this.pauseButton) {
      this.pauseButton.setPosition(leftX, currentY);
    }
    
    // Position FPS on the far right (unchanged)
    this.fpsText.setPosition(width - padding, bottomY);
  }

  // Clean up when scene is shutdown
  shutdown() {
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
    
    // Remove pointer event listeners
    this.input.off('pointerup', this.handlePointerUp, this);
  }
} 