import { useEffect, useState } from "preact/hooks";

/**
 * The migration state info.
 * @type {MigrationStateInfo}
 */
interface MigrationStateInfo {
  state: "up" | "issue" | "maintenance";
  message: string;
  allowMigration: boolean;
}

/**
 * The migration progress props.
 * @type {MigrationProgressProps}
 */
interface MigrationProgressProps {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

/**
 * The migration step.
 * @type {MigrationStep}
 */
interface MigrationStep {
  name: string;
  status: "pending" | "in-progress" | "verifying" | "completed" | "error";
  error?: string;
  isVerificationError?: boolean;
}

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

  useEffect(() => {
    console.log("Starting migration with props:", {
      service: props.service,
      handle: props.handle,
      email: props.email,
      hasPassword: !!props.password,
      invite: props.invite,
    });

    // Check migration state first
    const checkMigrationState = async () => {
      try {
        const migrationResponse = await fetch("/api/migration-state");
        if (migrationResponse.ok) {
          const migrationData = await migrationResponse.json();
          setMigrationState(migrationData);

          if (!migrationData.allowMigration) {
            updateStepStatus(0, "error", migrationData.message);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check migration state:", error);
        updateStepStatus(0, "error", "Unable to verify migration availability");
        return;
      }

      if (!validateParams()) {
        console.log("Parameter validation failed");
        return;
      }

      startMigration().catch((error) => {
        console.error("Unhandled migration error:", error);
        updateStepStatus(
          0,
          "error",
          error.message || "Unknown error occurred",
        );
      });
    };

    checkMigrationState();
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

  const startMigration = async () => {
    try {
      // Step 1: Create Account
      updateStepStatus(0, "in-progress");
      console.log("Starting account creation...");

      try {
        const createRes = await fetch("/api/migrate/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: props.service,
            handle: props.handle,
            password: props.password,
            email: props.email,
            ...(props.invite ? { invite: props.invite } : {}),
          }),
        });

        console.log("Create account response status:", createRes.status);
        const responseText = await createRes.text();
        console.log("Create account response:", responseText);

        if (!createRes.ok) {
          try {
            const json = JSON.parse(responseText);
            throw new Error(json.message || "Failed to create account");
          } catch {
            throw new Error(responseText || "Failed to create account");
          }
        }

        try {
          const jsonData = JSON.parse(responseText);
          if (!jsonData.success) {
            throw new Error(jsonData.message || "Account creation failed");
          }
        } catch (e) {
          console.log("Response is not JSON or lacks success field:", e);
        }

        updateStepStatus(0, "verifying");
        const verified = await verifyStep(0);
        if (!verified) {
          console.log(
            "Account creation: Verification failed, waiting for user action",
          );
          return;
        }

        // verifyStep will handle continuing to the next step via continueToNextStep
        // No need to call startDataMigration here
      } catch (error) {
        updateStepStatus(
          0,
          "error",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    } catch (error) {
      console.error("Migration error in try/catch:", error);
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
        try {
          const json = JSON.parse(identityData);
          throw new Error(
            json.message || "Failed to complete identity migration",
          );
        } catch {
          throw new Error(
            identityData || "Failed to complete identity migration",
          );
        }
      }

      let data;
      try {
        data = JSON.parse(identityData);
        if (!data.success) {
          throw new Error(data.message || "Identity migration failed");
        }
      } catch {
        throw new Error("Invalid response from server");
      }

      // Verify the identity migration succeeded
      updateStepStatus(2, "verifying");
      const verified = await verifyStep(2, true); // Pass true to allow verification for manual submission
      if (!verified) {
        console.log(
          "Identity migration: Verification failed after token submission",
        );
        return;
      }
      
      // If verification succeeds, mark as completed and continue
      updateStepStatus(2, "completed");
      await startFinalization();
    } catch (error) {
      console.error("Identity migration error:", error);
      updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
      );
    }
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

  // Helper to verify a step after completion
  const verifyStep = async (stepNum: number, isManualSubmission: boolean = false) => {
    console.log(`Verification: Starting step ${stepNum + 1}`);
    
    // Skip automatic verification for step 2 (identity migration) unless it's after manual token submission
    if (stepNum === 2 && !isManualSubmission) {
      console.log(`Verification: Skipping automatic verification for identity migration step`);
      return false;
    }
    
    updateStepStatus(stepNum, "verifying");
    try {
      console.log(`Verification: Fetching status for step ${stepNum + 1}`);
      const res = await fetch(`/api/migrate/status?step=${stepNum + 1}`);
      console.log(`Verification: Status response status:`, res.status);
      const data = await res.json();
      console.log(`Verification: Status data for step ${stepNum + 1}:`, data);

      if (data.ready) {
        console.log(`Verification: Step ${stepNum + 1} is ready`);
        updateStepStatus(stepNum, "completed");
        // Reset retry state on success
        setRetryAttempts((prev) => ({ ...prev, [stepNum]: 0 }));
        setShowContinueAnyway((prev) => ({ ...prev, [stepNum]: false }));

        // Continue to next step if not the last one
        if (stepNum < 3) {
          setTimeout(() => continueToNextStep(stepNum + 1), 500);
        }

        return true;
      } else {
        console.log(
          `Verification: Step ${stepNum + 1} is not ready:`,
          data.reason,
        );
        const statusDetails = {
          activated: data.activated,
          validDid: data.validDid,
          repoCommit: data.repoCommit,
          repoRev: data.repoRev,
          repoBlocks: data.repoBlocks,
          expectedRecords: data.expectedRecords,
          indexedRecords: data.indexedRecords,
          privateStateValues: data.privateStateValues,
          expectedBlobs: data.expectedBlobs,
          importedBlobs: data.importedBlobs,
        };
        console.log(
          `Verification: Step ${stepNum + 1} status details:`,
          statusDetails,
        );
        const errorMessage = `${
          data.reason || "Verification failed"
        }\nStatus details: ${JSON.stringify(statusDetails, null, 2)}`;

        // Track retry attempts
        const currentAttempts = retryAttempts[stepNum] || 0;
        setRetryAttempts((prev) => ({
          ...prev,
          [stepNum]: currentAttempts + 1,
        }));

        // Show continue anyway option if this is the second failure
        if (currentAttempts >= 1) {
          setShowContinueAnyway((prev) => ({ ...prev, [stepNum]: true }));
        }

        updateStepStatus(stepNum, "error", errorMessage, true);
        return false;
      }
    } catch (e) {
      console.error(`Verification: Error in step ${stepNum + 1}:`, e);
      const currentAttempts = retryAttempts[stepNum] || 0;
      setRetryAttempts((prev) => ({ ...prev, [stepNum]: currentAttempts + 1 }));

      // Show continue anyway option if this is the second failure
      if (currentAttempts >= 1) {
        setShowContinueAnyway((prev) => ({ ...prev, [stepNum]: true }));
      }

      updateStepStatus(
        stepNum,
        "error",
        e instanceof Error ? e.message : String(e),
        true,
      );
      return false;
    }
  };

  const retryVerification = async (stepNum: number) => {
    console.log(`Retrying verification for step ${stepNum + 1}`);
    // For identity migration step, pass true if it's after manual submission
    const isManualSubmission = stepNum === 2 && steps[2].name === "Enter the token sent to your email to complete identity migration";
    await verifyStep(stepNum, isManualSubmission);
  };

  const continueAnyway = (stepNum: number) => {
    console.log(`Continuing anyway for step ${stepNum + 1}`);
    updateStepStatus(stepNum, "completed");
    setShowContinueAnyway((prev) => ({ ...prev, [stepNum]: false }));

    // Continue with next step if not the last one
    if (stepNum < 3) {
      continueToNextStep(stepNum + 1);
    }
  };

  const continueToNextStep = async (stepNum: number) => {
    switch (stepNum) {
      case 1:
        // Continue to data migration
        await startDataMigration();
        break;
      case 2:
        // Continue to identity migration
        await startIdentityMigration();
        break;
      case 3:
        // Continue to finalization
        await startFinalization();
        break;
    }
  };

  const startDataMigration = async () => {
    // Step 2: Migrate Data
    updateStepStatus(1, "in-progress");
    console.log("Starting data migration...");

    try {
      // Step 2.1: Migrate Repo
      console.log("Data migration: Starting repo migration");
      const repoRes = await fetch("/api/migrate/data/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Repo migration: Response status:", repoRes.status);
      const repoText = await repoRes.text();
      console.log("Repo migration: Raw response:", repoText);

      if (!repoRes.ok) {
        try {
          const json = JSON.parse(repoText);
          console.error("Repo migration: Error response:", json);
          throw new Error(json.message || "Failed to migrate repo");
        } catch {
          console.error("Repo migration: Non-JSON error response:", repoText);
          throw new Error(repoText || "Failed to migrate repo");
        }
      }

      // Step 2.2: Migrate Blobs
      console.log("Data migration: Starting blob migration");
      const blobsRes = await fetch("/api/migrate/data/blobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Blob migration: Response status:", blobsRes.status);
      const blobsText = await blobsRes.text();
      console.log("Blob migration: Raw response:", blobsText);

      if (!blobsRes.ok) {
        try {
          const json = JSON.parse(blobsText);
          console.error("Blob migration: Error response:", json);
          throw new Error(json.message || "Failed to migrate blobs");
        } catch {
          console.error(
            "Blob migration: Non-JSON error response:",
            blobsText,
          );
          throw new Error(blobsText || "Failed to migrate blobs");
        }
      }

      // Step 2.3: Migrate Preferences
      console.log("Data migration: Starting preferences migration");
      const prefsRes = await fetch("/api/migrate/data/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Preferences migration: Response status:", prefsRes.status);
      const prefsText = await prefsRes.text();
      console.log("Preferences migration: Raw response:", prefsText);

      if (!prefsRes.ok) {
        try {
          const json = JSON.parse(prefsText);
          console.error("Preferences migration: Error response:", json);
          throw new Error(json.message || "Failed to migrate preferences");
        } catch {
          console.error(
            "Preferences migration: Non-JSON error response:",
            prefsText,
          );
          throw new Error(prefsText || "Failed to migrate preferences");
        }
      }

      console.log("Data migration: Starting verification");
      updateStepStatus(1, "verifying");
      const verified = await verifyStep(1);
      console.log("Data migration: Verification result:", verified);
      if (!verified) {
        console.log(
          "Data migration: Verification failed, waiting for user action",
        );
        return;
      }

      // verifyStep will handle continuing to the next step via continueToNextStep
      // No need to call startIdentityMigration here
    } catch (error) {
      console.error("Data migration: Error caught:", error);
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  };

  const startIdentityMigration = async () => {
    // Step 3: Request Identity Migration
    // Check if already in progress to prevent duplicate calls
    if (steps[2].status === "in-progress" || steps[2].status === "completed") {
      console.log("Identity migration already in progress or completed, skipping duplicate call");
      return;
    }
    
    updateStepStatus(2, "in-progress");
    console.log("Requesting identity migration...");

    try {
      const requestRes = await fetch("/api/migrate/identity/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Identity request response status:", requestRes.status);
      const requestText = await requestRes.text();
      console.log("Identity request response:", requestText);

      if (!requestRes.ok) {
        try {
          const json = JSON.parse(requestText);
          throw new Error(
            json.message || "Failed to request identity migration",
          );
        } catch {
          throw new Error(
            requestText || "Failed to request identity migration",
          );
        }
      }

      try {
        const jsonData = JSON.parse(requestText);
        if (!jsonData.success) {
          throw new Error(
            jsonData.message || "Identity migration request failed",
          );
        }
        console.log("Identity migration requested successfully");

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
        // Don't verify or continue - wait for token input
        // Skip automatic verification for identity migration step
        console.log("Identity migration: Waiting for user token input, skipping auto-verification");
        return;
      } catch (e) {
        console.error("Failed to parse identity request response:", e);
        throw new Error(
          "Invalid response from server during identity request",
        );
      }
    } catch (error) {
      updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  };

  const startFinalization = async () => {
    // Step 4: Finalize Migration
    updateStepStatus(3, "in-progress");
    try {
      const finalizeRes = await fetch("/api/migrate/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const finalizeData = await finalizeRes.text();
      if (!finalizeRes.ok) {
        try {
          const json = JSON.parse(finalizeData);
          throw new Error(json.message || "Failed to finalize migration");
        } catch {
          throw new Error(finalizeData || "Failed to finalize migration");
        }
      }

      try {
        const jsonData = JSON.parse(finalizeData);
        if (!jsonData.success) {
          throw new Error(jsonData.message || "Finalization failed");
        }
      } catch {
        throw new Error("Invalid response from server during finalization");
      }

      updateStepStatus(3, "verifying");
      const verified = await verifyStep(3);
      if (!verified) {
        console.log(
          "Finalization: Verification failed, waiting for user action",
        );
        return;
      }
    } catch (error) {
      updateStepStatus(
        3,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
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
                        onClick={() => retryVerification(index)}
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
