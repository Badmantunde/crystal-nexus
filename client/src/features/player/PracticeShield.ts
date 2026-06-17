const STORAGE_KEY = 'crystal-nexus-practice-shield';
export const PRACTICE_SHIELD_MAX_LEVEL = 5;

interface PracticeData {
  used: Record<string, boolean>;
}

function load(): PracticeData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PracticeData;
      return { used: parsed.used && typeof parsed.used === 'object' ? parsed.used : {} };
    } catch {
      /* fall through */
    }
  }
  return { used: {} };
}

function save(data: PracticeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Levels 1–5: first fail/quit does not cost a life. */
export function hasPracticeShield(level: number): boolean {
  if (level < 1 || level > PRACTICE_SHIELD_MAX_LEVEL) return false;
  const data = load();
  return !data.used[String(level)];
}

export function consumePracticeShield(level: number): boolean {
  if (!hasPracticeShield(level)) return false;
  const data = load();
  data.used[String(level)] = true;
  save(data);
  return true;
}

export function isPracticeLevel(level: number): boolean {
  return level >= 1 && level <= PRACTICE_SHIELD_MAX_LEVEL;
}
