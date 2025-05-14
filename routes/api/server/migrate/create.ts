import { getSessionAgent, setRegularSession, MigrationResult } from "../../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const res = new Response();
    try {
      const body = await _req.json();
      const serviceUrl = body.service;
      const newHandle = body.handle;
      const newPassword = body.password;
      const email = body.email;
      const inviteCode = body.invite;

      if (!serviceUrl || !newHandle || !newPassword || !email) {
        return new Response("Missing params service, handle, password, or email", { status: 400 })
      }

      const oldAgent = await getSessionAgent(_req, _ctx)
      const newAgent = new Agent({ service: serviceUrl })

      if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
      if (!newAgent) { return new Response("Could not create new agent", {status: 400}) }
      const accountDid = oldAgent.assertDid

      // Create account
      const describeRes = await newAgent.com.atproto.server.describeServer()
      const newServerDid = describeRes.data.did
      const inviteRequired = describeRes.data.inviteCodeRequired ?? false

      if (inviteRequired && !inviteCode) {
        return new Response("Missing param invite code", { status: 400 })
      }

      const serviceJwtRes = await oldAgent.com.atproto.server.getServiceAuth({
        aud: newServerDid,
        lxm: 'com.atproto.server.createAccount',
      })
      const serviceJwt = serviceJwtRes.data.token

      // Create the account and get credentials
      const createRes = await newAgent.com.atproto.server.createAccount(
        {
          handle: newHandle,
          email: email,
          password: newPassword,
          did: accountDid,
          inviteCode: inviteCode ?? undefined
        },
        {
          headers: { authorization: `Bearer ${serviceJwt}` },
          encoding: 'application/json',
        },
      )

      // Create session
      const sessionRes = await newAgent.com.atproto.server.createSession({
        identifier: newHandle,
        password: newPassword,
      })

      // Set the regular session with migration flag
      await setRegularSession(_req, res, {
        did: sessionRes.data.did,
        service: serviceUrl,
        isMigrated: true,
        atpSession: {
          did: sessionRes.data.did,
          handle: newHandle,
          accessJwt: sessionRes.data.accessJwt,
          refreshJwt: sessionRes.data.refreshJwt,
          active: true
        }
      });

      // Prepare the response with sensitive data that will only be shown once
      const migrationResult: MigrationResult = {
        did: sessionRes.data.did,
        handle: newHandle
      };

      // Add any additional sensitive data from the create response if available
      const createData = createRes.data as any;
      if (createData.recoveryKey) {
        migrationResult.recoveryKey = createData.recoveryKey;
      }
      if (createData.credentials) {
        migrationResult.credentials = createData.credentials;
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Account created successfully",
        ...migrationResult // Include sensitive data only in this response
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(res.headers) // Include session cookie headers
        }
      })
    } catch (error) {
      console.error("Create account error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create account"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
