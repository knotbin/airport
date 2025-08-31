import { useEffect, useState } from "preact/hooks";
import { MigrationStep } from "../../components/MigrationStep.tsx";
import {
  parseApiResponse,
  StepCommonProps,
  verifyMigrationStep,
} from "../../lib/migration-types.ts";

interface FinalizationStepProps extends StepCommonProps {
  isActive: boolean;
}

export default function FinalizationStep({
  credentials: _credentials,
  onStepComplete,
  onStepError,
  isActive,
}: FinalizationStepProps) {
  const [status, setStatus] = useState<
    "pending" | "in-progress" | "verifying" | "completed" | "error"
  >("pending");
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);

  useEffect(() => {
    if (isActive && status === "pending") {
      startFinalization();
    }
  }, [isActive]);

  const startFinalization = async () => {
    setStatus("in-progress");
    setError(undefined);

    try {
      const finalizeRes = await fetch("/api/migrate/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const finalizeData = await finalizeRes.text();
      if (!finalizeRes.ok) {
        const parsed = parseApiResponse(finalizeData);
        throw new Error(parsed.message || "Failed to finalize migration");
      }

      const parsed = parseApiResponse(finalizeData);
      if (!parsed.success) {
        throw new Error(parsed.message || "Finalization failed");
      }

      // Verify the finalization
      await verifyFinalization();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setError(errorMessage);
      setStatus("error");
      onStepError(errorMessage);
    }
  };

  const verifyFinalization = async () => {
    setStatus("verifying");

    try {
      const result = await verifyMigrationStep(4);

      if (result.ready) {
        setStatus("completed");
        setRetryCount(0);
        setShowContinueAnyway(false);
        onStepComplete();
      } else {
        const statusDetails = {
          activated: result.activated,
          validDid: result.validDid,
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
    await verifyFinalization();
  };

  const continueAnyway = () => {
    setStatus("completed");
    setShowContinueAnyway(false);
    onStepComplete();
  };

  return (
    <MigrationStep
      name="Finalize Migration"
      status={status}
      error={error}
      isVerificationError={status === "error" &&
        error?.includes("Verification failed")}
      index={3}
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
