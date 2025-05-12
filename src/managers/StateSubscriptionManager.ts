import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import BoardScene from '../scene/BoardScene';
import { SelectionRenderer, SelectionType } from '../renderers/SelectionRenderer';
import { TileRenderer } from '../renderers/TileRenderer';
import { MoveRangeRenderer } from '../renderers/MoveRangeRenderer';

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: BoardScene;
  
  // Renderers and controllers
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
    moveRangeRenderer: MoveRangeRenderer;
    tileRenderer: TileRenderer;
    selectionRenderer: SelectionRenderer;
  }): void {
    this.moveRangeRenderer = renderers.moveRangeRenderer;
    this.tileRenderer = renderers.tileRenderer; 
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
          this.tileRenderer.renderBoard(board);
        }
      },
      { 
        immediate: true, // Render immediately on subscription to handle initial state
        debug: false 
      }
    );
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
            const { animalId, fromX, fromY, toX, toY } = displacementEvent;
            this.scene.handleDisplacementEvent(animalId!, fromX!, fromY!, toX!, toY!);
          }
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
            this.scene.handleSpawnEvent(spawnEvent.animalId!);
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
        animalId: state.selectedAnimalID,
        resource: state.selectedResource,
        biomeId: state.selectedBiomeId,
        eggId: state.selectedEggId
      }),
      (sel) => {
        // Clear existing selection visuals
        this.selectionRenderer.hideSelection();
        // Priority: unit, resource, biome
        if (sel.animalId) {
          const unit = actions.getAnimals().find(a => a.id === sel.animalId);
          if (unit) {
            const x = unit.position.x;
            const y = unit.position.y;
            this.selectionRenderer.showSelection(x, y, SelectionType.Move);
          }
          return;
        }
        if (sel.eggId) {
          const egg = actions.getEggs()[sel.eggId];
          if (egg) {
            const { x, y } = egg.position;
            this.selectionRenderer.showSelection(x, y, SelectionType.Action);
          } else {
            // Egg no longer exists (hatched), clear selection
            actions.selectEgg(null);
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