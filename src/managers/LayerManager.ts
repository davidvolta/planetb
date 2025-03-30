import Phaser from 'phaser';

/**
 * Manages the Phaser layer hierarchy for the board scene.
 * Handles layer creation, access, and manipulation.
 */
export class LayerManager {
  // Layer properties
  private backgroundLayer: Phaser.GameObjects.Layer | null = null;
  private terrainLayer: Phaser.GameObjects.Layer | null = null;
  private selectionLayer: Phaser.GameObjects.Layer | null = null;
  private moveRangeLayer: Phaser.GameObjects.Layer | null = null;
  private staticObjectsLayer: Phaser.GameObjects.Layer | null = null;
  private unitsLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer: Phaser.GameObjects.Layer | null = null;
  
  // State tracking
  private layersSetup: boolean = false;
  
  // Reference to scene for creating layers
  private scene: Phaser.Scene;
  
  /**
   * Creates a new LayerManager for a specific scene
   * @param scene The Phaser scene that owns this layer manager
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Initializes all layers with appropriate depth order
   */
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
    this.unitsLayer = this.scene.add.layer().setDepth(5);
    this.uiLayer = this.scene.add.layer().setDepth(10);
    
    // Mark layers as initialized
    this.layersSetup = true;
  }
  
  /**
   * Checks if layers have been set up
   * @returns boolean indicating if layers are ready
   */
  isLayersSetup(): boolean {
    return this.layersSetup;
  }
  
  /**
   * Resets all layers, clearing them from the scene
   */
  resetLayers(): void {
    this.clearAllLayers(true);
    
    // Reset state
    this.backgroundLayer = null;
    this.terrainLayer = null;
    this.selectionLayer = null;
    this.moveRangeLayer = null;
    this.staticObjectsLayer = null;
    this.unitsLayer = null;
    this.uiLayer = null;
    
    this.layersSetup = false;
  }
  
  /**
   * Clears all layers without destroying them
   * @param destroyChildren Whether to destroy child objects when clearing
   */
  clearAllLayers(destroyChildren: boolean = false): void {
    this.clearLayer('background', destroyChildren);
    this.clearLayer('terrain', destroyChildren);
    this.clearLayer('selection', destroyChildren);
    this.clearLayer('moveRange', destroyChildren);
    this.clearLayer('staticObjects', destroyChildren);
    this.clearLayer('units', destroyChildren);
    this.clearLayer('ui', destroyChildren);
  }
  
  /**
   * Clears a specific layer
   * @param layerName Name of the layer to clear
   * @param destroyChildren Whether to destroy child objects when clearing
   */
  clearLayer(layerName: string, destroyChildren: boolean = false): void {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.removeAll(destroyChildren);
    }
  }
  
  /**
   * Gets a layer by name
   * @param layerName Name of the layer to retrieve
   * @returns The requested layer or null if not found/initialized
   */
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
      case 'units':
        return this.unitsLayer;
      case 'ui':
        return this.uiLayer;
      default:
        console.warn(`Unknown layer name: ${layerName}`);
        return null;
    }
  }
  
  // Layer accessor methods
  
  /**
   * Gets the background layer
   * @returns The background layer or null if not initialized
   */
  getBackgroundLayer(): Phaser.GameObjects.Layer | null {
    return this.backgroundLayer;
  }
  
  /**
   * Gets the terrain layer
   * @returns The terrain layer or null if not initialized
   */
  getTerrainLayer(): Phaser.GameObjects.Layer | null {
    return this.terrainLayer;
  }
  
  /**
   * Gets the selection layer
   * @returns The selection layer or null if not initialized
   */
  getSelectionLayer(): Phaser.GameObjects.Layer | null {
    return this.selectionLayer;
  }
  
  /**
   * Gets the move range layer
   * @returns The move range layer or null if not initialized
   */
  getMoveRangeLayer(): Phaser.GameObjects.Layer | null {
    return this.moveRangeLayer;
  }
  
  /**
   * Gets the static objects layer
   * @returns The static objects layer or null if not initialized
   */
  getStaticObjectsLayer(): Phaser.GameObjects.Layer | null {
    return this.staticObjectsLayer;
  }
  
  /**
   * Gets the units layer
   * @returns The units layer or null if not initialized
   */
  getUnitsLayer(): Phaser.GameObjects.Layer | null {
    return this.unitsLayer;
  }
  
  /**
   * Gets the UI layer
   * @returns The UI layer or null if not initialized
   */
  getUILayer(): Phaser.GameObjects.Layer | null {
    return this.uiLayer;
  }
  
  /**
   * Adds a game object to a specific layer
   * @param layerName Name of the layer to add to
   * @param gameObject The game object to add
   * @returns The added game object for chaining
   */
  addToLayer(layerName: string, gameObject: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.add(gameObject);
    } else {
      console.warn(`Could not add object to layer ${layerName} - layer not initialized`);
    }
    return gameObject;
  }
  
  /**
   * Removes a game object from a specific layer
   * @param layerName Name of the layer to remove from
   * @param gameObject The game object to remove
   * @param destroy Whether to destroy the object after removal
   */
  removeFromLayer(layerName: string, gameObject: Phaser.GameObjects.GameObject, destroy: boolean = false): void {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      layer.remove(gameObject, destroy);
    }
  }