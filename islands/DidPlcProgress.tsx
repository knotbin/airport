import { useState } from "preact/hooks";

interface PlcUpdateStep {
  name: string;
  status: "pending" | "in-progress" | "verifying" | "completed" | "error";
  error?: string;
}

export default function PlcUpdateProgress() {
  const [hasStarted, setHasStarted] = useState(false);
  const [steps, setSteps] = useState<PlcUpdateStep[]>([
    { name: "Generate PLC key", status: "pending" },
    { name: "Start PLC update", status: "pending" },
    { name: "Complete PLC update", status: "pending" },
  ]);
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [keyJson, setKeyJson] = useState<any>(null);
  const [emailToken, setEmailToken] = useState<string>("");
  const [updateResult, setUpdateResult] = useState<string>("");
  const [showDownload, setShowDownload] = useState(false);
  const [showKeyInfo, setShowKeyInfo] = useState(false);

  const updateStepStatus = (
    index: number,
    status: PlcUpdateStep["status"],
    error?: string
  ) => {
    console.log(
      `Updating step ${index} to ${status}${
        error ? ` with error: ${error}` : ""
      }`
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

  const handleStart = () => {
    setHasStarted(true);
    // Automatically start the first step
    setTimeout(() => {
      handleGenerateKey();
    }, 100);
  };

  const getStepDisplayName = (step: PlcUpdateStep, index: number) => {
    if (step.status === "completed") {
      switch (index) {
        case 0:
          return "PLC Key Generated";
        case 1:
          return "PLC Update Started";
        case 2:
          return "PLC Update Completed";
      }
    }

    if (step.status === "in-progress") {
      switch (index) {
        case 0:
          return "Generating PLC key...";
        case 1:
          return "Starting PLC update...";
        case 2:
          return step.name ===
            "Enter the token sent to your email to complete PLC update"
            ? step.name
            : "Completing PLC update...";
      }
    }

    if (step.status === "verifying") {
      switch (index) {
        case 0:
          return "Verifying key generation...";
        case 1:
          return "Verifying PLC update start...";
        case 2:
          return "Verifying PLC update completion...";
      }
    }

    return step.name;
  };

  const handleGenerateKey = async () => {
    updateStepStatus(0, "in-progress");
    setShowDownload(false);
    setKeyJson(null);
    setGeneratedKey("");
    try {
      const res = await fetch("/api/plc/keys");
      const text = await res.text();
      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Failed to generate key");
        } catch {
          throw new Error(text || "Failed to generate key");
        }
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from /api/plc/keys");
      }
      if (!data.publicKeyDid || !data.privateKeyHex) {
        throw new Error("Key generation failed: missing key data");
      }
      setGeneratedKey(data.publicKeyDid);
      setKeyJson(data);
      setShowDownload(true);
      updateStepStatus(0, "completed");

      // Auto-download the key
      setTimeout(() => {
        console.log("Attempting auto-download with keyJson:", keyJson);
        handleDownload();
      }, 500);

      // Auto-continue to next step with the generated key
      setTimeout(() => {
        handleStartPlcUpdate(data.publicKeyDid);
      }, 1000);
    } catch (error) {
      updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleStartPlcUpdate = async (keyToUse?: string) => {
    const key = keyToUse || generatedKey;
    if (!key) {
      console.log("No key generated yet", { key, generatedKey });
      updateStepStatus(1, "error", "No key generated yet");
      return;
    }

    updateStepStatus(1, "in-progress");
    try {
      const res = await fetch("/api/plc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key }),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Failed to start PLC update");
        } catch {
          throw new Error(text || "Failed to start PLC update");
        }
      }

      // Update step name to prompt for token
      setSteps((prevSteps) =>
        prevSteps.map((step, i) =>
          i === 1
            ? {
                ...step,
                name: "Enter the token sent to your email to complete PLC update",
              }
            : step
        )
      );
      updateStepStatus(1, "completed");
    } catch (error) {
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleCompletePlcUpdate = async () => {
    if (!emailToken) {
      updateStepStatus(2, "error", "Please enter the email token");
      return;
    }

    updateStepStatus(2, "in-progress");
    try {
      const res = await fetch(
        `/api/plc/update/complete?token=${encodeURIComponent(emailToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const text = await res.text();
      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Failed to complete PLC update");
        } catch {
          throw new Error(text || "Failed to complete PLC update");
        }
      }

      let data;
      try {
        data = JSON.parse(text);
        if (!data.success) {
          throw new Error(data.message || "PLC update failed");
        }
      } catch {
        throw new Error("Invalid response from server");
      }

      setUpdateResult("PLC update completed successfully!");
      updateStepStatus(2, "completed");
    } catch (error) {
      updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error)
      );
      setUpdateResult(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDownload = () => {
    console.log("handleDownload called with keyJson:", keyJson);
    if (!keyJson) {
      console.error("No key JSON to download");
      return;
    }
    try {
      const jsonString = JSON.stringify(keyJson, null, 2);
      console.log("JSON string to download:", jsonString);
      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plc-key-${keyJson.publicKeyDid || "unknown"}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      console.log("Download link created, clicking...");
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("Key downloaded successfully:", keyJson.publicKeyDid);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getStepIcon = (status: PlcUpdateStep["status"]) => {
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

  const getStepClasses = (status: PlcUpdateStep["status"]) => {
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

  if (!hasStarted) {
    return (
      <div class="space-y-6">
        <div class="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
            PLC Key Management
          </h3>
          <p class="text-blue-800 dark:text-blue-200 mb-4">
            This tool will help you generate and update PLC (Personal Linked
            Data) keys for your DID (Decentralized Identifier).
          </p>
          <div class="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              • Generate a new PLC key with cryptographic signature verification
            </p>
            <p>• Start PLC update process (sends email with token)</p>
            <p>• Complete PLC update using email token</p>
            <p>• All operations require authentication</p>
          </div>
          <button
            onClick={handleStart}
            class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
          >
            Start PLC Key Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-8">
      {/* Steps Section */}
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          PLC Update Process
        </h3>
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
                <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                  {(() => {
                    try {
                      const err = JSON.parse(step.error);
                      return err.message || step.error;
                    } catch {
                      return step.error;
                    }
                  })()}
                </p>
              )}
              {index === 1 && step.status === "completed" && (
                <div class="mt-4">
                  <button
                    type="button"
                    onClick={() => handleStartPlcUpdate()}
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                  >
                    Retry PLC Update
                  </button>
                </div>
              )}
              {index === 1 &&
                step.status === "in-progress" &&
                step.name ===
                  "Enter the token sent to your email to complete PLC update" && (
                  <div class="mt-4 space-y-4">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                      Please check your email for the PLC update token and enter
                      it below:
                    </p>
                    <div class="flex space-x-2">
                      <input
                        type="text"
                        value={emailToken}
                        onChange={(e) => setEmailToken(e.currentTarget.value)}
                        placeholder="Enter token"
                        class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={handleCompletePlcUpdate}
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

      {/* Key Information Section - Collapsible at bottom */}
      {keyJson && (
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => setShowKeyInfo(!showKeyInfo)}
            class="w-full p-4 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between"
          >
            <span class="font-medium text-gray-900 dark:text-gray-100">
              Generated Key Information
            </span>
            <svg
              class={`w-5 h-5 text-gray-500 transition-transform ${
                showKeyInfo ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showKeyInfo && (
            <div class="p-4 bg-white dark:bg-gray-900 rounded-b-lg">
              <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <b>Key type:</b> {keyJson.keyType}
                </div>
                <div>
                  <b>Public key (did:key):</b>{" "}
                  <span class="break-all font-mono">
                    {keyJson.publicKeyDid}
                  </span>
                </div>
                <div>
                  <b>Private key (hex):</b>{" "}
                  <span class="break-all font-mono">
                    {keyJson.privateKeyHex}
                  </span>
                </div>
                <div>
                  <b>Private key (multikey):</b>{" "}
                  <span class="break-all font-mono">
                    {keyJson.privateKeyMultikey}
                  </span>
                </div>
              </div>
              <div class="mt-4">
                <button
                  class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                  onClick={handleDownload}
                >
                  Download Key JSON
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {steps[2].status === "completed" && (
        <div class="p-4 bg-green-50 dark:bg-green-900 rounded-lg border-2 border-green-200 dark:border-green-800">
          <p class="text-sm text-green-800 dark:text-green-200">
            PLC update completed successfully! You can now close this page.
          </p>
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
            class="mt-4 mr-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
          >
            Sign Out
          </button>
          <a
            href="https://ko-fi.com/knotbin"
            target="_blank"
            class="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
          >
            Donate
          </a>
        </div>
      )}
    </div>
  );
}
