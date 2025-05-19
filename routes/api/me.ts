import { getSessionAgent } from "../../lib/sessions.ts";
import { define } from "../../utils.ts";
import { resolver } from "../../lib/id-resolver.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const res = new Response();

    console.log("Cookies:", req.headers.get("cookie"));

    const agent = await getSessionAgent(req, res);
    if (!agent) {
      console.log("No agent found");
      return Response.json(null);
    }

    try {
      console.log("Got agent, checking authentication");
      const session = await agent.com.atproto.server.getSession();
      console.log("Session info:", {
        did: session.data.did,
        handle: session.data.handle
      });

      const handle = await resolver.resolveDidToHandle(session.data.did);
      console.log("Resolved handle:", handle);

      return Response.json({
        did: session.data.did,
        handle
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error({ err: message }, "Failed to fetch profile");
      return Response.json(null);
    }
  },
});
