import {
  getSessionAgent,
} from "../../../../auth/sessions.ts";
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from "npm:uint8arrays";
import { define } from "../../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      const url = new URL(ctx.req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Missing param token",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const oldAgent = await getSessionAgent(ctx.req);
      const newAgent = await getSessionAgent(ctx.req, res, true);

      if (!oldAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (!newAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Migration session not found or invalid",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Generate recovery key
      console.log("Generating recovery key...");
      const recoveryKey = await Secp256k1Keypair.create({ exportable: true });
      const privateKeyBytes = await recoveryKey.export();
      const privateKey = ui8.toString(privateKeyBytes, "hex");
      const recoveryKeyDid = recoveryKey.did();
      console.log("Generated recovery key and DID:", {
        hasPrivateKey: !!privateKey,
        recoveryDid: recoveryKeyDid,
      });

      // Get recommended credentials
      console.log("Getting recommended credentials...");
      let credentials;
      try {
        const getDidCredentials = await newAgent.com.atproto.identity
          .getRecommendedDidCredentials();
        console.log("Got recommended credentials:", {
          hasRotationKeys: !!getDidCredentials.data.rotationKeys,
          rotationKeysLength: getDidCredentials.data.rotationKeys?.length,
          data: getDidCredentials.data,
        });

        const rotationKeys = getDidCredentials.data.rotationKeys ?? [];
        if (!rotationKeys) {
          throw new Error("No rotation key provided");
        }

        // Prepare credentials with recovery key
        credentials = {
          ...getDidCredentials.data,
          rotationKeys: [recoveryKeyDid, ...rotationKeys],
        };
      } catch (error) {
        console.error("Error getting recommended credentials:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Sign and submit the operation
      const plcOp = await oldAgent.com.atproto.identity.signPlcOperation({
        token: token,
        ...credentials,
      });

      await newAgent.com.atproto.identity.submitPlcOperation({
        operation: plcOp.data.operation,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Identity migration completed successfully",
          recoveryKey: privateKey,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers), // Include session cookie headers
          },
        },
      );
    } catch (error) {
      console.error("Identity migration sign error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to complete identity migration",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
