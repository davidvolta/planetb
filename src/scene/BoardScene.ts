import Phaser from 'phaser';
import * as actions from '../store/actions';
import { TILE_SIZE, TILE_HEIGHT, RESOURCE_GENERATION_PERCENTAGE } from '../constants/gameConfig';
import { StateObserver } from '../utils/stateObserver';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { GameEnvironment } from '../env/GameEnvironment';
import { TileRenderer, SelectionRenderer, MoveRangeRenderer, BiomeRenderer, AnimalRenderer, EggRenderer, ResourceRenderer, FogOfWarRenderer } from '../renderers';
import { LayerManager, CameraManager, StateSubscriptionManager} from '../managers';
import { AnimationController, VisibilityController, TileInteractionController } from '../controllers'
import { GameController } from '../game/GameController';
import { TurnController } from '../game/TurnController';
import { SceneInitializer } from './init/SceneInitializer';
import { SubscriptionBinder } from './setup/SubscriptionBinder';
import { getPlayerView } from '../selectors/getPlayerView';
import { getFullGameState } from '../store/actions';

// Custom event names
export const EVENTS = {
  ASSETS_LOADED: 'assetsLoaded'
};

// Delegate functionality to managers and ensure proper lifecycle management
export default class BoardScene extends Phaser.Scene {
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
  private eggRenderer: EggRenderer;
  private resourceRenderer: ResourceRenderer;
  private fogOfWarRenderer: FogOfWarRenderer;
  
  // Setup tracking
  private controlsSetup = false;

  // Managers and controllers
  private layerManager: LayerManager;
  private animationController: AnimationController;
  private cameraManager: CameraManager;
  private subscriptionManager: StateSubscriptionManager;
  private tileInteractionController: TileInteractionController;
  private gameController!: GameController;
  private turnController!: TurnController;
  private visibilityController: VisibilityController;

  // Add this to the class fields:
  private currentPlayerView: ReturnType<typeof getPlayerView> | null = null;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize managers and controllers
    this.layerManager = new LayerManager(this);
    this.cameraManager = new CameraManager(this);
    this.subscriptionManager = new StateSubscriptionManager(this);
    this.tileInteractionController = new TileInteractionController(this);

