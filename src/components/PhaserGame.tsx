import { useEffect, useRef } from "react";
import Phaser from "phaser";

const PhaserGame = () => {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      scene: {
        preload: function () {
          this.load.image("logo", "https://phaser.io/images/img.png");
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
  }, []);

  return <div ref={gameRef} />;
};

export default PhaserGame;
