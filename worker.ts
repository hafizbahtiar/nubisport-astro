// Only /api/* reaches this (assets.run_worker_first in wrangler.jsonc); the request goes
// to hono-workers unchanged, so its CSRF/Origin, rate limits and cookies apply as-is.
interface Env {
  /** Service binding to the hono-workers Worker (wrangler.jsonc `services`). */
  API: { fetch(request: Request): Promise<Response> };
}

export default {
  fetch: (request: Request, env: Env) => {
    // Trusted app marker for the shared API: the backend binds the session/JWT to
    // this app. Overwrite any client-supplied header.
    const headers = new Headers(request.headers);
    headers.set("X-App", "nubi");
    return env.API.fetch(new Request(request, { headers }));
  },
};
