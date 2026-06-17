/** Shared gamified UI fragments (no emoji characters). */

import { formatRegenCountdown } from '../player/Lives';

export const STAR_ACTIVE_URL = '/star-active.svg';
export const STAR_INACTIVE_URL = '/star-inactive.svg';
export const LIVE_URL = '/live.svg';
export const LIVE_LOST_URL = '/live-lost.svg';

export function livesPillHtml(count: number, nextRegenMs: number | null = null): string {
  const empty = count === 0;
  const icon = empty ? LIVE_LOST_URL : LIVE_URL;
  const countdown = nextRegenMs !== null ? formatRegenCountdown(nextRegenMs) : null;

  return `
    <span class="lives-pill${empty ? ' lives-pill-empty' : ''}">
      <img src="${icon}" class="icon-live${empty ? ' icon-live-lost' : ''}" width="22" height="22" alt="" aria-hidden="true" />
      ${
        empty
          ? `<span class="lives-countdown" title="Next life in">${countdown ?? '5:00'}</span>`
          : `<span class="lives-count">x${count}</span>`
      }
    </span>
  `;
}

export function starIconHtml(earned: boolean, size = 14): string {
  const src = earned ? STAR_ACTIVE_URL : STAR_INACTIVE_URL;
  return `<img src="${src}" class="star-icon${earned ? ' earned' : ''}" width="${size}" height="${size}" alt="" aria-hidden="true" />`;
}

export function starRowHtml(earned: number, max = 3): string {
  return Array.from({ length: max }, (_, i) => starIconHtml(i < earned)).join('');
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
