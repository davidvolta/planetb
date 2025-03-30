import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState, Habitat, HabitatState } from "../store/gameStore";
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

// Define the Animal interface to avoid 'any' type
interface Animal {
  id: string;
  type: string;
  state: AnimalState;
  position: {
    x: number;
    y: number;
  };
  hasMoved: boolean;
}

// Custom event names
export const EVENTS = {
  ASSETS_LOADED: 'assetsLoaded'
};

// Define subscription keys to ensure consistency
const SUBSCRIPTIONS = {
  BOARD: 'BoardScene.board',
  ANIMALS: 'BoardScene.animals',
  HABITATS: 'BoardScene.habitats',
  VALID_MOVES: 'BoardScene.validMoves',
};

// PHASE 4: Selection System Simplification - Final Cleanup
// This phase centralizes selection indicator logic, removes redundant code, 
// and ensures consistent state updates across the selection system.

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
  
  private controlsSetup = false;
  private subscriptionsSetup = false;
  
  // Selection indicator for hover/selection - DEPRECATED: using SelectionRenderer instead
  private selectionIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Properties to track mouse position over the grid - DEPRECATED: using SelectionRenderer instead
  private hoveredGridPosition: { x: number, y: number } | null = null;
  
  // Array to store move range highlight graphics - DEPRECATED: using MoveRangeRenderer instead
  private moveRangeHighlights: Phaser.GameObjects.Graphics[] = [];
  
  // Track animations in progress
  private animationInProgress: boolean = false;

  // Input management
  private inputManager: InputManager;
  
  // Animation control
  private animationController: AnimationController;
  
  // Camera management
  private cameraManager: CameraManager;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize the layer manager
    this.layerManager = new LayerManager(this);
    
    // Initialize the tile renderer with the layer manager
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the selection renderer with the layer manager
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the move range renderer with the layer manager
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the habitat renderer with the layer manager
    this.habitatRenderer = new HabitatRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the animal renderer with the layer manager
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the input manager
    this.inputManager = new InputManager(this, this.tileSize, this.tileHeight);
    
    // Initialize the animation controller
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight);
    
    // Initialize the camera manager
    this.cameraManager = new CameraManager(this);
  }


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
  

  init(data?: any) {
    console.log("BoardScene init() called", data ? `with data: ${JSON.stringify(data)}` : "without data");
    
    // Clear previous tiles when scene restarts
    this.tiles = [];
    
    // Ensure all old subscriptions are cleaned up before creating new ones
    this.unsubscribeAll();
    
    // Reset subscriptions setup flag
    this.subscriptionsSetup = false;
    
    // Set up layers immediately to ensure they exist before any state updates
    this.layerManager.setupLayers();
    
    // We'll setup subscriptions in create() after layers are initialized
  }
  
  // Set up all state subscriptions in one centralized method
  private setupSubscriptions() {
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    console.log("Setting up BoardScene subscriptions");
    
    // Subscribe to board changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board) => {
        console.log("Board state updated in BoardScene");
        if (board) {
          this.updateBoard();
        }
      },
      { immediate: false } // Set immediate: false to prevent rendering on subscription
    );
    
    // Subscribe to animal changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals) => {
        if (animals) {
          this.renderAnimalSprites(animals);
        }
      }
    );
    
    // Subscribe to displacement events
    StateObserver.subscribe(
      'BoardScene.displacement',
      (state) => state.displacementEvent,
      (displacementEvent) => {
        // Only animate if displacement actually occurred
        if (displacementEvent && displacementEvent.occurred && displacementEvent.unitId) {
          // Use type assertion to ensure TypeScript understands the type
          this.handleUnitDisplacement(displacementEvent);
          // Clear the displacement event after handling it
          actions.clearDisplacementEvent();
        }
      }
    );
    
    // Subscribe to spawn events
    StateObserver.subscribe(
      'BoardScene.spawn',
      (state) => state.spawnEvent,
      (spawnEvent) => {
        // Handle spawn events (hide selection indicator)
        if (spawnEvent && spawnEvent.occurred) {
          this.handleUnitSpawned();
          // Clear the spawn event after handling it
          actions.clearSpawnEvent();
        }
      }
    );
    
    // Subscribe to habitat changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.HABITATS,
      (state) => state.habitats,
      (habitats) => {
        if (habitats && this.layerManager.getStaticObjectsLayer()) {
          this.renderHabitatGraphics(habitats);
        }
      }
    );
    
    // Subscribe to valid moves changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.VALID_MOVES,
      (state) => ({ 
        validMoves: state.validMoves, 
        moveMode: state.moveMode 
      }),
      (moveState) => {
        this.renderMoveRange(moveState.validMoves, moveState.moveMode);
      }
    );
    
    // Mark subscriptions as set up
    this.subscriptionsSetup = true;
  }
  
  // Clean up subscriptions to avoid memory leaks
  private unsubscribeAll() {
    // Unsubscribe from all known subscriptions
    Object.values(SUBSCRIPTIONS).forEach(key => {
      StateObserver.unsubscribe(key);
    });
  }

  // Method to update the board without restarting the scene
  updateBoard() {
    // Check if we need to setup the layers
    const needsSetup = !this.layerManager.isLayersSetup();
    
    // Log what we're doing
    console.log("Updating board using layer-based rendering");
    
    // Set up layers if needed
    if (needsSetup) {
      this.layerManager.setupLayers();
    }
    
    // Create new tiles using TileRenderer
    this.createTiles();
    
    console.log("Board updated with layer-based structure");
  }
  
  // Debug method to log information about our layers
  private logLayerInfo() {
    this.layerManager.logLayerInfo();
    
    // Log tile count
    console.log(`Total tiles: ${this.tiles.length}`);
  }
  
  create() {
    console.log("BoardScene create() called", this.scene.key);
    
    // Set up camera controls using InputManager
    this.setupInputHandlers();
    
    // Set up camera using CameraManager
    this.setupCamera();
    
    // Set up keyboard shortcuts
    this.setupKeyboardControls();
    
    // Set fixed camera bounds that are large enough for any reasonable map size
    // These bounds won't change when the map is resized
    const worldWidth = this.cameras.main.width * 4;
    const worldHeight = this.cameras.main.height * 4;
    this.cameras.main.setBounds(-worldWidth/2, -worldHeight/2, worldWidth, worldHeight);
    
    // Set a fixed camera position with downward offset
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const cameraYOffset = 400; // Move camera down by this amount
    this.cameras.main.centerOn(centerX, centerY + cameraYOffset);
    this.cameras.main.setZoom(1.2); // Set default zoom level closer to the board
    
    // Get board data
    const board = actions.getBoard();
    
    // If we have board data, create the board
    if (board) {
      this.updateBoard();
      
      // Now that the board and layers are set up, set up state subscriptions
      this.setupSubscriptions();
      
      // Render initial state of animals and habitats
      const animals = actions.getAnimals();
      const habitats = actions.getHabitats();
      
      if (animals && this.layerManager.getUnitsLayer()) {
        this.renderAnimalSprites(animals);
      }
      
      if (habitats && this.layerManager.getStaticObjectsLayer()) {
        this.renderHabitatGraphics(habitats);
      }
      
      // Log final layer state after everything is rendered
      console.log("FINAL LAYER STATE AFTER RENDERING ANIMALS AND HABITATS:");
      this.logLayerInfo();
    }
  }

  // Updated method that delegates to AnimalRenderer
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
  
  // Clean up when scene is shut down
  shutdown() {
    // Ensure we clean up all subscriptions when scene shuts down
    this.unsubscribeAll();
    
    // Reset the layer manager
    this.layerManager.resetLayers();
    
    // Clean up renderers
    this.selectionRenderer.destroy();
    this.moveRangeRenderer.destroy();
    this.habitatRenderer.destroy();
    this.animalRenderer.destroy();
    
    // Clean up input manager
    this.inputManager.destroy();
    
    // Clean up animation controller
    this.animationController.destroy();
    
    // Clean up camera manager
    this.cameraManager.destroy();
    
    // Reset flags
    this.controlsSetup = false;
    
    // Clean up keyboard listeners
    if (this.input && this.input.keyboard) {
      this.input.keyboard.off('keydown-S');
      this.input.keyboard.off('keydown-N');
      this.input.keyboard.off('keydown-I');
      // Add any other keyboard shortcuts we might add in the future
    }
    
    // Clean up pointer listeners
    this.input.off('gameobjectdown');
    this.input.off('pointermove');
    this.input.off('wheel');
    
    // Clear tiles array
    this.tiles = [];
    
    // Clear move highlights array
    this.moveRangeHighlights = [];
  }
  
  // Updated createTiles method that uses TileRenderer
  private createTiles() {
    // Get board data using actions instead of GameInitializer
    const board = actions.getBoard();
    if (!board) {
      console.warn("No board available, even after fallback");
      // Add a simple message in the center of the screen
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 
        "No board data available", 
        { color: '#ffffff', fontSize: '24px' }
      ).setOrigin(0.5);
      return;
    }

    console.log(`Creating tiles for board: ${board.width}x${board.height}`);

    // Calculate map dimensions for camera bounds
    const mapWidth = board.width * this.tileSize;
    const mapHeight = board.height * this.tileHeight;
    
    // Fixed anchor coordinates - center of the screen
    const anchorX = this.cameras.main.width / 2;
    const anchorY = this.cameras.main.height / 2; // Center vertically
    
    // Store these anchor positions for coordinate conversions
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    
    // Use TileRenderer to create all board tiles
    this.tiles = this.tileRenderer.createBoardTiles(board, anchorX, anchorY);
    
    // Create the selection indicator after all tiles
    this.createSelectionIndicator();
    
    // Set up input handlers if they're not already set up
    this.setupInputHandlers();
    
    // Log layer information for debugging
    this.logLayerInfo();
  }
  
  // Keep createTerrainTile method for backward compatibility but delegate to TileRenderer
  private createTerrainTile(terrain: TerrainType, x: number, y: number): Phaser.GameObjects.Graphics {
    // Delegate to TileRenderer but do not add to layer since original code handles that
    const tile = this.add.graphics();
    tile.setPosition(x, y);
    
    // Get color based on terrain type
    let fillColor = 0x2ecc71; // Default grass color
    let strokeColor = 0x27ae60; // Default grass outline
    
    switch (terrain) {
      case TerrainType.WATER:
        fillColor = 0x3498db;
        strokeColor = 0x2980b9;
        break;
      case TerrainType.MOUNTAIN:
        fillColor = 0x7f8c8d;
        strokeColor = 0x6c7a89;
        break;
      default:
        // Use default grass colors
        break;
    }
    
    // Draw tile
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    tile.fillStyle(fillColor, 1);
    tile.lineStyle(1, strokeColor, 1);
    
    tile.beginPath();
    tile.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    
    for (let i = 1; i < diamondPoints.length; i++) {
      tile.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    
    tile.closePath();
    tile.fillPath();
    tile.strokePath();
    
    return tile;
  }

  // Setup click event delegation to handle clicks at the board level
  private setupClickEventDelegation() {
    // Add global click handler for any game object
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      // Check if the clicked object is a tile
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        // If the object has grid coordinates stored, it's a tile or habitat
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        
        if (gridX !== undefined && gridY !== undefined) {
          // Call the handler with the clicked object
          this.handleTileClick(gameObject);
        }
      }
    });
  }
  
  // Updated to use the SelectionRenderer and MoveRangeRenderer
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
      
      // PHASE 4: Use the centralized selection method
      this.handleUnitSelection(unit.id, { x: gridX, y: gridY });
      
      // Show valid moves for the selected unit
      if (unit.moves > 0) {
        // Check if the action method exists and call it safely
        if (typeof actions.getValidMoves === 'function') {
          // Get valid moves for the unit
          const validMoves = actions.getValidMoves();
          // Render the moves using MoveRangeRenderer
          this.moveRangeRenderer.showMoveRange(validMoves, true);
        }
      }
    } 
    // If we clicked on a dormant unit or empty tile, deselect any selected unit
    else {
      // PHASE 4: Use the centralized selection method
      this.handleUnitSelection(null);
      
      // Hide valid moves - clear the move highlights
      this.moveRangeRenderer.clearMoveHighlights();
    }
  }
  
  // Set up camera controls
  private setupControls() {
    // Add panning and zooming for navigation
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });
    
    // Add mouse wheel zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
    
    this.controlsSetup = true;
  }

  // Set up keyboard shortcuts for direct action handling
  private setupKeyboardControls() {
    // Clear any existing keyboard shortcuts to prevent duplication
    if (this.input.keyboard) {
      this.input.keyboard.removeAllKeys(true);
      
      // Handle spawn with 'S' key directly in BoardScene
      this.input.keyboard.on('keydown-S', () => {
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
      this.input.keyboard.on('keydown-N', () => {
        const nextTurn = actions.getNextTurn();
        nextTurn();
      });
      
      // Handle improve habitat with 'I' key
      this.input.keyboard.on('keydown-I', () => {
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

  // Update the existing renderHabitatGraphics method to use the HabitatRenderer
  renderHabitatGraphics(habitats: any[]) {
    // Use the HabitatRenderer to render the habitats
    this.habitatRenderer.renderHabitats(habitats);
  }

  // Set up all layers with appropriate depths
  private setupLayers() {
    // Skip if layers are already set up
    if (this.layerManager.isLayersSetup()) {
      console.log("Layers already initialized, skipping setupLayers()");
      return;
    }
    
    console.log("BoardScene setupLayers() called");
    
    // Initialize each layer with its appropriate depth
    this.layerManager.setupLayers();
    
    console.log("Layers initialized with proper depth order");
  }

  // Updated to use MoveRangeRenderer
  renderMoveRange(validMoves: ValidMove[], moveMode: boolean) {
    // If an animation is in progress, don't update the move range
    if (this.animationInProgress) {
      return;
    }
    
    // Use the move range renderer to show the range
    this.moveRangeRenderer.showMoveRange(validMoves, moveMode);
  }
  
  // Updated to use MoveRangeRenderer
  clearMoveHighlights() {
    // Delegate to the move range renderer
    this.moveRangeRenderer.clearMoveHighlights();
  }

  /**
   * Animate a unit moving from one tile to another
   */
  private animateUnitMovement(unitId: string, fromX: number, fromY: number, toX: number, toY: number) {
    // Set animation flag to prevent other movements during this one
    this.animationInProgress = true;
    
    // Find the unit sprite
    let unitSprite: Phaser.GameObjects.Sprite | null = null;
    if (this.layerManager.getUnitsLayer()) {
      this.layerManager.getUnitsLayer()!.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === unitId) {
          unitSprite = child;
        }
      });
    }
    
    if (!unitSprite) {
      console.warn(`Unit sprite not found for ID: ${unitId}`);
      this.animationInProgress = false; // Reset animation flag
      return;
    }
    
    // Calculate start and end positions
    const startPos = this.gridToScreen(fromX, fromY);
    const endPos = this.gridToScreen(toX, toY);
    
    // Calculate duration based on distance (longer for diagonal moves)
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const duration = distance * 250; // 250ms for each tile of distance
    
    // Create the tween
    this.tweens.add({
      targets: unitSprite,
      x: endPos.x,
      y: endPos.y,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        // Reset animation flag when complete
        this.animationInProgress = false;
        
        // Get the current animal data from the state
        const animals = actions.getAnimals();
        const unit = animals.find(animal => animal.id === unitId);
        
        if (unit) {
          // For now, we'll just log that the unit has arrived
          console.log(`Unit ${unitId} has arrived at (${toX},${toY})`);
          
          // If this is an AI unit, we could trigger their next action here
          // if (unit.isAI) { ... }
        }
      }
    });
  }

  /**
   * Handles animation of a unit that was displaced by spawning
   * @param displacementInfo Information about the displacement
   */
  private handleUnitDisplacement(displacementInfo: {
    occurred: boolean;
    unitId: string | null;
    fromX: number | null;
    fromY: number | null;
    toX: number | null;
    toY: number | null;
    timestamp: number | null;
  }) {
    // Skip if no unit ID or occurred flag is false, or if coordinates are null
    if (!displacementInfo.unitId || !displacementInfo.occurred || 
        displacementInfo.fromX === null || displacementInfo.fromY === null || 
        displacementInfo.toX === null || displacementInfo.toY === null) {
      return;
    }
    
    // Find the unit sprite in the units layer
    let unitSprite: Phaser.GameObjects.Sprite | null = null;
    if (this.layerManager.getUnitsLayer()) {
      this.layerManager.getUnitsLayer()!.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === displacementInfo.unitId) {
          unitSprite = child;
        }
      });
    }
    
    // If sprite not found, log error and return
    if (!unitSprite) {
      console.error(`Could not find sprite for displaced unit ${displacementInfo.unitId}`);
      return;
    }
    
    // Use the animation controller to handle displacement
    this.animationController.displaceUnit(
      displacementInfo.unitId,
      unitSprite,
      displacementInfo.fromX,
      displacementInfo.fromY,
      displacementInfo.toX,
      displacementInfo.toY
    );
  }

  // Add a method to handle spawn events
  private handleUnitSpawned() {
    // Implement the logic to hide the selection indicator when a unit is spawned
    this.hideSelectionIndicator();
  }

  // PHASE 4: Create a centralized method for selection indicator management
  private updateSelectionIndicator(shouldShow: boolean, x?: number, y?: number) {
    // Delegate to the selection renderer
    if (shouldShow && x !== undefined && y !== undefined) {
      this.selectionRenderer.showSelectionAt(x, y);
    } else {
      this.selectionRenderer.hideSelection();
    }
  }

  // Helper method to hide the selection indicator
  private hideSelectionIndicator() {
    this.selectionRenderer.hideSelection();
  }

  // Helper method to show the selection indicator at a specific grid position
  private showSelectionIndicatorAt(x: number, y: number) {
    this.selectionRenderer.showSelectionAt(x, y);
  }

  /**
   * Calculate the depth value for a unit sprite based on its grid position and state
   * This ensures proper isometric perspective (units at higher X+Y appear behind)
   * while making active units always appear above eggs on the same tile
   * 
   * @param gridX - X coordinate in the grid
   * @param gridY - Y coordinate in the grid
   * @param isActive - Whether the unit is active (true) or dormant/egg (false)
   * @returns depth value for the sprite
   */
  private calculateUnitDepth(gridX: number, gridY: number, isActive: boolean): number {
    // Base depth of the units layer
    const baseDepth = 5;
    
    // Combined X+Y coordinates for isometric perspective (higher X+Y = further back = higher depth)
    // This allows proper sorting where northwest objects appear in front, southeast objects behind
    const positionOffset = (gridX + gridY) / 1000;
    
    // Small offset to ensure active units appear above eggs at the same position
    // Using a very small value (0.0005) to minimize impact on overall perspective
    const stateOffset = isActive ? 0.0005 : 0;
    
    // Calculate final depth value
    return baseDepth + positionOffset + stateOffset;
  }

  // PHASE 4: Add a dedicated method to handle unit selection for consistent behavior
  private handleUnitSelection(unitId: string | null, showSelectionAt?: { x: number, y: number }) {
    // Select or deselect the unit in store
    actions.selectUnit(unitId);
    
    // If we're selecting a unit and have coordinates, show selection indicator
    if (unitId && showSelectionAt) {
      this.showSelectionIndicatorAt(showSelectionAt.x, showSelectionAt.y);
    } else {
      // Otherwise hide it (when deselecting or selecting an active unit)
      this.hideSelectionIndicator();
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

  // Updated to initialize all renderers with the current anchor values
  private createSelectionIndicator() {
    // Initialize the renderers with the current anchor values
    this.selectionRenderer.initialize(this.anchorX, this.anchorY);
    this.moveRangeRenderer.initialize(this.anchorX, this.anchorY);
    this.habitatRenderer.initialize(this.anchorX, this.anchorY);
    this.animalRenderer.initialize(this.anchorX, this.anchorY);
    this.inputManager.initialize(this.anchorX, this.anchorY);
    this.animationController.initialize(this.anchorX, this.anchorY);
    
    // Return null to satisfy the method signature (this can be removed in a future cleanup)
    return null;
  }

  // Method to get the currently hovered grid position
  getHoveredGridPosition(): { x: number, y: number } | null {
    // Use the selection renderer's hover tracking
    return this.selectionRenderer.getHoveredPosition();
  }
  
  // Method to get the terrain type at a grid position
  getTerrainAtPosition(x: number, y: number): TerrainType | null {
    const board = actions.getBoard();
    if (!board || !board.tiles[y] || !board.tiles[y][x]) return null;
    
    return board.tiles[y][x].terrain;
  }
  
  // Update method to track the mouse position
  update() {
    // Update the hover indicator based on the current pointer position
    const pointer = this.input.activePointer;
    const board = actions.getBoard();
    
    if (board) {
      this.selectionRenderer.updateFromPointer(pointer, board.width, board.height);
    }
  }

  // Method to convert screen coordinates to grid coordinates
  getGridPositionAt(screenX: number, screenY: number): { x: number, y: number } | null {
    return this.inputManager.getGridPositionAt(screenX, screenY);
  }
  
  // Method to convert grid coordinates to screen coordinates
  gridToScreen(gridX: number, gridY: number): { x: number, y: number } {
    // Use the utility method for conversion
    return CoordinateUtils.gridToWorld(
      gridX,
      gridY,
      this.tileSize,
      this.tileHeight,
      this.anchorX,
      this.anchorY
    );
  }

  // Add getter for tile renderer
  public getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }

  // Updated to use the AnimationController
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
    this.hideSelectionIndicator();
    
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

  // Add getter for selection renderer
  public getSelectionRenderer(): SelectionRenderer {
    return this.selectionRenderer;
  }

  // Handle clicks on habitats
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
      // Select habitat in store
      actions.selectHabitat(habitatId);
      
      // Show selection indicator at the habitat location
      this.selectionRenderer.showSelectionAt(gridX, gridY);
      
      console.log(`Habitat clicked: ${habitatId} at ${gridX},${gridY}`);
    }
  }
  
  // Check if a tile is a valid move target for the selected unit
  private isValidMoveTarget(gridX: number, gridY: number): { valid: boolean, reason?: string } {
    // First check if there's a selected unit and we're in move mode
    const selectedUnitId = actions.getSelectedUnitId();
    if (!selectedUnitId) {
      return { valid: false, reason: "No unit selected" };
    }
    
    // Check if this is a valid move destination
    const validMoves = actions.getValidMoves();
    const isValidMove = validMoves.some(move => move.x === gridX && move.y === gridY);
    
    if (!isValidMove) {
      return { valid: false, reason: "Not a valid move destination" };
    }
    
    return { valid: true };
  }

  // Add getter for move range renderer
  public getMoveRangeRenderer(): MoveRangeRenderer {
    return this.moveRangeRenderer;
  }

  // Add getter for habitat renderer
  public getHabitatRenderer(): HabitatRenderer {
    return this.habitatRenderer;
  }

  // Add getter for animal renderer
  public getAnimalRenderer(): AnimalRenderer {
    return this.animalRenderer;
  }

  // Add getter for input manager
  public getInputManager(): InputManager {
    return this.inputManager;
  }

  // Replace the old setupControls and setupKeyboardControls with a unified setupInputHandlers
  private setupInputHandlers(): void {
    // Initialize input manager with current anchor values
    this.inputManager.initialize(this.anchorX, this.anchorY);
    
    // Set up camera panning and zooming - now delegated to custom handlers using CameraManager
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
  }
  
  // Add a new method to handle camera-specific input
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

  // Add getter for camera manager
  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  // Updated to use CameraManager
  private setupCamera(): void {
    // Set up camera bounds and position using the camera manager
    this.cameraManager.setupCamera();
  }

  // Add getter for animation controller
  public getAnimationController(): AnimationController {
    return this.animationController;
  }
}