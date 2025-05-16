import { Agent } from "npm:@atproto/api";
import { getIronSession, SessionOptions } from "npm:iron-session";
import { CredentialSession, createSessionOptions } from "../types.ts";

const migrationSessionOptions = createSessionOptions("migration_sid");
const credentialSessionOptions = createSessionOptions("cred_sid");

export function getCredentialSession(
  req: Request,
  res: Response = new Response(),
  options: SessionOptions
) {
  return getIronSession<CredentialSession>(
    req,
    res,
    options,
  );
}

export async function getCredentialAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false,
) {
  const session = await getCredentialSession(
    req,
    res,
    isMigration ?
    migrationSessionOptions : credentialSessionOptions
  );
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

export async function setCredentialSession(
  req: Request,
  res: Response,
  data: CredentialSession,
  isMigration: boolean = false,
) {
  const session = await getCredentialSession(
    req,
    res,
    isMigration ?
    migrationSessionOptions : credentialSessionOptions
  );
  session.did = data.did;
  session.handle = data.handle;
  session.service = data.service;
  session.password = data.password;
  await session.save();
  return session;
}

export async function getCredentialSessionAgent(
  req: Request,
  res: Response = new Response(),
  isMigration: boolean = false,
) {
  const session = await getCredentialSession(
    req,
    res,
    isMigration ?
    migrationSessionOptions : credentialSessionOptions
  );

  if (
    !session.did || !session.service || !session.handle || !session.password
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
