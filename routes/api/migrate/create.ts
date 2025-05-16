import { getSessionAgent } from "../../../auth/sessions.ts";
import { setCredentialSession } from "../../../auth/creds/sessions.ts";
import { Agent } from "@atproto/api";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
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

      const oldAgent = await getSessionAgent(ctx.req);
      const newAgent = new Agent({ service: serviceUrl });

      if (!oldAgent) return new Response("Unauthorized", { status: 401 });
      if (!newAgent) {
        return new Response("Could not create new agent", { status: 400 });
      }
      const accountDid = oldAgent.assertDid;

      // Create account
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

      // Create session and store it
      const sessionRes = await newAgent.com.atproto.server.createSession({
        identifier: newHandle,
        password: newPassword,
      });

      // Store the migration session
      await setCredentialSession(ctx.req, res, {
        did: sessionRes.data.did,
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
