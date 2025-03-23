# Utilities

This directory contains utility functions and helper classes used throughout the application.

## StateObserver

The `StateObserver` utility provides a bridge between Zustand state management and Phaser scenes. It implements the Observer pattern to allow Phaser components to safely subscribe to state changes without direct dependency on Zustand internals.

### Features

- **Type-safe subscriptions** for different parts of the game state
- **Efficient change detection** with deep equality checking
- **Cached selectors** to prevent unnecessary updates
- **Configurable subscriptions** with custom equality functions
- **Memory-safe** with proper cleanup methods
- **Error handling** to prevent crashes in game scenes

### API

```typescript
// Subscribe to state changes
StateObserver.subscribe<T>(
  sceneKey: string,
  selector: (state: GameState) => T,
  onChange: (selectedState: T, previousState?: T) => void,
  options?: SubscriptionOptions
): () => void;

// Unsubscribe from a specific subscription
StateObserver.unsubscribe(sceneKey: string): void;

// Unsubscribe from all subscriptions
StateObserver.unsubscribeAll(): void;

// Get a list of active subscriptions (for debugging)
StateObserver.getActiveSubscriptions(): string[];
```

### Configuration Options

```typescript
interface SubscriptionOptions {
  // Whether to call onChange immediately with current state
  immediate?: boolean; // default: true
  
  // Custom equality function to determine if state has changed
  equalityFn?: <S>(a: S, b: S) => boolean; // default: deep equality check
  
  // Enables debug logging for this subscription
  debug?: boolean; // default: false
}
```

### Usage Example

See the comprehensive example in [`stateObserverExample.ts`](./stateObserverExample.ts) for detailed usage patterns.

Basic usage:

```typescript
// In your Phaser scene
private setupSubscriptions() {
  // Subscribe to board changes
  StateObserver.subscribe(
    'MyScene.board',
    (state) => state.board,
    (board) => {
      if (board) {
        this.renderBoard(board);
      }
    }
  );
}

// In shutdown or destroy methods
private cleanupSubscriptions() {
  StateObserver.unsubscribe('MyScene.board');
  // Or unsubscribe from all if many subscriptions exist
  // StateObserver.unsubscribeAll();
}
```

### Implementation in BoardScene

For a real-world implementation, see [`BoardScene.ts`](../scenes/BoardScene.ts) which demonstrates the recommended pattern:

1. Define subscription keys as constants
2. Set up all subscriptions in a dedicated method
3. Clean up subscriptions in scene lifecycle methods
4. Use configuration options when needed 