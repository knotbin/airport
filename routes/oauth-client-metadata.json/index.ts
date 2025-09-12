import { clientId, scope } from "../../lib/oauth/client.ts";
import { define } from "../../utils.ts";

/**
 * API endpoint to check the current migration state.
 * Returns the migration state information including whether migrations are allowed.
 */
export const handler = define.handlers({
  GET(_ctx) {
    return Response.json({
      client_name: "ATP Airport",
      client_id: clientId,
      client_uri: "https://atpairport.com",
      redirect_uris: [
        "https://atpairport.com/api/oauth/callback",
      ],
      scope,
      grant_types: [
        "authorization_code",
        "refresh_token",
      ],
      response_types: [
        "code",
      ],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    }, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
});
