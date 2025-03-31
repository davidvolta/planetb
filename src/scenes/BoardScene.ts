import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState, Habitat, HabitatState, Animal } from "../store/gameStore";
import * as actions from "../store/actions";
import { ValidMove } from "../store/gameStore";
import * as CoordinateUtils from "../utils/CoordinateUtils";
import { LayerManager } from "../managers/LayerManager";
import { TileRenderer } from "../renderers/TileRenderer";
import { SelectionRenderer } from "../renderers/SelectionRenderer";
import { MoveRangeRenderer } from "../renderers/MoveRangeRenderer";
import { HabitatRenderer } from "../renderers/HabitatRenderer";
import { AnimalRenderer } from "../renderers/AnimalRenderer";
import { InputManager } from "../managers/InputManager";
import { AnimationController } from "../controllers/AnimationController";
import { CameraManager } from "../managers/CameraManager";
import { StateSubscriptionManager } from "../managers/StateSubscriptionManager";
import { FogOfWarRenderer } from '../renderers/FogOfWarRenderer';

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
  private fogOfWarRenderer: FogOfWarRenderer;
  
  // Setup tracking
  private controlsSetup = false;
  private subscriptionsSetup = false;
  
  // Fog of War state
  private fogOfWarEnabled = true;
  
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
    this.fogOfWarRenderer = new FogOfWarRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
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
    
    // Set up layers FIRST
    this.layerManager.setupLayers();
    
    // THEN initialize managers and renderers
    this.initializeManagers();
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
    this.fogOfWarRenderer.initialize(anchorX, anchorY);
    
    // Initialize managers with anchor coordinates
    this.inputManager.initialize(anchorX, anchorY);
    this.animationController.initialize(anchorX, anchorY);
  }
  
  /**
   * Create and set up the scene
   */
  create() {
    console.log("BoardScene create() called", this.scene.key);
    
    // Initialize camera manager
    this.cameraManager.initialize();
    
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
      
      // Center camera on player's first unit
      this.centerCameraOnPlayerUnit();
    }
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
    this.fogOfWarRenderer.destroy();
    
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
    
    // Set up visibility callback for fog of war
    this.fogOfWarRenderer.setTileVisibilityCallback((x, y, isVisible) => {
      this.updateObjectVisibility(x, y, isVisible);
    });
    
    // Create Fog of War if it's enabled
    if (this.fogOfWarEnabled) {
      this.fogOfWarRenderer.createFogOfWar(board);
      this.initializeVisibility();
    } else {
      // Make all objects visible by default if fog of war is disabled
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          this.updateObjectVisibility(x, y, true);
        }
      }
    }
    
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
    
    // Get contents at this location
    const contents = this.checkTileContents(gridX, gridY);
    
    // Show selection indicator at the clicked tile using SelectionRenderer
    this.selectionRenderer.showSelectionAt(gridX, gridY);
    
    // First, check if this tile is a valid move target - this gets priority over other interactions
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
    
    // Check if the tile contains both active and dormant units
    const hasActiveUnit = contents.activeUnits.length > 0;
    const hasDormantUnit = contents.dormantUnits.length > 0;
    const hasHabitat = contents.habitats.length > 0;
    
    // Get currently selected unit (if any)
    const selectedUnitId = actions.getSelectedUnitId();
    
    // Check if we're clicking the same tile that has the currently selected unit
    const isClickingSelectedUnit = hasActiveUnit && 
      selectedUnitId === contents.activeUnits[0].id;
    
    // If we're clicking on a tile that has both active unit and dormant unit AND we already have the active unit selected,
    // select the dormant unit instead (toggle behavior)
    if (isClickingSelectedUnit && hasDormantUnit) {
      const dormantUnit = contents.dormantUnits[0];
      
      // Select the dormant unit without showing move range (it can't move)
      this.handleUnitSelection(dormantUnit.id, { x: gridX, y: gridY });
      
      // Show RED selection indicator for dormant unit
      this.selectionRenderer.showRedSelectionAt(gridX, gridY);
      
      // Clear any existing move highlights
      this.moveRangeRenderer.clearMoveHighlights();
      
      console.log(`Toggled to dormant unit: ${dormantUnit.id} at ${gridX},${gridY}`);
      
      return;
    }
    
    // If we're clicking on a tile that has both active unit and habitat AND we already have the active unit selected,
    // select the habitat instead (toggle behavior)
    if (isClickingSelectedUnit && hasHabitat) {
      const clickedHabitat = contents.habitats[0];
      
      // Deselect the unit
      this.handleUnitSelection(null);
      
      // Select habitat in store
      actions.selectHabitat(clickedHabitat.id);
      
      // Show RED selection indicator for habitat
      this.selectionRenderer.showRedSelectionAt(gridX, gridY);
      
      // Clear any existing move highlights
      this.moveRangeRenderer.clearMoveHighlights();
      
      console.log(`Toggled to habitat: ${clickedHabitat.id} at ${gridX},${gridY}, state: ${clickedHabitat.state}`);
      
      return;
    }
    
    // Normal priority - active units first, then dormant
    if (hasActiveUnit) {
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
      
      return;
    }
    // If we have a dormant unit at this tile, select it (for spawning)
    else if (hasDormantUnit) {
      const dormantUnit = contents.dormantUnits[0]; // Just use the first one for now
      
      // Select the dormant unit without showing move range (it can't move)
      this.handleUnitSelection(dormantUnit.id, { x: gridX, y: gridY });
      
      // Clear any existing move highlights
      this.moveRangeRenderer.clearMoveHighlights();
      
      console.log(`Selected dormant unit: ${dormantUnit.id} at ${gridX},${gridY}`);
      
      return;
    }
    
    // Only then check for habitats if no units are present
    if (hasHabitat) {
      const clickedHabitat = contents.habitats[0]; // Just use the first one for now
      
      // Log the habitat click
      console.log(`Habitat clicked: ${clickedHabitat.id} at ${gridX},${gridY}, state: ${clickedHabitat.state}`);
      
      // Select habitat in store
      actions.selectHabitat(clickedHabitat.id);
      
      return;
    }
    
    // If we clicked on an empty tile, deselect any selected unit
    this.handleUnitSelection(null);
    
    // Hide valid moves - clear the move highlights
    this.moveRangeRenderer.clearMoveHighlights();
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
    
    // If fog of war is enabled, update visibility around the destination position BEFORE moving
    if (this.fogOfWarEnabled) {
      // Get the board to check boundaries
      const board = actions.getBoard();
      if (board) {
        // Get tiles around the destination position that need to be revealed
        const tilesToReveal = this.getAdjacentTiles(toX, toY, board.width, board.height);
        
        // Update visibility in game state
        tilesToReveal.forEach(tile => {
          this.updateTileVisibility(tile.x, tile.y, true);
        });
        
        // Remove duplicates and reveal visually
        const uniqueTiles = this.removeDuplicateTiles(tilesToReveal);
        this.fogOfWarRenderer.revealTiles(uniqueTiles);
      }
    }
    
    // Use the animation controller to move the unit AFTER revealing fog of war
    this.animationController.moveUnit(unitId, unitSprite, fromX, fromY, toX, toY, {
      onBeforeMove: () => {
        // Any actions needed before movement, like clearing selection
      },
      onAfterMove: () => {
        // Animation complete, no need to do anything with fog of war here anymore
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
      // Otherwise hide it (when deselecting)
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
    
    // Set up keyboard shortcuts
    this.inputManager.setupKeyboardControls();
    
    // Set up click delegation
    this.inputManager.setupClickEventDelegation();
    
    // Register tile click callback for all clickable objects (tiles and habitats)
    this.inputManager.onTileClick((gameObject) => {
      this.handleTileClick(gameObject);
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

  /**
   * Handle displacement events for animals
   * This is called by the StateSubscriptionManager when a displacement event occurs
   * @param unitId ID of the unit to displace
   * @param fromX Starting X position
   * @param fromY Starting Y position
   * @param toX Destination X position
   * @param toY Destination Y position
   */
  handleDisplacementEvent(unitId: string, fromX: number, fromY: number, toX: number, toY: number): void {
    console.log(`Handling displacement for unit ${unitId} from (${fromX},${fromY}) to (${toX},${toY})`);
    
    // Find the unit sprite in the units layer
    let unitSprite: Phaser.GameObjects.Sprite | null = null;
    if (this.layerManager.getUnitsLayer()) {
      this.layerManager.getUnitsLayer()!.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === unitId) {
          unitSprite = child;
        }
      });
    }
    
    // If sprite not found, log error and clear the event
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId} to displace`);
      actions.clearDisplacementEvent();
      return;
    }
    
    // If fog of war is enabled, update visibility around the destination position BEFORE moving
    if (this.fogOfWarEnabled) {
      console.log(`Revealing fog of war before unit is displaced to (${toX}, ${toY})`);
      
      // Get the board to check boundaries
      const board = actions.getBoard();
      if (board) {
        // Get tiles around the destination position that need to be revealed
        const tilesToReveal = this.getAdjacentTiles(toX, toY, board.width, board.height);
        
        // Update visibility in game state
        tilesToReveal.forEach(tile => {
          this.updateTileVisibility(tile.x, tile.y, true);
        });
        
        // Remove duplicates and reveal visually
        const uniqueTiles = this.removeDuplicateTiles(tilesToReveal);
        this.fogOfWarRenderer.revealTiles(uniqueTiles);
      }
    }
    
    // Use the animation controller to displace the unit AFTER revealing fog of war
    this.animationController.displaceUnit(unitId, unitSprite, fromX, fromY, toX, toY, {
      onBeforeDisplace: () => {
        console.log(`Beginning displacement animation for unit ${unitId}`);
      },
      onAfterDisplace: () => {
        console.log(`Completed displacement animation for unit ${unitId}`);
        
        // Clear the displacement event after animation is complete
        actions.clearDisplacementEvent();
      }
    });
  }

  /**
   * Initialize visibility for starting units and habitats
   */
  private initializeVisibility(): void {
    const board = actions.getBoard();
    if (!board) return;
    
    const revealedTiles: { x: number, y: number }[] = [];
    
    // Get current player ID
    const currentPlayerId = actions.getCurrentPlayerId();
    
    // Reveal tiles around player's units
    const animals = actions.getAnimals();
    animals.forEach(animal => {
      if (animal.ownerId === currentPlayerId && animal.state === AnimalState.ACTIVE) {
        // Reveal 8 adjacent tiles around this unit
        this.getAdjacentTiles(animal.position.x, animal.position.y, board.width, board.height)
          .forEach(tile => {
            // Mark as explored and visible in the game state
            this.updateTileVisibility(tile.x, tile.y, true);
            // Add to the list of tiles to reveal visually
            revealedTiles.push(tile);
          });
      }
    });
    
    // Reveal tiles around player's habitats
    const habitats = actions.getHabitats();
    habitats.forEach(habitat => {
      if (habitat.ownerId === currentPlayerId) {
        // Reveal 8 adjacent tiles around this habitat
        this.getAdjacentTiles(habitat.position.x, habitat.position.y, board.width, board.height)
          .forEach(tile => {
            // Mark as explored and visible in the game state
            this.updateTileVisibility(tile.x, tile.y, true);
            // Add to the list of tiles to reveal visually
            revealedTiles.push(tile);
          });
      }
    });
    
    // Remove duplicates from the revealedTiles array
    const uniqueTiles = this.removeDuplicateTiles(revealedTiles);
    
    // Reveal these tiles in the fog of war - this will also update object visibility
    // through the callback we set up in createTiles
    this.fogOfWarRenderer.revealTiles(uniqueTiles);
  }
  
  /**
   * Get the 8 adjacent tiles around a central position
   * @param x Central X coordinate
   * @param y Central Y coordinate
   * @param boardWidth Width of the board
   * @param boardHeight Height of the board
   * @returns Array of valid adjacent coordinates
   */
  private getAdjacentTiles(x: number, y: number, boardWidth: number, boardHeight: number): { x: number, y: number }[] {
    const adjacentOffsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 }, /* Center */ { x: 1, y: 0 },
      { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
    ];
    
    // Include the central tile itself
    const result = [{ x, y }];
    
    // Add all valid adjacent tiles
    adjacentOffsets.forEach(offset => {
      const newX = x + offset.x;
      const newY = y + offset.y;
      
      // Check if coordinates are within board boundaries
      if (newX >= 0 && newX < boardWidth && newY >= 0 && newY < boardHeight) {
        result.push({ x: newX, y: newY });
      }
    });
    
    return result;
  }
  
  /**
   * Update a tile's visibility in the game state
   * @param x X coordinate of the tile
   * @param y Y coordinate of the tile
   * @param visible Whether the tile should be visible
   */
  private updateTileVisibility(x: number, y: number, visible: boolean): void {
    actions.updateTileVisibility(x, y, visible);
  }
  
  /**
   * Remove duplicate tiles from an array
   * @param tiles Array of tiles with potential duplicates
   * @returns Array with duplicates removed
   */
  private removeDuplicateTiles(tiles: { x: number, y: number }[]): { x: number, y: number }[] {
    const uniqueKeys = new Set<string>();
    const uniqueTiles: { x: number, y: number }[] = [];
    
    tiles.forEach(tile => {
      const key = `${tile.x},${tile.y}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        uniqueTiles.push(tile);
      }
    });
    
    return uniqueTiles;
  }

  /**
   * Toggle fog of war on/off
   * @param enabled Whether fog of war should be enabled
   */
  public toggleFogOfWar(enabled: boolean): void {
    this.fogOfWarEnabled = enabled;
    
    // Get the board
    const board = actions.getBoard();
    if (!board) return;
    
    if (enabled) {
      // Re-enable fog of war
      this.fogOfWarRenderer.createFogOfWar(board);
      this.initializeVisibility();
      // Note: Object visibility is handled by the callback we set in createTiles
    } else {
      // Disable fog of war by clearing all fog tiles
      this.fogOfWarRenderer.clearFogOfWar();
      
      // Make all objects visible since fog of war is now disabled
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          this.updateObjectVisibility(x, y, true);
        }
      }
    }
  }
  
  /**
   * Get the fog of war renderer
   * @returns The fog of war renderer
   */
  public getFogOfWarRenderer(): FogOfWarRenderer {
    return this.fogOfWarRenderer;
  }

  /**
   * Update visibility of objects at a specific tile location
   * @param x X coordinate of the tile
   * @param y Y coordinate of the tile
   * @param isVisible Whether objects should be visible
   */
  private updateObjectVisibility(x: number, y: number, isVisible: boolean): void {
    // Update terrain tile visibility
    const terrainLayer = this.layerManager.getTerrainLayer();
    if (terrainLayer) {
      terrainLayer.getAll().forEach(object => {
        if (object.getData && object.getData('gridX') === x && object.getData('gridY') === y) {
          // Use type assertion to any as a safe way to access the method
          const gameObject = object as any;
          if (typeof gameObject.setVisible === 'function') {
            gameObject.setVisible(isVisible);
          }
        }
      });
    }
    
    // Update units visibility
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (unitsLayer) {
      unitsLayer.getAll().forEach(object => {
        if (object.getData && object.getData('gridX') === x && object.getData('gridY') === y) {
          // Use type assertion to any as a safe way to access the method
          const gameObject = object as any;
          if (typeof gameObject.setVisible === 'function') {
            gameObject.setVisible(isVisible);
          }
        }
      });
    }
    
    // Update habitats visibility
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (staticObjectsLayer) {
      staticObjectsLayer.getAll().forEach(object => {
        if (object.getData && object.getData('gridX') === x && object.getData('gridY') === y) {
          // Use type assertion to any as a safe way to access the method
          const gameObject = object as any;
          if (typeof gameObject.setVisible === 'function') {
            gameObject.setVisible(isVisible);
          }
        }
      });
    }
  }

  /**
   * Centers the camera on the player's first unit
   */
  private centerCameraOnPlayerUnit(): void {
    const unitPosition = this.findPlayerFirstUnit();
    if (unitPosition) {
      const worldPos = CoordinateUtils.gridToWorld(
        unitPosition.x, 
        unitPosition.y, 
        this.tileSize, 
        this.tileHeight,
        this.anchorX,
        this.anchorY
      );
      this.cameraManager.centerOn(worldPos.x, worldPos.y);
      // Set zoom to maximum level
      this.cameraManager.zoomTo(2.0);
      console.log(`Camera centered on player unit at grid (${unitPosition.x},${unitPosition.y}) with max zoom`);
    }
  }
  
  /**
   * Finds the first unit owned by the player
   */
  private findPlayerFirstUnit(): { x: number, y: number } | null {
    const animals = actions.getAnimals();
    const currentPlayerId = actions.getCurrentPlayerId();
    
    // Find the first active unit owned by the current player
    const playerUnit = animals.find(animal => 
      animal.ownerId === currentPlayerId && 
      animal.state === AnimalState.ACTIVE
    );
    
    if (playerUnit) {
      return playerUnit.position;
    }
    
    return null;
  }
}