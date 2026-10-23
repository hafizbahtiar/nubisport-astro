// Panggil backend hono-workers. /api/* ialah same-origin (service binding dalam wrangler.jsonc),
// jadi cookie login (httpOnly, dari backend) ikut sendiri - tiada CORS, tiada token dalam JS.
// 401 -> satu /auth/refresh (dikongsi) + satu cubaan semula. Jangan panggil refresh selari:
// refresh token berputar, panggilan kedua akan gagal.

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  apps: Record<string, string>; // { nubi: "admin" } - diurus owner di portfolio /admin/app-access
  telegram?: { linkedAt: string | null }; // null = belum paut / sudah nyahpaut
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

/**
 * `?next=` selepas log masuk: laluan dalam laman ini saja, selain itu `/account`. Dinilai dengan URL (bukan
 * regex) sebab pelayar buang tab/baris baru - "/\t/evil.com" jadi "//evil.com".
 */
export function internalPath(next: string | null, origin: string): string {
  try {
    const u = new URL(next || "/account", origin);
    return u.origin === origin ? u.pathname + u.search + u.hash : "/account";
  } catch {
    return "/account"; // contoh "http://[" - URL tak sah
  }
}

/** Badan JSON respons, atau {} jika bukan JSON (contoh ralat proxy). */
export const json = (res: Response): Promise<Record<string, any>> => res.json().catch(() => ({}));

// Salinan /me dalam sessionStorage (per tab) HANYA untuk lukisan pertama (nama/e-mel serta-merta).
// currentUser() sentiasa mengambil /me baharu supaya perubahan peranan app (contoh admin jadikan ahli)
// berkesan pada reload - jangan pulangkan salinan cache untuk peranan.
export const ME_CACHE_KEY = "nubi:saya";
const adaSesi = () => /(?:^|; )session_active=1/.test(document.cookie);

export function cacheMe(s: CurrentUser | null) {
  try {
    if (s) sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ t: Date.now(), s }));
    else sessionStorage.removeItem(ME_CACHE_KEY);
  } catch {
    /* mod peribadi */
  }
}

/** Pengguna semasa dari /me (salinan dikemas kini), atau null jika tidak log masuk. */
export async function fetchMe(): Promise<CurrentUser | null> {
  if (!adaSesi()) return cacheMe(null), null;
  const res = await api("/me", { cache: "no-store" });
  const s = res.ok ? ((await json(res)).data as CurrentUser) : null;
  cacheMe(s);
  return s;
}

// Satu /me bagi setiap page load: AccountLayout dan page di dalamnya kongsi promise yang sama.
let sesi: Promise<CurrentUser | null> | null = null;
export const currentUser = () => (sesi ??= fetchMe().catch(() => null));

// Turnstile (skrip dimuat oleh page). Token sekali guna - reset() selepas setiap hantaran.
const ts = () =>
  (window as any).turnstile as { getResponse(): string | undefined; reset(): void } | undefined;
export const captcha = () => ts()?.getResponse() || undefined;
export const resetCaptcha = () => ts()?.reset();

/** Ralat biasa dalam Bahasa Melayu - jangan papar teks backend. null = tiada padanan. */
export const commonError = (status: number, body: Record<string, any>): string | null => {
  if (String(body.error ?? "").toLowerCase().includes("captcha"))
    return "Semakan spam gagal. Muat semula halaman dan cuba lagi.";
  if (status === 429) return "Terlalu banyak cubaan. Tunggu sekejap dan cuba lagi.";
  return null;
};

/** Hantar semula pautan pengesahan (pautan ke /verify Nubi). Pulang mesej ralat, atau null jika berjaya. */
export async function resendVerification(email: string): Promise<string | null> {
  try {
    const res = await api("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email, app: "nubi", captchaToken: captcha() }),
    });
    if (res.ok) return null;
    const body = await json(res);
    return commonError(res.status, body) ?? (res.status === 400 ? "E-mel tak sah." : "Tak dapat hantar sekarang. Cuba lagi sekejap.");
  } catch {
    return "Tiada sambungan. Semak internet anda dan cuba lagi.";
  } finally {
    resetCaptcha();
  }
}
