# Pembantu AI - frontend, fasa 2 (kunci API sendiri / BYOK)

Status: **dirancang** (2026-10-23), bina bila ahli minta. Perlu fasa 1 (`frontend-platform.md`) siap dulu.
Fail utama pelan: **`hono-workers/docs/plans/ai/README.md`**. Separuh backend:
`hono-workers/docs/plans/ai/backend-byok.md`.

## Tujuan

Ahli boleh guna kunci API sendiri - **Claude (Anthropic), OpenAI, OpenRouter atau Command Code** - supaya chat
berjalan atas bil dia, tanpa kuota bulanan platform. Chat, tool dan kad Sahkan dari fasa 1 **tak berubah**.

## Keputusan

- Satu kunci setiap ahli. Tukar penyedia = ganti kunci lama.
- Model = teks bebas dengan nilai lalai setiap penyedia (dari backend `GET /me/ai/key` -> `providers`).
- Kunci **tak pernah** dipapar semula - selepas simpan, hanya "Claude · sk-ant-…a1b2".

## Tempat: bahagian "Kunci AI sendiri" dalam `/account/ai`

Tiada page baru - satu `<details>` "Guna kunci API sendiri" di bawah chat (tertutup secara lalai):

- **Tiada kunci**: pilih penyedia (`ChipGroup`: Claude, OpenAI, OpenRouter, Command Code), medan kunci
  (`type="password"`, `autocomplete="off"`, `spellcheck="false"`), medan model (diisi nilai lalai penyedia),
  pautan "Di mana nak dapat kunci?" ke laman kunci rasmi penyedia (`rel="noopener"`), butang **Simpan**.
- **Ada kunci**: baris "Claude · …a1b2 · model claude-sonnet-5-5 · digunakan 2 jam lepas", butang **Tukar**
  dan **Padam** (ConfirmDialog).
- Baris kuota tukar ke "Guna kunci anda - had 200 sehari" bila kunci ada.

## Aliran

1. Simpan -> `PUT /me/ai/key { provider, apiKey, model }`. Butang `disabled` + "Menyemak kunci…" (backend uji
   kunci dengan penyedia, sampai 10 s).
2. Selepas respons (berjaya atau gagal): **kosongkan medan kunci** (`input.value = ""`) - kunci tak kekal dalam
   DOM, borang atau memori page.
3. Ralat -> mesej Melayu:
   - 400 `ai_key_rejected`: "Kunci ditolak oleh penyedia - semak kunci dan cuba lagi."
   - 503 `ai_key_unchecked`: "Penyedia tak menjawab - kunci tak disimpan. Cuba lagi sekejap."
   - 503 `byok_off`: "Kunci sendiri belum dibuka."
   - 400 lain: "Format kunci tak sah untuk penyedia ini."
4. Dalam chat, 409 `ai_key_invalid` -> "Kunci anda dah tak berfungsi (tamat / dibatalkan / baki habis).
   Kemas kini di bawah." + buka `<details>`. **Tiada** jatuh balik senyap ke AI platform.

## Keselamatan frontend

- Kunci hanya dihantar dalam badan `PUT` (HTTPS, sama origin, kuki sesi). Tak pernah ke localStorage,
  sessionStorage, URL, log konsol atau analitik.
- `type="password"` + `autocomplete="off"`: pengurus kata laluan tak cadang simpan kunci sebagai kata laluan laman.
- Tiada medan URL / base URL - penyedia ialah senarai tetap.
- Teks ralat backend tak dipapar mentah (mungkin mengandungi butiran penyedia).
- `/privacy`: bila guna kunci sendiri, data chat pergi terus ke penyedia pilihan anda (bukan Command Code),
  kunci disimpan bersulit dan boleh dipadam bila-bila masa; `/terms`: kos dan terma penyedia tanggungan ahli.

## Semakan

- `scripts/check-ai-key-form.ts` (corak `ok()`): pemetaan kod ralat -> mesej; medan kunci dikosongkan selepas
  simpan (berjaya dan gagal); payload `PUT` hanya `provider`, `apiKey`, `model`.
- Ujian pelayar (API mock): simpan / tukar / padam; 409 dalam chat buka bahagian kunci; nilai kunci tiada
  dalam `document.documentElement.outerHTML` selepas simpan; 360/1280 px; tiada ralat CSP.
- astro-check + `bun run build`.

## Susunan bina

1. Bahagian kunci (simpan / padam / papar hujung kunci).
2. Baris kuota ikut sumber (platform vs kunci sendiri) + ralat 409 dalam chat.
3. `/privacy`, `/terms`, README, TODO.
