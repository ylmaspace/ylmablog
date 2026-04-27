export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(event, cb) { if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(cb); }
  emit(event, payload) { (this.listeners.get(event) || []).forEach((cb) => cb(payload)); }
}
export const EVENTS = new EventBus();
