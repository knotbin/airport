import { useEffect, useState } from "preact/hooks";
import { MigrationStep } from "../../components/MigrationStep.tsx";
import {
  parseApiResponse,
  StepCommonProps,
  verifyMigrationStep,
} from "../../lib/migration-types.ts";

interface DataMigrationStepProps extends StepCommonProps {
  isActive: boolean;
}

export default function DataMigrationStep({
  credentials: _credentials,
  onStepComplete,
  onStepError,
  isActive,
}: DataMigrationStepProps) {
  const [status, setStatus] = useState<
    "pending" | "in-progress" | "verifying" | "completed" | "error"
  >("pending");
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);

  useEffect(() => {
    if (isActive && status === "pending") {
      startDataMigration();
    }
  }, [isActive]);

  const startDataMigration = async () => {
    setStatus("in-progress");
    setError(undefined);

    try {
      // Step 1: Migrate Repo
      const repoRes = await fetch("/api/migrate/data/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const repoText = await repoRes.text();

      if (!repoRes.ok) {
        const parsed = parseApiResponse(repoText);
        throw new Error(parsed.message || "Failed to migrate repo");
      }

      // Step 2: Migrate Blobs
      const blobsRes = await fetch("/api/migrate/data/blobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const blobsText = await blobsRes.text();

      if (!blobsRes.ok) {
        const parsed = parseApiResponse(blobsText);
        throw new Error(parsed.message || "Failed to migrate blobs");
      }

      // Step 3: Migrate Preferences
      const prefsRes = await fetch("/api/migrate/data/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const prefsText = await prefsRes.text();

      if (!prefsRes.ok) {
        const parsed = parseApiResponse(prefsText);
        throw new Error(parsed.message || "Failed to migrate preferences");
      }

      // Verify the data migration
      await verifyDataMigration();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setError(errorMessage);
      setStatus("error");
      onStepError(errorMessage);
    }
  };

  const verifyDataMigration = async () => {
    setStatus("verifying");

    try {
      const result = await verifyMigrationStep(2);

      if (result.ready) {
        setStatus("completed");
        setRetryCount(0);
        setShowContinueAnyway(false);
        onStepComplete();
      } else {
        const statusDetails = {
          repoCommit: result.repoCommit,
          repoRev: result.repoRev,
          repoBlocks: result.repoBlocks,
          expectedRecords: result.expectedRecords,
          indexedRecords: result.indexedRecords,
          privateStateValues: result.privateStateValues,
          expectedBlobs: result.expectedBlobs,
          importedBlobs: result.importedBlobs,
        };
        const errorMessage = `${
          result.reason || "Verification failed"
        }\nStatus details: ${JSON.stringify(statusDetails, null, 2)}`;

        setRetryCount((prev) => prev + 1);
        if (retryCount >= 1) {
          setShowContinueAnyway(true);
        }

        setError(errorMessage);
        setStatus("error");
        onStepError(errorMessage, true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setRetryCount((prev) => prev + 1);
      if (retryCount >= 1) {
        setShowContinueAnyway(true);
      }

      setError(errorMessage);
      setStatus("error");
      onStepError(errorMessage, true);
    }
  };

  const retryVerification = async () => {
    await verifyDataMigration();
  };

  const continueAnyway = () => {
    setStatus("completed");
    setShowContinueAnyway(false);
    onStepComplete();
  };

  return (
    <MigrationStep
      name="Migrate Data"
      status={status}
      error={error}
      isVerificationError={status === "error" &&
        error?.includes("Verification failed")}
      index={1}
      onRetryVerification={retryVerification}
    >
      {status === "error" && showContinueAnyway && (
        <div class="flex space-x-2 mt-2">
          <button
            type="button"
            onClick={continueAnyway}
            class="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200
                   dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Continue Anyway
          </button>
        </div>
      )}
    </MigrationStep>
  );
}
