import { Secp256k1Keypair } from "@atproto/crypto";
import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";
import * as ui8 from "npm:uint8arrays";

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

    // Export private key bytes
    const privateKeyBytes = await keypair.export();
    const privateKeyHex = ui8.toString(privateKeyBytes, "hex");

    // Get public key as DID
    const publicKeyDid = keypair.did();

    // Convert private key to multikey format (base58btc)
    const privateKeyMultikey = ui8.toString(privateKeyBytes, "base58btc");

    // Return the key information
    return new Response(
      JSON.stringify({
        keyType: "secp256k1",
        publicKeyDid: publicKeyDid,
        privateKeyHex: privateKeyHex,
        privateKeyMultikey: privateKeyMultikey,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});
