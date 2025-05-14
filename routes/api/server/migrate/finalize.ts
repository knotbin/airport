import { getSessionAgent } from "../../../../auth/session.ts";
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const res = new Response();
    try {
    const oldAgent = await getSessionAgent(_req, _ctx)
    const newAgent = await getSessionAgent(_req, _ctx, true)

    if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
      if (!newAgent) { return new Response("Migration session not found or invalid", {status: 400}) }

    // Activate new account and deactivate old account
    await newAgent.com.atproto.server.activateAccount()
    await oldAgent.com.atproto.server.deactivateAccount({})

    return new Response(JSON.stringify({
      success: true,
      message: "Migration finalized successfully"
    }), { 
      status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...Object.fromEntries(res.headers) // Include session cookie headers
        }
      })
    } catch (error) {
      console.error("Finalize error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to finalize migration"
      }), { 
        status: 400,
      headers: { "Content-Type": "application/json" }
      });
    }
  }
} 