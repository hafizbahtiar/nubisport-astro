// Panggil backend hono-workers. /api/* ialah same-origin (service binding dalam wrangler.jsonc),
// jadi cookie login (httpOnly, dari backend) ikut sendiri - tiada CORS, tiada token dalam JS.
// 401 -> satu /auth/refresh (dikongsi) + satu cubaan semula. Jangan panggil refresh selari:
// refresh token berputar, panggilan kedua akan gagal.

export interface Saya {
  id: number;
  name: string;
  email: string;
  role: string;
  apps: Record<string, string>; // { nubi: "admin" } - diurus owner di portfolio /admin/app-access
}

let refreshing: Promise<boolean> | null = null;
const refresh = () =>
(refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST" })
  .then((r) => r.ok)
  .catch(() => false)
  .finally(() => (refreshing = null)));

const TANPA_REFRESH = new Set(["/auth/login", "/auth/refresh"]);

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const go = () =>
    fetch(`/api/v1${path}`, {
      ...init,
      // JSON hanya untuk badan teks - FormData perlu pelayar tetapkan boundary multipart sendiri.
      headers: typeof init.body === "string" ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  const res = await go();
  if (res.status === 401 && !TANPA_REFRESH.has(path) && (await refresh())) return go();
  return res;
}

/** Badan JSON respons, atau {} jika bukan JSON (contoh ralat proxy). */
export const json = (res: Response): Promise<Record<string, any>> => res.json().catch(() => ({}));

// Salinan /me dalam sessionStorage (per tab): AccountLayout lukis nama/e-mel serta-merta pada setiap
// page (tiada kelip "…"), dan /me dipanggil semula hanya bila salinan lebih tua dari SEGAR_MS.
// ponytail: peranan/nama yang berubah di tempat lain lambat sampai 5 min; data pelan memang setempat
// dan setiap tulis ke API tetap disemak backend (401 -> refresh/login).
export const KUNCI_SAYA = "nubi:saya";
const SEGAR_MS = 5 * 60_000;
const adaSesi = () => /(?:^|; )session_active=1/.test(document.cookie);

export function ingatSaya(s: Saya | null) {
  try {
    if (s) sessionStorage.setItem(KUNCI_SAYA, JSON.stringify({ t: Date.now(), s }));
    else sessionStorage.removeItem(KUNCI_SAYA);
  } catch {
    /* mod peribadi */
  }
}

function salinanSaya(): Saya | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KUNCI_SAYA) ?? "null");
    return v && Date.now() - v.t < SEGAR_MS ? (v.s as Saya) : null;
  } catch {
    return null;
  }
}

/** Pengguna semasa dari /me (salinan dikemas kini), atau null jika tidak log masuk. */
export async function saya(): Promise<Saya | null> {
  if (!adaSesi()) return ingatSaya(null), null;
  const res = await api("/me");
  const s = res.ok ? ((await json(res)).data as Saya) : null;
  ingatSaya(s);
  return s;
}

// Satu /me bagi setiap page (atau tiada, jika salinan masih segar): AccountLayout dan page di
// dalamnya kongsi promise yang sama - dua panggilan selari boleh mencetuskan dua refresh.
let sesi: Promise<Saya | null> | null = null;
export const sesiSaya = () =>
  (sesi ??= adaSesi() && salinanSaya() ? Promise.resolve(salinanSaya()) : saya().catch(() => null));

// Turnstile (skrip dimuat oleh page). Token sekali guna - reset() selepas setiap hantaran.
const ts = () =>
  (window as any).turnstile as { getResponse(): string | undefined; reset(): void } | undefined;
export const captcha = () => ts()?.getResponse() || undefined;
export const resetCaptcha = () => ts()?.reset();

/** Ralat biasa dalam Bahasa Melayu - jangan papar teks backend. null = tiada padanan. */
export const ralatAm = (status: number, body: Record<string, any>): string | null => {
  if (String(body.error ?? "").toLowerCase().includes("captcha"))
    return "Semakan spam gagal. Muat semula page dan cuba lagi.";
  if (status === 429) return "Terlalu banyak cubaan. Tunggu sebentar dan cuba lagi.";
  return null;
};

/** Hantar semula pautan pengesahan (pautan ke /verify Nubi). Pulang mesej ralat, atau null jika berjaya. */
export async function hantarSemula(email: string): Promise<string | null> {
  try {
    const res = await api("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email, app: "nubi", captchaToken: captcha() }),
    });
    if (res.ok) return null;
    const body = await json(res);
    return ralatAm(res.status, body) ?? (res.status === 400 ? "E-mel tidak sah." : "Tak dapat hantar sekarang. Cuba sebentar lagi.");
  } catch {
    return "Tiada sambungan. Semak internet anda dan cuba lagi.";
  } finally {
    resetCaptcha();
  }
}
