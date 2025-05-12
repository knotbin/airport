import { PageProps, Handlers } from "$fresh/server.ts";
import MigrationFlow from "../islands/MigrationFlow.tsx";
import { getSession } from "../auth/session.ts";

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

export default function Migrate(props: PageProps) {
  const service = props.url.searchParams.get("service");
  const handle = props.url.searchParams.get("handle");
  const email = props.url.searchParams.get("email");
  const invite = props.url.searchParams.get("invite");

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-mono text-3xl font-bold text-gray-900 dark:text-white mb-8">Account Migration</h1>
        <MigrationFlow
          service={service}
          handle={handle}
          email={email}
          invite={invite}
        />
      </div>
    </div>
  );
}
