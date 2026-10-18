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
  email: "", // e.g. hello@nubisport.com
};

// Kunci TAPAK Turnstile (awam - memang dipapar dalam HTML), widget yang sama dengan portfolio.
// Hostname nubisport.hafizbahtiar.com mesti ditambah pada widget ini di dashboard Cloudflare,
// dan pada TURNSTILE_HOSTNAMES backend - jika tidak, login production gagal "captcha".
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFD-PSk_u7NHAF-5";

// Pelan awam (/pelan-5k): storan pelayar + manfaat akaun. Akaun = lib/awan.ts (3 slot dari backend);
// tukar teks ini bila had berubah (docs/plans/simpan-awan.md).
export const NOTA_AWAN = "Akaun percuma boleh simpan sehingga 3 pelan ke awan supaya ikut ke peranti lain.";
