import { CredentialSession } from "npm:@atproto/api";
import { getIronSession } from "npm:iron-session";
import { CredSession, Credentials, createSessionOptions } from "../types.ts";
import { AtpAgent } from "@atproto/api";

const credentialSessionOptions = createSessionOptions("cred_sid");

export function getCredentialSession(
  req: Request,
  res: Response = new Response()
) {
  return getIronSession<CredSession>(
    req,
    res,
    credentialSessionOptions,
  );
}

export async function setCredentialSession(
  req: Request,
  res: Response,
  data: Credentials
) {
  const session = await getCredentialSession(
    req,
    res
  );

  const credSession = new CredentialSession(new URL(data.service))
  const loginResponse = await credSession.login({
    identifier: data.did,
    password: data.password
  })

  session.did = data.did;
  session.service = data.service;
  session.refreshJwt = loginResponse.data.refreshJwt;
  session.accessJwt = loginResponse.data.accessJwt;
  session.active = loginResponse.data.active ?? true;
  session.handle = loginResponse.data.handle;

  await session.save();
  return session;
}

export async function getCredentialSessionAgent(
  req: Request,
  res: Response = new Response()
) {
  const session = await getCredentialSession(
    req,
    res
  );

  if (
    !session.did || !session.service
  ) {
    return null;
  }

  try {
    console.log("Creating agent with service:", session.service);
    const agent = new AtpAgent(session);
    agent.resumeSession(session)
    return agent;
  } catch (err) {
    console.warn("Failed to create migration agent:", err);
    session.destroy();
    return null;
  }
}
