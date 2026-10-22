// HTML pelan latihan yang dikongsi Plan5k.astro dan DistancePlan.astro (gaya: src/styles/plan.css).
import { icon } from "./icon";
import { parseTime, nextPlan, type TestDistance } from "./pace";
import { inRamadan } from "./ramadan";
import {
  SESSION_DAYS,
  isoDate,
  resumePoint,
  DAY_NAMES,
  sessionDate,
  type Analysis,
  type Week,
} from "./plan-5k";

const LABEL_PENILAIAN = {
  munasabah: "Munasabah",
  mencabar: "Mencabar",
  "tak-realistik": "Tak realistik",
};

/** Kotak "Realistik tak?". `ganti` = HTML di tempat pecahan (versi awam). */
export function analysisHtml(a: Analysis, ganti?: string) {
  return `<section class="analisis analisis-${a.penilaian}" aria-labelledby="analisis-tajuk">
    <div class="analisis-kepala">
      <h3 class="display" id="analisis-tajuk">Realistik tak?</h3>
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

/** `ujian` = pelan apa (kad hari ujian/lumba dapat borang "masa anda" -> pelan seterusnya). */
export function weekHtml(w: Week, isnin: Date | null, hariIni: string, ujian?: TestDistance) {
  const hari = w.sesi.length;
  const tarikh = (i: number) => isnin && sessionDate(isnin, w.no, hari, i);
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
          DAY_NAMES[SESSION_DAYS[hari][i]] +
          (d
            ? ` ${d.toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}`
            : "");
        const today = d?.toDateString() === hariIni;
        const puasa = d ? inRamadan(isoDate(d)) : false;
        return `<li class="sesi ${s.jenis}${today ? " hari-ini" : ""}">
          <label>
            <input type="checkbox" data-sesi="${w.no}.${i}" aria-label="Minggu ${w.no}, ${label}, siap" />
            <span>
              <strong>${today ? "Hari ini · " : ""}${label}: ${s.tajuk}</strong> <em>${s.minit} min</em>${puasa ? ' <span class="tag">Puasa</span>' : ""}
              <span class="arahan">${s.arahan}</span>
              <span class="usaha">${s.usaha.replace(/~\S+\/km/g, (m) => `<span class="nw">${m}</span>`)}${puasa ? " · Hari puasa: ringankan sesi ini, hidrasi lepas berbuka." : ""}</span>
            </span>
          </label>${s.segmen
            ? `<button class="btn-mula no-print" type="button" data-mula="${w.no}.${i}" data-tajuk="${s.tajuk}" data-usaha="${s.usaha.replace(/"/g, "&quot;")}" data-segmen='${JSON.stringify(s.segmen)}'>${icon("main")}Mula pemasa</button>`
            : ""
          }${s.jenis === "ujian" && ujian
            ? `<form class="ujian-masa no-print" data-ujian="${ujian}" data-sesi-ujian="${w.no}.${i}">
                  <label class="field"><span class="field-label">Masa sebenar anda</span>
                    <input class="input" name="masa" inputmode="numeric" autocomplete="off" placeholder="cth. 29:40" required /></label>
                  <button class="btn btn-primary btn-sm" type="submit">Pelan seterusnya</button>
                  <div class="ujian-hasil" data-ujian-hasil aria-live="polite"></div>
                </form>`
            : ""
          }
        </li>`;
      })
      .join("")}</ol>
  </li>`;
}

/**
 * Banner bulan puasa: bilangan sesi yang jatuh dalam Hijri bulan 9. "" bila pelan tiada tarikh
 * mula atau tiada sesi dalam Ramadan. Tarikh = anggaran Umm al-Qura (±1 hari), bukan takwim JAKIM.
 */
export function ramadanNotice(minggu: Week[], isnin: Date | null): string {
  if (!isnin) return "";
  let jumlah = 0;
  for (const w of minggu) {
    const hari = w.sesi.length;
    for (let i = 0; i < hari; i++)
      if (inRamadan(isoDate(sessionDate(isnin, w.no, hari, i)))) jumlah++;
  }
  if (!jumlah) return "";
  return `<div class="alert alert-info no-print">
    <p class="alert-title">Bulan Ramadan · ${jumlah} sesi</p>
    <p>Sesi ini jatuh dalam bulan puasa. Semasa berpuasa: jadikan sesi laju atau interval sebagai larian <strong>mudah</strong> saja, lari sebelum berbuka atau lepas tarawih, dan minum serta makan karbohidrat lepas berbuka. Panduan umum, bukan nasihat perubatan.</p>
  </div>`;
}

