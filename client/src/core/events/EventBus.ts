type EventCallback<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return () => this.off(event, callback as EventCallback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameEvents = {
  MATCH_FOUND: 'match:found',
  CASCADE_COMPLETE: 'cascade:complete',
  SCORE_UPDATED: 'score:updated',
  MOVES_UPDATED: 'moves:updated',
  LEVEL_COMPLETE: 'level:complete',
  LEVEL_FAILED: 'level:failed',
  CRYSTAL_SELECTED: 'crystal:selected',
  CRYSTAL_SWAPPED: 'crystal:swapped',
  COMBO_TRIGGERED: 'combo:triggered',
  ABILITY_ACTIVATED: 'ability:activated',
  BOSS_ATTACK: 'boss:attack',
  GRAVITY_CHANGED: 'gravity:changed',
  FUSION_CREATED: 'fusion:created',
} as const;
