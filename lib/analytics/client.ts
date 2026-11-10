"use client";

/**
 * First-party analytics beacon. Events are queued and sent with
 * navigator.sendBeacon so they never block rendering or navigation.
 * Optional GA4 / Meta Pixel mirrors fire too when their IDs are configured.
 */

export type AnalyticsEvent =
  | "page_view"
  | "product_view"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "add_to_wishlist"
  | "begin_checkout"
  | "payment_initiated"
  | "purchase"
  | "payment_failed"
  | "newsletter_signup"
  | "contact_submit";

export interface EventProps {
  product_id?: string | null;
  order_id?: string | null;
  search_query?: string;
  results_count?: number;
  value?: number;
  metadata?: Record<string, unknown>;
}

const SESSION_KEY = "sc_sid";
const SESSION_TS = "sc_sid_ts";
const UTM_KEY = "sc_utm";
const SESSION_TIMEOUT = 30 * 60 * 1000;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Session id that rolls over after 30 minutes of inactivity. */
export function getSessionId(): string {
  return safe(() => {
    const now = Date.now();
    const last = Number(localStorage.getItem(SESSION_TS) || 0);
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid || now - last > SESSION_TIMEOUT) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    localStorage.setItem(SESSION_TS, String(now));
    return sid;
  }, "anonymous");
}

/** Captures UTM parameters on landing and keeps them for the session. */
export function getUtm(): Record<string, string> {
  return safe(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["source", "medium", "campaign", "term", "content"]) {
      const v = params.get(`utm_${k}`);
      if (v) utm[k] = v.slice(0, 100);
    }
    if (Object.keys(utm).length) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      return utm;
    }
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}");
  }, {});
}

let queue: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue });
  queue = [];
  const ok = safe(() => navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })), false);
  if (!ok) {
    fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

export function track(event: AnalyticsEvent, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const firstVisitReferrer = safe(() => {
    const ref = document.referrer;
    return ref && !ref.startsWith(window.location.origin) ? ref : null;
  }, null);
  queue.push({
    event_name: event,
    session_id: getSessionId(),
    path: window.location.pathname,
    referrer: event === "page_view" ? firstVisitReferrer : null,
    utm: getUtm(),
    screen: window.innerWidth,
    ...props,
  });
  if (!timer) timer = setTimeout(flush, 1500);
  if (event === "purchase" || event === "begin_checkout") flush();

  // Optional mirrors to GA4 and Meta Pixel (only if loaded)
  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
  const gaMap: Partial<Record<AnalyticsEvent, string>> = {
    product_view: "view_item",
    add_to_cart: "add_to_cart",
    begin_checkout: "begin_checkout",
    purchase: "purchase",
    search: "search",
    add_to_wishlist: "add_to_wishlist",
    newsletter_signup: "sign_up",
  };
  if (w.gtag && gaMap[event]) w.gtag("event", gaMap[event], { currency: "INR", value: props.value, search_term: props.search_query });
  const fbMap: Partial<Record<AnalyticsEvent, string>> = {
    product_view: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    purchase: "Purchase",
    search: "Search",
    add_to_wishlist: "AddToWishlist",
    newsletter_signup: "Lead",
    contact_submit: "Contact",
  };
  if (w.fbq && fbMap[event]) w.fbq("track", fbMap[event], { currency: "INR", value: props.value });
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
