/**
 * Jyotish AI - Analytics Tracking Engine
 * Decoupled framework supporting PostHog, Mixpanel, and GA4.
 * Emits telemetry events to browser console logs during development.
 */

interface UserProfile {
  name?: string;
  language?: string;
  concern?: string;
  ayanamsa?: string;
  birthPlace?: string;
  plan?: string;
}

const getStoredProfile = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("astro_profile");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const trackPageView = (path: string) => {
  const profile = getStoredProfile();
  const payload = {
    path,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
    user: profile ? {
      name: profile.name,
      plan: profile.plan || "free",
      language: profile.language,
      concern: profile.concern
    } : "anonymous"
  };

  // Log page views
  console.log(`[Analytics] 👁️ PAGE_VIEW: ${path}`, payload);
  
  // Future PostHog integration:
  // if (window.posthog) window.posthog.capture('$pageview', { path });
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  const profile = getStoredProfile();
  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    properties: properties || {},
    user: profile ? {
      name: profile.name,
      plan: profile.plan || "free",
      language: profile.language,
      concern: profile.concern
    } : "anonymous"
  };

  // Log custom events
  console.log(`[Analytics] ⚡ EVENT: "${eventName}"`, payload);
  
  // Future Mixpanel / PostHog integration:
  // if (window.mixpanel) window.mixpanel.track(eventName, properties);
  // if (window.posthog) window.posthog.capture(eventName, properties);
};
