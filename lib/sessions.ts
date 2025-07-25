import { Agent } from "npm:@atproto/api";
import { CredentialSession, OauthSession } from "./types.ts";
import {
  getCredentialSession,
  getCredentialSessionAgent,
} from "./cred/sessions.ts";
import { getOauthSession, getOauthSessionAgent } from "./oauth/sessions.ts";
import { IronSession } from "npm:iron-session";

/**
 * Get the session for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param isMigration - Whether to get the migration session
 * @returns The session
 */
export async function getSession(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false,
): Promise<IronSession<OauthSession | CredentialSession>> {
  if (isMigration) {
    return await getCredentialSession(req, res, true);
  }
  const oauthSession = await getOauthSession(req);
  const credentialSession = await getCredentialSession(req, res);

  if (oauthSession.did) {
    console.log("Oauth session found");
    return oauthSession;
  }
  if (credentialSession.did) {
    return credentialSession;
  }

  throw new Error("No session found");
}

/**
 * Get the session agent for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param isMigration - Whether to get the migration session
 * @returns The session agent
 */
export async function getSessionAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false,
): Promise<Agent | null> {
  if (isMigration) {
    return await getCredentialSessionAgent(req, res, isMigration);
  }

  const oauthAgent = await getOauthSessionAgent(req);
  const credentialAgent = await getCredentialSessionAgent(
    req,
    res,
    isMigration,
  );

  if (oauthAgent) {
    return oauthAgent;
  }

  if (credentialAgent) {
    return credentialAgent;
  }

  return null;
}

/**
 * Destroy all sessions for the given request.
 * @param req - The request object
 * @param res - The response object
 */
export async function destroyAllSessions(
  req: Request,
  res?: Response,
): Promise<Response> {
  const response = res || new Response();
  const oauthSession = await getOauthSession(req, response);
  const credentialSession = await getCredentialSession(req, res);
  const migrationSession = await getCredentialSession(
    req,
    res,
    true,
  );

  if (oauthSession.did) {
    oauthSession.destroy();
  }
  if (credentialSession.did) {
    credentialSession.destroy();
  }
  if (migrationSession.did) {
    console.log("DESTROYING MIGRATION SESSION", migrationSession);
    migrationSession.destroy();
  } else {
    console.log("MIGRATION SESSION NOT FOUND", migrationSession);
  }

  return response;
}
