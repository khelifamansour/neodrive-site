"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function send(slug: string, event: "view" | "product" | "whatsapp") {
  fetch("/api/seo/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, event, referrer: event === "view" ? document.referrer : "" }),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {});
}

function metricKey(path: string) {
  const clean = decodeURIComponent(path || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (clean.startsWith("/api/") || clean.startsWith("/seo-dashboard") || clean.startsWith("/social-upload")) return "";
  if (clean.startsWith("/blog/") && clean !== "/blog") {
    return clean.slice("/blog/".length).replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 170);
  }
  if (clean.startsWith("/videos/") && clean !== "/videos") {
    const id = clean.slice("/videos/".length).replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9_-]/g, "-");
    return id ? `video_${id}`.slice(0, 180) : "";
  }
  const normalized = clean === "/" ? "home" : clean.replace(/^\/+/, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `page_${normalized}`.slice(0, 180);
}

export default function SeoGlobalTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const key = metricKey(pathname || "/");
    if (!key || !/^[a-zA-Z0-9_-]+$/.test(key)) return;

    const timer = window.setTimeout(() => send(key, "view"), 700);
    const click = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (/wa\.me\//i.test(href)) send(key, "whatsapp");
      else if (
        href.startsWith("/produit") ||
        href.startsWith("/offres/") ||
        href.startsWith("/reservation") ||
        href.includes("easydrive-auto.fr/produit") ||
        href.includes("easydrive-auto.fr/offres/")
      ) send(key, "product");
    };
    document.addEventListener("click", click, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", click, true);
    };
  }, [pathname]);

  return null;
}
