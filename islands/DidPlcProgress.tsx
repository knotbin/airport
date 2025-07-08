import { useState } from "preact/hooks";

interface PlcUpdateStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  error?: string;
}

export default function PlcUpdateProgress() {
  const [hasStarted, setHasStarted] = useState(false);
  const [steps, setSteps] = useState<PlcUpdateStep[]>([
    { name: "Generate PLC key", status: "pending" },
    { name: "Update PLC key", status: "pending" },
  ]);
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [updateKey, setUpdateKey] = useState<string>("");
  const [updateResult, setUpdateResult] = useState<string>("");

  const updateStepStatus = (
    index: number,
    status: PlcUpdateStep["status"],
    error?: string
  ) => {
    setSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index ? { ...step, status, error } : step
      )
    );
  };

  const handleStart = () => {
    setHasStarted(true);
  };

  const handleGenerateKey = async () => {
    updateStepStatus(0, "in-progress");
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
      if (!data.did || !data.signature) {
        throw new Error("Key generation failed: missing did or signature");
      }
      setGeneratedKey(data.did);
      setUpdateKey(data.did);
      updateStepStatus(0, "completed");
    } catch (error) {
      updateStepStatus(
        0,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleUpdateKey = async () => {
    updateStepStatus(1, "in-progress");
    setUpdateResult("");
    try {
      const res = await fetch("/api/plc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: updateKey }),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Failed to update key");
        } catch {
          throw new Error(text || "Failed to update key");
        }
      }
      setUpdateResult("Key updated successfully!");
      updateStepStatus(1, "completed");
    } catch (error) {
      updateStepStatus(
        1,
        "error",
        error instanceof Error ? error.message : String(error)
      );
      setUpdateResult(error instanceof Error ? error.message : String(error));
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
            <p>• Update your existing DID with the new key</p>
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
      <div class="space-y-4">
        {/* Step 1: Generate PLC key */}
        <div
          class={`flex items-center space-x-3 p-4 rounded-lg ${
            steps[0].status === "completed"
              ? "bg-green-50 dark:bg-green-900"
              : steps[0].status === "in-progress"
              ? "bg-blue-50 dark:bg-blue-900"
              : steps[0].status === "error"
              ? "bg-red-50 dark:bg-red-900"
              : "bg-gray-50 dark:bg-gray-800"
          }`}
        >
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={handleGenerateKey}
            disabled={steps[0].status === "in-progress"}
          >
            Generate PLC Key
          </button>
          {steps[0].status === "completed" && (
            <span class="text-green-700 ml-4">Key generated!</span>
          )}
          {steps[0].status === "error" && (
            <span class="text-red-700 ml-4">{steps[0].error}</span>
          )}
        </div>
        {generatedKey && (
          <div class="p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <div class="text-xs text-gray-700 dark:text-gray-200 break-all">
              <b>Generated DID:</b> {generatedKey}
            </div>
          </div>
        )}
        {/* Step 2: Update PLC key */}
        <div
          class={`flex flex-col space-y-2 p-4 rounded-lg ${
            steps[1].status === "completed"
              ? "bg-green-50 dark:bg-green-900"
              : steps[1].status === "in-progress"
              ? "bg-blue-50 dark:bg-blue-900"
              : steps[1].status === "error"
              ? "bg-red-50 dark:bg-red-900"
              : "bg-gray-50 dark:bg-gray-800"
          }`}
        >
          <label class="text-sm mb-1">DID to update:</label>
          <input
            class="p-2 rounded border border-gray-300 dark:border-gray-600"
            type="text"
            value={updateKey}
            onInput={(e) => setUpdateKey(e.currentTarget.value)}
            placeholder="Paste or use generated DID"
          />
          <button
            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={handleUpdateKey}
            disabled={steps[1].status === "in-progress" || !updateKey}
          >
            Update PLC Key
          </button>
          {steps[1].status === "completed" && (
            <span class="text-green-700 mt-2">{updateResult}</span>
          )}
          {steps[1].status === "error" && (
            <span class="text-red-700 mt-2">{steps[1].error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
