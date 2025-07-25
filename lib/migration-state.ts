/**
 * Migration state types and utilities for controlling migration availability.
 */

export type MigrationState = "up" | "issue" | "maintenance";

export interface MigrationStateInfo {
  state: MigrationState;
  message: string;
  allowMigration: boolean;
}

/**
 * Get the current migration state from environment variables.
 * @returns The migration state information
 */
export function getMigrationState(): MigrationStateInfo {
  const state = (Deno.env.get("MIGRATION_STATE") || "up").toLowerCase() as MigrationState;

  switch (state) {
    case "issue":
      return {
        state: "issue",
        message: "Migration services are temporarily unavailable as we investigate an issue. Please try again later.",
        allowMigration: false,
      };

    case "maintenance":
      return {
        state: "maintenance",
        message: "Migration services are temporarily unavailable for maintenance. Please try again later.",
        allowMigration: false,
      };

    case "up":
    default:
      return {
        state: "up",
        message: "Migration services are operational.",
        allowMigration: true,
      };
  }
}

/**
 * Check if migrations are currently allowed.
 * @returns True if migrations are allowed, false otherwise
 */
export function isMigrationAllowed(): boolean {
  return getMigrationState().allowMigration;
}

/**
 * Get a user-friendly message for the current migration state.
 * @returns The message to display to users
 */
export function getMigrationStateMessage(): string {
  return getMigrationState().message;
}

/**
 * Throw an error if migrations are not allowed.
 * Used in API endpoints to prevent migration operations when disabled.
 */
export function assertMigrationAllowed(): void {
  const stateInfo = getMigrationState();
  if (!stateInfo.allowMigration) {
    throw new Error(stateInfo.message);
  }
}
