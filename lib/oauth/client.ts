import { AtprotoOAuthClient } from "@bigmoves/atproto-oauth-client";
import { SessionStore, StateStore } from "../storage.ts";

/**
 * Create the OAuth client.
 * @param db - The Deno KV instance for the database
 * @returns The OAuth client
 */
export const createClient = (db: Deno.Kv) => {
  if (Deno.env.get("NODE_ENV") == "production" && !Deno.env.get("PUBLIC_URL")) {
    throw new Error("PUBLIC_URL is not set");
  }

  const publicUrl = Deno.env.get("PUBLIC_URL");
  const url = publicUrl || `http://127.0.0.1:8000`;
  const enc = encodeURIComponent;

  return new AtprotoOAuthClient({
    clientMetadata: {
      client_name: "Statusphere React App",
      client_id: publicUrl
        ? `${url}/oauth-client-metadata.json`
        : `http://localhost?redirect_uri=${
          enc(`${url}/api/oauth/callback`)
        }&scope=${enc("atproto transition:generic transition:chat.bsky")}`,
      client_uri: url,
      redirect_uris: [`${url}/api/oauth/callback`],
      scope: "atproto transition:generic transition:chat.bsky",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
    stateStore: new StateStore(db),
    sessionStore: new SessionStore(db),
  });
};

const kv = await Deno.openKv();
export const oauthClient = createClient(kv);
