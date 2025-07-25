import { getSessionAgent } from "../../../lib/sessions.ts";
import { checkDidsMatch } from "../../../lib/check-dids.ts";
import { define } from "../../../utils.ts";
import { assertMigrationAllowed } from "../../../lib/migration-state.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      // Check if migrations are currently allowed
      assertMigrationAllowed();

      const oldAgent = await getSessionAgent(ctx.req);
      const newAgent = await getSessionAgent(ctx.req, res, true);

      if (!oldAgent) return new Response("Unauthorized", { status: 401 });
      if (!newAgent) {
        return new Response("Migration session not found or invalid", {
          status: 400,
        });
      }

      // Verify DIDs match between sessions
      const didsMatch = await checkDidsMatch(ctx.req);
      if (!didsMatch) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid state, original and target DIDs do not match",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Activate new account and deactivate old account
      await newAgent.com.atproto.server.activateAccount();
      await oldAgent.com.atproto.server.deactivateAccount({});

      return new Response(
        JSON.stringify({
          success: true,
          message: "Migration finalized successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers), // Include session cookie headers
          },
        },
      );
    } catch (error) {
      console.error("Finalize error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to finalize migration",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
