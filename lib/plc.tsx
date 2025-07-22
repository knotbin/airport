import { Secp256k1Keypair } from "@atproto/crypto";
import * as ui8 from "npm:uint8arrays";

interface RotationKey {
  keyType: "secp256k1";
  publicKeyDid: string;
  privateKeyHex: string;
  privateKeyMultikey: string;
}

export async function createRotationKey(): Promise<RotationKey> {
  // Create a new keypair
  const keypair = await Secp256k1Keypair.create({ exportable: true });

  // Export private key bytes
  const privateKeyBytes = await keypair.export();

  return {
    privateKeyMultikey: ui8.toString(privateKeyBytes, "base58btc"),
    publicKeyDid: keypair.did(),
    privateKeyHex: ui8.toString(privateKeyBytes, "hex"),
    keyType: "secp256k1",
  };
}
