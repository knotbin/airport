import { isValidHandle } from 'npm:@atproto/syntax'
import { oauthClient } from "../../../auth/oauth/client.ts";
import { define } from "../../../utils.ts";

function isValidUrl(url: string): boolean {
  try {
    const urlp = new URL(url)
    // http or https
    return urlp.protocol === 'http:' || urlp.protocol === 'https:'
  } catch {
    return false
  }
}

export const handler = define.handlers({
  async POST(ctx) {
    const data = await ctx.req.json()
    const handle = data.handle
    if (
      typeof handle !== 'string' ||
      !(isValidHandle(handle) || isValidUrl(handle))
    ) {
      return new Response("Invalid Handle", {status: 400})
    }

    // Initiate the OAuth flow
    try {
      const url = await oauthClient.authorize(handle, {
        scope: 'atproto transition:generic transition:chat.bsky',
      })
      return Response.json({ redirectUrl: url.toString() })
    } catch (err) {
      console.error({ err }, 'oauth authorize failed')
      return new Response("Couldn't initiate login", {status: 500})
    }
  },
});
