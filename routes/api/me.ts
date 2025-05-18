import { getSessionAgent } from "../../lib/sessions.ts";
import { resolver } from "../../lib/id-resolver.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const agent = await getSessionAgent(req);
    if (!agent) {
      console.log("No agent found")
      return Response.json(null);
    }

    try {
      if (agent.assertDid) {
        const did = agent.assertDid;
        const handle = await resolver.resolveDidToHandle(did);

        return Response.json({ did, handle });
      }

      const session = await agent.com.atproto.server.getSession();
      const did = session.data.did
      const handle = await resolver.resolveDidToHandle(did);


      return Response.json({ did, handle });
    } catch (err) {
      console.error({ err }, "Failed to fetch profile");
      return Response.json(null);
    }
  },
});
