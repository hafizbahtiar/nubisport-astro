// bun scripts/check-activity-file.ts - fail Strava -> ringkasan (src/lib/activity-file.ts).
// FIT dijana di sini dengan Encoder SDK Garmin (koordinat rekaan di tengah laut, 0°N 0°E) - tiada
// fail larian sebenar dalam repo. Nilai meniru larian contoh owner: 2,663 m, 1,876 s, nadi purata 140 / maks 164.
import { Encoder, Profile } from "@garmin/fitsdk";
import { readGpx, buildUploadForm, fitData, fitRoute, fitRecords, trackOf, trackAt, heartSeries, altitudeSeries, hrZones, nameFromFile, paceFromDistance, pairFiles, isoSeconds, toSport, formatDuration } from "../src/lib/activity-file";

let gagal = 0;
const ok = (c: unknown, msg: string) => {
  if (!c) {
    gagal++;
    console.error("GAGAL:", msg);
  }
};

const MULA = new Date("2026-10-21T13:12:07Z");
// kadens = rpm satu kaki (langkah/min = x2); `kadens` per rekod, undefined = tiada medan kadens.
function fit(kadens: (i: number) => number | undefined = () => undefined, laju: (i: number) => number | undefined = () => undefined): Uint8Array<ArrayBuffer> {
  const e = new Encoder();
  const N = Profile.MesgNum;
  e.onMesg(N.FILE_ID, { type: "activity", manufacturer: "strava", timeCreated: MULA } as any);
  // nadi naik 116 -> 164 (purata 140); ketinggian 46/47 berselang = 41 kenaikan 1 m (resolusi FIT 0.2 m)
  for (let i = 0; i <= 82; i++) {
    e.onMesg(N.RECORD, {
      timestamp: new Date(MULA.getTime() + i * 1000),
      heartRate: 116 + Math.round((i * 48) / 82),
      enhancedAltitude: 46 + (i % 2),
      distance: i * 32,
      ...(kadens(i) === undefined ? {} : { cadence: kadens(i) }),
      ...(laju(i) === undefined ? {} : { enhancedSpeed: laju(i) }),
      // ~0.001° setiap titik; titik 0 tiada GPS (treadmill / isyarat hilang) - mesti dilangkau
      ...(i ? { positionLat: Math.round(i * 0.001 * 2 ** 31 / 180), positionLong: 0 } : {}),
    } as any);
  }
  e.onMesg(N.SESSION, {
    timestamp: new Date(MULA.getTime() + 1896_000), startTime: MULA, sport: "running",
    totalDistance: 2663.11, totalTimerTime: 1876.213, totalElapsedTime: 1895.781,
  } as any);
  e.onMesg(N.WEATHER_CONDITIONS, {
    timestamp: MULA,
    temperature: 31,
    temperatureFeelsLike: 35,
    relativeHumidity: 78,
    windSpeed: 2.5,
    windDirection: 90,
  } as any);
  return e.close() as Uint8Array<ArrayBuffer>;
}
const gpx = (masa: string, nama = "Night Run") =>
  `<?xml version="1.0"?><gpx creator="StravaGPX"><trk><name>${nama}</name><type>running</type><trkseg>` +
  `<trkpt lat="0" lon="0"><ele>1</ele><time>${masa}</time></trkpt></trkseg></trk></gpx>`;
const fail = (bait: BlobPart, nama: string) => new File([bait], nama);

