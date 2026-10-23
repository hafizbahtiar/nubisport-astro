// Only /api/* and /_astro/* reach this (assets.run_worker_first in wrangler.jsonc); /api/* goes
// to hono-workers unchanged, so its CSRF/Origin, rate limits and cookies apply as-is.
interface Env {
  /** Service binding to the hono-workers Worker (wrangler.jsonc `services`). */
  API: { fetch(request: Request): Promise<Response> };
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  fetch: async (request: Request, env: Env) => {
    if (new URL(request.url).pathname.startsWith("/_astro/")) {
      // _headers gives /_astro/* a 1-year immutable cache, 404 included: a CSS miss during a
      // deploy (new HTML, edge still on the old version) stuck the 404 page in the browser as the
      // stylesheet for a year. Misses must not be cached.
      const res = await env.ASSETS.fetch(request);
      if (res.status !== 404) return res;
      const miss = new Response(res.body, res);
      miss.headers.set("Cache-Control", "no-store");
      return miss;
    }
    // Trusted app marker for the shared API: the backend binds the session/JWT to
    // this app. Overwrite any client-supplied header.
    const headers = new Headers(request.headers);
    headers.set("X-App", "nubi");
    return env.API.fetch(new Request(request, { headers }));
  },
};
