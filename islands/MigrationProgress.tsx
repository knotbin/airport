import { useEffect, useState } from "preact/hooks";

interface MigrationProgressProps {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

interface MigrationStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  error?: string;
}

export default function MigrationProgress(props: MigrationProgressProps) {
  const [token, setToken] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [steps, setSteps] = useState<MigrationStep[]>([
    { name: "Create Account", status: "pending" },
    { name: "Migrate Data", status: "pending" },
    { name: "Request Identity Migration", status: "pending" },
    { name: "Complete Identity Migration", status: "pending" },
    { name: "Finalize Migration", status: "pending" },
  ]);

  const updateStepStatus = (
    index: number,
    status: MigrationStep["status"],
    error?: string,
  ) => {
    console.log(
      `Updating step ${index} to ${status}${
        error ? ` with error: ${error}` : ""
      }`,
    );
    setSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index
          ? { ...step, status, error }
          : i > index
          ? { ...step, status: "pending", error: undefined }
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

    if (!validateParams()) {
      console.log("Parameter validation failed");
      return;
    }

    startMigration().catch((error) => {
      console.error("Unhandled migration error:", error);
      updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : String(error),
      );
    });
  }, []);

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
          throw new Error(responseText || "Failed to create account");
        }

        try {
          const jsonData = JSON.parse(responseText);
          if (!jsonData.success) {
            throw new Error(jsonData.message || "Account creation failed");
          }
        } catch (e) {
          console.log("Response is not JSON or lacks success field:", e);
        }

        updateStepStatus(0, "completed");
      } catch (error) {
        updateStepStatus(
          0,
          "error",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      // Step 2: Migrate Data
      updateStepStatus(1, "in-progress");
      console.log("Starting data migration...");

      try {
        const dataRes = await fetch("/api/migrate/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        console.log("Data migration response status:", dataRes.status);
        const dataText = await dataRes.text();
        console.log("Data migration response:", dataText);

        if (!dataRes.ok) {
          throw new Error(dataText || "Failed to migrate data");
        }

        try {
          const jsonData = JSON.parse(dataText);
          if (!jsonData.success) {
            throw new Error(jsonData.message || "Data migration failed");
          }
          console.log("Data migration successful:", jsonData);
        } catch (e) {
          console.error("Failed to parse data migration response:", e);
          throw new Error("Invalid response from server during data migration");
        }

        updateStepStatus(1, "completed");
      } catch (error) {
        updateStepStatus(
          1,
          "error",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      // Step 3: Request Identity Migration
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
          throw new Error(
            requestText || "Failed to request identity migration",
          );
        }

        try {
          const jsonData = JSON.parse(requestText);
          if (!jsonData.success) {
            throw new Error(
              jsonData.message || "Identity migration request failed",
            );
          }
          console.log("Identity migration requested successfully");
        } catch (e) {
          console.error("Failed to parse identity request response:", e);
          throw new Error(
            "Invalid response from server during identity request",
          );
        }

        updateStepStatus(2, "completed");
        // Move to token input step
        updateStepStatus(3, "in-progress");
      } catch (error) {
        updateStepStatus(
          2,
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
        throw new Error(
          identityData || "Failed to complete identity migration",
        );
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

      setRecoveryKey(data.recoveryKey);
      updateStepStatus(3, "completed");

      // Step 5: Finalize Migration
      updateStepStatus(4, "in-progress");
      try {
        const finalizeRes = await fetch("/api/migrate/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const finalizeData = await finalizeRes.text();
        if (!finalizeRes.ok) {
          throw new Error(finalizeData || "Failed to finalize migration");
        }

        try {
          const jsonData = JSON.parse(finalizeData);
          if (!jsonData.success) {
            throw new Error(jsonData.message || "Finalization failed");
          }
        } catch {
          throw new Error("Invalid response from server during finalization");
        }

        updateStepStatus(4, "completed");
      } catch (error) {
        updateStepStatus(
          4,
          "error",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    } catch (error) {
      console.error("Identity migration error:", error);
      updateStepStatus(
        3,
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
      case "completed":
        return `${baseClasses} bg-green-50 dark:bg-green-900`;
      case "error":
        return `${baseClasses} bg-red-50 dark:bg-red-900`;
    }
  };

  return (
    <div class="space-y-8">
      <div class="space-y-4">
        {steps.map((step) => (
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
                {step.name}
              </p>
              {step.error && (
                <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                  {step.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {steps[3].status === "in-progress" && (
        <div class="space-y-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            Please check your email for the migration token and enter it below:
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
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Submit Token
            </button>
          </div>
        </div>
      )}

      {recoveryKey && (
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
          <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Important: Save your recovery key
          </p>
          <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300 break-all font-mono">
            {recoveryKey}
          </p>
        </div>
      )}

      {steps[4].status === "completed" && (
        <div class="p-4 bg-green-50 dark:bg-green-900 rounded-lg border-2 border-green-200 dark:border-green-800">
          <p class="text-sm text-green-800 dark:text-green-200">
            Migration completed successfully! You can now close this page.
          </p>
        </div>
      )}
    </div>
  );
}
