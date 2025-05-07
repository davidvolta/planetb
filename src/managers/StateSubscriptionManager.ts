import { StateObserver } from '../utils/stateObserver';
import { Animal, ValidMove, Biome } from '../store/gameStore';
import * as actions from '../store/actions';
import BoardScene from '../scene/BoardScene';
import { SelectionRenderer, SelectionType } from '../renderers/SelectionRenderer';
import { TileRenderer } from '../renderers/TileRenderer';
import { AnimalRenderer } from '../renderers/AnimalRenderer';
import { BiomeRenderer } from '../renderers/BiomeRenderer';
import { ResourceRenderer } from '../renderers/ResourceRenderer';
import { MoveRangeRenderer } from '../renderers/MoveRangeRenderer';
import { EggRenderer } from '../renderers/EggRenderer';
import Phaser from "phaser";

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: BoardScene;
  
  // Renderers and controllers
  private animalRenderer!: AnimalRenderer;
  private eggRenderer!: EggRenderer;
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
    EGGS: 'StateSubscriptionManager.eggs',
    BIOMES: 'StateSubscriptionManager.biomes',
    RESOURCE_TILES: 'StateSubscriptionManager.resourceTiles',
    
    // Interaction state subscriptions
    VALID_MOVES: 'StateSubscriptionManager.validMoves',
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
    SELECTION: 'StateSubscriptionManager.selection',
  };
  
  // Create a new StateSubscriptionManager
  constructor(scene: BoardScene) {
    this.scene = scene;
  }
  
  // Initialize all renderers and controllers
  public initialize(renderers: {
    animalRenderer: AnimalRenderer;
    eggRenderer: EggRenderer;
    biomeRenderer: BiomeRenderer;
    moveRangeRenderer: MoveRangeRenderer;
    tileRenderer: TileRenderer;
    resourceRenderer: ResourceRenderer;
    selectionRenderer: SelectionRenderer;
  }): void {
    this.animalRenderer = renderers.animalRenderer;
    this.eggRenderer = renderers.eggRenderer;
    this.biomeRenderer = renderers.biomeRenderer;
    this.moveRangeRenderer = renderers.moveRangeRenderer;
    this.tileRenderer = renderers.tileRenderer; 
    this.resourceRenderer = renderers.resourceRenderer;
    this.selectionRenderer = renderers.selectionRenderer;
    
    // Mark as initialized
    this.initialized = true;
  }
  
  // Set up all state subscriptions
  setupSubscriptions(): void {
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
    this.setupAnimalSubscriptions();
    this.setupEggSubscriptions();
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
  private setupAnimalSubscriptions(): void {
    // Subscribe to animal changes and filter by fog-of-war visibility for active player
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.ANIMALS,
      (state) => ({ animals: state.animals, activePlayerId: state.activePlayerId, fogOfWarEnabled: state.fogOfWarEnabled }),
      ({ animals, activePlayerId, fogOfWarEnabled }) => {
        if (!animals) return;
        if (!fogOfWarEnabled) {
          // FOW disabled: render all animals
          this.animalRenderer.renderAnimals(animals);
          return;
        }
        // Get visible coords for the active player
        const visibleSet = new Set(
          actions.getVisibleTilesForPlayer(activePlayerId).map(({ x, y }) => `${x},${y}`)
        );
        // Only render animals whose positions are visible
        const visibleAnimals = animals.filter(a =>
          visibleSet.has(`${a.position.x},${a.position.y}`)
        );
        this.animalRenderer.renderAnimals(visibleAnimals);
      },
      { immediate: true, debug: false }
    );
  }
  
  // Set up subscriptions related to biomes - a fundamental game construct
  private setupBiomeSubscriptions(): void {
    // Subscribe to biome changes
    StateObserver.subscribe<Map<string, Biome>>(
      StateSubscriptionManager.SUBSCRIPTIONS.BIOMES,
      (state) => state.biomes,
      (biomes, previousBiomes) => {
        if (!biomes) return;
        
        if (!previousBiomes) {
          // Initial render - render all biomes at once
          const biomesArray = Array.from(biomes.values());
          console.log(`Initial render of ${biomesArray.length} biomes`);
          this.biomeRenderer.renderBiomes(biomesArray);
        } else {
          // Subsequent updates: collapse duplicate calls for owner & lushness changes
          for (const [id, biome] of biomes.entries()) {
            const prev = previousBiomes.get(id);
            if (!prev) continue;
            const ownerChanged = biome.ownerId !== prev.ownerId;
            const lushnessChanged = biome.totalLushness !== prev.totalLushness;
            if (ownerChanged) {
              // Reveal fog on capture
              if (this.scene instanceof BoardScene) {
                this.scene.revealBiomeTiles(id);
              }
              this.biomeRenderer.updateBiomeOwnership(id);
            } else if (lushnessChanged) {
              this.biomeRenderer.updateBiomeOwnership(id);
            }
          }
        }
      },
      {
        immediate: true,
        debug: false,
        // Only trigger when ownerId or totalLushness changes
        equalityFn: <S>(a: S, b: S): boolean => {
          const mapA = a as Map<string, Biome>;
          const mapB = b as Map<string, Biome>;
          if (mapA.size !== mapB.size) return false;
          for (const [id, biomeA] of mapA.entries()) {
            const biomeB = mapB.get(id);
            if (!biomeB) return false;
            if (biomeA.ownerId !== biomeB.ownerId || biomeA.totalLushness !== biomeB.totalLushness) {
              return false;
            }
          }
          return true;
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
        if (!resourceData) return;
        
        if (!prevResourceData) {
          // Initial render
          const resourceTiles = actions.getResourceTiles();
          if (this.resourceRenderer) {
            this.resourceRenderer.renderResourceTiles(resourceTiles);
          }
        } else if (this.hasResourceChanges(resourceData, prevResourceData)) {
          // On actual resource changes (e.g., harvest)
          const resourceTiles = actions.getResourceTiles();
          if (this.resourceRenderer) {
            this.resourceRenderer.renderResourceTiles(resourceTiles);
          }
          // Clear selected resource after harvest
          actions.selectResourceTile(null);
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
          if (this.scene instanceof BoardScene) {
            this.scene.handleUnitSpawned(spawnEvent.unitId!);
          }
          actions.clearSpawnEvent();
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
            this.selectionRenderer.showSelection(x, y, SelectionType.Move);
          }
          return;
        }
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
 
  /**
   * Subscribe to egg state changes for rendering.
   */
  public setupEggSubscriptions(): void {
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.EGGS,
      (state) => ({ eggs: state.eggs, activePlayerId: state.activePlayerId, fogOfWarEnabled: state.fogOfWarEnabled }),
      ({ eggs, activePlayerId, fogOfWarEnabled }) => {
        if (!eggs) return;

        const eggArray = Object.values(eggs);
        if (!fogOfWarEnabled) {
          // FOW disabled: render all eggs
          this.eggRenderer.renderEggs(eggArray);
          return;
        }

        // With FOW: only render visible eggs
        const visibleSet = new Set(
          actions.getVisibleTilesForPlayer(activePlayerId).map(({ x, y }) => `${x},${y}`)
        );

        const visibleEggs = eggArray.filter(e =>
          visibleSet.has(`${e.position.x},${e.position.y}`)
        );

        this.eggRenderer.renderEggs(visibleEggs);
      },
      { immediate: true, debug: false }
    );
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