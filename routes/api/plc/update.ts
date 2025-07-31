import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";
import * as plc from "@did-plc/lib";

/**
 * Handle PLC update operation
 * Body must contain:
 * - key: The new rotation key to add
 * - token: The email token received from requestPlcOperationSignature
 * @param ctx - The context object containing the request and response
 * @returns A response object with the update result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      console.log("=== PLC Update Debug ===");
      const body = await ctx.req.json();
      const { key: newKey, token } = body;
      console.log("Request body:", { newKey, hasToken: !!token });

      if (!newKey) {
        console.log("Missing key in request");
        return new Response("Missing param key in request body", {
          status: 400,
        });
      }

      if (!token) {
        console.log("Missing token in request");
        return new Response("Missing param token in request body", {
          status: 400,
        });
      }

      const agent = await getSessionAgent(ctx.req, res);
      if (!agent) {
        console.log("No agent found");
        return new Response("Unauthorized", { status: 401 });
      }

      const session = await agent.com.atproto.server.getSession();
      const did = session.data.did;
      if (!did) {
        console.log("No DID found in session");
        return new Response(
          JSON.stringify({
            success: false,
            message: "No DID found in your session",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      console.log("Using agent DID:", did);

      // Get recommended credentials first
      console.log("Getting did:plc document...");
      const plcClient = new plc.Client("https://plc.directory");
      const didDoc = await plcClient.getDocumentData(did);
      if (!didDoc) {
        console.log("No DID document found for agent DID");
        return new Response(
          JSON.stringify({
            success: false,
            message: "No DID document found for your account",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      console.log("Got DID document:", didDoc);

      const rotationKeys = didDoc.rotationKeys ?? [];
      if (!rotationKeys.length) {
        console.log("No existing rotation keys found");
        throw new Error("No rotation keys provided in recommended credentials");
      }

      // Check if the key is already in rotation keys
      if (rotationKeys.includes(newKey)) {
        console.log("Key already exists in rotation keys");
        return new Response(
          JSON.stringify({
            success: false,
            message: "This key is already in your rotation keys",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Perform the actual PLC update with the provided token
      console.log("Signing PLC operation...");
      const plcOp = await agent.com.atproto.identity.signPlcOperation({
        token,
        rotationKeys: [newKey, ...rotationKeys],
      });
      console.log("PLC operation signed successfully:", plcOp.data);

      console.log("Submitting PLC operation...");
      const plcSubmit = await agent.com.atproto.identity.submitPlcOperation({
        operation: plcOp.data.operation,
      });
      console.log("PLC operation submitted successfully:", plcSubmit);

      return new Response(
        JSON.stringify({
          success: true,
          message: "PLC update completed successfully",
          did: plcOp.data,
          newKey,
          rotationKeys: [newKey, ...rotationKeys],
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
      console.error("PLC update error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to update your PLC";
      console.log("Sending error response:", errorMessage);

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          error: error instanceof Error
            ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
            : String(error),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
