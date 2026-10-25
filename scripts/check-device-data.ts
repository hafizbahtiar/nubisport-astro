/**
 * Plans in localStorage belong to one account (src/lib/device-data.ts): another account signing
 * in must not see or cloud-save them, logout wipes them, guest plans are adopted, UI prefs stay.
 *
 *   bun scripts/check-device-data.ts
 */
import { claimDeviceData, clearDeviceData } from "../src/lib/device-data";

let checks = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) throw new Error(msg);
  checks++;
};

// Like the real Storage: stored keys are own enumerable props, methods live on the prototype.
const proto = {
  getItem(this: any, k: string) {
    return Object.hasOwn(this, k) ? this[k] : null;
  },
  setItem(this: any, k: string, v: string) {
    this[k] = String(v);
  },
  removeItem(this: any, k: string) {
    delete this[k];
  },
};
const storage: any = Object.create(proto);
(globalThis as any).localStorage = storage;

const seedPlans = () => {
  storage.setItem("pelan-5k:dibuat", '["pelan-5k:8w-baru-30-3"]');
  storage.setItem("pelan-5k:8w-baru-30-3", '["1.0"]');
  storage.setItem("pelan-5k:8w-baru-30-3#p", '{"hari":"3"}');
  storage.setItem("awan:tertunda", '["pelan-5k:8w-baru-30-3"]');
  storage.setItem("maf:terakhir", '{"maf":150}');
  storage.setItem("nubi:lokasi", "Selangor");
  storage.setItem("nubi:kalendar", "1");
  storage.setItem("akaun:sidebar", "tutup");
  storage.setItem("nubi/peta-3d", "1");
};
const hasPlans = () => storage.getItem("pelan-5k:dibuat") !== null;

console.log("Checking device data ownership...\n");

// Guest plans, then A signs in: adopted, nothing wiped.
seedPlans();
ok(claimDeviceData(1) === false, "guest data must be adopted, not wiped");
ok(hasPlans(), "guest plans kept for the account that signs in");
ok(storage.getItem("nubi:owner") === "1", "owner stamped");

// Same account again: nothing changes.
ok(claimDeviceData(1) === false && hasPlans(), "same account keeps its plans");

// B signs in on A's browser (A's session expired, no logout): A's data wiped.
ok(claimDeviceData(2) === true, "another account must trigger a wipe");
for (const k of ["pelan-5k:dibuat", "pelan-5k:8w-baru-30-3", "pelan-5k:8w-baru-30-3#p", "awan:tertunda", "maf:terakhir", "nubi:lokasi", "nubi:kalendar"])
  ok(storage.getItem(k) === null, `${k} must be wiped for another account`);
ok(storage.getItem("nubi:owner") === "2", "new owner stamped");
ok(storage.getItem("akaun:sidebar") === "tutup" && storage.getItem("nubi/peta-3d") === "1", "UI prefs stay");

// Logout wipes personal data and the owner, so the next sign-in starts clean.
seedPlans();
ok(clearDeviceData() === true, "logout wipe reports removal");
ok(!hasPlans() && storage.getItem("nubi:owner") === null, "logout removes plans and owner");
ok(storage.getItem("akaun:sidebar") === "tutup", "logout keeps UI prefs");

// No storage (private mode): never throws.
(globalThis as any).localStorage = undefined;
ok(claimDeviceData(3) === false && clearDeviceData() === false, "no storage = no throw");

console.log(`device-data: ${checks} checks passed`);
