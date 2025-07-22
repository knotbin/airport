import { getSessionAgent } from "../../../../lib/sessions.ts";
import { define } from "../../../../utils.ts";

/**
 * Handle identity migration request
 * Sends a PLC operation signature request to the old account's email
 * Should be called after all data is migrated to the new account
 * @param ctx - The context object containing the request and response
 * @returns A response object with the migration result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      console.log("Starting identity migration request...");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Got old agent:", {
        hasDid: !!oldAgent?.did,
        hasSession: !!oldAgent,
        did: oldAgent?.did,
      });

      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Got new agent:", {
        hasAgent: !!newAgent,
      });

      if (!oldAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (!newAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Migration session not found or invalid",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Request the signature
      console.log("Requesting PLC operation signature...");
      try {
        await oldAgent.com.atproto.identity.requestPlcOperationSignature();
        console.log("Successfully requested PLC operation signature");
      } catch (error) {
        console.error("Error requesting PLC operation signature:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          status: 400,
        });
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "PLC operation signature requested successfully. Please check your email for the token.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers), // Include session cookie headers
          },
        }
      );
    } catch (error) {
      console.error("Identity migration request error:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to request identity migration",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
