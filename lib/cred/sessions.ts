import { Agent } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { CredentialSession, createSessionOptions } from "../types.ts";

let migrationSessionOptions: SessionOptions;
let credentialSessionOptions: SessionOptions;

/**
 * Get the session options for the given request.
 * @param isMigration - Whether to get the migration session options
 * @returns The session options
 */
async function getOptions(isMigration: boolean) {
  if (isMigration) {
    if (!migrationSessionOptions) {
      migrationSessionOptions = await createSessionOptions("migration_sid");
    }
    return migrationSessionOptions;
  }

  if (!credentialSessionOptions) {
    credentialSessionOptions = await createSessionOptions("cred_sid");
  }
  return credentialSessionOptions;
}

/**
 * Get the credential session for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param isMigration - Whether to get the migration session
 * @returns The credential session
 */
export async function getCredentialSession(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
) {
  const options = await getOptions(isMigration);
  return getIronSession<CredentialSession>(req, res, options);
}

/**
 * Get the credential agent for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param isMigration - Whether to get the migration session
 * @returns The credential agent
 */
export async function getCredentialAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
) {
  const session = await getCredentialSession(req, res, isMigration);
  if (
    !session.did ||
    !session.service ||
    !session.handle ||
    !session.password
  ) {
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
      session.destroy();
      return null;
    }
  } catch (err) {
    console.warn("Failed to create migration agent:", err);
    session.destroy();
    return null;
  }
}

/**
 * Set the credential session for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param data - The credential session data
 * @param isMigration - Whether to set the migration session
 * @returns The credential session
 */
export async function setCredentialSession(
  req: Request,
  res: Response,
  data: CredentialSession,
  isMigration: boolean = false
) {
  const session = await getCredentialSession(req, res, isMigration);
  session.did = data.did;
  session.handle = data.handle;
  session.service = data.service;
  session.password = data.password;
  await session.save();
  return session;
}

/**
 * Get the credential session agent for the given request.
 * @param req - The request object
 * @param res - The response object
 * @param isMigration - Whether to get the migration session
 * @returns The credential session agent
 */
export async function getCredentialSessionAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false
) {
  const session = await getCredentialSession(req, res, isMigration);

  console.log("Session state:", {
    hasDid: !!session.did,
    hasService: !!session.service,
    hasHandle: !!session.handle,
    hasPassword: !!session.password,
    hasAccessJwt: !!session.accessJwt,
    service: session.service,
    handle: session.handle,
  });

  if (
    !session.did ||
    !session.service ||
    !session.handle ||
    !session.password
  ) {
    console.log("Missing required session fields");
    return null;
  }

  try {
    console.log("Creating agent with service:", session.service);
    const agent = new Agent({ service: session.service });

    // If we have a stored JWT, try to use it first
    if (session.accessJwt) {
      console.log("Found stored JWT, attempting to use it");
      agent.setHeader("Authorization", `Bearer ${session.accessJwt}`);
      try {
        // Verify the token is still valid
        const sessionInfo = await agent.com.atproto.server.getSession();
        console.log("Stored JWT is valid, session info:", {
          did: sessionInfo.data.did,
          handle: sessionInfo.data.handle,
        });
        return agent;
      } catch (err) {
        // Token expired or invalid, continue to create new session
        const message = err instanceof Error ? err.message : String(err);
        console.log("Stored token invalid or expired:", message);
      }
    }

    // Create new session if no token or token expired
    try {
      console.log("Attempting to create session for:", session.handle);
      const sessionRes = await agent.com.atproto.server.createSession({
        identifier: session.handle,
        password: session.password,
      });
      console.log("Session created successfully:", {
        did: sessionRes.data.did,
        handle: sessionRes.data.handle,
        hasAccessJwt: !!sessionRes.data.accessJwt,
      });

      // Store the new token
      session.accessJwt = sessionRes.data.accessJwt;
      await session.save();
      console.log("Saved new access token to session");

      // Set the auth tokens in the agent
      agent.setHeader("Authorization", `Bearer ${sessionRes.data.accessJwt}`);

      // Verify the agent is properly authenticated
      try {
        await agent.com.atproto.server.getSession();
        return agent;
      } catch (err) {
        console.error("Failed to verify agent authentication:", err);
        session.destroy();
        return null;
      }
    } catch (err) {
      // Session creation failed, clear the session
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to create session:", message);
      session.destroy();
      return null;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to create migration agent:", message);
    session.destroy();
    return null;
  }
}
