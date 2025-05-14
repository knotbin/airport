import { Agent, AtpAgent, AtpSessionData, AtpSessionEvent, CredentialSession } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { FreshContext } from "$fresh/server.ts";
import { oauthClient } from "./client.ts";

export interface SessionData {
  did: string;
  service?: string;
  accessJwt?: string;
  refreshJwt?: string;
  isOAuth?: boolean;
  atpSession?: AtpSessionData;
  // Add a timestamp to track session age
  lastRefreshed?: number;
}

export interface Session {
  old?: SessionData;
  new?: SessionData;
  isMigrated?: boolean;
}

// Only used for returning migration data to the client, never stored
export interface MigrationResult {
  did: string;
  handle: string;
  recoveryKey?: string;
  credentials?: {
    rotationKeys: string[];
    [key: string]: unknown;
  };
}

const cookieSecret = Deno.env.get("COOKIE_SECRET")

export const sessionOptions: SessionOptions = {
  cookieName: "sid",
  password: cookieSecret!,
  cookieOptions: {
    secure: Deno.env.get("NODE_ENV") === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    domain: undefined,
  },
};

// Cache agents to prevent creating new ones for the same session
const agentCache = new Map<string, {
  agent: Agent | AtpAgent,
  credentialSession?: CredentialSession,
  expiresAt: number
}>();

// Minimum time between session refreshes (5 minutes)
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000;

export async function getSessionAgent(
  req: Request,
  ctx: FreshContext,
  useNewSession: boolean = false
) {
  const res = new Response();
  
  const session = await getIronSession<Session>(
    req,
    res,
    sessionOptions
  );

  const sessionData = useNewSession ? session.new : session.old;
  if (!sessionData?.did) {
    return null;
  }

  // Check the cache first
  const cacheKey = `${sessionData.did}-${useNewSession ? 'new' : 'old'}`;
  const cached = agentCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.agent;
  }

  try {
    let agent = null;
    const now = Date.now();
    const shouldRefresh = !sessionData.lastRefreshed || 
                          (now - sessionData.lastRefreshed) > MIN_REFRESH_INTERVAL;

    // If the session is fresh enough, skip refreshing
    if (!shouldRefresh && sessionData.atpSession) {
      // Create agent without actually refreshing the session
      if (sessionData.isOAuth) {
        try {
          const oauthSession = await oauthClient.restore(sessionData.did);
          if (oauthSession) {
            agent = new Agent(oauthSession);
          }
        } catch (err) {
          // Failed to get cached OAuth client
        }
      } else if (sessionData.service) {
        agent = new AtpAgent({ service: sessionData.service });
        await agent.resumeSession(sessionData.atpSession);
      }
      
      if (agent) {
        // Cache the agent
        agentCache.set(cacheKey, {
          agent,
          expiresAt: now + MIN_REFRESH_INTERVAL
        });
        return agent;
      }
    }

    // Actually refresh the session if needed
    if (sessionData.isOAuth) {
      try {
        const oauthSession = await oauthClient.restore(sessionData.did);
        if (!oauthSession) {
          return null;
        }
        agent = new Agent(oauthSession);
        
        // Update the last refreshed timestamp
        sessionData.lastRefreshed = now;
        await session.save();
        
        // Cache the agent
        agentCache.set(cacheKey, {
          agent,
          expiresAt: now + MIN_REFRESH_INTERVAL
        });
        
        return agent;
      } catch (err) {
        return null;
      }
    }

    // For regular auth, try to resume session with the stored tokens
    if (sessionData.atpSession && sessionData.service) {
      // Check if we have a cached CredentialSession
      let credentialSession = cached?.credentialSession;
      
      if (!credentialSession) {
        // Create new CredentialSession if not cached
        credentialSession = new CredentialSession(new URL(sessionData.service), undefined, (evt: AtpSessionEvent, sess?: AtpSessionData) => {
          if (evt === 'create' || evt === 'update') {
            sessionData.atpSession = sess;
            sessionData.lastRefreshed = Date.now();
            
            // Use setTimeout to avoid blocking the response
            setTimeout(() => {
              session.save().catch(err => {});
            }, 0);
          } else if (evt === 'expired') {
            if (useNewSession) {
              session.new = undefined;
            } else {
              session.old = undefined;
            }
            
            // Use setTimeout to avoid blocking the response
            setTimeout(() => {
              session.save().catch(err => {});
              agentCache.delete(cacheKey);
            }, 0);
          }
        });
      }

      try {
        // Only resume if we don't have a cached session or if it needs refresh
        if (!credentialSession || shouldRefresh) {
          await credentialSession.resumeSession(sessionData.atpSession);
        }
        
        // Create a new Agent directly from the CredentialSession
        agent = new Agent(credentialSession);
        
        // Cache both the agent and the credential session
        agentCache.set(cacheKey, {
          agent,
          credentialSession,
          expiresAt: now + MIN_REFRESH_INTERVAL
        });
        
        return agent;
      } catch {
        // Clear the session on failure
        if (useNewSession) {
          session.new = undefined;
        } else {
          session.old = undefined;
        }
        agentCache.delete(cacheKey);
        await session.save();
        return null;
      }
    }

    // If we get here, we couldn't restore the session
    if (useNewSession) {
      session.new = undefined;
    } else {
      session.old = undefined;
    }
    agentCache.delete(cacheKey);
    await session.save();
    return null;
  } catch (err) {
    // Clear the session on any error
    if (useNewSession) {
      session.new = undefined;
    } else {
      session.old = undefined;
    }
    const cacheKey = `${sessionData.did}-${useNewSession ? 'new' : 'old'}`;
    agentCache.delete(cacheKey);
    await session.save();
    return null;
  }
}

// Implement a method to pre-fetch client for OAuth
export async function preloadOAuthClient(did: string) {
  try {
    await oauthClient.restore(did);
    return true;
  } catch {
    return false;
  }
}

// The rest of your code (getSession, getSessions, setRegularSession) remains the same
export async function getSession(
  req: Request,
  res: Response = new Response(),
  useNewSession: boolean = false
) {
  const sessions = await getIronSession<Session>(req, res, sessionOptions);

  if (useNewSession) {
    return sessions.new;
  } else {
    return sessions.old;
  }
}

export async function getSessions(
  req: Request,
  res: Response = new Response()
) {
  return await getIronSession<Session>(req, res, sessionOptions);
}

// Helper to set regular auth session
export async function setRegularSession(
  req: Request,
  res: Response,
  data: {
    did: string;
    service: string;
    isOAuth?: boolean;
    isNewSession?: boolean;
    isMigrated?: boolean;
    atpSession?: AtpSessionData;
  }
) {
  const session = await getSessions(req, res);
  const sessionData: SessionData = {
    did: data.did,
    service: data.service,
    isOAuth: data.isOAuth,
    atpSession: data.atpSession,
    lastRefreshed: Date.now()
  };

  if (data.isNewSession) {
    session.new = sessionData;
  } else {
    session.old = sessionData;
  }

  if (data.isMigrated) {
    session.isMigrated = true;
  }

  await session.save();
  return session;
}
