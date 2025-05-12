import { getSessionAgent } from "../../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from 'npm:uint8arrays'

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const url = new URL(_req.url)
    const serviceUrl = url.searchParams.get("service")
    const handle = url.searchParams.get("handle")
    const password = url.searchParams.get("password")
    const token = url.searchParams.get("token")

    if (!serviceUrl || !handle || !password || !token) {
      return new Response("Missing params service, handle, password, or token", { status: 400 })
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

    // Generate recovery key
    const recoveryKey = await Secp256k1Keypair.create({ exportable: true })
    const privateKeyBytes = await recoveryKey.export()
    const privateKey = ui8.toString(privateKeyBytes, 'hex')

    await oldAgent.com.atproto.identity.requestPlcOperationSignature()

    const getDidCredentials =
      await newAgent.com.atproto.identity.getRecommendedDidCredentials()
    const rotationKeys = getDidCredentials.data.rotationKeys ?? []
    if (!rotationKeys) {
      throw new Error('No rotation key provided')
    }
    const credentials = {
      ...getDidCredentials.data,
      rotationKeys: [recoveryKey.did(), ...rotationKeys],
    }

    const plcOp = await oldAgent.com.atproto.identity.signPlcOperation({
      token: token,
      ...credentials,
    })

    await newAgent.com.atproto.identity.submitPlcOperation({
      operation: plcOp.data.operation,
    })

    return new Response(JSON.stringify({
      success: true,
      message: "Identity migration completed successfully",
      recoveryKey: privateKey
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
} 