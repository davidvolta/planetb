# Planet B Game Initialization Flow

## Initialization Sequence

1. **Application Starts**:
   - The browser loads `index.html` which includes the main script
   - `index.ts` is the entry point that initializes the game

2. **Game Initialization** (`src/game.ts`):
   - Creates a Phaser game instance with the required scenes (BoardScene, DebugScene, UIScene)
   - Sets up state observers to sync the game state with Phaser
   - Initializes event listeners for asset loading

3. **BoardScene Lifecycle** (`src/scenes/BoardScene.ts`):
   - **Constructor**: Initializes managers, controllers and renderers from their respective directories
   - **Preload**: Loads assets and sets up an ASSETS_LOADED event
   - **Init**: Clears previous state, unsubscribes all subscriptions, resets the subscriptionsSetup flag, sets up layers
   - **Create**: Sets up camera controls, gets board data, updates board, sets up subscriptions

4. **Game Interaction with BoardScene**:
   - When assets are loaded, the BoardScene emits ASSETS_LOADED
   - The game listens for this event and calls `initializeGameBoard()`
   - This triggers the Zustand store update via `actions.initializeBoard()`

5. **Biome Generation and Resource Initialization**:
   - During board initialization, the game creates a biome-centric structure:
     - Terrain is generated first using the specified map type
     - Voronoi nodes are placed to define biome centers
     - Biomes are generated with embedded habitat structures
     - Each biome tracks its own lushness, production rate, and owner
   - After biome initialization, `EcosystemController.generateResources()` is called to:
     - Generate resources appropriate to each biome's terrain
     - Link resources to their parent biomes
     - Distribute resources based on terrain compatibility

6. **State Management and Subscriptions**:
   - BoardScene delegates subscription setup to `StateSubscriptionManager` from `src/managers/`
   - `StateSubscriptionManager.setupSubscriptions()` organizes all state subscriptions
   - Renderers receive state updates through callbacks registered with the StateObserver
   - When state updates happen (like from `actions.initializeBoard()`), they trigger the subscriptions


