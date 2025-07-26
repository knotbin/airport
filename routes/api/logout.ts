import { destroyAllSessions, getSession } from "../../lib/sessions.ts";
import { oauthClient } from "../../lib/oauth/client.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const req = ctx.req;

    try {
      const response = new Response(null, { status: 200 });
      const session = await getSession(req, response);

      if (session.did) {
        // Try to revoke both types of sessions - the one that doesn't exist will just no-op
        await Promise.all([
          oauthClient.revoke(session.did).catch(console.error),
        ]);
        // Then destroy the iron session
        session.destroy();
      }

      // Destroy all sessions including migration session
      const result = await destroyAllSessions(req, response);

      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Logout failed:", err.message);
      return new Response("Logout failed", { status: 500 });
    }
  },
});
