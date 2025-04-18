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
      const lushness = biome?.lushness || 0;
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position
        existing.graphic.setPosition(worldPosition.x, worldPosition.y);
        
        // Check if state or lushness has changed
        const currentLushness = existing.graphic.getData('lushness') || 0;
        
        if (existing.graphic.getData('isCaptured') !== isCaptured || Math.abs(currentLushness - lushness) >= 0.1) {
          existing.graphic.setData('isCaptured', isCaptured);
          existing.graphic.setData('lushness', lushness);
          
          // Destroy and recreate the graphic to reflect the new state
          existing.graphic.destroy();
          const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, isCaptured, lushness);
          habitatGraphic.setData('habitatId', habitat.id);
          habitatGraphic.setData('gridX', gridX);
          habitatGraphic.setData('gridY', gridY);
          habitatGraphic.setData('isCaptured', isCaptured);
          habitatGraphic.setData('lushness', lushness);
          this.layerManager.addToLayer('staticObjects', habitatGraphic);
          
          // Update the reference in the map
          existingHabitats.set(habitat.id, {
            graphic: habitatGraphic,
            used: true
          });
        }
      } else {
        // Create new habitat graphic
        const habitatGraphic = this.createHabitatGraphic(worldPosition.x, worldPosition.y, isCaptured, lushness);
        habitatGraphic.setData('habitatId', habitat.id);
        habitatGraphic.setData('gridX', gridX);
        habitatGraphic.setData('gridY', gridY);
        habitatGraphic.setData('isCaptured', isCaptured);
        habitatGraphic.setData('lushness', lushness);
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
   * @param lushness The lushness value of the biome (0-10)
   * @returns A container with the habitat graphic
   */
  private createHabitatGraphic(x: number, y: number, isCaptured: boolean, lushness: number): Phaser.GameObjects.Container {
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
    
    // Format the lushness value to show one decimal place
    const lushnessDisplay = lushness.toFixed(1);
    
    // Determine text color based on lushness threshold (green if >= 7.0, red otherwise)
    const textColor = lushness >= 7.0 ? '#00FF00' : '#FF0000';
    
    // Create text to display lushness value
    const lushnessText = this.scene.add.text(0, 0, lushnessDisplay, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: textColor,
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Center the text on the habitat
    lushnessText.setOrigin(0.5, 0.5);
    
    // Add the text to the container
    container.add(lushnessText);
    
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