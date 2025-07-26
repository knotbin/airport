import { getSessionAgent } from "../../../lib/sessions.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
    async GET(ctx) {
        let nextStep = null;
        const oldAgent = await getSessionAgent(ctx.req);
        const newAgent = await getSessionAgent(ctx.req, new Response(), true);

        if (!newAgent) return Response.json({ nextStep: 1, completed: false });
        if (!oldAgent) return new Response("Unauthorized", { status: 401 });

        const oldStatus = await oldAgent.com.atproto.server.checkAccountStatus();
        const newStatus = await newAgent.com.atproto.server.checkAccountStatus();
        if (!oldStatus.data || !newStatus.data) return new Response("Could not verify status", { status: 500 });

        // Check conditions in sequence to determine the next step
        if (!newStatus.data) {
            nextStep = 1;
        } else if (!(newStatus.data.repoCommit &&
                   newStatus.data.indexedRecords === oldStatus.data.indexedRecords &&
                   newStatus.data.privateStateValues === oldStatus.data.privateStateValues &&
                   newStatus.data.expectedBlobs === newStatus.data.importedBlobs &&
                   newStatus.data.importedBlobs === oldStatus.data.importedBlobs)) {
            nextStep = 2;
        } else if (!newStatus.data.validDid) {
            nextStep = 3;
        } else if (!(newStatus.data.activated === true && oldStatus.data.activated === false)) {
            nextStep = 4;
        }

        return Response.json({
            nextStep,
            completed: nextStep === null,
            currentStatus: {
                activated: newStatus.data.activated,
                validDid: newStatus.data.validDid,
                repoCommit: newStatus.data.repoCommit,
                indexedRecords: newStatus.data.indexedRecords,
                privateStateValues: newStatus.data.privateStateValues,
                importedBlobs: newStatus.data.importedBlobs
            }
        });
    }
})
