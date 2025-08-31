import { useEffect, useRef, useState } from "preact/hooks";
import { MigrationStep } from "../../components/MigrationStep.tsx";
import {
  parseApiResponse,
  StepCommonProps,
  verifyMigrationStep,
} from "../../lib/migration-types.ts";

interface IdentityMigrationStepProps extends StepCommonProps {
  isActive: boolean;
}

export default function IdentityMigrationStep({
  credentials: _credentials,
  onStepComplete,
  onStepError,
  isActive,
}: IdentityMigrationStepProps) {
  const [status, setStatus] = useState<
    "pending" | "in-progress" | "verifying" | "completed" | "error"
  >("pending");
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);
  const [token, setToken] = useState("");
  const [identityRequestSent, setIdentityRequestSent] = useState(false);
  const [identityRequestCooldown, setIdentityRequestCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState<number | null>(null);
  const [stepName, setStepName] = useState("Migrate Identity");
  const identityRequestInProgressRef = useRef(false);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval !== null) {
        clearInterval(cooldownInterval);
      }
    };
  }, [cooldownInterval]);

  useEffect(() => {
    if (isActive && status === "pending") {
      startIdentityMigration();
    }
  }, [isActive]);

  const startIdentityMigration = async () => {
    // Prevent multiple concurrent calls
    if (identityRequestInProgressRef.current) {
      return;
    }

    identityRequestInProgressRef.current = true;
    setStatus("in-progress");
    setError(undefined);

    // Don't send duplicate requests
    if (identityRequestSent) {
      setStepName(
        "Enter the token sent to your email to complete identity migration",
      );
      setTimeout(() => {
        identityRequestInProgressRef.current = false;
      }, 1000);
      return;
    }

    try {
      const requestRes = await fetch("/api/migrate/identity/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const requestText = await requestRes.text();

      if (!requestRes.ok) {
        const parsed = parseApiResponse(requestText);
        throw new Error(
          parsed.message || "Failed to request identity migration",
        );
      }

      const parsed = parseApiResponse(requestText);
      if (!parsed.success) {
        throw new Error(parsed.message || "Identity migration request failed");
      }

      // Mark request as sent
      setIdentityRequestSent(true);

      // Handle rate limiting
      const jsonData = JSON.parse(requestText);
      if (jsonData.rateLimited && jsonData.cooldownRemaining) {
        setIdentityRequestCooldown(jsonData.cooldownRemaining);

        // Clear any existing interval
        if (cooldownInterval !== null) {
          clearInterval(cooldownInterval);
        }

        // Set up countdown timer
        const intervalId = setInterval(() => {
          setIdentityRequestCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(intervalId);
              setCooldownInterval(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setCooldownInterval(intervalId);
      }

      // Update step name to prompt for token
      setStepName(
        identityRequestCooldown > 0
          ? `Please wait ${identityRequestCooldown}s before requesting another code`
          : "Enter the token sent to your email to complete identity migration",
      );
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      // Don't mark as error if it was due to rate limiting
      if (identityRequestCooldown > 0) {
        setStatus("in-progress");
      } else {
        setError(errorMessage);
        setStatus("error");
        onStepError(errorMessage);
      }
    } finally {
      setTimeout(() => {
        identityRequestInProgressRef.current = false;
      }, 1000);
    }
  };

  const handleIdentityMigration = async () => {
    if (!token) return;

    try {
      const identityRes = await fetch(
        `/api/migrate/identity/sign?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const identityData = await identityRes.text();
      if (!identityRes.ok) {
        const parsed = parseApiResponse(identityData);
        throw new Error(
          parsed.message || "Failed to complete identity migration",
        );
      }

      const parsed = parseApiResponse(identityData);
      if (!parsed.success) {
        throw new Error(parsed.message || "Identity migration failed");
      }

      // Verify the identity migration
      await verifyIdentityMigration();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setError(errorMessage);
      setStatus("error");
      onStepError(errorMessage);
    }
  };

  const verifyIdentityMigration = async () => {
    setStatus("verifying");

    try {
      const result = await verifyMigrationStep(3);

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
    await verifyIdentityMigration();
  };

  const continueAnyway = () => {
    setStatus("completed");
    setShowContinueAnyway(false);
    onStepComplete();
  };

  return (
    <MigrationStep
      name={stepName}
      status={status}
      error={error}
      isVerificationError={status === "error" &&
        error?.includes("Verification failed")}
      index={2}
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

      {(status === "in-progress" || identityRequestSent) &&
        stepName.includes("Enter the token sent to your email") &&
        (identityRequestCooldown > 0
          ? (
            <div class="mt-4">
              <p class="text-sm text-amber-600 dark:text-amber-400">
                <span class="font-medium">Rate limit:</span> Please wait{" "}
                {identityRequestCooldown}{" "}
                seconds before requesting another code. Check your email inbox
                and spam folder for a previously sent code.
              </p>
            </div>
          )
          : (
            <div class="mt-4 space-y-4">
              <p class="text-sm text-blue-800 dark:text-blue-200">
                Please check your email for the migration token and enter it
                below:
              </p>
              <div class="flex space-x-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.currentTarget.value)}
                  placeholder="Enter token"
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={handleIdentityMigration}
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Submit Token
                </button>
              </div>
            </div>
          ))}
    </MigrationStep>
  );
}
