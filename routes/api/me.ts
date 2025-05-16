import { getSessionAgent } from "../../auth/sessions.ts";
import { define } from "../../utils.ts";
import { resolver } from "../../tools/id-resolver.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const agent = await getSessionAgent(req);
    if (!agent) {
      console.log("No agent found")
      return Response.json(null);
    }

    try {
      const did = agent.assertDid;
      const handle = await resolver.resolveDidToHandle(did);

      return Response.json({ did, handle });
    } catch (err) {
      console.error({ err }, "Failed to fetch profile");
      return Response.json(null);
    }
  },
});
