import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import BoardScene from '../scene/BoardScene';

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: BoardScene;
  
  // Track initialization and subscription state
  private initialized: boolean = false;
  private subscriptionsSetup: boolean = false;
  
  // Define subscription keys to ensure consistency
  public static readonly SUBSCRIPTIONS = {
    // All subscriptions have been moved to their respective components
  };
  
  // Create a new StateSubscriptionManager
  constructor(scene: BoardScene) {
    this.scene = scene;
  }
  
  // Initialize all renderers and controllers
  public initialize(): void {
    // Mark as initialized
    this.initialized = true;
  }
  
  // Set up all state subscriptions
  setupSubscriptions(): void {
    // Check if properly initialized
    if (!this.initialized) {
      console.error("Cannot set up subscriptions: not initialized");
      return;
    }
    
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    // No more subscriptions to set up - all moved to respective components
    this.subscriptionsSetup = true;  // Mark subscriptions as set up
  }
  
  // setupInteractionSubscriptions method removed
  
  // Clean up all subscriptions
  unsubscribeAll(): void {
    // Nothing to unsubscribe from anymore - all subscriptions are component-specific
    
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