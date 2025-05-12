import { getSessionAgent } from "../../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const url = new URL(_req.url)
    const serviceUrl = url.searchParams.get("service")
    const handle = url.searchParams.get("handle")
    const password = url.searchParams.get("password")

    if (!serviceUrl || !handle || !password) {
      return new Response("Missing params service, handle, or password", { status: 400 })
    }

    const oldAgent = await getSessionAgent(_req, _ctx)
    const newAgent = new Agent({ service: serviceUrl })

    if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
    if (!newAgent) { return new Response("Could not create new agent", {status: 400}) }

    // Login to new account
    await newAgent.com.atproto.server.createSession({
      identifier: handle,
      password: password,
    })

    // Activate new account and deactivate old account
    await newAgent.com.atproto.server.activateAccount()
    await oldAgent.com.atproto.server.deactivateAccount({})

    return new Response(JSON.stringify({
      success: true,
      message: "Migration finalized successfully"
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
} 