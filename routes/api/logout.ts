import { destroyAllSessions } from "../../lib/sessions.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    await destroyAllSessions(ctx.req)

    return new Response("All Sessions Destroyed")
  },
});
