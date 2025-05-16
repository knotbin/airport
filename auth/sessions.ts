import { Agent } from "npm:@atproto/api";
import { OauthSession, CredentialSession, createSessionOptions } from "./types.ts";
import { getCredentialSession, getCredentialSessionAgent } from "./creds/sessions.ts";
import { getOauthSession, getOauthSessionAgent } from "./oauth/sessions.ts";
import { IronSession } from "npm:iron-session";

const migrationSessionOptions = createSessionOptions("migration_sid");
const credentialSessionOptions = createSessionOptions("cred_sid");

export async function getSession(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
): Promise<IronSession<OauthSession | CredentialSession>> {
  if (isMigration) {
    return await getCredentialSession(req, res, migrationSessionOptions);
  }
  const oauthSession = await getOauthSession(req);
  const credentialSession = await getCredentialSession(req, res, credentialSessionOptions);

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
  isMigration: boolean = false
): Promise<Agent | null> {
  if (isMigration) {
    return await getCredentialSessionAgent(req, res, isMigration);
  }

  const oauthAgent = await getOauthSessionAgent(req);
  if (oauthAgent) {
    return oauthAgent;
  }
  const credentialAgent = await getCredentialSessionAgent(req, res, isMigration);
  if (credentialAgent) {
    return credentialAgent;
  }

  return null;
}
