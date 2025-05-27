import { useEffect } from "preact/hooks";

interface PostHogConfig {
  api_host: string;
  [key: string]: unknown; // Allow additional optional properties
}

interface PostHogInstance {
  __SV?: number;
  _i: Array<[string, PostHogConfig, string?]>;
  people?: PostHogPeople;
  init: (apiKey: string, config: PostHogConfig, name?: string) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  toString: (includeStub?: number) => string;
  [key: string]: unknown;
}

interface PostHogPeople {
  toString: () => string;
  [key: string]: unknown;
}

declare global {
  var posthog: PostHogInstance | undefined;
}

interface PostHogProps {
  apiKey: string;
  apiHost?: string;
}

export default function PostHogAnalytics({
  apiKey,
  apiHost = "https://us.i.posthog.com"
}: PostHogProps) {
  useEffect(() => {
    // PostHog initialization script
    (function(t: Document, e: PostHogInstance) {
      let o: string[];
      let n: number;
      let p: HTMLScriptElement;
      let r: HTMLScriptElement | null;

      if (e.__SV) return;

      globalThis.posthog = e;
      e._i = [];
      e.init = function(i: string, s: PostHogConfig, a?: string) {
        function g(target: Record<string, unknown>, methodName: string) {
          const parts = methodName.split(".");
          if (2 == parts.length) {
            target = target[parts[0]] as Record<string, unknown>;
            methodName = parts[1];
          }
          target[methodName] = function() {
            (target as { push: (args: unknown[]) => void }).push([methodName].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }

        p = t.createElement("script");
        p.type = "text/javascript";
        p.crossOrigin = "anonymous";
        p.async = true;
        p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
        r = t.getElementsByTagName("script")[0];
        if (r && r.parentNode) {
          r.parentNode.insertBefore(p, r);
        }

        let u: PostHogInstance = e;
        if (typeof a !== "undefined") {
          u = (e as Record<string, PostHogInstance>)[a] = {} as PostHogInstance;
          u._i = [];
        } else {
          a = "posthog";
        }

        u.people = u.people || {} as PostHogPeople;
        u.toString = function(includeStub?: number) {
          let name = "posthog";
          if ("posthog" !== a) {
            name += "." + a;
          }
          if (!includeStub) {
            name += " (stub)";
          }
          return name;
        };

        u.people.toString = function() {
          return u.toString(1) + ".people (stub)";
        };

        o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" ");

        for (n = 0; n < o.length; n++) {
          g(u as Record<string, unknown>, o[n]);
        }

        e._i.push([i, s, a]);
      };

      e.__SV = 1;
    })(document, globalThis.posthog || {} as PostHogInstance);

    // Initialize PostHog
    if (globalThis.posthog) {
      globalThis.posthog.init(apiKey, { api_host: apiHost });
    }
  }, [apiKey, apiHost]);

  return null; // This component doesn't render anything visible
}
