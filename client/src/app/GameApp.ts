import { CanvasGame } from '@/features/renderer/CanvasGame';
import { GuideOnboarding, needsOnboarding } from '@/features/ui/GuideOnboarding';
import { SplashScreen } from '@/features/ui/SplashScreen';
import { LevelMap } from '@/features/ui/LevelMap';

/** App shell: splash → onboarding → level map → gameplay */
export class GameApp {
  private container: HTMLElement;
  private game: CanvasGame | null = null;
  private map: LevelMap;
  private onboarding = new GuideOnboarding();

  constructor(container: HTMLElement) {
    this.container = container;
    this.map = new LevelMap();
    this.map.setOnDayChallengePlay(() => this.startDayChallenge());

    const splash = new SplashScreen();
    splash.show(() => {
      if (needsOnboarding()) {
        this.onboarding.show(() => this.openMap());
      } else {
        this.openMap();
      }
    });
  }

  dispose(): void {
    this.game?.dispose();
  }

  private openMap(): void {
    this.game?.hide();
    this.map.refresh();
    this.map.show((level) => {
      this.map.hide();
      this.ensureGame();
      this.game!.show();
      this.game!.beginLevel(level);
    });
  }

  private startDayChallenge(): void {
    this.map.hide();
    this.ensureGame();
    this.game!.show();
    this.game!.beginDayChallenge();
  }

  private ensureGame(): void {
    if (!this.game) {
      this.game = new CanvasGame(this.container);
      this.game.onReturnToMap = () => this.openMap();
    }
  }
}
