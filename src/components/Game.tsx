import { useEffect } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";

const Game = () => {
  const turn = useGameStore((state) => state.turn);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: 800,
      height: 600,
      parent: "game-container", // Phaser will auto-create a canvas inside this div
      scene: {
        preload: function () {
          this.load.image("logo", "https://i0.wp.com/eos.org/wp-content/uploads/2023/04/gas-dwarf-exoplanet.png?w=1200&ssl=1");
        },
        create: function () {
          this.add.image(400, 300, "logo");
        },
      },
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [turn]);

  return <div id="game-container" />; // Phaser will create its canvas here
};

export default Game;