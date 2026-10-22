// Logik borang larian (components/EventForm.astro): isi dari larian sedia ada, semak, hantar
// POST (tambah) / PUT (ubah). Backend tetap menyemak semula (validator nubi-events).
import { api, json } from "./api";
import { EVENTS, eventError, fromMalaysiaParts, toMalaysiaParts, type Acara } from "./events";

const medan = (f: HTMLFormElement, n: string) => f.elements.namedItem(n) as HTMLInputElement;
const set = (f: HTMLFormElement, n: string, v: string) => {
  medan(f, n).value = v;
  medan(f, n).dispatchEvent(new Event("change")); // DatePicker / TimePicker ikut
};

export function fillEventForm(f: HTMLFormElement, a: Acara) {
  const [tarikh, jam] = toMalaysiaParts(a.startsAt);
  medan(f, "title").value = a.title;
  medan(f, "location").value = a.location;
  set(f, "tarikh", tarikh);
  set(f, "jam", jam);
  medan(f, "distanceKm").value = a.distanceKm == null ? "" : String(a.distanceKm);
  medan(f, "pace").value = a.pace ?? "";
  medan(f, "capacity").value = a.capacity == null ? "" : String(a.capacity);
  medan(f, "notes").value = a.notes ?? "";
}

/** `id` = ubah larian itu; tiada = tambah. `selepas` terima larian yang disimpan (dari backend). */
export function mountEventForm(f: HTMLFormElement, o: { id?: number; selepas: (a: Acara) => void }) {
  const ralat = document.getElementById(`${f.id}-ralat`)!;
  const papar = (m: string | null) => {
    ralat.textContent = m ?? "";
    ralat.hidden = !m;
  };
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (n: string) => medan(f, n).value.trim();
    const [tarikh, jam, title, lokasi, km, had] = ["tarikh", "jam", "title", "location", "distanceKm", "capacity"].map(v);
    const salah = !title
      ? "Masukkan tajuk."
      : !lokasi
        ? "Masukkan lokasi."
        : !/^\d{4}-\d{2}-\d{2}$/.test(tarikh) || !/^\d{2}:\d{2}$/.test(jam)
          ? "Pilih tarikh dan masa mula."
          : had && !(Number.isInteger(Number(had)) && Number(had) >= 1)
            ? "Had peserta mesti nombor bulat 1 atau lebih."
            : null;
    papar(salah);
    if (salah) return;
    const b = f.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    b.disabled = true;
    try {
      const res = await api(o.id ? `${EVENTS}/${o.id}` : EVENTS, {
        method: o.id ? "PUT" : "POST",
        body: JSON.stringify({
          title,
          startsAt: fromMalaysiaParts(tarikh, jam),
          location: lokasi,
          distanceKm: km ? Number(km) : null,
          pace: v("pace") || null,
          notes: v("notes") || null,
          capacity: had ? Number(had) : null,
        }),
      });
      if (!res.ok) return papar(await eventError(res));
      o.selepas((await json(res)).data as Acara);
    } catch {
      papar("Tiada sambungan. Semak internet anda dan cuba lagi.");
    } finally {
      b.disabled = false;
    }
  });
}
