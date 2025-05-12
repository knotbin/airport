import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact";

interface MigrationFlowProps {
  service?: string | null;
  handle?: string | null;
  email?: string | null;
  invite?: string | null;
}

interface ServerDescription {
  availableUserDomains: string[];
  inviteCodeRequired: boolean;
  did: string;
}

interface MigrationStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  error?: string;
}

// Check if we're in the browser
const IS_BROWSER = typeof window !== "undefined";

export default function MigrationFlow(props: MigrationFlowProps) {
  const [service, setService] = useState(props.service ?? "");
  const [serverDescription, setServerDescription] = useState<ServerDescription | null>(null);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [handle, setHandle] = useState(props.handle ?? "");
  const [email, setEmail] = useState(props.email ?? "");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(props.invite ?? "");
  const [token, setToken] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  const [steps, setSteps] = useState<MigrationStep[]>([
    { name: "Create Account", status: "pending" },
    { name: "Migrate Data", status: "pending" },
    { name: "Migrate Identity", status: "pending" },
    { name: "Finalize Migration", status: "pending" },
  ]);

  // Check authentication on mount
  useEffect(() => {
    if (!IS_BROWSER) return;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "include",
        });
        
        if (!response.ok) {
          // Redirect to login if not authenticated
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        
        const userData = await response.json();
        if (!userData?.did) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
      } catch (error) {
        console.error("Failed to check authentication:", error);
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking auth
  if (isCheckingAuth && IS_BROWSER) {
    return (
      <div class="flex justify-center items-center min-h-[200px]">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  const handleServiceSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingDescription(true);
    setDescriptionError(null);

    // Add https:// if no protocol is specified
    const serviceUrl = service.match(/^https?:\/\//) ? service : `https://${service}`;

    try {
      const response = await fetch(`/api/server/describe?service=${encodeURIComponent(serviceUrl)}`);
      if (!response.ok) {
        throw new Error("Could not connect to server");
      }
      const data = await response.json();
      
      // Validate the response has the required fields
      if (!data.data?.availableUserDomains || !data.data?.did) {
        throw new Error("Invalid server response");
      }

      setServerDescription({
        availableUserDomains: data.data.availableUserDomains,
        inviteCodeRequired: data.data.inviteCodeRequired ?? false,
        did: data.data.did,
      });
      // Update the service state with the full URL
      setService(serviceUrl);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          setDescriptionError("Could not connect to server. Please check the URL and try again.");
        } else if (error.message.includes("Invalid server")) {
          setDescriptionError("This server doesn't appear to be a valid PDS. Please check the URL.");
        } else {
          setDescriptionError("Could not verify server. Please try again later.");
        }
      } else {
        setDescriptionError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoadingDescription(false);
    }
  };

  const updateStepStatus = (index: number, status: MigrationStep["status"], error?: string) => {
    setSteps(steps => steps.map((step, i) => 
      i === index ? { ...step, status, error } : step
    ));
  };

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsStarted(true);
    
    try {
      // Step 1: Create Account
      updateStepStatus(0, "in-progress");
      const createRes = await fetch("/api/server/migrate/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, handle, password, email, invite }),
      });
      
      if (!createRes.ok) {
        throw new Error("Failed to create account");
      }
      updateStepStatus(0, "completed");

      // Step 2: Migrate Data
      updateStepStatus(1, "in-progress");
      const dataRes = await fetch("/api/server/migrate/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, handle, password }),
      });
      
      if (!dataRes.ok) {
        throw new Error("Failed to migrate data");
      }
      updateStepStatus(1, "completed");

      // Wait for user to input token
      updateStepStatus(2, "in-progress");
    } catch {
      const errorStep = steps.findIndex(step => step.status === "in-progress");
      if (errorStep !== -1) {
        updateStepStatus(errorStep, "error", "Something went wrong. Please try again.");
      }
    }
  };

  const handleIdentityMigration = async () => {
    if (!token) return;

    try {
      const identityRes = await fetch("/api/server/migrate/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, handle, password, token }),
      });

      if (!identityRes.ok) {
        throw new Error("Failed to migrate identity");
      }

      const data = await identityRes.json();
      setRecoveryKey(data.recoveryKey);
      updateStepStatus(2, "completed");

      // Step 4: Finalize Migration
      updateStepStatus(3, "in-progress");
      const finalizeRes = await fetch("/api/server/migrate/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, handle, password }),
      });

      if (!finalizeRes.ok) {
        throw new Error("Failed to finalize migration");
      }
      updateStepStatus(3, "completed");

    } catch {
      const errorStep = steps.findIndex(step => step.status === "in-progress");
      if (errorStep !== -1) {
        updateStepStatus(errorStep, "error", "Something went wrong. Please try again.");
      }
    }
  };

  const getStepIcon = (status: MigrationStep["status"]) => {
    switch (status) {
      case "pending":
        return "⚪";
      case "in-progress":
        return "🔄";
      case "completed":
        return "✅";
      case "error":
        return "❌";
    }
  };

  // If migration hasn't started, show the forms
  if (!isStarted) {
    // If we don't have server description yet, show service URL form
    if (!serverDescription) {
      return (
        <div class="space-y-6">
          <form onSubmit={handleServiceSubmit} class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Service URL</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.currentTarget.value.trim())}
                required
                disabled={isLoadingDescription}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
                placeholder="bsky.social"
              />
            </div>
            {descriptionError && (
              <div class="text-sm text-red-600 dark:text-red-400">
                {descriptionError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoadingDescription}
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoadingDescription ? "Loading..." : "Continue"}
            </button>
          </form>
        </div>
      );
    }

    // Show the main migration form with server-specific fields
    return (
      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Handle</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              value={handle.split('.')[0]}
              onChange={(e) => {
                const username = e.currentTarget.value.replace(/\./g, ''); // Remove any dots
                const domain = serverDescription.availableUserDomains[0];
                setHandle(domain ? `${username}.${domain}` : username);
              }}
              required
              class="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              placeholder="username"
            />
            {serverDescription.availableUserDomains.length > 0 && (
              <>
                <div class="inline-flex items-center border-t border-b border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                  <div class="h-full w-px bg-gray-300 dark:bg-gray-600 mx-px"></div>
                </div>
                <span class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:text-sm">
                  {serverDescription.availableUserDomains[0]}
                </span>
              </>
            )}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
          />
        </div>
        {serverDescription.inviteCodeRequired && (
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Invite Code <span class="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={invite}
              onChange={(e) => setInvite(e.currentTarget.value)}
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />
          </div>
        )}
        <div class="bg-blue-50 dark:bg-blue-900 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Server Information
              </h3>
              <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>Server DID: {serverDescription.did}</p>
                <p>Invite Code Required: {serverDescription.inviteCodeRequired ? "Yes" : "No"}</p>
                <p>Available Domains: {serverDescription.availableUserDomains.join(", ")}</p>
              </div>
            </div>
          </div>
        </div>
        <button
          type="submit"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Start Migration
        </button>
      </form>
    );
  }

  // Show migration progress
  return (
    <div class="space-y-8">
      <div class="space-y-4">
        {steps.map((step) => (
          <div key={step.name} class="flex items-center space-x-3">
            <span class="text-xl">{getStepIcon(step.status)}</span>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">{step.name}</p>
              {step.error && (
                <p class="text-sm text-red-600">{step.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {steps[2].status === "in-progress" && (
        <div class="space-y-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
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
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Token
            </button>
          </div>
        </div>
      )}

      {recoveryKey && (
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
          <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Important: Save your recovery key
          </p>
          <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300 break-all font-mono">
            {recoveryKey}
          </p>
        </div>
      )}

      {steps[3].status === "completed" && (
        <div class="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <p class="text-sm text-green-800 dark:text-green-200">
            Migration completed successfully! You can now close this page.
          </p>
        </div>
      )}
    </div>
  );
} 