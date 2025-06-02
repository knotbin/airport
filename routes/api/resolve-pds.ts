import { resolver } from "../../lib/id-resolver.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const did = url.searchParams.get("did");

    if (!did) {
      return new Response(JSON.stringify({ error: "DID parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const pds = await resolver.resolveDidToPdsUrl(did);
      return new Response(JSON.stringify({ pds }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Failed to resolve PDS:", error);
      return new Response(JSON.stringify({ error: "Failed to resolve PDS" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}); 