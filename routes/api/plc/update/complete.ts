import { getSessionAgent } from "../../../../lib/sessions.ts";
import { define } from "../../../../utils.ts";

/**
 * Complete PLC update using email token
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      const url = new URL(ctx.req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Missing token parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const agent = await getSessionAgent(ctx.req, res, true);
      if (!agent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const did = agent.did;
      if (!did) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "No DID found in session",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Submit the PLC operation with the token
      await agent!.com.atproto.identity.submitPlcOperation({
        operation: { token: token },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "PLC update completed successfully",
          did,
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
      console.error("PLC update completion error:", error);
      const message = error instanceof Error
        ? error.message
        : "Unknown error occurred";

      return new Response(
        JSON.stringify({
          success: false,
          message: `Failed to complete PLC update: ${message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
