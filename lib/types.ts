import { SessionOptions } from "npm:iron-session";
import { AtpSessionData } from "@atproto/api";

export interface OauthSession {
  did: string
}

export type Credentials = {
  service: string,
  did: string,
  password: string
}

export type CredSession = AtpSessionData & { service: string }

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
