import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState, Habitat, HabitatState, Animal } from "../store/gameStore";
import * as actions from "../store/actions";
import { ValidMove } from "../store/gameStore";
import * as CoordinateUtils from "./board/utils/CoordinateUtils";
import { LayerManager } from "./board/managers/LayerManager";
import { TileRenderer } from "./board/renderers/TileRenderer";
import { SelectionRenderer } from "./board/renderers/SelectionRenderer";
import { MoveRangeRenderer } from "./board/renderers/MoveRangeRenderer";
import { HabitatRenderer } from "./board/renderers/HabitatRenderer";
import { AnimalRenderer } from "./board/renderers/AnimalRenderer";
import { InputManager } from "./board/managers/InputManager";
import { AnimationController } from "./board/controllers/AnimationController";
import { CameraManager } from "./board/managers/CameraManager";
import { StateSubscriptionManager } from "./board/managers/StateSubscriptionManager";

// Custom event names
export const EVENTS = {
  ASSETS_LOADED: 'assetsLoaded'
};

// Delegate functionality to managers and ensure proper lifecycle management

export default class BoardScene extends Phaser.Scene {
  // Keep the tiles array for compatibility with existing code
  private tiles: Phaser.GameObjects.GameObject[] = [];
  
  // Fixed tile properties
  private tileSize = 64; 
  private tileHeight = 32; 
  
  // Store fixed anchor positions for the grid
  private anchorX = 0; 
  private anchorY = 0;
  
  // Layer management
  private layerManager: LayerManager;
  
  // Renderers
  private tileRenderer: TileRenderer;
  private selectionRenderer: SelectionRenderer;
  private moveRangeRenderer: MoveRangeRenderer;
  private habitatRenderer: HabitatRenderer;
  private animalRenderer: AnimalRenderer;
  
  // Setup tracking
  private controlsSetup = false;
  private subscriptionsSetup = false;
  
  // Managers and controllers
  private inputManager: InputManager;
  private animationController: AnimationController;
  private cameraManager: CameraManager;
  private subscriptionManager: StateSubscriptionManager;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize the layer manager
    this.layerManager = new LayerManager(this);
    
