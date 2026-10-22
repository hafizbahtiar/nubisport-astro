// Medan masa standard (TimePicker.astro + HTML yang dijana skrip) - adik-beradik DatePicker:
// kotak teks hh:mm (mask, 24 jam) + butang jam yang membuka panel grid Jam / Minit (kelas dp-* yang
// sama: panel putih, butang bulat, pilihan oren, kaki "Sekarang / Kosongkan").
// Kontrak sama dengan DatePicker: nilai "HH:MM" (atau "") dalam input tersembunyi yang membawa
// `id` + `name` - `.value` dibaca terus; set nilai + hantar `change` = medan ikut.
// Label: <Field label="..." for={`${id}-text`}>. Masa ditaip tak perlu ikut langkah; panel ikut langkah.
// Papan kekunci: Alt+↓ buka; anak panah dalam grid; Enter/Space pilih; Esc tutup.
// Semak: bun scripts/check-time-picker.ts
import { icon } from "./icon";
import { installMasks } from "./mask";

const dua = (n: number) => String(n).padStart(2, "0");
const KOLUM = 6;

/** "HH:MM" sah (00:00-23:59) -> [jam, minit]; selain itu null. */
export function parseTime(v: string): [number, number] | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  return m && +m[1] <= 23 && +m[2] <= 59 ? [+m[1], +m[2]] : null;
}

/** Masa Malaysia sekarang, dibundarkan ke bawah ikut `step` minit. */
export function nowMalaysia(step = 5, now = new Date()): string {
  const t = new Date(now.getTime() + 8 * 3600e3);
  return `${dua(t.getUTCHours())}:${dua(t.getUTCMinutes() - (t.getUTCMinutes() % step))}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function timePickerHtml(o: { id: string; name?: string; value?: string; step?: number; required?: boolean }): string {
  const step = o.step ?? 5;
  const v = parseTime(o.value ?? "") ? o.value! : "";
  const id = esc(o.id);
  const grid = (jenis: "jam" | "minit", nilai: number[]) =>
    `<div class="tp-lajur"><p class="tp-tajuk" id="${id}-l-${jenis}">${jenis === "jam" ? "Jam" : "Minit"}</p>` +
    `<div class="tp-grid" role="listbox" aria-labelledby="${id}-l-${jenis}" data-${jenis}>` +
    nilai.map((n) => `<button class="dp-hari" type="button" role="option" data-n="${n}" tabindex="-1">${dua(n)}</button>`).join("") +
    `</div></div>`;
  return (
    `<div class="dp tp" data-timepicker data-step="${step}">` +
    `<input type="hidden" id="${id}"${o.name ? ` name="${esc(o.name)}"` : ""} value="${v}" />` +
    `<div class="dp-medan">` +
    `<input class="input dp-teks" type="text" id="${id}-text" data-text data-mask="time" inputmode="numeric" autocomplete="off" placeholder="hh:mm" maxlength="5" value="${v}"${o.required ? " required" : ""} />` +
    `<button class="dp-buka" type="button" data-open aria-label="Pilih masa" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}-panel">${icon("jam")}</button>` +
    `</div>` +
    `<p class="dp-ralat" data-error aria-live="polite"></p>` +
    `<div class="dp-panel tp-panel" id="${id}-panel" data-panel hidden role="dialog" aria-label="Pilih masa">` +
    grid("jam", Array.from({ length: 24 }, (_, i) => i)) +
    grid("minit", Array.from({ length: 60 / step }, (_, i) => i * step)) +
    `<div class="dp-kaki"><button class="dp-hari-ini" type="button" data-now>Sekarang</button>` +
    `<button class="dp-kosong" type="button" data-clear>Kosongkan</button></div>` +
    `</div></div>`
  );
}

