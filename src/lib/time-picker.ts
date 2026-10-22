// Medan masa standard (TimePicker.astro + HTML yang dijana skrip): dropdown jam (00-23) + minit
// (langkah `step`), 24 jam - sama di semua pelayar, tidak seperti <input type="time"> (AM/PM ikut
// pelayar, langkah minit tak dikuatkuasa). Seperti DatePicker, nilai "HH:MM" ada dalam input
// tersembunyi yang membawa `id` + `name`: `.value` dibaca terus; set nilai + hantar `change` = dropdown ikut.
// Label: <Field label="..." for={`${id}-jam`}>.
// Semak: bun scripts/check-time-picker.ts

const dua = (n: number) => String(n).padStart(2, "0");

/** "HH:MM" dibundarkan ke bawah ikut `step` minit; nilai tak sah = null. */
export function snapTime(v: string, step = 5): [number, number] | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return [+m[1], +m[2] - (+m[2] % step)];
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function timePickerHtml(o: { id: string; name?: string; value?: string; step?: number }): string {
  const step = o.step ?? 5;
  const [h, m] = snapTime(o.value ?? "", step) ?? [7, 0];
  const pilih = (n: number, sel: number) => `<option value="${dua(n)}"${n === sel ? " selected" : ""}>${dua(n)}</option>`;
  const id = esc(o.id);
  return (
    `<div class="tp" data-timepicker>` +
    `<input type="hidden" id="${id}"${o.name ? ` name="${esc(o.name)}"` : ""} value="${dua(h)}:${dua(m)}" />` +
    `<select class="input tp-jam" id="${id}-jam" aria-label="Jam">${Array.from({ length: 24 }, (_, i) => pilih(i, h)).join("")}</select>` +
    `<span class="tp-titik" aria-hidden="true">:</span>` +
    `<select class="input tp-minit" aria-label="Minit">${Array.from({ length: 60 / step }, (_, i) => pilih(i * step, m)).join("")}</select>` +
    `</div>`
  );
}

/** Hidupkan setiap TimePicker dalam `akar` (sekali sahaja setiap satu). Panggil selepas innerHTML. */
export function mountTimePickers(akar: ParentNode = document) {
  akar.querySelectorAll<HTMLElement>("[data-timepicker]:not([data-sedia])").forEach((tp) => {
    tp.dataset.sedia = "";
    const hidden = tp.querySelector<HTMLInputElement>('input[type="hidden"]')!;
    const [jam, minit] = tp.querySelectorAll("select");
    const step = 60 / minit.options.length;
    const ikut = () => {
      const t = snapTime(hidden.value, step);
      if (!t) return;
      jam.value = dua(t[0]);
      minit.value = dua(t[1]);
    };
    const tulis = () => {
      hidden.value = `${jam.value}:${minit.value}`;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    };
    hidden.addEventListener("change", ikut);
    jam.addEventListener("change", tulis);
    minit.addEventListener("change", tulis);
  });
}
