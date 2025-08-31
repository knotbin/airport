import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";

/**
 * Handle account creation
 * First step of the migration process
 * Body must contain:
 * - service: The service URL of the new account
 * - handle: The handle of the new account
 * - password: The password of the new account
 * - email: The email of the new account
 * - invite: The invite code of the new account (optional depending on the PDS)
 * @param ctx - The context object containing the request and response
 * @returns A response object with the creation result
 */
export const handler = define.handlers({
  async GET(ctx) {
    const res = new Response();
    try {
      const agent = await getSessionAgent(ctx.req, res);

      if (!agent) return new Response("Unauthorized", { status: 401 });

      // console.log("getting did");
      // const session = await agent.com.atproto.server.getSession();
      // const accountDid = session.data.did;
      // console.log("got did");

      await agent.com.atproto.identity.requestPlcOperationSignature();

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "We've requested a token to update your identity, it should be sent to your account's email address.",
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
      console.error("PLC signature request error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to get PLC operation signature (sending confirmation email)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
