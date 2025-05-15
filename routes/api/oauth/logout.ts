import { getSession } from "../../../oauth/session.ts";
import { oauthClient } from "../../../oauth/client.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const req = ctx.req;

    try {
      const response = new Response(null, { status: 200 });
      const session = await getSession(req, response);

      if (session.did) {
        // First destroy the oauth session
        await oauthClient.revoke(session.did);
        // Then destroy the iron session
        await session.destroy();
      }

      return response;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Logout failed:", err.message);
      return new Response("Logout failed", { status: 500 });
    }
  },
});
