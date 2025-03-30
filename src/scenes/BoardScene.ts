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
  
  private controlsSetup = false;
  private subscriptionsSetup = false;
  
  // Selection indicator for hover/selection - DEPRECATED: using SelectionRenderer instead
  private selectionIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Properties to track mouse position over the grid - DEPRECATED: using SelectionRenderer instead
  private hoveredGridPosition: { x: number, y: number } | null = null;
  
  // Array to store move range highlight graphics
  private moveRangeHighlights: Phaser.GameObjects.Graphics[] = [];
  
  // Track animations in progress
  private animationInProgress: boolean = false;

  constructor() {
    super({ key: "BoardScene" });
    
    // Initialize the layer manager
    this.layerManager = new LayerManager(this);
    
    // Initialize the tile renderer with the layer manager
    this.tileRenderer = new TileRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
    
    // Initialize the selection renderer with the layer manager
    this.selectionRenderer = new SelectionRenderer(this, this.layerManager, this.tileSize, this.tileHeight);
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
    
    // Set up camera controls
    this.setupControls();
    
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

  // Updated method using the consolidated approach
  renderAnimalSprites(animals: Animal[]) {
    // Check if unitsLayer exists before proceeding
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (!unitsLayer) {
      console.warn("Cannot render animal sprites - unitsLayer not available");
      return;
    }
    
    // If an animation is in progress, defer updating sprites
    if (this.animationInProgress) {
      return;
    }
    
    // Get a map of current animal sprites by ID
    const existingSprites = new Map();
    unitsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        const animalId = child.getData('animalId');
        if (animalId) {
          existingSprites.set(animalId, {
            sprite: child,
            used: false
          });
        }
      }
    });
    
    // Process each animal - create new or update existing
    animals.forEach(animal => {
      // Calculate position
      const gridX = animal.position.x;
      const gridY = animal.position.y;
      const isoX = (gridX - gridY) * this.tileSize / 2;
      const isoY = (gridX + gridY) * this.tileHeight / 2;
      
      // Position using anchor points
      const worldX = this.anchorX + isoX;
      const worldY = this.anchorY + isoY;
      
      // Apply vertical offset to raise the sprite above the tile
      const verticalOffset = -12; // Lift the sprite up by 12 pixels
      
      // Determine the texture based on animal state
      const textureKey = animal.state === AnimalState.DORMANT ? 'egg' : animal.type;
      
      // Determine if the unit is active (for depth calculation)
      const isActive = animal.state === AnimalState.ACTIVE;
      
      // Check if we have an existing sprite
      const existing = existingSprites.get(animal.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position with vertical offset
        existing.sprite.setPosition(worldX, worldY + verticalOffset);
        
        // Set depth based on position and state
        existing.sprite.setDepth(this.calculateUnitDepth(gridX, gridY, isActive));
        
        // Update texture if animal state changed
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
        }
        
        // Handle interactivity and visual feedback based on state and movement
        if (animal.state === AnimalState.DORMANT) {
          // ALWAYS disable interactivity for dormant units (eggs)
          existing.sprite.disableInteractive();
        } else if (animal.state === AnimalState.ACTIVE) {
          if (animal.hasMoved) {
            // Ensure interactivity is disabled for moved units
            existing.sprite.disableInteractive();
            
            // Make sure the tint is applied
            existing.sprite.setTint(0xCCCCCC);
          } else {
            // Re-enable interactivity for units that can move 
            // (important for new turn when hasMoved is reset)
            existing.sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 128 });
            
            // Clear any tint
            existing.sprite.clearTint();
          }
        }
      } else {
        // Create a new sprite for this animal with the correct texture
        const animalSprite = this.add.sprite(worldX, worldY + verticalOffset, textureKey);
        
        // Set appropriate scale
        animalSprite.setScale(1);
        
        // Set depth based on position and state
        animalSprite.setDepth(this.calculateUnitDepth(gridX, gridY, isActive));
        
        // Handle interactivity based on state
        if (animal.state === AnimalState.DORMANT) {
          // NEVER make dormant units (eggs) interactive
          // No need to set interactivity at all for eggs
        } else if (animal.state === AnimalState.ACTIVE && !animal.hasMoved) {
          // Make interactive only if it's active and hasn't moved
          animalSprite.setInteractive({ pixelPerfect: true, alphaTolerance: 128 });
        } else if (animal.state === AnimalState.ACTIVE && animal.hasMoved) {
          // Apply visual feedback for moved units
          animalSprite.setTint(0xCCCCCC);
        }
        
        // Store the animal ID and type on the sprite
        animalSprite.setData('animalId', animal.id);
        animalSprite.setData('animalType', animal.type);
        animalSprite.setData('gridX', gridX);
        animalSprite.setData('gridY', gridY);
        
        // Only add click handler for active units
        if (animal.state === AnimalState.ACTIVE && !animal.hasMoved) {
          animalSprite.on('pointerdown', () => {
            console.log(`Animal clicked: ${animal.id} at ${gridX},${gridY}`);
            
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
                this.handleUnitSelection(animal.id);
              }
            } else {
              // No unit selected, select this one
              this.handleUnitSelection(animal.id);
            }
          });
        }
        
        // Add the new sprite to the units layer
        if (!existing) {
          this.layerManager.addToLayer('units', animalSprite);
        }
      }
    });
    
    // Remove sprites for animals that no longer exist
    existingSprites.forEach((data, id) => {
      if (!data.used) {
        data.sprite.destroy();
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
    
    // Add panning and zooming for navigation (only if not already set up)
    if (!this.controlsSetup) {
      this.setupControls();
    }
    
    // Setup click event delegation at the container level
    this.setupClickEventDelegation();
    
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
  
  // Handle clicks on tiles and their contents
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
    
    // Check if this tile is a valid move target for the currently selected unit
    const isValidMoveTarget = this.isValidMoveTarget(gridX, gridY);
    
    if (isValidMoveTarget.valid) {
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
          // Render the moves (BoardScene already has this method)
          this.renderMoveRange(validMoves, true);
        }
      }
    } 
    // If we clicked on a dormant unit or empty tile, deselect any selected unit
    else {
      // PHASE 4: Use the centralized selection method
      this.handleUnitSelection(null);
      
      // Hide valid moves - clear the move highlights
      this.clearMoveHighlights();
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

  // Create a habitat graphic based on its state (potential or shelter)
  private createHabitatGraphic(x: number, y: number, state: HabitatState): Phaser.GameObjects.Container {
    // Create a container for the habitat
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    
    // Calculate scale factor (approximately 5px smaller on each side)
    const scaleFactor = 0.85; // This will make the diamond about 5px smaller on a 64px tile
    
    // Create scaled diamond points using utility
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize,
      this.tileHeight,
      scaleFactor
    );
    
    // Choose color based on state
    if (state === HabitatState.IMPROVED) {
      // Blue for improved habitats
      graphics.fillStyle(0x0066ff, 0.7);
    } else {
      // Black for potential and shelter habitats
      graphics.fillStyle(0x000000, 0.5);
    }
    
    // Draw the filled shape
    graphics.beginPath();
    graphics.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      graphics.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    
    // Add the graphics to the container
    container.add(graphics);
    
    // Remove interactivity from habitats - selection should only happen through tiles
    // No longer making the container interactive
    
    return container;
  }

  // Update habitats based on the state
  renderHabitatGraphics(habitats: any[]) {
    // Check if staticObjectsLayer exists before proceeding
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render habitat graphics - staticObjectsLayer not available");
      return;
    }
    
    // Get a map of current habitat graphics by ID
    const existingHabitats = new Map();
    staticObjectsLayer.getAll().forEach(child => {
      if (child && 'getData' in child && typeof child.getData === 'function') {
        const habitatId = child.getData('habitatId');
        if (habitatId) {
          existingHabitats.set(habitatId, {
            graphic: child,
            used: false
          });
        }
      }
    });
    
    // Process each habitat - create new or update existing
    habitats.forEach(habitat => {
      // Calculate position using coordinate utility
      const gridX = habitat.position.x;
      const gridY = habitat.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Check if we have an existing graphic
      const existing = existingHabitats.get(habitat.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position
        existing.graphic.setPosition(worldPosition.x, worldPosition.y);
        
        // Update state if needed
        if (existing.graphic.getData('habitatState') !== habitat.state) {
          existing.graphic.setData('habitatState', habitat.state);
          
          // Destroy and recreate the graphic to reflect the new state
          existing.graphic.destroy();
          const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, habitat.state);
          habitatGraphic.setData('habitatId', habitat.id);
          habitatGraphic.setData('gridX', gridX);
          habitatGraphic.setData('gridY', gridY);
          this.layerManager.addToLayer('staticObjects', habitatGraphic);
          
          // Update the reference in the map
          existingHabitats.set(habitat.id, {
            graphic: habitatGraphic,
            used: true
          });
        }
      } else {
        // Create a new habitat graphic
        const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, habitat.state);
        
        // Store the habitat ID for reference
        habitatGraphic.setData('habitatId', habitat.id);
        
        // Store grid coordinates for reference in click handling
        habitatGraphic.setData('gridX', gridX);
        habitatGraphic.setData('gridY', gridY);
        
        // Remove direct click handler - now handled by global click delegation
        
        // Add the new graphic to the layer using layer manager
        this.layerManager.addToLayer('staticObjects', habitatGraphic);
      }
    });
    
    // Remove any habitats that no longer exist
    existingHabitats.forEach((data, id) => {
      if (!data.used) {
        data.graphic.destroy();
      }
    });
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

  // Create circular highlight for a move tile
  private createMoveHighlight(x: number, y: number): Phaser.GameObjects.Graphics {
    // Use coordinate utility to get world position
    const worldPosition = CoordinateUtils.gridToWorld(
      x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
    );
    
    // Create a graphics object for the move highlight
    const highlight = this.add.graphics();
    
    // Set the position
    highlight.setPosition(worldPosition.x, worldPosition.y);
    
    // Apply scaling factor
    const scaleFactor = 0.85;
    
    // Create scaled diamond points using utility
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize,
      this.tileHeight,
      scaleFactor
    );
    
    // Draw outer glow (slightly larger, more transparent)
    highlight.lineStyle(5, 0xFFFF00, 0.3); // Yellow with 30% opacity, thicker line for glow effect
    highlight.beginPath();
    highlight.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      highlight.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    highlight.closePath();
    highlight.strokePath();
    
    // Draw the main diamond shape
    highlight.lineStyle(3, 0xFFFF00, 0.7); // Yellow with 70% opacity, standard line width
    highlight.beginPath();
    highlight.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      highlight.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    highlight.closePath();
    highlight.strokePath();
    
    return highlight;
  }
  
  // Render move range highlights
  renderMoveRange(validMoves: ValidMove[], moveMode: boolean) {
    // If an animation is in progress, don't update the move range
    if (this.animationInProgress) {
      return;
    }
    
    // Clear existing highlights
    this.clearMoveHighlights();
    
    // Get the move range layer using the layer manager
    const moveRangeLayer = this.layerManager.getMoveRangeLayer();
    
    // If not in move mode or no valid moves, we're done
    if (!moveMode || !validMoves.length || !moveRangeLayer) {
      return;
    }
    
    console.log(`Rendering ${validMoves.length} valid move highlights`);
    
    // Create highlight for each valid move
    validMoves.forEach(move => {
      const highlight = this.createMoveHighlight(move.x, move.y);
      this.moveRangeHighlights.push(highlight);
      
      // Add the highlight to the move range layer using layer manager
      this.layerManager.addToLayer('moveRange', highlight);
    });
  }
  
  // Clear move highlights
  clearMoveHighlights() {
    // Destroy all existing highlights
    this.moveRangeHighlights.forEach(highlight => {
      highlight.destroy();
    });
    
    // Reset the array
    this.moveRangeHighlights = [];
    
    // Also clear the layer using layer manager
    this.layerManager.clearLayer('moveRange', true);
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
    
    // Now we know the coordinates are not null, we can use them
    const unitId = displacementInfo.unitId;
    const fromX = displacementInfo.fromX;
    const fromY = displacementInfo.fromY;
    const toX = displacementInfo.toX;
    const toY = displacementInfo.toY;
    
    // Use the unified animation method with displacement-specific options
    // Do NOT apply tint or disable interactivity - let the unit remain selectable if it hasn't moved
    this.animateUnit(unitId, fromX, fromY, toX, toY, {
      applyTint: false,           // Don't apply the "moved" tint
      disableInteractive: false,  // Don't disable interactivity
      updateState: true,
      clearMoveHighlights: false,
      isDisplacement: true
    });
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

  // Create a selection indicator to show the currently selected tile
  private createSelectionIndicator() {
    // We now delegate this to the SelectionRenderer
    // Initialize the selection renderer with the current anchor values
    this.selectionRenderer.initialize(this.anchorX, this.anchorY);
    
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
    // Get current board state
    const board = actions.getBoard();
    if (!board) return null;
    
    // Get world point from screen coordinates
    const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
    
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

  // Updated to use the unified animation method
  private startUnitMovement(unitId: string, fromX: number, fromY: number, toX: number, toY: number) {
    // Don't allow movement while animation is in progress
    if (this.animationInProgress) {
      return;
    }
    
    // Use the unified animation method with movement-specific options
    this.animateUnit(unitId, fromX, fromY, toX, toY, {
      applyTint: true,
      disableInteractive: true,
      updateState: true,
      clearMoveHighlights: true
    });
  }

  // Unified animation method for all unit movements
  private animateUnit(
    unitId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      applyTint?: boolean;
      disableInteractive?: boolean;
      updateState?: boolean;
      clearMoveHighlights?: boolean;
      duration?: number;
      isDisplacement?: boolean;
    } = {}
  ) {
    // Set default options
    const {
      applyTint = false,
      disableInteractive = false,
      updateState = false,
      clearMoveHighlights = false,
      duration: fixedDuration = null,
      isDisplacement = false
    } = options;
    
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
      console.error(`Could not find sprite for unit ${unitId}`);
      return;
    }
    
    // Convert grid coordinates to world coordinates using utility
    const startPos = CoordinateUtils.gridToWorld(
      fromX, fromY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
    );
    const endPos = CoordinateUtils.gridToWorld(
      toX, toY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
    );
    
    const startWorldX = startPos.x;
    const startWorldY = startPos.y;
    const endWorldX = endPos.x;
    const endWorldY = endPos.y;
    
    // Apply vertical offset
    const verticalOffset = -12;
    
    // Mark animation as in progress
    this.animationInProgress = true;
    
    // Clear move highlights if requested
    if (clearMoveHighlights) {
      this.clearMoveHighlights();
    }
    
    // Hide selection indicator during animation
    this.hideSelectionIndicator();
    
    // Calculate movement duration based on distance (unless fixed duration is provided)
    let duration;
    if (fixedDuration) {
      duration = fixedDuration;
    } else {
      const distance = Math.sqrt(
        Math.pow(endWorldX - startWorldX, 2) + 
        Math.pow(endWorldY - startWorldY, 2)
      );
      const baseDuration = 75; // Moderate duration for smooth movement
      duration = baseDuration * (distance / this.tileSize);
    }
    
    // Create the animation tween
    this.tweens.add({
      targets: unitSprite,
      x: endWorldX,
      y: endWorldY + verticalOffset,
      duration: duration,
      ease: 'Power2.out', // Quick acceleration, gentle stop
      onUpdate: () => {
        // Calculate current grid Y position based on the sprite's current position
        // Convert current world position back to approximate grid position
        const currentWorldY = unitSprite!.y - verticalOffset;
        const currentWorldX = unitSprite!.x;
        
        // Reverse the isometric projection to get approximate grid coordinates
        // These are not exact, but they're close enough for depth calculation
        const relY = (currentWorldY - this.anchorY) / this.tileHeight;
        const relX = (currentWorldX - this.anchorX) / this.tileSize;
        
        // Calculate approximate grid Y
        const currentGridY = (relY * 2 - relX) / 2;
        
        // Calculate approximate grid X (using inverse of isometric projection)
        const currentGridX = relY - currentGridY;
        
        // Update depth during movement using our depth calculation
        unitSprite!.setDepth(this.calculateUnitDepth(currentGridX, currentGridY, true));
      },
      onComplete: () => {
        // Update state after animation completes (if requested)
        if (updateState) {
          // Check if this is a displacement animation based on method call
          if (options.isDisplacement) {
            // Use the displacement-specific action
            actions.moveDisplacedUnit(unitId, toX, toY);
          } else {
            // Use regular movement action
            actions.moveUnit(unitId, toX, toY);
          }
        }
        
        // Update the sprite's stored grid coordinates
        unitSprite!.setData('gridX', toX);
        unitSprite!.setData('gridY', toY);
        
        // Set final depth at destination
        unitSprite!.setDepth(this.calculateUnitDepth(toX, toY, true));
        
        // Apply light gray tint to indicate the unit has moved (if requested)
        if (applyTint) {
          unitSprite!.setTint(0xCCCCCC);
        }
        
        // Disable interactivity so clicks pass through to the underlying tile (if requested)
        if (disableInteractive) {
          unitSprite!.disableInteractive();
        }
        
        // Mark animation as complete
        this.animationInProgress = false;
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
}