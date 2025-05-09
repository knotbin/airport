import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface User {
  did: string;
  handle?: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

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
        setUser(userData ? {
          did: userData.did,
          handle: userData.handle
        } : null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/oauth/logout", {
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
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white relative z-10 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Home Link */}
          <a href="/" className="airport-sign bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center px-6 py-3 hover:translate-y-1 transition-all duration-200 hover:from-blue-600 hover:to-blue-700">
            <img src="/icons/plane_bold.svg" alt="Plane" className="w-6 h-6 mr-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="font-mono font-bold tracking-wider">AIRPORT</span>
          </a>

          <div className="flex items-center gap-3">
            {/* Departures (Migration) */}
            <div className="relative group">
              <a href="/migrate" className="airport-sign bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 flex items-center px-6 py-3 hover:translate-y-1 transition-all duration-200 hover:from-amber-500 hover:to-amber-600">
                <img src="/icons/plane-departure_bold.svg" alt="Departures" className="w-6 h-6 mr-2" style={{ filter: 'brightness(0)' }} />
                <span className="font-mono font-bold tracking-wider">DEPARTURES</span>
              </a>
            </div>

            {/* Check-in (Login/Profile) */}
            <div className="relative">
              {user?.did ? (
                <div className="relative group">
                  <div className="airport-sign bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 flex items-center px-6 py-3 hover:translate-y-1 transition-all duration-200 hover:from-amber-500 hover:to-amber-600 cursor-pointer">
                    <img src="/icons/ticket_bold.svg" alt="Check-in" className="w-6 h-6 mr-2" style={{ filter: 'brightness(0)' }} />
                    <span className="font-mono font-bold tracking-wider">CHECKED IN</span>
                  </div>
                  <div className="absolute opacity-0 translate-y-[-8px] pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto top-full right-0 w-56 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 py-3 px-4 rounded-md transition-all duration-200">
                    <div className="text-sm font-mono mb-2 pb-2 border-b border-slate-900/10">
                      <div>{user.handle || 'Anonymous'}</div>
                      <div className="text-xs opacity-75 truncate">{user.did}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sm font-mono text-slate-900 hover:text-slate-700 w-full text-left transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <a href="/login" className="airport-sign bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 flex items-center px-6 py-3 hover:translate-y-1 transition-all duration-200 hover:from-amber-500 hover:to-amber-600">
                  <img src="/icons/ticket_bold.svg" alt="Check-in" className="w-6 h-6 mr-2" style={{ filter: 'brightness(0)' }} />
                  <span className="font-mono font-bold tracking-wider">CHECK-IN</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
