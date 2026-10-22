// Sitemap statik untuk halaman awam. Halaman akaun/auth sengaja tiada (noindex).
import type { APIContext } from "astro";

const HALAMAN = [
  "/",
  "/plan-5k",
  "/races",
  "/guide",
  "/maf",
  "/pace",
  "/privacy",
  "/terms",
];

export function GET({ site }: APIContext) {
  const asas = (site ?? new URL("https://nubisport.hafizbahtiar.com"))
    .toString()
    .replace(/\/$/, "");
  const url = HALAMAN.map(
    (p) => `  <url><loc>${asas}${p}</loc></url>`,
  ).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
