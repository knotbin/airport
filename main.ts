/// <reference lib="deno.unstable" />

import { App, fsRoutes, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// this can also be defined via a file. feel free to delete this!
const authMiddleware = define.middleware(async (ctx) => {
  const url = new URL(ctx.req.url);
  const needsAuth = url.pathname.startsWith("/migrate");
  
  // Skip auth check for login page and API endpoints
  if (url.pathname === "/login" || url.pathname.startsWith("/api/")) {
    return ctx.next();
  }

  try {
    const me = await fetch(`${url.origin}/api/me`, {
      credentials: "include",
      headers: {
        "Cookie": ctx.req.headers.get("cookie") || ""
      }
    });
    
    console.log("[auth] /api/me response:", {
      status: me.status,
      statusText: me.statusText,
      headers: Object.fromEntries(me.headers.entries())
    });

    const json = await me.json();
    console.log("[auth] /api/me response data:", json);

    const isAuthenticated = json && typeof json === 'object' && json.did;
    ctx.state.auth = isAuthenticated;
    
    if (needsAuth && !isAuthenticated) {
      console.log("[auth] Authentication required but not authenticated");
      return ctx.redirect("/login");
    }

    return ctx.next();
  } catch (err) {
    console.error("[auth] Middleware error:", err);
    ctx.state.auth = false;
    if (needsAuth) {
      return ctx.redirect("/login");
    }
    return ctx.next();
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
