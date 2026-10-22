// bun scripts/check-profile.ts - umur dari tarikh lahir (src/lib/profile.ts).
import { ageOn, emptyOnly } from "../src/lib/profile";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};
ok(ageOn("1990-10-18", "2026-10-18") === 36, "hari jadi hari ini = genap");
ok(ageOn("1990-10-19", "2026-10-18") === 35, "esok hari jadi = belum");
ok(ageOn("1990-01-31", "2026-02-01") === 36, "lepas hari jadi");
ok(ageOn("2000-02-29", "2026-02-28") === 25 && ageOn("2000-02-29", "2026-03-01") === 26, "29 Feb");
ok(ageOn("2027-01-01", "2026-10-18") === null && ageOn("1990/10/18", "2026-10-18") === null, "masa depan / format salah");
// Isi profil kali pertama: hanya medan kosong, nilai sedia ada tak ditulis ganti.
{
  const b = emptyOnly({ hari: "4", masa5k: "" }, { hari: "3", masa5k: "33", masa10k: undefined, keadaan: "sihat" });
  ok(JSON.stringify(b) === JSON.stringify({ masa5k: "33", keadaan: "sihat" }), `emptyOnly: ${JSON.stringify(b)}`);
  ok(Object.keys(emptyOnly({ hari: "3" }, { hari: "3" })).length === 0, "emptyOnly: tiada perubahan");
}
if (gagal) throw new Error(`${gagal} semakan gagal`);
console.log("ok - profil");
