import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "jsr:@bigmoves/atproto-oauth-client";

export class StateStore implements NodeSavedStateStore {
  constructor(private db: Deno.Kv) {}
  async get(key: string): Promise<NodeSavedState | undefined> {
    const result = await this.db.get<NodeSavedState>(["auth_state", key]);
    return result.value ?? undefined;
  }
  async set(key: string, val: NodeSavedState) {
    await this.db.set(["auth_state", key], val);
  }
  async del(key: string) {
    await this.db.delete(["auth_state", key]);
  }
}

export class SessionStore implements NodeSavedSessionStore {
  constructor(private db: Deno.Kv) {}
  async get(key: string): Promise<NodeSavedSession | undefined> {
    const result = await this.db.get<NodeSavedSession>(["auth_session", key]);
    return result.value ?? undefined;
  }
  async set(key: string, val: NodeSavedSession) {
    await this.db.set(["auth_session", key], val);
  }
  async del(key: string) {
    await this.db.delete(["auth_session", key]);
  }
}
