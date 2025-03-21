import { useEffect } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import BoardScene from "../scenes/BoardScene";

const Game = () => {
  const turn = useGameStore((state) => state.turn);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: 800,
      height: 600,
      parent: "game-container", // Phaser will auto-create a canvas inside this div
      scene: [BoardScene],
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [turn]);

  return <div id="game-container" />; // Phaser will create its canvas here
};

export default Game;