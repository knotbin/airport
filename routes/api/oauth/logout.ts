import { Handlers } from "$fresh/server.ts";
import { getSession } from "../../../auth/session.ts";
import { oauthClient } from "../../../auth/client.ts";

export const handler: Handlers = {
  async POST(req) {
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
};
