import { StateObserver } from '../utils/stateObserver';
import { Animal, GameState, ValidMove, Habitat } from '../store/gameStore';
import * as actions from '../store/actions';
import { SelectionRenderer } from '../renderers/SelectionRenderer';
import BoardScene from '../scenes/BoardScene';

/**
 * Component interfaces
 * These define the contracts that components must fulfill to receive state updates
 */

/**
 * Interface for a component that can render animals
 */
interface AnimalRenderer {
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
}

/**
 * Interface for a component that can render habitats
 */
interface HabitatRenderer {
  renderHabitats(habitats: Habitat[]): void;
}

/**
 * Interface for a component that can render move ranges
 */
interface MoveRangeRenderer {
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
}

/**
 * Interface for a component that can handle animations
 */
interface AnimationController {
  moveUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options?: {
      onBeforeMove?: () => void;
      onAfterMove?: () => void;
    }
  ): Promise<void>;
  
  displaceUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options?: {
      onBeforeDisplace?: () => void;
      onAfterDisplace?: () => void;
    }
  ): Promise<void>;
}

/**
 * Interface for a component that can update the board
 */
interface TileRenderer {
  createBoardTiles(
    board: { width: number, height: number, tiles: any[][] },
    centerX?: number, 
    centerY?: number
  ): Phaser.GameObjects.GameObject[];
}

/**
 * StateSubscriptionManager
 * 
 * This manager centralizes all state subscriptions for the BoardScene and its components.
 * It provides the following benefits:
 * 
 * 1. Separation of Concerns: Keeps subscription logic separate from rendering logic
 * 2. Data Flow Management: Ensures consistent flow of data from state to components
 * 3. Memory Management: Properly tracks and cleans up subscriptions
 * 4. Organization: Groups subscriptions by functional area (board, entities, interactions)
 * 
 * Using this manager reduces code duplication and ensures that components only 
 * receive the state data they need to function.
 */
export class StateSubscriptionManager {
  // Scene reference
  private scene: Phaser.Scene;
  
  // Renderers and controllers
  private animalRenderer: AnimalRenderer;
  private habitatRenderer: HabitatRenderer;
  private moveRangeRenderer: MoveRangeRenderer;
  private animationController: AnimationController;
  private tileRenderer: TileRenderer;
  
  // Track if subscriptions are set up
  private subscriptionsSetup: boolean = false;
  
  // Define subscription keys to ensure consistency
  private static readonly SUBSCRIPTIONS = {
    // Board state subscriptions
    BOARD: 'StateSubscriptionManager.board',
    
    // Entity state subscriptions
    ANIMALS: 'StateSubscriptionManager.animals',
    HABITATS: 'StateSubscriptionManager.habitats',
    
    // Interaction state subscriptions
    VALID_MOVES: 'StateSubscriptionManager.validMoves',
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
    HABITAT_IMPROVE: 'StateSubscriptionManager.habitatImprove',
    
    // UI state subscriptions
    SELECTED_UNIT: 'StateSubscriptionManager.selectedUnit',
    SELECTED_HABITAT: 'StateSubscriptionManager.selectedHabitat',
    TURN: 'StateSubscriptionManager.turn',
  };
  
  /**
   * Create a new StateSubscriptionManager
   * 
   * @param scene The Phaser scene this manager belongs to
   * @param components The renderers and controllers that will receive state updates
   */
  constructor(
    scene: Phaser.Scene,
    components: {
      animalRenderer: AnimalRenderer;
      habitatRenderer: HabitatRenderer;
      moveRangeRenderer: MoveRangeRenderer;
      animationController: AnimationController;
      tileRenderer: TileRenderer;
    }
  ) {
    this.scene = scene;
    this.animalRenderer = components.animalRenderer;
    this.habitatRenderer = components.habitatRenderer;
    this.moveRangeRenderer = components.moveRangeRenderer;
    this.animationController = components.animationController;
    this.tileRenderer = components.tileRenderer;
  }
  
  /**
   * Set up all state subscriptions
   * 
   * Subscriptions are grouped by functional area:
   * - Board: Game board structure and layout
   * - Entities: Game objects like animals and habitats
   * - Interactions: User interactions and events
   * 
   * @param onUnitClicked Callback for when a unit is clicked
   */
  setupSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    console.log("Setting up BoardScene subscriptions via StateSubscriptionManager");
    
    // ----------------
    // BOARD SUBSCRIPTIONS
    // ----------------
    this.setupBoardSubscriptions();
    
    // ----------------
    // ENTITY SUBSCRIPTIONS
    // ----------------
    this.setupEntitySubscriptions(onUnitClicked);
    
    // ----------------
    // INTERACTION SUBSCRIPTIONS
    // ----------------
    this.setupInteractionSubscriptions();
    
