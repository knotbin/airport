/// <reference lib="deno.unstable" />

import { App, fsRoutes, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// this can also be defined via a file. feel free to delete this!
const authMiddleware = define.middleware(async (ctx) => {
  const url = new URL(ctx.req.url);
  if (url.pathname.startsWith("/migrate")) {
    ctx.state.auth = true
  }
  if (ctx.state.auth) {
    const me = await fetch(`${url.origin}/api/me`, {
      credentials: "include",
    });
    const json = await me.json();
    if (json && typeof json === 'object' && json.did) {
      return ctx.next();
    } else {
      return ctx.redirect("/login");
    }
  }
  return ctx.next();
});
app.use(authMiddleware);

await fsRoutes(app, {
  loadIsland: (path) => import(`./islands/${path}`),
  loadRoute: (path) => import(`./routes/${path}`),
});

if (import.meta.main) {
  await app.listen();
}
