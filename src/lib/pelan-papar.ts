// HTML pelan latihan yang dikongsi Pelan5k.astro dan PelanJarak.astro (gaya: src/styles/pelan.css).
import {
  HARI_SESI,
  NAMA_HARI,
  tarikhSesi,
  type Analisis,
  type Minggu,
} from "./pelan-5k";

const LABEL_PENILAIAN = {
  munasabah: "Munasabah",
  mencabar: "Mencabar",
  "tak-realistik": "Tak realistik",
};

/** Kotak "Realistik ke?". `ganti` = HTML di tempat pecahan (versi awam). */
export function papakAnalisis(a: Analisis, ganti?: string) {
  return `<section class="analisis analisis-${a.penilaian}" aria-labelledby="analisis-tajuk">
    <div class="analisis-kepala">
      <h3 class="display" id="analisis-tajuk">Realistik ke?</h3>
      <span class="analisis-lencana">${LABEL_PENILAIAN[a.penilaian]}</span>
    </div>
    <p class="analisis-ringkas">${a.ringkas}</p>
    ${ganti ??
    `<dl class="analisis-butiran">${a.butiran
      .map(
        (b) =>
          `<div><dt>${b.label}</dt><dd><strong>${b.nilai}</strong><span>${b.nota}</span></dd></div>`,
      )
      .join("")}</dl>`
    }
  </section>`;
}

export function htmlMinggu(w: Minggu, isnin: Date | null, hariIni: string) {
  const hari = w.sesi.length;
  const tarikh = (i: number) => isnin && tarikhSesi(isnin, w.no, hari, i);
  const isninIni = tarikh(0)?.getTime(); // sesi pertama = Isnin minggu itu
  const kini =
    isninIni !== undefined &&
    Date.now() >= isninIni &&
    Date.now() < isninIni + 7 * 864e5;
  return `<li class="kad${w.ringan ? " ringan" : ""}${kini ? " kini" : ""}">
    <header>
      <h3 class="display">Minggu ${w.no}</h3>
      <span class="tag">${kini ? "Minggu ini · " : ""}${w.fasa}${w.ringan && w.fasa !== "Ujian" && w.fasa !== "Tirus" ? " · ringan" : ""}</span>
      <span class="minit">${w.minit} min</span>
    </header>
    <ol>${w.sesi
      .map((s, i) => {
        const d = tarikh(i);
        const label =
          NAMA_HARI[HARI_SESI[hari][i]] +
          (d
            ? ` ${d.toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}`
            : "");
        const today = d?.toDateString() === hariIni;
        return `<li class="sesi ${s.jenis}${today ? " hari-ini" : ""}">
          <label>
            <input type="checkbox" data-sesi="${w.no}.${i}" aria-label="Minggu ${w.no}, ${label}, siap" />
            <span>
              <strong>${today ? "Hari ini · " : ""}${label}: ${s.tajuk}</strong> <em>${s.minit} min</em>
              <span class="arahan">${s.arahan}</span>
              <span class="usaha">${s.usaha}</span>
            </span>
          </label>
        </li>`;
      })
      .join("")}</ol>
  </li>`;
}
