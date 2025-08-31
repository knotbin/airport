/**
 * Shared types for migration components
 */

export interface MigrationStateInfo {
  state: "up" | "issue" | "maintenance";
  message: string;
  allowMigration: boolean;
}

export interface MigrationCredentials {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

export interface StepCommonProps {
  credentials: MigrationCredentials;
  onStepComplete: () => void;
  onStepError: (error: string, isVerificationError?: boolean) => void;
}

export interface VerificationResult {
  ready: boolean;
  reason?: string;
  activated?: boolean;
  validDid?: boolean;
  repoCommit?: boolean;
  repoRev?: boolean;
  repoBlocks?: number;
  expectedRecords?: number;
  indexedRecords?: number;
  privateStateValues?: number;
  expectedBlobs?: number;
  importedBlobs?: number;
}

/**
 * Helper function to verify a migration step
 */
export async function verifyMigrationStep(
  stepNum: number,
): Promise<VerificationResult> {
  const res = await fetch(`/api/migrate/status?step=${stepNum}`);
  const data = await res.json();
  return data;
}

/**
 * Helper function to handle API responses with proper error parsing
 */
export function parseApiResponse(
  responseText: string,
): { success: boolean; message?: string } {
  try {
    const json = JSON.parse(responseText);
    return { success: json.success !== false, message: json.message };
  } catch {
    return { success: responseText.trim() !== "", message: responseText };
  }
}
