import { getSessionAgent } from "../../../../lib/sessions.ts";
import { define } from "../../../../utils.ts";
import { assertMigrationAllowed } from "../../../../lib/migration-state.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const res = new Response();
    try {
      // Check if migrations are currently allowed
      assertMigrationAllowed();

      console.log("Preferences migration: Starting session retrieval");
      const oldAgent = await getSessionAgent(ctx.req);
      console.log("Preferences migration: Got old agent:", !!oldAgent);

      const newAgent = await getSessionAgent(ctx.req, res, true);
      console.log("Preferences migration: Got new agent:", !!newAgent);

      if (!oldAgent || !newAgent) {
        return new Response(JSON.stringify({
          success: false,
          message: "Not authenticated"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Migrate preferences
      const migrationLogs: string[] = [];
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] Starting preferences migration...`);
      migrationLogs.push(`[${new Date().toISOString()}] Starting preferences migration...`);

      // Fetch preferences
      console.log(`[${new Date().toISOString()}] Fetching preferences from old account...`);
      migrationLogs.push(`[${new Date().toISOString()}] Fetching preferences from old account...`);

      const fetchStartTime = Date.now();
      const prefs = await oldAgent.app.bsky.actor.getPreferences();
      const fetchTime = Date.now() - fetchStartTime;

      console.log(`[${new Date().toISOString()}] Preferences fetched in ${fetchTime/1000} seconds`);
      migrationLogs.push(`[${new Date().toISOString()}] Preferences fetched in ${fetchTime/1000} seconds`);

      // Update preferences
      console.log(`[${new Date().toISOString()}] Updating preferences on new account...`);
      migrationLogs.push(`[${new Date().toISOString()}] Updating preferences on new account...`);

      const updateStartTime = Date.now();
      await newAgent.app.bsky.actor.putPreferences(prefs.data);
      const updateTime = Date.now() - updateStartTime;

      console.log(`[${new Date().toISOString()}] Preferences updated in ${updateTime/1000} seconds`);
      migrationLogs.push(`[${new Date().toISOString()}] Preferences updated in ${updateTime/1000} seconds`);

      const totalTime = Date.now() - startTime;
      const completionMessage = `[${new Date().toISOString()}] Preferences migration completed in ${totalTime/1000} seconds total`;
      console.log(completionMessage);
      migrationLogs.push(completionMessage);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Preferences migration completed successfully",
          logs: migrationLogs,
          timing: {
            fetchTime: fetchTime/1000,
            updateTime: updateTime/1000,
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
      console.error(`[${new Date().toISOString()}] Preferences migration error:`, message);
      console.error('Full error details:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Preferences migration failed: ${message}`,
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
