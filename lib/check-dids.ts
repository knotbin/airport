import { getSession } from "./sessions.ts";

export async function checkDidsMatch(req: Request): Promise<boolean> {
  const oldSession = await getSession(req, undefined, false);
  const newSession = await getSession(req, undefined, true);
  return oldSession.did === newSession.did;
}
