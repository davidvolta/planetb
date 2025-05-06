# Development Checklist


## The Great Animal/Egg Refactor

- [ ] Remove hasEgg property
function tileHasEgg(x: number, y: number): boolean {
  const eggs = get().eggs;
  return Object.values(eggs).some(e => e.position.x === x && e.position.y === y);
}

- [ ] Keep dormant animals for now, but mark them deprecated
export function getAnimals(): Animal[] {
  return useGameStore.getState().animals; // TODO: still includes dormant eggs (migrating soon)
}


And when you hatch an egg:
- Remove from eggs
- Add to animals[] with state = ACTIVE

When spawning an egg:
- Add only to eggs (not animals)


Wherever you’re using:

tile.hasEgg = true;
Replace with:
const hasEgg = tileHasEgg(x, y);

Then remove those fields from the data models once nothing references them.


SUBSCRIPTIONS:
Add StateSubscriptionManager.SUBSCRIPTIONS.EGGS to your subscription keys.


StateSubscriptionManager:
private setupEggSubscriptions(onEggClicked?: (eggId: string, gridX: number, gridY: number) => void): void {
  StateObserver.subscribe(
    StateSubscriptionManager.SUBSCRIPTIONS.EGGS,
    (state) => ({
      eggs: state.eggs,
      activePlayerId: state.activePlayerId,
      fogOfWarEnabled: state.fogOfWarEnabled,
    }),
    ({ eggs, activePlayerId, fogOfWarEnabled }) => {
      if (!eggs) return;

      const eggArray = Object.values(eggs);
      if (!fogOfWarEnabled) {
        // FOW disabled: render all eggs
        this.scene.getAnimalRenderer().renderEggs(eggArray, onEggClicked);
        return;
      }

      // With FOW: only render visible eggs
      const visibleSet = new Set(
        actions.getVisibleTilesForPlayer(activePlayerId).map(({ x, y }) => `${x},${y}`)
      );

      const visibleEggs = eggArray.filter(e =>
        visibleSet.has(`${e.position.x},${e.position.y}`)
      );

      this.scene.getAnimalRenderer().renderEggs(visibleEggs, onEggClicked);
    },
    { immediate: true, debug: false }
  );
}

In Subscription Binder:
this.scene.setupAnimalSubscriptions(...);
this.scene.setupEggSubscriptions(...);

SELECTION:
Case 5 DormantUnit Selction needs to be selectedEggID



  - [ ] Remove `AnimalState` enum and `state` field.
  - [ ] Add `selectEgg(id: string | null)` action; update `evolveAnimal(id)` to remove egg and create Animal.
  - [ ] Replace all `AnimalState.DORMANT` checks with egg lookups; swap `selectedUnitIsDormant` for `selectedEggId`; update renderers, controllers, UI, and subscriptions.
  - [ ] The big issue is that the Subscription for Animals can't be used by Eggs so we need to cerate a new one just for eggs. Which seems strange. I still want to get away from therse.


- Make Animals a Record, not an Array // Use the Animal Registry Approach to Sidechain it
- Make Biomes a Record, not a Map




## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] Combat
- [ ] Evolution
- [ ] LLM 

Bridge step towards refactoring Animals will be that I can do this because no DORMANT exists
export function getActiveAnimals(): Animal[] {
  return useGameStore.getState().animals.filter(a => a.state === AnimalState.ACTIVE);
}