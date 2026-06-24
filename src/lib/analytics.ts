// Lightweight client-side event tracking for the onboarding funnel.
//
// Events are:
//   1. Stored in localStorage (capped ring buffer) so we can inspect the
//      funnel locally and replay later if we add a backend sink.
//   2. Forwarded to any analytics provider that exposes a global hook —
//      Plausible (`window.plausible`), PostHog (`window.posthog.capture`),
//      Google Analytics (`window.gtag`), or a generic `window.dataLayer`.
//
// Nothing here makes a network request directly; if no provider is wired
// up we still get a local audit trail. The module is safe to import in
// both browser and SSR contexts.

export type AnalyticsEvent =
  | "onboarding_start"
  | "onboarding_step_complete"
  | "onboarding_completed"
  | "preview_viewed"
  | "sign_up_completed";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const STORAGE_KEY = "tentra:analytics:events:v1";
const MAX_EVENTS = 200;

type StoredEvent = {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  ts: string;
};

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: AnalyticsProps }) => void;
    posthog?: { capture?: (event: string, props?: AnalyticsProps) => void };
    gtag?: (command: string, event: string, params?: AnalyticsProps) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function persistLocally(entry: StoredEvent) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: StoredEvent[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage may be unavailable (private mode, quota). Best-effort only.
  }
}

function forwardToProviders(event: AnalyticsEvent, props?: AnalyticsProps) {
  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
    if (window.posthog?.capture) {
      window.posthog.capture(event, props);
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", event, props);
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...(props ?? {}) });
    }
  } catch {
    // Never let analytics break the app.
  }
}

export function trackEvent(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  const entry: StoredEvent = {
    event,
    props,
    ts: new Date().toISOString(),
  };
  persistLocally(entry);
  forwardToProviders(event, props);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props ?? {});
  }
}

export function readLocalEvents(): StoredEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearLocalEvents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