function pasang(root: HTMLElement) {
  if (root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const hidden = $<HTMLInputElement>('input[type="hidden"]');
  const text = $<HTMLInputElement>("[data-text]");
  const openBtn = $<HTMLButtonElement>("[data-open]");
  const error = $<HTMLElement>("[data-error]");
  const panel = $<HTMLElement>("[data-panel]");
  const gridJam = $<HTMLElement>("[data-jam]");
  const gridMinit = $<HTMLElement>("[data-minit]");
  const step = Number(root.dataset.step) || 5;

  const showError = (msg: string) => {
    error.textContent = msg;
    text.setCustomValidity(msg);
    text.setAttribute("aria-invalid", String(!!msg));
  };
  const setValue = (v: string) => {
    showError("");
    text.value = v;
    if (hidden.value === v) return;
    hidden.value = v;
    hidden.dispatchEvent(new Event("input", { bubbles: true }));
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // Tanda pilihan + roving tabindex: satu butang setiap grid boleh di-Tab.
  const render = () => {
    const t = parseTime(hidden.value);
    const [h, m] = t ?? parseTime(nowMalaysia(step))!;
    for (const [grid, sel, fokus] of [
      [gridJam, t?.[0], h],
      [gridMinit, t?.[1], m - (m % step)],
    ] as const) {
      grid.querySelectorAll<HTMLButtonElement>("[data-n]").forEach((b) => {
        const n = Number(b.dataset.n);
        b.setAttribute("aria-selected", String(n === sel));
        b.tabIndex = n === fokus ? 0 : -1;
      });
    }
  };

  const isOpen = () => !panel.hidden;
  const open = () => {
    render();
    panel.hidden = false;
    openBtn.setAttribute("aria-expanded", "true");
    gridJam.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };
  const close = (refocus = true) => {
    if (!isOpen()) return;
    panel.hidden = true;
    openBtn.setAttribute("aria-expanded", "false");
    if (refocus) openBtn.focus();
  };

  // Pilih jam: kekal terbuka, fokus ke minit. Pilih minit: siap, tutup.
  const pick = (jenis: "jam" | "minit", n: number) => {
    const [h, m] = parseTime(hidden.value) ?? [jenis === "jam" ? n : 7, 0];
    setValue(jenis === "jam" ? `${dua(n)}:${dua(m)}` : `${dua(h)}:${dua(n)}`);
    render();
    if (jenis === "jam") gridMinit.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    else close();
  };
  for (const [grid, jenis] of [
    [gridJam, "jam"],
    [gridMinit, "minit"],
  ] as const) {
    grid.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-n]");
      if (b) pick(jenis, Number(b.dataset.n));
    });
    grid.addEventListener("keydown", (e) => {
      const btns = [...grid.querySelectorAll<HTMLButtonElement>("[data-n]")];
      const i = btns.indexOf(document.activeElement as HTMLButtonElement);
      const langkah: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -KOLUM, ArrowDown: KOLUM };
      const ke = e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : i + (langkah[e.key] ?? NaN);
      if (Number.isNaN(ke) || i < 0) return;
      e.preventDefault();
      const b = btns[Math.max(0, Math.min(btns.length - 1, ke))];
      btns.forEach((x) => (x.tabIndex = x === b ? 0 : -1));
      b.focus();
    });
  }

  // Taip: mask (lib/mask.ts) jaga bentuk; disemak bila change / Enter.
  text.addEventListener("input", () => error.textContent && showError(""));
  const commit = () => {
    const raw = text.value.trim();
    if (!raw) return setValue("");
    if (!parseTime(raw)) return showError("Masa tak sah. Guna format hh:mm (00:00 - 23:59).");
    setValue(raw);
  };
  text.addEventListener("change", commit);
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "ArrowDown" && e.altKey) open();
  });

  openBtn.addEventListener("click", () => (isOpen() ? close() : open()));
  $<HTMLButtonElement>("[data-now]").addEventListener("click", () => (setValue(nowMalaysia(step)), close()));
  $<HTMLButtonElement>("[data-clear]").addEventListener("click", () => (setValue(""), close()));
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !root.contains(e.target as Node)) close(false);
  });

  // Kod yang set input tersembunyi (isi borang, URL) hantar `change`.
  hidden.addEventListener("change", () => {
    showError("");
    text.value = hidden.value;
  });
}

/** Hidupkan setiap TimePicker dalam `akar` (sekali sahaja setiap satu). Panggil selepas innerHTML. */
export function mountTimePickers(akar: ParentNode = document) {
  installMasks();
  akar.querySelectorAll<HTMLElement>("[data-timepicker]").forEach(pasang);
}
