import { useEffect, useState } from "preact/hooks";
import { MigrationStep } from "../../components/MigrationStep.tsx";
import {
  parseApiResponse,
  StepCommonProps,
  verifyMigrationStep,
} from "../../lib/migration-types.ts";

interface AccountCreationStepProps extends StepCommonProps {
  isActive: boolean;
}

export default function AccountCreationStep({
  credentials,
  onStepComplete,
  onStepError,
  isActive,
}: AccountCreationStepProps) {
  const [status, setStatus] = useState<
    "pending" | "in-progress" | "verifying" | "completed" | "error"
  >("pending");
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);

  useEffect(() => {
    if (isActive && status === "pending") {
      startAccountCreation();
    }
  }, [isActive]);

  const startAccountCreation = async () => {
    setStatus("in-progress");
    setError(undefined);

    try {
      const createRes = await fetch("/api/migrate/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: credentials.service,
          handle: credentials.handle,
          password: credentials.password,
          email: credentials.email,
          ...(credentials.invite ? { invite: credentials.invite } : {}),
        }),
      });

      const responseText = await createRes.text();

      if (!createRes.ok) {
        const parsed = parseApiResponse(responseText);
        throw new Error(parsed.message || "Failed to create account");
      }

      const parsed = parseApiResponse(responseText);
      if (!parsed.success) {
        throw new Error(parsed.message || "Account creation failed");
      }

      // Verify the account creation
      await verifyAccountCreation();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setError(errorMessage);
      setStatus("error");
      onStepError(errorMessage);
    }
  };

  const verifyAccountCreation = async () => {
    setStatus("verifying");

    try {
      const result = await verifyMigrationStep(1);

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
    await verifyAccountCreation();
  };

  const continueAnyway = () => {
    setStatus("completed");
    setShowContinueAnyway(false);
    onStepComplete();
  };

  return (
    <MigrationStep
      name="Create Account"
      status={status}
      error={error}
      isVerificationError={status === "error" &&
        error?.includes("Verification failed")}
      index={0}
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
