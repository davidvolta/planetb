import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState } from "../store/gameStore";
import * as actions from "../store/actions";
import { ValidMove } from "../store/gameStore";

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
  ANIMAL_CLICKED: 'animalClicked',
  TILE_CLICKED: 'tileClicked',
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
  private tiles: Phaser.GameObjects.GameObject[] = [];
  private tileSize = 64; // Fixed tile size
  private tileHeight = 32; // Half of tile size for isometric view
  
  // Store fixed anchor positions for the grid
  private anchorX = 0; 
  private anchorY = 0;
  
  // Add layer properties with appropriate typing
  private backgroundLayer: Phaser.GameObjects.Layer | null = null;
  private terrainLayer: Phaser.GameObjects.Layer | null = null;
  private selectionLayer: Phaser.GameObjects.Layer | null = null;
  private moveRangeLayer: Phaser.GameObjects.Layer | null = null; // New layer for movement range
  private staticObjectsLayer: Phaser.GameObjects.Layer | null = null;
  private unitsLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer: Phaser.GameObjects.Layer | null = null;
  
  private controlsSetup = false;
  private layersSetup = false;
  private subscriptionsSetup = false; // Track if subscriptions have been set up
  
  // Selection indicator for hover/selection
  private selectionIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Properties to track mouse position over the grid
  private hoveredGridPosition: { x: number, y: number } | null = null;
  
  // Array to store move range highlight graphics
  private moveRangeHighlights: Phaser.GameObjects.Graphics[] = [];
  
  // Track animations in progress
  private animationInProgress: boolean = false;

  constructor() {
    super({ key: "BoardScene" });
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
    this.setupLayers();
    
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
        if (habitats && this.staticObjectsLayer) {
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
    const needsSetup = !this.terrainLayer || !this.selectionLayer || 
                      !this.moveRangeLayer || !this.staticObjectsLayer || 
                      !this.unitsLayer;
    
    // Log what we're doing
    console.log("Updating board using layer-based rendering");
    
    // Create new tiles using the layer-based approach
    this.createTiles();
    
    // Debug log the layer information (handled by createTiles now)
    
    console.log("Board updated with layer-based structure");
  }
  
  // Debug method to log information about our layers
  private logLayerInfo() {
    console.log("=== LAYER INFORMATION ===");
    
    // Function to safely log layer info
    const logLayer = (name: string, layer: Phaser.GameObjects.Layer | null) => {
      if (layer) {
        console.log(`${name}: Depth=${layer.depth}, Children=${layer.getChildren().length}`);
      } else {
        console.log(`${name}: Not initialized`);
      }
    };
    
    // Log each layer's information
    logLayer("Background Layer", this.backgroundLayer);
    logLayer("Terrain Layer", this.terrainLayer);
    logLayer("Selection Layer", this.selectionLayer);
    logLayer("Move Range Layer", this.moveRangeLayer);
    logLayer("Static Objects Layer", this.staticObjectsLayer);
    logLayer("Units Layer", this.unitsLayer);
    logLayer("UI Layer", this.uiLayer);
    
    // Log tile count
    console.log(`Total tiles: ${this.tiles.length}`);
    
    console.log("=========================");
  }
  
  create() {
    console.log("BoardScene create() called", this.scene.key);
    
    // Set up camera controls
    this.setupControls();
    
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
      
      if (animals && this.unitsLayer) {
        this.renderAnimalSprites(animals);
      }
      
      if (habitats && this.staticObjectsLayer) {
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
    if (!this.unitsLayer) {
      console.warn("Cannot render animal sprites - unitsLayer not available");
      return;
    }
    
    // If an animation is in progress, defer updating sprites
    if (this.animationInProgress) {
      return;
    }
    
    // Get a map of current animal sprites by ID
    const existingSprites = new Map();
    this.unitsLayer.getAll().forEach(child => {
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
        this.unitsLayer!.add(animalSprite);
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
    
    // Clear references to all layers
    this.backgroundLayer = null;
    this.terrainLayer = null;
    this.selectionLayer = null;
    this.moveRangeLayer = null;
    this.staticObjectsLayer = null;
    this.unitsLayer = null;
    this.uiLayer = null;
    
    // Reset flags
    this.layersSetup = false;
    this.controlsSetup = false;
    
    // Clear tiles array
    this.tiles = [];
    
    // Clear move highlights array
    this.moveRangeHighlights = [];
  }
  
  // Create tiles based on the current board state
  private createTiles() {
    // Clear previous tiles
    this.tiles = [];
    
    // Clear existing graphics from all layers
    if (this.terrainLayer) {
      this.terrainLayer.removeAll(true); // true to destroy the objects
    }
    if (this.staticObjectsLayer) {
      this.staticObjectsLayer.removeAll(true);
    }
    if (this.unitsLayer) {
      this.unitsLayer.removeAll(true);
    }
    
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
    
    // Create tiles for each board position
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        // Coordinate calculations for isometric placement
        const isoX = (x - y) * this.tileSize / 2;
        const isoY = (x + y) * this.tileHeight / 2;
        
        // Get terrain type and create appropriate shape
        const terrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
        const tile = this.createTerrainTile(terrain, anchorX + isoX, anchorY + isoY);
        
        // Add tile to the terrain layer
        if (this.terrainLayer) {
          this.terrainLayer.add(tile);
        } else {
          console.warn("terrainLayer not available, cannot add tile");
        }
        
        this.tiles.push(tile);
        
        // Add a click handler to the tile
        tile.setInteractive(new Phaser.Geom.Polygon([
          { x: 0, y: -this.tileHeight / 2 },
          { x: this.tileSize / 2, y: 0 },
          { x: 0, y: this.tileHeight / 2 },
          { x: -this.tileSize / 2, y: 0 }
        ]), Phaser.Geom.Polygon.Contains);
        
        // Store grid coordinates on the tile for reference
        tile.setData('gridX', x);
        tile.setData('gridY', y);
      }
    }
    
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

  // Set up click event delegation 
  private setupClickEventDelegation() {
    
    // Remove any existing listeners to prevent duplicates
    this.input.off('gameobjectdown');
    
    // Add a single click event listener for the entire scene
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      // Don't process clicks during animations
      if (this.animationInProgress) {
        return;
      }
      
      // If clicked on a unit
      if (gameObject instanceof Phaser.GameObjects.Sprite && gameObject.getData('animalId')) {
        const animalId = gameObject.getData('animalId');
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        
        console.log(`Unit clicked: ${animalId} at ${gridX},${gridY}`);
        
        // Get the animal state and handle accordingly
        const animal = actions.getAnimals().find(a => a.id === animalId);
        if (animal) {
          if (animal.state === AnimalState.DORMANT) {
            // Select the dormant unit instead of evolving it immediately and show selection indicator
            this.handleUnitSelection(animal.id, { x: gridX, y: gridY });
          } else {
            // Handle active unit click - select for movement
            // Note: Units that have already moved won't be interactive, so this code only runs for movable units
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
          }
        }
      }
      // If clicked on a tile
      else if (this.tiles.includes(gameObject)) {
        const x = gameObject.getData('gridX');
        const y = gameObject.getData('gridY');
        
        // Check what's at this position
        const tileContents = this.checkTileContents(x, y);
        
        // PHASE 2: Updated tile click handling using tileContents
        // Now we handle all entity detection through the checkTileContents helper
        // and use that information for both selection and event data

        // Check if we have a selected unit and are in move mode
        const selectedUnitId = actions.getSelectedUnitId();
        if (selectedUnitId && actions.isMoveMode()) {
          // Check if this is a valid move destination
          const validMoves = actions.getValidMoves();
          const isValidMove = validMoves.some(move => move.x === x && move.y === y);
          
          if (isValidMove) {
            // Get current position of selected unit
            const selectedUnit = actions.getAnimals().find(a => a.id === selectedUnitId);
            if (selectedUnit) {
              // Start movement animation
              this.startUnitMovement(
                selectedUnitId, 
                selectedUnit.position.x, 
                selectedUnit.position.y, 
                x, 
                y
              );
            }
          } else {
            // Not a valid move, deselect the unit
            this.handleUnitSelection(null);
          }
        } else {
          // Not in move mode, just a regular tile click
          
          // Get tile contents using our helper method
          const tileContents = this.checkTileContents(x, y);
          
          // If there's a dormant unit, select it
          if (tileContents.dormantUnits.length > 0) {
            this.handleUnitSelection(tileContents.dormantUnits[0].id, { x, y });
          } 
          // Otherwise, only show selection if there's no active unmoved unit on this tile
          else {
            const hasActiveUnmovedUnit = tileContents.activeUnits.some(unit => !unit.hasMoved);
            if (!hasActiveUnmovedUnit) {
              this.showSelectionIndicatorAt(x, y);
            } else {
              this.hideSelectionIndicator();
            }
          }
          
          // Emit an enhanced event when a tile is clicked
          const eventData = { 
            x, 
            y, 
            pointer,
            contents: tileContents // Include complete tile contents information
          };
          this.events.emit(EVENTS.TILE_CLICKED, eventData);
        }
      } else {
        // If clicked somewhere else, deselect the unit
        this.handleUnitSelection(null);
      }
    });
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

  // Create a terrain tile based on terrain type
  private createTerrainTile(terrain: TerrainType, x: number, y: number): Phaser.GameObjects.Graphics {
    // Create graphics object directly without a container
    const shape = this.add.graphics();
    
    // Set position directly on the graphics object
    shape.setPosition(x, y);
    
    // Diamond shape for the tile base
    const diamondPoints = [
      { x: 0, y: -this.tileHeight / 2 },
      { x: this.tileSize / 2, y: 0 },
      { x: 0, y: this.tileHeight / 2 },
      { x: -this.tileSize / 2, y: 0 }
    ];
    
    // Fill color based on terrain type
    switch(terrain) {
      case TerrainType.GRASS:
        shape.fillStyle(0x7CFC00, 1); // Light green
        break;
      case TerrainType.WATER:
        shape.fillStyle(0x1E90FF, 1); // Blue
        break;
      case TerrainType.BEACH:
        shape.fillStyle(0xF5DEB3, 1); // Sand color
        break;
      case TerrainType.MOUNTAIN:
        shape.fillStyle(0x4A5459, 1); // Cool slate gray for base
        break;
      case TerrainType.UNDERWATER:
        shape.fillStyle(0x00008B, 1); // Dark blue
        break;
      default:
        shape.fillStyle(0x7CFC00, 1); // Default green
    }
    
    // Draw the diamond shape
    shape.beginPath();
    shape.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      shape.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    shape.closePath();
    shape.fillPath();
    
    // Add a 75% transparent black stroke
    shape.lineStyle(1, 0x808080, 0.25);
    shape.beginPath();
    shape.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      shape.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    shape.closePath();
    shape.strokePath();
    
    return shape;
  }
  

  // Create a selection indicator to show the currently selected tile
  private createSelectionIndicator() {
    // Destroy existing selection indicator if it exists
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
    
    // Check if selectionLayer exists
    if (!this.selectionLayer) {
      console.warn("selectionLayer not available, cannot create selection indicator");
      return null;
    }
    
    // Create a new graphics object for the selection indicator
    this.selectionIndicator = this.add.graphics();
    
    // Diamond shape for the selection indicator
    const diamondPoints = [
      { x: 0, y: -this.tileHeight / 2 },
      { x: this.tileSize / 2, y: 0 },
      { x: 0, y: this.tileHeight / 2 },
      { x: -this.tileSize / 2, y: 0 }
    ];
    
    // Draw the selection indicator
    this.selectionIndicator.lineStyle(3, 0xD3D3D3, 0.5); // 3px light grey line with 50% transparency
    this.selectionIndicator.beginPath();
    this.selectionIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.selectionIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.selectionIndicator.closePath();
    this.selectionIndicator.strokePath();
    
    // Hide the selection indicator initially - directly set visibility
    if (this.selectionIndicator) {
      this.selectionIndicator.setVisible(false);
    }
    
    // Add selection indicator to selection layer
    this.selectionLayer.add(this.selectionIndicator);
    
    return this.selectionIndicator;
  }

  // Method to get the currently hovered grid position
  getHoveredGridPosition(): { x: number, y: number } | null {
    return this.hoveredGridPosition;
  }
  
  // Method to get the terrain type at a grid position
  getTerrainAtPosition(x: number, y: number): TerrainType | null {
    const board = actions.getBoard();
    if (!board || !board.tiles[y] || !board.tiles[y][x]) return null;
    
    return board.tiles[y][x].terrain;
  }
  
  // Update method to track the mouse position
  update() {
    // Update the hovered grid position based on pointer position
    const pointer = this.input.activePointer;
    this.hoveredGridPosition = this.getGridPositionAt(pointer.x, pointer.y);
    
    // We no longer update the selection indicator in the update method
    // because we only want it to update when a tile is clicked
  }

  // Method to convert screen coordinates to grid coordinates
  getGridPositionAt(screenX: number, screenY: number): { x: number, y: number } | null {
    // Get current board state
    const board = actions.getBoard();
    if (!board) return null;
    
    // Get world point from screen coordinates
    const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
    
    // Adjust for fixed anchor position
    const localX = worldPoint.x - this.anchorX;
    const localY = worldPoint.y - this.anchorY;
    
    // Add small offset to compensate for visual vs. logical grid mismatch
    const offsetX = 0;
    const offsetY = -this.tileHeight / 2;
    
    // Convert to isometric grid coordinates with adjustment
    let gridX = Math.floor(((localY + offsetY) / (this.tileHeight / 2) + (localX + offsetX) / (this.tileSize / 2)) / 2);
    let gridY = Math.floor(((localY + offsetY) / (this.tileHeight / 2) - (localX + offsetX) / (this.tileSize / 2)) / 2);
    
    // Add +1 to both coordinates to fix the off-by-one error
    gridX += 1;
    gridY += 1;
    
    // Check if grid position is valid
    if (gridX >= 0 && gridX < board.width && gridY >= 0 && gridY < board.height) {
      return { x: gridX, y: gridY };
    }
    
    return null;
  }
  
  // Method to convert grid coordinates to screen coordinates
  gridToScreen(gridX: number, gridY: number): { x: number, y: number } {
    // Convert grid coordinates to isometric coordinates
    const isoX = (gridX - gridY) * this.tileSize / 2;
    const isoY = (gridX + gridY) * this.tileHeight / 2;
    
    // Return screen coordinates using anchor position
    return { 
      x: this.anchorX + isoX, 
      y: this.anchorY + isoY 
    };
  }

  // Create a habitat graphic based on its state (potential or shelter)
  private createHabitatGraphic(x: number, y: number, state: 'potential' | 'shelter' = 'potential'): Phaser.GameObjects.Container {
    // Create a container for the habitat
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    
    // Calculate scale factor (approximately 5px smaller on each side)
    const scaleFactor = 0.85; // This will make the diamond about 5px smaller on a 64px tile
    
    // Create scaled diamond points
    const diamondPoints = [
      { x: 0, y: -this.tileHeight / 2 * scaleFactor },
      { x: this.tileSize / 2 * scaleFactor, y: 0 },
      { x: 0, y: this.tileHeight / 2 * scaleFactor },
      { x: -this.tileSize / 2 * scaleFactor, y: 0 }
    ];
    
    // Use the same graphics for both potential and shelter habitats
    // Black fill with 50% opacity
    graphics.fillStyle(0x000000, 0.5);
    
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
    if (!this.staticObjectsLayer) {
      console.warn("Cannot render habitat graphics - staticObjectsLayer not available");
      return;
    }
    
    // Get a map of current habitat graphics by ID
    const existingHabitats = new Map();
    this.staticObjectsLayer.getAll().forEach(child => {
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
      // Calculate position
      const gridX = habitat.position.x;
      const gridY = habitat.position.y;
      const isoX = (gridX - gridY) * this.tileSize / 2;
      const isoY = (gridX + gridY) * this.tileHeight / 2;
      
      // Position using anchor points
      const worldX = this.anchorX + isoX;
      const worldY = this.anchorY + isoY;
      
      // Check if we have an existing graphic
      const existing = existingHabitats.get(habitat.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position
        existing.graphic.setPosition(worldX, worldY);
        
        // Update state if needed
        if (existing.graphic.getData('habitatState') !== habitat.state) {
          existing.graphic.setData('habitatState', habitat.state);
        }
      } else {
        // Create a new habitat graphic
        const habitatState = habitat.state || 'potential';
        const habitatGraphic = this.createHabitatGraphic(worldX, worldY, habitatState);
        
        // Store the habitat ID for reference
        habitatGraphic.setData('habitatId', habitat.id);
        
        // Store grid coordinates for reference in click handling
        habitatGraphic.setData('gridX', gridX);
        habitatGraphic.setData('gridY', gridY);
        
        // Remove direct click handler - now handled by global click delegation
        
        // Add the new graphic to the layer
        this.staticObjectsLayer!.add(habitatGraphic);
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
    if (this.layersSetup) {
      console.log("Layers already initialized, skipping setupLayers()");
      return;
    }
    
    console.log("BoardScene setupLayers() called");
    
    // Initialize each layer with its appropriate depth
    this.backgroundLayer = this.add.layer().setDepth(0);
    this.terrainLayer = this.add.layer().setDepth(1);
    this.selectionLayer = this.add.layer().setDepth(2);
    this.moveRangeLayer = this.add.layer().setDepth(3); // New layer for movement range
    this.staticObjectsLayer = this.add.layer().setDepth(4); // Updated depth
    this.unitsLayer = this.add.layer().setDepth(5); // Updated depth
    this.uiLayer = this.add.layer().setDepth(10);
    
    // Mark layers as initialized
    this.layersSetup = true;
    
    console.log("Layers initialized with proper depth order");
  }

  // Create circular highlight for a move tile
  private createMoveHighlight(x: number, y: number): Phaser.GameObjects.Graphics {
    // Calculate isometric position
    const isoX = (x - y) * this.tileSize / 2;
    const isoY = (x + y) * this.tileHeight / 2;
    
    // Calculate world position
    const worldX = this.anchorX + isoX;
    const worldY = this.anchorY + isoY;
    
    // Create a graphics object for the move highlight
    const highlight = this.add.graphics();
    
    // Set the position
    highlight.setPosition(worldX, worldY);
    
    // Apply scaling factor
    const scaleFactor = 0.85;
    
    // Create scaled diamond points
    const diamondPoints = [
      { x: 0, y: -this.tileHeight / 2 * scaleFactor },
      { x: this.tileSize / 2 * scaleFactor, y: 0 },
      { x: 0, y: this.tileHeight / 2 * scaleFactor },
      { x: -this.tileSize / 2 * scaleFactor, y: 0 }
    ];
    
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
    
    // If not in move mode or no valid moves, we're done
    if (!moveMode || !validMoves.length || !this.moveRangeLayer) {
      return;
    }
    
    console.log(`Rendering ${validMoves.length} valid move highlights`);
    
    // Create highlight for each valid move
    validMoves.forEach(move => {
      const highlight = this.createMoveHighlight(move.x, move.y);
      this.moveRangeHighlights.push(highlight);
      
      // Add the highlight to the move range layer
      this.moveRangeLayer!.add(highlight);
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
    
    // Also clear the layer if it exists
    if (this.moveRangeLayer) {
      this.moveRangeLayer.removeAll(true);
    }
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
    if (this.unitsLayer) {
      this.unitsLayer.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === unitId) {
          unitSprite = child;
        }
      });
    }
    
    if (!unitSprite) {
      console.error(`Could not find sprite for unit ${unitId}`);
      return;
    }
    
    // Convert grid coordinates to world coordinates
    const startIsoX = (fromX - fromY) * this.tileSize / 2;
    const startIsoY = (fromX + fromY) * this.tileHeight / 2;
    const endIsoX = (toX - toY) * this.tileSize / 2;
    const endIsoY = (toX + toY) * this.tileHeight / 2;
    
    const startWorldX = this.anchorX + startIsoX;
    const startWorldY = this.anchorY + startIsoY;
    const endWorldX = this.anchorX + endIsoX;
    const endWorldY = this.anchorY + endIsoY;
    
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
  // This will replace scattered calls to selectionIndicator.setVisible throughout the code
  private updateSelectionIndicator(shouldShow: boolean, x?: number, y?: number) {
    if (!this.selectionIndicator) {
      // Create the indicator if it doesn't exist
      this.createSelectionIndicator();
      
      // If still null after attempting to create, exit
      if (!this.selectionIndicator) {
        console.warn("Could not create selection indicator");
        return;
      }
    }
    
    if (shouldShow && x !== undefined && y !== undefined) {
      // Calculate isometric position for the indicator
      const isoX = (x - y) * this.tileSize / 2;
      const isoY = (x + y) * this.tileHeight / 2;
      
      // Position the indicator
      this.selectionIndicator.setPosition(this.anchorX + isoX, this.anchorY + isoY);
      
      // Make the indicator visible
      this.selectionIndicator.setVisible(true);
      
      // Ensure it's at the top of its layer
      if (this.selectionLayer) {
        // Re-add to make sure it's at the top of its layer
        this.selectionLayer.remove(this.selectionIndicator);
        this.selectionLayer.add(this.selectionIndicator);
      } else {
        console.warn("Cannot add selection indicator to layer - selectionLayer is null");
      }
    } else {
      // Just hide the indicator - directly set visibility to avoid circular reference
      if (this.selectionIndicator) {
        this.selectionIndicator.setVisible(false);
      }
    }
  }

  // Helper method to hide the selection indicator
  private hideSelectionIndicator() {
    this.updateSelectionIndicator(false);
  }

  // Helper method to show the selection indicator at a specific grid position
  private showSelectionIndicatorAt(x: number, y: number) {
    this.updateSelectionIndicator(true, x, y);
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
}