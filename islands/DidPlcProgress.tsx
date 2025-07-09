import { useState } from "preact/hooks";
import { Link } from "../components/Link.tsx";

interface PlcUpdateStep {
  name: string;
  status: "pending" | "in-progress" | "verifying" | "completed" | "error";
  error?: string;
}

export default function PlcUpdateProgress() {
  const [hasStarted, setHasStarted] = useState(false);
  const [steps, setSteps] = useState<PlcUpdateStep[]>([
    { name: "Generate Rotation Key", status: "pending" },
    { name: "Start PLC update", status: "pending" },
    { name: "Complete PLC update", status: "pending" },
  ]);
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [keyJson, setKeyJson] = useState<any>(null);
  const [emailToken, setEmailToken] = useState<string>("");
  const [updateResult, setUpdateResult] = useState<string>("");
  const [showDownload, setShowDownload] = useState(false);
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const [hasDownloadedKey, setHasDownloadedKey] = useState(false);
  const [downloadedKeyId, setDownloadedKeyId] = useState<string | null>(null);

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
          return "Rotation Key Generated";
        case 1:
          return "PLC Operation Requested";
        case 2:
          return "PLC Update Completed";
      }
    }

    if (step.status === "in-progress") {
      switch (index) {
        case 0:
          return "Generating Rotation Key...";
        case 1:
          return "Requesting PLC Operation Token...";
        case 2:
          return step.name ===
            "Enter the code sent to your email to complete PLC update"
            ? step.name
            : "Completing PLC Update...";
      }
    }

    if (step.status === "verifying") {
      switch (index) {
        case 0:
          return "Verifying Rotation Key Generation...";
        case 1:
          return "Verifying PLC Operation Token Request...";
        case 2:
          return "Verifying PLC Update Completion...";
      }
    }

    return step.name;
  };

  const handleStartPlcUpdate = async (keyToUse?: string) => {
    const key = keyToUse || generatedKey;

    // Debug logging
    console.log("=== PLC Update Debug ===");
    console.log("Current state:", {
      keyToUse,
      generatedKey,
      key,
      hasKeyJson: !!keyJson,
      keyJsonId: keyJson?.publicKeyDid,
      hasDownloadedKey,
      downloadedKeyId,
      steps: steps.map((s) => ({ name: s.name, status: s.status })),
    });

    if (!key) {
      console.log("No key generated yet");
      updateStepStatus(1, "error", "No key generated yet");
      return;
    }

    if (!keyJson || keyJson.publicKeyDid !== key) {
      console.log("Key mismatch or missing:", {
        hasKeyJson: !!keyJson,
        keyJsonId: keyJson?.publicKeyDid,
        expectedKey: key,
      });
      updateStepStatus(
        1,
        "error",
        "Please ensure you have the correct key loaded"
      );
      return;
    }

    updateStepStatus(1, "in-progress");
    try {
      // First request the token
      console.log("Requesting PLC token...");
      const tokenRes = await fetch("/api/plc/token", {
        method: "GET",
      });
      const tokenText = await tokenRes.text();
      console.log("Token response:", tokenText);

      if (!tokenRes.ok) {
        try {
          const json = JSON.parse(tokenText);
          throw new Error(json.message || "Failed to request PLC token");
        } catch {
          throw new Error(tokenText || "Failed to request PLC token");
        }
      }

      let data;
      try {
        data = JSON.parse(tokenText);
        if (!data.success) {
          throw new Error(data.message || "Failed to request token");
        }
      } catch (error) {
        throw new Error("Invalid response from server");
      }

      console.log("Token request successful, updating UI...");
      // Update step name to prompt for token
      setSteps((prevSteps) =>
        prevSteps.map((step, i) =>
          i === 1
            ? {
                ...step,
                name: "Enter the code sent to your email to complete PLC update",
                status: "in-progress",
              }
            : step
        )
      );
    } catch (error) {
      console.error("Token request failed:", error);
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleTokenSubmit = async () => {
    console.log("=== Token Submit Debug ===");
    console.log("Current state:", {
      emailToken,
      generatedKey,
      keyJsonId: keyJson?.publicKeyDid,
      steps: steps.map((s) => ({ name: s.name, status: s.status })),
    });

    if (!emailToken) {
      console.log("No token provided");
      updateStepStatus(1, "error", "Please enter the email token");
      return;
    }

    if (!keyJson || !keyJson.publicKeyDid) {
      console.log("Missing key data");
      updateStepStatus(1, "error", "Key data is missing, please try again");
      return;
    }

    // Prevent duplicate submissions
    if (steps[1].status === "completed" || steps[2].status === "completed") {
      console.log("Update already completed, preventing duplicate submission");
      return;
    }

    updateStepStatus(1, "completed");
    try {
      updateStepStatus(2, "in-progress");
      console.log("Submitting update request with token...");
      // Send the update request with both key and token
      const res = await fetch("/api/plc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyJson.publicKeyDid,
          token: emailToken,
        }),
      });
      const text = await res.text();
      console.log("Update response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from server");
      }

      // Check for error responses
      if (!res.ok || !data.success) {
        const errorMessage = data.message || "Failed to complete PLC update";
        console.error("Update failed:", errorMessage);
        throw new Error(errorMessage);
      }

      // Only proceed if we have a successful response
      console.log("Update completed successfully!");
      setUpdateResult("PLC update completed successfully!");

      // Add a delay before marking steps as completed for better UX
      updateStepStatus(2, "verifying");

      const verifyRes = await fetch("/api/plc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyJson.publicKeyDid,
        }),
      });

      const verifyText = await verifyRes.text();
      console.log("Verification response:", verifyText);

      let verifyData;
      try {
        verifyData = JSON.parse(verifyText);
      } catch {
        throw new Error("Invalid verification response from server");
      }

      if (!verifyRes.ok || !verifyData.success) {
        const errorMessage =
          verifyData.message || "Failed to verify PLC update";
        console.error("Verification failed:", errorMessage);
        throw new Error(errorMessage);
      }

      console.log("Verification successful, marking steps as completed");
      updateStepStatus(2, "completed");
    } catch (error) {
      console.error("Update failed:", error);
      // Reset the steps to error state
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error)
      );
      updateStepStatus(2, "pending"); // Reset the final step
      setUpdateResult(error instanceof Error ? error.message : String(error));

      // If token is invalid, we should clear it so user can try again
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("token is invalid")
      ) {
        setEmailToken("");
      }
    }
  };

  const handleCompletePlcUpdate = async () => {
    // This function is no longer needed as we handle everything in handleTokenSubmit
    return;
  };

  const handleDownload = () => {
    console.log("=== Download Debug ===");
    console.log("Download started with:", {
      hasKeyJson: !!keyJson,
      keyJsonId: keyJson?.publicKeyDid,
    });

    if (!keyJson) {
      console.error("No key JSON to download");
      return;
    }

    try {
      const jsonString = JSON.stringify(keyJson, null, 2);
      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plc-key-${keyJson.publicKeyDid || "unknown"}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Download completed, proceeding to next step...");
      setHasDownloadedKey(true);
      setDownloadedKeyId(keyJson.publicKeyDid);

      // Automatically proceed to the next step after successful download
      setTimeout(() => {
        console.log("Auto-proceeding with key:", keyJson.publicKeyDid);
        handleStartPlcUpdate(keyJson.publicKeyDid);
      }, 1000);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleGenerateKey = async () => {
    console.log("=== Generate Key Debug ===");
    updateStepStatus(0, "in-progress");
    setShowDownload(false);
    setKeyJson(null);
    setGeneratedKey("");
    setHasDownloadedKey(false);
    setDownloadedKeyId(null);

    try {
      console.log("Requesting new key...");
      const res = await fetch("/api/plc/keys");
      const text = await res.text();
      console.log("Key generation response:", text);

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

      console.log("Key generated successfully:", {
        keyId: data.publicKeyDid,
      });

      setGeneratedKey(data.publicKeyDid);
      setKeyJson(data);
      setShowDownload(true);
      updateStepStatus(0, "completed");
    } catch (error) {
      console.error("Key generation failed:", error);
      updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : String(error)
      );
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

  const requestNewToken = async () => {
    try {
      console.log("Requesting new token...");
      const res = await fetch("/api/plc/token", {
        method: "GET",
      });
      const text = await res.text();
      console.log("Token request response:", text);

      if (!res.ok) {
        throw new Error(text || "Failed to request new token");
      }

      let data;
      try {
        data = JSON.parse(text);
        if (!data.success) {
          throw new Error(data.message || "Failed to request token");
        }
      } catch {
        throw new Error("Invalid response from server");
      }

      // Clear any existing error and token
      setEmailToken("");
      updateStepStatus(1, "in-progress");
      updateStepStatus(2, "pending");
    } catch (error) {
      console.error("Failed to request new token:", error);
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  if (!hasStarted) {
    return (
      <div class="space-y-6">
        <div class="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            DID Rotation Key Management
          </h3>

          {/* Main Description */}
          <div class="prose dark:prose-invert max-w-none mb-6">
            <p class="text-blue-800 dark:text-blue-200 mb-4">
              This tool helps you add a new rotation key to your{" "}
              <Link
                href="https://web.plc.directory/"
                isExternal
                class="text-blue-600 dark:text-blue-400"
              >
                PLC (Public Ledger of Credentials)
              </Link>
              . Having control of a rotation key gives you sovereignty over your
              DID (Decentralized Identifier).
            </p>

            <h4 class="text-blue-900 dark:text-blue-100 font-medium mt-4 mb-2">
              What you can do with a rotation key:
            </h4>
            <ul class="space-y-2 text-sm text-blue-700 dark:text-blue-300 list-disc pl-5">
              <li>
                <span class="font-medium">Move to a different provider:</span>
                <br />
                Change your PDS without losing your identity, protecting you if
                your provider becomes hostile.
              </li>
              <li>
                <span class="font-medium">Direct DID control:</span>
                <br />
                Modify your DID document independently of your provider.
              </li>
            </ul>

            <h4 class="text-blue-900 dark:text-blue-100 font-medium mt-6 mb-2">
              Process Overview:
            </h4>
            <ol class="space-y-2 text-sm text-blue-700 dark:text-blue-300 list-decimal pl-5">
              <li>Generate a new rotation key</li>
              <li>Download the key</li>
              <li>Verify your identity via email</li>
              <li>Add the key to your PLC document</li>
            </ol>
          </div>

          {/* Technical Note for Developers */}
          <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              📝 Technical Note
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              The rotation key is a did:key that will be added to your PLC
              document's rotationKeys array. This process uses the AT Protocol's
              PLC operations to update your DID document.
              <Link
                href="https://web.plc.directory/"
                class="text-blue-600 dark:text-blue-400 ml-1"
                isExternal
              >
                Learn more about did:plc
              </Link>
            </p>
          </div>

          <button
            onClick={handleStart}
            class="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
          >
            <span>Start Key Generation</span>
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-8">
      {/* Progress Steps */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            Key Generation Progress
          </h3>
          {/* Add a help tooltip */}
          <div class="relative group">
            <button class="text-gray-400 hover:text-gray-500">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <div class="absolute right-0 w-64 p-2 mt-2 space-y-1 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
              <p class="text-gray-600 dark:text-gray-400">
                Follow these steps to securely add a new rotation key to your
                PLC record. Each step requires completion before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Steps with enhanced visual hierarchy */}
        {steps.map((step, index) => (
          <div
            key={step.name}
            class={`${getStepClasses(step.status)} ${
              step.status === "in-progress"
                ? "ring-2 ring-blue-500 ring-opacity-50"
                : ""
            }`}
          >
            <div class="flex-shrink-0">{getStepIcon(step.status)}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
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
                {/* Add step number */}
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  Step {index + 1} of {steps.length}
                </span>
              </div>

              {step.error && (
                <div class="mt-2 p-2 bg-red-50 dark:bg-red-900/50 rounded-md">
                  <p class="text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg
                      class="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {(() => {
                      try {
                        const err = JSON.parse(step.error);
                        return err.message || step.error;
                      } catch {
                        return step.error;
                      }
                    })()}
                  </p>
                </div>
              )}

              {/* Key Download Warning */}
              {index === 0 &&
                step.status === "completed" &&
                !hasDownloadedKey && (
                  <div class="mt-4 space-y-4">
                    <div class="bg-yellow-50 dark:bg-yellow-900/50 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div class="flex items-start">
                        <div class="flex-shrink-0">
                          <svg
                            class="h-5 w-5 text-yellow-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </div>
                        <div class="ml-3">
                          <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Critical Security Step
                          </h3>
                          <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                            <p class="mb-2">
                              Your rotation key grants control over your
                              identity:
                            </p>
                            <ul class="list-disc pl-5 space-y-2">
                              <li>
                                <strong>Store Securely:</strong> Use a password
                                manager
                              </li>
                              <li>
                                <strong>Keep Private:</strong> Never share with
                                anyone
                              </li>
                              <li>
                                <strong>Backup:</strong> Keep a secure backup
                                copy
                              </li>
                              <li>
                                <strong>Required:</strong> Needed for future DID
                                modifications
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between">
                      <button
                        onClick={handleDownload}
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span>Download Key</span>
                      </button>

                      <div class="flex items-center text-sm text-red-600 dark:text-red-400">
                        <svg
                          class="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        Download required to proceed
                      </div>
                    </div>
                  </div>
                )}

              {/* Email Code Input */}
              {index === 1 &&
                (step.status === "in-progress" ||
                  step.status === "verifying") &&
                step.name ===
                  "Enter the code sent to your email to complete PLC update" && (
                  <div class="mt-4 space-y-4">
                    <div class="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
                      <p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        Check your email for the verification code to complete
                        the PLC update:
                      </p>
                      <div class="flex space-x-2">
                        <div class="flex-1 relative">
                          <input
                            type="text"
                            value={emailToken}
                            onChange={(e) =>
                              setEmailToken(e.currentTarget.value)
                            }
                            placeholder="Enter verification code"
                            class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleTokenSubmit}
                          disabled={!emailToken || step.status === "verifying"}
                          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <span>
                            {step.status === "verifying"
                              ? "Verifying..."
                              : "Verify"}
                          </span>
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                      </div>
                      {step.error && (
                        <div class="mt-2 p-2 bg-red-50 dark:bg-red-900/50 rounded-md">
                          <p class="text-sm text-red-600 dark:text-red-400 flex items-center">
                            <svg
                              class="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {step.error}
                          </p>
                          {step.error
                            .toLowerCase()
                            .includes("token is invalid") && (
                            <div class="mt-2">
                              <p class="text-sm text-red-500 dark:text-red-300 mb-2">
                                The verification code may have expired. Request
                                a new code to try again.
                              </p>
                              <button
                                onClick={requestNewToken}
                                class="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded-md transition-colors duration-200 flex items-center space-x-1"
                              >
                                <svg
                                  class="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                <span>Request New Code</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {steps[2].status === "completed" && (
        <div class="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg border-2 border-green-200 dark:border-green-800">
          <div class="flex items-center space-x-3 mb-4">
            <svg
              class="w-6 h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h4 class="text-lg font-medium text-green-800 dark:text-green-200">
              PLC Update Successful!
            </h4>
          </div>
          <p class="text-sm text-green-700 dark:text-green-300 mb-4">
            Your rotation key has been successfully added to your PLC record.
            You can now use this key for future DID modifications.
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
