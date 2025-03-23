/**
 * StateObserver Example Usage
 * 
 * This file demonstrates the improved StateObserver usage patterns.
 * It's not part of the actual game, just for documentation purposes.
 */

import { StateObserver, SubscriptionOptions } from './stateObserver';
import { GameState, Animal } from '../store/gameStore';

/**
 * Example class that might use StateObserver
 */
class ExampleScene {
  private subscriptionKeys = {
    ANIMALS: 'ExampleScene.animals',
    TURN: 'ExampleScene.turn',
    FILTERED_ANIMALS: 'ExampleScene.filteredAnimals'
  };

  constructor() {
    // Set up subscriptions
    this.setupSubscriptions();
  }

  /**
   * Example of setting up different types of subscriptions
   */
  private setupSubscriptions() {
    // Basic subscription with default options
    StateObserver.subscribe(
      this.subscriptionKeys.TURN,
      (state) => state.turn,
      (turnNumber) => {
        console.log(`Turn changed to: ${turnNumber}`);
      }
    );

    // Subscription with custom equality function
    const animalOptions: SubscriptionOptions = {
      // Only consider animals changed if the count changes
      equalityFn: (a, b) => {
        if (Array.isArray(a) && Array.isArray(b)) {
          return a.length === b.length;
        }
        return a === b;
      },
      debug: true // Enable debug logging
    };

    StateObserver.subscribe(
      this.subscriptionKeys.ANIMALS,
      (state) => state.animals,
      (animals, previousAnimals) => {
        console.log(`Animals changed! New count: ${animals.length}`);
        
        // We can also compare with previous state
        if (previousAnimals) {
          const diff = animals.length - previousAnimals.length;
          console.log(`Difference: ${diff > 0 ? '+' + diff : diff}`);
        }
      },
      animalOptions
    );

    // Complex selector with filtering
    StateObserver.subscribe(
      this.subscriptionKeys.FILTERED_ANIMALS,
      (state) => state.animals.filter(animal => animal.type === 'buffalo'),
      (buffalos) => {
        console.log(`There are now ${buffalos.length} buffalos on the board`);
      },
      { immediate: false } // Don't call immediately on subscribe
    );
  }

  /**
   * Clean up when no longer needed
   */
  destroy() {
    // Unsubscribe from all subscriptions
    Object.values(this.subscriptionKeys).forEach(key => {
      StateObserver.unsubscribe(key);
    });

    // Alternatively, we could just use:
    // StateObserver.unsubscribeAll();
  }
}

// Usage
const example = new ExampleScene();

// Later when done
// example.destroy();

/**
 * Benefits of the improved StateObserver:
 * 1. Better type safety with clear Selector and OnChangeHandler types
 * 2. More efficient change detection with deep equality checking
 * 3. Cached selectors to avoid repeated calculations
 * 4. Support for custom equality functions
 * 5. Debug mode to help track state changes
 * 6. Error handling to prevent crashes
 * 7. Access to previous state values
 */ 