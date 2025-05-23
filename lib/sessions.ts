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
    return await getCredentialSessionAgent(req, res, isMigration);
  }

  const oauthAgent = await getOauthSessionAgent(req);
  const credentialAgent = await getCredentialSessionAgent(req, res, isMigration);

  if (oauthAgent) {
    return oauthAgent;
  }

  if (credentialAgent) {
    return credentialAgent;
  }

  return null;
}

export async function destroyAllSessions(req: Request) {
  const oauthSession = await getOauthSession(req);
  const credentialSession = await getCredentialSession(req);
  const migrationSession = await getCredentialSession(req, new Response(), true);

  if (oauthSession.did) {
    oauthSession.destroy();
  }
  if (credentialSession.did) {
    credentialSession.destroy();
  }
  if (migrationSession.did) {
    migrationSession.destroy();
  }
}
