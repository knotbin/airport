import { Handlers } from "$fresh/server.ts";
import { getSessions, sessionOptions } from "../../auth/session.ts";
import { oauthClient } from "../../auth/client.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const response = new Response(null, { status: 200 });
      const sessions = await getSessions(req, response);

      // Handle old session
      if (sessions.old?.did) {
        // If it's an OAuth session, revoke it
        if (sessions.old.isOAuth) {
          await oauthClient.revoke(sessions.old.did);
        }
        sessions.old = undefined;
      }

      // Handle new session if it exists
      if (sessions.new?.did) {
        // If it's an OAuth session, revoke it
        if (sessions.new.isOAuth) {
          await oauthClient.revoke(sessions.new.did);
        }
        sessions.new = undefined;
      }

      // Save the changes to clear the sessions
      await sessions.save();

      // Clear the cookie by setting it to expire
      response.headers.set(
        'Set-Cookie',
        `${sessionOptions.cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
      );

      return response;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Logout failed:", err.message);
      return new Response("Logout failed", { status: 500 });
    }
  },
};
