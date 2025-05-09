import { Handlers } from "$fresh/server.ts";
import { getSessionAgent } from "../../oauth/session.ts";

interface BskyProfile {
  handle: string;
  displayName?: string;
  description?: string;
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const agent = await getSessionAgent(req, ctx);
    if (!agent) {
      return Response.json(null);
    }

    try {
      const did = agent.assertDid;
      
      const profileResponse = await agent.com.atproto.repo
        .getRecord({
          repo: did,
          collection: 'app.bsky.actor.profile',
          rkey: 'self',
        })
        .catch(() => undefined);

      if (!profileResponse?.data?.value) {
        // If we have a DID but no profile, just return the DID
        return Response.json({ did });
      }

      const value = profileResponse.data.value as Record<string, unknown>;
      const handle = value.handle;

      if (typeof handle !== 'string') {
        return Response.json({ did });
      }

      // Return the user data in the expected format
      return Response.json({
        did,
        handle,
      });
    } catch (err) {
      console.error({ err }, "Failed to fetch profile");
      return Response.json(null);
    }
  },
}; 