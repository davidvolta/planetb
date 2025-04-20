import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import { useGameStore } from '../store/gameStore';
import { Biome } from '../store/gameStore';

/**
 * Responsible for rendering and managing biome graphics
 */
export class BiomeRenderer extends BaseRenderer {
  /**
   * Creates a new BiomeRenderer
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
   * Render all biomes based on the provided biome data
   * @param biomes Array of biome objects to render
   */
  renderBiomes(biomes: Biome[]): void {
    // Check if staticObjectsLayer exists before proceeding
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render biome graphics - staticObjectsLayer not available");
      return;
    }
    
    // Remove only biome graphics, leaving other static objects untouched
    staticObjectsLayer.getAll().forEach(gameObject => {
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        const biomeId = gameObject.getData('biomeId');
        if (biomeId) {
          gameObject.destroy();
        }
      }
    });
    
    // Get the game state and board
    const state = useGameStore.getState();
    const board = state.board;
    
    if (!board) {
      return;
    }
    
    // Find and render all habitat tiles on the board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.isHabitat && tile.biomeId) {
          // Find the corresponding biome
          const biome = state.biomes.get(tile.biomeId);
          if (biome) {
            // Calculate position using coordinate utility
            const worldPosition = CoordinateUtils.gridToWorld(
              x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
            );
            
            // Determine biome state
            const isCaptured = biome.ownerId !== null;
            const lushness = biome.totalLushness || 0;
            
            // Create the biome graphic for this tile
            const biomeGraphic = this.createBiomeGraphic(worldPosition.x, worldPosition.y, isCaptured, lushness);
            biomeGraphic.setData('biomeId', biome.id);
            biomeGraphic.setData('gridX', x);
            biomeGraphic.setData('gridY', y);
            biomeGraphic.setData('isCaptured', isCaptured);
            biomeGraphic.setData('lushness', lushness);
            this.layerManager.addToLayer('staticObjects', biomeGraphic);
          }
        }
      }
    }
  }
  
  /**
   * Create a biome graphic based on its biome ownership
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param isCaptured Whether the biome is captured (has an owner)
   * @param lushness The lushness value of the biome (0-10)
   * @returns A container with the biome graphic
   */
  private createBiomeGraphic(x: number, y: number, isCaptured: boolean, lushness: number): Phaser.GameObjects.Container {
    // Create a container for the biome
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
      // Black for captured biomes (owned biomes)
      graphics.fillStyle(0x000000, 0.7);
    } else {
      // Black for uncaptured biomes (unowned biomes)
      graphics.fillStyle(0x000000, 0.5);
      
      // Add pulsing effect for uncaptured biomes
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
    
    // Center the text on the biome
    lushnessText.setOrigin(0.5, 0.5);
    
    // Add the text to the container
    container.add(lushnessText);
    
    return container;
  }
  
  /**
   * Clear all biome graphics from the layer
   */
  clearBiomes(): void {
    // Clear the static objects layer (where biomes are placed)
    this.layerManager.clearLayer('staticObjects', true);
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    this.clearBiomes();
  }

  /**
   * Updates only the ownership state of a specific biome
   * More efficient than re-rendering all biomes when only one changes
   * @param biomeId ID of the biome whose ownership changed
   */
  updateBiomeOwnership(biomeId: string): void {
    // Get the staticObjectsLayer and game state
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      return;
    }
    
    const state = useGameStore.getState();
    const biome = state.biomes.get(biomeId);
    if (!biome) {
      return;
    }
    
    // Find the biome graphic for this biome
    let biomeGraphic: Phaser.GameObjects.GameObject | undefined;
    staticObjectsLayer.getAll().forEach(gameObject => {
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        const graphicBiomeId = gameObject.getData('biomeId');
        if (graphicBiomeId === biome.id) {
          biomeGraphic = gameObject;
        }
      }
    });
    
    if (biomeGraphic) {
      // Get the position data
      const gridX = biomeGraphic.getData('gridX');
      const gridY = biomeGraphic.getData('gridY');
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Get updated ownership state
      const isCaptured = biome.ownerId !== null;
      const lushness = biome.totalLushness || 0;
      
      // Destroy the old graphic and create a new one with updated state
      biomeGraphic.destroy();
      const newBiomeGraphic = this.createBiomeGraphic(worldPosition.x, worldPosition.y, isCaptured, lushness);
      newBiomeGraphic.setData('biomeId', biome.id);
      newBiomeGraphic.setData('gridX', gridX);
      newBiomeGraphic.setData('gridY', gridY);
      newBiomeGraphic.setData('isCaptured', isCaptured);
      newBiomeGraphic.setData('lushness', lushness);
      this.layerManager.addToLayer('staticObjects', newBiomeGraphic);
    }
  }

  /**
   * Updates only the lushness value of a specific biome
   * More efficient than re-rendering all biomes when only one value changes
   * @param biomeId ID of the biome whose lushness changed
   * @param newValue The new totalLushness value
   */
  updateBiomeTotalLushness(biomeId: string, newValue: number): void {
    console.log(`Updating biome total lushness for ${biomeId} to ${newValue}`);

    // Get the staticObjectsLayer and game state
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      return;
    }
    
    const state = useGameStore.getState();
    const biome = state.biomes.get(biomeId);
    if (!biome) {
      return;
    }
    
    // Find the biome graphic for this biome
    staticObjectsLayer.getAll().forEach(gameObject => {
      if (gameObject && 'getData' in gameObject && typeof gameObject.getData === 'function') {
        const graphicBiomeId = gameObject.getData('biomeId');
        if (graphicBiomeId === biome.id) {
          // If this is a container with a text object for lushness, update it
          if ('getAll' in gameObject) {
            const container = gameObject as Phaser.GameObjects.Container;
            container.getAll().forEach(child => {
              if (child instanceof Phaser.GameObjects.Text) {
                // Format the new lushness value
                const lushnessDisplay = newValue.toFixed(1);
                
                // Determine text color based on lushness threshold
                const textColor = newValue >= 7.0 ? '#00FF00' : '#FF0000';
                
                // Update the text and its color
                child.setText(lushnessDisplay);
                child.setColor(textColor);
                
                // Update the stored data
                gameObject.setData('lushness', newValue);
              }
            });
          }
        }
      }
    });
  }
} 