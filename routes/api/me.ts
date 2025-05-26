import { getSessionAgent } from "../../lib/sessions.ts";
import { define } from "../../utils.ts";
import { resolver } from "../../lib/id-resolver.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const req = ctx.req;
    const res = new Response();

    try {
      console.log("[/api/me] Request headers:", Object.fromEntries(req.headers.entries()));

      const agent = await getSessionAgent(req, res);
      if (!agent) {
        console.log("[/api/me] No agent found");
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Response-Type": "null"
          }
        });
      }

      console.log("[/api/me] Got agent, checking authentication");
      const session = await agent.com.atproto.server.getSession();
      console.log("[/api/me] Session info:", {
        did: session.data.did,
        handle: session.data.handle
      });

      const handle = await resolver.resolveDidToHandle(session.data.did);
      console.log("[/api/me] Resolved handle:", handle);

      const responseData = {
        did: session.data.did,
        handle
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Response-Type": "user"
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[/api/me] Error:", { 
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
        url: req.url,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries())
      });

      return new Response(JSON.stringify(null), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Response-Type": "error",
          "X-Error-Message": encodeURIComponent(message)
        }
      });
    }
  },
});
