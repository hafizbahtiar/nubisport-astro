// Peta laluan statik (MapLibre + OpenFreeMap): feed ahli dan halaman aktiviti awam /a/<id>.
// MapLibre dimuat hanya bila peta pertama dilukis.
type MapLibre = typeof import("maplibre-gl");

let modul: Promise<MapLibre> | null = null;
const mapModule = () =>
(modul ??= Promise.all([
  import("maplibre-gl"),
  import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
  import("maplibre-gl/dist/maplibre-gl.css"),
]).then(([ml, pekerja]) => {
  ml.setWorkerUrl(pekerja.default);
  return ml;
}));

/** Lukis laluan [[lat, lon], ...] dalam `kotak`. Pulangkan peta (untuk remove()), atau null bila gagal. */
export async function drawRouteMap(kotak: HTMLElement, route: [number, number][]): Promise<{ remove(): void } | null> {
  try {
    const ml = await mapModule();
    const lonLat = route.map(([lat, lon]) => [lon, lat] as [number, number]);
    const lon = lonLat.map((p) => p[0]);
    const lat = lonLat.map((p) => p[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lon), Math.min(...lat)],
      [Math.max(...lon), Math.max(...lat)],
    ];
    kotak.replaceChildren();
    const map = new ml.Map({
      container: kotak,
      style: "https://tiles.openfreemap.org/styles/positron",
      bounds,
      fitBoundsOptions: { padding: 18 },
      interactive: false,
    });
    map.on("load", () => {
      const warna = getComputedStyle(document.documentElement);
      const oren = warna.getPropertyValue("--orange").trim() || "#ff5a1f";
      map.addSource("laluan", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: lonLat } },
      });
      map.addLayer({
        id: "laluan-tepi",
        type: "line",
        source: "laluan",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#fff", "line-width": 6 },
      });
      map.addLayer({
        id: "laluan",
        type: "line",
        source: "laluan",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": oren, "line-width": 3 },
      });
    });
    return map;
  } catch {
    kotak.textContent = "Peta tak dapat dimuatkan.";
    return null;
  }
}
