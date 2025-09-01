import { useEffect, useState } from "preact/hooks";
import {
  MigrationClient,
  MigrationError,
  MigrationErrorType,
  MigrationProgressProps,
  MigrationStateInfo,
  MigrationStep,
} from "../lib/client.ts";

/**
 * The migration progress component.
 * @param props - The migration progress props
 * @returns The migration progress component
 * @component
 */
export default function MigrationProgress(props: MigrationProgressProps) {
  const [token, setToken] = useState("");
  const [migrationState, setMigrationState] = useState<
    MigrationStateInfo | null
  >(null);
  const [retryAttempts, setRetryAttempts] = useState<Record<number, number>>(
    {},
  );
  const [showContinueAnyway, setShowContinueAnyway] = useState<
    Record<number, boolean>
  >({});

  const [steps, setSteps] = useState<MigrationStep[]>([
    { name: "Create Account", status: "pending" },
    { name: "Migrate Data", status: "pending" },
    { name: "Migrate Identity", status: "pending" },
    { name: "Finalize Migration", status: "pending" },
  ]);

  const updateStepStatus = (
    index: number,
    status: MigrationStep["status"],
    error?: string,
    isVerificationError?: boolean,
  ) => {
    console.log(
      `Updating step ${index} to ${status}${
        error ? ` with error: ${error}` : ""
      }`,
    );
    setSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index
          ? { ...step, status, error, isVerificationError }
          : i > index
          ? {
            ...step,
            status: "pending",
            error: undefined,
            isVerificationError: undefined,
          }
          : step
      )
    );
  };

  const validateParams = () => {
    if (!props.service?.trim()) {
      updateStepStatus(0, "error", "Missing service URL");
      return false;
    }
    if (!props.handle?.trim()) {
      updateStepStatus(0, "error", "Missing handle");
      return false;
    }
    if (!props.email?.trim()) {
      updateStepStatus(0, "error", "Missing email");
      return false;
    }
    if (!props.password?.trim()) {
      updateStepStatus(0, "error", "Missing password");
      return false;
    }
    return true;
  };

  const client = new MigrationClient(
    {
      updateStepStatus,
      nextStepHook(stepNum) {
        if (stepNum === 2) {
          // Update step name to prompt for token
          setSteps((prevSteps) =>
            prevSteps.map((step, i) =>
              i === 2
                ? {
                  ...step,
                  name:
                    "Enter the token sent to your email to complete identity migration",
                }
                : step
            )
          );
        }
      },
      setRetryAttempts,
      setShowContinueAnyway,
    },
  );

  const continueAnyway = (stepNum: number) => {
    console.log(`Continuing anyway for step ${stepNum + 1}`);
    updateStepStatus(stepNum, "completed");
    setShowContinueAnyway((prev) => ({ ...prev, [stepNum]: false }));

    // Continue with next step if not the last one
    if (stepNum < 3) {
      client.continueToNextStep(stepNum + 1);
    }
  };

  const handleIdentityMigration = async () => {
    if (!token.trim()) {
      updateStepStatus(2, "error", "Please enter a valid token");
      return;
    }

    try {
      await client.handleIdentityMigration(token);
      // If successful, continue to next step
      client.continueToNextStep(3);
    } catch (error) {
      console.error("Identity migration error:", error);
      updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  useEffect(() => {
    (async () => {
      if (!validateParams()) {
        console.log("Parameter validation failed");
        return;
      }

      try {
        await client.checkState();
      } catch (error) {
        console.error("Failed to check migration state:", error);
        if (
          error instanceof MigrationError &&
          error.type === MigrationErrorType.NOT_ALLOWED
        ) {
          updateStepStatus(0, "error", error.message);
        } else {
          updateStepStatus(
            0,
            "error",
            "Unable to verify migration availability",
          );
        }
        return;
      }

      try {
        await client.startMigration(props);
      } catch (error) {
        console.error("Unhandled migration error:", error);
        updateStepStatus(
          0,
          "error",
          error.message || "Unknown error occurred",
        );
      }
    })();
  }, []);

  const getStepDisplayName = (step: MigrationStep, index: number) => {
    if (step.status === "completed") {
      switch (index) {
        case 0:
          return "Account Created";
        case 1:
          return "Data Migrated";
        case 2:
          return "Identity Migrated";
        case 3:
          return "Migration Finalized";
      }
    }

    if (step.status === "in-progress") {
      switch (index) {
        case 0:
          return "Creating your new account...";
        case 1:
          return "Migrating your data...";
        case 2:
          return step.name ===
              "Enter the token sent to your email to complete identity migration"
            ? step.name
            : "Migrating your identity...";
        case 3:
          return "Finalizing migration...";
      }
    }

    if (step.status === "verifying") {
      switch (index) {
        case 0:
          return "Verifying account creation...";
        case 1:
          return "Verifying data migration...";
        case 2:
          return "Verifying identity migration...";
        case 3:
          return "Verifying migration completion...";
      }
    }

    return step.name;
  };

  const getStepIcon = (status: MigrationStep["status"]) => {
    switch (status) {
      case "pending":
        return (
          <div class="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        );
      case "in-progress":
        return (
          <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-blue-500" />
          </div>
        );
      case "verifying":
        return (
          <div class="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-yellow-500" />
          </div>
        );
      case "completed":
        return (
          <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
    }
  };

  const getStepClasses = (status: MigrationStep["status"]) => {
    const baseClasses =
      "flex items-center space-x-3 p-4 rounded-lg transition-colors duration-200";
    switch (status) {
      case "pending":
        return `${baseClasses} bg-gray-50 dark:bg-gray-800`;
      case "in-progress":
        return `${baseClasses} bg-blue-50 dark:bg-blue-900`;
      case "verifying":
        return `${baseClasses} bg-yellow-50 dark:bg-yellow-900`;
      case "completed":
        return `${baseClasses} bg-green-50 dark:bg-green-900`;
      case "error":
        return `${baseClasses} bg-red-50 dark:bg-red-900`;
    }
  };

  return (
    <div class="space-y-8">
      {/* Migration state alert */}
      {migrationState && !migrationState.allowMigration && (
        <div
          class={`p-4 rounded-lg border ${
            migrationState.state === "maintenance"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div class="flex items-center">
            <div
              class={`mr-3 ${
                migrationState.state === "maintenance"
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {migrationState.state === "maintenance" ? "⚠️" : "🚫"}
            </div>
            <div>
              <h3 class="font-semibold mb-1">
                {migrationState.state === "maintenance"
                  ? "Maintenance Mode"
                  : "Service Unavailable"}
              </h3>
              <p class="text-sm">{migrationState.message}</p>
            </div>
          </div>
        </div>
      )}

      <div class="space-y-4">
        {steps.map((step, index) => (
          <div key={step.name} class={getStepClasses(step.status)}>
            {getStepIcon(step.status)}
            <div class="flex-1">
              <p
                class={`font-medium ${
                  step.status === "error"
                    ? "text-red-900 dark:text-red-200"
                    : step.status === "completed"
                    ? "text-green-900 dark:text-green-200"
                    : step.status === "in-progress"
                    ? "text-blue-900 dark:text-blue-200"
                    : "text-gray-900 dark:text-gray-200"
                }`}
              >
                {getStepDisplayName(step, index)}
              </p>
              {step.error && (
                <div class="mt-1">
                  <p class="text-sm text-red-600 dark:text-red-400">
                    {(() => {
                      try {
                        const err = JSON.parse(step.error);
                        return err.message || step.error;
                      } catch {
                        return step.error;
                      }
                    })()}
                  </p>
                  {step.isVerificationError && (
                    <div class="flex space-x-2 mt-2">
                      <button
                        type="button"
                        onClick={() => client.retryVerification(index, steps)}
                        class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200 dark:bg-blue-500 dark:hover:bg-blue-400"
                      >
                        Retry Verification
                      </button>
                      {showContinueAnyway[index] && (
                        <button
                          type="button"
                          onClick={() => continueAnyway(index)}
                          class="px-3 py-1 text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200
                                 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Continue Anyway
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {index === 2 && step.status === "in-progress" &&
                step.name ===
                  "Enter the token sent to your email to complete identity migration" &&
                (
                  <div class="mt-4 space-y-4">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                      Please check your email for the migration token and enter
                      it below:
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
                )}
            </div>
          </div>
        ))}
      </div>

      {steps[3].status === "completed" && (
        <div class="p-4 bg-green-50 dark:bg-green-900 rounded-lg border-2 border-green-200 dark:border-green-800">
          <p class="text-sm text-green-800 dark:text-green-200 pb-2">
            Migration completed successfully! Sign out to finish the process and
            return home.<br />
            Please consider donating to Airport to support server and
            development costs.
          </p>
          <div class="flex space-x-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await fetch("/api/logout", {
                    method: "POST",
                    credentials: "include",
                  });
                  if (!response.ok) {
                    throw new Error("Logout failed");
                  }
                  globalThis.location.href = "/";
                } catch (error) {
                  console.error("Failed to logout:", error);
                }
              }}
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
            <a
              href="https://ko-fi.com/knotbin"
              target="_blank"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>Support Us</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
