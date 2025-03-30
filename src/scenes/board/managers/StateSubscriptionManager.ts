import { StateObserver } from '../../../utils/stateObserver';
import { Animal, GameState, ValidMove, Habitat } from '../../../store/gameStore';
import * as actions from '../../../store/actions';

// Type for a component that can render animals
interface AnimalRenderer {
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
}

// Type for a component that can render habitats
interface HabitatRenderer {
  renderHabitats(habitats: Habitat[]): void;
}

// Type for a component that can render move ranges
interface MoveRangeRenderer {
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
}

// Type for a component that can handle animations
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

// Type for a component that can update the board
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
 * Manages all state subscriptions for the BoardScene and its components.
 * This centralizes the subscription logic and ensures proper data flow from
 * the global state to the appropriate renderers and controllers.
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
    BOARD: 'StateSubscriptionManager.board',
    ANIMALS: 'StateSubscriptionManager.animals',
    HABITATS: 'StateSubscriptionManager.habitats',
    VALID_MOVES: 'StateSubscriptionManager.validMoves',
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
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
   * @param onUnitClicked Callback for when a unit is clicked
   */
  setupSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    console.log("Setting up BoardScene subscriptions via StateSubscriptionManager");
    
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
      { immediate: false } // Set immediate: false to prevent rendering on subscription
    );
    
    // Subscribe to animal changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals) => {
        if (animals) {
          // Render animals using animal renderer
          this.animalRenderer.renderAnimals(animals, onUnitClicked);
        }
      }
    );
    
    // Subscribe to displacement events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.DISPLACEMENT,
      (state) => state.displacementEvent,
      (displacementEvent) => {
        // Only animate if displacement actually occurred
        if (displacementEvent && displacementEvent.occurred && displacementEvent.unitId) {
          console.log("Handling displacement event in StateSubscriptionManager");
          
          // At this point, the actual displacement event handling should be delegated
          // to the parent scene which has more context about how to handle it
          // So we'll keep this simpler until we refactor the BoardScene more thoroughly
          
          // Just clear the displacement event
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
          // We just need to make sure the animal renderer updates
          // after a spawn event occurs - this will happen automatically
          // due to the animals subscription
          
          // Clear the spawn event after handling it
          actions.clearSpawnEvent();
        }
      }
    );
    
    // Subscribe to habitat changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.HABITATS,
      (state) => state.habitats,
      (habitats) => {
        if (habitats) {
          this.habitatRenderer.renderHabitats(habitats);
        }
      }
    );
    
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
    
    // Mark subscriptions as set up
    this.subscriptionsSetup = true;
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
} 