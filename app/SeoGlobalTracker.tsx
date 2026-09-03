"use client";

import { useEffect } from "react";

function send(slug: string, event: "view" | "product" | "whatsapp") {
  fetch("/api/seo/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, event, referrer: event === "view" ? document.referrer : "" }),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {});
}

export default function SeoGlobalTracker() {
  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith("/blog/") || path === "/blog/") return;
    const slug = decodeURIComponent(path.slice("/blog/".length)).replace(/^\/+|\/+$/g, "");
    if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return;

    const timer = window.setTimeout(() => send(slug, "view"), 700);
    const click = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (/wa\.me\//i.test(href)) send(slug, "whatsapp");
      else if (href.startsWith("/produit") || href.startsWith("/offres/") || href.includes("easydrive-auto.fr/produit") || href.includes("easydrive-auto.fr/offres/")) send(slug, "product");
    };
    document.addEventListener("click", click, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", click, true);
    };
  }, []);
  return null;
}
