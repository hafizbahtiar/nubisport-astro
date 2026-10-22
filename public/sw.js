// Service worker Nubi Sport: pelan + pemasa boleh dibuka semula tanpa internet.
// Halaman awam sahaja - /api/* dan /account/* sengaja tidak dicache (data akaun).
// Naikkan CACHE bila strategi/cache berubah.
const CACHE = "nubi-v1";
const OFFLINE = "/plan-5k";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individu, bukan addAll: satu URL gagal tak menggagalkan pemasangan.
      await Promise.allSettled(
        ["/", OFFLINE].map(async (url) => {
          const res = await fetch(url, { cache: "reload" });
          if (res.ok) await cache.put(url, res);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const offlineResponse = () =>
  new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Tiada sambungan - Nubi Sport</title>' +
      '<body style="font:16px/1.5 system-ui,sans-serif;padding:2rem;max-width:36rem;margin:auto">' +
      "<h1>Tiada sambungan</h1>" +
      `<p>Halaman ini belum disimpan untuk luar talian. Buka <a href="${OFFLINE}">Pelan 5K</a> - pelan dan pemasa berfungsi tanpa internet selepas dibuka sekali.</p>` +
      "</body>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/account/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) await cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch {
          return (await cache.match(req)) ||
            (await cache.match(OFFLINE)) ||
            offlineResponse();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone()).catch(() => {});
      return res;
    })(),
  );
});
