import Phaser from 'phaser';
import * as actions from "../store/actions";
import { AnimalState } from "../store/gameStore";
import * as CoordinateUtils from "../utils/CoordinateUtils";

// Manages the camera system for the board scene
export class CameraManager {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Camera zoom constraints
  private minZoom: number = 2.0;
  private maxZoom: number = 6.0;
  private defaultZoom: number = 3.0;
  
  // Track if camera is already set up
  private cameraSetup: boolean = false;
  
  // Creates a new CameraManager
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  // Get the camera - only access when needed to avoid initialization issues
  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }
  
  // Fully initialize the camera with bounds, position, and event handlers
  initialize(options: {
    worldWidth?: number;
    worldHeight?: number;
    defaultZoom?: number;
  } = {}): void {
    // Extract options with defaults
    const {
      worldWidth,
      worldHeight,
      defaultZoom = this.defaultZoom,
    } = options;
    
    // Set up the camera
    this.setupCamera(worldWidth, worldHeight, defaultZoom);
    
    // Set up input handlers for camera control
    this.setupInputHandlers();
  }
  
  //Set up the camera with appropriate bounds and position
  setupCamera(
    worldWidth?: number,
    worldHeight?: number,
    defaultZoom: number = this.defaultZoom,
  ): void {
    // Don't set up camera more than once
    if (this.cameraSetup) {
      return;
    }
    
    const camera = this.getCamera();
    
    // If no world dimensions provided, create large default bounds
    const width = worldWidth || camera.width * 4;
    const height = worldHeight || camera.height * 4;
    
    // Set bounds centered on origin
    camera.setBounds(-width/2, -height/2, width, height);
    
    // Set a fixed camera position with downward offset for better initial view
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    
    // Center camera with offset
    camera.centerOn(centerX, centerY);
    
    // Set initial zoom level
    camera.setZoom(defaultZoom);
    
    // Mark camera as set up
    this.cameraSetup = true;
    
    console.log("Camera setup complete with bounds:", camera.getBounds());
  }
  
  // Set up input handlers for camera panning and zooming
  setupInputHandlers(): void {
    // Add panning for dragging
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        // Calculate delta in world space accounting for zoom
        const deltaX = -(pointer.x - pointer.prevPosition.x) / this.getCamera().zoom;
        const deltaY = -(pointer.y - pointer.prevPosition.y) / this.getCamera().zoom;
        
        // Use camera manager to pan
        this.pan(deltaX, deltaY);
      }
    });
    
    // Add mouse wheel zoom
    this.scene.input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      gameObjects: Phaser.GameObjects.GameObject[],
      deltaX: number,
      deltaY: number
    ) => {
      // Apply zoom based on wheel movement
      this.adjustZoom(-deltaY * 0.001);
    });
    
    console.log("Camera input handlers initialized");
  }
  
  // Center the camera on a specific world position
  centerOn(x: number, y: number, duration: number = 0): void {
    const camera = this.getCamera();
    if (duration > 0) {
      // Animated camera movement
      camera.pan(x, y, duration, 'Power2');
    } else {
      // Instant camera movement
      camera.centerOn(x, y);
    }
  }

  // Pan the camera by the specified amount
  pan(deltaX: number, deltaY: number): void {
    const camera = this.getCamera();
    camera.scrollX += deltaX;
    camera.scrollY += deltaY;
  }
  
  // Adjust camera zoom by the specified amount, respecting min/max constraints
  adjustZoom(amount: number): void {
    const camera = this.getCamera();
    const newZoom = Phaser.Math.Clamp(
      camera.zoom + amount,
      this.minZoom,
      this.maxZoom
    );
    camera.setZoom(newZoom);
  }
  
  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    const worldPoint = this.getCamera().getWorldPoint(screenX, screenY);
    return { x: worldPoint.x, y: worldPoint.y };
  }
  
  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
    const camera = this.getCamera();
    // Calculate screen position manually based on camera position and zoom
    const screenX = (worldX - camera.scrollX) * camera.zoom;
    const screenY = (worldY - camera.scrollY) * camera.zoom;
    return { x: screenX, y: screenY };
  }
  
  //Set camera bounds
  setBounds(x: number, y: number, width: number, height: number): void {
    this.getCamera().setBounds(x, y, width, height);
  }
  
  // Centers the camera on the player's first unit
  centerCameraOnPlayerUnit(
    tileSize: number,
    tileHeight: number,
    anchorX: number,
    anchorY: number
  ): void {
    const unitPosition = this.findPlayerFirstUnit();
    if (unitPosition) {
      const worldPos = CoordinateUtils.gridToWorld(
        unitPosition.x, 
        unitPosition.y, 
        tileSize, 
        tileHeight,
        anchorX,
        anchorY
      );
      this.centerOn(worldPos.x, worldPos.y);
      console.log(`Camera centered on player unit at grid (${unitPosition.x},${unitPosition.y}) with max zoom`);
    }
  }
  
  //Finds the first unit owned by the player
  private findPlayerFirstUnit(): { x: number, y: number } | null {
    const animals = actions.getAnimals();
    const currentPlayerId = actions.getCurrentPlayerId();
    
    // Find the first active unit owned by the current player
    const playerUnit = animals.find((animal: any) => 
      animal.ownerId === currentPlayerId && 
      animal.state === AnimalState.ACTIVE
    );
    
    if (playerUnit) {
      return playerUnit.position;
    }
    
    return null;
  }
  
  // Clean up any resources used by the camera manager
  destroy(): void {
    // Remove any input handlers we set up
    const input = this.scene.input;
    input.off('pointermove');
    input.off('wheel');
  }
} 