import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface User {
  did: string;
  handle?: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!IS_BROWSER) return;

    const fetchUser = async () => {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const userData = await response.json();
        // Only set the user if we actually got user data
        setUser(userData ? userData : null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
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
      
      // Clear the user state before redirecting
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Airport
            </a>
          </div>
          
          <div>
            {loading ? (
              <div className="animate-pulse w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            ) : user?.did ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-700 dark:text-gray-300">
                  {user.handle || user.did}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 