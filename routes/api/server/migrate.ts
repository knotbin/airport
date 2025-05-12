import { getSessionAgent } from "../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from 'npm:uint8arrays'

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const url = new URL(_req.url)
    const serviceUrl = url.searchParams.get("service")
    const newHandle = url.searchParams.get("handle")
    const newPassword = url.searchParams.get("password")
    const email = url.searchParams.get("email")
    const inviteCode = url.searchParams.get("invite")


    if (!serviceUrl || !newHandle || !newPassword || !email) {
      return new Response("Missing params service, handle, password, or email", { status: 400 })
    }

    const oldAgent = await getSessionAgent(_req, _ctx)
    const newAgent = new Agent({ service: serviceUrl })

    if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
    if (!newAgent) { return new Response("Could not create new agent", {status: 400}) }
    const accountDid = oldAgent.assertDid

    // Create account
    // ------------------

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


    await newAgent.com.atproto.server.createAccount(
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
    await newAgent.com.atproto.server.createSession({
      identifier: newHandle,
      password: newPassword,
    })

    // Migrate Data
    // ------------------

    const repoRes = await oldAgent.com.atproto.sync.getRepo({ did: accountDid })
    await newAgent.com.atproto.repo.importRepo(repoRes.data, {
      encoding: 'application/vnd.ipld.car',
    })

    let blobCursor: string | undefined = undefined
    do {
      const listedBlobs = await oldAgent.com.atproto.sync.listBlobs({
        did: accountDid,
        cursor: blobCursor,
      })
      for (const cid of listedBlobs.data.cids) {
        const blobRes = await oldAgent.com.atproto.sync.getBlob({
          did: accountDid,
          cid,
        })
        await newAgent.com.atproto.repo.uploadBlob(blobRes.data, {
          encoding: blobRes.headers['content-type'],
        })
      }
      blobCursor = listedBlobs.data.cursor
    } while (blobCursor)

    const prefs = await oldAgent.app.bsky.actor.getPreferences()
    await newAgent.app.bsky.actor.putPreferences(prefs.data)

    // Migrate Identity
    // ------------------

    const recoveryKey = await Secp256k1Keypair.create({ exportable: true })
    const privateKeyBytes = await recoveryKey.export()
    const privateKey = ui8.toString(privateKeyBytes, 'hex')

    await oldAgent.com.atproto.identity.requestPlcOperationSignature()

    const getDidCredentials =
      await newAgent.com.atproto.identity.getRecommendedDidCredentials()
    const rotationKeys = getDidCredentials.data.rotationKeys ?? []
    if (!rotationKeys) {
      throw new Error('No rotation key provided')
    }
    const credentials = {
      ...getDidCredentials.data,
      rotationKeys: [recoveryKey.did(), ...rotationKeys],
    }

    // @NOTE, this token will need to come from the email from the previous step
    const TOKEN = ''

    const plcOp = await oldAgent.com.atproto.identity.signPlcOperation({
      token: TOKEN,
      ...credentials,
    })

    console.log(
      `❗ Your private recovery key is: ${privateKey}. Please store this in a secure location! ❗`,
    )

    await newAgent.com.atproto.identity.submitPlcOperation({
      operation: plcOp.data.operation,
    })

    // Finalize Migration
    // ------------------

    await newAgent.com.atproto.server.activateAccount()
    await oldAgent.com.atproto.server.deactivateAccount({})

    return new Response("Migration successful!", { status: 200 })
  }
}