// FIT sahaja
{
  const { aktiviti, gagal: g } = await pairFiles([fail(fit(), "Night_Run.fit")]);
  const r = aktiviti[0]?.ringkasan;
  ok(aktiviti.length === 1 && g.length === 0, "satu FIT = satu aktiviti");
  ok(r?.startedAt === "2026-10-21T13:12:07Z", `masa mula ${r?.startedAt}`);
  ok(r?.sport === "run", "sukan");
  ok(r?.distanceM === 2663.11, `jarak ${r?.distanceM}`);
  ok(r?.movingS === 1876 && r?.elapsedS === 1896, `masa ${r?.movingS}/${r?.elapsedS}`);
  ok(r?.avgHr === 140 && r?.maxHr === 164, `nadi ${r?.avgHr}/${r?.maxHr}`);
  ok(r?.elevationGainM === 41, `ketinggian ${r?.elevationGainM}`);
  ok(r?.name === "Night Run", "nama dari nama fail");
  ok(aktiviti[0].gpx === null, "tiada GPX");
  ok(r?.runRatio === null, "tiada kadens = runRatio null");
  const track = trackOf(await fitRecords(fit().buffer));
  ok(track.length === 82, `track ${track.length} titik GPS`);
  ok(track[0]?.t === 0 && track.at(-1)?.t === 81, `masa track ${track[0]?.t}-${track.at(-1)?.t}`);
  ok(track[0]?.distanceM === 32 && track.at(-1)?.distanceM === 2624, "jarak track");
  const tengah = trackAt(track, 40.5);
  ok(tengah?.index === 40 && Math.abs((tengah?.lat ?? 0) - 0.0415) < 1e-6, `interpolasi track ${tengah?.lat}`);
  ok(trackOf([]).length === 0 && trackAt([], 1) === null, "track kosong");

  const data = await fitData(fit().buffer);
  ok(data.records.length === 83, `fitData records ${data.records.length}`);
  ok(data.weather?.temperatureC === 31, `suhu ${data.weather?.temperatureC}`);
  ok(data.weather?.feelsLikeC === 35, `rasa ${data.weather?.feelsLikeC}`);
  ok(data.weather?.humidityPct === 78, `kelembapan ${data.weather?.humidityPct}`);
  ok(data.weather?.windSpeedMs === 2.5, `angin ${data.weather?.windSpeedMs}`);
  ok(data.weather?.windDirectionDeg === 90, `arah ${data.weather?.windDirectionDeg}`);
}

// runRatio: 85 rpm (~170 langkah/min) = lari, 55 rpm (~110) = jalan; rekod berhenti (laju 0) tak dikira.
{
  const nisbah = async (b: Uint8Array<ArrayBuffer>) => (await pairFiles([fail(b, "x.fit")])).aktiviti[0]?.ringkasan.runRatio;
  ok((await nisbah(fit(() => 85))) === 1, "semua lari = 1");
  ok((await nisbah(fit(() => 55))) === 0, "semua jalan = 0");
  // 82 selang 1 s: 0-60 lari, 61-81 jalan -> 61/82
  const separa = await nisbah(fit((i) => (i <= 60 ? 85 : 55)));
  ok(separa === Math.round((61 / 82) * 1000) / 1000, `lari separa ${separa}`);
  // berhenti di selang jalan (laju 0): hanya masa bergerak dikira -> 1
  ok((await nisbah(fit((i) => (i <= 60 ? 85 : 55), (i) => (i <= 60 ? 3 : 0)))) === 1, "berhenti tak dikira");
}

