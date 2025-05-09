import { Plugin } from "$fresh/server.ts";
import { Secp256k1Keypair, formatMultikey } from 'npm:@atproto/crypto'

export default {
  name: 'did-json',
  routes: [
    {
      path: '/.well-known/did.json',
      handler: async () => {
        const domain = Deno.env.get("PUBLIC_URL")?.split('://')[1] || 'localhost'
        const privateKey = Deno.env.get("APPVIEW_K256_PRIVATE_KEY_HEX")
        if (!privateKey) {
          throw new Error("APPVIEW_K256_PRIVATE_KEY_HEX environment variable is required")
        }
        const keypair = await Secp256k1Keypair.import(privateKey)
        const multikey = formatMultikey(keypair.jwtAlg, keypair.publicKeyBytes())

        return Response.json({
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: `did:web:${domain}`,
          verificationMethod: [
            {
              id: `did:web:${domain}#atproto`,
              type: 'Multikey',
              controller: `did:web:${domain}`,
              publicKeyMultibase: multikey,
            },
          ],
          service: [
            {
              id: '#swsh_appview',
              type: 'SwshAppView',
              serviceEndpoint: `https://${domain}`,
            },
            {
              id: '#atproto_pds',
              type: 'AtprotoPersonalDataServer',
              serviceEndpoint: `https://${domain}`,
            },
          ],
        })
      }
    }
  ]
} as Plugin; 