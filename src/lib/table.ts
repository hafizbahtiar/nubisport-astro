// Pengawal untuk <Table> (components/ui/Table.astro): cari, tapis, papar N, halaman.
// Satu laluan untuk semua variant: kawalan yang tiada dalam markup (compact tiada cari/kaki,
// standard tiada papar N) dilangkau; saiz halaman = papar N jika ada, jika tidak `data-limit` akar.
// Semuanya di pelayar ke atas data yang sudah dimuat (senarai Nubi kecil - had 5,000 aktiviti).
//
//   const j = createTable<Baris>("aktiviti", {
//     columns: [r => r.nama, r => km(r.jarak), r => butangPadam(r)],  // ikut susunan `columns` Astro
//     search: r => r.nama,                                            // teks untuk kotak cari (pilihan; compact tiada)
//   });
//   j.data(baris);          // tukar data (contoh selepas fetch)
//   j.filter(r => r.ok);    // penapis tambahan dari kawalan sendiri (slot "filters"); null = tiada
//
// Sel = string (jadi textContent - selamat untuk teks pengguna) atau Node.

type Sel = string | Node | null;

export function createTable<T>(id: string, o: { columns: ((r: T) => Sel)[]; search?: (r: T) => string }) {
  const akar = document.getElementById(id)!;
  const q = <E extends Element>(s: string) => akar.querySelector<E>(s)!;
  const kotak = akar.querySelector<HTMLInputElement>("[data-cari]");
  const had = akar.querySelector<HTMLSelectElement>("[data-had] select");
  const kaki = akar.querySelector<HTMLElement>("[data-kaki]");
  const badan = q<HTMLTableSectionElement>("tbody");
  const th = [...akar.querySelectorAll("thead th")];
  // Label kad telefon; lajur `sorok` (label sr-only) tiada label.
  const label = th.map((h) => (h.querySelector(".sr-only") ? "" : (h.textContent?.trim() ?? "")));
  const angka = th.map((h) => h.classList.contains("angka"));

  let semua: T[] = [];
  let penapis: ((r: T) => boolean) | null = null;
  let halaman = 0;
  let memuat = true;
  const kosong = q<HTMLElement>("[data-kosong]");
  const kosongTajuk = akar.querySelector<HTMLElement>("[data-kosong-tajuk]");
  const kosongHint = akar.querySelector<HTMLElement>("[data-kosong-hint]");
  const tajukAsal = kosongTajuk?.textContent ?? "";

  const saiz = () => Number(had?.value ?? akar.dataset.limit) || 10;

  /** Skeleton: satu baris rangka setiap lajur, tinggi baris sama seperti data sebenar. */
  function rangka() {
    const n = saiz();
    badan.replaceChildren(
      ...Array.from({ length: n }, (_, r) => {
        const tr = document.createElement("tr");
        o.columns.forEach((_, i) => {
          const td = document.createElement("td");
          td.dataset.label = label[i];
          if (angka[i]) td.className = "angka";
          const s = document.createElement("span");
          s.className = "rangka";
          s.style.width = `${55 + ((r + i) % 4) * 10}%`;
          if (angka[i]) s.style.marginLeft = "auto";
          td.append(s);
          tr.append(td);
        });
        return tr;
      }),
    );
  }

  function lukis() {
    memuat = false;
    akar.removeAttribute("aria-busy");
    const kata = kotak?.value.trim().toLowerCase();
    const padan = semua.filter((r) => (!penapis || penapis(r)) && (!kata || !o.search || o.search(r).toLowerCase().includes(kata)));
    const n = saiz();
    const muka = Math.max(1, Math.ceil(padan.length / n));
    halaman = Math.min(halaman, muka - 1);
    const mula = halaman * n;

    badan.replaceChildren(
      ...padan.slice(mula, mula + n).map((r) => {
        const tr = document.createElement("tr");
        o.columns.forEach((f, i) => {
          const td = document.createElement("td");
          td.dataset.label = label[i];
          if (angka[i]) td.className = "angka";
          const v = f(r);
          if (v != null) td.append(v);
          tr.append(td);
        });
        return tr;
      }),
    );

    // Empty state: tiada data vs tiada padanan carian.
    kosong.hidden = padan.length > 0;
    if (!kosong.hidden && kosongTajuk)
      kosongTajuk.textContent = kata ? `Tiada padanan untuk “${kata}”.` : tajukAsal;
    if (!kosong.hidden && kosongHint) kosongHint.hidden = !!kata;
    if (!kaki) return;
    kaki.hidden = padan.length === 0;
    q<HTMLElement>("[data-julat]").textContent = `${mula + 1}–${Math.min(mula + n, padan.length)} daripada ${padan.length}`;
    q<HTMLElement>("[data-muka]").textContent = `${halaman + 1} / ${muka}`;
    q<HTMLButtonElement>("[data-sebelum]").disabled = halaman === 0;
    q<HTMLButtonElement>("[data-seterus]").disabled = halaman >= muka - 1;
  }

  /** Tunjuk baris rangka sementara data dimuat (contoh tukar tempoh). */
  function loading() {
    memuat = true;
    halaman = 0;
    akar.setAttribute("aria-busy", "true");
    kosong.hidden = true;
    if (kaki) kaki.hidden = true;
    rangka();
  }

  const semula = () => {
    if (memuat) return;
    halaman = 0;
    lukis();
  };
  kotak?.addEventListener("input", semula);
  had?.addEventListener("change", semula);
  kaki?.querySelector("[data-sebelum]")!.addEventListener("click", () => (halaman--, lukis()));
  kaki?.querySelector("[data-seterus]")!.addEventListener("click", () => (halaman++, lukis()));

  loading();

  return {
    /** Data baru (contoh tukar tempoh). Halaman semasa dikekalkan jika masih wujud. */
    data(baris: T[]) {
      semua = baris;
      lukis();
    },
    filter(f: ((r: T) => boolean) | null) {
      penapis = f;
      semula();
    },
    /** Baris rangka sehingga `data()` dipanggil. */
    loading,
  };
}
