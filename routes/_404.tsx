import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Flight Not Found</title>
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --is-dark: 0; }
          @media (prefers-color-scheme: dark) {
            :root { --is-dark: 1; }
          }
        `}} />
      </Head>
      <div class="px-4">
        <div class="max-w-screen-xl mx-auto flex flex-col items-center text-center">
          <div class="relative mb-4">
            <img
              src="/icons/plane_bold.svg"
              class="w-32 h-32 sm:w-35 sm:h-35 brightness-[0.1] dark:invert dark:filter-none"
              alt="Plane icon"
            />
          </div>
          
          <div class="bg-white dark:bg-slate-900 airport-board p-8 sm:p-12 rounded-lg border border-slate-200 dark:border-white/10">
            <h1 class="text-6xl sm:text-8xl md:text-9xl font-mono tracking-wider text-amber-500 dark:text-amber-400 font-bold mb-6">
              404
            </h1>
            <div class="space-y-4">
              <p class="text-2xl sm:text-3xl md:text-4xl font-mono text-slate-900 dark:text-white/90">
                FLIGHT NOT FOUND
              </p>
              <p class="text-lg sm:text-xl text-slate-600 dark:text-white/70 max-w-2xl">
                We couldn't locate the destination you're looking for. Please check your flight number and try again.
              </p>
              <div class="mt-8">
                <a
                  href="/"
                  class="inline-flex items-center px-8 py-4 bg-amber-500 dark:bg-amber-400 text-slate-900 rounded-md font-bold text-lg hover:bg-amber-600 dark:hover:bg-amber-500 transition-colors duration-200"
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
