import {
  getMigrationSession,
  getMigrationSessionAgent,
  getSessionAgent,
} from "../../../../../auth/session.ts";
import { define } from "../../../../../utils.ts";

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
      const newAgent = await getMigrationSessionAgent(ctx.req, res);
      const session = await getMigrationSession(ctx.req, res);

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
      if (
        !newAgent || !session.recoveryKey || !session.recoveryKeyDid ||
        !session.credentials
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message:
              "Migration session not found or invalid. Please restart the identity migration process.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Prepare credentials with recovery key
      const credentials = {
        ...session.credentials,
        rotationKeys: [
          session.recoveryKeyDid,
          ...session.credentials.rotationKeys,
        ],
      };

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
          recoveryKey: session.recoveryKey,
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