    // Mark subscriptions as set up
    this.subscriptionsSetup = true;
  }
  
  /**
   * Set up subscriptions related to the game board
   */
  private setupBoardSubscriptions(): void {
    // Subscribe to board changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board) => {
        console.log("Board state updated in BoardScene");
        if (board) {
          // Update board using tile renderer
          this.tileRenderer.createBoardTiles(board);
        }
      },
      { immediate: false, debug: false } // Changed from true to false to prevent duplicate creation
    );
  }
  
  /**
   * Set up subscriptions related to game entities (animals, habitats)
   */
  private setupEntitySubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Subscribe to animal changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals) => {
        if (animals) {
          // Render animals using animal renderer
          this.animalRenderer.renderAnimals(animals, onUnitClicked);
        }
      },
      { immediate: true, debug: false } // Set immediate: true to render on subscription
    );
    
    // Subscribe to habitat changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.HABITATS,
      (state) => state.habitats,
      (habitats) => {
        if (habitats) {
          this.habitatRenderer.renderHabitats(habitats);
        }
      },
      { immediate: true, debug: false } // Set immediate: true to render on subscription
    );
  }
  
  /**
   * Set up subscriptions related to user interactions and gameplay events
   */
  private setupInteractionSubscriptions(): void {
    // Subscribe to valid moves changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.VALID_MOVES,
      (state) => ({ 
        validMoves: state.validMoves, 
        moveMode: state.moveMode 
      }),
      (moveState) => {
        if (moveState.moveMode) {
          this.moveRangeRenderer.showMoveRange(moveState.validMoves, moveState.moveMode);
        } else {
          this.moveRangeRenderer.clearMoveHighlights();
        }
      }
    );
    
    // Subscribe to displacement events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.DISPLACEMENT,
      (state) => state.displacementEvent,
      (displacementEvent) => {
        // Only animate if displacement actually occurred and all required values are present
        if (
          displacementEvent && 
          displacementEvent.occurred && 
          displacementEvent.unitId &&
          typeof displacementEvent.fromX === 'number' &&
          typeof displacementEvent.fromY === 'number' &&
          typeof displacementEvent.toX === 'number' &&
          typeof displacementEvent.toY === 'number'
        ) {
          console.log("Displacement event detected in StateSubscriptionManager");
          
          // Call the BoardScene's handleDisplacementEvent method
          if (this.scene instanceof BoardScene) {
            // Use the displacement event data to animate the displacement
            this.scene.handleDisplacementEvent(
              displacementEvent.unitId,
              displacementEvent.fromX,
              displacementEvent.fromY,
              displacementEvent.toX,
              displacementEvent.toY
            );
          } else {
            // If the scene isn't a BoardScene, just clear the event
            actions.clearDisplacementEvent();
          }
        } else if (displacementEvent && displacementEvent.occurred) {
          // If we have an incomplete displacement event, log an error and clear it
          console.error("Incomplete displacement event detected", displacementEvent);
          actions.clearDisplacementEvent();
        }
      }
    );
    
    // Subscribe to spawn events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.SPAWN,
      (state) => state.spawnEvent,
      (spawnEvent) => {
        // Handle spawn events (mainly to update rendering)
        if (spawnEvent && spawnEvent.occurred) {
          console.log("Spawn event detected in StateSubscriptionManager");
          
          // Clear the selection indicator - cast scene to BoardScene to access the method
          if (this.scene instanceof BoardScene) {
            this.scene.getSelectionRenderer().hideSelection();
          }
          
          // Clear the spawn event after handling it
          actions.clearSpawnEvent();
        }
      }
    );
    
    // Subscribe to habitat improvement events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.HABITAT_IMPROVE,
      (state) => state.habitatImproveEvent,
      (habitatImproveEvent) => {
        // Handle habitat improvement events
        if (habitatImproveEvent && habitatImproveEvent.occurred) {
          console.log("Habitat improvement event detected in StateSubscriptionManager");
          
          // Clear the selection indicator - cast scene to BoardScene to access the method
          if (this.scene instanceof BoardScene) {
            this.scene.getSelectionRenderer().hideSelection();
          }
          
          // Clear the habitat improvement event after handling it
          actions.clearHabitatImproveEvent();
        }
      }
    );
  }
  
  /**
   * Clean up all subscriptions
   * This should be called when the scene is shut down to avoid memory leaks
   */
  unsubscribeAll(): void {
    // Unsubscribe from all known subscriptions
    Object.values(StateSubscriptionManager.SUBSCRIPTIONS).forEach(key => {
      StateObserver.unsubscribe(key);
    });
    
    // Reset subscription setup flag
    this.subscriptionsSetup = false;
    
    console.log("All StateSubscriptionManager subscriptions unsubscribed");
  }
  
  /**
   * Check if subscriptions are currently set up
   */
  isSubscribed(): boolean {
    return this.subscriptionsSetup;
  }
  
  /**
   * Get a list of active subscription keys for debugging
   */
  getActiveSubscriptions(): string[] {
    return StateObserver.getActiveSubscriptions();
  }
  
  /**
   * Clean up resources and unsubscribe from all state subscriptions
   */
  destroy(): void {
    this.unsubscribeAll();
  }
} 