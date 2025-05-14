import { IdResolver } from 'npm:@atproto/identity'
import { AtprotoDid } from "npm:@atproto/oauth-client@^0.3.13";

interface AtprotoData {
  did: string
  signingKey: string
  handle: string
  pds: string
}

// Cache for handle resolution with 5 minute expiry
const handleCache = new Map<string, {
  handle: string,
  expiresAt: number
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RESOLVE_TIMEOUT = 5000; // 5 seconds

const idResolver = createIdResolver()
export const resolver = createBidirectionalResolver(idResolver)

export function createIdResolver() {
  return new IdResolver()
}

export interface BidirectionalResolver {
  resolveDidToHandle(did: string): Promise<string>
  resolveDidsToHandles(dids: string[]): Promise<Record<string, string>>
  resolveDidToPdsUrl(did: string): Promise<string | undefined>
}

export function createBidirectionalResolver(resolver: IdResolver) {
  return {
    async resolveDidToHandle(did: string): Promise<string> {
      // Check cache first
      const cached = handleCache.get(did);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`Using cached handle for ${did}: ${cached.handle}`);
        return cached.handle;
      }

      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Handle resolution timed out')), RESOLVE_TIMEOUT);
        });

        // Race the resolution against the timeout
        const didDoc = await Promise.race([
          resolver.did.resolveAtprotoData(did) as Promise<AtprotoData>,
          timeoutPromise
        ]) as AtprotoData;

        const resolvedHandle = await Promise.race([
          resolver.handle.resolve(didDoc.handle),
          timeoutPromise
        ]);

        const handle = resolvedHandle === did ? didDoc.handle : did;
        
        // Cache the result
        handleCache.set(did, {
          handle,
          expiresAt: Date.now() + CACHE_DURATION
        });

        return handle;
      } catch (err) {
        console.error(`Error resolving handle for ${did}:`, err);
        // If we have a cached value, use it even if expired
        const cached = handleCache.get(did);
        if (cached) {
          console.log(`Using expired cached handle for ${did}: ${cached.handle}`);
          return cached.handle;
        }
        // If no cached value, return the DID as fallback
        return did;
      }
    },

    async resolveHandleToDid(handle: string): Promise<string> {
      return await resolver.handle.resolve(handle) as AtprotoDid
    },

    async resolveDidToPdsUrl(did: string): Promise<string | undefined> {
      try {
        const didDoc = await resolver.did.resolveAtprotoData(did) as AtprotoData
        return didDoc.pds
      } catch (err) {
        console.error('Error resolving PDS URL:', err)
        return undefined
      }
    },

    async resolveDidsToHandles(
      dids: string[],
    ): Promise<Record<string, string>> {
      const didHandleMap: Record<string, string> = {}
      const resolves = await Promise.all(
        dids.map((did) => this.resolveDidToHandle(did).catch((_) => did)),
      )
      for (let i = 0; i < dids.length; i++) {
        didHandleMap[dids[i]] = resolves[i]
      }
      return didHandleMap
    },
  }
}
