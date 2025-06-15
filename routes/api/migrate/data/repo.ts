import { getSessionAgent } from "../../../../lib/sessions.ts";
import { define } from "../../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      console.log("Repo migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Repo migration: Got old agent:", !!oldAgent);


      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Repo migration: Got new agent:", !!newAgent);

      if (!oldAgent || !newAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Not authenticated"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const session = await oldAgent.com.atproto.server.getSession();
      const accountDid = session.data.did;
      // Migrate repo data
      const migrationLogs: string[] = [];
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] Starting repo migration...`);
      migrationLogs.push(`[${new Date().toISOString()}] Starting repo migration...`);

      // Get repo data from old account
      console.log(`[${new Date().toISOString()}] Fetching repo data from old account...`);
      migrationLogs.push(`[${new Date().toISOString()}] Fetching repo data from old account...`);
      
      const fetchStartTime = Date.now();
      const repoData = await oldAgent.com.atproto.sync.getRepo({
        did: accountDid,
      });
      const fetchTime = Date.now() - fetchStartTime;
      
      console.log(`[${new Date().toISOString()}] Repo data fetched in ${fetchTime/1000} seconds`);
      migrationLogs.push(`[${new Date().toISOString()}] Repo data fetched in ${fetchTime/1000} seconds`);

      console.log(`[${new Date().toISOString()}] Importing repo data to new account...`);
      migrationLogs.push(`[${new Date().toISOString()}] Importing repo data to new account...`);

      // Import repo data to new account
      const importStartTime = Date.now();
      await newAgent.com.atproto.repo.importRepo(repoData.data);
      const importTime = Date.now() - importStartTime;

      console.log(`[${new Date().toISOString()}] Repo data imported in ${importTime/1000} seconds`);
      migrationLogs.push(`[${new Date().toISOString()}] Repo data imported in ${importTime/1000} seconds`);

      const totalTime = Date.now() - startTime;
      const completionMessage = `[${new Date().toISOString()}] Repo migration completed in ${totalTime/1000} seconds total`;
      console.log(completionMessage);
      migrationLogs.push(completionMessage);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Repo migration completed successfully",
          logs: migrationLogs,
          timing: {
            fetchTime: fetchTime/1000,
            importTime: importTime/1000,
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
      console.error(`[${new Date().toISOString()}] Repo migration error:`, message);
      console.error('Full error details:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Repo migration failed: ${message}`,
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