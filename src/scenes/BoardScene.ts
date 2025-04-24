import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState } from "../store/gameStore";
import * as actions from "../store/actions";
import * as CoordinateUtils from "../utils/CoordinateUtils";
import { LayerManager } from "../managers/LayerManager";
import { TileRenderer } from "../renderers/TileRenderer";
import { SelectionRenderer } from "../renderers/SelectionRenderer";
import { MoveRangeRenderer } from "../renderers/MoveRangeRenderer";
import { BiomeRenderer } from "../renderers/BiomeRenderer";
import { AnimalRenderer } from "../renderers/AnimalRenderer";
import { ResourceRenderer } from "../renderers/ResourceRenderer";
import { InputManager } from "../managers/InputManager";
import { AnimationController } from "../controllers/AnimationController";
import { CameraManager } from "../managers/CameraManager";
import { StateSubscriptionManager } from "../managers/StateSubscriptionManager";
import { FogOfWarRenderer } from '../renderers/FogOfWarRenderer';
import { TILE_SIZE, TILE_HEIGHT } from '../constants/gameConfig';
import { TileInteractionController } from "../controllers/TileInteractionController";

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
  private biomeRenderer: BiomeRenderer;
  private animalRenderer: AnimalRenderer;
  private resourceRenderer: ResourceRenderer;
  private fogOfWarRenderer: FogOfWarRenderer;
  
  // Setup tracking
  private controlsSetup = false;
  private subscriptionsSetup = false;
  private fogOfWarEnabled = true;
  
  // Managers and controllers
  private layerManager: LayerManager;
  private inputManager: InputManager;
  private animationController: AnimationController;
  private cameraManager: CameraManager;
  private subscriptionManager: StateSubscriptionManager;
  private tileInteractionController: TileInteractionController;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize managers
    this.layerManager = new LayerManager(this);
    this.inputManager = new InputManager(this, this.tileSize, this.tileHeight);
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight);
    this.cameraManager = new CameraManager(this);
    
    // Initialize renderers
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.biomeRenderer = new BiomeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.resourceRenderer = new ResourceRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.fogOfWarRenderer = new FogOfWarRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the state subscription manager (now with simplified constructor)
    this.subscriptionManager = new StateSubscriptionManager(this);
    // Instantiate TileInteractionController
    this.tileInteractionController = new TileInteractionController(this, this.inputManager);
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
    this.load.image("blank", "assets/blank.png");

    this.load.on('complete', () => {
      // Set nearest filter on all loaded textures to preserve pixel-art for sprites
      const keys = ['egg','buffalo','bird','snake','octopus','turtle','forest','kelp','insects','plankton','blank'];
      keys.forEach(key => {
        const tex = this.textures.get(key);
        if (tex) {
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      });
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
    this.biomeRenderer.initialize(anchorX, anchorY);
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
  
  // Set up subscriptions to state changes
  private setupSubscriptions() {
    if (this.subscriptionsSetup) return;
    
    // Initialize the subscription manager with all renderers
    this.subscriptionManager.initialize({
      animalRenderer: this.animalRenderer,
      biomeRenderer: this.biomeRenderer,
      moveRangeRenderer: this.moveRangeRenderer,
      animationController: this.animationController,
      tileRenderer: this.tileRenderer,
      resourceRenderer: this.resourceRenderer
    });
    
    // Set up subscriptions to state changes
    this.subscriptionManager.setupSubscriptions((animalId, gridX, gridY) => {
      this.handleUnitSelection(animalId);
    });
    
    // Listen for spawn events from the state
    this.events.on('unit_spawned', this.handleUnitSpawned, this);
    
    // Mark as set up
    this.subscriptionsSetup = true;
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
    
    // Create Fog of War if it's enabled
    if (this.fogOfWarEnabled) {
      this.fogOfWarRenderer.createFogOfWar(board);
      this.initializeVisibility();
    } else {
      // Disable fog of war and reveal all
      this.fogOfWarRenderer.clearFogOfWar();
    }
    
    // Check if there are resources on the board
    const resourceTiles = actions.getResourceTiles();
    if (resourceTiles.length === 0) {
      console.log("Initial resource generation");
      this.resetResources();
    }
    
    // Visualize blank tiles by default
    this.resourceRenderer.visualizeBlankTiles();
    
    // Set up input handlers if they're not already set up
    if (!this.controlsSetup) {
      this.setupInputHandlers();
    }
  }

  // Clear all move highlights
  clearMoveHighlights() {
    this.moveRangeRenderer.clearMoveHighlights();     // Delegate to the move range renderer
  }

  // Start movement animation of a unit
  private startUnitMovement(unitId: string, fromX: number, fromY: number, toX: number, toY: number) {
    // Lookup the unit sprite directly
    const unitSprite = this.animalRenderer.getSpriteById(unitId);
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId}`);
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
        
        // Use batch update for all tiles instead of updating one by one
        actions.updateTilesVisibility(tilesToReveal.map(tile => ({
          x: tile.x,
          y: tile.y,
          visible: true
        })));
        
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
      const gridX = gameObject.getData('gridX');
      const gridY = gameObject.getData('gridY');
      if (gridX !== undefined && gridY !== undefined) {
        this.tileInteractionController.handleClick(gridX, gridY);
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
  
  public getBiomeRenderer(): BiomeRenderer {
    return this.biomeRenderer;
  }
  
  public getAnimalRenderer(): AnimalRenderer {
    return this.animalRenderer;
  }

   // Get the fog of war renderer
  public getFogOfWarRenderer(): FogOfWarRenderer {
    return this.fogOfWarRenderer;
  }

  // Get resource renderer
  public getResourceRenderer(): ResourceRenderer {
    return this.resourceRenderer;
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
  async handleDisplacementEvent(unitId: string, fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    console.log(`Handling displacement for unit ${unitId} from (${fromX},${fromY}) to (${toX},${toY})`);
    
    // Lookup the unit sprite directly
    const unitSprite = this.animalRenderer.getSpriteById(unitId);
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
        
        // Use batch update for all tiles instead of updating one by one
        actions.updateTilesVisibility(tilesToReveal.map(tile => ({
          x: tile.x,
          y: tile.y,
          visible: true
        })));
        
        // Remove duplicates and reveal visually
        const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tilesToReveal);
        this.fogOfWarRenderer.revealTiles(uniqueTiles);
      }
    }
    
    // Use the animation controller to displace the unit AFTER revealing fog of war
    await this.animationController.displaceUnit(unitId, unitSprite, fromX, fromY, toX, toY);
    // Clear the displacement event after animation completes
    actions.clearDisplacementEvent();
  }

  // Initialize visibility for starting units and habitats
  private initializeVisibility(): void {
    const board = actions.getBoard();
    if (!board) return;

    const currentPlayerId = actions.getCurrentPlayerId();

    // Adjacent tiles around active player units
    const unitAdjacents = actions.getAnimals()
      .filter(a => a.ownerId === currentPlayerId && a.state === AnimalState.ACTIVE)
      .flatMap(a => CoordinateUtils.getAdjacentTiles(a.position.x, a.position.y, board.width, board.height));
    const uniqueUnitTiles = CoordinateUtils.removeDuplicateTiles(unitAdjacents);

    // All tiles of owned biomes
    const biomeTiles = Array.from(actions.getBiomes().entries())
      .filter(([_, b]) => b.ownerId === currentPlayerId)
      .flatMap(([id]) => actions.getTilesForBiome(id).map(({ x, y }) => ({ x, y })));
    const uniqueBiomeTiles = CoordinateUtils.removeDuplicateTiles(biomeTiles);

    // Combine and batch update visibility
    const allTilesToReveal = [...uniqueUnitTiles, ...uniqueBiomeTiles];
    if (allTilesToReveal.length > 0) {
      const visibilityUpdates = allTilesToReveal.map(({ x, y }) => ({ x, y, visible: true }));
      actions.updateTilesVisibility(visibilityUpdates);
      this.fogOfWarRenderer.revealTiles(allTilesToReveal);
    }
  }
  
  // Reveal all tiles in a biome
  public revealBiomeTiles(biomeId: string, revealedTiles?: { x: number, y: number }[]): void {
    // Fetch tiles belonging to this biome
    const tileResults = actions.getTilesForBiome(biomeId);
    if (tileResults.length === 0) return;

    // Batch update visibility
    const visibilityUpdates = tileResults.map(({ x, y }) => ({ x, y, visible: true }));
    actions.updateTilesVisibility(visibilityUpdates);

    // Reveal in fog of war
    const coords = tileResults.map(({ x, y }) => ({ x, y }));
    if (revealedTiles) {
      revealedTiles.push(...coords);
    } else {
      this.fogOfWarRenderer.revealTiles(coords);
    }
  }
  
  // Toggle fog of war on/off
  public toggleFogOfWar(enabled: boolean): void {
    this.fogOfWarEnabled = enabled;
    const board = actions.getBoard();
    if (!board) return;
    if (enabled) {
      this.fogOfWarRenderer.createFogOfWar(board);
      const exploredTiles = actions.getTilesByFilter(tile => tile.explored);
      const coords = exploredTiles.map(({ x, y }) => ({ x, y }));
      if (coords.length) {
        this.fogOfWarRenderer.revealTiles(coords);
      }
    } else {
      this.fogOfWarRenderer.clearFogOfWar();
    }
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

  // Public method to reset resources with current settings
  public resetResources(): void {
    
    // Get the current board data
    const board = actions.getBoard();
    if (!board) {
      console.warn("Cannot reset resources: No board data available");
      return;
    }
    
    // Get all biomes for per-biome resource distribution
    const biomes = actions.getBiomes();
    if (!biomes || biomes.size === 0) {
      console.warn("Cannot reset resources: No biomes available");
      return;
    }
    
    // Create terrain data array from board tiles
    const terrainData: TerrainType[][] = Array(board.height)
      .fill(null)
      .map((_, y) => 
        Array(board.width)
          .fill(null)
          .map((_, x) => board.tiles[y][x].terrain)
      );
    
    // First, clear all visualizations to prevent any visual overlap
    this.resourceRenderer.clearResources();
    this.resourceRenderer.clearBlankTileMarkers();
    
    // Call the reset action to update the game state
    actions.resetResources(board.width, board.height, terrainData);
    
    // Fetch the updated resource tiles using the tile interface
    const resourceTiles = actions.getResourceTiles();
    console.log(`Reset ${resourceTiles.length} resource tiles`);
    
    // Render the updated resource tiles
    this.resourceRenderer.renderResourceTiles(resourceTiles.map(({ tile, x, y }) => ({ tile, x, y })));
    
    // Visualize blank tiles after all resource tiles are rendered
    this.resourceRenderer.visualizeBlankTiles();
  }

  // Scene shutdown handler
  shutdown() {
    this.unsubscribeAll();    // Clean up subscriptions    
    this.input.removeAllListeners(); // Clean up input handlers
    
    // Clean up renderers
    this.tileRenderer.destroy();
    this.selectionRenderer.destroy();
    this.moveRangeRenderer.destroy();
    this.biomeRenderer.destroy();
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
}