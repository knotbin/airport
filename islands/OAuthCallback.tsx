import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

/**
 * The OAuth callback props.
 * @type {OAuthCallbackProps}
 */
interface OAuthCallbackProps {
  error?: string;
}

/**
 * The OAuth callback component.
 * @param props - The OAuth callback props
 * @returns The OAuth callback component
 * @component
 */
export default function OAuthCallback(
  { error: initialError }: OAuthCallbackProps,
) {
  const [error, setError] = useState<string | null>(initialError || null);
  const [message, setMessage] = useState<string>(
    "Completing authentication...",
  );

  useEffect(() => {
    if (!IS_BROWSER) return;

    console.log("OAuth callback page reached");
    setMessage("OAuth callback page reached. Checking authentication...");

    const checkAuth = async () => {
      try {
        // Check if there's an error in the URL
        const params = new URLSearchParams(globalThis.location.search);
        const errorParam = params.get("error");
        if (errorParam) {
          console.error("Auth error detected in URL params:", errorParam);
          setError(`Authentication failed: ${errorParam}`);
          return;
        }

        // Give cookies a moment to be processed
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Increased delay
        setMessage("Checking if we're authenticated...");

        // Check if we're authenticated by fetching current user
        try {
          const cookies = document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

          console.log("Current cookies:", cookies);

          const response = await fetch("/api/me", {
            credentials: "include", // Explicitly include credentials
            headers: {
              "Accept": "application/json",
            },
          });

          if (!response.ok) {
            console.error(
              "Profile API error:",
              response.status,
              response.statusText,
            );
            const text = await response.text();
            console.error("Response body:", text);
            throw new Error(`API returned ${response.status}`);
          }

          const user = await response.json();
          console.log("Current user check result:", user);

          if (user) {
            console.log("Successfully authenticated", user);
            setMessage("Authentication successful! Redirecting...");
            // Redirect to home after a short delay
            setTimeout(() => {
              globalThis.location.href = "/";
            }, 1000);
          } else {
            console.error("Auth check returned empty user object:", user);
            setError("Authentication session not found - no user data");
          }
        } catch (apiErr: unknown) {
          console.error("API error during auth check:", apiErr);
          setError(
            `Failed to verify authentication: ${
              apiErr instanceof Error ? apiErr.message : "Unknown error"
            }`,
          );
        }
      } catch (err: unknown) {
        console.error("General error in OAuth callback:", err);
        setError(
          `Failed to complete authentication: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    };

    checkAuth();
  }, []);

  return (
    <div class="flex items-center justify-center py-16">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
        {error
          ? (
            <div>
              <h2 class="text-2xl font-bold text-red-500 mb-4">
                Authentication Failed
              </h2>
              <p class="text-red-500 mb-6">{error}</p>
              <a
                href="/login"
                class="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              >
                Try Again
              </a>
            </div>
          )
          : (
            <div>
              <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Authentication in Progress
              </h2>
              <div class="flex justify-center mb-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400">
                </div>
              </div>
              <p class="text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          )}
      </div>
    </div>
  );
}
