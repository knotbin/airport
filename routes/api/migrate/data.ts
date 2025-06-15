import { define } from "../../../utils.ts";
import {
  getSessionAgent,
} from "../../../lib/sessions.ts";
import { Agent, ComAtprotoSyncGetBlob } from "npm:@atproto/api";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Retry options
 * @param maxRetries - The maximum number of retries
 * @param initialDelay - The initial delay between retries
 * @param onRetry - The function to call on retry
 */
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry function with exponential backoff
 * @param operation - The operation to retry
 * @param options - The retry options
 * @returns The result of the operation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const initialDelay = options.initialDelay ?? INITIAL_RETRY_DELAY;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        // Don't retry on permanent errors like authentication
        if (error.message.includes("Unauthorized") || error.message.includes("Invalid token")) {
          throw error;
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`, lastError.message);
        if (options.onRetry) {
          options.onRetry(attempt + 1, lastError);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError ?? new Error("Operation failed after retries");
}

/**
 * Handle blob upload to new PDS
 * Retries on errors
 * @param newAgent - The new agent
 * @param blobRes - The blob response
 * @param cid - The CID of the blob
 */
async function handleBlobUpload(
  newAgent: Agent,
  blobRes: ComAtprotoSyncGetBlob.Response,
  cid: string
) {
  try {
    const contentLength = parseInt(blobRes.headers["content-length"] || "0", 10);
    const contentType = blobRes.headers["content-type"];
    
    // Check file size before attempting upload
    const MAX_SIZE = 95 * 1024 * 1024; // 95MB to be safe
    if (contentLength > MAX_SIZE) {
      throw new Error(`Blob ${cid} exceeds maximum size limit (${contentLength} bytes)`);
    }

    await withRetry(
      () => newAgent.com.atproto.repo.uploadBlob(blobRes.data, {
        encoding: contentType,
      }),
      {
        maxRetries: 5,
        onRetry: (attempt, error) => {
          console.log(`Retrying blob upload for ${cid} (attempt ${attempt}):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error(`Failed to upload blob ${cid}:`, error);
    throw error;
  }
}

/**
 * Handle data migration
 * @param ctx - The context object containing the request and response
 * @returns A response object with the migration result
 */