// FIT + GPX sepadan; GPX tanpa pasangan; fail rosak; jenis lain
{
  const { aktiviti, gagal: g } = await pairFiles([
    fail(gpx("2026-10-21T13:12:07Z", "Larian malam"), "a.gpx"),
    fail(fit(), "x.fit"),
    fail(gpx("2026-10-20T06:00:00Z"), "sesat.gpx"),
    fail(new Uint8Array(new ArrayBuffer(40)), "rosak.fit"),
    fail("hai", "nota.txt"),
  ]);
  ok(aktiviti.length === 1 && aktiviti[0].gpx?.name === "a.gpx", "GPX dipasangkan ikut masa mula");
  ok(aktiviti[0]?.ringkasan.name === "Larian malam", "nama dari GPX menang");
  ok(g.map((x) => x.fail).sort().join() === "nota.txt,rosak.fit,sesat.gpx", `gagal: ${g.map((x) => x.fail)}`);
  ok(g.find((x) => x.fail === "sesat.gpx")?.sebab.includes(".fit"), "GPX tanpa FIT minta .fit");

  // borang: GPX di-gzip, summary JSON, nama fail tetap (bukan nama pengguna)
  const b = await buildUploadForm(aktiviti[0]);
  const gz = new Uint8Array(await (b.get("gpx") as File).arrayBuffer());
  ok(gz[0] === 0x1f && gz[1] === 0x8b, "GPX di-gzip");
  ok((b.get("fit") as File).name === "aktiviti.fit", "nama fail FIT tetap");
  ok(JSON.parse(String(b.get("summary"))).startedAt === "2026-10-21T13:12:07Z", "summary");
}

ok(readGpx(gpx("2026-10-21T13:12:07.000Z")).startedAt === "2026-10-21T13:12:07Z", "GPX milisaat dibuang");
try {
  readGpx("<html></html>");
  ok(false, "bukan GPX patut ditolak");
} catch { }
ok(isoSeconds("bukan masa") === null, "saat rosak");
ok(toSport("cycling") === "ride" && toSport("swimming") === "other", "peta sukan");
ok(nameFromFile("Morning_Run.fit") === "Morning Run", "nama fail");
ok(paceFromDistance(2663.11, 1876) === "11:44 /km", `pace ${paceFromDistance(2663.11, 1876)}`);
ok(paceFromDistance(50, 100) === null, "pace jarak pendek");
ok(formatDuration(1876) === "31m 16s" && formatDuration(3700) === "1j 1m", "tempoh");

// Laluan untuk peta (page detail)
{
  const p = await fitRoute(fit().buffer);
  ok(p.length === 82, `titik laluan ${p.length}`);
  ok(Math.abs(p[0][0] - 0.001) < 1e-6 && p[0][1] === 0, `titik pertama ${p[0]}`);
  ok(Math.abs(p.at(-1)![0] - 0.082) < 1e-6, `titik akhir ${p.at(-1)}`);
}

// Ketinggian ikut jarak (profil ketinggian di page detail).
{
  const rekod = await fitRecords(fit().buffer);
  const siri = altitudeSeries(rekod);
  ok(siri.length === 83, `siri ketinggian ${siri.length}`);
  ok(siri[0][0] === 0 && siri[0][1] === 46, `ketinggian mula ${siri[0]}`);
  ok(siri.at(-1)![0] === 82 * 32, `jarak akhir ${siri.at(-1)}`);
  ok(altitudeSeries([{ distance: 0 }]).length === 0, "tiada altitude = kosong");
}

// Nadi untuk page detail: siri ikut masa + zon % nadi maks (164). Nadi 116 -> 164 sesaat:
// <=131 = Z3 (titik 0-26), 132-147 = Z4 (27-53), >=148 = Z5 (54-81); titik akhir tiada selang.
{
  const siri = heartSeries(await fitRecords(fit().buffer));
  ok(siri.length === 83 && siri[0][0] === 0 && siri[0][1] === 116 && siri[82][0] === 82, `siri nadi ${siri.length}`);
  const z = hrZones(siri, 164);
  const b = (n: number) => Math.round((n / 82) * 1000) / 1000;
  ok(z.join() === [0, 0, b(27), b(27), b(28)].join(), `zon ${z}`);
  ok(hrZones([], 164).join() === "0,0,0,0,0", "tiada nadi = zon kosong");
  ok(hrZones([[0, 200], [5, 200], [400, 200]], 164).join() === "0,0,0,0,1", "atas maks = Z5, jeda dihadkan 10 s");
}

if (gagal) {
  console.error(`\n${gagal} semakan gagal.`);
  throw new Error("semakan gagal");
}
console.log("check-activity-file: semua lulus.");
