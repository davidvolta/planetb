import Phaser from 'phaser';

/**
 * Manages the camera system for the board scene, including:
 * - Camera initialization and setup
 * - Zoom and pan functionality
 * - Camera bounds and constraints
 * - Screen-to-world coordinate handling
 */
export class CameraManager {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Camera zoom constraints
  private minZoom: number = 0.5;
  private maxZoom: number = 2.0;
  private defaultZoom: number = 1.2;
  
  // Track if camera is already set up
  private cameraSetup: boolean = false;
  
  // Default camera Y offset from center
  private defaultYOffset: number = 400;
  
  /**
   * Creates a new CameraManager
   * @param scene The parent scene
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Get the camera - only access when needed to avoid initialization issues
   */
  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }
  
  /**
   * Fully initialize the camera with bounds, position, and event handlers
   * @param options Optional configuration options
   */
  initialize(options: {
    worldWidth?: number;
    worldHeight?: number;
    defaultZoom?: number;
    yOffset?: number;
  } = {}): void {
    // Extract options with defaults
    const {
      worldWidth,
      worldHeight,
      defaultZoom = this.defaultZoom,
      yOffset = this.defaultYOffset
    } = options;
    
    // Set up the camera
    this.setupCamera(worldWidth, worldHeight, defaultZoom, yOffset);
    
    // Set up input handlers for camera control
    this.setupInputHandlers();
  }
  
  /**
   * Set up the camera with appropriate bounds and position
   * @param worldWidth Optional width of the game world
   * @param worldHeight Optional height of the game world
   * @param defaultZoom Initial zoom level
   * @param yOffset Y offset from center position
   */
  setupCamera(
    worldWidth?: number,
    worldHeight?: number,
    defaultZoom: number = this.defaultZoom,
    yOffset: number = this.defaultYOffset
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
    camera.centerOn(centerX, centerY + yOffset);
    
    // Set initial zoom level
    camera.setZoom(defaultZoom);
    
    // Mark camera as set up
    this.cameraSetup = true;
    
    console.log("Camera setup complete with bounds:", camera.getBounds());
  }
  
  /**
   * Set up input handlers for camera panning and zooming
   */
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
  
  /**
   * Convert screen coordinates to world coordinates
   * @param screenX X coordinate on screen
   * @param screenY Y coordinate on screen
   * @returns World coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    const worldPoint = this.getCamera().getWorldPoint(screenX, screenY);
    return { x: worldPoint.x, y: worldPoint.y };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   * @param worldX X coordinate in world
   * @param worldY Y coordinate in world
   * @returns Screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
    const camera = this.getCamera();
    // Calculate screen position manually based on camera position and zoom
    const screenX = (worldX - camera.scrollX) * camera.zoom;
    const screenY = (worldY - camera.scrollY) * camera.zoom;
    return { x: screenX, y: screenY };
  }
  
  /**
   * Center the camera on a specific world position
   * @param x X coordinate to center on
   * @param y Y coordinate to center on
   * @param duration Optional duration of camera movement (0 for instant)
   */
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
   * Zoom the camera to a specific level
   * @param zoomLevel Target zoom level
   * @param duration Optional duration of zoom (0 for instant)
   */
  zoomTo(zoomLevel: number, duration: number = 0): void {
    const camera = this.getCamera();
    // Clamp the zoom level to min/max constraints
    const targetZoom = Phaser.Math.Clamp(zoomLevel, this.minZoom, this.maxZoom);
    
    if (duration > 0) {
      // Animated zoom
      camera.zoomTo(targetZoom, duration);
    } else {
      // Instant zoom
      camera.setZoom(targetZoom);
    }
  }
  
  /**
   * Adjust camera zoom by a relative amount
   * @param amount Amount to adjust zoom (positive = zoom in, negative = zoom out)
   */
  adjustZoom(amount: number): void {
    const camera = this.getCamera();
    const newZoom = Phaser.Math.Clamp(
      camera.zoom + amount,
      this.minZoom,
      this.maxZoom
    );
    camera.setZoom(newZoom);
  }
  
  /**
   * Pan the camera by a relative amount
   * @param deltaX X distance to pan
   * @param deltaY Y distance to pan
   */
  pan(deltaX: number, deltaY: number): void {
    const camera = this.getCamera();
    camera.scrollX += deltaX;
    camera.scrollY += deltaY;
  }
  
  /**
   * Set camera zoom constraints
   * @param min Minimum zoom level
   * @param max Maximum zoom level
   */
  setZoomConstraints(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
  }
  
  /**
   * Set camera bounds
   * @param x X coordinate of top-left corner
   * @param y Y coordinate of top-left corner
   * @param width Width of bounds
   * @param height Height of bounds
   */
  setBounds(x: number, y: number, width: number, height: number): void {
    this.getCamera().setBounds(x, y, width, height);
  }
  
  /**
   * Enable or disable camera bounds
   * @param enabled Whether bounds should be enabled
   */
  setBoundsEnabled(enabled: boolean): void {
    const camera = this.getCamera();
    if (!enabled) {
      // Disable bounds by setting them to an extremely large area
      const largeValue = 1000000;
      camera.setBounds(-largeValue, -largeValue, largeValue * 2, largeValue * 2);
    }
  }
  
  /**
   * Follow a game object with the camera
   * @param target The game object to follow
   * @param offsetX Optional X offset
   * @param offsetY Optional Y offset
   */
  follow(target: Phaser.GameObjects.GameObject, offsetX: number = 0, offsetY: number = 0): void {
    this.getCamera().startFollow(target, false, 0.1, 0.1, offsetX, offsetY);
  }
  
  /**
   * Stop the camera from following any object
   */
  stopFollow(): void {
    this.getCamera().stopFollow();
  }
  
  /**
   * Reset the camera to its default state
   */
  reset(): void {
    const camera = this.getCamera();
    // Reset zoom to default
    camera.setZoom(this.defaultZoom);
    
    // Reset position to center
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    camera.centerOn(centerX, centerY);
    
    // Stop following if following something
    camera.stopFollow();
  }
  
  /**
   * Clean up any resources used by the camera manager
   */
  destroy(): void {
    // Remove any input handlers we set up
    const input = this.scene.input;
    input.off('pointermove');
    input.off('wheel');
    
    // No camera resources to clean up - the camera is owned by the scene
    // and will be destroyed when the scene is destroyed
    console.log("Camera manager resources cleaned up");
  }
} 