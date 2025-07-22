import Ticket from "../islands/Ticket.tsx";
import AirportSign from "../components/AirportSign.tsx";
import SocialLinks from "../islands/SocialLinks.tsx";
import LoginButton from "../islands/LoginButton.tsx";

export default function Home() {
  return (
    <>
      <div class="px-2 sm:px-4 py-4 sm:py-8 mx-auto">
        <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
          <AirportSign />

          <div class="prose dark:prose-invert max-w-none w-full mb-0">
            <p class="font-mono text-lg sm:text-xl font-bold mb-4 sm:mb-6 mt-0 text-center text-gray-600 dark:text-gray-300">
              Your terminal for seamless AT Protocol PDS migration and backup.
            </p>

            <Ticket />

            <LoginButton />
            <p class="font-mono text-lg sm:text-xl mb-4 mt-4 sm:mb-6 text-center text-gray-600 dark:text-gray-300">
              Airport is made with love by <a class="text-blue-500 hover:underline" href="https://bsky.app/profile/knotbin.com">Roscoe</a> for <a class="text-blue-500 hover:underline" href="https://sprk.so">Spark</a>, a new short-video platform for AT Protocol.
            </p>
            <div class="text-center mb-4">
              <a href="/about" class="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors">
                <img src="/icons/info_bold.svg" alt="Info" class="w-5 h-5 mr-2" />
                <span class="font-mono">Learn more about AT Protocol</span>
              </a>
            </div>
            <SocialLinks />
          </div>
        </div>
      </div>
    </>
  );
}
