import { getSessionAgent } from "../../../../lib/sessions.ts";

export const handler = {
  async POST(req: Request) {
    try {
      console.log("Repo migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(req);
      console.log("Repo migration: Got old agent:", !!oldAgent);

      // Log cookie information
      const cookies = req.headers.get("cookie");
      console.log("Repo migration: Cookies present:", !!cookies);
      console.log("Repo migration: Cookie header:", cookies);

      const newAgent = await getSessionAgent(req, new Response(), true);
      console.log("Repo migration: Got new agent:", !!newAgent);

      if (!oldAgent || !newAgent || !oldAgent.did) {
        return new Response(JSON.stringify({
          success: false,
          message: "Not authenticated"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

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
        did: oldAgent.did,
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
          headers: { "Content-Type": "application/json" }
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
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
}; 