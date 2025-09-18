import { AtprotoOAuthClient } from "@bigmoves/atproto-oauth-client";
import { SessionStore, StateStore } from "../storage.ts";

const isDev = Deno.env.get("NODE_ENV") !== "production";
export const scope = [
  "atproto",
  "account:email",
  "account:status?action=manage",
  "identity:*",
  "rpc:*?aud=did:web:api.bsky.app#bsky_appview",
  "rpc:com.atproto.server.createAccount?aud=*",
].join(" ");
const publicUrl = Deno.env.get("PUBLIC_URL");
const url = publicUrl || `http://127.0.0.1:8000`;
export const clientId = publicUrl
  ? `${url}/oauth-client-metadata.json`
  : `http://localhost?redirect_uri=${
    encodeURIComponent(`${url}/api/oauth/callback`)
  }&scope=${encodeURIComponent(scope)}`;
console.log(`ClientId: ${clientId}`);

/**
 * Create the OAuth client.
 * @param db - The Deno KV instance for the database
 * @returns The OAuth client
 */
export const createClient = (db: Deno.Kv) => {
  if (Deno.env.get("NODE_ENV") == "production" && !Deno.env.get("PUBLIC_URL")) {
    throw new Error("PUBLIC_URL is not set");
  }

  return new AtprotoOAuthClient({
    clientMetadata: {
      client_name: "Statusphere React App",
      client_id: clientId,
      client_uri: url,
      redirect_uris: [`${url}/api/oauth/callback`],
      scope: scope,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
    stateStore: new StateStore(db),
    sessionStore: new SessionStore(db),
    didCache: undefined,
    allowHttp: isDev,
    plcDirectoryUrl: Deno.env.get("PLC_URL") ?? "https://plc.directory",
  });
};

const kv = await Deno.openKv();
export const oauthClient = createClient(kv);
