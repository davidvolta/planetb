import { useGameStore } from "../store/gameStore";
import { GameState } from "../store/gameStore";

/**
 * StateObserver utility
 * 
 * This utility provides methods for Phaser scenes to subscribe to Zustand store changes
 * in a way that prevents memory leaks and ensures proper cleanup.
 */
export class StateObserver {
  // Track all subscriptions to easily unsubscribe later
  private static subscriptions: { [key: string]: () => void } = {};
  
  /**
   * Subscribe to specific state changes from a Phaser scene
   * 
   * @param sceneKey Unique key for the scene (used for managing subscriptions)
   * @param selector Function that selects which part of state to watch
   * @param onChange Callback function triggered when selected state changes
   * @returns Unsubscribe function
   */
  static subscribe<T>(
    sceneKey: string,
    selector: (state: GameState) => T,
    onChange: (selectedState: T) => void
  ): () => void {
    // Unsubscribe existing subscription for this scene key if it exists
    if (this.subscriptions[sceneKey]) {
      this.unsubscribe(sceneKey);
    }
    
    // Initial call with current state
    const initialState = selector(useGameStore.getState());
    onChange(initialState);
    
    // Subscribe to future state changes
    const unsubscribe = useGameStore.subscribe(
      (state, prevState) => {
        const selectedState = selector(state);
        const prevSelectedState = selector(prevState);
        
        // Only trigger if the selected state actually changed
        if (JSON.stringify(selectedState) !== JSON.stringify(prevSelectedState)) {
          onChange(selectedState);
        }
      }
    );
    
    // Store the unsubscribe function
    this.subscriptions[sceneKey] = unsubscribe;
    
    return unsubscribe;
  }
  
  /**
   * Unsubscribe from state changes for a specific scene
   * 
   * @param sceneKey The scene key to unsubscribe
   */
  static unsubscribe(sceneKey: string): void {
    if (this.subscriptions[sceneKey]) {
      this.subscriptions[sceneKey]();
      delete this.subscriptions[sceneKey];
    }
  }
  
  /**
   * Unsubscribe all subscriptions
   */
  static unsubscribeAll(): void {
    Object.keys(this.subscriptions).forEach(key => {
      this.subscriptions[key]();
    });
    this.subscriptions = {};
  }
} 