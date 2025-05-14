import { getSessionAgent } from "../../../../../auth/session.ts";
import { Handlers } from "$fresh/server.ts"
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from 'npm:uint8arrays'
import { Agent } from "npm:@atproto/api";

// Store temporary migration data in memory (this will be cleared after sign step)
const migrationData = new Map<string, {
  recoveryKey: string;
  recoveryKeyDid: string;
  credentials: {
    rotationKeys: string[];
    [key: string]: unknown;
  };
}>();

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

      // Get the current session to check migration status
      if (!oldAgent?.did) {
        return new Response(JSON.stringify({
          success: false,
          message: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      }

      const did = oldAgent.did; // Store DID for later use

      // Generate recovery key
      console.log("Generating recovery key...");
      const recoveryKey = await Secp256k1Keypair.create({ exportable: true })
      const privateKeyBytes = await recoveryKey.export()
      const privateKey = ui8.toString(privateKeyBytes, 'hex')
      console.log("Generated recovery key and DID:", { 
        hasPrivateKey: !!privateKey,
        recoveryDid: recoveryKey.did()
      });

      // Get recommended credentials for later use
      console.log("Getting recommended credentials...");
      try {
        // Create a new agent for the current service
        const serviceUrl = (oldAgent as any).api.xrpc.baseUrl || "https://bsky.social";
        const newAgent = new Agent({ service: serviceUrl });
        const getDidCredentials = await newAgent.com.atproto.identity.getRecommendedDidCredentials()
        console.log("Got recommended credentials:", {
          hasRotationKeys: !!getDidCredentials.data.rotationKeys,
          rotationKeysLength: getDidCredentials.data.rotationKeys?.length,
          data: getDidCredentials.data
        });

        const rotationKeys = getDidCredentials.data.rotationKeys ?? []
        if (!rotationKeys.length) {
          throw new Error('No rotation key provided')
        }

        // Store temporary migration data in memory
        migrationData.set(did, {
          recoveryKey: privateKey,
          recoveryKeyDid: recoveryKey.did(),
          credentials: {
            ...getDidCredentials.data,
            rotationKeys
          }
        });
        console.log("Stored migration data in memory");

        // Set expiry for the migration data (30 minutes)
        setTimeout(() => {
          migrationData.delete(did);
        }, 30 * 60 * 1000);

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
        console.error("Error requesting PLC operation signature: ", error);
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