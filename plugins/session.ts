import { getSessionAgent } from "../oauth/session.ts"
import { FreshContext, Plugin } from "$fresh/server.ts";
import { oauthClient } from "../oauth/client.ts";

const plugin: Plugin = {
  name: "session",
  routes: [],
  middlewares: [{
    path: "/",
    middleware: {
      handler: async (req: Request, ctx: FreshContext) => {
        const res = await ctx.next();
        if (!oauthClient) {
          console.warn("Missing required oauthClient in state");
          return res;
        }
        const agent = await getSessionAgent(req, ctx);
        return res;
      },
    },
  }],
};

export default plugin;
