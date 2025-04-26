import Phaser from 'phaser';

// Manages the Phaser layer hierarchy for the board scene including layer creation, access, and manipulation.
export class LayerManager {
  // Layer properties
  private backgroundLayer: Phaser.GameObjects.Layer | null = null;
  private terrainLayer: Phaser.GameObjects.Layer | null = null;
  private selectionLayer: Phaser.GameObjects.Layer | null = null;
  private moveRangeLayer: Phaser.GameObjects.Layer | null = null;
  private staticObjectsLayer: Phaser.GameObjects.Layer | null = null;
  private eggsLayer: Phaser.GameObjects.Layer | null = null;
  private unitsLayer: Phaser.GameObjects.Layer | null = null;
  private fogOfWarLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer: Phaser.GameObjects.Layer | null = null;
  
  // State tracking
  private layersSetup: boolean = false;
  
  // Reference to scene for creating layers
  private scene: Phaser.Scene;
  
  // Creates a new LayerManager for a specific scene
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Initializes all layers with appropriate depth order
  setupLayers(): void {
    // Skip if layers are already set up
    if (this.layersSetup) {
      console.log("Layers already initialized, skipping setupLayers()");
      return;
    }
    
    console.log("LayerManager: Setting up layers with proper depth order");
    
    // Initialize each layer with its appropriate depth
    this.backgroundLayer = this.scene.add.layer().setDepth(0);
    this.terrainLayer = this.scene.add.layer().setDepth(1);
    this.selectionLayer = this.scene.add.layer().setDepth(2);
    this.moveRangeLayer = this.scene.add.layer().setDepth(3);
    this.staticObjectsLayer = this.scene.add.layer().setDepth(4);
    this.fogOfWarLayer = this.scene.add.layer().setDepth(5);
    this.eggsLayer = this.scene.add.layer().setDepth(6);
    this.unitsLayer = this.scene.add.layer().setDepth(7);
    this.uiLayer = this.scene.add.layer().setDepth(10);
    
    // Mark layers as initialized
    this.layersSetup = true;
  }
  
  // Checks if layers have been set up
  isLayersSetup(): boolean {
    return this.layersSetup;
  }
  
  // Resets all layers, clearing them from the scene
  resetLayers(): void {
    this.clearAllLayers(true);
    
    // Reset state
    this.backgroundLayer = null;
    this.terrainLayer = null;
    this.selectionLayer = null;
    this.moveRangeLayer = null;
    this.staticObjectsLayer = null;
    this.eggsLayer = null;
    this.unitsLayer = null;
    this.fogOfWarLayer = null;
    this.uiLayer = null;
    
    this.layersSetup = false;
  }
  
  // Clears all layers without destroying them
  clearAllLayers(destroyChildren: boolean = false): void {
    this.clearLayer('background', destroyChildren);
    this.clearLayer('terrain', destroyChildren);
    this.clearLayer('selection', destroyChildren);
    this.clearLayer('moveRange', destroyChildren);
    this.clearLayer('staticObjects', destroyChildren);
    this.clearLayer('fogOfWar', destroyChildren);
    this.clearLayer('eggs', destroyChildren);
    this.clearLayer('units', destroyChildren);
    this.clearLayer('ui', destroyChildren);
  }
  
  // Clears a specific layer
  clearLayer(layerName: string, destroyChildren: boolean = false): void {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.removeAll(destroyChildren);
    }
  }
  
  // Gets a layer by name
  private getLayerByName(layerName: string): Phaser.GameObjects.Layer | null {
    switch (layerName.toLowerCase()) {
      case 'background':
        return this.backgroundLayer;
      case 'terrain':
        return this.terrainLayer;
      case 'selection':
        return this.selectionLayer;
      case 'moverange':
        return this.moveRangeLayer;
      case 'staticobjects':
        return this.staticObjectsLayer;
      case 'eggs':
        return this.eggsLayer;
      case 'units':
        return this.unitsLayer;
      case 'fogofwar':
        return this.fogOfWarLayer;
      case 'ui':
        return this.uiLayer;
      default:
        console.warn(`Unknown layer name: ${layerName}`);
        return null;
    }
  }
  
  // Layer accessor methods

  getBackgroundLayer(): Phaser.GameObjects.Layer | null {
    return this.backgroundLayer;
  }
  
  getTerrainLayer(): Phaser.GameObjects.Layer | null {
    return this.terrainLayer;
  }
  
  getSelectionLayer(): Phaser.GameObjects.Layer | null {
    return this.selectionLayer;
  }
  
  getMoveRangeLayer(): Phaser.GameObjects.Layer | null {
    return this.moveRangeLayer;
  }
  
  getStaticObjectsLayer(): Phaser.GameObjects.Layer | null {
    return this.staticObjectsLayer;
  }

  getUnitsLayer(): Phaser.GameObjects.Layer | null {
    return this.unitsLayer;
  }
  
  getFogOfWarLayer(): Phaser.GameObjects.Layer | null {
    return this.fogOfWarLayer;
  }
  
  getUILayer(): Phaser.GameObjects.Layer | null {
    return this.uiLayer;
  }

  getEggsLayer(): Phaser.GameObjects.Layer | null {
    return this.eggsLayer;
  }

  
  // Adds a game object to a specific layer
  addToLayer(layerName: string, gameObject: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.add(gameObject);
    } else {
      console.warn(`Could not add object to layer ${layerName} - layer not initialized`);
    }
    return gameObject;
  }
  
  // Removes a game object from a specific layer
  removeFromLayer(layerName: string, gameObject: Phaser.GameObjects.GameObject, destroy: boolean = false): void {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.remove(gameObject, destroy);
    }
  }

}