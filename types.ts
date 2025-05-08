import { OAuthClient } from 'jsr:@bigmoves/atproto-oauth-client'
import { Agent } from 'npm:@atproto/api'

export interface AppContext {
  oauthClient: OAuthClient
  logger: {
    warn: (obj: Record<string, unknown>, msg: string) => void
  }
}

export interface Env {
  COOKIE_SECRET: string
  NODE_ENV: string
}

declare global {
  const env: Env
}

// Extend Fresh's State interface
declare module "$fresh/server.ts" {
  interface State {
    oauthClient: OAuthClient
    logger: {
      warn: (obj: Record<string, unknown>, msg: string) => void
    }
    agent?: Agent | null
  }
} 