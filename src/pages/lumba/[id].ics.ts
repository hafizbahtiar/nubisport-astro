// /lumba/<id>.ics - satu acara lumba sebagai fail kalendar (statik, dibina dari src/data/lumba.ts).
import type { APIRoute, GetStaticPaths } from "astro";
import { LUMBA, type Lumba } from "../../data/lumba";
import { buatIcs } from "../../lib/ics";

export const getStaticPaths = (() => LUMBA.map((l) => ({ params: { id: l.id }, props: { l } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const l = (props as { l: Lumba }).l;
  const ics = buatIcs(
    [
      {
        uid: `lumba-${l.id}`,
        mula: new Date(`${l.tarikh}T${l.mula}:00+08:00`),
        minit: 240, // ponytail: tempoh tetap 4 jam - penganjur tak beri masa tamat yang seragam
        tajuk: l.nama,
        keterangan: `${l.jarak.join(" / ")} · ${l.tempat}, ${l.negeri}\n${l.pautan}`,
      },
    ],
    { nama: l.nama },
  );
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
