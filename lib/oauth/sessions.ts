import { Agent } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { oauthClient } from "./client.ts";
import { createSessionOptions, OauthSession } from "../types.ts";

let oauthSessionOptions: SessionOptions;

/**
 * Get the OAuth session options.
 * @returns The OAuth session options
 */
async function getOptions() {
  if (!oauthSessionOptions) {
    oauthSessionOptions = await createSessionOptions("oauth_sid");
  }
  return oauthSessionOptions;
}

/**
 * Get the OAuth session agent for the given request.
 * @param req - The request object
 * @returns The OAuth session agent
 */
export async function getOauthSessionAgent(
  req: Request,
) {
  try {
    console.log("Getting OAuth session...");
    const res = new Response();
    const options = await getOptions();
    const session = await getIronSession<OauthSession>(
      req,
      res,
      options,
    );

    console.log("OAuth session state:", { hasDid: !!session.did });
    if (!session.did) {
      console.log("No OAuth session DID found");
      return null;
    }

    try {
      console.log("Attempting to restore OAuth session...");
      const oauthSession = await oauthClient.restore(session.did);
      console.log("OAuth restore result:", !!oauthSession);
      return oauthSession ? new Agent(oauthSession) : null;
    } catch (err) {
      console.warn({ err }, "oauth restore failed");
      session.destroy();
      return null;
    }
  } catch (err) {
    console.warn({ err }, "Failed to get OAuth session");
    return null;
  }
}

/**
 * Get the OAuth session for the given request.
 * @param req - The request object
 * @param res - The response object
 * @returns The OAuth session
 */
export async function getOauthSession(
  req: Request,
  res: Response = new Response(),
) {
  const options = await getOptions();
  return getIronSession<OauthSession>(
    req,
    res,
    options,
  );
}
