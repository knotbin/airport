import { oauthClient } from "../../../auth/client.ts";
import { getSession } from "../../../auth/session.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
  async GET(ctx) {
    const req = ctx.req;
    const url = new URL(req.url);
    const params = url.searchParams;

    // Log incoming parameters for debugging
    console.log("OAuth callback received params:", {
      state: params.get("state"),
      iss: params.get("iss"),
      code: params.get("code"),
    });

    try {
      if (!params.get("code")) {
        throw new Error("No code parameter received");
      }

      // Get the oauth session first
      const { session } = await oauthClient.callback(params);

      if (!session?.did) {
        throw new Error("No DID received in session");
      }

      // Create response with session cookie
      const response = new Response(null, {
        status: 302,
        headers: new Headers({
          "Location": "/login/callback",
        }),
      });

      // Create and save our client session
      const clientSession = await getSession(req, response);
      clientSession.did = session.did;
      await clientSession.save();

      // Log success with cookie details
      console.info(
        `OAuth callback successful for DID: ${session.did}, redirecting to /login/callback`,
        {
          cookies: response.headers.get("Set-Cookie"),
        },
      );

      return response;
    } catch (error: unknown) {
      // Log detailed error information
      const err = error instanceof Error ? error : new Error(String(error));

      console.error({
        error: err.message,
        stack: err.stack,
        params: Object.fromEntries(params.entries()),
      }, "OAuth callback failed");

      return Response.redirect("/login/callback?error=auth");
    }
  },
};
