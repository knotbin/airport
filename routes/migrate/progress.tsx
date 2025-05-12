import { PageProps, Handlers } from "$fresh/server.ts";
import MigrationProgress from "../../islands/MigrationProgress.tsx";
import { getSession } from "../../auth/session.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    
    // If no session, redirect to login
    if (!session?.did) {
      const url = new URL(req.url);
      const redirectUrl = `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }
    return ctx.render();
  },
};

export default function MigrateProgress(props: PageProps) {
  const service = props.url.searchParams.get("service") || "";
  const handle = props.url.searchParams.get("handle") || "";
  const email = props.url.searchParams.get("email") || "";
  const password = props.url.searchParams.get("password") || "";
  const invite = props.url.searchParams.get("invite") || undefined;

  if (!service || !handle || !email || !password) {
    return (
      <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div class="max-w-2xl mx-auto">
          <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
            <p class="text-red-800 dark:text-red-200">
              Missing required parameters. Please return to the migration setup page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-mono text-3xl font-bold text-gray-900 dark:text-white mb-8">Migration Progress</h1>
        <MigrationProgress
          service={service}
          handle={handle}
          email={email}
          password={password}
          invite={invite}
        />
      </div>
    </div>
  );
} 