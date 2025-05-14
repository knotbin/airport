import { Handlers } from "$fresh/server.ts";
import { AtpAgent, CredentialSession } from "npm:@atproto/api";
import { setRegularSession } from "../../auth/session.ts";
import { resolver } from "../../utils/id-resolver.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { handle, password } = body;

      if (!handle || !password) {
        return new Response(JSON.stringify({
          success: false,
          message: "Handle and password are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const did = await resolver.resolveHandleToDid(handle)
      const service = await resolver.resolveDidToPdsUrl(did)

      if (!service) {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid handle"
        }), {
          status: 400,
        })
      }

      // Create credential session and attempt to authenticate
      const credentialSession = new CredentialSession(new URL(service));

      try {
        const result = await credentialSession.login({
          identifier: handle,
          password: password,
        });

        // Create response for setting cookies
        const response = new Response(JSON.stringify({
          success: true,
          did: result.data.did,
          handle: result.data.handle
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });

        // Create and save our client session with tokens
        await setRegularSession(req, response, {
          did: result.data.did,
          service,
          atpSession: {
            did: result.data.did,
            handle: result.data.handle,
            accessJwt: result.data.accessJwt,
            refreshJwt: result.data.refreshJwt,
            active: true
          }
        });

        return response;
      } catch {
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid credentials"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
