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
import { ResourceRenderer } from "../renderers/ResourceRenderer";
import { InputManager } from "../managers/InputManager";
import { AnimationController } from "../controllers/AnimationController";
import { CameraManager } from "../managers/CameraManager";
import { StateSubscriptionManager } from "../managers/StateSubscriptionManager";
import { FogOfWarRenderer } from '../renderers/FogOfWarRenderer';
import { TILE_SIZE, TILE_HEIGHT } from '../constants/gameConfig';

// Custom event names
export const EVENTS = {
  ASSETS_LOADED: 'assetsLoaded'
};

// Delegate functionality to managers and ensure proper lifecycle management
export default class BoardScene extends Phaser.Scene {
  // Keep the tiles array for compatibility with existing code
  private tiles: Phaser.GameObjects.GameObject[] = [];
  
  // Fixed tile properties
  private tileSize = TILE_SIZE; 
  private tileHeight = TILE_HEIGHT; 
  
  // Store fixed anchor positions for the grid
  private anchorX = 0; 
  private anchorY = 0;
  
  // Renderers
  private tileRenderer: TileRenderer;
  private selectionRenderer: SelectionRenderer;
  private moveRangeRenderer: MoveRangeRenderer;
  private habitatRenderer: HabitatRenderer;
  private animalRenderer: AnimalRenderer;
  private resourceRenderer: ResourceRenderer;
  private fogOfWarRenderer: FogOfWarRenderer;
  
  // Setup tracking
  private controlsSetup = false;
  private subscriptionsSetup = false;
  
  // Fog of War state
  private fogOfWarEnabled = true;
  
