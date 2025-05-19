import { Agent } from "npm:@atproto/api";
import { OauthSession, CredentialSession } from "./types.ts";
import { getCredentialSession, getCredentialSessionAgent } from "./cred/sessions.ts";
import { getOauthSession, getOauthSessionAgent } from "./oauth/sessions.ts";
import { IronSession } from "npm:iron-session";

export async function getSession(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
): Promise<IronSession<OauthSession | CredentialSession>> {
  if (isMigration) {
    return await getCredentialSession(req, res, true);
  }
  const oauthSession = await getOauthSession(req);
  const credentialSession = await getCredentialSession(req, res);

  if (oauthSession.did) {
    console.log("Oauth session found")
    return oauthSession;
  }
  if (credentialSession.did) {
    return credentialSession;
  }

  throw new Error("No session found");
}

export async function getSessionAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
): Promise<Agent | null> {
  if (isMigration) {
    console.log("godgo")
    return await getCredentialSessionAgent(req, res, isMigration);
  }

  const oauthAgent = await getOauthSessionAgent(req);
  const credentialAgent = await getCredentialSessionAgent(req, res, isMigration);

  console.log("Made it")
  if (oauthAgent) {
    console.log("oauthing")
    return oauthAgent;
  } else {
    console.log("boog")
  }
  if (credentialAgent) {
    console.log("creding")
    return credentialAgent;
  } else {
    console.log("soop")
  }

  return null;
}
