// Re-export all actions from their respective modules
// This provides backward compatibility while organizing code into logical modules

export * from './actions/boardActions';
export * from './actions/playerActions'; 
export * from './actions/animalActions';
export * from './actions/selectionActions';
export * from './actions/eggActions';
export * from './actions/biomeActions';
export * from './actions/resourceActions';
export * from './actions/fogOfWarActions';
export * from './actions/tileActions';
export * from './actions/gameActions';

// Re-export types for backward compatibility
export type { TileResult, TileFilterFn } from './actions/tileActions';