  // Managers and controllers
  private layerManager: LayerManager;
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
    this.resourceRenderer = new ResourceRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
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
        tileRenderer: this.tileRenderer,
        resourceRenderer: this.resourceRenderer
      }
    );
  }

  // Preload assets needed for the scene
  preload() {
    // Load all animal sprites
    this.load.image("egg", "assets/egg.png");  
    this.load.image("buffalo", "assets/buffalo.png");
    this.load.image("bird", "assets/bird.png"); 
    this.load.image("snake", "assets/snake.png");
    this.load.image("octopus", "assets/octopus.png");
    this.load.image("turtle", "assets/turtle.png");
    this.load.image("forest", "assets/resources/forest.png");
    this.load.image("kelp", "assets/resources/kelp.png");
    this.load.image("insects", "assets/resources/insects.png");
    this.load.image("plankton", "assets/resources/plankton.png");

    this.load.on('complete', () => {
      this.events.emit(EVENTS.ASSETS_LOADED);
    });
  }
  
  // Initialize the scene
  init(data?: any) {
    console.log("BoardScene init() called", data ? `with data: ${JSON.stringify(data)}` : "without data");
    
    this.tiles = [];    // Clear previous tiles array
    this.unsubscribeAll();  // Ensure all old subscriptions are cleaned up before creating new ones
    
    // Reset setup flags
    this.subscriptionsSetup = false;
    this.controlsSetup = false;
    
    this.layerManager.setupLayers(); // Set up layers FIRST
    this.initializeManagers(); // THEN initialize managers and renderers
  }
  
  //Initialize all managers with current settings
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
    this.resourceRenderer.initialize(anchorX, anchorY);
    this.fogOfWarRenderer.initialize(anchorX, anchorY);
    
    // Initialize managers with anchor coordinates
    this.inputManager.initialize(anchorX, anchorY);
    this.animationController.initialize(anchorX, anchorY);
  }
  
  // Create and set up the scene
  create() {
    console.log("BoardScene create() called", this.scene.key);
    
    this.cameraManager.initialize();   // Initialize camera manager
    this.setupInputHandlers();  // Set up input handlers
    const board = actions.getBoard(); // Get board data
    
    // If we have board data, create the board
    if (board) {
      this.createTiles();    // Create board tiles    
      this.setupSubscriptions();   // Set up state subscriptions
      
      // Center camera on player's first unit
      this.cameraManager.centerCameraOnPlayerUnit(
        this.tileSize,
        this.tileHeight,
        this.anchorX,
        this.anchorY
      );
      
    }
  }
  
  // Set up all state subscriptions
  private setupSubscriptions() {
    // Use the StateSubscriptionManager to set up subscriptions
    this.subscriptionManager.setupSubscriptions(
      (animalId, gridX, gridY) => this.handleUnitSelection(animalId)
    );

    this.subscriptionsSetup = true;     // Mark subscriptions as set up
  }
  
  // Clean up all subscriptions to prevent memory leak
  private unsubscribeAll() {
    this.subscriptionManager.unsubscribeAll();   // Use the StateSubscriptionManager to unsubscribe
    
    // Also unsubscribe any lingering direct subscriptions by key prefix
    const boardScenePrefix = 'BoardScene.';
    StateObserver.getActiveSubscriptions().forEach(key => {
      if (key.startsWith(boardScenePrefix)) {
        StateObserver.unsubscribe(key);
      }
    });
  }

  // Update the board without restarting the scene
  updateBoard() {
    const needsSetup = !this.layerManager.isLayersSetup();     // Check if we need to setup the layers
    
    // Set up layers if needed
    if (needsSetup) {
      this.layerManager.setupLayers();
    }
  
    this.createTiles();     // Create new tiles using TileRenderer
  }
  
  // Scene shutdown handler
  shutdown() {
    
    this.unsubscribeAll();    // Clean up subscriptions    
    this.input.removeAllListeners(); // Clean up input handlers
    
    // Clean up renderers
    this.tileRenderer.destroy();
    this.selectionRenderer.destroy();
    this.moveRangeRenderer.destroy();
    this.habitatRenderer.destroy();
    this.animalRenderer.destroy();
    this.resourceRenderer.destroy();
    this.fogOfWarRenderer.destroy();
    
    // Clean up managers
    this.layerManager.clearAllLayers(true);
    this.inputManager.destroy();
    this.cameraManager.destroy();
    this.animationController.destroy();
    this.subscriptionManager.destroy();
    
    // Reset variables
    this.tiles = [];
    this.controlsSetup = false;
    this.subscriptionsSetup = false;
  }
  
  // Create tiles for the board
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

  // Handle tile clicks
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
    
    // Check if there's an active unit that has already moved
    const hasMovedUnit = contents.activeUnits.some(unit => unit.hasMoved);
    
    // Check if there's an improved habitat at this location
    const hasImprovedHabitat = contents.habitats.some(habitat => habitat.state === HabitatState.IMPROVED);
    
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
    
    // Show selection indicator at the clicked tile using SelectionRenderer
    // Do NOT show white selection if the tile has a unit that has already moved or an improved habitat
    if (!hasMovedUnit && !hasImprovedHabitat) {
      this.selectionRenderer.showSelectionAt(gridX, gridY);
    }
    
    // Check if the tile contains both active and dormant units
    const hasActiveUnit = contents.activeUnits.length > 0;
    const hasDormantUnit = contents.dormantUnits.length > 0;
    const hasHabitat = contents.habitats.length > 0;
    
    // Get currently selected unit (if any)
    const selectedUnitId = actions.getSelectedUnitId();
    
    // Check if we're clicking the same tile that has the currently selected unit
    const selectedUnit = selectedUnitId ? contents.activeUnits.find(unit => unit.id === selectedUnitId) : null;
    const isClickingSelectedUnit = selectedUnit !== null;
    
    // First check if there's a dormant unit we can interact with
    if (hasDormantUnit) {
      const dormantUnit = contents.dormantUnits[0];
      
      // Select the dormant unit without showing move range (it can't move)
      this.handleUnitSelection(dormantUnit.id, { x: gridX, y: gridY });
      
      // Show RED selection indicator for dormant unit
      this.selectionRenderer.showRedSelectionAt(gridX, gridY);
      
      // Clear any existing move highlights
      this.moveRangeRenderer.clearMoveHighlights();
      
      console.log(`Selected dormant unit: ${dormantUnit.id} at ${gridX},${gridY}`);
      
      return;
    }
    
    // Then check if there's a habitat we can interact with
    if (hasHabitat) {
      const clickedHabitat = contents.habitats[0]; // Just use the first one for now
      
      // Log the habitat click
      console.log(`Habitat clicked: ${clickedHabitat.id} at ${gridX},${gridY}, state: ${clickedHabitat.state}`);
      
      // Only select and show red indicator if habitat is NOT already improved
      if (clickedHabitat.state !== HabitatState.IMPROVED) {
        // Select habitat in store
        actions.selectHabitat(clickedHabitat.id);
        
        // Show RED selection indicator for habitat
        this.selectionRenderer.showRedSelectionAt(gridX, gridY);
      } else {
        console.log(`Habitat ${clickedHabitat.id} is already improved and cannot be selected`);
        
        // Deselect any currently selected habitat
        actions.selectHabitat(null);
      }
      
      return;
    }
    
    // Only handle active unit selection if none of the above actions were taken
    // and if the unit hasn't moved
    if (hasActiveUnit) {
      const unit = contents.activeUnits[0]; // Just use the first one for now
      
      // Skip selection if the unit has already moved this turn
      if (unit.hasMoved) {
        console.log(`Unit ${unit.id} has already moved this turn and cannot be selected`);
        return;
      }
      
      this.handleUnitSelection(unit.id, { x: gridX, y: gridY });
      
      return;
    }
    
    // If we clicked on an empty tile, deselect any selected unit
    this.handleUnitSelection(null);
    
    // Deselect any selected habitat
    actions.selectHabitat(null);
    
    // Hide valid moves - clear the move highlights
    this.moveRangeRenderer.clearMoveHighlights();
  }

  // Clear all move highlights
  clearMoveHighlights() {
    this.moveRangeRenderer.clearMoveHighlights();     // Delegate to the move range renderer
  }

  // Start movement animation of a unit
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
        const tilesToReveal = CoordinateUtils.getAdjacentTiles(toX, toY, board.width, board.height);
        
        // Update visibility in game state
        tilesToReveal.forEach(tile => {
          this.updateTileVisibility(tile.x, tile.y, true);
        });
        
        // Remove duplicates and reveal visually
        const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tilesToReveal);
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

  // Handle unit spawned events
  private handleUnitSpawned() {
    console.log('Unit spawned, updating UI');
    
    // Hide the selection indicator and clear any move highlights
    this.selectionRenderer.hideSelection();
    this.moveRangeRenderer.clearMoveHighlights();
    
    // Clear the event
    actions.clearSpawnEvent();
  }

  // Handle unit selection
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

  // Check what entities exist at specific coordinates
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

  // Update method called each frame
  update() {
    // Let the selection renderer handle hover updates
    const pointer = this.input.activePointer;
    const board = actions.getBoard();
    
    if (board) {
      // Only show hover indicator when not in move mode
      const moveMode = actions.isMoveMode();
      
      if (!moveMode) {
        // Normal hover behavior when not in move mode
        this.selectionRenderer.updateFromPointer(pointer, board.width, board.height);
      } else {
        // Hide hover indicator when in move mode
        this.selectionRenderer.updateHoverIndicator(false);
      }
    }
    
    // Let the animation controller handle any active animations if needed
    if (this.animationController.isAnimating()) {
      // Any per-frame animation updates would go here
    }
  }

  // Set up input handlers for clicks and keyboard
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

  //Get the current input mode
  isInMoveMode(): boolean {
    return actions.isMoveMode();
  }
  
  // Check if the game is initialized
  isGameInitialized(): boolean {
    return actions.isInitialized();
  }

  // Handle displacement events for animals
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
        const tilesToReveal = CoordinateUtils.getAdjacentTiles(toX, toY, board.width, board.height);
        
        // Update visibility in game state
        tilesToReveal.forEach(tile => {
          this.updateTileVisibility(tile.x, tile.y, true);
        });
        
        // Remove duplicates and reveal visually
        const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tilesToReveal);
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

  // Initialize visibility for starting units and habitats
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
        CoordinateUtils.getAdjacentTiles(animal.position.x, animal.position.y, board.width, board.height)
          .forEach(tile => {
            // Mark as explored and visible in the game state
            this.updateTileVisibility(tile.x, tile.y, true);
            // Add to the list of tiles to reveal visually
            revealedTiles.push(tile);
          });
      }
    });
    
    // Reveal player's starting biome
    const habitats = actions.getHabitats();
    habitats.forEach(habitat => {
      if (habitat.ownerId === currentPlayerId && habitat.state === HabitatState.IMPROVED) {
        // This is the player's starting improved habitat
        // Find all tiles in this habitat's biome and reveal them
        this.revealBiomeTiles(habitat.id, revealedTiles);
      } else if (habitat.ownerId === currentPlayerId) {
        // For other owned habitats that aren't improved, just reveal adjacent tiles
        CoordinateUtils.getAdjacentTiles(habitat.position.x, habitat.position.y, board.width, board.height)
          .forEach(tile => {
            // Mark as explored and visible in the game state
            this.updateTileVisibility(tile.x, tile.y, true);
            // Add to the list of tiles to reveal visually
            revealedTiles.push(tile);
          });
      }
    });
    
    // Remove duplicates from the revealedTiles array
    const uniqueTiles = CoordinateUtils.removeDuplicateTiles(revealedTiles);
    
    // Reveal these tiles in the fog of war - this will also update object visibility
    // through the callback we set up in createTiles
    this.fogOfWarRenderer.revealTiles(uniqueTiles);
  }
  
  // Reveal all tiles in a habitat's biome
  public revealBiomeTiles(habitatId: string, revealedTiles?: { x: number, y: number }[]): void {
    const habitat = actions.getHabitats().find(h => h.id === habitatId);
    if (!habitat) return;
    
    const board = actions.getBoard();
    if (!board) return;
    
    // Get the habitat's biome ID (which is the same as the habitat ID)
    const biomeId = habitat.id;
    
    // Track tiles we reveal
    const tilesToReveal: { x: number, y: number }[] = [];
    
    // Scan the board for all tiles in this biome
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.biomeId === biomeId) {
          // Set this tile to visible in the game state
          this.updateTileVisibility(x, y, true);
          // Add to our array of tiles to reveal
          tilesToReveal.push({ x, y });
          
          // Add to the passed-in array if it exists
          if (revealedTiles) {
            revealedTiles.push({ x, y });
          }
        }
      }
    }
    
    // If we weren't adding to an existing array, reveal tiles now
    if (!revealedTiles) {
      this.fogOfWarRenderer.revealTiles(tilesToReveal);
    }
  }
  
  // Update a tile's visibility in the game state
  private updateTileVisibility(x: number, y: number, visible: boolean): void {
    actions.updateTileVisibility(x, y, visible);
  }
  
  // Toggle fog of war on/off
  public toggleFogOfWar(enabled: boolean): void {
    this.fogOfWarEnabled = enabled;
    
    // Get the board
    const board = actions.getBoard();
    if (!board) return;
    
    if (enabled) {
      // Re-enable fog of war
      this.fogOfWarRenderer.createFogOfWar(board);
      
      // Collect all previously explored tiles
      const exploredTiles: { x: number, y: number }[] = [];
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          const tile = board.tiles[y][x];
          if (tile.explored) {
            exploredTiles.push({ x, y });
            // Update object visibility for this tile
            this.updateObjectVisibility(x, y, true);
          } else {
            // Hide objects at unexplored tiles
            this.updateObjectVisibility(x, y, false);
          }
        }
      }
      
      // Reveal all explored tiles in one batch operation
      if (exploredTiles.length > 0) {
        this.fogOfWarRenderer.revealTiles(exploredTiles);
      }
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
  
  // Get the fog of war renderer
  public getFogOfWarRenderer(): FogOfWarRenderer {
    return this.fogOfWarRenderer;
  }

  // Update visibility of objects at a specific tile location
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
    
    // Update resources visibility
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


  // Get resource renderer
  public getResourceRenderer(): ResourceRenderer {
    return this.resourceRenderer;
  }

  // Toggle biome visualization mode on/off
  public toggleBiomeVisualization(enabled: boolean): void {
    if (this.tileRenderer) {
      // Get biomes using actions instead of directly from registry
      const biomes = actions.getBiomes();
      
      // Toggle biome mode in the tile renderer
      this.tileRenderer.toggleBiomeMode(enabled);
    }
  }
}