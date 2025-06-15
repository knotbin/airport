import { IdResolver } from "npm:@atproto/identity";
import { Did } from "npm:@atproto/api";

interface AtprotoData {
  did: string;
  signingKey: string;
  handle: string;
  pds: string;
}

interface DidService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

/**
 * ID resolver instance.
 */
const idResolver = createIdResolver();
export const resolver = createBidirectionalResolver(idResolver);

/**
 * Create the ID resolver.
 * @returns The ID resolver
 */
export function createIdResolver() {
  return new IdResolver();
}

/**
 * The bidirectional resolver.
 * @interface
 */
export interface BidirectionalResolver {
  resolveDidToHandle(did: string): Promise<string>;
  resolveDidsToHandles(dids: string[]): Promise<Record<string, string>>;
  resolveDidToPdsUrl(did: string): Promise<string | undefined>;
}

/**
 * Create the bidirectional resolver.
 * @param resolver - The ID resolver
 * @returns The bidirectional resolver
 */
export function createBidirectionalResolver(resolver: IdResolver) {
  return {
    async resolveDidToHandle(did: string): Promise<string> {
      const didDoc = await resolver.did.resolveAtprotoData(did) as AtprotoData;
      const resolvedHandle = await resolver.handle.resolve(didDoc.handle);
      if (resolvedHandle === did) {
        return didDoc.handle;
      }
      return did;
    },

    async resolveHandleToDid(handle: string) {
      return await resolver.handle.resolve(handle) as Did
    },

    async resolveDidToPdsUrl(did: string): Promise<string | undefined> {
      try {
        // First try the standard resolution
        const didDoc = await resolver.did.resolveAtprotoData(
          did,
        ) as AtprotoData;
        if (didDoc?.pds) {
          return didDoc.pds;
        }

        // If that fails, try to get the PDS from the DID document directly
        const response = await fetch(`https://plc.directory/${did}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch DID document: ${response.statusText}`);
        }
        const doc = await response.json();
        const pdsService = doc.service?.find((s: DidService) => s.type === "AtprotoPersonalDataServer");
        if (pdsService?.serviceEndpoint) {
          return pdsService.serviceEndpoint;
        }
        return undefined;
      } catch (err) {
        console.error("Error resolving PDS URL:", err);
        return undefined;
      }
    },

    async resolveDidsToHandles(
      dids: string[],
    ): Promise<Record<string, string>> {
      const didHandleMap: Record<string, string> = {};
      const resolves = await Promise.all(
        dids.map((did) => this.resolveDidToHandle(did).catch((_) => did)),
      );
      for (let i = 0; i < dids.length; i++) {
        didHandleMap[dids[i]] = resolves[i];
      }
      return didHandleMap;
    },
  };
}
