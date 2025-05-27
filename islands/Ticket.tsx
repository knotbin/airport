import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";

interface User {
  did: string;
  handle?: string;
}

export default function Ticket() {
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
        setUser(
          userData
            ? {
              did: userData.did,
              handle: userData.handle,
            }
            : null,
        );
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  return (
    <div class="max-w-4xl mx-auto">
      <div class="ticket mb-8 bg-white dark:bg-slate-800 p-6 relative before:absolute before:bg-white dark:before:bg-slate-800 before:-z-10 after:absolute after:inset-0 after:bg-slate-200 dark:after:bg-slate-700 after:-z-20 [clip-path:polygon(0_0,20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_calc(100%-20px),20px_100%)] after:[clip-path:polygon(0_0,20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_calc(100%-20px),20px_100%)]">
        <div class="boarding-label text-amber-500 dark:text-amber-400 font-mono font-bold tracking-wider text-sm mb-4">
          BOARDING PASS
        </div>
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-2xl font-mono">WHAT IS AIRPORT?</h3>
          <div class="text-sm font-mono text-gray-500 dark:text-gray-400">
            GATE A1
          </div>
        </div>
        <div class="passenger-info text-slate-600 dark:text-slate-300 font-mono text-sm mb-4">
          PASSENGER: {(user?.handle || "UNKNOWN").toUpperCase()}
          <br />
          DESTINATION: NEW PDS
        </div>
        <p class="mb-4">
          ATP Airport is your digital terminal for AT Protocol account actions.
          We help you smoothly transfer your PDS account between different
          providers – no lost luggage, just a first-class experience for your
          data's journey to its new home.
        </p>
        <p>
          Think you might need to migrate in the future but your PDS might be
          hostile or offline? No worries! Soon you'll be able to go to the
          ticket booth and get a PLC key to use for account recovery in the
          future. You can also go to baggage claim (take the air shuttle to
          terminal four) and get a downloadable backup of all your current PDS
          data in case that were to happen.
        </p>
      </div>

      <div class="ticket mb-8 bg-white dark:bg-slate-800 p-6 relative before:absolute before:bg-white dark:before:bg-slate-800 before:-z-10 after:absolute after:inset-0 after:bg-slate-200 dark:after:bg-slate-700 after:-z-20 [clip-path:polygon(0_0,20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_calc(100%-20px),20px_100%)] after:[clip-path:polygon(0_0,20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_calc(100%-20px),20px_100%)]">
        <div class="boarding-label text-amber-500 dark:text-amber-400 font-mono font-bold tracking-wider text-sm mb-4">
          FLIGHT DETAILS
        </div>
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-2xl font-mono">GET READY TO FLY</h3>
          <div class="text-sm font-mono text-gray-500 dark:text-gray-400">
            SEAT: 1A
          </div>
        </div>
        <div class="passenger-info mb-4 text-slate-600 dark:text-slate-300 font-mono text-sm">
          CLASS: FIRST CLASS MIGRATION
          <br />
          FLIGHT: ATP-2024
        </div>
        <ol class="list-decimal list-inside space-y-3">
          <li>Check in with your current PDS credentials</li>
          <li>Select your destination PDS</li>
          <li>Go through security</li>
          <li>Sit back while we handle your data transfer</li>
        </ol>
        <div class="mt-6 text-sm text-gray-600 dark:text-gray-400 border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
          Coming from a Bluesky PDS? This is currently a ONE WAY TICKET because
          Bluesky doesn't support transfers back yet. Although they claim they
          will support it in the future, assume you won't be able to.
        </div>
        <div class="flight-info mt-6 flex items-center justify-between text-slate-600 dark:text-slate-300 font-mono text-sm">
          <div>
            <div class="text-xs text-gray-500 dark:text-gray-400">FROM</div>
            <div>CURRENT PDS</div>
          </div>
          <div class="text-amber-500 dark:text-amber-400 text-4xl">➜</div>
          <div class="content-end">
            <div class="text-xs text-gray-500 dark:text-gray-400">TO</div>
            <div>NEW PDS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
