import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import { useGameStore } from '../store/gameStore';

/**
 * Responsible for rendering and managing habitat graphics
 */
export class HabitatRenderer extends BaseRenderer {
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
    tileSize: number, 
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }
  
  /**
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.setAnchor(anchorX, anchorY);
  }
  
  /**
   * Render all habitats based on the provided habitat data
   * Note: With the biome-centric architecture, these habitats come from biomes
   * @param habitats Array of habitat objects from the biomes
   */
  renderHabitats(habitats: any[]): void {
    // Check if staticObjectsLayer exists before proceeding
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render habitat graphics - staticObjectsLayer not available");
      return;
    }
    
    // Create a map to store existing habitat graphics
    const existingHabitats = new Map();
    
    // Collect all existing habitat graphics first
    staticObjectsLayer.getAll().forEach(gameObject => {
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        const habitatId = gameObject.getData('habitatId');
        if (habitatId) {
          existingHabitats.set(habitatId, {
            graphic: gameObject,
            used: false // We'll mark as used when updating
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
      
      // Get biome ownership state (captured or available)
      const state = useGameStore.getState();
      
      // Find the corresponding biome by matching habitat ID
      const biome = Array.from(state.biomes.values())
        .find(b => b.habitat.id === habitat.id);
        
      const isCaptured = biome?.ownerId !== null;
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position
        existing.graphic.setPosition(worldPosition.x, worldPosition.y);
        
        // Update state if needed based on biome ownership
        if (existing.graphic.getData('isCaptured') !== isCaptured) {
          existing.graphic.setData('isCaptured', isCaptured);
          
          // Destroy and recreate the graphic to reflect the new state
          existing.graphic.destroy();
          const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, isCaptured);
          habitatGraphic.setData('habitatId', habitat.id);
          habitatGraphic.setData('gridX', gridX);
          habitatGraphic.setData('gridY', gridY);
          habitatGraphic.setData('isCaptured', isCaptured);
          this.layerManager.addToLayer('staticObjects', habitatGraphic);
          
          // Update the reference in the map
          existingHabitats.set(habitat.id, {
            graphic: habitatGraphic,
            used: true
          });
        }
      } else {
        // Create new habitat graphic
        const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, isCaptured);
        habitatGraphic.setData('habitatId', habitat.id);
        habitatGraphic.setData('gridX', gridX);
        habitatGraphic.setData('gridY', gridY);
        habitatGraphic.setData('isCaptured', isCaptured);
        this.layerManager.addToLayer('staticObjects', habitatGraphic);
      }
    });
    
    // Remove any unused habitat graphics
    existingHabitats.forEach((value, key) => {
      if (!value.used) {
        value.graphic.destroy();
      }
    });
  }
  
  /**
   * Create a habitat graphic based on its biome ownership
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param isCaptured Whether the biome is captured (has an owner)
   * @returns A container with the habitat graphic
   */
  private createHabitatGraphic(x: number, y: number, isCaptured: boolean): Phaser.GameObjects.Container {
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
    
    // Choose color based on biome ownership
    if (isCaptured) {
      // Black for captured habitats (owned biomes)
      graphics.fillStyle(0x000000, 0.7);
    } else {
      // Black for uncaptured habitats (unowned biomes)
      graphics.fillStyle(0x000000, 0.5);
      
      // Add pulsing effect for uncaptured habitats
      this.scene.tweens.add({
        targets: graphics,
        alpha: { from: 0.5, to: 0.2 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
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
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    this.clearHabitats();
  }
} 