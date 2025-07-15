import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import { Button } from "../components/Button.tsx";

/**
 * The user interface.
 * @type {User}
 */
interface User {
  did: string;
  handle?: string;
}

/**
 * Truncate text to a maximum length.
 * @param text - The text to truncate
 * @param maxLength - The maximum length
 * @returns The truncated text
 */
function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  let truncated = text.slice(0, maxLength);
  // Remove trailing dots before adding ellipsis
  while (truncated.endsWith(".")) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

/**
 * The header component.
 * @returns The header component
 * @component
 */
export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!IS_BROWSER) return;

    const fetchUser = async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const userData = await response.json();
        setUser(
          userData
            ? {
                did: userData.did,
                handle: userData.handle,
              }
            : null
        );
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setUser(null);
      globalThis.location.href = "/";
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <header className="hidden sm:block bg-white dark:bg-slate-900 text-slate-900 dark:text-white relative z-10 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Home Link */}
          <Button
            href="/"
            color="blue"
            icon="/icons/plane_bold.svg"
            iconAlt="Plane"
            label="AIRPORT"
          />

          <div className="flex items-center gap-3">
            {/* Ticket booth (did:plc update) */}
            <Button
              href="/ticket-booth"
              color="amber"
              icon="/icons/ticket_bold.svg"
              iconAlt="Ticket"
              label="TICKET BOOTH"
            />

            {/* Departures (Migration) */}
            <Button
              href="/migrate"
              color="amber"
              icon="/icons/plane-departure_bold.svg"
              iconAlt="Departures"
              label="DEPARTURES"
            />

            {/* Check-in (Login/Profile) */}
            <div className="relative">
              {user?.did ? (
                <div className="relative">
                  <Button
                    color="amber"
                    icon="/icons/account.svg"
                    iconAlt="Check-in"
                    label="CHECKED IN"
                    onClick={() => setShowDropdown(!showDropdown)}
                  />
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="text-sm font-mono mb-2 pb-2 border-b border-slate-900/10">
                        <div title={user.handle || "Anonymous"}>
                          {truncateText(user.handle || "Anonymous", 20)}
                        </div>
                        <div className="text-xs opacity-75" title={user.did}>
                          {truncateText(user.did, 25)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-sm font-mono text-slate-900 hover:text-slate-700 w-full text-left transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  href="/login"
                  color="amber"
                  icon="/icons/account.svg"
                  iconAlt="Check-in"
                  label="CHECK-IN"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
