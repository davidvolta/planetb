import { StateObserver } from '../utils/stateObserver';
import { Animal, ValidMove, Biome } from '../store/gameStore';
import * as actions from '../store/actions';
import BoardScene from '../scenes/BoardScene';
import { SelectionRenderer, SelectionType } from '../renderers/SelectionRenderer';
import { TileRenderer } from '../renderers/TileRenderer';
import { AnimalRenderer } from '../renderers/AnimalRenderer';
import { BiomeRenderer } from '../renderers/BiomeRenderer';
import { ResourceRenderer } from '../renderers/ResourceRenderer';
import { MoveRangeRenderer } from '../renderers/MoveRangeRenderer';
import Phaser from "phaser";

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// Interface for a component that can render animals
interface IAnimalRenderer {
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
}

// Interface for a component that can render biomes
interface IBiomeRenderer {
  renderBiomes(biomes: Biome[]): void;
  updateBiomeOwnership(biomeId: string): void;
}

// Interface for a component that can render move ranges
interface IMoveRangeRenderer {
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
}

// Interface for a component that can update the board
interface ITileRenderer {
  createBoardTiles(
    board: { width: number, height: number, tiles: any[][] },
    centerX?: number, 
    centerY?: number
  ): Phaser.GameObjects.GameObject[];
}

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: Phaser.Scene;
  
  // Renderers and controllers
  private animalRenderer!: AnimalRenderer;
  private biomeRenderer!: BiomeRenderer;
  private resourceRenderer!: ResourceRenderer;
  private moveRangeRenderer!: MoveRangeRenderer;
  private tileRenderer!: TileRenderer;
  private selectionRenderer!: SelectionRenderer;
  
  // Track initialization and subscription state
  private initialized: boolean = false;
  private subscriptionsSetup: boolean = false;
  
  // Define subscription keys to ensure consistency
  public static readonly SUBSCRIPTIONS = {
    // Board state subscriptions
    BOARD: 'StateSubscriptionManager.board',
    
    // Entity state subscriptions
    ANIMALS: 'StateSubscriptionManager.animals',
    BIOMES: 'StateSubscriptionManager.biomes',
    RESOURCE_TILES: 'StateSubscriptionManager.resourceTiles',
    
    // Interaction state subscriptions
    VALID_MOVES: 'StateSubscriptionManager.validMoves',
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
    BIOME_CAPTURE: 'StateSubscriptionManager.biomeCapture',
    SELECTION: 'StateSubscriptionManager.selection',
  };
  
  // Create a new StateSubscriptionManager
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Initialize all renderers and controllers
  public initialize(renderers: {
    animalRenderer: AnimalRenderer;
    biomeRenderer: BiomeRenderer;
    moveRangeRenderer: MoveRangeRenderer;
    tileRenderer: TileRenderer;
    resourceRenderer: ResourceRenderer;
    selectionRenderer: SelectionRenderer;
  }): void {
    this.animalRenderer = renderers.animalRenderer;
    this.biomeRenderer = renderers.biomeRenderer;
    this.moveRangeRenderer = renderers.moveRangeRenderer;
    this.tileRenderer = renderers.tileRenderer; 
    this.resourceRenderer = renderers.resourceRenderer;
    this.selectionRenderer = renderers.selectionRenderer;
    
    // Mark as initialized
    this.initialized = true;
  }
  
  // Set up all state subscriptions
  setupSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Check if properly initialized
    if (!this.initialized) {
      console.error("Cannot set up subscriptions: renderers not initialized");
      return;
    }
    
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    this.setupBoardSubscriptions();
    this.setupAnimalSubscriptions(onUnitClicked);
    this.setupBiomeSubscriptions();
    this.setupResourceSubscriptions();
    this.setupInteractionSubscriptions();
    this.setupSelectionSubscriptions();
    this.subscriptionsSetup = true;  // Mark subscriptions as set up
  }
  
  // Set up subscriptions related to the game board
  private setupBoardSubscriptions(): void {
    
    // Subscribe to board changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board, previousBoard) => {
        if (!board) return;
        
        // Only create board tiles on initial render
        if (!previousBoard) {
          this.tileRenderer.createBoardTiles(board);
        }
      },
      { 
        immediate: true, // Render immediately on subscription to handle initial state
        debug: false 
      }
    );
  }
  
  // Set up subscriptions related to animals
  private setupAnimalSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Subscribe to animal changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals) => {
        if (animals) {
          // Render animals using animal renderer
          this.animalRenderer.renderAnimals(animals, onUnitClicked);
        }
      },
      { immediate: true, debug: false } // Set immediate: true to render on subscription
    );
  }
  
  // Set up subscriptions related to biomes - a fundamental game construct
  private setupBiomeSubscriptions(): void {
    // Subscribe to biome changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BIOMES,
      (state) => state.biomes,
      (biomes, previousBiomes) => {
        if (!biomes) return;
        
        // Check if this is the first render (previous state is undefined)
        if (!previousBiomes) {
          // Initial render - render all biomes at once
          const biomesArray = Array.from(biomes.values());
          console.log(`Initial render of ${biomesArray.length} biomes`);
          this.biomeRenderer.renderBiomes(biomesArray);
        } else {
          // Subsequent update - find which biomes have lushness changes and only update those
          for (const [id, biome] of biomes.entries()) {
            const prevBiome = previousBiomes.get(id);
            if (prevBiome && biome.totalLushness !== prevBiome.totalLushness) {
              // Only update individual biomes that changed
              this.biomeRenderer.updateBiomeOwnership(id);
            }
          }
        }
      },
      { 
        immediate: true, // Use immediate:true to handle initial rendering here
        debug: false,
        // Custom equality function that focuses on lushness changes
        equalityFn: (a, b) => {
          if (!(a instanceof Map) || !(b instanceof Map)) return a === b;
          if (a.size !== b.size) return false;
          
          // Compare each biome's totalLushness value
          for (const [id, biomeA] of a.entries()) {
            const biomeB = b.get(id);
            // If biome doesn't exist in both maps or lushness changed
            if (!biomeB || biomeA.totalLushness !== biomeB.totalLushness) {
              // Trigger update
              return false; // Trigger update
            }
          }
          return true; // No lushness changes, don't update
        }
      }
    );
  }
  
  // Set up subscriptions related to resources
  private setupResourceSubscriptions(): void {
    // Subscribe to resource tile changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.RESOURCE_TILES,
      (state) => {
        if (!state.board) return null;
        
        // Extract only the resource-related data from tiles
        const resourceData = [];
        for (let y = 0; y < state.board.height; y++) {
          for (let x = 0; x < state.board.width; x++) {
            const tile = state.board.tiles[y][x];
            if (tile.resourceType || tile.active || tile.resourceValue > 0) {
              resourceData.push({
                x, 
                y, 
                resourceType: tile.resourceType,
                resourceValue: tile.resourceValue,
                active: tile.active
              });
            }
          }
        }
        return resourceData;
      },
      (resourceData, prevResourceData) => {
        // Only update on initial render or when resources actually change
        if (!resourceData) return;
        
        if (!prevResourceData || this.hasResourceChanges(resourceData, prevResourceData)) {
          const resourceTiles = actions.getResourceTiles();
          if (this.resourceRenderer) {
            this.resourceRenderer.renderResourceTiles(resourceTiles);
          }
        }
      },
      { immediate: true, debug: false }
    );
  }
  
  // Helper method to detect meaningful resource changes
  private hasResourceChanges(currentResources: any[], previousResources: any[]): boolean {
    // Quick check for different number of resources
    if (currentResources.length !== previousResources.length) {
      return true;
    }
    
    // Create maps for quick lookup
    const previousMap = new Map();
    for (const resource of previousResources) {
      const key = `${resource.x},${resource.y}`;
      previousMap.set(key, resource);
    }
    
    // Check for any changes in resource properties
    for (const resource of currentResources) {
      const key = `${resource.x},${resource.y}`;
      const prevResource = previousMap.get(key);
      
      // If resource doesn't exist in previous data or has different properties
      if (!prevResource || 
          resource.resourceType !== prevResource.resourceType ||
          resource.resourceValue !== prevResource.resourceValue || 
          resource.active !== prevResource.active) {
        return true;
      }
    }
    
    return false;
  }
  
  // Set up subscriptions related to user interactions and gameplay events
  private setupInteractionSubscriptions(): void {
    // Subscribe to valid moves changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.VALID_MOVES,
      (state) => ({ 
        validMoves: state.validMoves, 
        moveMode: state.moveMode 
      }),
      (moveState) => {
        if (moveState.moveMode) {
          this.moveRangeRenderer.showMoveRange(moveState.validMoves, moveState.moveMode);
        } else {
          this.moveRangeRenderer.clearMoveHighlights();
        }
      }
    );
    
    // Subscribe to displacement events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.DISPLACEMENT,
      (state) => state.displacementEvent,
      (displacementEvent) => {
        if (displacementEvent && displacementEvent.occurred) {
          if (this.scene instanceof BoardScene) {
            const { unitId, fromX, fromY, toX, toY } = displacementEvent;
            this.scene.handleDisplacementEvent(unitId!, fromX!, fromY!, toX!, toY!);
          }
          actions.clearDisplacementEvent();
        }
      }
    );
    
    // Simplified spawn-event subscription
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.SPAWN,
      state => state.spawnEvent,
      spawnEvent => {
        if (spawnEvent && spawnEvent.occurred) {
          this.scene.events.emit('unit_spawned', spawnEvent.unitId!);
          actions.clearSpawnEvent();
        }
      }
    );
    
    // Subscribe to biome capture events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BIOME_CAPTURE,
      (state) => state.biomeCaptureEvent,
      (biomeCaptureEvent) => {
        // Handle biome capture events
        if (biomeCaptureEvent && biomeCaptureEvent.occurred) {
          // Reveal the biome tiles for the captured biome
          if (biomeCaptureEvent.biomeId) {
            if (this.scene instanceof BoardScene) {
              this.scene.revealBiomeTiles(biomeCaptureEvent.biomeId);
              
              // Update just the captured biome's ownership status
              // This is more efficient than re-rendering all biomes
              this.biomeRenderer.updateBiomeOwnership(biomeCaptureEvent.biomeId);
            }
          }
          
          // Clear the biome capture event after handling it
          actions.clearBiomeCaptureEvent();
        }
      }
    );
  }
  
  // Centralize selection UI based on store state
  private setupSelectionSubscriptions(): void {
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.SELECTION,
      (state) => ({
        unitId: state.selectedUnitId,
        unitDormant: state.selectedUnitIsDormant,
        resource: state.selectedResource,
        biomeId: state.selectedBiomeId
      }),
      (sel) => {
        // Clear existing selection visuals
        this.selectionRenderer.hideSelection();
        // Priority: unit, resource, biome
        if (sel.unitId) {
          const unit = actions.getAnimals().find(a => a.id === sel.unitId);
          if (unit) {
            const x = unit.position.x;
            const y = unit.position.y;
            const type = sel.unitDormant ? SelectionType.Action : SelectionType.Move;
            this.selectionRenderer.showSelection(x, y, type);
          }
          return;
        }
        // Clear move highlights when not selecting a unit
        this.moveRangeRenderer.clearMoveHighlights();
        if (sel.resource) {
          this.selectionRenderer.showSelection(sel.resource.x, sel.resource.y, SelectionType.Action);
          return;
        }
        if (sel.biomeId) {
          const biome = actions.getBiomes().get(sel.biomeId);
          if (biome) {
            const { x, y } = biome.habitat.position;
            this.selectionRenderer.showSelection(x, y, SelectionType.Action);
          }
          return;
        }
        // No selection: nothing to do (already cleared)
      },
      { immediate: true, debug: false }
    );
  }
  
  // Clean up all subscriptions
  unsubscribeAll(): void {
    // Unsubscribe from all known subscriptions
    Object.values(StateSubscriptionManager.SUBSCRIPTIONS).forEach(key => {
      StateObserver.unsubscribe(key);
    });
    
    // Reset subscription setup flag
    this.subscriptionsSetup = false;
    
    console.log("All StateSubscriptionManager subscriptions unsubscribed");
  }
  
  // Check if manager is properly initialized
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Check if subscriptions are currently set up
  isSubscribed(): boolean {
    return this.subscriptionsSetup;
  }
  
  // Get a list of active subscription keys for debugging
  getActiveSubscriptions(): string[] {
    return StateObserver.getActiveSubscriptions();
  }
  
  // Clean up resources and unsubscribe from all state subscriptions
  destroy(): void {
    this.unsubscribeAll();
    this.initialized = false;
  }
} 