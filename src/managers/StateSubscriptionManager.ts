import { StateObserver } from '../utils/stateObserver';
import BoardScene from '../scene/BoardScene';

/**
 * Legacy class maintained for compatibility.
 * All subscriptions have been moved to their respective components.
 */
export class StateSubscriptionManager {
  // Scene reference
  private scene: BoardScene;
  
  // Track initialization state
  private initialized: boolean = false;
  
  constructor(scene: BoardScene) {
    this.scene = scene;
  }
  
  // Initialize - kept for compatibility
  public initialize(): void {
    this.initialized = true;
  }
  
  // Setup method - kept for compatibility
  setupSubscriptions(): void {
    if (!this.initialized) {
      console.warn("StateSubscriptionManager: Not initialized");
    }
  }
  
  // Get a list of active subscription keys for debugging
  getActiveSubscriptions(): string[] {
    return StateObserver.getActiveSubscriptions();
  }
  
  // Unsubscribe method - kept for compatibility
  unsubscribeAll(): void {
    // Nothing to do - all subscriptions now managed by their components
  }
  
  // Clean up method - kept for compatibility
  destroy(): void {
    this.initialized = false;
  }
} 