import './style.css';
import { GameApp } from './app/GameApp';

const container = document.getElementById('game-container');
if (!container) {
  throw new Error('Missing #game-container element');
}

try {
  const app = new GameApp(container);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => app.dispose());
  }
} catch (err) {
  console.error('Failed to start CRYSTAL NEXUS:', err);
  container.innerHTML = `<div style="color:#fff;padding:24px;font-family:Inter,system-ui,sans-serif">
    <h2>Game failed to load</h2>
    <pre>${err instanceof Error ? err.message : String(err)}</pre>
  </div>`;
}
