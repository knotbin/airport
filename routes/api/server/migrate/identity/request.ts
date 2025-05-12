import { getSessionAgent, getMigrationSessionAgent, getMigrationSession } from "../../../../../auth/session.ts";
import { Handlers } from "$fresh/server.ts"
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from 'npm:uint8arrays'

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const res = new Response();
    try {
      console.log("Starting identity migration request...");
      const oldAgent = await getSessionAgent(_req, _ctx)
      console.log("Got old agent:", { 
        hasDid: !!oldAgent?.did,
        hasSession: !!oldAgent,
        did: oldAgent?.did 
      });

      const newAgent = await getMigrationSessionAgent(_req, res)
      console.log("Got new agent:", { 
        hasAgent: !!newAgent
      });

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
      console.log("Generating recovery key...");
      const recoveryKey = await Secp256k1Keypair.create({ exportable: true })
      const privateKeyBytes = await recoveryKey.export()
      const privateKey = ui8.toString(privateKeyBytes, 'hex')
      console.log("Generated recovery key and DID:", { 
        hasPrivateKey: !!privateKey,
        recoveryDid: recoveryKey.did()
      });

      // Store the recovery key and its DID in the session for the sign step
      const session = await getMigrationSession(_req, res);
      session.recoveryKey = privateKey;
      session.recoveryKeyDid = recoveryKey.did();
      await session.save();
      console.log("Stored recovery key in session");

      // Get recommended credentials for later use
      console.log("Getting recommended credentials...");
      try {
        const getDidCredentials = await newAgent.com.atproto.identity.getRecommendedDidCredentials()
        console.log("Got recommended credentials:", {
          hasRotationKeys: !!getDidCredentials.data.rotationKeys,
          rotationKeysLength: getDidCredentials.data.rotationKeys?.length,
          data: getDidCredentials.data
        });

        const rotationKeys = getDidCredentials.data.rotationKeys ?? []
        if (!rotationKeys) {
          throw new Error('No rotation key provided')
        }

        // Store credentials in session for sign step
        session.credentials = {
          ...getDidCredentials.data,
          rotationKeys // Ensure rotationKeys is always an array
        };
        await session.save();
        console.log("Stored credentials in session");
      } catch (error) {
        console.error("Error getting recommended credentials:", {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }

      // Request the signature
      console.log("Requesting PLC operation signature...");
      try {
        await oldAgent.com.atproto.identity.requestPlcOperationSignature()
        console.log("Successfully requested PLC operation signature");
      } catch (error) {
        console.error("Error requesting PLC operation signature:", {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          status: error instanceof Error ? (error as any).status : undefined,
          response: error instanceof Error ? (error as any).response : undefined
        });
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        message: "PLC operation signature requested successfully. Please check your email for the token."
      }), { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...Object.fromEntries(res.headers) // Include session cookie headers
        }
      })
    } catch (error) {
      console.error("Identity migration request error:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to request identity migration"
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
} 