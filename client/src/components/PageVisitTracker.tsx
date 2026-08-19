import { useEffect } from "react";
import { useLocation } from "wouter";

import { apiRequest } from "@/lib/queryClient";

const VISITOR_KEY = "nana_visitor_key";
const SESSION_ID_KEY = "nana_session_id";
const SESSION_REFERRER_KEY = "nana_session_referrer";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const recentVisits = new Map<string, number>();

function createAnonymousId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateStorageValue(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const value = createAnonymousId();
  storage.setItem(key, value);
  return value;
}

function readSessionAttribution() {
  const params = new URLSearchParams(window.location.search);
  const attribution: Record<(typeof UTM_KEYS)[number], string> = {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
  };

  for (const key of UTM_KEYS) {
    const urlValue = params.get(key)?.trim();
    if (urlValue) sessionStorage.setItem(key, urlValue);
    attribution[key] = urlValue || sessionStorage.getItem(key) || "";
  }

  return attribution;
}

export default function PageVisitTracker() {
  const [location] = useLocation();

  useEffect(() => {
    try {
      const visitorKey = getOrCreateStorageValue(localStorage, VISITOR_KEY);
      const sessionId = getOrCreateStorageValue(sessionStorage, SESSION_ID_KEY);
      const pagePath = window.location.pathname || "/";
      const duplicateKey = `${sessionId}:${pagePath}`;
      const now = Date.now();

      if (now - (recentVisits.get(duplicateKey) || 0) < 1500) return;
      recentVisits.set(duplicateKey, now);

      if (sessionStorage.getItem(SESSION_REFERRER_KEY) === null) {
        sessionStorage.setItem(SESSION_REFERRER_KEY, document.referrer || "");
      }

      const attribution = readSessionAttribution();
      void apiRequest("POST", "/api/page-visits", {
        pagePath,
        visitorKey,
        sessionId,
        referrer: sessionStorage.getItem(SESSION_REFERRER_KEY) || "",
        utmSource: attribution.utm_source,
        utmMedium: attribution.utm_medium,
        utmCampaign: attribution.utm_campaign,
        utmContent: attribution.utm_content,
      }).catch((error) => console.error("page visit track failed", error));
    } catch (error) {
      console.error("page visit tracking unavailable", error);
    }
  }, [location]);

  return null;
}
