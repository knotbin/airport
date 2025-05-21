import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
    async GET(ctx) {
        const url = new URL(ctx.req.url);
        const params = new URLSearchParams(url.search);
        const step = params.get("step");
        const oldAgent = await getSessionAgent(ctx.req);
        const newAgent = await getSessionAgent(ctx.req, new Response(), true);
        
        if (!oldAgent || !newAgent) return new Response("Unauthorized", { status: 401 });

        const oldStatus = await oldAgent.com.atproto.server.checkAccountStatus();
        const newStatus = await newAgent.com.atproto.server.checkAccountStatus();
        if (!oldStatus.data || !newStatus.data) return new Response("Could not verify status", { status: 500 });

        const readyToContinue = () => {
            if (step) {
                switch (step) {
                    case "1": {
                        if (newStatus.data) {
                            return { ready: true };
                        }
                        return { ready: false, reason: "New account status not available" };
                    }
                    case "2": {
                        if (newStatus.data.repoCommit && 
                            newStatus.data.indexedRecords === oldStatus.data.indexedRecords &&
                            newStatus.data.privateStateValues === oldStatus.data.privateStateValues &&
                            newStatus.data.expectedBlobs === newStatus.data.importedBlobs &&
                            newStatus.data.importedBlobs === oldStatus.data.importedBlobs) {
                            return { ready: true };
                        }
                        const reasons = [];
                        if (!newStatus.data.repoCommit) reasons.push("Repository not imported.");
                        if (newStatus.data.indexedRecords < oldStatus.data.indexedRecords) 
                            reasons.push("Not all records imported.");
                        if (newStatus.data.privateStateValues < oldStatus.data.privateStateValues)
                            reasons.push("Not all private state values imported.");
                        if (newStatus.data.expectedBlobs !== newStatus.data.importedBlobs)
                            reasons.push("Expected blobs not fully imported.");
                        if (newStatus.data.importedBlobs < oldStatus.data.importedBlobs)
                            reasons.push("Not all blobs imported.");
                        return { ready: false, reason: reasons.join(", ") };
                    }
                    case "3": {
                        if (newStatus.data.validDid) {
                            return { ready: true };
                        }
                        return { ready: false, reason: "DID not valid" };
                    }
                    case "4": {
                        if (newStatus.data.activated === true && oldStatus.data.activated === false) {
                            return { ready: true };
                        }
                        return { ready: false, reason: "Account not activated" };
                    }
                }
            } else {
                return { ready: true };
            }
        }

        const status = {
            activated: newStatus.data.activated,
            validDid: newStatus.data.validDid,
            repoCommit: newStatus.data.repoCommit,
            repoRev: newStatus.data.repoRev,
            repoBlocks: newStatus.data.repoBlocks,
            expectedRecords: oldStatus.data.indexedRecords,
            indexedRecords: newStatus.data.indexedRecords,
            privateStateValues: newStatus.data.privateStateValues,
            expectedBlobs: newStatus.data.expectedBlobs,
            importedBlobs: newStatus.data.importedBlobs,
            ...readyToContinue()
        }

        return Response.json(status);
    }
})