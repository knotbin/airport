import { useState, useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

/**
 * The migration setup props.
 * @type {MigrationSetupProps}
 */
interface MigrationSetupProps {
  service?: string | null;
  handle?: string | null;
  email?: string | null;
  invite?: string | null;
}

/**
 * The server description.
 * @type {ServerDescription}
 */
interface ServerDescription {
  inviteCodeRequired: boolean;
  availableUserDomains: string[];
}

/**
 * The user passport.
 * @type {UserPassport}
 */
interface UserPassport {
  did: string;
  handle: string;
  pds: string;
  createdAt?: string;
}

/**
 * The migration setup component.
 * @param props - The migration setup props
 * @returns The migration setup component
 * @component
 */
export default function MigrationSetup(props: MigrationSetupProps) {
  const [service, setService] = useState(props.service || "");
  const [handlePrefix, setHandlePrefix] = useState(
    props.handle?.split(".")[0] || "",
  );
  const [selectedDomain, setSelectedDomain] = useState("");
  const [email, setEmail] = useState(props.email || "");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(props.invite || "");
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [passport, setPassport] = useState<UserPassport | null>(null);

  const ensureServiceUrl = (url: string): string => {
    if (!url) return url;
    try {
      // If it already has a protocol, return as is
      new URL(url);
      return url;
    } catch {
      // If no protocol, add https://
      return `https://${url}`;
    }
  };

  useEffect(() => {
    if (!IS_BROWSER) return;

    const fetchPassport = async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const userData = await response.json();
        if (userData) {
          // Get PDS URL from the current service
          const pdsResponse = await fetch(`/api/resolve-pds?did=${userData.did}`);
          const pdsData = await pdsResponse.json();
          
          setPassport({
            did: userData.did,
            handle: userData.handle,
            pds: pdsData.pds || "Unknown",
            createdAt: new Date().toISOString() // TODO: Get actual creation date from API
          });
        }
      } catch (error) {
        console.error("Failed to fetch passport:", error);
      }
    };

    fetchPassport();
  }, []);

  const checkServerDescription = async (serviceUrl: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${serviceUrl}/xrpc/com.atproto.server.describeServer`,
      );
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
      setError(
        "Failed to connect to server. Please check the URL and try again.",
      );
      setInviteRequired(false);
      setAvailableDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceChange = (value: string) => {
    const urlWithProtocol = ensureServiceUrl(value);
    setService(urlWithProtocol);
    setError("");
    if (urlWithProtocol) {
      checkServerDescription(urlWithProtocol);
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

    setShowConfirmation(true);
  };

  const handleConfirmation = () => {
    if (confirmationText !== "MIGRATE") {
      setError("Please type 'MIGRATE' to confirm");
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
      ...(invite ? { invite } : {}),
    });
    globalThis.location.href = `/migrate/progress?${params.toString()}`;
  };

  return (
    <div class="max-w-2xl mx-auto p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-xl relative overflow-hidden">
      {/* Decorative airport elements */}
      <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
      <div class="absolute top-2 left-4 text-blue-500 text-sm font-mono">TERMINAL 1</div>
      <div class="absolute top-2 right-4 text-blue-500 text-sm font-mono">GATE M1</div>

      <div class="text-center mb-8 relative">
        <p class="text-gray-600 dark:text-gray-400 mt-4">Please complete your migration check-in</p>
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 font-mono">FLIGHT: MIG-2024</div>
      </div>

      {/* Passport Section */}
      {passport && (
        <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Current Passport</h3>
            <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">ISSUED: {new Date().toLocaleDateString()}</div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-500 dark:text-gray-400 mb-1">Handle</div>
              <div class="font-mono text-gray-900 dark:text-white">{passport.handle}</div>
            </div>
            <div>
              <div class="text-gray-500 dark:text-gray-400 mb-1">DID</div>
              <div class="font-mono text-gray-900 dark:text-white break-all">{passport.did}</div>
            </div>
            <div>
              <div class="text-gray-500 dark:text-gray-400 mb-1">Citizen of PDS</div>
              <div class="font-mono text-gray-900 dark:text-white break-all">{passport.pds}</div>
            </div>
            <div>
              <div class="text-gray-500 dark:text-gray-400 mb-1">Account Age</div>
              <div class="font-mono text-gray-900 dark:text-white">
                {passport.createdAt ? new Date(passport.createdAt).toLocaleDateString() : "Unknown"}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-6">
        {error && (
          <div class="bg-red-50 dark:bg-red-900 rounded-lg">
            <p class="text-red-800 dark:text-red-200 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              {error}
            </p>
          </div>
        )}

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Destination Server
              <span class="text-xs text-gray-500 ml-1">(Final Destination)</span>
            </label>
            <div class="relative">
              <input
                type="url"
                value={service}
                onChange={(e) => handleServiceChange(e.currentTarget.value)}
                placeholder="https://example.com"
                required
                disabled={isLoading}
                class="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed pl-10"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                </svg>
              </div>
            </div>
            {isLoading && (
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying destination server...
              </p>
            )}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Account Handle
              <span class="text-xs text-gray-500 ml-1">(Passport ID)</span>
            </label>
            <div class="mt-1 relative w-full">
              <div class="flex rounded-md shadow-sm w-full">
                <div class="relative flex-1">
                  <input
                    type="text"
                    value={handlePrefix}
                    onChange={(e) => setHandlePrefix(e.currentTarget.value)}
                    placeholder="username"
                    required
                    class="w-full rounded-md bg-white dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:text-white pl-10 pr-32"
                    style={{ fontFamily: 'inherit' }}
                  />
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  {/* Suffix for domain ending */}
                  {availableDomains.length > 0 ? (
                    availableDomains.length === 1 ? (
                      <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 select-none pointer-events-none font-mono text-base">
                        {availableDomains[0]}
                      </span>
                    ) : (
                      <span class="absolute inset-y-0 right-0 flex items-center pr-1">
                        <select
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.currentTarget.value)}
                          class="bg-transparent text-gray-400 font-mono text-base focus:outline-none focus:ring-0 border-0 pr-2"
                          style={{ appearance: 'none' }}
                        >
                          {availableDomains.map((domain) => (
                            <option key={domain} value={domain}>{domain}</option>
                          ))}
                        </select>
                      </span>
                    )
                  ) : (
                    <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 select-none pointer-events-none font-mono text-base">
                      .example.com
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
              <span class="text-xs text-gray-500 ml-1">(Emergency Contact)</span>
            </label>
            <div class="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                class="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:text-white pl-10"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Account Password
              <span class="text-xs text-gray-500 ml-1">(Security Clearance)</span>
            </label>
            <div class="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                class="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:text-white pl-10"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
            </div>
          </div>

          {inviteRequired && (
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invitation Code
                <span class="text-xs text-gray-500 ml-1">(Boarding Pass)</span>
              </label>
              <div class="relative">
                <input
                  type="text"
                  value={invite}
                  onChange={(e) => setInvite(e.currentTarget.value)}
                  required
                  class="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:text-white pl-10"
                />
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          class="w-full flex justify-center items-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Proceed to Check-in
        </button>
      </form>

      {showConfirmation && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl border-0 relative animate-popin"
            style={{ boxShadow: '0 8px 32px 0 rgba(255, 0, 0, 0.15), 0 1.5px 8px 0 rgba(0,0,0,0.10)' }}
          >
            <div class="absolute -top-8 left-1/2 -translate-x-1/2">
              <div class="bg-red-500 rounded-full p-3 shadow-lg animate-bounce-short">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div class="text-center mb-4 mt-6">
              <h3 class="text-2xl font-bold text-red-600 mb-2 tracking-wide">Final Boarding Call</h3>
              <p class="text-gray-700 dark:text-gray-300 mb-2 text-base">
                <span class="font-semibold text-red-500">Warning:</span> This migration process can be <strong>irreversible</strong>.<br />Airport is in <strong>alpha</strong> currently, and we don't recommend it for main accounts. Migrate at your own risk. We reccomend backing up your data before proceeding.
              </p>
              <p class="text-gray-700 dark:text-gray-300 mb-4 text-base">
                Please type <span class="font-mono font-bold text-blue-600">MIGRATE</span> below to confirm and proceed.
              </p>
            </div>
            <div class="relative">
              <input
                type="text"
                value={confirmationText}
                onInput={(e) => setConfirmationText(e.currentTarget.value)}
                placeholder="Type MIGRATE to confirm"
                class="w-full p-3 rounded-md bg-white dark:bg-gray-700 shadow focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 dark:text-white text-center font-mono text-lg border border-red-200 dark:border-red-700 transition"
                autoFocus
              />
            </div>
            <div class="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowConfirmation(false)}
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center transition"
                type="button"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                class={`px-4 py-2 rounded-md flex items-center transition font-semibold ${confirmationText.trim().toLowerCase() === 'migrate' ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer' : 'bg-red-300 text-white cursor-not-allowed'}`}
                type="button"
                disabled={confirmationText.trim().toLowerCase() !== 'migrate'}
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Confirm Migration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
