import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const turn = useGameStore((state) => state.turn);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
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
  }, [turn]); // Re-run if turn changes (optional, depends on how turns affect the game)

  return <div id="phaser-container" ref={gameRef} />;
};

export default Game;