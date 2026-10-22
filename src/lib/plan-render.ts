// HTML pelan latihan yang dikongsi Plan5k.astro dan DistancePlan.astro (gaya: src/styles/plan.css).
import { icon } from "./icon";
import { parseTime, nextPlan, type TestDistance } from "./pace";
import { formatPace } from "./plan-5k";
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

/**
 * `ujian` = pelan apa (kad hari ujian/lumba dapat borang "masa anda" -> pelan seterusnya).
 * `lumba` = tarikh lumba sebenar: kad hari lumba ikut tarikh itu (sesi akhir pelan 3 hari = Sabtu).
 * Slot `data-beban` / `data-sebenar` diisi oleh mountActuals (lib/plan-sync.ts) untuk pelan aktif.
 */
export function weekHtml(w: Week, isnin: Date | null, hariIni: string, ujian?: TestDistance, lumba?: Date | null) {
  const hari = w.sesi.length;
  const tarikh = (i: number) => (lumba && w.sesi[i].jenis === "ujian" ? lumba : isnin && sessionDate(isnin, w.no, hari, i));
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
    <p class="beban" data-beban="${w.no}" hidden></p>
    <ol>${w.sesi
      .map((s, i) => {
        const d = tarikh(i);
        const label =
          (d && lumba && s.jenis === "ujian" ? DAY_NAMES[(d.getDay() + 6) % 7] : DAY_NAMES[SESSION_DAYS[hari][i]]) +
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
          </label>
          <p class="sebenar" data-sebenar="${w.no}.${i}" hidden></p>${s.segmen
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

type Paces = { mudah?: [number, number]; tempo?: [number, number]; interval?: [number, number]; lumba: number };
const julat = ([a, b]: [number, number]) => `<span class="nw">~${formatPace(a)}-${formatPace(b)}/km</span>`;
const arah = ([a, b]: [number, number]) => `<span class="nw">~${formatPace(a)} → ${formatPace(b)}/km</span>`;

/**
 * Kotak "Pace pelan" (lalai dari masa semasa / sasaran) + borang pace sasaran sendiri (param `pace`, s/km).
 * Mudah/panjang kekal dari masa sekarang - pace sasaran yang lebih laju tak patut melajukan hari mudah.
 */
export function pacesHtml(p: Paces, sendiri: boolean, lumbaLabel: string) {
  const baris = [
    ["Mudah + larian panjang", p.mudah ? julat(p.mudah) : "Ikut rasa - boleh bercakap ayat penuh"],
    ...(p.tempo ? [["Tempo", `${arah(p.tempo)} <small>beransur setiap minggu</small>`]] : []),
    ...(p.interval ? [["Interval", `${arah(p.interval)} <small>beransur setiap minggu</small>`]] : []),
    [lumbaLabel, `<span class="nw">~${formatPace(p.lumba)}/km</span>${sendiri ? " <small>pilihan anda</small>" : ""}`],
  ];
  return `<section class="pace-pelan" aria-labelledby="pace-tajuk">
    <h3 class="display" id="pace-tajuk">Pace pelan</h3>
    <dl>${baris.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <form class="pace-ubah no-print" data-pace-borang>
      <label class="field"><span class="field-label">Pace sasaran sendiri (min:saat /km)</span>
        <input class="input" name="pace" inputmode="numeric" autocomplete="off" placeholder="cth. 6:30" value="${sendiri ? formatPace(p.lumba) : ""}" required /></label>
      <button class="btn btn-outline btn-sm" type="submit">Kira semula</button>
      ${sendiri ? `<button class="btn btn-outline btn-sm" type="button" data-pace-asal>Guna pace lalai</button>` : ""}
      <p class="ralat" data-pace-ralat hidden>Format pace: min:saat, contoh 6:30.</p>
    </form>
  </section>`;
}

/** Borang pace: set / buang `pace` dan buka semula pelan. `buang` = param yang diganti pace (10K/21K: `sasaran`). */
export function mountPaceForm(akar: HTMLElement, buang: string[] = []) {
  const buka = (pace: number | null) => {
    const q = new URLSearchParams(location.search);
    pace ? q.set("pace", String(pace)) : q.delete("pace");
    if (pace) buang.forEach((k) => q.delete(k));
    location.search = q.toString();
  };
  akar.addEventListener("submit", (e) => {
    const f = (e.target as Element).closest<HTMLFormElement>("form[data-pace-borang]");
    if (!f) return;
    e.preventDefault();
    const minit = parseTime(String(f.pace.value)); // "6:30" -> 6.5 minit = 390 s/km
    if (!minit) return void (f.querySelector<HTMLElement>("[data-pace-ralat]")!.hidden = false);
    buka(Math.round(minit * 60));
  });
  akar.addEventListener("click", (e) => {
    if ((e.target as Element).closest("[data-pace-asal]")) buka(null);
  });
}

/** Nota hari lumba (pelan ikut tarikh lumba): pemanasan + pace km pertama. */
export function raceDayHtml(lumba: Date, pace: number, nama: string) {
  return `<div class="alert alert-info">
    <p class="alert-title">Hari lumba ${nama} · ${lumba.toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    <p>Minggu tirus dan minggu lumba dikira ke belakang dari tarikh ini. Pagi lumba: sampai awal, jalan 5 min + joging santai 5-10 min + 4 × 20 saat langkah laju, siap ~15 min sebelum mula.
      Km pertama ~<span class="nw">${formatPace(pace + 10)}/km</span> (sedikit perlahan daripada pace sasaran <span class="nw">${formatPace(pace)}/km</span>), lepas itu ikut pace sasaran. Minum di setiap stesen air. Malam sebelum: makan biasa, tidur awal, siapkan bib dan kasut.</p>
  </div>`;
}

/** Bar beban satu minggu: minit sebenar (run/walk) vs dirancang. */
export const loadBarHtml = (w: { no: number; rancang: number; sebenar: number }, label = "") =>
  `${label}<span class="beban-trek" role="img" aria-label="${w.sebenar} daripada ${w.rancang} minit"><i style="width:${Math.min(100, Math.round((w.sebenar / Math.max(1, w.rancang)) * 100))}%"></i></span><small>${w.sebenar} / ${w.rancang} min sebenar</small>`;

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
