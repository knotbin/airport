import { setCredentialSession } from "../../../lib/cred/sessions.ts";
import { resolver } from "../../../lib/id-resolver.ts";
import { define } from "../../../utils.ts";
import { Agent } from "npm:@atproto/api";

/**
 * Handle credential login
 * Save iron session to cookies
 * Save credential session state to database
 * @param ctx - The context object containing the request and response
 * @returns A response object with the login result
 */
export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const { handle, password } = body;

      if (!handle || !password) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Handle and password are required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      console.log("Resolving handle:", handle);
      const did = typeof handle == "string" && handle.startsWith("did:")
        ? handle
        : await resolver.resolveHandleToDid(handle);
      const service = await resolver.resolveDidToPdsUrl(did);
      console.log("Resolved service:", service);

      if (!service) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid handle",
          }),
          {
            status: 400,
          },
        );
      }

      try {
        // Create agent and get session
        console.log("Creating agent with service:", service);
        const agent = new Agent({ service });
        const sessionRes = await agent.com.atproto.server.createSession({
          identifier: handle,
          password: password,
        });
        console.log("Created ATProto session:", {
          did: sessionRes.data.did,
          handle: sessionRes.data.handle,
          hasAccessJwt: !!sessionRes.data.accessJwt,
        });

        // Create response for setting cookies
        const response = new Response(
          JSON.stringify({
            success: true,
            did,
            handle,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

        // Create and save our client session with tokens
        await setCredentialSession(ctx.req, response, {
          did,
          service,
          password,
          handle,
          accessJwt: sessionRes.data.accessJwt,
        });

        // Log the response headers
        console.log("Response headers:", {
          cookies: response.headers.get("Set-Cookie"),
          allHeaders: Object.fromEntries(response.headers.entries()),
        });

        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Login failed:", message);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid credentials",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Login error:", message);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : "An error occurred",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
