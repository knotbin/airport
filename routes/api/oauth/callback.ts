import { Handlers } from "$fresh/server.ts"
import { oauthClient } from "../../../oauth/client.ts";
import { getSession } from "../../../oauth/session.ts"

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const params = url.searchParams;
    const baseUrl = `${url.protocol}//${url.host}`;
    
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

      // Create response first so we can attach cookies
      const response = new Response(null, {
        status: 302,
        headers: new Headers({
          'Location': `${baseUrl}/login/callback`
        })
      });

      // Get the oauth session
      const { session } = await oauthClient.callback(params);
      
      if (!session?.did) {
        throw new Error("No DID received in session");
      }

      // Create and save our client session with the response
      const clientSession = await getSession(req, response);
      clientSession.did = session.did;
      await clientSession.save();

      console.info(
        `OAuth callback successful for DID: ${session.did}, redirecting to /login/callback`,
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

      return Response.redirect(`${baseUrl}/login/callback?error=auth`);
    }
  }
};
