import { useEffect } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import BoardScene from "../scenes/BoardScene";

const Game = () => {
  const turn = useGameStore((state) => state.turn);

  useEffect(() => {
    // Make game responsive and fullscreen
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "game-container",
      scene: [BoardScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);

    // Handle window resize
    const resizeGame = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resizeGame);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', resizeGame);
      game.destroy(true);
    };
  }, []); // Empty dependency array to prevent recreation on state changes

  return <div id="game-container" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }} />;
};

export default Game;