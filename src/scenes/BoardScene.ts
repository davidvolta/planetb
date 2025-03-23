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
  private tiles: Phaser.GameObjects.Container[] = [];
  private tileSize = 64; // Fixed tile size
  private tileHeight = 32; // Half of tile size for isometric view
  private verticalOffset = 0;
  private tilesContainer: Phaser.GameObjects.Container | null = null;
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
    // Clear previous tiles when scene restarts
    this.tiles = [];
    
    // Ensure all old subscriptions are cleaned up before creating new ones
    this.unsubscribeAll();
    
    // Set up all subscriptions in one place
    this.setupSubscriptions();
  }
  
  // Set up all state subscriptions in one centralized method
  private setupSubscriptions() {
    // Subscribe to board state changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board) => {
        if (board) {
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
        if (this.tilesContainer) {
          // We now receive previous state as well
          this.renderAnimalSprites(animals);
        }
      }
    );
    
    // Subscribe to habitats state changes
    StateObserver.subscribe(
      SUBSCRIPTIONS.HABITATS,
      (state) => state.habitats,
      (habitats) => {
        if (this.tilesContainer) {
          this.renderHabitatGraphics(habitats);
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
    // Store a reference to the old tiles container
    const oldContainer = this.tilesContainer;
    
    // Create new tiles immediately
    this.createTiles();
    
    // If there was an old container, destroy it immediately
    if (oldContainer) {
      oldContainer.destroy();
    }
  }
  
  create() {
    // Setup camera and controls
    this.setupControls();
    
    // Check if board data exists and create board if needed
    const board = actions.getBoard();
    if (board && !this.tilesContainer) {
      this.updateBoard();
    }
  }

  // Handle animal click events - emit event instead of directly modifying state
  onAnimalClicked(animalId: string) {
    // Emit an event for the React component to handle
    this.events.emit(EVENTS.ANIMAL_CLICKED, animalId);
  }

  // Updated method using the consolidated approach
  renderAnimalSprites(animals: Animal[]) {
    // Check if tilesContainer exists before proceeding
    if (!this.tilesContainer) {
      console.warn("Cannot render animal sprites - tilesContainer not available");
      return;
    }

    // Get a map of current animal sprites by ID
    const existingSprites = new Map();
    this.tilesContainer.list.forEach(child => {
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
      // Check if we have an existing sprite
      const existing = existingSprites.get(animal.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Calculate isometric position
        const isoX = (animal.position.x - animal.position.y) * this.tileSize / 2;
        const isoY = (animal.position.x + animal.position.y) * this.tileHeight / 2;
        
        // Determine the texture based on state
        const textureKey = animal.state === AnimalState.DORMANT ? 'egg' : animal.type;
        
        // Only update if position or texture changed
        let updated = false;
        
        if (existing.sprite.x !== isoX || existing.sprite.y !== isoY - 12) {
          existing.sprite.setPosition(isoX, isoY - 12);
          updated = true;
          console.log(`Updated position for animal ${animal.id}`);
        }
        
        if (existing.sprite.texture.key !== textureKey) {
          console.log(`Updating sprite texture for animal ${animal.id} from ${existing.sprite.texture.key} to ${textureKey}`);
          existing.sprite.setTexture(textureKey);
          updated = true;
        }
      } else {
        // No existing sprite, create a new one
        this.createAnimalSprite(animal);
      }
    });
    
    // Remove sprites for animals that no longer exist
    existingSprites.forEach((value, key) => {
      if (!value.used) {
        console.log(`Removing sprite for deleted animal ${key}`);
        value.sprite.destroy();
      }
    });
  }
  
  // Separated sprite creation into its own method
  private createAnimalSprite(animal: Animal) {
    // Calculate isometric position
    const isoX = (animal.position.x - animal.position.y) * this.tileSize / 2;
    const isoY = (animal.position.x + animal.position.y) * this.tileHeight / 2;

    // Determine the texture based on state
    const textureKey = animal.state === AnimalState.DORMANT ? 'egg' : animal.type;
    console.log(`Creating new sprite for animal: ${animal.id} (${textureKey})`);
    
    // Create the sprite
    const sprite = this.add.sprite(
      isoX, 
      isoY - 12, // Keep the vertical offset for better appearance
      textureKey
    );
    
    sprite.setOrigin(0.5);
    sprite.setData('animalId', animal.id);
    sprite.setData('animalType', animal.type);
    
    // Make sprite interactive
    sprite.setInteractive();
    
    // Remove any existing listeners before adding a new one
    sprite.removeAllListeners('pointerdown');
    
    // Add the click handler
    sprite.on("pointerdown", () => this.onAnimalClicked(animal.id));
    
    // Add to tiles container
    if (this.tilesContainer) {
      this.tilesContainer.add(sprite);
    } else {
      console.warn("tilesContainer not available, sprite may not be positioned correctly");
    }
  }
  
  // Clean up when scene is shut down
  shutdown() {
    // Ensure we clean up all subscriptions when scene shuts down
    this.unsubscribeAll();
    
    // Clear references
    this.tilesContainer = null;
    this.tiles = [];
    this.selectionIndicator = null;
  }
  
  // Create tiles based on the current board state
  private createTiles() {
    // Clear previous tiles
    this.tiles = [];
    
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

    // Calculate map dimensions
    const mapWidth = board.width * this.tileSize;
    const mapHeight = board.height * this.tileHeight;
    
    // Calculate the true center of an isometric grid
    const centerX = (board.width + board.height) * this.tileSize / 4;
    const centerY = (board.width + board.height) * this.tileHeight / 4;
    
    // Position container with vertical offset to move grid up
    this.verticalOffset = mapHeight * 1.4; // Move it up by 110% of map height
    this.tilesContainer = this.add.container(centerX, centerY - this.verticalOffset);
    
    // Set camera bounds
    this.cameras.main.setBounds(-mapWidth, -mapHeight, mapWidth * 3, mapHeight * 3);
    
    // Center camera on the adjusted position
    this.cameras.main.centerOn(centerX, centerY - this.verticalOffset);
    
    // Create tiles for each board position
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        // Coordinate calculations for isometric placement (centered around 0,0)
        const isoX = (x - y) * this.tileSize / 2;
        const isoY = (x + y) * this.tileHeight / 2;
        
        // Get terrain type and create appropriate shape
        const terrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
        const tile = this.createTerrainTile(terrain, isoX, isoY);
        
        // Add tile to the container
        this.tilesContainer.add(tile);
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
        tile.setData('baseY', isoY);
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
  }
  
  // Set up click event delegation at the container level
  private setupClickEventDelegation() {
    if (!this.tilesContainer) return;
    
    // Remove any existing listeners to prevent duplicates
    this.tilesContainer.off('pointerdown');
    
    // Add a single click event listener at the container level
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      // Only process if the clicked object is one of our tiles
      if (this.tiles.includes(gameObject as Phaser.GameObjects.Container)) {
        const tile = gameObject as Phaser.GameObjects.Container;
        const x = tile.getData('gridX');
        const y = tile.getData('gridY');
        
        // Emit tile clicked event instead of console logging
        this.events.emit(EVENTS.TILE_CLICKED, x, y);
        console.log(`Emitted tile click event for (${x}, ${y})`);
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
  private createTerrainTile(terrain: TerrainType, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const shape = this.add.graphics();
    
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
    
   
    // Add the shape to the container
    container.add(shape);
    
    return container;
  }
  
  // Add specific details to each terrain type
  private addTerrainDetails(shape: Phaser.GameObjects.Graphics, terrain: TerrainType): void {
    const halfTile = this.tileSize / 4;
    
    switch(terrain) {
      case TerrainType.MOUNTAIN:
        // Mountain peak
        shape.fillStyle(0x2C3539, 1); // Charcoal for rock peak
        shape.beginPath();
        shape.moveTo(0, -this.tileHeight / 3);
        shape.lineTo(halfTile, 0);
        shape.lineTo(0, this.tileHeight / 4);
        shape.lineTo(-halfTile, 0);
        shape.closePath();
        shape.fillPath();
        break;
        
      case TerrainType.WATER:
        // Water waves
        shape.lineStyle(1, 0xADD8E6, 0.8);
        shape.beginPath();
        shape.moveTo(-halfTile, -2);
        shape.lineTo(halfTile, -2);
        shape.closePath();
        shape.strokePath();
        
        shape.beginPath();
        shape.moveTo(-halfTile + 5, 2);
        shape.lineTo(halfTile - 5, 2);
        shape.closePath();
        shape.strokePath();
        break;
        
      case TerrainType.BEACH:
        // Beach particles
        for (let i = 0; i < 5; i++) {
          const px = Phaser.Math.Between(-halfTile, halfTile);
          const py = Phaser.Math.Between(-this.tileHeight / 4, this.tileHeight / 4);
          shape.fillStyle(0xFFFACD, 1);
          shape.fillCircle(px, py, 1);
        }
        break;
        
      case TerrainType.GRASS:
        // Grass blades
        shape.lineStyle(1, 0x006400, 0.7);
        for (let i = 0; i < 4; i++) {
          const startX = Phaser.Math.Between(-halfTile + 5, halfTile - 5);
          const startY = Phaser.Math.Between(-this.tileHeight / 4, this.tileHeight / 4);
          
          shape.beginPath();
          shape.moveTo(startX, startY);
          shape.lineTo(startX + 2, startY - 3);
          shape.closePath();
          shape.strokePath();
          
          shape.beginPath();
          shape.moveTo(startX, startY);
          shape.lineTo(startX - 2, startY - 3);
          shape.closePath();
          shape.strokePath();
        }
        break;
        
      case TerrainType.UNDERWATER:
        // Underwater bubbles and darker wave
        shape.lineStyle(1, 0x0000CD, 0.8);
        shape.beginPath();
        shape.moveTo(-halfTile + 10, 0);
        shape.lineTo(halfTile - 10, 0);
        shape.closePath();
        shape.strokePath();
        
        // Bubbles
        for (let i = 0; i < 3; i++) {
          const px = Phaser.Math.Between(-halfTile + 5, halfTile - 5);
          const py = Phaser.Math.Between(-this.tileHeight / 5, this.tileHeight / 8);
          const size = Phaser.Math.Between(1, 2);
          shape.fillStyle(0xADD8E6, 0.6);
          shape.fillCircle(px, py, size);
        }
        break;
    }
  }

  // Create the selection indicator graphic
  private createSelectionIndicator() {
    // Remove previous selection indicator if it exists
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
    }
    
    // Create a new selection indicator
    this.selectionIndicator = this.add.graphics();
    
    // Create a diamond shape with a thick red stroke and no fill
    this.selectionIndicator.lineStyle(3, 0xFF0000, 1); // Thick red line
    
    // Create diamond points based on tile size
    const diamondPoints = [
      { x: 0, y: -this.tileHeight / 2 },
      { x: this.tileSize / 2, y: 0 },
      { x: 0, y: this.tileHeight / 2 },
      { x: -this.tileSize / 2, y: 0 }
    ];
    
    // Draw the diamond shape
    this.selectionIndicator.beginPath();
    this.selectionIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.selectionIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.selectionIndicator.closePath();
    this.selectionIndicator.strokePath();
    
    // Initially hide the selection indicator
    this.selectionIndicator.setVisible(false);
    
    // If we have a tiles container, add the indicator to it
    if (this.tilesContainer) {
      this.tilesContainer.add(this.selectionIndicator);
    }
    
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
    // Update hovered grid position
    const pointer = this.input.activePointer;
    this.hoveredGridPosition = this.getGridPositionAt(pointer.x, pointer.y);
    
    // Update selection indicator position
    if (this.selectionIndicator && this.tilesContainer) {
      if (this.hoveredGridPosition) {
        // Calculate isometric position for the indicator
        const gridX = this.hoveredGridPosition.x;
        const gridY = this.hoveredGridPosition.y;
        
        // Convert grid coordinates to isometric coordinates
        const isoX = (gridX - gridY) * this.tileSize / 2;
        const isoY = (gridX + gridY) * this.tileHeight / 2;
        
        // Position the indicator
        this.selectionIndicator.setPosition(isoX, isoY);
        
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
    if (!this.tilesContainer) return null;
    
    // Get world point from screen coordinates
    const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
    
    // Adjust for tile container position
    const localX = worldPoint.x - this.tilesContainer.x;
    const localY = worldPoint.y - this.tilesContainer.y + this.tileHeight / 2;
    
    // Convert to isometric grid coordinates
    const gridX = Math.floor((localY / (this.tileHeight / 2) + localX / (this.tileSize / 2)) / 2);
    const gridY = Math.floor((localY / (this.tileHeight / 2) - localX / (this.tileSize / 2)) / 2);
    
    // Get current board state
    const board = actions.getBoard();
    if (!board) return null;
    
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
    
    // If we have a tiles container, adjust for its position
    if (this.tilesContainer) {
      return { 
        x: this.tilesContainer.x + isoX, 
        y: this.tilesContainer.y + isoY 
      };
    }
    
    // Fallback if tiles container doesn't exist yet
    return { x: isoX, y: isoY };
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
    // Check if tilesContainer exists before proceeding
    if (!this.tilesContainer) {
      console.warn("Cannot render habitat graphics - tilesContainer not available");
      return;
    }
    
    // Get a map of current habitat graphics by ID
    const existingHabitats = new Map();
    this.tilesContainer.list.forEach(child => {
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
      
      // Check if we have an existing graphic
      const existing = existingHabitats.get(habitat.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position if needed
        if (existing.graphic.x !== isoX || existing.graphic.y !== isoY) {
          existing.graphic.setPosition(isoX, isoY);
          console.log(`Updated position for habitat ${habitat.id}`);
        }
        
        // Note: If we need to update other properties of the habitat graphic
        // like appearance based on its state, we would do that here
      } else {
        // No existing graphic, create a new one
        const habitatGraphic = this.createHabitatGraphic(
          isoX, 
          isoY, 
          habitat.state === 'POTENTIAL' ? 'potential' : 'shelter'
        );
        
        // Store the habitat id for later reference
        habitatGraphic.setData('habitatId', habitat.id);
        
        // Add to tiles container
        this.tilesContainer!.add(habitatGraphic);
        
        // Make the habitat interactive and listen for clicks
        habitatGraphic.setInteractive();
        habitatGraphic.on('pointerdown', () => {
          console.log(`Habitat clicked: ${habitat.id}`);
          this.events.emit(EVENTS.HABITAT_CLICKED, habitat.id);
        });
      }
    });
    
    // Remove graphics for habitats that no longer exist
    existingHabitats.forEach((value, key) => {
      if (!value.used) {
        console.log(`Removing graphic for deleted habitat ${key}`);
        value.graphic.destroy();
      }
    });
  }
  
  // Helper method to remove all existing habitat graphics - no longer needed with our new approach
  // but keeping it for potential future use
  private removeAllHabitatGraphics() {
    if (!this.tilesContainer) return;
    
    // Find habitat graphics by checking children with getData method
    const habitatGraphics: Phaser.GameObjects.GameObject[] = [];
    
    this.tilesContainer.list.forEach(child => {
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
  }
}