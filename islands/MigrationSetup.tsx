import { useState } from "preact/hooks";

interface MigrationSetupProps {
  service?: string | null;
  handle?: string | null;
  email?: string | null;
  invite?: string | null;
}

interface ServerDescription {
  inviteCodeRequired: boolean;
  availableUserDomains: string[];
}

export default function MigrationSetup(props: MigrationSetupProps) {
  const [service, setService] = useState(props.service || "");
  const [handlePrefix, setHandlePrefix] = useState(props.handle?.split(".")[0] || "");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [email, setEmail] = useState(props.email || "");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(props.invite || "");
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const checkServerDescription = async (serviceUrl: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${serviceUrl}/xrpc/com.atproto.server.describeServer`);
      if (!response.ok) {
        throw new Error("Failed to fetch server description");
      }
      const data: ServerDescription = await response.json();
      setInviteRequired(data.inviteCodeRequired ?? false);
      const domains = data.availableUserDomains || [];
      setAvailableDomains(domains);
      if (domains.length === 1) {
        setSelectedDomain(domains[0]);
      } else if (domains.length > 1) {
        setSelectedDomain(domains[0]);
      }
    } catch (err) {
      console.error("Failed to check server description:", err);
      setError("Failed to connect to server. Please check the URL and try again.");
      setInviteRequired(false);
      setAvailableDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceChange = (value: string) => {
    setService(value);
    setError("");
    if (value) {
      checkServerDescription(value);
    } else {
      setAvailableDomains([]);
      setSelectedDomain("");
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    if (!service || !handlePrefix || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (inviteRequired && !invite) {
      setError("Invite code is required for this server");
      return;
    }

    const fullHandle = `${handlePrefix}${
      availableDomains.length === 1 
        ? availableDomains[0]
        : availableDomains.length > 1 
          ? selectedDomain
          : ".example.com"
    }`;

    // Redirect to progress page with parameters
    const params = new URLSearchParams({
      service,
      handle: fullHandle,
      email,
      password,
      ...(invite ? { invite } : {})
    });
    globalThis.location.href = `/migrate/progress?${params.toString()}`;
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {error && (
        <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
          <p class="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Service URL
          </label>
          <input
            type="url"
            value={service}
            onChange={(e) => handleServiceChange(e.currentTarget.value)}
            placeholder="https://example.com"
            required
            disabled={isLoading}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isLoading && (
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Checking server configuration...
            </p>
          )}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Handle
          </label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              value={handlePrefix}
              onChange={(e) => setHandlePrefix(e.currentTarget.value)}
              placeholder="username"
              required
              class="flex-1 rounded-l-md border-r-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {availableDomains.length > 0 ? (
              availableDomains.length === 1 ? (
                <span class="inline-flex items-center px-3 rounded-r-md bg-white text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {availableDomains[0]}
                </span>
              ) : (
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.currentTarget.value)}
                  class="rounded-r-md border-l-0 border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {availableDomains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              )
            ) : (
              <span class="inline-flex items-center px-3 rounded-r-md bg-white text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                .example.com
              </span>
            )}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {inviteRequired && (
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Invite Code
            </label>
            <input
              type="text"
              value={invite}
              onChange={(e) => setInvite(e.currentTarget.value)}
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Migration
      </button>
    </form>
  );
} 