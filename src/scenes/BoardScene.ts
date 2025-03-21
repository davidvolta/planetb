import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import { TerrainType } from "../store/gameStore";

export default class BoardScene extends Phaser.Scene {
  private tiles: Phaser.GameObjects.Container[] = [];
  private tileSize = 64;
  private tileHeight = 32;
  private verticalOffset = 0;
  private tilesContainer: Phaser.GameObjects.Container | null = null;
  private controlsSetup = false;

  constructor() {
    super({ key: "BoardScene" });
  }

  preload() {
    // No need to preload any PNG assets
  }

  init() {
    // Clear previous tiles when scene restarts
    this.tiles = [];
  }

  // Method to set the tile size and update the board
  setTileSize(size: number) {
    if (size !== this.tileSize) {
      console.log(`Updating tile size from ${this.tileSize} to ${size}`);
      this.tileSize = size;
      this.tileHeight = size / 2; // Maintain the isometric ratio
      this.updateBoard();
    }
  }

  // Method to update the board without restarting the scene
  updateBoard() {
    console.log("Updating board without fade");
    
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
    console.log("Creating new board scene");
    this.createTiles();
  }
  
  // Create tiles based on the current board state
  private createTiles() {
    // Clear previous tiles
    this.tiles = [];
    
    // Get board data from Zustand
    const board = useGameStore.getState().board;
    if (!board) {
      console.warn("No board available, initializing default");
      useGameStore.getState().initializeBoard(20, 20);
      return;
    }

    console.log(`Creating tiles for board: ${board.width}x${board.height}, hash: ${Date.now()}`);

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
        
        // Add hover effect
        tile.setData('baseY', isoY);
        tile.on('pointerover', () => {
          tile.setScale(1.05);
          tile.y = tile.getData('baseY') - 5;
        });
        
        tile.on('pointerout', () => {
          tile.setScale(1);
          tile.y = tile.getData('baseY');
        });
        
        tile.on('pointerdown', () => {
          console.log(`Clicked tile at grid: ${x}, ${y}`);
          // Optionally add functionality to modify terrain on click
          // useGameStore.getState().setTerrain(x, y, TerrainType.MOUNTAIN);
        });
      }
    }
    
    // Add panning and zooming for navigation (only if not already set up)
    if (!this.controlsSetup) {
      this.setupControls();
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
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
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
    shape.lineStyle(1, 0x000000, 0.25);
    shape.beginPath();
    shape.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      shape.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    shape.closePath();
    shape.strokePath();
    
    // Add terrains specific details
    this.addTerrainDetails(shape, terrain);
    
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
}