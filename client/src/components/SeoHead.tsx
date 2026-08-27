import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

type SeoHeadProps = {
  title: string;
  description: string;
  canonical: string;
  jsonLd: JsonLd | JsonLd[];
};

const SITE_URL = "https://nanainter.com";

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
}

export default function SeoHead({ title, description, canonical, jsonLd }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = "ko";

    setMeta('meta[name="description"]', { name: "description", content: description });
    setMeta('meta[name="robots"]', { name: "robots", content: "index, follow" });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "나나인터내셔널 창업센터" });
    setMeta('meta[property="og:locale"]', { property: "og:locale", content: "ko_KR" });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    let script = document.head.querySelector<HTMLScriptElement>("#page-json-ld");
    if (!script) {
      script = document.createElement("script");
      script.id = "page-json-ld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
  }, [canonical, description, jsonLd, title]);

  return null;
}

export { SITE_URL };
