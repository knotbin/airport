import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";
import * as plc from "@did-plc/lib";

/**
 * Verify if a rotation key exists in the PLC document
 * Body must contain:
 * - key: The rotation key to verify
 * @param ctx - The context object containing the request and response
 * @returns A response object with the verification result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      const body = await ctx.req.json();
      const { key: newKey } = body;
      console.log("Request body:", { newKey });

      if (!newKey) {
        console.log("Missing key in request");
        return new Response("Missing param key in request body", {
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
          }
        );
      }
      console.log("Using agent DID:", did);

      // Fetch the PLC document to check rotation keys
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
          }
        );
      }
      console.log("Got DID document:", didDoc);

      const rotationKeys = didDoc.rotationKeys ?? [];
      if (!rotationKeys.length) {
        console.log("No existing rotation keys found");
        throw new Error("No rotation keys found in did:plc document");
      }

      // Check if the key exists in rotation keys
      if (rotationKeys.includes(newKey)) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Rotation key exists in PLC document",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...Object.fromEntries(res.headers), // Include session cookie headers
            },
          }
        );
      }

      // If we get here, the key was not found
      return new Response(
        JSON.stringify({
          success: false,
          message: "Rotation key not found in PLC document",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("PLC verification error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to verify rotation key";
      console.log("Sending error response:", errorMessage);

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          error:
            error instanceof Error
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
        }
      );
    }
  },
});
