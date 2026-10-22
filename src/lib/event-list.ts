// Kad larian untuk ahli (components/EventList.astro). Sel teks pengguna = textContent (selamat).
import { api } from "./api";
import {
  EVENTS,
  closed,
  downloadEventIcs,
  eventError,
  full,
  mapsUrl,
  rsvpText,
  started,
  whenText,
  type Acara,
} from "./events";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, teks = "", kelas = "") => {
  const e = document.createElement(tag);
  e.textContent = teks;
  if (kelas) e.className = kelas;
  return e;
};
const butang = (teks: string, kelas: string, fn: () => void) => {
  const b = el("button", teks, `btn btn-sm ${kelas}`);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
};

/**
 * Isi senarai `id`. `ahli` = boleh RSVP. `selepas` dipanggil selepas RSVP berjaya (muat semula);
 * `ralat` papar mesej gagal.
 */
export function renderEventList(
  id: string,
  items: Acara[] | null,
  o: { ahli: boolean; selepas: () => void; ralat: (m: string) => void },
) {
  const ul = document.getElementById(id)!;
  if (!items) {
    ul.replaceChildren(el("li", "Tak dapat muat larian sekarang. Cuba lagi sekejap.", "acara-kosong muted"));
    return;
  }
  if (!items.length) {
    ul.replaceChildren(el("li", "Belum ada larian dijadualkan. Semak semula nanti.", "acara-kosong muted"));
    return;
  }
  const rsvp = async (a: Acara, b: HTMLButtonElement) => {
    b.disabled = true;
    const res = await api(`${EVENTS}/${a.id}/rsvp`, { method: a.mine ? "DELETE" : "PUT" }).catch(() => null);
    b.disabled = false;
    if (!res) return o.ralat("Tiada sambungan. Semak internet anda dan cuba lagi.");
    if (!res.ok) return o.ralat(await eventError(res));
    o.selepas();
  };
  ul.replaceChildren(
    ...items.map((a) => {
      const li = el("li", "", "acara-kad");
      if (a.mine) li.dataset.saya = "";
      const tajuk = el("h4");
      const pautan = el("a", a.title, "link");
      pautan.href = `/account/events/view?id=${a.id}`;
      tajuk.append(pautan);
      li.append(tajuk, el("p", whenText(a.startsAt), "acara-bila"));
      const lokasi = el("a", a.location, "link");
      lokasi.href = mapsUrl(a.location);
      lokasi.target = "_blank";
      lokasi.rel = "noopener noreferrer";
      const p = el("p");
      p.append("📍 ", lokasi);
      li.append(p);
      const butir = [a.distanceKm && `${a.distanceKm} km`, a.pace && `pace ${a.pace}`].filter(Boolean).join(" · ");
      if (butir) li.append(el("p", butir, "muted"));
      if (a.notes) li.append(el("p", a.notes, "acara-nota"));
      li.append(
        el(
          "p",
          `${rsvpText(a)} orang datang` +
          (a.mineAttended ? " · anda hadir ✓" : a.mine ? " · termasuk anda" : "") +
          (closed(a) ? " · selesai" : started(a) ? " · sedang berlangsung" : ""),
          "acara-kiraan",
        ),
      );
      const tindakan = el("div", "", "actions");
      if (full(a)) tindakan.append(el("span", "Penuh", "muted"));
      else if (o.ahli && !closed(a) && !a.mineAttended) {
        const b = butang(a.mine ? "Batal datang" : "Saya datang", a.mine ? "btn-outline" : "btn-primary", () =>
          rsvp(a, b),
        );
        tindakan.append(b);
      }
      if (!closed(a)) tindakan.append(butang("Tambah ke kalendar", "btn-outline", () => downloadEventIcs(a)));
      li.append(tindakan);
      return li;
    }),
  );
}
