import Phaser from 'phaser';
import * as actions from "../store/actions";
import * as CoordinateUtils from "../utils/CoordinateUtils";
import { Coordinate } from '../store/gameStore';

// Manages the camera system for the board scene
export class CameraManager {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Camera zoom constraints
  private minZoom: number = 1.2;
  private maxZoom: number = 3.0;
  private defaultZoom: number = 2.0;
  
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

  /**
   * Asynchronously center the camera on a world position with smooth pan.
   */
  public centerOnAsync(x: number, y: number, duration: number = 0): Promise<void> {
    const camera = this.getCamera();
    if (duration <= 0) {
      camera.centerOn(x, y);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      camera.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, resolve);
      camera.pan(x, y, duration, 'Power2');
    });
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
  
  // Centers the camera on the player's first animal
  public centerCameraOnPlayerAnimal(
    tileSize: number,
    tileHeight: number,
    anchorX: number,
    anchorY: number
  ): void {
    const animalPosition = this.findFirstPlayerAnimal();
    if (!animalPosition) {
      console.warn("No animal found for current player");
      return;
    }

    const worldPosition = CoordinateUtils.gridToWorld(
      animalPosition.x,
      animalPosition.y,
      tileSize,
      tileHeight,
      anchorX,
      anchorY
    );

    console.log(`Camera centered on player animal at grid (${animalPosition.x},${animalPosition.y}) with max zoom`);
    this.centerOn(worldPosition.x, worldPosition.y);
    this.centerOn(worldPosition.x, worldPosition.y, 500);
  }
  
  // Finds the first animal owned by the player
  private findFirstPlayerAnimal(): Coordinate | null {
    const activePlayerId = actions.getActivePlayerId();
    const eggsRecord = actions.getEggs();

    // Find the first active animal owned by the current player
    const animal = actions.getAnimals().find(
      a => a.ownerId === activePlayerId && !(a.id in eggsRecord)
    );

    return animal ? animal.position : null;
  }
  
  /**
   * Center the camera on the closest active animal owned by the player.
   */
  public async centerCameraOnClosestAnimal(
    tileSize: number,
    tileHeight: number,
    anchorX: number,
    anchorY: number
  ): Promise<void> {
    const activePlayerId = actions.getActivePlayerId();
    const eggsRecord = actions.getEggs();

    // Get all active animals owned by the current player
    const animals = actions.getAnimals().filter(
      a => a.ownerId === activePlayerId && !(a.id in eggsRecord)
    );

    if (animals.length === 0) {
      console.warn("No animals found for current player");
      return;
    }

    // Compute world positions for each animal
    const animalPositions = animals.map(animal => ({
      animal,
      world: CoordinateUtils.gridToWorld(
        animal.position.x,
        animal.position.y,
        tileSize,
        tileHeight,
        anchorX,
        anchorY
      )
    }));

    const camera = this.getCamera();
    const centerX = camera.midPoint.x;
    const centerY = camera.midPoint.y;
    
    // Find the closest point to current camera center
    const closest = animalPositions.reduce((prev, cur) => {
      const dPrev = Phaser.Math.Distance.Between(prev.world.x, prev.world.y, centerX, centerY);
      const dCur = Phaser.Math.Distance.Between(cur.world.x, cur.world.y, centerX, centerY);
      return dCur < dPrev ? cur : prev;
    }, animalPositions[0]);
    
    // Pan to that position smoothly
    await this.centerOnAsync(closest.world.x, closest.world.y, 500);
  }
  
  // Clean up any resources used by the camera manager
  destroy(): void {
    // Remove any input handlers we set up
    const input = this.scene.input;
    input.off('pointermove');
    input.off('wheel');
  }
} 