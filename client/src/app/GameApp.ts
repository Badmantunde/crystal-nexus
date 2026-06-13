import { CanvasGame } from '@/features/renderer/CanvasGame';
import { SplashScreen } from '@/features/ui/SplashScreen';
import { LevelMap } from '@/features/ui/LevelMap';

/** App shell: splash → level map → gameplay */
export class GameApp {
  private container: HTMLElement;
  private game: CanvasGame | null = null;
  private map: LevelMap;

  constructor(container: HTMLElement) {
    this.container = container;
    this.map = new LevelMap();

    const splash = new SplashScreen();
    splash.show(() => this.openMap());
  }

  dispose(): void {
    this.game?.dispose();
  }

  private openMap(): void {
    this.game?.hide();
    this.map.refresh();
    this.map.show((level) => {
      this.map.hide();
      if (!this.game) {
        this.game = new CanvasGame(this.container);
        this.game.onReturnToMap = () => this.openMap();
      }
      this.game.show();
      this.game.beginLevel(level);
    });
  }
}
