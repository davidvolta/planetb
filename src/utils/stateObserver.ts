// 🔒 This file is the only allowed direct subscriber to useGameStore (besides actions.ts)


import { useGameStore } from "../store/gameStore";
import { GameState } from "../store/gameStore";

/**
 * Options for configuring subscription behavior
 */
export interface SubscriptionOptions {
  /** 
   * Whether to call the onChange handler immediately with current state 
   * @default true
   */
  immediate?: boolean;
  
  /**
   * Custom equality function to determine if state has changed
   * Return true if states are equal (no change), false if they differ
   */
  equalityFn?: <S>(a: S, b: S) => boolean;
  
  /**
   * Enables debug logging for this subscription
   * @default false
   */
  debug?: boolean;
}

/**
 * Type for a selector function that extracts part of the state
 */
export type Selector<T> = (state: GameState) => T;

/**
 * Type for the callback function that receives state changes
 */
export type OnChangeHandler<T> = (selectedState: T, previousState?: T) => void;

/**
 * Improved StateObserver utility
 * 
 * This utility provides methods for Phaser scenes to subscribe to Zustand store changes
 * with improved type safety, change detection, and memoization.
 */
export class StateObserver {
  // Track all subscriptions to easily unsubscribe later
  private static subscriptions: Record<string, () => void> = {};
  
  // Cache for previous selected values to avoid unnecessary updates
  private static selectorCache: Record<string, any> = {};
  
  /**
   * Performs a deep equality check between two values
   * Much more efficient than JSON.stringify for comparison
   */
  private static isEqual<T>(a: T, b: T): boolean {
    // Handle primitive types
    if (a === b) return true;
    
    // Handle null/undefined
    if (a == null || b == null) return a === b;
    
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) return false;
      }
      
      return true;
    }
    
    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!this.isEqual(a[key as keyof T], b[key as keyof T])) return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Subscribe to specific state changes from a Phaser scene
   * 
   * @param sceneKey Unique key for the scene (used for managing subscriptions)
   * @param selector Function that selects which part of state to watch
   * @param onChange Callback function triggered when selected state changes
   * @param options Optional configuration for the subscription
   * @returns Unsubscribe function
   */
  static subscribe<T>(
    sceneKey: string,
    selector: Selector<T>,
    onChange: OnChangeHandler<T>,
    options: SubscriptionOptions = {}
  ): () => void {
    // Set default options
    const { 
      immediate = true,
      equalityFn = this.isEqual.bind(this),
      debug = false
    } = options;
    
    // Ensure we don't have duplicate subscriptions
    if (this.subscriptions[sceneKey]) {
      if (debug) console.log(`[StateObserver] Replacing existing subscription for ${sceneKey}`);
      this.unsubscribe(sceneKey);
    }
    
    try {
      // Get current state value and store in cache
      const currentState = useGameStore.getState();
      const selectedState = selector(currentState);
      
      // Store in cache for future comparison
      this.selectorCache[sceneKey] = selectedState;
      
      // Call onChange immediately if requested
      if (immediate) {
        if (debug) console.log(`[StateObserver] Initial callback for ${sceneKey}`);
        onChange(selectedState);
      }
      
      // Subscribe to future state changes
      const unsubscribe = useGameStore.subscribe(
        (state, prevState) => {
          try {
            // Select new state
            const newSelectedState = selector(state);
            
            // Get cached previous value or compute it if needed
            const prevSelectedState = this.selectorCache[sceneKey];
            
            // Compare using the equality function
            const hasChanged = !equalityFn(newSelectedState, prevSelectedState);
            
            // Call onChange only if state actually changed
            if (hasChanged) {
              if (debug) {
                console.log(`[StateObserver] State changed for ${sceneKey}`);
                console.log('Previous:', prevSelectedState);
                console.log('New:', newSelectedState);
              }
              
              // Update cache with new value
              this.selectorCache[sceneKey] = newSelectedState;
              
              // Call the onChange handler
              onChange(newSelectedState, prevSelectedState);
            }
          } catch (error) {
            console.error(`[StateObserver] Error in subscription for ${sceneKey}:`, error);
          }
        }
      );
      
      // Store the unsubscribe function
      this.subscriptions[sceneKey] = unsubscribe;
      
      return unsubscribe;
    } catch (error) {
      console.error(`[StateObserver] Error setting up subscription for ${sceneKey}:`, error);
      return () => {}; // Return empty function in case of error
    }
  }
  
  /**
   * Unsubscribe from state changes for a specific scene
   * 
   * @param sceneKey The scene key to unsubscribe
   */
  static unsubscribe(sceneKey: string): void {
    try {
      if (this.subscriptions[sceneKey]) {
        this.subscriptions[sceneKey]();
        delete this.subscriptions[sceneKey];
      }
      
      // Also clean up the selector cache
      if (this.selectorCache[sceneKey]) {
        delete this.selectorCache[sceneKey];
      }
    } catch (error) {
      console.error(`[StateObserver] Error unsubscribing ${sceneKey}:`, error);
    }
  }
  
  /**
   * Unsubscribe all subscriptions
   */
  static unsubscribeAll(): void {
    try {
      Object.keys(this.subscriptions).forEach(key => {
        this.subscriptions[key]();
      });
      this.subscriptions = {};
      this.selectorCache = {};
    } catch (error) {
      console.error('[StateObserver] Error in unsubscribeAll:', error);
    }
  }
  
  /**
   * Get a list of active subscription keys
   * Useful for debugging
   */
  static getActiveSubscriptions(): string[] {
    return Object.keys(this.subscriptions);
  }
} 