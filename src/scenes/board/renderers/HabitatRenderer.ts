import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { HabitatState } from '../../../store/gameStore';

/**
 * Responsible for rendering and managing habitat graphics
 */
export class HabitatRenderer {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Reference to the layer manager
  private layerManager: LayerManager;
  
  // Store fixed size properties for habitats
  private tileSize: number;
  private tileHeight: number;
  
  // Store anchor coordinates for the grid origin
  private anchorX: number;
  private anchorY: number;
  
  /**
   * Creates a new HabitatRenderer
   * @param scene The parent scene
   * @param layerManager Layer manager for organizing display
   * @param tileSize The width of a tile in pixels
   * @param tileHeight The height of a tile in pixels
   */
  constructor(
    scene: Phaser.Scene, 
    layerManager: LayerManager, 
    tileSize: number = 64, 
    tileHeight: number = 32
  ) {
    this.scene = scene;
    this.layerManager = layerManager;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
    
    // Initialize anchors with defaults - will be updated during rendering
    this.anchorX = 0;
    this.anchorY = 0;
  }
  
  /**
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
  
  /**
   * Render all habitats based on the provided habitat data
   * @param habitats Array of habitat objects from the game state
   */
  renderHabitats(habitats: any[]): void {
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
  
  /**
   * Create a habitat graphic based on its state
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param state State of the habitat (potential, improved, etc)
   * @returns A container with the habitat graphic
   */
  private createHabitatGraphic(x: number, y: number, state: HabitatState): Phaser.GameObjects.Container {
    // Create a container for the habitat
    const container = this.scene.add.container(x, y);
    const graphics = this.scene.add.graphics();
    
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
    
    return container;
  }
  
  /**
   * Clear all habitat graphics from the layer
   */
  clearHabitats(): void {
    // Clear the static objects layer (where habitats are placed)
    this.layerManager.clearLayer('staticObjects', true);
  }
  
  /**
   * Clean up resources used by this renderer
   */
  destroy(): void {
    // Clear all habitat graphics
    this.clearHabitats();
  }
} 