    // Initialize renderers
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.habitatRenderer = new HabitatRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize managers
    this.inputManager = new InputManager(this, this.tileSize, this.tileHeight);
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight);
    this.cameraManager = new CameraManager(this);
    
    // Initialize the state subscription manager
    this.subscriptionManager = new StateSubscriptionManager(
      this,
      {
        animalRenderer: this.animalRenderer,
        habitatRenderer: this.habitatRenderer,
        moveRangeRenderer: this.moveRangeRenderer,
        animationController: this.animationController,
        tileRenderer: this.tileRenderer
      }
    );
  }

  /**
   * Preload assets needed for the scene
   */
  preload() {
    // Load all animal sprites
    this.load.image("egg", "assets/egg.png");      // Dormant state for all animals
    this.load.image("buffalo", "assets/buffalo.png");
    this.load.image("bird", "assets/bird.png");    // For mountain habitats
    this.load.image("bunny", "assets/bunny.png");
    this.load.image("snake", "assets/snake.png");
    this.load.image("fish", "assets/fish.png");
    
    // Load the selection indicator asset
    this.load.image("selector", "assets/selector.png");

    this.load.on('complete', () => {
      this.events.emit(EVENTS.ASSETS_LOADED);
    });
  }
  
  /**
   * Initialize the scene
   * @param data Optional data passed to the scene
   */
  init(data?: any) {
    console.log("BoardScene init() called", data ? `with data: ${JSON.stringify(data)}` : "without data");
    
    // Clear previous tiles array
    this.tiles = [];
    
    // Ensure all old subscriptions are cleaned up before creating new ones
    this.unsubscribeAll();
    
    // Reset setup flags
    this.subscriptionsSetup = false;
    this.controlsSetup = false;
    
    // Initialize all managers
    this.initializeManagers();
    
    // Set up layers 
    this.layerManager.setupLayers();
  }
  
  /**
   * Initialize all managers with current settings
   * This centralizes all manager initialization in one place
   */
  private initializeManagers(): void {
    // Set anchor points for coordinate system
    const anchorX = this.cameras.main.width / 2;
    const anchorY = this.cameras.main.height / 2;
    
    // Store these values for future reference
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    
    // Initialize all renderers with anchor coordinates
    this.tileRenderer.initialize(anchorX, anchorY);
    this.selectionRenderer.initialize(anchorX, anchorY);
    this.moveRangeRenderer.initialize(anchorX, anchorY);
    this.habitatRenderer.initialize(anchorX, anchorY);
    this.animalRenderer.initialize(anchorX, anchorY);
    
    // Initialize managers with anchor coordinates
    this.inputManager.initialize(anchorX, anchorY);
    this.animationController.initialize(anchorX, anchorY);
  }
  
  /**
   * Create and set up the scene
   */
  create() {
    console.log("BoardScene create() called", this.scene.key);
    
    // Set up camera
    this.setupCamera();
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Get board data
    const board = actions.getBoard();
    
    // If we have board data, create the board
    if (board) {
      // Create board tiles
      this.createTiles();
      
      // Set up state subscriptions
      this.setupSubscriptions();
      
      // Log final layer state after setup
      console.log("FINAL LAYER STATE AFTER RENDERING:");
      this.logLayerInfo();
    }
  }
  
  /**
   * Set up camera with initial position and zoom level
   */
  private setupCamera(): void {
    // Set fixed camera bounds that are large enough for any reasonable map size
    const worldWidth = this.cameras.main.width * 4;
    const worldHeight = this.cameras.main.height * 4;
    
    // Configure camera through the Phaser camera system
    this.cameras.main.setBounds(-worldWidth/2, -worldHeight/2, worldWidth, worldHeight);
    
    // Set initial camera position with downward offset
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const cameraYOffset = 400; // Move camera down by this amount
    
    // Position and zoom camera
    this.cameras.main.centerOn(centerX, centerY + cameraYOffset);
    this.cameras.main.setZoom(1.2); // Set default zoom level
    
    // Now that camera is configured, tell the camera manager about it
    this.cameraManager.setupCamera();
    
    // Set up camera input handlers
    this.setupCameraInputHandlers();
  }
  
  /**
   * Set up all state subscriptions
   */
  private setupSubscriptions() {
    // Use the StateSubscriptionManager to set up subscriptions
    this.subscriptionManager.setupSubscriptions(
      (animalId, gridX, gridY) => this.handleUnitSelection(animalId)
    );
    
    // Mark subscriptions as set up
    this.subscriptionsSetup = true;
  }
  
  /**
   * Clean up all subscriptions to prevent memory leaks
   */
  private unsubscribeAll() {
    // Use the StateSubscriptionManager to unsubscribe
    this.subscriptionManager.unsubscribeAll();
    
    // Also unsubscribe any lingering direct subscriptions by key prefix
    const boardScenePrefix = 'BoardScene.';
    StateObserver.getActiveSubscriptions().forEach(key => {
      if (key.startsWith(boardScenePrefix)) {
        StateObserver.unsubscribe(key);
      }
    });
  }

  /**
   * Update the board without restarting the scene
   */
  updateBoard() {
    // Check if we need to setup the layers
    const needsSetup = !this.layerManager.isLayersSetup();
    
    // Set up layers if needed
    if (needsSetup) {
      this.layerManager.setupLayers();
    }
    
    // Create new tiles using TileRenderer
    this.createTiles();
    
    console.log("Board updated with layer-based structure");
  }
  
  /**
   * Debug method to log information about layers
   */
  private logLayerInfo() {
    this.layerManager.logLayerInfo();
    
    // Log tile count
    console.log(`Total tiles: ${this.tiles.length}`);
  }
  
  /**
   * Render animals using AnimalRenderer
   * @param animals Animals to render
   */
  renderAnimalSprites(animals: Animal[]) {
    // Delegate to the AnimalRenderer, providing a callback for handling unit clicks
    this.animalRenderer.renderAnimals(animals, (animalId, gridX, gridY) => {
      console.log(`Animal clicked: ${animalId} at ${gridX},${gridY}`);
            
      // Handle active unit click - select for movement
      const selectedUnitId = actions.getSelectedUnitId();
      
      if (selectedUnitId && actions.isMoveMode()) {
        // If we already have a unit selected, check if this is a valid move target
        const validMoves = actions.getValidMoves();
        const canMoveHere = validMoves.some(move => move.x === gridX && move.y === gridY);
        
        if (canMoveHere) {
          // Get current position of selected unit
          const selectedUnit = actions.getAnimals().find(a => a.id === selectedUnitId);
          if (selectedUnit) {
            // Start movement animation
            this.startUnitMovement(
              selectedUnitId, 
              selectedUnit.position.x, 
              selectedUnit.position.y, 
              gridX, 
              gridY
            );
          }
        } else {
          // Not a valid move target, select this unit instead
          this.handleUnitSelection(animalId);
        }
      } else {
        // No unit selected, select this one
        this.handleUnitSelection(animalId);
      }
    });
  }
  
  /**
   * Scene shutdown handler
   * Cleans up resources and event listeners
   */
  shutdown() {
    console.log("BoardScene shutdown() called");
    
    // Clean up subscriptions
    this.unsubscribeAll();
    
    // Clean up layers
    this.layerManager.clearAllLayers(true);
    
    // Clean up input handlers
    this.input.removeAllListeners();
    
    // Clean up renderers
    this.tileRenderer.destroy();
    this.selectionRenderer.destroy();
    this.moveRangeRenderer.destroy();
    this.habitatRenderer.destroy();
    this.animalRenderer.destroy();
    
    // Clean up managers
    this.inputManager.destroy();
    this.cameraManager.destroy();
    this.animationController.destroy();
    this.subscriptionManager.destroy();
    
    // Reset variables
    this.tiles = [];
    this.controlsSetup = false;
    this.subscriptionsSetup = false;
  }
  
  /**
   * Create tiles for the board
   */
  private createTiles() {
    // Get board data using actions
    const board = actions.getBoard();
    if (!board) {
      console.warn("No board available");
      // Add a simple message in the center of the screen
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 
        "No board data available", 
        { color: '#ffffff', fontSize: '24px' }
      ).setOrigin(0.5);
      return;
    }

    console.log(`Creating tiles for board: ${board.width}x${board.height}`);

    // Calculate anchor coordinates
    const anchorX = this.cameras.main.width / 2;
    const anchorY = this.cameras.main.height / 2;
    
    // Store these anchor positions for coordinate conversions
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    
    // Use TileRenderer to create all board tiles
    this.tiles = this.tileRenderer.createBoardTiles(board, anchorX, anchorY);
    
    // Initialize renderers after tiles are created
    this.selectionRenderer.initialize(anchorX, anchorY);
    
    // Set up input handlers if they're not already set up
    if (!this.controlsSetup) {
      this.setupInputHandlers();
    }
  }

  /**
   * Handle tile clicks
   * @param clickedObject The clicked game object
   */
  private handleTileClick(clickedObject: Phaser.GameObjects.GameObject) {
    // Get stored grid coordinates from the object
    const gridX = clickedObject.getData('gridX');
    const gridY = clickedObject.getData('gridY');
    
    // Skip if no coordinates stored
    if (gridX === undefined || gridY === undefined) {
      return;
    }
    
    // Check if this is a tile or a habitat
    if (clickedObject.getData('habitatId')) {
      // This is a habitat, handle accordingly
      this.handleHabitatClick(clickedObject);
      return;
    }
    
    // Get contents at this location
    const contents = this.checkTileContents(gridX, gridY);
    
    // Show selection indicator at the clicked tile using SelectionRenderer
    this.selectionRenderer.showSelectionAt(gridX, gridY);
    
    // Check if this tile is a valid move target
    const isValidMoveTarget = this.moveRangeRenderer.isValidMoveTarget(gridX, gridY);
    
    if (isValidMoveTarget) {
      // This is a valid move target - handle unit movement
      console.log(`Moving unit to (${gridX}, ${gridY})`);
      
      const selectedUnitId = actions.getSelectedUnitId();
      // Get the selected animal's current position
      const animals = actions.getAnimals();
      const selectedAnimal = animals.find(animal => animal.id === selectedUnitId);
      
      if (selectedUnitId && selectedAnimal) {
        // Get current position from the unit state
        const fromX = selectedAnimal.position.x;
        const fromY = selectedAnimal.position.y;
        
        // Start animation for unit movement
        this.startUnitMovement(selectedUnitId, fromX, fromY, gridX, gridY);
      }
      
      return;
    }
    
    // If we have an active unit at this tile, select it
    if (contents.activeUnits.length > 0) {
      const unit = contents.activeUnits[0]; // Just use the first one for now
      
      this.handleUnitSelection(unit.id, { x: gridX, y: gridY });
      
      // Show valid moves for the selected unit
      if (!unit.hasMoved) {
        // Check if the action method exists and call it safely
        if (typeof actions.getValidMoves === 'function') {
          // Get valid moves for the unit
          const validMoves = actions.getValidMoves();
          // Render the moves using MoveRangeRenderer
          this.moveRangeRenderer.showMoveRange(validMoves, true);
        }
      }
    } 
    // If we have a dormant unit at this tile, select it (for spawning)
    else if (contents.dormantUnits.length > 0) {
      const dormantUnit = contents.dormantUnits[0]; // Just use the first one for now
      
      // Select the dormant unit without showing move range (it can't move)
      this.handleUnitSelection(dormantUnit.id, { x: gridX, y: gridY });
      
      // Clear any existing move highlights
      this.moveRangeRenderer.clearMoveHighlights();
      
      console.log(`Selected dormant unit: ${dormantUnit.id} at ${gridX},${gridY}`);
    }
    // If we clicked on an empty tile, deselect any selected unit
    else {
      this.handleUnitSelection(null);
      
      // Hide valid moves - clear the move highlights
      this.moveRangeRenderer.clearMoveHighlights();
    }
  }

  /**
   * Render move range
   * @param validMoves Valid move positions
   * @param moveMode Whether we're in move mode
   */
  renderMoveRange(validMoves: ValidMove[], moveMode: boolean) {
    // If the animation controller is animating, don't update
    if (this.animationController.isAnimating()) {
      return;
    }
    
    // Use the move range renderer to show the range
    this.moveRangeRenderer.showMoveRange(validMoves, moveMode);
  }
  
  /**
   * Clear all move highlights
   */
  clearMoveHighlights() {
    // Delegate to the move range renderer
    this.moveRangeRenderer.clearMoveHighlights();
  }

  /**
   * Start movement animation of a unit
   */
  private startUnitMovement(unitId: string, fromX: number, fromY: number, toX: number, toY: number) {
    // Find the unit sprite in the units layer
    let unitSprite: Phaser.GameObjects.Sprite | null = null;
    if (this.layerManager.getUnitsLayer()) {
      this.layerManager.getUnitsLayer()!.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === unitId) {
          unitSprite = child;
        }
      });
    }
    
    // If sprite not found, log error and return
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId}`);
      return;
    }
    
    // Don't allow movement while animation is in progress
    if (this.animationController.isAnimating()) {
      return;
    }
    
    // Hide selection indicator and clear move highlights before movement
    this.moveRangeRenderer.clearMoveHighlights();
    this.selectionRenderer.hideSelection();
    
    // Use the animation controller to move the unit
    this.animationController.moveUnit(unitId, unitSprite, fromX, fromY, toX, toY, {
      onBeforeMove: () => {
        // Any actions needed before movement, like clearing selection
      },
      onAfterMove: () => {
        // Any actions needed after movement, like updating UI
      }
    });
  }

  /**
   * Handle unit spawned events
   */
  private handleUnitSpawned() {
    console.log('Unit spawned, updating UI');
    
    // Hide the selection indicator and clear any move highlights
    this.selectionRenderer.hideSelection();
    this.moveRangeRenderer.clearMoveHighlights();
    
    // Clear the event
    actions.clearSpawnEvent();
  }

  /**
   * Handle unit selection
   * @param unitId Unit ID to select, or null to deselect
   * @param position Optional grid position for selection indicator
   */
  private handleUnitSelection(unitId: string | null, showSelectionAt?: { x: number, y: number }) {
    // Select or deselect the unit in store
    actions.selectUnit(unitId);
    
    // If we're selecting a unit and have coordinates, show selection indicator
    if (unitId && showSelectionAt) {
      this.selectionRenderer.showSelectionAt(showSelectionAt.x, showSelectionAt.y);
    } else {
      // Otherwise hide it (when deselecting or selecting an active unit)
      this.selectionRenderer.hideSelection();
    }
  }

  /**
   * Check what entities exist at specific coordinates
   * @param x Grid X coordinate
   * @param y Grid Y coordinate
   */
  private checkTileContents(x: number, y: number) {
    // Get all animals and habitats
    const animals = actions.getAnimals();
    const habitats = actions.getHabitats();
    
    // Find active units at this location
    const activeUnits = animals.filter(animal => 
      animal.position.x === x && 
      animal.position.y === y && 
      animal.state === AnimalState.ACTIVE
    );
    
    // Find dormant units at this location
    const dormantUnits = animals.filter(animal => 
      animal.position.x === x && 
      animal.position.y === y && 
      animal.state === AnimalState.DORMANT
    );
    
    // Find habitats at this location
    const habitatsAtLocation = habitats.filter(habitat => 
      habitat.position.x === x && 
      habitat.position.y === y
    );
    
    return {
      activeUnits,
      dormantUnits,
      habitats: habitatsAtLocation
    };
  }

  /**
   * Update method called each frame
   */
  update() {
    // Let the selection renderer handle hover updates
    const pointer = this.input.activePointer;
    const board = actions.getBoard();
    
    if (board) {
      this.selectionRenderer.updateFromPointer(pointer, board.width, board.height);
    }
    
    // Let the animation controller handle any active animations if needed
    if (this.animationController.isAnimating()) {
      // Any per-frame animation updates would go here
    }
  }

  /**
   * Set up input handlers for clicks and keyboard
   */
  private setupInputHandlers(): void {
    // Initialize input manager with current anchor values
    this.inputManager.initialize(this.anchorX, this.anchorY);
    
    // Set up camera panning and zooming
    this.setupCameraInputHandlers();
    
    // Set up keyboard shortcuts
    this.inputManager.setupKeyboardControls();
    
    // Set up click delegation
    this.inputManager.setupClickEventDelegation();
    
    // Register tile click callback
    this.inputManager.onTileClick((gameObject) => {
      this.handleTileClick(gameObject);
    });
    
    // Register habitat click callback
    this.inputManager.onHabitatClick((gameObject) => {
      this.handleHabitatClick(gameObject);
    });
    
    // Register pointer move callback for hover detection
    this.inputManager.onPointerMove((worldX, worldY, pointer) => {
      const board = actions.getBoard();
      if (board) {
        this.selectionRenderer.updateFromPointer(pointer, board.width, board.height);
      }
    });
    
    // Mark controls as set up
    this.controlsSetup = true;
  }
  
  /**
   * Set up camera input handlers
   */
  private setupCameraInputHandlers(): void {
    // Add panning and zooming for navigation
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        // Calculate delta in world space accounting for zoom
        const deltaX = -(pointer.x - pointer.prevPosition.x) / this.cameraManager.getCamera().zoom;
        const deltaY = -(pointer.y - pointer.prevPosition.y) / this.cameraManager.getCamera().zoom;
        
        // Use camera manager to pan
        this.cameraManager.pan(deltaX, deltaY);
      }
    });
    
    // Add mouse wheel zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      // Use camera manager to adjust zoom
      this.cameraManager.adjustZoom(-deltaY * 0.001);
    });
  }

  /**
   * Render habitat graphics
   */
  renderHabitatGraphics(habitats: any[]) {
    // Use the HabitatRenderer to render the habitats
    this.habitatRenderer.renderHabitats(habitats);
  }

  // Getters for managers and renderers
  
  public getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }
  
  public getSelectionRenderer(): SelectionRenderer {
    return this.selectionRenderer;
  }
  
  public getMoveRangeRenderer(): MoveRangeRenderer {
    return this.moveRangeRenderer;
  }
  
  public getHabitatRenderer(): HabitatRenderer {
    return this.habitatRenderer;
  }
  
  public getAnimalRenderer(): AnimalRenderer {
    return this.animalRenderer;
  }
  
  public getInputManager(): InputManager {
    return this.inputManager;
  }
  
  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }
  
  public getAnimationController(): AnimationController {
    return this.animationController;
  }

  /**
   * Handle clicks on habitats
   */
  private handleHabitatClick(habitatObject: Phaser.GameObjects.GameObject) {
    const habitatId = habitatObject.getData('habitatId');
    if (!habitatId) return;
    
    // Get grid coordinates
    const gridX = habitatObject.getData('gridX');
    const gridY = habitatObject.getData('gridY');
    
    // Get habitat data from store
    const habitats = actions.getHabitats();
    const clickedHabitat = habitats.find(h => h.id === habitatId);
    
    if (clickedHabitat) {
      // Get the habitat state for UI decisions
      console.log(`Habitat clicked: ${habitatId} at ${gridX},${gridY}, state: ${clickedHabitat.state}`);
      
      // Select habitat in store
      actions.selectHabitat(habitatId);
      
      // Show selection indicator at the habitat location
      this.selectionRenderer.showSelectionAt(gridX, gridY);
    }
  }

  /**
   * Get the current input mode
   */
  isInMoveMode(): boolean {
    return actions.isMoveMode();
  }
  
  /**
   * Check if the game is initialized
   */
  isGameInitialized(): boolean {
    return actions.isInitialized();
  }
}