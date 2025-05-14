import { Handlers } from "$fresh/server.ts";
import { getSessionAgent } from "../../auth/session.ts";
import { resolver } from "../../utils/id-resolver.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const agent = await getSessionAgent(req, ctx);
    if (!agent) {
      return Response.json(null);
    }

    try {
      const did = agent.assertDid;
      let handle: string;
      try {
        handle = await resolver.resolveDidToHandle(did);
      } catch (err) {
        // If handle resolution fails, just use the DID
        handle = did;
      }

      const response = Response.json({ did, handle });
      
      // Add cache control headers
      response.headers.set('Cache-Control', 'max-age=300'); // Cache for 5 minutes
      response.headers.set('Vary', 'Cookie'); // Vary by cookie to ensure proper caching
      
      return response;
    } catch (err) {
      return Response.json(null);
    }
  },
};
