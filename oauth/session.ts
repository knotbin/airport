import { Agent } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { oauthClient } from "./client.ts";

export interface Session {
  did: string;
  newAccountDid?: string;
}

export interface MigrationSession {
  did: string;
  handle: string;
  service: string;
  password: string;
  recoveryKey?: string;
  recoveryKeyDid?: string;
  credentials?: {
    rotationKeys: string[];
    [key: string]: unknown;
  };
}

export interface State {
  session?: Session;
  sessionUser?: Agent;
  migrationSession?: MigrationSession;
  migrationAgent?: Agent;
}

const cookieSecret = Deno.env.get("COOKIE_SECRET");
console.log("COOKIE_SECRET", cookieSecret);

const sessionOptions: SessionOptions = {
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

const migrationSessionOptions: SessionOptions = {
  cookieName: "migration_sid",
  password: cookieSecret!,
  cookieOptions: {
    secure: Deno.env.get("NODE_ENV") === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    domain: undefined,
  },
};

export async function getSessionAgent(
  req: Request
) {
  const res = new Response();
  const session = await getIronSession<Session>(
    req,
    res,
    sessionOptions,
  );

  if (!session.did) {
    return null;
  }

  try {
    const oauthSession = await oauthClient.restore(session.did);
    return oauthSession ? new Agent(oauthSession) : null;
  } catch (err) {
    console.warn({ err }, "oauth restore failed");
    session.destroy();
    return null;
  }
}

export function getSession(req: Request, res: Response = new Response()) {
  return getIronSession<Session>(req, res, sessionOptions);
}

export function getMigrationSession(
  req: Request,
  res: Response = new Response(),
) {
  return getIronSession<MigrationSession>(req, res, migrationSessionOptions);
}

export async function getMigrationAgent(
  req: Request,
  res: Response = new Response(),
) {
  const session = await getMigrationSession(req, res);
  if (!session.did || !session.service) {
    return null;
  }

  try {
    return new Agent({
      service: session.service,
    });
  } catch (err) {
    console.warn("Failed to create migration agent:", err);
    session.destroy();
    return null;
  }
}

export async function setMigrationSession(
  req: Request,
  res: Response,
  data: MigrationSession,
) {
  const session = await getMigrationSession(req, res);
  session.did = data.did;
  session.handle = data.handle;
  session.service = data.service;
  session.password = data.password;
  await session.save();
  return session;
}

export async function getMigrationSessionAgent(
  req: Request,
  res: Response = new Response(),
) {
  const session = await getMigrationSession(req, res);
  console.log("Migration session data:", {
    hasDid: !!session.did,
    hasService: !!session.service,
    hasHandle: !!session.handle,
    hasPassword: !!session.password,
    sessionData: session,
  });

  if (
    !session.did || !session.service || !session.handle || !session.password
  ) {
    console.log("Missing required session data");
    return null;
  }

  try {
    console.log("Creating agent with service:", session.service);
    const agent = new Agent({ service: session.service });

    // Attempt to restore session by creating a new one
    try {
      console.log("Attempting to create session for:", session.handle);
      const sessionRes = await agent.com.atproto.server.createSession({
        identifier: session.handle,
        password: session.password,
      });
      console.log("Session created successfully:", !!sessionRes);

      // Set the auth tokens in the agent
      agent.setHeader("Authorization", `Bearer ${sessionRes.data.accessJwt}`);

      return agent;
    } catch (err) {
      // Session creation failed, clear the session
      console.error("Failed to create session:", err);
      await session.destroy();
      return null;
    }
  } catch (err) {
    console.warn("Failed to create migration agent:", err);
    await session.destroy();
    return null;
  }
}
