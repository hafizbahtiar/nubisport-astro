// bun scripts/check-profil.ts - umur dari tarikh lahir (src/lib/profil.ts).
import { umur } from "../src/lib/profil";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
ok(umur("1990-10-18", "2026-10-18") === 36, "hari jadi hari ini = genap");
ok(umur("1990-10-19", "2026-10-18") === 35, "esok hari jadi = belum");
ok(umur("1990-01-31", "2026-02-01") === 36, "lepas hari jadi");
ok(umur("2000-02-29", "2026-02-28") === 25 && umur("2000-02-29", "2026-03-01") === 26, "29 Feb");
ok(umur("2027-01-01", "2026-10-18") === null && umur("1990/10/18", "2026-10-18") === null, "masa depan / format salah");
if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - profil");
