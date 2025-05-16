import { SessionOptions } from "npm:iron-session";

export interface OauthSession {
  did: string
}

export interface CredentialSession {
  did: string;
  handle: string;
  service: string;
  password: string;
  recoveryKey?: string;
  recoveryKeyDid?: string;
  credentials?: {
    rotationKeys: string[];
    [key: string]: unknown;
  };
}

export const createSessionOptions = (cookieName: string): SessionOptions =>  {
    const cookieSecret = Deno.env.get("COOKIE_SECRET");
    if (!cookieSecret) {
        throw new Error("COOKIE_SECRET is not set");
    }

    return {
        cookieName: cookieName,
        password: cookieSecret,
        cookieOptions: {
            secure: Deno.env.get("NODE_ENV") === "production" || Deno.env.get("NODE_ENV") === "staging",
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            domain: undefined,
        },
    }
};