export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      console.log("Data migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Data migration: Got old agent:", !!oldAgent);

      // Log cookie information
      const cookies = ctx.req.headers.get("cookie");
      console.log("Data migration: Cookies present:", !!cookies);
      console.log("Data migration: Cookie header:", cookies);

      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Data migration: Got new agent:", !!newAgent);

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

      const session = await oldAgent.com.atproto.server.getSession();
      const accountDid = session.data.did;

      // Migrate repo data with retries
      const repoRes = await withRetry(
        () => oldAgent.com.atproto.sync.getRepo({
          did: accountDid,
        }),
        {
          maxRetries: 5,
          onRetry: (attempt, error) => {
            console.log(`Retrying repo fetch (attempt ${attempt}):`, error.message);
          },
        }
      );

      await withRetry(
        () => newAgent.com.atproto.repo.importRepo(repoRes.data, {
          encoding: "application/vnd.ipld.car",
        }),
        {
          maxRetries: 5,
          onRetry: (attempt, error) => {
            console.log(`Retrying repo import (attempt ${attempt}):`, error.message);
          },
        }
      );

      // Migrate blobs with enhanced error handling
      let blobCursor: string | undefined = undefined;
      const migratedBlobs: string[] = [];
      const failedBlobs: Array<{ cid: string; error: string }> = [];
      const migrationLogs: string[] = [];
      let totalBlobs = 0;
      let pageCount = 0;

      // First count total blobs
      console.log("Starting blob count...");
      do {
        const listedBlobs = await oldAgent.com.atproto.sync.listBlobs({
          did: accountDid,
          cursor: blobCursor,
        });
        const newBlobs = listedBlobs.data.cids.length;
        totalBlobs += newBlobs;
        pageCount++;
        console.log(`Blob count page ${pageCount}: found ${newBlobs} blobs, total so far: ${totalBlobs}`);
        migrationLogs.push(`Blob count page ${pageCount}: found ${newBlobs} blobs, total so far: ${totalBlobs}`);
        
        if (!listedBlobs.data.cursor) {
          console.log("No more cursor, finished counting blobs");
          break;
        }
        blobCursor = listedBlobs.data.cursor;
      } while (blobCursor);

      // Reset cursor for actual migration
      blobCursor = undefined;
      let processedBlobs = 0;
      pageCount = 0;

      do {
        try {
          const listedBlobs = await withRetry(
            () => oldAgent.com.atproto.sync.listBlobs({
              did: accountDid,
              cursor: blobCursor,
            }),
            {
              maxRetries: 5,
              onRetry: (attempt, error) => {
                const log = `Retrying blob list fetch (attempt ${attempt}): ${error.message}`;
                console.log(log);
                migrationLogs.push(log);
              },
            }
          );

          pageCount++;
          console.log(`Processing blob page ${pageCount}: ${listedBlobs.data.cids.length} blobs`);
          migrationLogs.push(`Processing blob page ${pageCount}: ${listedBlobs.data.cids.length} blobs`);

          for (const cid of listedBlobs.data.cids) {
            try {
              const blobRes = await withRetry(
                () => oldAgent.com.atproto.sync.getBlob({
                  did: accountDid,
                  cid,
                }),
                {
                  maxRetries: 5,
                  onRetry: (attempt, error) => {
                    const log = `Retrying blob download for ${cid} (attempt ${attempt}): ${error.message}`;
                    console.log(log);
                    migrationLogs.push(log);
                  },
                }
              );

              await handleBlobUpload(newAgent, blobRes, cid);
              migratedBlobs.push(cid);
              processedBlobs++;
              const progressLog = `Migrating blob ${processedBlobs} of ${totalBlobs}: ${cid}`;
              console.log(progressLog);
              migrationLogs.push(progressLog);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`Failed to migrate blob ${cid}:`, error);
              failedBlobs.push({
                cid,
                error: errorMsg,
              });
              migrationLogs.push(`Failed to migrate blob ${cid}: ${errorMsg}`);
            }
          }

          if (!listedBlobs.data.cursor) {
            console.log("No more cursor, finished processing blobs");
            migrationLogs.push("No more cursor, finished processing blobs");
            break;
          }
          blobCursor = listedBlobs.data.cursor;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error("Error during blob migration batch:", error);
          migrationLogs.push(`Error during blob migration batch: ${errorMsg}`);
          if (error instanceof Error && 
             (error.message.includes("Unauthorized") || 
              error.message.includes("Invalid token"))) {
            throw error;
          }
          break;
        }
      } while (blobCursor);

      const completionMessage = `Data migration completed: ${migratedBlobs.length} blobs migrated${failedBlobs.length > 0 ? `, ${failedBlobs.length} failed` : ''} (${pageCount} pages processed)`;
      console.log(completionMessage);
      migrationLogs.push(completionMessage);

      // Migrate preferences with retry
      console.log("Starting preferences migration...");
      migrationLogs.push("Starting preferences migration...");

      const prefs = await withRetry(
        () => oldAgent.app.bsky.actor.getPreferences(),
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            const log = `Retrying preferences fetch (attempt ${attempt}): ${error.message}`;
            console.log(log);
            migrationLogs.push(log);
          },
        }
      );

      console.log("Preferences fetched, updating on new account...");
      migrationLogs.push("Preferences fetched, updating on new account...");

      await withRetry(
        () => newAgent.app.bsky.actor.putPreferences(prefs.data),
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            const log = `Retrying preferences update (attempt ${attempt}): ${error.message}`;
            console.log(log);
            migrationLogs.push(log);
          },
        }
      );

      console.log("Preferences migration completed");
      migrationLogs.push("Preferences migration completed");

      const finalMessage = `Data migration fully completed: ${migratedBlobs.length} blobs migrated${failedBlobs.length > 0 ? `, ${failedBlobs.length} failed` : ''} (${pageCount} pages processed), preferences migrated`;
      console.log(finalMessage);
      migrationLogs.push(finalMessage);

      return new Response(
        JSON.stringify({
          success: true,
          message: failedBlobs.length > 0 
            ? `Data migration completed with ${failedBlobs.length} failed blobs`
            : "Data migration completed successfully",
          migratedBlobs,
          failedBlobs,
          totalMigrated: migratedBlobs.length,
          totalFailed: failedBlobs.length,
          logs: migrationLogs,
        }),
        {
          status: failedBlobs.length > 0 ? 207 : 200,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers),
          },
        },
      );
    } catch (error) {
      console.error("Data migration error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error instanceof Error
            ? error.message
            : "Failed to migrate data",
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : String(error),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
