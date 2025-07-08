import { Agent } from "@atproto/api";
import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";
import * as plc from "@did-plc/lib";

/**
 * Update PLC rotation keys for the authenticated user
 */
export const handler = define.handlers({
  async POST(ctx) {
    try {
      const { key: newKey } = await ctx.req.json();

      if (!newKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Missing key in request body",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const agent = await getSessionAgent(ctx.req);
      if (!agent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const did = agent.did;
      if (!did) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "No DID found in session",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const client = new plc.Client("https://plc.directory");

      // Fetch current DID document
      const didDoc = await client.getDocumentData(did);
      if (!didDoc) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "DID document not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create new rotation keys array with the new key at the beginning
      const newKeys = [newKey, ...didDoc.rotationKeys];

      // Create the update operation
      const updateOp = plc.updateRotationKeysOp(
        did,
        didDoc.rotationKeys,
        newKeys
      );

      // Submit the operation to the PLC directory
      await client.sendOperation(updateOp);

      return new Response(
        JSON.stringify({
          success: true,
          message: "PLC rotation keys updated successfully",
          did,
          newKey,
          totalKeys: newKeys.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("PLC update error:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";

      return new Response(
        JSON.stringify({
          success: false,
          message: `Failed to update PLC keys: ${message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
