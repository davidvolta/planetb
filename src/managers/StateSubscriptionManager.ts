import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import BoardScene from '../scene/BoardScene';
import { TileRenderer } from '../renderers/TileRenderer';

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: BoardScene;
  
  // Renderers and controllers
  private tileRenderer!: TileRenderer;
  
  // Track initialization and subscription state
  private initialized: boolean = false;
  private subscriptionsSetup: boolean = false;
  
  // Define subscription keys to ensure consistency
  public static readonly SUBSCRIPTIONS = {
    // Interaction state subscriptions
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
  };
  
  // Create a new StateSubscriptionManager
  constructor(scene: BoardScene) {
    this.scene = scene;
  }
  
  // Initialize all renderers and controllers
  public initialize(renderers: {
    tileRenderer: TileRenderer;
  }): void {
    this.tileRenderer = renderers.tileRenderer;
    
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
    
    this.setupInteractionSubscriptions();
    this.subscriptionsSetup = true;  // Mark subscriptions as set up
  }
  
  // Set up subscriptions related to user interactions and gameplay events
  private setupInteractionSubscriptions(): void {
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