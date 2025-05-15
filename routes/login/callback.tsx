import { PageProps } from "fresh";
import OAuthCallback from "../../islands/OAuthCallback.tsx";

export default function Callback(props: PageProps) {
  const error = props.url.searchParams.get("error");

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OAuthCallback error={error || undefined} />
    </div>
  );
}
