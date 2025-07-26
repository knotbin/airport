import { getSessionAgent } from "../../../lib/sessions.ts";
import { setCredentialSession } from "../../../lib/cred/sessions.ts";
import { Agent } from "@atproto/api";
import { define } from "../../../utils.ts";
import { assertMigrationAllowed } from "../../../lib/migration-state.ts";

/**
 * Handle account creation
 * First step of the migration process
 * Body must contain:
 * - service: The service URL of the new account
 * - handle: The handle of the new account
 * - password: The password of the new account
 * - email: The email of the new account
 * - invite: The invite code of the new account (optional depending on the PDS)
 * @param ctx - The context object containing the request and response
 * @returns A response object with the creation result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      // Check if migrations are currently allowed
      assertMigrationAllowed();

      const body = await ctx.req.json();
      const serviceUrl = body.service;
      const newHandle = body.handle;
      const newPassword = body.password;
      const email = body.email;
      const inviteCode = body.invite;

      if (!serviceUrl || !newHandle || !newPassword || !email) {
        return new Response(
          "Missing params service, handle, password, or email",
          { status: 400 },
        );
      }

      const oldAgent = await getSessionAgent(ctx.req, res);
      const newAgent = new Agent({ service: serviceUrl });

      if (!oldAgent) return new Response("Unauthorized", { status: 401 });
      if (!newAgent) {
        return new Response("Could not create new agent", { status: 400 });
      }

      console.log("getting did");
      const session = await oldAgent.com.atproto.server.getSession();
      const accountDid = session.data.did;
      console.log("got did");
      const describeRes = await newAgent.com.atproto.server.describeServer();
      const newServerDid = describeRes.data.did;
      const inviteRequired = describeRes.data.inviteCodeRequired ?? false;

      if (inviteRequired && !inviteCode) {
        return new Response("Missing param invite code", { status: 400 });
      }

      const serviceJwtRes = await oldAgent.com.atproto.server.getServiceAuth({
        aud: newServerDid,
        lxm: "com.atproto.server.createAccount",
      });
      const serviceJwt = serviceJwtRes.data.token;

      await newAgent.com.atproto.server.createAccount(
        {
          handle: newHandle,
          email: email,
          password: newPassword,
          did: accountDid,
          inviteCode: inviteCode ?? undefined,
        },
        {
          headers: { authorization: `Bearer ${serviceJwt}` },
          encoding: "application/json",
        },
      );

      // Store the migration session
      await setCredentialSession(ctx.req, res, {
        did: accountDid,
        handle: newHandle,
        service: serviceUrl,
        password: newPassword,
      }, true);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully",
          did: accountDid,
          handle: newHandle,
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
      console.error("Create account error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to create account",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
