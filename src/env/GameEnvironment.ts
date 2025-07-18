export type GameMode = 'sim' | 'pvp' | 'pve' | 'pvponline';

export const GameEnvironment = {
  mode: 'pvponline' as GameMode,
  playerConfigs: [
    { name: 'Player 1', color: '#CD31D1' },
    { name: 'Player 2', color: '#12bff2' }
  ],
  boardWidth: 20,
  boardHeight: 20,
  fogOfWarEnabled: true
}; 

