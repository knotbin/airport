import { AtprotoOAuthClient } from 'jsr:@bigmoves/atproto-oauth-client'
import { SessionStore, StateStore } from "./storage.ts";

export const createClient = (db: Deno.Kv) => {
  if (Deno.env.get("NODE_ENV") == "production" && !Deno.env.get("PUBLIC_URL")) {
    throw new Error("PUBLIC_URL is not set");
  }

  const publicUrl = Deno.env.get("PUBLIC_URL");
  const url = publicUrl || `http://127.0.0.1:${Deno.env.get("PORT")}`;
  const enc = encodeURIComponent;

  const redirectUri = `${url}/api/oauth/callback`;
  const scope = "atproto transition:generic transition:chat.bsky";

  return new AtprotoOAuthClient({
    clientMetadata: {
      client_name: "Airport",
      client_id: publicUrl
        ? `${url}/oauth-client-metadata.json`
        : `http://localhost?redirect_uri=${enc(redirectUri)}&scope=${enc(scope)}`,
      client_uri: url,
      redirect_uris: [redirectUri],
      scope,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
    stateStore: new StateStore(db),
    sessionStore: new SessionStore(db)
  });
};

const kv = await Deno.openKv()
export const oauthClient = await createClient(kv)
