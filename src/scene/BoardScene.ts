import Phaser from 'phaser';
import * as actions from '../store/actions';
import { TILE_SIZE, TILE_HEIGHT, RESOURCE_GENERATION_PERCENTAGE } from '../constants/gameConfig';
import { StateObserver } from '../utils/stateObserver';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { GameEnvironment } from '../env/GameEnvironment';
import { TileRenderer, SelectionRenderer, MoveRangeRenderer, BiomeRenderer, AnimalRenderer, EggRenderer, ResourceRenderer, FogOfWarRenderer } from '../renderers';
import { LayerManager, CameraManager } from '../managers';
import { AnimationController, TileInteractionController } from '../controllers'
import { GameController } from '../game/GameController';
import { TurnController } from '../game/TurnController';
import { SceneInitializer } from './init/SceneInitializer';
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
  private tileRenderer!: TileRenderer;
  private selectionRenderer!: SelectionRenderer;
  private moveRangeRenderer!: MoveRangeRenderer;
  private biomeRenderer!: BiomeRenderer;
  private animalRenderer!: AnimalRenderer;
  private eggRenderer!: EggRenderer;
  private resourceRenderer!: ResourceRenderer;
  private fogOfWarRenderer!: FogOfWarRenderer;

  // Managers and controllers
  private layerManager!: LayerManager;
  private animationController!: AnimationController;
  private cameraManager!: CameraManager;
  private tileInteractionController!: TileInteractionController;
  private gameController!: GameController;
  private turnController!: TurnController;

  // Add this to the class fields:
  private currentPlayerView: ReturnType<typeof getPlayerView> | null = null;
  
  // Health display properties
  private healthTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: "BoardScene" });
  }

  // Initialize the scene
  init() {
    this.unsubscribeAll();
    this.initializeSceneSystems();
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
      const keys = ['egg', 'buffalo', 'bird', 'snake', 'octopus', 'turtle', 'forest', 'kelp', 'insects', 'plankton', 'blank', 'beach', 'grass', 'water', 'mountain', 'underwater',
        'snake-pink', 'snake-blue', 'bird-pink', 'bird-blue', 'buffalo-pink', 'buffalo-blue', 'octopus-pink', 'octopus-blue', 'turtle-pink', 'turtle-blue'];
      keys.forEach(key => {
        const tex = this.textures.get(key);
        if (tex) {
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      });
      this.events.emit(EVENTS.ASSETS_LOADED);
    });
  }

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

  // Create and set up the scene
  public create(): void {
    console.log("BoardScene create() called", this.scene.key);

    const initializer = new SceneInitializer(this);
    this.gameController = initializer.run();

    this.turnController = new TurnController(this.gameController, GameEnvironment.mode);

    // Set up subscriptions
    this.setupAllSubscriptions();
    this.setupVisibilitySubscriptions();
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

    this.animalRenderer.renderAnimals(this.currentPlayerView?.animals ?? []);
    this.eggRenderer.renderEggs(this.currentPlayerView?.eggs ?? []);
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
    this.resourceRenderer.initialize(anchorX, anchorY);

    if (actions.getFogOfWarEnabled()) {
      this.fogOfWarRenderer.createFogOfWar(board);
      this.fogOfWarRenderer.initializeVisibility();
    } else {
      this.fogOfWarRenderer.clearFogOfWar();
    }

    // Obtain visible resources from current player view
    const fullResourcesArray = this.currentPlayerView?.resources ?? [];

    // Render all resources (visibility will be handled by FOW layer)
    this.resourceRenderer.renderResources(fullResourcesArray);
  }

  private updatePlayerView(): void {
    const playerId = actions.getActivePlayerId();
    const fullState = getFullGameState();
    this.currentPlayerView = getPlayerView(fullState, playerId);

    // Trigger re-rendering for player-visible resource set
    const visibleResources = this.currentPlayerView?.resources ?? [];
    this.resourceRenderer.renderResources(visibleResources);
  }

  // Helper to lookup an animal sprite by ID
  private getAnimalSprite(unitId: string): Phaser.GameObjects.Sprite | undefined {
    return this.animalRenderer.getSpriteById(unitId);
  }

  // Create and initialize all scene systems
  private initializeSceneSystems(): void {
    // Create managers and controllers
    this.layerManager = new LayerManager(this);
    this.layerManager.setupLayers();
    this.cameraManager = new CameraManager(this);
    this.tileInteractionController = new TileInteractionController(this);

    // Set anchor points for coordinate system
    this.anchorX = this.cameras.main.width / 2;
    this.anchorY = this.cameras.main.height / 2;
    const { anchorX, anchorY } = this;

    // Create renderers with tile dimensions
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.moveRangeRenderer = new MoveRangeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.biomeRenderer = new BiomeRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.animalRenderer = new AnimalRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.eggRenderer = new EggRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.resourceRenderer = new ResourceRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    this.fogOfWarRenderer = new FogOfWarRenderer(this, this.layerManager, this.tileSize, this.tileHeight);

    // Create controllers that depend on renderers
    this.animationController = new AnimationController(this, this.tileSize, this.tileHeight, this.animalRenderer);

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

  // Set up input handlers for clicks and keyboard
  private setupInputHandlers(): void {
    // Handle clicks on tiles and habitats directly
    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Ignore clicks while animations are running
        if (this.animationController.hasActiveAnimations()) return;
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        if (gridX !== undefined && gridY !== undefined) {
          this.tileInteractionController.handleClick(gridX, gridY);
        }
      }
    );
  }

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
      this.fogOfWarRenderer.revealAround(toX, toY);
    }

    // Animate displacement and update state
    await this.animationController.displaceUnit(animalId, animalSprite, fromX, fromY, toX, toY);
    // Clear the displacement event after animation completes
    actions.clearDisplacementEvent();
  }

  public handleSpawnEvent(animalId: string): void {
    if (!animalId) return;

    // Get spawn animal data directly from global state
    const animal = actions.getAnimals().find(a => a.id === animalId);
    
    // Reveal tiles directly through actions
    if (animal && actions.getFogOfWarEnabled()) {
      actions.revealTilesAround(animal.position.x, animal.position.y);
      }
    
    // Now that visibility is updated, refresh player view
    this.updatePlayerView();

    // Re-render using filtered view from getPlayerView
    const updatedAnimals = this.currentPlayerView?.animals ?? [];
    this.animalRenderer.renderAnimals(updatedAnimals);
    this.eggRenderer.renderEggs(this.currentPlayerView?.eggs ?? []);
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

    // Refresh player view and re-render resources list
    this.updatePlayerView();
    this.resourceRenderer.renderResources(this.currentPlayerView?.resources ?? []);
  }

  private setupAllSubscriptions(): void {
    // Renderer subscriptions
    this.animalRenderer.setupSubscriptions();
    this.biomeRenderer.setupSubscriptions();
    this.eggRenderer.setupSubscriptions();
    this.moveRangeRenderer.setupSubscriptions();
    this.selectionRenderer.setupSubscriptions();
    this.fogOfWarRenderer.setupSubscriptions();

    // Board scene subscriptions
    this.setupDisplacementSubscription();
    this.setupSpawnSubscription();
    this.setupHealthSubscription();
  }

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

  setupHealthSubscription(): void {
    StateObserver.subscribe(
      'BoardScene.health',
      (state) => {
        const activePlayerId = state.activePlayerId;
        const currentPlayerAnimals = state.animals.filter(animal => animal.ownerId === activePlayerId);
        return {
          animals: currentPlayerAnimals.map(animal => ({
            id: animal.id,
            x: animal.position.x,
            y: animal.position.y,
            health: animal.health
          }))
        };
      },
      (data) => {
        this.updateHealthDisplay(data.animals);
      }
    );
  }

  private updateHealthDisplay(animals: Array<{id: string, x: number, y: number, health: number}>): void {
    // Clear existing health texts
    this.healthTexts.forEach(text => text.destroy());
    this.healthTexts.clear();

    // Create health text for each animal
    animals.forEach(animal => {
      const worldPos = CoordinateUtils.gridToWorld(
        animal.x,
        animal.y,
        this.tileSize,
        this.tileHeight,
        this.anchorX,
        this.anchorY
      );

      // Position health text in upper right of animal with offset
      const healthText = this.add.text(
        worldPos.x + this.tileSize * 0.4 - 10,
        worldPos.y - this.tileSize * 0.35 - 3,
        animal.health.toString(),
        {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#FFFFFF',
          stroke: '#000000',
          strokeThickness: 1
        }
      );

      healthText.setDepth(1000); // High depth to appear above everything
      this.healthTexts.set(animal.id, healthText);
    });
  }

  // Set up visibility subscription for fog of war and biome rendering
  private setupVisibilitySubscriptions(): void {
    StateObserver.subscribe(
      'BoardScene.activePlayerFOW',
      state => ({
        activePlayerId: state.activePlayerId,
        // Track visibility changes and turn to catch spawns and captures
        visibleTiles: state.players.find(p => p.id === state.activePlayerId)?.visibleTiles.size || 0,
        turn: state.turn,
        fogOfWarEnabled: state.fogOfWarEnabled
      }),
      ({ activePlayerId, visibleTiles, turn, fogOfWarEnabled }) => {
        // Use FOWRenderer directly to update fog state for player change
        if (fogOfWarEnabled) {
          this.fogOfWarRenderer.updateFogForActivePlayer(activePlayerId);
        }

        const board = actions.getBoard();
        const biomes = actions.getBiomes();
        const players = actions.getPlayers();
        if (board && players.length > 0) {
          this.biomeRenderer.renderOutlines(board, biomes, players, activePlayerId);
          this.biomeRenderer.renderBiomes(Array.from(biomes.values()));
        }
        
        // Update player view
        this.updatePlayerView();
      },
      { immediate: true }
    );
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

  public getLayerManager(): LayerManager {
    return this.layerManager;
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

  // Clean up all subscriptions to prevent memory leak
  private unsubscribeAll() {
    // Unsubscribe any lingering direct subscriptions by key prefix
    const boardScenePrefix = 'BoardScene.';
    StateObserver.getActiveSubscriptions().forEach(key => {
      if (key.startsWith(boardScenePrefix)) {
        StateObserver.unsubscribe(key);
      }
    });
  }

  shutdown(): void {
    this.unsubscribeAll();
    this.input.removeAllListeners();
    this.layerManager.clearAllLayers(true);

    // Clean up health texts
    this.healthTexts.forEach(text => text.destroy());
    this.healthTexts.clear();

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
  }

}