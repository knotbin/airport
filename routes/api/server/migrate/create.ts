import { getSessionAgent } from "../../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const url = new URL(_req.url)
    const serviceUrl = url.searchParams.get("service")
    const newHandle = url.searchParams.get("handle")
    const newPassword = url.searchParams.get("password")
    const email = url.searchParams.get("email")
    const inviteCode = url.searchParams.get("invite")

    if (!serviceUrl || !newHandle || !newPassword || !email) {
      return new Response("Missing params service, handle, or password", { status: 400 })
    }

    const oldAgent = await getSessionAgent(_req, _ctx)
    const newAgent = new Agent({ service: serviceUrl })

    if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
    if (!newAgent) { return new Response("Could not create new agent", {status: 400}) }
    const accountDid = oldAgent.assertDid

    // Create account
    const describeRes = await newAgent.com.atproto.server.describeServer()
    const newServerDid = describeRes.data.did
    const inviteRequired = describeRes.data.inviteCodeRequired ?? false

    if (inviteRequired && !inviteCode) {
      return new Response("Missing param invite code", { status: 400 })
    }

    const serviceJwtRes = await oldAgent.com.atproto.server.getServiceAuth({
      aud: newServerDid,
      lxm: 'com.atproto.server.createAccount',
    })
    const serviceJwt = serviceJwtRes.data.token

    await newAgent.com.atproto.server.createAccount(
      {
        handle: newHandle,
        email: email,
        password: newPassword,
        did: accountDid,
        inviteCode: inviteCode ?? undefined
      },
      {
        headers: { authorization: `Bearer ${serviceJwt}` },
        encoding: 'application/json',
      },
    )
    await newAgent.com.atproto.server.createSession({
      identifier: newHandle,
      password: newPassword,
    })

    return new Response(JSON.stringify({
      success: true,
      message: "Account created successfully",
      did: accountDid,
      handle: newHandle
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
} 