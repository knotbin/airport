import { getSessionAgent } from "../../../../auth/session.ts";
import { Handlers } from "$fresh/server.ts"
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from 'npm:uint8arrays'

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const res = new Response();
    try {
      const url = new URL(_req.url)
      const token = url.searchParams.get("token")

      if (!token) {
        return new Response(JSON.stringify({
          success: false,
          message: "Missing param token"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }

      const oldAgent = await getSessionAgent(_req, _ctx)
      const newAgent = await getSessionAgent(_req, _ctx, true)

      if (!oldAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      }
      if (!newAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Migration session not found or invalid"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }

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
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(res.headers) // Include session cookie headers
        }
      })
    } catch (error) {
      console.error("Identity migration error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to migrate identity"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
