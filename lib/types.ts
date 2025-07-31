import { SessionOptions as BaseSessionOptions } from "npm:iron-session";

/**
 * The session options.
 * @type {SessionOptions}
 * @implements {BaseSessionOptions}
 */
interface SessionOptions extends BaseSessionOptions {
  lockFn?: (key: string) => Promise<() => Promise<void>>;
}

/**
 * Create a lock using Deno KV.
 * @param key - The key to lock
 * @param db - The Deno KV instance for the database
 * @returns The unlock function
 */
async function createLock(
  key: string,
  db: Deno.Kv,
): Promise<() => Promise<void>> {
  const lockKey = ["session_lock", key];
  const lockValue = Date.now();

  // Try to acquire lock
  const result = await db.atomic()
    .check({ key: lockKey, versionstamp: null }) // Only if key doesn't exist
    .set(lockKey, lockValue, { expireIn: 5000 }) // 5 second TTL
    .commit();

  if (!result.ok) {
    throw new Error("Failed to acquire lock");
  }

  // Return unlock function
  return async () => {
    await db.delete(lockKey);
  };
}

/**
 * The OAuth session.
 * @type {OauthSession}
 */
export interface OauthSession {
  did: string;
}

/**
 * The credential session.
 * @type {CredentialSession}
 */
export interface CredentialSession {
  did: string;
  handle: string;
  service: string;
  password: string;
  accessJwt?: string;
  recoveryKey?: string;
  recoveryKeyDid?: string;
  credentials?: {
    rotationKeys: string[];
    [key: string]: unknown;
  };
}

let db: Deno.Kv;

/**
 * Create the session options.
 * @param cookieName - The name of the iron session cookie
 * @returns The session options for iron session
 */
export const createSessionOptions = async (
  cookieName: string,
): Promise<SessionOptions> => {
  const cookieSecret = Deno.env.get("COOKIE_SECRET");
  if (!cookieSecret) {
    throw new Error("COOKIE_SECRET is not set");
  }

  if (!db) {
    db = await Deno.openKv();
  }

  return {
    cookieName: cookieName,
    password: cookieSecret,
    cookieOptions: {
      secure: Deno.env.get("NODE_ENV") === "production" ||
        Deno.env.get("NODE_ENV") === "staging",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      domain: undefined,
    },
    lockFn: (key: string) => createLock(key, db),
  };
};
