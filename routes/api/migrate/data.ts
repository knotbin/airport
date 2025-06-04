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
                console.log(`Retrying blob list fetch (attempt ${attempt}):`, error.message);
              },
            }
          );

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
                    console.log(`Retrying blob download for ${cid} (attempt ${attempt}):`, error.message);
                  },
                }
              );

              await handleBlobUpload(newAgent, blobRes, cid);
              migratedBlobs.push(cid);
              console.log(`Successfully migrated blob: ${cid}`);
            } catch (error) {
              console.error(`Failed to migrate blob ${cid}:`, error);
              failedBlobs.push({
                cid,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          blobCursor = listedBlobs.data.cursor;
        } catch (error) {
          console.error("Error during blob migration batch:", error);
          // If we hit a critical error during blob listing, break the loop
          if (error instanceof Error && 
             (error.message.includes("Unauthorized") || 
              error.message.includes("Invalid token"))) {
            throw error;
          }
          break;
        }
      } while (blobCursor);

      // Migrate preferences with retry
      const prefs = await withRetry(
        () => oldAgent.app.bsky.actor.getPreferences(),
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            console.log(`Retrying preferences fetch (attempt ${attempt}):`, error.message);
          },
        }
      );

      await withRetry(
        () => newAgent.app.bsky.actor.putPreferences(prefs.data),
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            console.log(`Retrying preferences update (attempt ${attempt}):`, error.message);
          },
        }
      );

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
        }),
        {
          status: failedBlobs.length > 0 ? 207 : 200, // Use 207 Multi-Status if some blobs failed
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(res.headers), // Include session cookie headers
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
