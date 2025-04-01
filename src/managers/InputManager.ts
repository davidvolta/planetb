import Phaser from 'phaser';
import * as actions from '../store/actions';
import * as CoordinateUtils from '../utils/CoordinateUtils';

// Manages all input handling for the BoardScene, including: 
// Mouse/touch interactions (clicking, hovering, panning, zooming), keyboard controls and shortcuts
// Event delegation for game objects
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
    onPointerMove?: (worldX: number, worldY: number, pointer: Phaser.Input.Pointer) => void;
  } = {};
  
  // Creates a new InputManager
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
  
  // Get the camera - only access when needed to avoid initialization issues
  private getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }
  
  // Initialize the input manager with current anchor position
  initialize(anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
  
  // Set up all input controls (camera panning, zooming, etc.)
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
  
  // Set up click event delegation for game objects
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
        
        if (gridX !== undefined && gridY !== undefined && this.callbacks.onTileClick) {
          // Call the generic tile click handler for all clickable grid objects
          this.callbacks.onTileClick(gameObject);
        }
      }
    });
    
    // Mark click delegation as set up
    this.clickDelegationSetup = true;
  }
  
  // Set up keyboard shortcuts
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
        // Only handle if a potential habitat is selected and can be improved
        const selectedHabitatId = actions.getSelectedHabitatId();
        const selectedHabitatIsPotential = actions.isSelectedHabitatPotential();
        
        if (selectedHabitatId && 
            selectedHabitatIsPotential && 
            actions.canImproveHabitat(selectedHabitatId)) {
          // Call the improve habitat action
          actions.improveHabitat(selectedHabitatId);
          actions.selectHabitat(null); // Deselect the habitat after improving
          
          // End the turn after habitat improvement
          actions.getNextTurn()();
        }
      });
    }
  }
  
  // Set callback for tile click events (for both tiles and habitats)
  onTileClick(callback: (gameObject: Phaser.GameObjects.GameObject) => void): void {
    this.callbacks.onTileClick = callback;
  }
  
  // Set callback for pointer move events
  onPointerMove(callback: (worldX: number, worldY: number, pointer: Phaser.Input.Pointer) => void): void {
    this.callbacks.onPointerMove = callback;
  }
  
  // Convert screen coordinates to grid coordinates
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
  
  // Clean up all resources and event listeners
  destroy(): void {
    // Remove all keyboard shortcuts
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllKeys(true);
    }
    
    // Clear all callback references
    this.callbacks = {};
  }
} 