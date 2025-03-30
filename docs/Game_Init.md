# Planet B Game Initialization Flow

## Initialization Sequence

1. **React Application Starts**:
   - `main.tsx` renders the `App` component in StrictMode
   - `App.tsx` renders the `Game` component when on the main route

2. **Game Component Initialization** (`src/components/Game.tsx`):
   - Creates a `useEffect` hook that runs once on component mount
   - Creates a Phaser game instance with `BoardScene` as the main scene
   - Sets up an interval to check for when the BoardScene is ready
   - Attaches event listeners once BoardScene is available

3. **BoardScene Lifecycle** (`src/scenes/BoardScene.ts`):
   - **Constructor**: Initializes managers, controllers and renderers from their respective directories
   - **Preload**: Loads assets and sets up an ASSETS_LOADED event
   - **Init**: Clears previous state, unsubscribes all subscriptions, resets the subscriptionsSetup flag, sets up layers
   - **Create**: Sets up camera controls, gets board data, updates board, sets up subscriptions

4. **Game Component Interaction with BoardScene**:
   - When assets are loaded, the BoardScene emits ASSETS_LOADED
   - Game component listener catches this and calls `actions.initializeBoard()`
   - This triggers the Zustand store update via `useGameStore.getState().initializeBoard()`

5. **State Management and Subscriptions**:
   - BoardScene delegates subscription setup to `StateSubscriptionManager` from `src/managers/`
   - `StateSubscriptionManager.setupSubscriptions()` organizes all state subscriptions
   - Renderers receive state updates through callbacks registered with the StateObserver
   - When state updates happen (like from `actions.initializeBoard()`), they trigger the subscriptions

