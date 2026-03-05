// Browser-only WebSocket singleton for Polygon.io real-time data streaming.
// Safe to import in client components — SSR is handled via typeof window guard.

import type { PolygonWsStatus } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY ?? '';
const WS_URL = 'wss://socket.polygon.io/stocks';

type EventListener = (data: unknown) => void;

class PolygonWebSocketManager {
  private ws: WebSocket | null = null;
  private status: PolygonWsStatus = 'disconnected';
  private subscriptions = new Set<string>();
  private listeners = new Map<string, Set<EventListener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private readonly maxDelay = 30000;

  connect() {
    if (!API_KEY) {
      this.status = 'disconnected';
      this._emit('status', this.status);
      return;
    }
    if (this.status !== 'disconnected') return;
    this.status = 'connecting';
    this._emit('status', this.status);
    this._openWs();
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const prevStatus = this.status;
    this.status = 'disconnected';
    if (this.ws) {
      this.ws.onclose = null; // prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }
    if (prevStatus !== 'disconnected') {
      this._emit('status', this.status);
    }
  }

  subscribe(channels: string[]) {
    channels.forEach((c) => this.subscriptions.add(c));
    if (this.status === 'authenticated' && this.ws && channels.length > 0) {
      this.ws.send(JSON.stringify({ action: 'subscribe', params: channels.join(',') }));
    }
  }

  unsubscribe(channels: string[]) {
    channels.forEach((c) => this.subscriptions.delete(c));
    if (this.status === 'authenticated' && this.ws && channels.length > 0) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', params: channels.join(',') }));
    }
  }

  on(eventType: string, listener: EventListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: string, listener: EventListener) {
    this.listeners.get(eventType)?.delete(listener);
  }

  getStatus(): PolygonWsStatus {
    return this.status;
  }

  private _openWs() {
    if (typeof window === 'undefined') return;

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Polygon sends a "connected" status message first; auth is sent in onmessage
    };

    ws.onmessage = (event: MessageEvent) => {
      let messages: Array<Record<string, unknown>>;
      try {
        messages = JSON.parse(event.data as string) as Array<Record<string, unknown>>;
        if (!Array.isArray(messages)) return;
      } catch {
        return;
      }

      messages.forEach((msg) => {
        const ev = msg.ev as string;

        if (ev === 'status') {
          const s = msg.status as string;
          if (s === 'connected') {
            // Handshake: send auth
            this.status = 'connected';
            this._emit('status', this.status);
            ws.send(JSON.stringify({ action: 'auth', params: API_KEY }));
          } else if (s === 'auth_success') {
            this.status = 'authenticated';
            this._emit('status', this.status);
            // Re-subscribe to all pending channels
            if (this.subscriptions.size > 0) {
              ws.send(
                JSON.stringify({
                  action: 'subscribe',
                  params: Array.from(this.subscriptions).join(','),
                })
              );
            }
          } else if (s === 'auth_failed') {
            // Auth rejected — shut down cleanly, do NOT reconnect.
            // This happens when the plan doesn't include WebSocket access.
            console.warn('[PolygonWS] Auth failed — WebSocket disabled. REST data still active.');
            this.status = 'disconnected';
            this._emit('status', this.status);
            ws.onclose = null; // prevent the reconnect loop
            ws.close();
            this.ws = null;
          }
        } else {
          // Trade (T), Quote (Q), Aggregate (AM), etc.
          this._emit(ev, msg);
        }
      });
    };

    ws.onerror = () => {
      // onclose fires next and handles reconnect
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.status !== 'disconnected') {
        this.status = 'connecting';
        this._emit('status', this.status);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this._openWs();
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      }
    };
  }

  private _emit(eventType: string, data: unknown) {
    this.listeners.get(eventType)?.forEach((fn) => fn(data));
  }
}

let instance: PolygonWebSocketManager | null = null;

export function getPolygonWS(): PolygonWebSocketManager {
  if (typeof window === 'undefined') {
    // SSR: return a no-op stub so server render doesn't throw
    return new PolygonWebSocketManager();
  }
  if (!instance) {
    instance = new PolygonWebSocketManager();
  }
  return instance;
}

export type { PolygonWebSocketManager };
