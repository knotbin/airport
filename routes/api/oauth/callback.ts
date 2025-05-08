import { Handlers } from "$fresh/server.ts"
import { oauthClient } from "../../../oauth/client.ts";
import { getSession } from "../../../oauth/session.ts"

export const handler: Handlers = {
  async GET(_req) {
    const params = new URLSearchParams(_req.url.split("?")[1]);
    const url = new URL(_req.url);

    try {
      const { session } = await oauthClient.callback(params);
      // Use the common session options
      const clientSession = await getSession(_req);

      // Set the DID on the session
      clientSession.did = session.did;
      await clientSession.save();

      // Get the origin and determine appropriate redirect
      const host = params.get("host");
      const protocol = url.protocol || "http";
      const baseUrl = `${protocol}://${host}`;

      console.info(
        `OAuth callback successful, redirecting to ${baseUrl}/oauth-callback`,
      );

      // Redirect to the frontend oauth-callback page

      return Response.redirect("/login/callback");
    } catch (err) {
      console.error({ err }, "oauth callback failed");

      return Response.redirect("/oauth-callback?error=auth");
    }
  }
}
