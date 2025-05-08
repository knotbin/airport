import { AtprotoOAuthClient } from 'jsr:@bigmoves/atproto-oauth-client'
import { SignJWT, jwtVerify } from "npm:jose@5.9.6";
import { SessionStore, StateStore } from "./storage.ts";

// Create a secure key for JWT signing
const jwtKey = new TextEncoder().encode(
  Deno.env.get("JWT_SECRET") || "secure-jwt-secret-for-oauth-dpop-tokens"
);

class CustomJoseKey {
  async createJwt(payload: Record<string, unknown>) {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(jwtKey);
    return jwt;
  }

  async verifyJwt(jwt: string) {
    const { payload } = await jwtVerify(jwt, jwtKey);
    return payload;
  }
}

export const createClient = async (db: Deno.Kv) => {
  if (Deno.env.get("NODE_ENV") == "production" && !Deno.env.get("PUBLIC_URL")) {
    throw new Error("PUBLIC_URL is not set");
  }

  const publicUrl = Deno.env.get("PUBLIC_URL");
  const url = publicUrl || `http://127.0.0.1:${Deno.env.get("VITE_PORT")}`;
  const enc = encodeURIComponent;

  return new AtprotoOAuthClient({
    clientMetadata: {
      client_name: "Statusphere React App",
      client_id: publicUrl
        ? `${url}/oauth-client-metadata.json`
        : `http://localhost?redirect_uri=${
          enc(`${url}/api/oauth/callback`)
        }&scope=${enc("atproto transition:generic")}`,
      client_uri: url,
      redirect_uris: [`${url}/api/oauth/callback`],
      scope: "atproto transition:generic",
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
