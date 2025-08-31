import { getSessionAgent } from "../../../../lib/sessions.ts";
import { checkDidsMatch } from "../../../../lib/check-dids.ts";
import { define } from "../../../../utils.ts";
import { assertMigrationAllowed } from "../../../../lib/migration-state.ts";

// Simple in-memory cache for rate limiting
// In a production environment, you might want to use Redis or another shared cache
const requestCache = new Map<string, number>();
const COOLDOWN_PERIOD_MS = 60000; // 1 minute cooldown

/**
 * Handle identity migration request
 * Sends a PLC operation signature request to the old account's email
 * Should be called after all data is migrated to the new account
 * @param ctx - The context object containing the request and response
 * @returns A response object with the migration result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      // Check if migrations are currently allowed
      assertMigrationAllowed();

      console.log("Starting identity migration request...");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Got old agent:", {
        hasDid: !!oldAgent?.did,
        hasSession: !!oldAgent,
        did: oldAgent?.did,
      });

      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Got new agent:", {
        hasAgent: !!newAgent,
      });

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

      // Verify DIDs match between sessions
      const didsMatch = await checkDidsMatch(ctx.req);
      if (!didsMatch) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid state, original and target DIDs do not match",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Check if we've recently sent a request for this DID
      const did = oldAgent.did || "";
      const now = Date.now();
      const lastRequestTime = requestCache.get(did);

      if (lastRequestTime && now - lastRequestTime < COOLDOWN_PERIOD_MS) {
        console.log(
          `Rate limiting PLC request for ${did}, last request was ${
            (now - lastRequestTime) / 1000
          } seconds ago`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            message:
              "A PLC code was already sent to your email. Please check your inbox and spam folder.",
            rateLimited: true,
            cooldownRemaining: Math.ceil(
              (COOLDOWN_PERIOD_MS - (now - lastRequestTime)) / 1000,
            ),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...Object.fromEntries(res.headers),
            },
          },
        );
      }

      // Request the signature
      console.log("Requesting PLC operation signature...");
      try {
        await oldAgent.com.atproto.identity.requestPlcOperationSignature();
        console.log("Successfully requested PLC operation signature");

        // Store the request time
        if (did) {
          requestCache.set(did, now);

          // Optionally, set up cache cleanup for DIDs that haven't been used in a while
          setTimeout(() => {
            if (
              did &&
              requestCache.has(did) &&
              Date.now() - requestCache.get(did)! > COOLDOWN_PERIOD_MS * 2
            ) {
              requestCache.delete(did);
            }
          }, COOLDOWN_PERIOD_MS * 2);
        }
      } catch (error) {
        console.error("Error requesting PLC operation signature:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          status: 400,
        });
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "PLC operation signature requested successfully. Please check your email for the token.",
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
      console.error("Identity migration request error:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to request identity migration",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
