/**
 * currentUser() mesti ambil /me baharu, bukan salinan sessionStorage 5 min - kalau tidak,
 * perubahan peranan app (admin jadikan ahli) tak nampak selepas refresh.
 *
 *   bun scripts/check-me-fresh.ts
 */
import { cacheMe, currentUser } from "../src/lib/api";

let checks = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) throw new Error(msg);
  checks++;
};

const store = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};
(globalThis as any).document = { cookie: "session_active=1" };

let calls = 0;
(globalThis as any).fetch = async (url: string, init: RequestInit) => {
  calls++;
  ok(String(url).endsWith("/api/v1/me"), `URL /me (${url})`);
  ok(init.cache === "no-store", "/me mesti cache: no-store");
  return new Response(
    JSON.stringify({
      success: true,
      data: { id: 1, name: "A", email: "a@x", role: "user", apps: { nubi: "ahli" } },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

console.log("Menyemak /me segar...\n");

// Salinan lama (bukan ahli) - kod cache lama akan pulangkan ini.
cacheMe({ id: 1, name: "A", email: "a@x", role: "user", apps: {} } as any);
const s = await currentUser();

ok(s?.apps?.nubi === "ahli", "peranan baharu diambil dari /me, bukan cache");
ok(calls === 1, `satu /me (${calls})`);
console.log(`  ✓ ${checks} checks passed.`);
