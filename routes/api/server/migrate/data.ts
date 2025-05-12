import { getSessionAgent } from "../../../../auth/session.ts";
import { Agent } from "npm:@atproto/api"
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const url = new URL(_req.url)
    const serviceUrl = url.searchParams.get("service")
    const handle = url.searchParams.get("handle")
    const password = url.searchParams.get("password")

    if (!serviceUrl || !handle || !password) {
      return new Response("Missing params service, handle, or password", { status: 400 })
    }

    const oldAgent = await getSessionAgent(_req, _ctx)
    const newAgent = new Agent({ service: serviceUrl })

    if (!oldAgent) { return new Response("Unauthorized", {status: 401}) }
    if (!newAgent) { return new Response("Could not create new agent", {status: 400}) }

    // Login to new account
    await newAgent.com.atproto.server.createSession({
      identifier: handle,
      password: password,
    })

    const accountDid = oldAgent.assertDid

    // Migrate repo data
    const repoRes = await oldAgent.com.atproto.sync.getRepo({ did: accountDid })
    await newAgent.com.atproto.repo.importRepo(repoRes.data, {
      encoding: 'application/vnd.ipld.car',
    })

    // Migrate blobs
    let blobCursor: string | undefined = undefined
    const migratedBlobs: string[] = []
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
        migratedBlobs.push(cid)
      }
      blobCursor = listedBlobs.data.cursor
    } while (blobCursor)

    // Migrate preferences
    const prefs = await oldAgent.app.bsky.actor.getPreferences()
    await newAgent.app.bsky.actor.putPreferences(prefs.data)

    return new Response(JSON.stringify({
      success: true,
      message: "Data migration completed successfully",
      migratedBlobs: migratedBlobs
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
} 