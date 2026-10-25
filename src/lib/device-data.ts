// Personal data kept in this browser (plans, ticks, MAF, chosen state, calendar feed) belongs to ONE
// account. Without an owner, user B signing in on A's browser would see A's plans and could save
// them to B's cloud. Rules:
// - logout wipes it (cloud plans come back on the next login; device-only plans are gone - the
//   logout dialog says so);
// - every /me (fetchMe) stamps the owner; a different account signing in wipes it first. That
//   covers the case logout cannot: A's session expired and B signed in.
// - no stamp yet (guest plans made before signing in, or data from before this rule) = adopted by
//   the account that signs in, so "make a plan, then register" keeps the plan.
// UI preferences (sidebar, map 3D/colour) are not personal and stay.

const OWNER_KEY = "nubi:owner";
const PERSONAL = [
  /^pelan-/, // lib/saved-plans.ts: plan list, plans, ticks, params (`<key>#p`)
  /^awan:tertunda$/, // lib/cloud-sync.ts: pending cloud pushes
  /^maf:terakhir$/, // components/Maf.astro
  /^nubi:lokasi$/, // lib/run-check.ts
  /^nubi:kalendar(-ics)?$/, // components/Plan5k.astro calendar feed
];

/** Remove every personal key from this browser. True when something was removed. */
export function clearDeviceData(): boolean {
  try {
    const keys = Object.keys(localStorage).filter((k) => PERSONAL.some((re) => re.test(k)));
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(OWNER_KEY);
    return keys.length > 0;
  } catch {
    return false; // private mode: nothing stored anyway
  }
}

/**
 * Called with the signed-in user on every /me. Returns true when another account's data was
 * wiped (the page already drew it, so the caller reloads).
 */
export function claimDeviceData(userId: number): boolean {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    const wiped = owner !== null && owner !== String(userId) && clearDeviceData();
    localStorage.setItem(OWNER_KEY, String(userId));
    return wiped;
  } catch {
    return false;
  }
}
