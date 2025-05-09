import { PageProps } from "$fresh/server.ts";

export default function Home(props: PageProps) {
  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-7xl font-normal mb-8 text-center">Welcome to Airport</h1>

        <div class="prose dark:prose-invert max-w-none w-full mb-0">
          <p class="text-xl mb-6 mt-0 text-center text-gray-600 dark:text-gray-300">
            Your gateway to seamless AT Protocol PDS migration
          </p>

          <div class="ticket mb-8">
            <div class="boarding-label">BOARDING PASS</div>
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-2xl font-normal">WHAT IS AIRPORT?</h3>
              <div class="text-sm text-gray-500">GATE A1</div>
            </div>
            <div class="passenger-info">
              PASSENGER: BLUESKY USER
              <br />
              DESTINATION: NEW PDS
            </div>
            <p class="mb-4">
              Think of Airport as your digital terminal for AT Protocol migrations. We help you smoothly
              transfer your PDS account between different providers – no lost luggage, just a first-class
              experience for your data's journey to its new home.
            </p>
          </div>

          <div class="ticket">
            <div class="boarding-label">FLIGHT DETAILS</div>
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-2xl font-normal">GET READY TO FLY</h3>
              <div class="text-sm text-gray-500">SEAT: 1A</div>
            </div>
            <div class="passenger-info mb-4">
              CLASS: FIRST CLASS MIGRATION
              <br />
              FLIGHT: ATP-2024
            </div>
            <ol class="list-decimal list-inside space-y-3">
              <li>Check in with your current PDS credentials</li>
              <li>Select your destination PDS</li>
              <li>Go through our streamlined security check</li>
              <li>Sit back while we handle your data transfer</li>
            </ol>
            <div class="mt-6 text-sm text-gray-600 dark:text-gray-400 border-t border-dashed pt-4">
              Your data travels securely with our top-tier encryption – we're like the TSA, but actually fast.
            </div>
            <div class="flight-info">
              <div>
                <div class="text-xs text-gray-500">FROM</div>
                <div>CURRENT PDS</div>
              </div>
              <div>➜</div>
              <div>
                <div class="text-xs text-gray-500">TO</div>
                <div>NEW PDS</div>
              </div>
            </div>
          </div>

          <div class="mt-8 text-center">
            <a
              href="/login"
              class="inline-flex items-center px-6 py-3 border border-transparent text-lg font-normal rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Begin Your Journey
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
