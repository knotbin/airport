import { useEffect } from "preact/hooks";
import posthog from "posthog-js";

interface Props {
  apiKey: string;
  apiHost: string;
}

export default function PostHogInitializer({ apiKey, apiHost }: Props) {
  useEffect(() => {
    posthog.default.init(apiKey, { api_host: apiHost });
  }, [apiKey, apiHost]);

  return null;
}
