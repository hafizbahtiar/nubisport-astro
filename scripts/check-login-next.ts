// bun scripts/check-login-next.ts - `?next=` selepas log masuk kekal dalam laman (lib/api.ts internalPath).
import { internalPath } from "../src/lib/api";

let checks = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) throw new Error(msg);
  checks++;
};

const O = "https://nubisport.hafizbahtiar.com";
const sama: [string | null, string][] = [
  ["/account/plans/5k/new?bulan=3#borang", "/account/plans/5k/new?bulan=3#borang"],
  [null, "/account"],
  ["", "/account"],
];
for (const [n, mahu] of sama) ok(internalPath(n, O) === mahu, `${n} -> ${mahu} (dapat ${internalPath(n, O)})`);
// Tab / baris baru dibuang pelayar: "/\t/evil.com" = "//evil.com" (lepas regex lama).
for (const n of ["/\t/evil.com", "/\n/evil.com", "//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "data:text/html,x", "http://["])
  ok(internalPath(n, O) === "/account", `${JSON.stringify(n)} mesti /account (dapat ${internalPath(n, O)})`);

console.log(`ok - next log masuk (${checks} semakan)`);
