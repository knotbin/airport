import Ticket from "../islands/Ticket.tsx";
import AirportSign from "../islands/AirportSign.tsx";

export default function Home() {
  return (
    <>
      <div class="px-4 py-8 mx-auto">
        <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
          <AirportSign />

          <div class="prose dark:prose-invert max-w-none w-full mb-0">
            <p class="font-mono text-xl font-bold mb-6 mt-0 text-center text-gray-600 dark:text-gray-300">
              Your terminal for seamless AT Protocol PDS migration and backup.
            </p>

            <Ticket />

            <div class="mt-8 text-center">
              <a
                href="/login"
                class="inline-flex items-center px-6 py-3 border border-transparent text-lg font-mono rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Begin Your Journey
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
