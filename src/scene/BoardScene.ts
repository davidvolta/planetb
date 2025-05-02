import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState } from "../store/gameStore";
import * as actions from "../store/actions";
import { RESOURCE_GENERATION_PERCENTAGE } from "../constants/gameConfig";
import * as CoordinateUtils from "../utils/CoordinateUtils";
import { LayerManager } from "../managers/LayerManager";
import { TileRenderer } from "../renderers/TileRenderer";
import { SelectionRenderer } from "../renderers/SelectionRenderer";
import { MoveRangeRenderer } from "../renderers/MoveRangeRenderer";
import { BiomeRenderer } from "../renderers/BiomeRenderer";
import { AnimalRenderer } from "../renderers/AnimalRenderer";
import { ResourceRenderer } from "../renderers/ResourceRenderer";
import { AnimationController } from "../controllers/AnimationController";
import { CameraManager } from "../managers/CameraManager";
import { StateSubscriptionManager } from "../managers/StateSubscriptionManager";
import { FogOfWarRenderer } from '../renderers/FogOfWarRenderer';
import { TILE_SIZE, TILE_HEIGHT } from '../constants/gameConfig';
import { TileInteractionController } from "../controllers/TileInteractionController";
import { VisibilityController } from '../controllers/VisibilityController';
import { GameController } from '../game/GameController';
import { SceneInitializer } from './init/SceneInitializer';
import { SubscriptionBinder } from './setup/SubscriptionBinder';
import { InputBinder } from './setup/InputBinder';
import { CommandExecutor } from '../game/CommandExecutor';

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

  // Managers and controllers
  private layerManager: LayerManager;
  private animationController: AnimationController;
  private cameraManager: CameraManager;
  private subscriptionManager: StateSubscriptionManager;
  private tileInteractionController: TileInteractionController;
  private gameController!: GameController;

  private fogOfWarEnabled = true;

  // New visibility controller
  private visibilityController: VisibilityController;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize managers and controllers
    this.layerManager = new LayerManager(this);
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight);
    this.cameraManager = new CameraManager(this);
    this.subscriptionManager = new StateSubscriptionManager(this);
    this.tileInteractionController = new TileInteractionController(this);

    // Initialize renderers
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.biomeRenderer = new BiomeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.resourceRenderer = new ResourceRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.fogOfWarRenderer = new FogOfWarRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    // Initialize visibility controller for fog-of-war
    this.visibilityController = new VisibilityController(this.fogOfWarRenderer);
  }

  // Preload assets needed for the scene
  preload() {
    // Load all animal sprites
    this.load.image("egg", "assets/egg.png");  
    this.load.image("buffalo", "assets/animals/buffalo/buffalo.png");
    this.load.image("bird", "assets/animals/bird/bird.png"); 
    this.load.image("snake", "assets/animals/snake/snake.png");
    this.load.image("octopus", "assets/animals/octopus/octopus.png");
    this.load.image("turtle", "assets/animals/turtle/turtle.png");
    this.load.image("forest", "assets/resources/forest.png");
    this.load.image("kelp", "assets/resources/kelp.png");
    this.load.image("insects", "assets/resources/insects.png");
    this.load.image("plankton", "assets/resources/plankton.png");
    this.load.image("blank", "assets/blank.png");
    this.load.image("beach", "assets/beach.png");
    this.load.image("grass", "assets/grass.png");
    this.load.image("water", "assets/water.png");
    this.load.image("mountain", "assets/mountain.png");
    this.load.image("underwater", "assets/underwater.png");

    // Preload colored animal sprites for both players
    this.load.image("snake-red", "assets/animals/snake/snake-red.png");
    this.load.image("snake-blue", "assets/animals/snake/snake-blue.png");
    this.load.image("bird-red", "assets/animals/bird/bird-red.png");
    this.load.image("bird-blue", "assets/animals/bird/bird-blue.png");
    this.load.image("buffalo-red", "assets/animals/buffalo/buffalo-red.png");
    this.load.image("buffalo-blue", "assets/animals/buffalo/buffalo-blue.png");
    this.load.image("octopus-red", "assets/animals/octopus/octopus-red.png");
    this.load.image("octopus-blue", "assets/animals/octopus/octopus-blue.png");
    this.load.image("turtle-red", "assets/animals/turtle/turtle-red.png");
    this.load.image("turtle-blue", "assets/animals/turtle/turtle-blue.png");

    this.load.on('complete', () => {
      // Set nearest filter on all loaded textures to preserve pixel-art for sprites
      const keys = ['egg','buffalo','bird','snake','octopus','turtle','forest','kelp','insects','plankton','blank','beach','grass','water','mountain','underwater',
        'snake-red','snake-blue','bird-red','bird-blue','buffalo-red','buffalo-blue','octopus-red','octopus-blue','turtle-red','turtle-blue'];
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
    
    // Initialize all renderers and controllers with anchor coordinates
    this.tileRenderer.initialize(anchorX, anchorY);
    this.selectionRenderer.initialize(anchorX, anchorY);
    this.moveRangeRenderer.initialize(anchorX, anchorY);
    this.biomeRenderer.initialize(anchorX, anchorY);
    this.animalRenderer.initialize(anchorX, anchorY);
    this.resourceRenderer.initialize(anchorX, anchorY);
    this.fogOfWarRenderer.initialize(anchorX, anchorY);
    this.animationController.initialize(anchorX, anchorY);
  }
  
  // Create and set up the scene
  public create(): void {
    console.log("BoardScene create() called", this.scene.key);

    // Step 1: Initialize GameController and animation/camera systems
    const initializer = new SceneInitializer(this);
    this.gameController = initializer.run();

    // Step 2: Setup state subscriptions
    const subscriptions = new SubscriptionBinder(this);
    subscriptions.bind();

    // Step 3: Bind user input
    const input = new InputBinder(this);
    input.bind();

    // Step 4: Create board tiles
    const board = actions.getBoard();
    if (board) {
      this.createTiles();
      this.cameraManager.centerCameraOnPlayerUnit(
        this.tileSize,
        this.tileHeight,
        this.anchorX,
        this.anchorY
      );
    }

    // Step 5: Launch overlays
    const executor = new CommandExecutor(this.gameController);
    this.scene.launch('UIScene', { executor });
    this.scene.launch('DebugScene', { debugConfig: { showFps: true } });
  }
  
  // Set up subscriptions to state changes
  private setupSubscriptions() {
    if (this.subscriptionsSetup) return;
    
    // Initialize the subscription manager with all renderers
    this.subscriptionManager.initialize({
      animalRenderer: this.animalRenderer,
      biomeRenderer: this.biomeRenderer,
      moveRangeRenderer: this.moveRangeRenderer,
      tileRenderer: this.tileRenderer,
      resourceRenderer: this.resourceRenderer,
      selectionRenderer: this.selectionRenderer
    });
    
    // Set up subscriptions to state changes
    this.subscriptionManager.setupSubscriptions((animalId, gridX, gridY) => {
      this.handleUnitSelection(animalId);
    });
    
    // Listen for spawn events from the state
    this.events.on('unit_spawned', this.handleUnitSpawned, this);
    
    // Update fog-of-war visuals whenever the active player changes
    StateObserver.subscribe(
      'BoardScene.activePlayerFOW',
      (state) => state.activePlayerId,
      (playerId: number) => {
        if (!this.fogOfWarEnabled) return;
        const board = actions.getBoard();
        if (!board) return;
        // Reset fog layer
        this.fogOfWarRenderer.clearFogOfWar();
        this.fogOfWarRenderer.createFogOfWar(board);
        // Reveal previously visible tiles for this player
        const coords = actions.getVisibleTilesForPlayer(playerId);
        if (coords.length) {
          this.fogOfWarRenderer.revealTiles(coords);
        }
      },
      { immediate: true }
    );
    
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

  // Helper to lookup a unit sprite by ID
  private getUnitSprite(unitId: string): Phaser.GameObjects.Sprite | undefined {
    return this.animalRenderer.getSpriteById(unitId);
  }

  // Start movement animation of a unit
  private async startUnitMovement(unitId: string, fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Lookup the unit sprite directly
    const unitSprite = this.getUnitSprite(unitId);
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId}`);
      return;
    }
    
    // Hide selection indicator and clear move highlights before movement
    this.moveRangeRenderer.clearMoveHighlights();
    this.selectionRenderer.hideSelection();
    
    // If fog of war is enabled, reveal around the destination via VisibilityController
    if (this.fogOfWarEnabled) {
      this.visibilityController.revealAround(toX, toY);
    }
    
    // Execute movement with animation and state update via GameController
    await this.gameController.moveUnit(unitId, toX, toY);
  }

  // Handle unit spawned events
  public handleUnitSpawned(unitId: string) {
    if (this.fogOfWarEnabled && unitId) {
      const unit = actions.getAnimals().find(a => a.id === unitId);
      if (unit) {
        this.visibilityController.revealAround(unit.position.x, unit.position.y);
      }
    }
    actions.clearSpawnEvent();
  }

  // Handle unit selection (UI now via subscription manager)
  public handleUnitSelection(unitId: string | null) {
    actions.selectUnit(unitId);
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
    // Handle clicks on tiles and habitats directly
    this.input.on(
      'gameobjectdown',
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Ignore clicks while animations are running
        if (this.animationController.hasActiveAnimations()) return;
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        if (gridX !== undefined && gridY !== undefined) {
          this.tileInteractionController.handleClick(gridX, gridY);
        }
      }
    );
    
    // Mark controls as set up
    this.controlsSetup = true;
  }

  //Get the current input mode
  isInMoveMode(): boolean {
    return actions.isMoveMode();
  }

  // Handle displacement events for animals
  async handleDisplacementEvent(unitId: string, fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Lookup the unit sprite directly
    const unitSprite = this.getUnitSprite(unitId);
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId} to displace`);
      actions.clearDisplacementEvent();
      return;
    }
    
    // If fog of war is enabled, reveal around the destination via VisibilityController
    if (this.fogOfWarEnabled) {
      this.visibilityController.revealAround(toX, toY);
    }
    
    // Animate displacement and update state
    await this.animationController.displaceUnit(unitId, unitSprite, fromX, fromY, toX, toY);
    // Clear the displacement event after animation completes
    actions.clearDisplacementEvent();
  }

  // Initialize visibility for starting units and habitats
  private initializeVisibility(): void {
    const board = actions.getBoard();
    if (!board) return;

    const activePlayerId = actions.getActivePlayerId();

    // Adjacent tiles around active player units
    const unitAdjacents = actions.getAnimals()
      .filter(a => a.ownerId === activePlayerId && a.state === AnimalState.ACTIVE)
      .flatMap(a => CoordinateUtils.getAdjacentTiles(a.position.x, a.position.y, board.width, board.height));
    const uniqueUnitTiles = CoordinateUtils.removeDuplicateTiles(unitAdjacents);

    // All tiles of owned biomes
    const biomeTiles = Array.from(actions.getBiomes().entries())
      .filter(([_, b]) => b.ownerId === activePlayerId)
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

  // Public method to reset resources with current settings (accepts override)
  public resetResources(resourceChance: number = RESOURCE_GENERATION_PERCENTAGE): void {
  // Get current board and biomes data
  const board = actions.getBoard();
  const biomes = actions.getBiomes();

  // Early exit if board or biomes are missing
  if (!board || !biomes || biomes.size === 0) {
    console.warn("Cannot reset resources: Board or biomes data is missing");
    return;
  }

  // Generate terrain data array from board tiles more efficiently
  const terrainData: TerrainType[][] = board.tiles.map(row => row.map(tile => tile.terrain));

  // Clear previous visualizations
  this.resourceRenderer.clearResources();
  this.resourceRenderer.clearBlankTileMarkers();

  // Update game state by resetting resources
  actions.resetResources(board.width, board.height, terrainData, resourceChance);

  // Fetch updated resource tiles and log the reset count
  const resourceTiles = actions.getResourceTiles();
  this.resourceRenderer.renderResourceTiles(resourceTiles); // Directly render resource tiles

  // Visualize blank tiles after rendering resource tiles
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
    this.cameraManager.destroy();
    this.animationController.destroy();
    this.subscriptionManager.destroy();
    
    // Reset variables
    this.tiles = [];
    this.controlsSetup = false;
    this.subscriptionsSetup = false;
  }

  /**
   * Expose the animation controller for external use (e.g. GameController)
   */
  public getAnimationController(): AnimationController {
    return this.animationController;
  }

  /**
   * Expose the animal renderer for external use (e.g. GameController)
   */
  public getAnimalRenderer(): AnimalRenderer {
    return this.animalRenderer;
  }

  /** Expose the camera manager for external use (e.g. UI camera pans) */
  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  /** Get tile size for grid-to-world calculations */
  public getTileSize(): number {
    return this.tileSize;
  }

  /** Get tile height for grid-to-world calculations */
  public getTileHeight(): number {
    return this.tileHeight;
  }

  /** Get current anchor X coordinate */
  public getAnchorX(): number {
    return this.anchorX;
  }

  /** Get current anchor Y coordinate */
  public getAnchorY(): number {
    return this.anchorY;
  }

  /**
   * Expose the GameController facade created in create().
   */
  public getGameController(): GameController {
    return this.gameController;
  }

  /**
   * Get the visibility controller for fog-of-war operations.
   */
  public getVisibilityController(): VisibilityController {
    return this.visibilityController;
  }

  /**
   * Get the LayerManager instance.
   */
  public getLayerManager(): LayerManager {
    return this.layerManager;
  }

  /**
   * Get the StateSubscriptionManager instance.
   */
  public getSubscriptionManager(): StateSubscriptionManager {
    return this.subscriptionManager;
  }

  /**
   * Get the TileRenderer instance.
   */
  public getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }

  /**
   * Get the MoveRangeRenderer instance.
   */
  public getMoveRangeRenderer(): MoveRangeRenderer {
    return this.moveRangeRenderer;
  }

  /**
   * Get the BiomeRenderer instance.
   */
  public getBiomeRenderer(): BiomeRenderer {
    return this.biomeRenderer;
  }

  /**
   * Get the ResourceRenderer instance.
   */
  public getResourceRenderer(): ResourceRenderer {
    return this.resourceRenderer;
  }

  /**
   * Get the SelectionRenderer instance.
   */
  public getSelectionRenderer(): SelectionRenderer {
    return this.selectionRenderer;
  }

  /**
   * Updates the fog-of-war visuals when the active player changes.
   * This is called by SubscriptionBinder.
   */
  public updateFogForPlayer(playerId: number): void {
    if (!this.fogOfWarEnabled) return;
    const board = actions.getBoard();
    if (!board) return;
    this.fogOfWarRenderer.clearFogOfWar();
    this.fogOfWarRenderer.createFogOfWar(board);
    const coords = actions.getVisibleTilesForPlayer(playerId);
    if (coords.length) {
      this.fogOfWarRenderer.revealTiles(coords);
    }
  }

  /**
   * Get the TileInteractionController instance for input handling.
   */
  public getTileInteractionController(): TileInteractionController {
    return this.tileInteractionController;
  }
}