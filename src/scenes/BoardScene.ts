import Phaser from "phaser";
import { TerrainType } from "../store/gameStore";
import { StateObserver } from "../utils/stateObserver";
import { AnimalState } from "../store/gameStore";
import * as actions from "../store/actions";

// Define the Animal interface to avoid 'any' type
interface Animal {
  id: string;
  type: string;
  state: AnimalState;
  position: {
    x: number;
    y: number;
  };
}

// Custom event names
export const EVENTS = {
  ANIMAL_CLICKED: 'animalClicked',
  TILE_CLICKED: 'tileClicked',
  HABITAT_CLICKED: 'habitatClicked',
  ASSETS_LOADED: 'assetsLoaded'
};

// Define subscription keys to ensure consistency
const SUBSCRIPTIONS = {
  BOARD: 'BoardScene.board',
  ANIMALS: 'BoardScene.animals',
  HABITATS: 'BoardScene.habitats',
};

export default class BoardScene extends Phaser.Scene {
  private tiles: Phaser.GameObjects.GameObject[] = [];
  private tileSize = 64; // Fixed tile size
  private tileHeight = 32; // Half of tile size for isometric view
  private verticalOffset = 0;
  
  // Store fixed anchor positions for the grid
  private anchorX = 0; 
  private anchorY = 0;
  
  // Add layer properties with appropriate typing
  private backgroundLayer: Phaser.GameObjects.Layer | null = null;
  private terrainLayer: Phaser.GameObjects.Layer | null = null;
  private selectionLayer: Phaser.GameObjects.Layer | null = null;
  private staticObjectsLayer: Phaser.GameObjects.Layer | null = null;
  private unitsLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer: Phaser.GameObjects.Layer | null = null;
  
  private controlsSetup = false;
  
  // Selection indicator for hover/selection
  private selectionIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Properties to track mouse position over the grid
  private hoveredGridPosition: { x: number, y: number } | null = null;
  
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

