import { Agent } from "npm:@atproto/api";
import { OauthSession, CredSession } from "./types.ts";
import { getCredentialSession, getCredentialSessionAgent } from "./cred/sessions.ts";
import { getOauthSession, getOauthSessionAgent } from "./oauth/sessions.ts";
import { IronSession } from "npm:iron-session";

export async function getSession(
  req: Request,
  res: Response = new Response(),
): Promise<IronSession<OauthSession | CredSession>> {
  const oauthSession = await getOauthSession(req);
  const credentialSession = await getCredentialSession(req, res);

  if (oauthSession) {
    console.log("Oauth session found")
    return oauthSession;
  }
  if (credentialSession) {
    return credentialSession;
  }

  throw new Error("No session found");
}

export async function getSessionAgent(
  req: Request,
  res: Response = new Response(),
): Promise<Agent | null> {
  const oauthAgent = await getOauthSessionAgent(req);
  if (oauthAgent) {
    return oauthAgent;
  }
  const credentialAgent = await getCredentialSessionAgent(req, res);
  if (credentialAgent) {
    return credentialAgent;
  }

  return null;
}
