/** Shared gamified UI fragments (no emoji characters). */

export function livesPillHtml(count: number): string {
  return `
    <span class="lives-pill">
      <span class="icon-heart" aria-hidden="true"></span>
      <span class="lives-count">x${count}</span>
    </span>
  `;
}

export function starRowHtml(earned: number, max = 3): string {
  return Array.from({ length: max }, (_, i) => {
    const on = i < earned;
    return `<span class="star-icon${on ? ' earned' : ''}" aria-hidden="true"></span>`;
  }).join('');
}

export function difficultyTagHtml(difficulty: string, label: string): string {
  const slug = difficulty.replace('_', '-');
  return `<span class="diff-tag diff-tag-${slug}">${label}</span>`;
}

export function playerChipHtml(initials: string, level: number, rank: string): string {
  return `
    <div class="player-chip">
      <div class="player-avatar" aria-hidden="true">${initials}</div>
      <div class="player-chip-info">
        <span class="player-chip-level">LV ${level}</span>
        <span class="player-chip-rank">${rank}</span>
      </div>
    </div>
  `;
}

export function lockIconHtml(): string {
  return '<span class="icon-lock" aria-hidden="true"></span>';
}
