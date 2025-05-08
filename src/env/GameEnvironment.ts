export type GameMode = 'sim' | 'pvp' | 'pve';

export const GameEnvironment = {
  mode: 'pvp' as GameMode,
  playerConfigs: [
    { name: 'Player 1', color: '#db3007' },
    { name: 'Player 2', color: '#12bff2' }
  ],
  boardWidth: 30,
  boardHeight: 30,
  fogOfWarEnabled: true
}; 