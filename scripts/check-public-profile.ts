// bun scripts/check-public-profile.ts - worker rewrite: /u/<username> serves the static shell,
// /api/* still goes to the backend, other methods on /u are 405. No network or wrangler.
import worker from "../worker";

let failed = 0;
const ok = (condition: unknown, message: string) => {
  if (!condition) {
    failed++;
    console.error("GAGAL:", message);
  }
};

let asset = "";
let api = "";
let apiApp = "";
const env = {
  ASSETS: {
    fetch: async (request: Request) => {
      asset = request.url;
      return new Response("shell");
    },
  },
  API: {
    fetch: async (request: Request) => {
      api = request.url;
      apiApp = request.headers.get("X-App") ?? "";
      return new Response("api");
    },
  },
};
const req = (path: string, method = "GET") =>
  new Request(`https://nubi.test${path}`, { method });

{
  const res = await worker.fetch(req("/u/alice"), env);
  ok(res.status === 200 && (await res.text()) === "shell", "GET /u/<username> -> shell");
  ok(asset === "https://nubi.test/u/index.html", `asset URL: ${asset}`);
}
{
  asset = "";
  const res = await worker.fetch(req("/u"), env);
  ok(res.status === 200 && asset === "https://nubi.test/u/index.html", "GET /u -> shell");
}
{
  asset = "";
  const res = await worker.fetch(req("/u/alice", "POST"), env);
  ok(res.status === 405 && asset === "", "POST /u -> 405 tanpa asset");
}
{
  const res = await worker.fetch(req("/api/v1/public/profiles/alice/nubi"), env);
  ok(res.status === 200 && api === "https://nubi.test/api/v1/public/profiles/alice/nubi", "API passthrough");
  ok(apiApp === "nubi", "X-App: nubi pada API");
}

if (failed) throw new Error(`${failed} semakan gagal`);
console.log("check-public-profile: semua lulus.");
