import { Button } from "../components/Button.tsx";

const APP_STORE_URL = "https://apps.apple.com";
const GOOGLE_PLAY_URL = "https://play.google.com/store";

const highlights = [
  {
    title: "Built for travel days",
    description:
      "Quickly check your migration status, backups, and account health while you are on the move.",
  },
  {
    title: "Secure by design",
    description:
      "Your login flows mirror the web experience with the same protections and PDS-first controls.",
  },
  {
    title: "Always in sync",
    description:
      "Stay aligned with your desktop tasks and pick up where you left off without missing a beat.",
  },
];

export default function Downloads() {
  return (
    <div class="px-2 sm:px-4 py-4 sm:py-8 mx-auto">
      <div class="max-w-screen-xl mx-auto">
        <div class="bg-gradient-to-br from-blue-50/80 via-white to-amber-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div class="grid md:grid-cols-2 gap-10 p-6 sm:p-10">
            <div class="space-y-6">
              <p class="font-mono text-sm uppercase tracking-[0.2em] text-blue-500">
                Mobile downloads
              </p>
              <h1 class="text-3xl sm:text-4xl font-black leading-tight text-slate-900 dark:text-white">
                Take Airport with you everywhere you fly
              </h1>
              <p class="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
                Keep migrations, backups, and account insights just a tap away. The Airport app is designed to feel familiar, quick, and dependable on both iOS and Android.
              </p>

              <div class="grid sm:grid-cols-2 gap-4">
                <a
                  href={APP_STORE_URL}
                  class="group flex items-center gap-4 rounded-2xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 px-4 py-3 shadow hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src="/icons/apple.svg"
                    alt="Apple App Store"
                    class="w-12 h-12"
                  />
                  <div class="text-left">
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">Download on</p>
                    <p class="text-xl font-semibold text-slate-900 dark:text-white">
                      App Store
                    </p>
                  </div>
                </a>

                <a
                  href={GOOGLE_PLAY_URL}
                  class="group flex items-center gap-4 rounded-2xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 px-4 py-3 shadow hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src="/icons/google-play.svg"
                    alt="Google Play"
                    class="w-12 h-12"
                  />
                  <div class="text-left">
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">Get it on</p>
                    <p class="text-xl font-semibold text-slate-900 dark:text-white">
                      Google Play
                    </p>
                  </div>
                </a>
              </div>

              <div class="flex flex-col gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <div class="flex items-center gap-3">
                  <img src="/icons/ticket_bold.svg" alt="Ticket" class="w-6 h-6" />
                  <p class="font-mono text-sm text-slate-700 dark:text-slate-200">Seamless sign-in with the same trusted Airport experience.</p>
                </div>
                <div class="flex items-center gap-3">
                  <img src="/icons/plane-departure_bold.svg" alt="Departure" class="w-6 h-6" />
                  <p class="font-mono text-sm text-slate-700 dark:text-slate-200">Track migrations in real time with clear status indicators.</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="h-full rounded-3xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 shadow-inner p-6 sm:p-8 flex flex-col justify-between">
                <div class="space-y-4">
                  <p class="font-mono text-sm text-blue-600 dark:text-blue-300">Why you will love the apps</p>
                  <ul class="space-y-3">
                    {highlights.map((highlight) => (
                      <li class="flex gap-3 items-start" key={highlight.title}>
                        <span class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 font-bold">{"→"}</span>
                        <div>
                          <p class="text-lg font-semibold text-slate-900 dark:text-white">{highlight.title}</p>
                          <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{highlight.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div class="mt-6">
                  <Button
                    href="/"
                    color="blue"
                    icon="/icons/plane_bold.svg"
                    iconAlt="Home"
                    label="Return to terminal"
                    className="shadow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
