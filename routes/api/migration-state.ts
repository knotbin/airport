import { getMigrationState } from "../../lib/migration-state.ts";
import { define } from "../../utils.ts";

/**
 * API endpoint to check the current migration state.
 * Returns the migration state information including whether migrations are allowed.
 */
export const handler = define.handlers({
  GET(_ctx) {
    try {
      const stateInfo = getMigrationState();

      return new Response(
        JSON.stringify({
          state: stateInfo.state,
          message: stateInfo.message,
          allowMigration: stateInfo.allowMigration,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error checking migration state:", error);

      return new Response(
        JSON.stringify({
          state: "issue",
          message: "Unable to determine migration state. Please try again later.",
          allowMigration: false,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
});
