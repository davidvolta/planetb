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
  private static selectorCache: Record<string, unknown> = {};
  
  /**
   * Performs an optimized equality check between two values
   * Uses shallow comparison for better performance on large objects
   */
  private static isEqual<T>(a: T, b: T): boolean {
    // Handle primitive types and references
    if (a === b) return true;
    
    // Handle null/undefined
    if (a == null || b == null) return a === b;
    
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    // For arrays and objects, do a shallow comparison for performance
    // This is sufficient for most state changes in our game
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      
      // Only compare first level - if elements are objects, use reference equality
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      
      return true;
    }
    
    // Handle objects with shallow comparison
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      // Shallow comparison - only check direct properties
      for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (a[key as keyof T] !== b[key as keyof T]) return false;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Deep equality check for when shallow is not sufficient
   * Use this as equalityFn in options when you need deep comparison
   */
  static deepEqual<T>(a: T, b: T): boolean {
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
        if (!this.deepEqual(a[i], b[i])) return false;
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
        if (!this.deepEqual(a[key as keyof T], b[key as keyof T])) return false;
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
    // Validate inputs
    if (!sceneKey || typeof sceneKey !== 'string') {
      console.error('[StateObserver] Invalid sceneKey provided:', sceneKey);
      return () => {};
    }
    if (typeof selector !== 'function') {
      console.error('[StateObserver] Invalid selector provided for', sceneKey);
      return () => {};
    }
    if (typeof onChange !== 'function') {
      console.error('[StateObserver] Invalid onChange handler provided for', sceneKey);
      return () => {};
    }

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
      if (!currentState) {
        console.error(`[StateObserver] Game store state is null/undefined for ${sceneKey}`);
        return () => {};
      }

      let selectedState: T;
      try {
        selectedState = selector(currentState);
      } catch (selectorError) {
        console.error(`[StateObserver] Selector error for ${sceneKey}:`, selectorError);
        return () => {};
      }
      
      // Store in cache for future comparison
      this.selectorCache[sceneKey] = selectedState;
      
      // Call onChange immediately if requested
      if (immediate) {
        try {
          if (debug) console.log(`[StateObserver] Initial callback for ${sceneKey}`);
          onChange(selectedState);
        } catch (callbackError) {
          console.error(`[StateObserver] Initial callback error for ${sceneKey}:`, callbackError);
        }
      }
      
      // Subscribe to future state changes
      const unsubscribe = useGameStore.subscribe(
        (state) => {
          try {
            // Validate state
            if (!state) {
              console.warn(`[StateObserver] Received null state for ${sceneKey}`);
              return;
            }

            // Select new state
            let newSelectedState: T;
            try {
              newSelectedState = selector(state);
            } catch (selectorError) {
              console.error(`[StateObserver] Selector error during update for ${sceneKey}:`, selectorError);
              return;
            }
            
            // Get cached previous value
            const prevSelectedState = this.selectorCache[sceneKey];
            
            // Compare using the equality function
            let hasChanged: boolean;
            try {
              hasChanged = !equalityFn(newSelectedState, prevSelectedState);
            } catch (equalityError) {
              console.error(`[StateObserver] Equality function error for ${sceneKey}:`, equalityError);
              // Fall back to simple equality check
              hasChanged = newSelectedState !== prevSelectedState;
            }
            
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
              try {
                onChange(newSelectedState, prevSelectedState);
              } catch (callbackError) {
                console.error(`[StateObserver] Callback error for ${sceneKey}:`, callbackError);
              }
            }
          } catch (error) {
            console.error(`[StateObserver] Unexpected error in subscription for ${sceneKey}:`, error);
          }
        }
      );
      
      // Store the unsubscribe function
      this.subscriptions[sceneKey] = unsubscribe;
      
      if (debug) console.log(`[StateObserver] Successfully subscribed ${sceneKey}`);
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

  /**
   * Enable debugging for a specific subscription
   */
  static enableDebugForSubscription(sceneKey: string): void {
    console.log(`[StateObserver] Debug enabled for ${sceneKey}`);
    console.log(`[StateObserver] Cached value:`, this.selectorCache[sceneKey]);
    console.log(`[StateObserver] Subscription exists:`, !!this.subscriptions[sceneKey]);
  }

  /**
   * Get debug information about all subscriptions
   */
  static getDebugInfo(): Record<string, unknown> {
    return {
      activeSubscriptions: this.getActiveSubscriptions(),
      cacheSize: Object.keys(this.selectorCache).length,
      cacheKeys: Object.keys(this.selectorCache),
      subscriptionCount: Object.keys(this.subscriptions).length
    };
  }

  /**
   * Force refresh a specific subscription
   */
  static forceRefresh(sceneKey: string): void {
    try {
      if (this.subscriptions[sceneKey] && this.selectorCache[sceneKey] !== undefined) {
        // Clear cache to force a refresh
        delete this.selectorCache[sceneKey];
        console.log(`[StateObserver] Force refreshed subscription: ${sceneKey}`);
      } else {
        console.warn(`[StateObserver] Cannot force refresh: ${sceneKey} not found`);
      }
    } catch (error) {
      console.error(`[StateObserver] Error force refreshing ${sceneKey}:`, error);
    }
  }

  /**
   * Add debugging utilities to window for console access
   */
  static addConsoleDebugUtilities(): void {
    if (typeof window !== 'undefined') {
      (window as Window & { StateObserverDebug?: unknown }).StateObserverDebug = {
        getDebugInfo: () => this.getDebugInfo(),
        getActiveSubscriptions: () => this.getActiveSubscriptions(),
        enableDebug: (sceneKey: string) => this.enableDebugForSubscription(sceneKey),
        forceRefresh: (sceneKey: string) => this.forceRefresh(sceneKey),
        unsubscribeAll: () => this.unsubscribeAll(),
        getCacheValue: (sceneKey: string) => this.selectorCache[sceneKey]
      };
      console.log('[StateObserver] Debug utilities added to window.StateObserverDebug');
    }
  }
} 