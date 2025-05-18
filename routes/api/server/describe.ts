
import { Agent } from "@atproto/api";
import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";
/**
 * Describe the server configuration and capabilities
 */
export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const serviceUrl = url.searchParams.get("service");

    const agent = serviceUrl
      ? new Agent({ service: serviceUrl })
      : await getSessionAgent(ctx.req);
    if (!agent) {
      return new Response(
        serviceUrl ? "Could not create agent." : "Unauthorized",
        { status: serviceUrl ? 400 : 401 },
      );
    }
    const result = await agent.com.atproto.server.describeServer();
    return Response.json(result);
  }
});
