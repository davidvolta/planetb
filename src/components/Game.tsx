import { useEffect } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";

const Game = () => {
  const turn = useGameStore((state) => state.turn);

  useEffect(() => {
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: 800,
      height: 600,
      canvas: canvas, // Attach Phaser to existing canvas
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

  return null; // No need to return a div since the canvas is already in HTML
};

export default Game;
