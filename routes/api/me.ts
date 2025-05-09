import { Handlers } from "$fresh/server.ts";
import { getSessionAgent } from "../../oauth/session.ts";
import { resolver } from "../../utils/id-resolver.ts";

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
      const handle = await resolver.resolveDidToHandle(did)

      return Response.json({ did, handle })
    } catch (err) {
      console.error({ err }, "Failed to fetch profile");
      return Response.json(null);
    }
  },
};
