// /races/<id>.ics - satu acara lumba sebagai fail kalendar (statik, dibina dari src/data/races.ts).
import type { APIRoute, GetStaticPaths } from "astro";
import { RACES, type Race } from "../../data/races";
import { buildIcs } from "../../lib/ics";

export const getStaticPaths = (() => RACES.map((l) => ({ params: { id: l.id }, props: { l } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const l = (props as { l: Race }).l;
  const ics = buildIcs(
    [
      {
        uid: `lumba-${l.id}`,
        mula: new Date(`${l.tarikh}T${l.mula}:00+08:00`),
        minit: 240, // ponytail: tempoh tetap 4 jam - penganjur tidak beri masa tamat yang seragam
        tajuk: l.nama,
        keterangan: `${l.jarak.join(" / ")} · ${l.tempat}, ${l.negeri}\n${l.pautan}`,
      },
    ],
    { nama: l.nama },
  );
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