/**
 * Notis "Terlepas sesi?" (pelan bertarikh sahaja). Pulang fungsi lukis - panggil setiap kali tanda
 * siap berubah. Butang = buka semula pelan dengan `mula` baru; tanda siap ikut nombor minggu jadi kekal,
 * dan page akaun menyegerak param baru ke awan sendiri (mountCloudBox: param berubah -> hantar).
 */
export function mountResume(slot: HTMLElement, minggu: Week[], isnin: Date, siap: Set<string>) {
  slot.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-sambung]");
    if (!b) return;
    const q = new URLSearchParams(location.search);
    q.set("mula", b.dataset.sambung!);
    location.search = q.toString();
  });
  return () => {
    const r = resumePoint(minggu, isnin, siap);
    slot.innerHTML = r
      ? `<div class="alert alert-info">
          <p class="alert-title">Terlepas sesi? Tak apa.</p>
          <p>Sambung dari <strong>Minggu ${r.no}</strong> mulai ${r.isninMinggu.toDateString() === new Date().toDateString() ? "hari ini" : "Isnin depan"}, ${r.isninMinggu.toLocaleDateString("ms-MY", { day: "numeric", month: "long" })}.
            Tarikh pelan dianjak ${r.anjak} minggu (tarikh tamat juga); tanda siap kekal. Muat turun semula fail kalendar kalau anda guna. Dah siap sesi itu? Tandakan saja - notis ini hilang.</p>
          <div class="actions">
            <button class="btn btn-primary btn-sm" type="button" data-sambung="${isoDate(r.mula)}">Sambung dari Minggu ${r.no}</button>
          </div>
        </div>`
      : "";
  };
}

/** Borang hari ujian/lumba: masa sebenar -> tanda sesi itu siap + cadangan pelan seterusnya. */
export function mountTestForm(akar: HTMLElement) {
  akar.addEventListener("submit", (e) => {
    const f = (e.target as Element).closest<HTMLFormElement>("form[data-ujian]");
    if (!f) return;
    e.preventDefault();
    const out = f.querySelector<HTMLElement>("[data-ujian-hasil]")!;
    const minit = parseTime(String(f.masa.value));
    if (!minit) {
      out.innerHTML = `<p class="ralat">Format masa: mm:ss (29:40) atau h:mm:ss (2:15:00).</p>`;
      return;
    }
    const kotak = akar.querySelector<HTMLInputElement>(`input[data-sesi="${f.dataset.sesiUjian}"]`);
    if (kotak && !kotak.checked) {
      kotak.checked = true;
      kotak.dispatchEvent(new Event("change"));
    }
    const hari = akar.querySelector(".kad")?.querySelectorAll(".sesi").length ?? 3;
    const r = nextPlan(f.dataset.ujian as TestDistance, minit, hari, location.pathname);
    // Teks dari lib (nombor + ayat tetap), bukan dari input - selamat untuk innerHTML.
    out.innerHTML = `<p>${r.teks}</p>${r.pautan.length
      ? `<div class="actions">${r.pautan
        .map((p, n) => `<a class="btn ${n ? "btn-outline" : "btn-primary"} btn-sm" href="${p.href}">${p.label}</a>`)
        .join("")}</div>`
      : ""
      }`;
  });
}

/**
 * Pautan kongsi pelan untuk kawan (lari berdua): `laluan` = page yang kawan boleh buka (5K = awam).
 * Param MAF (umur, keadaan kesihatan) dibuang - peribadi; tarikh mula kekal supaya jadual sama.
 */
export function shareLink(laluan: string, q: URLSearchParams): string {
  const p = new URLSearchParams(q);
  ["maf", "umur", "keadaan"].forEach((k) => p.delete(k));
  return `${location.origin}${laluan}?${p}`;
}

export function mountShare(btn: HTMLButtonElement, url: string, teks: string) {
  btn.addEventListener("click", async () => {
    try {
      if (navigator.share) return await navigator.share({ title: document.title, text: teks, url });
      await navigator.clipboard.writeText(`${teks} ${url}`);
      btn.textContent = "Pautan disalin";
    } catch {
      /* dibatalkan */
    }
  });
}
