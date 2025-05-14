import { getSessionAgent } from "../../../../auth/session.ts";
import { Handlers } from "$fresh/server.ts"

export const handler: Handlers = {
  async POST(_req, _ctx) {
    const res = new Response();
    try {
      console.log("Data migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(_req, _ctx)
      console.log("Data migration: Got old agent:", !!oldAgent);
      
      // Log cookie information
      const cookies = _req.headers.get('cookie');
      console.log("Data migration: Cookies present:", !!cookies);
      console.log("Data migration: Cookie header:", cookies);
      
      const newAgent = await getSessionAgent(_req, _ctx, true)
      console.log("Data migration: Got new agent:", !!newAgent);

      if (!oldAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (!newAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Migration session not found or invalid"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

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
        headers: { 
          "Content-Type": "application/json",
          ...Object.fromEntries(res.headers) // Include session cookie headers
        }
      })
    } catch (error) {
      console.error("Data migration error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to migrate data"
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
} 