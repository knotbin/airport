import { Secp256k1Keypair } from "@atproto/crypto";
import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";

/**
 * Generate and return PLC keys for the authenticated user
 */
export const handler = define.handlers({
  async GET(ctx) {
    const agent = await getSessionAgent(ctx.req);
    if (!agent) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Create a new keypair
    const keypair = await Secp256k1Keypair.create({ exportable: true });

    // sign binary data, resulting signature bytes.
    // SHA-256 hash of data is what actually gets signed.
    // signature output is often base64-encoded.
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const sig = await keypair.sign(data);

    // serialize the public key as a did:key string, which includes key type metadata
    const pubDidKey = keypair.did();
    console.log(pubDidKey);

    // output would look something like: 'did:key:zQ3shVRtgqTRHC7Lj4DYScoDgReNpsDp3HBnuKBKt1FSXKQ38'

    // Return the key information
    return new Response(
      JSON.stringify({
        did: pubDidKey,
        signature: btoa(String.fromCharCode(...sig)),
        data: Array.from(data),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
