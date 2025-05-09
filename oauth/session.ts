import { Agent } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { FreshContext } from "$fresh/server.ts";
import { oauthClient } from "./client.ts";

export interface Session {
  did: string;
}

export interface State {
  session?: Session;
  sessionUser?: Agent;
}

const cookieSecret = Deno.env.get("COOKIE_SECRET")

const sessionOptions: SessionOptions = {
  cookieName: "sid",
  password: cookieSecret!,
  cookieOptions: {
    secure: Deno.env.get("NODE_ENV") === "production",
    httpOnly: true,
    sameSite: true,
    path: "/",
    // Don't set domain explicitly - let browser determine it
    domain: undefined,
  },
};

export async function getSessionAgent(
  req: Request,
  ctx: FreshContext,
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
    const logger = ctx.state.logger as {
      warn: (obj: Record<string, unknown>, msg: string) => void;
    };
    logger.warn({ err }, "oauth restore failed");
    await session.destroy();
    return null;
  }
}

export function getSession(req: Request, res: Response = new Response()) {
  return getIronSession<Session>(req, res, sessionOptions);
}
