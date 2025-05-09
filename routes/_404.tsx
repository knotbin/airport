import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Flight Not Found</title>
      </Head>
      <div class="min-h-screen bg-slate-900 px-4 py-16 sm:py-24 mx-auto flex items-center">
        <div class="max-w-screen-xl mx-auto flex flex-col items-center justify-center text-center">
          <div class="relative mb-4">
            <img
              src="/icons/plane_bold.svg"
              class="w-32 h-32 sm:w-48 sm:h-48 opacity-90"
              alt="Plane icon"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          
          <div class="airport-board bg-black/20 backdrop-blur-sm p-8 sm:p-12 rounded-lg border border-white/10">
            <h1 class="text-6xl sm:text-8xl md:text-9xl font-mono tracking-wider text-amber-400 font-bold mb-6">
              404
            </h1>
            <div class="space-y-4">
              <p class="text-2xl sm:text-3xl md:text-4xl font-mono text-white/90">
                FLIGHT NOT FOUND
              </p>
              <p class="text-lg sm:text-xl text-white/70 max-w-2xl">
                We couldn't locate the destination you're looking for. Please check your flight number and try again.
              </p>
              <div class="mt-8">
                <a
                  href="/"
                  class="inline-flex items-center px-8 py-4 bg-amber-400 text-slate-900 rounded-md font-bold text-lg hover:bg-amber-500 transition-colors duration-200"
                >
                  Return to Terminal
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
