import * as actions from '../store/actions';

export class RoundController {
  static startNewRound(): void {
    const nextTurnFn = actions.getNextTurn();
    nextTurnFn();
    const players = actions.getPlayers();
    if (players.length > 0) {
      actions.setActivePlayer(players[0].id); // Reset to first player
    } else {
      console.error('No players found when starting new round!');
    }
  }
} 