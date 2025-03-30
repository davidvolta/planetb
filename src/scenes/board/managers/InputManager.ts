import Phaser from 'phaser';
import * as actions from '../../../store/actions';
import * as CoordinateUtils from '../utils/CoordinateUtils';

/**
 * Manages all input handling for the BoardScene, including:
 * - Mouse/touch interactions (clicking, hovering, panning, zooming)
 * - Keyboard controls and shortcuts
 * - Event delegation for game objects
 */
export class InputManager {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Board properties needed for coordinate conversion
  private tileSize: number;
  private tileHeight: number;
  private anchorX: number;
  private anchorY: number;
  
  // Track if controls are already set up
  private controlsSetup: boolean = false;
  
  // Track if click event delegation is set up
  private clickDelegationSetup: boolean = false;
  
  // Callbacks for various input events
  private callbacks: {
    onTileClick?: (gameObject: Phaser.GameObjects.GameObject) => void;
    onHabitatClick?: (gameObject: Phaser.GameObjects.GameObject) => void;
    onPointerMove?: (worldX: number, worldY: number, pointer: Phaser.Input.Pointer) => void;
  } = {};
  
  /**
   * Creates a new InputManager
   * @param scene The parent scene
   * @param tileSize Width of a tile in pixels
   * @param tileHeight Height of a tile in pixels
   * @param anchorX Grid anchor X coordinate
   * @param anchorY Grid anchor Y coordinate
   */
  constructor(
    scene: Phaser.Scene,
    tileSize: number = 64,
    tileHeight: number = 32,
    anchorX: number = 0,
    anchorY: number = 0
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
  
  /**
   * Get the camera - only access when needed to avoid initialization issues
   */
  private getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }
  
  /**
   * Initialize the input manager with current anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
  
  /**
   * Set up all input controls (camera panning, zooming, etc.)
   */
  setupControls(): void {
    // Don't set up controls more than once
    if (this.controlsSetup) {
      return;
    }
    
    // Set up camera panning on pointer move while mouse/touch is down
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const camera = this.getCamera();
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
      }
      
      // Call the pointer move callback if set
      if (this.callbacks.onPointerMove) {
        const worldPoint = this.getCamera().getWorldPoint(pointer.x, pointer.y);
        this.callbacks.onPointerMove(worldPoint.x, worldPoint.y, pointer);
      }
    });
    
    // Set up mouse wheel zoom
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      const camera = this.getCamera();
      const zoom = camera.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 2);
      camera.setZoom(newZoom);
    });
    
    // Mark controls as set up
    this.controlsSetup = true;
  }
  
  /**
   * Set up click event delegation for game objects
   */
  setupClickEventDelegation(): void {
    // Don't set up click delegation more than once
    if (this.clickDelegationSetup) {
      return;
    }
    
    // Add global click handler for any game object
    this.scene.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      // Check if the clicked object has grid coordinates
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        // If the object has grid coordinates stored, it's a tile or habitat
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        
        if (gridX !== undefined && gridY !== undefined) {
          // Check if this is a habitat or a tile
          if (gameObject.getData('habitatId') && this.callbacks.onHabitatClick) {
            // This is a habitat, call the habitat click handler
            this.callbacks.onHabitatClick(gameObject);
          } else if (this.callbacks.onTileClick) {
            // This is a tile, call the tile click handler
            this.callbacks.onTileClick(gameObject);
          }
        }
      }
    });
    
    // Mark click delegation as set up
    this.clickDelegationSetup = true;
  }
  
  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardControls(): void {
    // Clear any existing keyboard shortcuts to prevent duplication
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllKeys(true);
      
      // Handle spawn with 'S' key directly in BoardScene
      this.scene.input.keyboard.on('keydown-S', () => {
        // Check if there's a selected dormant unit
        const selectedUnitId = actions.getSelectedUnitId();
        const selectedUnitIsDormant = actions.isSelectedUnitDormant();
        
        // If we have a selected dormant unit, evolve it (spawn)
        if (selectedUnitId && selectedUnitIsDormant) {
          actions.evolveAnimal(selectedUnitId);
          actions.deselectUnit();
          actions.recordSpawnEvent(selectedUnitId);
        }
      });
      
      // Handle next turn with 'N' key
      this.scene.input.keyboard.on('keydown-N', () => {
        const nextTurn = actions.getNextTurn();
        nextTurn();
      });
      
      // Handle improve habitat with 'I' key
      this.scene.input.keyboard.on('keydown-I', () => {
        // Only handle if a potential habitat is selected
        const selectedHabitatId = actions.getSelectedHabitatId();
        const selectedHabitatIsPotential = actions.isSelectedHabitatPotential();
        
        if (selectedHabitatId && selectedHabitatIsPotential) {
          // Call the improve habitat action (this would need to be implemented)
          // actions.improveHabitat(selectedHabitatId);
          actions.selectHabitat(null); // Deselect the habitat after improving
        }
      });
    }
  }
  
  /**
   * Set callback for tile click events
   * @param callback The function to call when a tile is clicked
   */
  onTileClick(callback: (gameObject: Phaser.GameObjects.GameObject) => void): void {
    this.callbacks.onTileClick = callback;
  }
  
  /**
   * Set callback for habitat click events
   * @param callback The function to call when a habitat is clicked
   */
  onHabitatClick(callback: (gameObject: Phaser.GameObjects.GameObject) => void): void {
    this.callbacks.onHabitatClick = callback;
  }
  
  /**
   * Set callback for pointer move events
   * @param callback The function to call when the pointer moves
   */
  onPointerMove(callback: (worldX: number, worldY: number, pointer: Phaser.Input.Pointer) => void): void {
    this.callbacks.onPointerMove = callback;
  }
  
  /**
   * Convert screen coordinates to grid coordinates
   * @param screenX X coordinate on screen
   * @param screenY Y coordinate on screen
   * @returns Grid coordinates or null if invalid
   */
  getGridPositionAt(screenX: number, screenY: number): { x: number, y: number } | null {
    // Get board data
    const board = actions.getBoard();
    if (!board) return null;
    
    // Get world point from screen coordinates
    const worldPoint = this.getCamera().getWorldPoint(screenX, screenY);
    
    // Convert to grid using the utility
    const gridPosition = CoordinateUtils.screenToGrid(
      0, 0, // Not used when worldPoint is provided
      this.tileSize,
      this.tileHeight,
      this.anchorX,
      this.anchorY,
      worldPoint
    );
    
    // Check if grid position is valid
    if (CoordinateUtils.isValidCoordinate(gridPosition.x, gridPosition.y, board.width, board.height)) {
      return gridPosition;
    }
    
    return null;
  }
  
  /**
   * Clean up resources when no longer needed
   */
  destroy(): void {
    // Clean up keyboard listeners
    if (this.scene.input && this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown-S');
      this.scene.input.keyboard.off('keydown-N');
      this.scene.input.keyboard.off('keydown-I');
    }
    
    // Clean up pointer listeners
    this.scene.input.off('gameobjectdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('wheel');
    
    // Reset flags
    this.controlsSetup = false;
    this.clickDelegationSetup = false;
    
    // Clear callbacks
    this.callbacks = {};
  }
} 