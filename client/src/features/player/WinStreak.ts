const KEY = 'cn-win-streak';

export function getWinStreak(): number {
  const raw = localStorage.getItem(KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function recordWin(): number {
  const next = getWinStreak() + 1;
  localStorage.setItem(KEY, String(next));
  return next;
}

export function recordLoss(): void {
  localStorage.setItem(KEY, '0');
}

export function winStreakLabel(streak: number): string {
  if (streak < 2) return '';
  if (streak >= 5) return `🔥 ${streak} win frenzy!`;
  return `🔥 ${streak} wins in a row!`;
}