    this.load.on('complete', () => {
      this.events.emit(EVENTS.ASSETS_LOADED);
    });
  }
  

  init() {
    console.log("BoardScene init() called");
    
    // Clear previous tiles when scene restarts
    this.tiles = [];
    
    // Ensure all old subscriptions are cleaned up before creating new ones
    this.unsubscribeAll();
    
    // Set up layers immediately to ensure they exist before any state updates
    this.setupLayers();
    
    // We'll setup subscriptions in create() after layers are initialized
  }
  
  // Set up all state subscriptions in one centralized method
  private setupSubscriptions() {
    // Subscribe to board state changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board) => {
        if (board) {
          console.log("Board state changed, updating scene with layer-based rendering...");
          this.updateBoard();
        }
      },
      { debug: false } // Optional configuration
    );
    
    // Subscribe to animals state changes with more efficient change detection
    StateObserver.subscribe(
      SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals, prevAnimals) => {
        // Only render if unitsLayer exists
        if (this.unitsLayer) {
          console.log("Animals state changed, updating sprites...");
          this.renderAnimalSprites(animals);
        } else {
          console.log("Animals state changed, but unitsLayer not ready yet");
        }
      }
    );
    
    // Subscribe to habitats state changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.HABITATS,
      (state) => state.habitats,
      (habitats) => {
        // Only render if staticObjectsLayer exists
        if (this.staticObjectsLayer) {
          console.log("Habitats state changed, updating graphics...");
          this.renderHabitatGraphics(habitats);
        } else {
          console.log("Habitats state changed, but staticObjectsLayer not ready yet");
        }
      }
    );
  }
  
  // Clean up subscriptions to avoid memory leaks
  private unsubscribeAll() {
    // Unsubscribe from all known subscriptions
    Object.values(SUBSCRIPTIONS).forEach(key => {
      StateObserver.unsubscribe(key);
    });
  }

  // Method is kept for compatibility but will log that tile size is now fixed
  setTileSize(size: number) {
    console.log("Note: Tile size is now fixed at 64px.");
    // No longer changing the tile size
  }

  // Method to update the board without restarting the scene
  updateBoard() {
    // Check if we need to setup the layers
    const needsSetup = !this.terrainLayer || !this.selectionLayer || 
                       !this.staticObjectsLayer || !this.unitsLayer;
    
    // Log what we're doing
    console.log("Updating board using layer-based rendering");
    
    // Create new tiles using the layer-based approach
    this.createTiles();
    
    // We don't need to log layer info here since createTiles already does it
    
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
    logLayer("Static Objects Layer", this.staticObjectsLayer);
    logLayer("Units Layer", this.unitsLayer);
    logLayer("UI Layer", this.uiLayer);
    
    // Log tile count
    console.log(`Total tiles: ${this.tiles.length}`);
    
    console.log("=========================");
  }
  
  create() {
    console.log("BoardScene create() called");
    
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
    }
  }

  // Handle animal click events - emit event instead of directly modifying state
  onAnimalClicked(animalId: string) {
    // Emit an event for the React component to handle
    this.events.emit(EVENTS.ANIMAL_CLICKED, animalId);
  }

  // Updated method using the consolidated approach
  renderAnimalSprites(animals: Animal[]) {
    // Check if unitsLayer exists before proceeding
    if (!this.unitsLayer) {
      console.warn("Cannot render animal sprites - unitsLayer not available");
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
      
      // Check if we have an existing sprite
      const existing = existingSprites.get(animal.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position with vertical offset
        existing.sprite.setPosition(worldX, worldY + verticalOffset);
        
        // Update texture if animal state changed
        if (existing.sprite.texture.key !== textureKey) {
          console.log(`Updating sprite texture for animal ${animal.id} from ${existing.sprite.texture.key} to ${textureKey}`);
          existing.sprite.setTexture(textureKey);
        }
      } else {
        // Create a new sprite for this animal with the correct texture
        const animalSprite = this.add.sprite(worldX, worldY + verticalOffset, textureKey);
        
        // Set appropriate scale
        animalSprite.setScale(1);
        
        // Store the animal ID and type on the sprite
        animalSprite.setData('animalId', animal.id);
        animalSprite.setData('animalType', animal.type);
        animalSprite.setData('gridX', gridX);
        animalSprite.setData('gridY', gridY);
        
        // Make the sprite interactive
        animalSprite.setInteractive();
        
        // Add a click handler that handles state evolution
        animalSprite.on('pointerdown', () => {
          console.log(`Animal clicked: ${animal.id} at ${gridX},${gridY}`);
          
          // Check if the animal is a dormant egg and can be hatched
          if (animal.state === AnimalState.DORMANT) {
            // Emit the animal clicked event for the React UI to handle evolution
            this.events.emit(EVENTS.ANIMAL_CLICKED, animal.id);
          } else {
            // Regular animal click handling
            this.events.emit(EVENTS.ANIMAL_CLICKED, animal);
          }
        });
        
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
    this.staticObjectsLayer = null;
    this.unitsLayer = null;
    this.uiLayer = null;
    
    // Clear tiles array
    this.tiles = [];
    
    // Clear selection indicator
    this.selectionIndicator = null;
    
    console.log("BoardScene shutdown complete - all references cleared");
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
    
    // Set up all layers (new approach)
    this.setupLayers();
    
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
        
        // Store coordinates for later reference
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
  
  // Set up click event delegation at the container level
  private setupClickEventDelegation() {
    // We don't need the tilesContainer for click event delegation anymore
    
    // Remove any existing listeners to prevent duplicates
    this.input.off('gameobjectdown');
    
    // Add a single click event listener for the entire scene
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      // Only process if the clicked object is one of our tiles
      if (this.tiles.includes(gameObject)) {
        const x = gameObject.getData('gridX');
        const y = gameObject.getData('gridY');
        
        // Update selection indicator position if it exists
        if (this.selectionIndicator && this.selectionLayer) {
          // Calculate isometric position for the indicator
          const isoX = (x - y) * this.tileSize / 2;
          const isoY = (x + y) * this.tileHeight / 2;
          
          // Position the indicator
          this.selectionIndicator.setPosition(this.anchorX + isoX, this.anchorY + isoY);
          
          // Make the indicator visible
          this.selectionIndicator.setVisible(true);
        }
        
        // Emit an event when a tile is clicked
        const eventData = { x, y, pointer };
        this.events.emit(EVENTS.TILE_CLICKED, eventData);
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
    
    // Draw the selection indicator (a yellow diamond)
    this.selectionIndicator.lineStyle(3, 0xFFFF00, 1); // Thick yellow line
    this.selectionIndicator.beginPath();
    this.selectionIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.selectionIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.selectionIndicator.closePath();
    this.selectionIndicator.strokePath();
    
    // Hide the selection indicator initially
    this.selectionIndicator.setVisible(false);
    
    // Add selection indicator to selection layer
    this.selectionLayer.add(this.selectionIndicator);
    
    // Add a pulsing animation to make it more visible
    this.tweens.add({
      targets: this.selectionIndicator,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    
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
    
    // Update selection indicator position
    if (this.selectionIndicator && this.selectionLayer) {
      if (this.hoveredGridPosition) {
        // Calculate isometric position for the indicator
        const gridX = this.hoveredGridPosition.x;
        const gridY = this.hoveredGridPosition.y;
        
        // Convert grid coordinates to isometric coordinates
        const isoX = (gridX - gridY) * this.tileSize / 2;
        const isoY = (gridX + gridY) * this.tileHeight / 2;
        
        // Position the indicator using anchor position
        this.selectionIndicator.setPosition(this.anchorX + isoX, this.anchorY + isoY);
        
        // Make the indicator visible
        this.selectionIndicator.setVisible(true);
      } else {
        // Hide the indicator when not hovering over a valid tile
        this.selectionIndicator.setVisible(false);
      }
    }
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
    
    // Make it interactive
    container.setInteractive(new Phaser.Geom.Polygon([
      { x: 0, y: -this.tileHeight / 2 },
      { x: this.tileSize / 2, y: 0 },
      { x: 0, y: this.tileHeight / 2 },
      { x: -this.tileSize / 2, y: 0 }
    ]), Phaser.Geom.Polygon.Contains);
    
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
        
        // Add click handler
        habitatGraphic.on('pointerdown', () => {
          console.log(`Habitat clicked: ${habitat.id} at ${gridX},${gridY}`);
          this.events.emit(EVENTS.HABITAT_CLICKED, habitat);
        });
        
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
  
  // Helper method to remove all existing habitat graphics - no longer needed with our new approach
  // but keeping it for potential future use
  private removeAllHabitatGraphics() {
    if (!this.staticObjectsLayer) return;
    
    // Find habitat graphics by checking children with getData method
    const habitatGraphics: Phaser.GameObjects.GameObject[] = [];
    
    this.staticObjectsLayer.getAll().forEach(child => {
      // Check if child is a GameObject with habitatId data
      if (child && 'getData' in child && typeof child.getData === 'function') {
        const gameObj = child as Phaser.GameObjects.GameObject;
        if (gameObj.getData('habitatId')) {
          habitatGraphics.push(gameObj);
        }
      }
    });
    
    // Remove all found habitat graphics
    habitatGraphics.forEach(graphic => {
      graphic.destroy();
    });
    
    console.log(`Removed ${habitatGraphics.length} habitat graphics from staticObjectsLayer`);
  }

  // Set up all layers with appropriate depths
  private setupLayers() {
    console.log("BoardScene setupLayers() called");
    
    // Initialize each layer with its appropriate depth
    this.backgroundLayer = this.add.layer().setDepth(0);
    this.terrainLayer = this.add.layer().setDepth(1);
    this.selectionLayer = this.add.layer().setDepth(2);
    this.staticObjectsLayer = this.add.layer().setDepth(3);
    this.unitsLayer = this.add.layer().setDepth(4);
    this.uiLayer = this.add.layer().setDepth(10);
    
    console.log("Layers initialized with proper depth order");
  }
}