    // Initialize renderers
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.biomeRenderer = new BiomeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.eggRenderer = new EggRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.resourceRenderer = new ResourceRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.fogOfWarRenderer = new FogOfWarRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize controllers that depend on renderers
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight, this.animalRenderer);
    this.visibilityController = new VisibilityController(this.fogOfWarRenderer);

    // Renderer subscriptions have been moved to setupRendererSubscriptions method
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
    this.load.image("snake-pink", "assets/animals/snake/snake-pink.png");
    this.load.image("snake-blue", "assets/animals/snake/snake-blue.png");
    this.load.image("bird-pink", "assets/animals/bird/bird-pink.png");
    this.load.image("bird-blue", "assets/animals/bird/bird-blue.png");
    this.load.image("buffalo-pink", "assets/animals/buffalo/buffalo-pink.png");
    this.load.image("buffalo-blue", "assets/animals/buffalo/buffalo-blue.png");
    this.load.image("octopus-pink", "assets/animals/octopus/octopus-pink.png");
    this.load.image("octopus-blue", "assets/animals/octopus/octopus-blue.png");
    this.load.image("turtle-pink", "assets/animals/turtle/turtle-pink.png");
    this.load.image("turtle-blue", "assets/animals/turtle/turtle-blue.png");

    this.load.on('complete', () => {
      // Set nearest filter on all loaded textures to preserve pixel-art for sprites
      const keys = ['egg','buffalo','bird','snake','octopus','turtle','forest','kelp','insects','plankton','blank','beach','grass','water','mountain','underwater',
        'snake-pink','snake-blue','bird-pink','bird-blue','buffalo-pink','buffalo-blue','octopus-pink','octopus-blue','turtle-pink','turtle-blue'];
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
    this.unsubscribeAll();  // Ensure all old subscriptions are cleaned up before creating new ones    
    // Reset setup flags
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
    this.eggRenderer.initialize(anchorX, anchorY);
    this.resourceRenderer.initialize(anchorX, anchorY);
    this.fogOfWarRenderer.initialize(anchorX, anchorY);
    this.animationController.initialize(anchorX, anchorY);
  }
  
  // Create and set up the scene
  public create(): void {
    console.log("BoardScene create() called", this.scene.key);

    const initializer = new SceneInitializer(this);
    this.gameController = initializer.run();

    this.turnController = new TurnController(this.gameController, GameEnvironment.mode);

    // Set up subscriptions
    this.setupRendererSubscriptions();
    this.setupDisplacementSubscription();
    this.setupSpawnSubscription();

    const subscriptions = new SubscriptionBinder(this);
    subscriptions.bind();

    this.setupInputHandlers();

    this.updatePlayerView();

    const board = this.currentPlayerView?.board;
    if (board) {
      this.createTiles();
      this.cameraManager.centerCameraOnPlayerAnimal(
        this.tileSize,
        this.tileHeight,
        this.anchorX,
        this.anchorY
      );
    }

    // Update animal rendering logic
    this.animalRenderer.renderAnimals(this.currentPlayerView?.animals ?? []);

    // Update egg rendering logic - compress into one line
    this.eggRenderer.renderEggs(this.currentPlayerView?.eggs ?? []);
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
    const board = this.currentPlayerView?.board;
    if (!board) {
      console.warn("No board available");
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 
        "No board data available", 
        { color: '#ffffff', fontSize: '24px' }
      ).setOrigin(0.5);
      return;
    }

    const anchorX = this.cameras.main.width / 2;
    const anchorY = this.cameras.main.height / 2;

    this.anchorX = anchorX;
    this.anchorY = anchorY;

    this.tileRenderer.renderBoard(board, anchorX, anchorY);

    this.selectionRenderer.initialize(anchorX, anchorY);

    if (actions.getFogOfWarEnabled()) {
      this.fogOfWarRenderer.createFogOfWar(board);
      this.visibilityController.initializeVisibility();
    } else {
      this.fogOfWarRenderer.clearFogOfWar();
    }

    // Use filtered view for resource tiles
    const resourceTiles = this.currentPlayerView?.board.tiles.flat().filter(tile => tile.resourceType !== null && tile.active) || [];
    if (resourceTiles.length === 0) {
      console.log("Initial resource generation");
      this.resetResources();
    }

    if (!this.controlsSetup) {
      this.setupInputHandlers();
    }
  }

  // Helper to lookup an animal sprite by ID
  private getAnimalSprite(unitId: string): Phaser.GameObjects.Sprite | undefined {
    return this.animalRenderer.getSpriteById(unitId);
  }

  // Handle animal spawned events
  public handleSpawnEvent(animalId: string): void {
    if (!animalId) return;

    // Refresh player view after spawn
    this.updatePlayerView();

    // Reveal visibility
    if (actions.getFogOfWarEnabled()) {
      const animal = this.currentPlayerView?.animals.find(a => a.id === animalId);
      if (animal) {
        this.visibilityController.revealAround(animal.position.x, animal.position.y);
      }
    }

    // Re-render using filtered view
    const updatedAnimals = this.currentPlayerView?.animals ?? [];
    this.animalRenderer.renderAnimals(updatedAnimals);
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

    // Update selection logic to use filtered view
    const selectedId = this.currentPlayerView?.selectedAnimalID;
    const validMoves = this.currentPlayerView?.validMoves ?? [];
    const isMoveMode = this.currentPlayerView?.moveMode;
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
    
    // 🔥 Add debug key: T for "next turn"
    const keyboard = this.input.keyboard;
if (!keyboard) {
  console.warn("Keyboard input system not ready");
  return;
}

keyboard.on('keydown-T', async () => {

      console.log("▶️ Ending turn and switching player...");
      await this.turnController.next();          // Advance to next player
      this.updatePlayerView();                   // Refresh currentPlayerView
      if (this.currentPlayerView) {
        const { board, animals, eggs, biomes } = this.currentPlayerView;
        if (board) {
          this.tileRenderer.renderBoard(board, this.anchorX, this.anchorY);
        }
        this.animalRenderer.renderAnimals(animals ?? []);
        this.eggRenderer.renderEggs(eggs ?? []);
      }
    });

    // Mark controls as set up
    this.controlsSetup = true;
  }

  // Handle displacement events for animals
  async handleDisplacementEvent(animalId: string, fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Lookup the animal sprite directly
    const animalSprite = this.getAnimalSprite(animalId);
    if (!animalSprite) {
      console.error(`Could not find sprite for animal ${animalId} to displace`);
      actions.clearDisplacementEvent();
      return;
    }
    
    // Force sprite to start at its previous (from) position to ensure tween distance > 0
    const startWorld = CoordinateUtils.gridToWorld(
      fromX,
      fromY,
      this.tileSize,
      this.tileHeight,
      this.anchorX,
      this.anchorY
    );
    animalSprite.setPosition(startWorld.x, startWorld.y - 12); // same verticalOffset as renderer
    
    // Fog-of-war reveal using global flag
    if (actions.getFogOfWarEnabled()) {
      this.visibilityController.revealAround(toX, toY);
    }
    
    // Animate displacement and update state
    await this.animationController.displaceUnit(animalId, animalSprite, fromX, fromY, toX, toY);
    // Clear the displacement event after animation completes
    actions.clearDisplacementEvent();
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

    // Clear previous visualizations
    this.resourceRenderer.clearResources();

    // Update game state by resetting resources
    actions.resetResources(resourceChance);

    // Fetch updated resource tiles and log the reset count
    const resourceTiles = actions.getResourceTiles();
    this.resourceRenderer.renderResourceTiles(resourceTiles); // Directly render resource tiles

  }

  // Scene shutdown handler
  shutdown(): void {
    this.subscriptionManager.unsubscribeAll();
    this.input.removeAllListeners();
    this.layerManager.clearAllLayers(true);

    this.tileRenderer.destroy();
    this.selectionRenderer.destroy();
    this.moveRangeRenderer.destroy();
    this.biomeRenderer.destroy();
    this.animalRenderer.destroy();
    this.eggRenderer.destroy();
    this.resourceRenderer.destroy();
    this.fogOfWarRenderer.destroy();

    this.cameraManager.destroy();
    this.animationController.destroy();
    this.subscriptionManager.destroy();

    this.controlsSetup = false;
  }


  public getAnimationController(): AnimationController {
    return this.animationController;
  }

  public getAnimalRenderer(): AnimalRenderer {
    return this.animalRenderer;
  }

  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }
  
  public getTileSize(): number {
    return this.tileSize;
  }
  
  public getTileHeight(): number {
    return this.tileHeight;
  }

  public getAnchorX(): number {
    return this.anchorX;
  }

  public getAnchorY(): number {
    return this.anchorY;
  }

  public getGameController(): GameController {
    return this.gameController;
  }
  
  public getVisibilityController(): VisibilityController {
    return this.visibilityController;
  }

  public getLayerManager(): LayerManager {
    return this.layerManager;
  }

  public getSubscriptionManager(): StateSubscriptionManager {
    return this.subscriptionManager;
  }
  
  public getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }

  public getMoveRangeRenderer(): MoveRangeRenderer {
    return this.moveRangeRenderer;
  }

  public getBiomeRenderer(): BiomeRenderer {
    return this.biomeRenderer;
  }

  public getResourceRenderer(): ResourceRenderer {
    return this.resourceRenderer;
  }

  public getSelectionRenderer(): SelectionRenderer {
    return this.selectionRenderer;
  }

  public getTurnController(): TurnController {
    return this.turnController;
  }
  
  public getEggRenderer(): EggRenderer {
      return this.eggRenderer;
  }
  
  public getTileInteractionController(): TileInteractionController {
    return this.tileInteractionController;
  }

  private updatePlayerView(): void {
    const playerId = actions.getActivePlayerId();
    const fullState = getFullGameState();
    this.currentPlayerView = getPlayerView(fullState, playerId);
  }

  // Set up renderer subscriptions
  setupRendererSubscriptions(): void {
    this.resourceRenderer.setupSubscriptions();
    this.animalRenderer.setupSubscriptions();
    this.biomeRenderer.setupSubscriptions();
    this.eggRenderer.setupSubscriptions();
    this.moveRangeRenderer.setupSubscriptions();
    this.selectionRenderer.setupSubscriptions();
  }

  // Set up displacement event subscription
  setupDisplacementSubscription(): void {
    StateObserver.subscribe(
      'BoardScene.displacement',
      (state) => state.displacementEvent,
      (displacementEvent) => {
        if (displacementEvent && displacementEvent.occurred) {
          const { animalId, fromX, fromY, toX, toY } = displacementEvent;
          this.handleDisplacementEvent(animalId!, fromX!, fromY!, toX!, toY!);
        }
      }
    );
  }

  // Set up spawn event subscription
  setupSpawnSubscription(): void {
    StateObserver.subscribe(
      'BoardScene.spawn',
      (state) => state.spawnEvent,
      (spawnEvent) => {
        if (spawnEvent && spawnEvent.occurred) {
          this.handleSpawnEvent(spawnEvent.animalId!);
          actions.clearSpawnEvent();
        }
      }
    );
  }
}
