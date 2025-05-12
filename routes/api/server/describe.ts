import { FreshContext } from "$fresh/server.ts";
import { Agent } from "npm:@atproto/api";
import { getSessionAgent } from "../../../auth/session.ts";
/**
 * Describe the server configuration and capabilities
 */
export const handler = async (_req: Request, _ctx: FreshContext): Promise<Response> => {
  const url = new URL(_req.url)
  const serviceUrl = url.searchParams.get("service")

  const agent = serviceUrl ? new Agent({ service: serviceUrl }) : await getSessionAgent(_req, _ctx)
  if (!agent) {
    return new Response(
      serviceUrl ? "Could not create agent." : "Unauthorized",
      {status: serviceUrl ? 400 : 401}
    )
  }
  const result = await agent.com.atproto.server.describeServer();
  return Response.json(result);
}
