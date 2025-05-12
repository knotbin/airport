import { FreshContext, Plugin } from "$fresh/server.ts";
import { oauthClient } from "../auth/client.ts";

const plugin: Plugin = {
  name: "session",
  routes: [],
  middlewares: [{
    path: "/",
    middleware: {
      handler: async (req: Request, ctx: FreshContext) => {
        let res = await ctx.next();
        if (!oauthClient) {
          console.warn("Missing required oauthClient in state");
          return res;
        }
        return res;
      },
    },
  }],
};

export default plugin;
