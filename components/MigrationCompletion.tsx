export interface MigrationCompletionProps {
  isVisible: boolean;
}

export default function MigrationCompletion(
  { isVisible }: MigrationCompletionProps,
) {
  if (!isVisible) return null;

  const handleLogout = async () => {
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
  };

  return (
    <div class="p-4 bg-green-50 dark:bg-green-900 rounded-lg border-2 border-green-200 dark:border-green-800">
      <p class="text-sm text-green-800 dark:text-green-200 pb-2">
        Migration completed successfully! Sign out to finish the process and
        return home.<br />
        Please consider donating to Airport to support server and development
        costs.
      </p>
      <div class="flex space-x-4">
        <button
          type="button"
          onClick={handleLogout}
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
  );
}
