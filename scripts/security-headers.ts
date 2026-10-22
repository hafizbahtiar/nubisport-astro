// Lepas `astro build`: tambah header keselamatan ke dist/_headers (pentest 2026-10-22 F-02).
// CSP tanpa 'unsafe-inline' untuk skrip: setiap <script> sebaris dalam dist/**/*.html dapat hash sha256
// (hash berubah setiap build - sebab itu dijana, bukan ditulis tangan). Asal luar yang dibenarkan:
// Turnstile, Cloudflare Web Analytics (beacon disuntik edge), Google Fonts, tile peta (OpenFreeMap, DEM Mapterhorn). Tambah sumber luar baru = tambah di sini.
// Bun runtime (Nubi tiada jenis Node/Bun dalam tsconfig - cukup apa yang skrip ini guna).
declare const Bun: {
  Glob: new (p: string) => { scan(dir: string): AsyncIterable<string> };
  file(p: string): { text(): Promise<string> };
  write(p: string, s: string): Promise<number>;
};
export { };

const DIST = "dist";
const sha256 = async (s: string) =>
  `'sha256-${btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))))}'`;

const hashes = new Set<string>();
for await (const f of new Bun.Glob("**/*.html").scan(DIST)) {
  for (const [, attrs, body] of (await Bun.file(`${DIST}/${f}`).text()).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue;
    hashes.add(await sha256(body));
  }
}
// onclick="print()" dalam kad pelan (Cetak) - handler sebaris perlukan 'unsafe-hashes' + hash kodnya.
const handler = await sha256("print()");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com 'unsafe-hashes' ${handler} ${[...hashes].join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://tiles.openfreemap.org https://tiles.mapterhorn.com https://cloudflareinsights.com",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
].join("; ");

const headers = `${DIST}/_headers`;
await Bun.write(
  headers,
  (await Bun.file(headers).text()) +
  `
# Dijana oleh scripts/security-headers.ts (${hashes.size} hash skrip sebaris).
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: ${csp}

# PWA: the worker must be revalidated on every visit so updates land; the manifest
# gets its proper media type on hosts that do not know .webmanifest.
/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
`,
);
console.log(`security-headers: ${hashes.size} hash skrip sebaris, CSP ${csp.length} aksara.`);
