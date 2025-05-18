import { setCredentialSession } from "../../../lib/cred/sessions.ts";
import { resolver } from "../../../lib/id-resolver.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const { handle, password } = body;

      if (!handle || !password) {
        return new Response(JSON.stringify({
          success: false,
          message: "Handle and password are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const did = await resolver.resolveHandleToDid(handle)
      const service = await resolver.resolveDidToPdsUrl(did)

      if (!service) {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid handle"
        }), {
          status: 400,
        })
      }

      try {
        // Create response for setting cookies
        const response = new Response(JSON.stringify({
          success: true,
          did,
          handle
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
        // Create and save our client session with tokens
        await setCredentialSession(ctx.req, response, {
          did,
          service,
          password
        });

        return response;
      } catch {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid credentials"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
});
