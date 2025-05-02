# Development Checklist

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] setupSubscriptions() is now likely redundant if you're fully using SubscriptionBinder. You can safely delete it unless you're still calling it from somewhere else.

- [ ] setupInputHandlers() might also be removable now that InputBinder handles input binding.

- [ ] delete private controlsSetup = false;
- [ ] private subscriptionsSetup = false;

--

- [ ] Remove usegamestore from Debugscene
