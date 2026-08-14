// Jednoduchý EventEmitter + globální sběrnice událostí hry.
// Události: "start-game", "restart-game", "game-over", "current-scene-ready",
// "player-shoot", "player-jump", "player-hit", "bot-killed", "player-died",
// "pickup-collected", "power-used", ...
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn, context) {
    const list = this.listeners.get(event) ?? [];
    list.push({ fn, context, once: false });
    this.listeners.set(event, list);
    return this;
  }

  once(event, fn, context) {
    const list = this.listeners.get(event) ?? [];
    list.push({ fn, context, once: true });
    this.listeners.set(event, list);
    return this;
  }

  off(event, fn, context) {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }
    const filtered = this.listeners
      .get(event)
      ?.filter((l) => l.fn !== fn || (context !== undefined && l.context !== context));
    if (filtered?.length) this.listeners.set(event, filtered);
    else this.listeners.delete(event);
    return this;
  }

  emit(event, ...args) {
    const list = this.listeners.get(event);
    if (!list?.length) return false;
    const keep = list.filter((l) => !l.once);
    if (keep.length) this.listeners.set(event, keep);
    else this.listeners.delete(event);
    for (const l of list) l.fn.apply(l.context, args);
    return true;
  }

  removeAllListeners(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
    return this;
  }
}

EventBus.prototype.addListener = EventBus.prototype.on;
EventBus.prototype.removeListener = EventBus.prototype.off;

export const bus = new EventBus();
