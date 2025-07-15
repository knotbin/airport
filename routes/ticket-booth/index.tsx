import { PageProps } from "fresh";
import MigrationSetup from "../../islands/MigrationSetup.tsx";
import DidPlcProgress from "../../islands/DidPlcProgress.tsx";

export default function TicketBooth(props: PageProps) {
  const service = props.url.searchParams.get("service");
  const handle = props.url.searchParams.get("handle");

  return (
    <div class=" bg-gray-50 dark:bg-gray-900 p-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-mono text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Ticket Booth Self-Service Kiosk
        </h1>
        <DidPlcProgress />
      </div>
    </div>
  );
}
