/// <reference lib="deno.unstable" />

import { App, fsRoutes, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { getSession } from "./lib/sessions.ts";

export const app = new App<State>();

app.use(staticFiles());

// this can also be defined via a file. feel free to delete this!
const authMiddleware = define.middleware(async (ctx) => {
  const url = new URL(ctx.req.url);
  const needsAuth = url.pathname.startsWith("/migrate");

  // Skip auth check if not a protected route
  if (
    !needsAuth || url.pathname === "/login" || url.pathname.startsWith("/api/")
  ) {
    return ctx.next();
  }

  try {
    const session = await getSession(ctx.req);

    console.log("[auth] Session:", session);

    const isAuthenticated = session !== null && session.did !== null;
    ctx.state.auth = isAuthenticated;

    if (!isAuthenticated) {
      console.log("[auth] Authentication required but not authenticated");
      return ctx.redirect("/login");
    }

    return ctx.next();
  } catch (err) {
    console.error("[auth] Middleware error:", err);
    ctx.state.auth = false;
    return ctx.redirect("/login");
  }
});
app.use(authMiddleware);

await fsRoutes(app, {
  loadIsland: (path) => import(`./islands/${path}`),
  loadRoute: (path) => import(`./routes/${path}`),
});

if (import.meta.main) {
  await app.listen();
}
