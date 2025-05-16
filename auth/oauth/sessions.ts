import { Agent } from "npm:@atproto/api";
import { getIronSession } from "npm:iron-session";
import { oauthClient } from "./client.ts";
import { OauthSession, createSessionOptions } from "../types.ts";

const oauthSessionOptions = createSessionOptions("oauth_sid");

export async function getOauthSessionAgent(
  req: Request
) {
  const res = new Response();
  const session = await getIronSession<OauthSession>(
    req,
    res,
    oauthSessionOptions,
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

export function getOauthSession(
  req: Request,
  res: Response = new Response(),
) {
  return getIronSession<OauthSession>(
    req,
    res,
    oauthSessionOptions,
  );
}
