import { getSessionAgent } from "../../auth/session.ts";
import { define } from "../../utils.ts";
import { resolver } from "../../plugins/id-resolver.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const agent = await getSessionAgent(req);
    if (!agent) {
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
