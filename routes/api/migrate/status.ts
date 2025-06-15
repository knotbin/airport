import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
    async GET(ctx) {
        console.log("Status check: Starting");
        const url = new URL(ctx.req.url);
        const params = new URLSearchParams(url.search);
        const step = params.get("step");
        console.log("Status check: Step", step);

        console.log("Status check: Getting agents");
        const oldAgent = await getSessionAgent(ctx.req);
        const newAgent = await getSessionAgent(ctx.req, new Response(), true);
        
        if (!oldAgent || !newAgent) {
            console.log("Status check: Unauthorized - missing agents", {
                hasOldAgent: !!oldAgent,
                hasNewAgent: !!newAgent
            });
            return new Response("Unauthorized", { status: 401 });
        }

        console.log("Status check: Fetching account statuses");
        const oldStatus = await oldAgent.com.atproto.server.checkAccountStatus();
        const newStatus = await newAgent.com.atproto.server.checkAccountStatus();
        
        if (!oldStatus.data || !newStatus.data) {
            console.error("Status check: Failed to verify status", {
                hasOldStatus: !!oldStatus.data,
                hasNewStatus: !!newStatus.data
            });
            return new Response("Could not verify status", { status: 500 });
        }

        console.log("Status check: Account statuses", {
            old: oldStatus.data,
            new: newStatus.data
        });

        const readyToContinue = () => {
            if (step) {
                console.log("Status check: Evaluating step", step);
                switch (step) {
                    case "1": {
                        if (newStatus.data) {
                            console.log("Status check: Step 1 ready");
                            return { ready: true };
                        }
                        console.log("Status check: Step 1 not ready - new account status not available");
                        return { ready: false, reason: "New account status not available" };
                    }
                    case "2": {
                        const isReady = newStatus.data.repoCommit && 
                            newStatus.data.indexedRecords === oldStatus.data.indexedRecords &&
                            newStatus.data.privateStateValues === oldStatus.data.privateStateValues &&
                            newStatus.data.expectedBlobs === newStatus.data.importedBlobs &&
                            newStatus.data.importedBlobs === oldStatus.data.importedBlobs;

                        if (isReady) {
                            console.log("Status check: Step 2 ready");
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

                        console.log("Status check: Step 2 not ready", { reasons });
                        return { ready: false, reason: reasons.join(", ") };
                    }
                    case "3": {
                        if (newStatus.data.validDid) {
                            console.log("Status check: Step 3 ready");
                            return { ready: true };
                        }
                        console.log("Status check: Step 3 not ready - DID not valid");
                        return { ready: false, reason: "DID not valid" };
                    }
                    case "4": {
                        if (newStatus.data.activated === true && oldStatus.data.activated === false) {
                            console.log("Status check: Step 4 ready");
                            return { ready: true };
                        }
                        console.log("Status check: Step 4 not ready - Account not activated");
                        return { ready: false, reason: "Account not activated" };
                    }
                }
            } else {
                console.log("Status check: No step specified, returning ready");
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

        console.log("Status check: Complete", status);
        return Response.json(status);
    }
})