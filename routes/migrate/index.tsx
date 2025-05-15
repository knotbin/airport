import { PageProps } from "fresh";
import MigrationSetup from "../../islands/MigrationSetup.tsx";

export default function Migrate(props: PageProps) {
  const service = props.url.searchParams.get("service");
  const handle = props.url.searchParams.get("handle");
  const email = props.url.searchParams.get("email");
  const invite = props.url.searchParams.get("invite");

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-mono text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Account Migration
        </h1>
        <MigrationSetup
          service={service}
          handle={handle}
          email={email}
          invite={invite}
        />
      </div>
    </div>
  );
}
