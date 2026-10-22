// Site facts in one place. Contact links render only when filled in - never put
// a placeholder URL here; leave it "" until the real one exists.
export const SITE = {
  name: "Nubi Sport",
  tagline: "Running Community",
  established: 2026,
  description:
    "Nubi Sport ialah komuniti larian untuk pemula. Mula dari sifar, gerak bersama, tiada siapa ditinggalkan.",
};

export const CONTACT = {
  whatsapp: "", // e.g. https://chat.whatsapp.com/...
  instagram: "", // e.g. https://instagram.com/nubisport
  email: "hafiz@hafizbahtiar.com",
};

// Kunci TAPAK Turnstile (awam - memang dipapar dalam HTML), widget yang sama dengan portfolio.
// Hostname nubisport.hafizbahtiar.com mesti ditambah pada widget ini di dashboard Cloudflare,
// dan pada TURNSTILE_HOSTNAMES backend - jika tidak, login production gagal "captcha".
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFD-PSk_u7NHAF-5";

// Pelan awam (/plan-5k): storan pelayar + manfaat akaun. Akaun = lib/cloud-sync.ts (had dari backend
// QUOTA.nubi.plan: percuma 1, ahli 5, admin 10); tukar teks ini bila had berubah (docs/plans/cloud-sync.md).
export const CLOUD_NOTE = "Akaun percuma boleh simpan 1 pelan ke awan (ahli 5) supaya ikut ke peranti lain.";
