import { getSessionAgent } from "../../../../lib/sessions.ts";
import { define } from "../../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      console.log("Blob migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Blob migration: Got old agent:", !!oldAgent);

      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Blob migration: Got new agent:", !!newAgent);

      if (!oldAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (!newAgent) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Migration session not found or invalid",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Migrate blobs
      const migrationLogs: string[] = [];
      const migratedBlobs: string[] = [];
      const failedBlobs: string[] = [];
      let pageCount = 0;
      let blobCursor: string | undefined = undefined;
      let totalBlobs = 0;
      let processedBlobs = 0;

      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] Starting blob migration...`);
      migrationLogs.push(`[${new Date().toISOString()}] Starting blob migration...`);

      // First count total blobs
      console.log(`[${new Date().toISOString()}] Starting blob count...`);
      migrationLogs.push(`[${new Date().toISOString()}] Starting blob count...`);

      const session = await oldAgent.com.atproto.server.getSession();
      const accountDid = session.data.did;
      
      do {
        const pageStartTime = Date.now();
        console.log(`[${new Date().toISOString()}] Counting blobs on page ${pageCount + 1}...`);
        migrationLogs.push(`[${new Date().toISOString()}] Counting blobs on page ${pageCount + 1}...`);
        const listedBlobs = await oldAgent.com.atproto.sync.listBlobs({
          did: accountDid,
          cursor: blobCursor,
        });

        const newBlobs = listedBlobs.data.cids.length;
        totalBlobs += newBlobs;
        const pageTime = Date.now() - pageStartTime;
        
        console.log(`[${new Date().toISOString()}] Found ${newBlobs} blobs on page ${pageCount + 1} in ${pageTime/1000} seconds, total so far: ${totalBlobs}`);
        migrationLogs.push(`[${new Date().toISOString()}] Found ${newBlobs} blobs on page ${pageCount + 1} in ${pageTime/1000} seconds, total so far: ${totalBlobs}`);
        
        pageCount++;
        blobCursor = listedBlobs.data.cursor;
      } while (blobCursor);

      console.log(`[${new Date().toISOString()}] Total blobs to migrate: ${totalBlobs}`);
      migrationLogs.push(`[${new Date().toISOString()}] Total blobs to migrate: ${totalBlobs}`);

      // Reset cursor for actual migration
      blobCursor = undefined;
      pageCount = 0;
      processedBlobs = 0;

      do {
        const pageStartTime = Date.now();
        console.log(`[${new Date().toISOString()}] Fetching blob list page ${pageCount + 1}...`);
        migrationLogs.push(`[${new Date().toISOString()}] Fetching blob list page ${pageCount + 1}...`);

        const listedBlobs = await oldAgent.com.atproto.sync.listBlobs({
          did: accountDid,
          cursor: blobCursor,
        });

        const pageTime = Date.now() - pageStartTime;
        console.log(`[${new Date().toISOString()}] Found ${listedBlobs.data.cids.length} blobs on page ${pageCount + 1} in ${pageTime/1000} seconds`);
        migrationLogs.push(`[${new Date().toISOString()}] Found ${listedBlobs.data.cids.length} blobs on page ${pageCount + 1} in ${pageTime/1000} seconds`);

        blobCursor = listedBlobs.data.cursor;

        for (const cid of listedBlobs.data.cids) {
          try {
            const blobStartTime = Date.now();
            console.log(`[${new Date().toISOString()}] Starting migration for blob ${cid} (${processedBlobs + 1} of ${totalBlobs})...`);
            migrationLogs.push(`[${new Date().toISOString()}] Starting migration for blob ${cid} (${processedBlobs + 1} of ${totalBlobs})...`);

            const blobRes = await oldAgent.com.atproto.sync.getBlob({
              did: accountDid,
              cid,
            });

            const contentLength = blobRes.headers["content-length"];
            if (!contentLength) {
              throw new Error(`Blob ${cid} has no content length`);
            }

            const size = parseInt(contentLength, 10);
            if (isNaN(size)) {
              throw new Error(`Blob ${cid} has invalid content length: ${contentLength}`);
            }

            const MAX_SIZE = 200 * 1024 * 1024; // 200MB
            if (size > MAX_SIZE) {
              throw new Error(`Blob ${cid} exceeds maximum size limit (${size} bytes)`);
            }

            console.log(`[${new Date().toISOString()}] Downloading blob ${cid} (${size} bytes)...`);
            migrationLogs.push(`[${new Date().toISOString()}] Downloading blob ${cid} (${size} bytes)...`);

            if (!blobRes.data) {
              throw new Error(`Failed to download blob ${cid}: No data received`);
            }

            console.log(`[${new Date().toISOString()}] Uploading blob ${cid} to new account...`);
            migrationLogs.push(`[${new Date().toISOString()}] Uploading blob ${cid} to new account...`);

            await newAgent.com.atproto.repo.uploadBlob(blobRes.data);

            const blobTime = Date.now() - blobStartTime;
            console.log(`[${new Date().toISOString()}] Successfully migrated blob ${cid} in ${blobTime/1000} seconds`);
            migrationLogs.push(`[${new Date().toISOString()}] Successfully migrated blob ${cid} in ${blobTime/1000} seconds`);
            migratedBlobs.push(cid);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const detailedError = `[${new Date().toISOString()}] Failed to migrate blob ${cid}: ${errorMessage}`;
            console.error(detailedError);
            console.error('Full error details:', error);
            migrationLogs.push(detailedError);
            failedBlobs.push(cid);
          }

          processedBlobs++;
          const progressLog = `[${new Date().toISOString()}] Progress: ${processedBlobs}/${totalBlobs} blobs processed (${Math.round((processedBlobs/totalBlobs)*100)}%)`;
          console.log(progressLog);
          migrationLogs.push(progressLog);
        }
        pageCount++;
      } while (blobCursor);

      const totalTime = Date.now() - startTime;
      const completionMessage = `[${new Date().toISOString()}] Blob migration completed in ${totalTime/1000} seconds: ${migratedBlobs.length} blobs migrated${failedBlobs.length > 0 ? `, ${failedBlobs.length} failed` : ''} (${pageCount} pages processed)`;
      console.log(completionMessage);
      migrationLogs.push(completionMessage);

      return new Response(
        JSON.stringify({
          success: true,
          message: failedBlobs.length > 0 
            ? `Blob migration completed with ${failedBlobs.length} failed blobs`
            : "Blob migration completed successfully",
          migratedBlobs,
          failedBlobs,
          totalMigrated: migratedBlobs.length,
          totalFailed: failedBlobs.length,
          totalProcessed: processedBlobs,
          totalBlobs,
          logs: migrationLogs,
          timing: {
            totalTime: totalTime/1000
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers),
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Blob migration error:`, message);
      console.error('Full error details:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Blob migration failed: ${message}`,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : String(error)
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers),
          }
        }
      );
    }
  }
}); 