# Pembantu AI - frontend, fasa 1 (AI platform)

Status: **fasa 1b dibina** (2026-10-23): page, persetujuan, kuota dan tool baca. Tool tulis + kad Sahkan (fasa 1c) belum. Fail utama pelan (keputusan, seni bina, keselamatan):
**`hono-workers/docs/plans/ai/README.md`**. Separuh backend: `hono-workers/docs/plans/ai/backend-platform.md`.

## Tujuan

Ahli Nubi berbual dengan pembantu yang faham konteks dia (profil, pelan, larian, larian kumpulan) dan boleh
**cipta / ubah data dia sendiri sahaja** - dengan tap Sahkan untuk setiap perubahan.

## Keputusan yang mengikat page ini

- **Tool berjalan dalam pelayar ini**, guna `api()` (`lib/api.ts`) ke endpoint `/me/...` sedia ada dengan
  sesi ahli. Backend hanya bercakap dengan model. Jadi AI tak boleh buat lebih daripada UI biasa.
- Baca = jalan sendiri. Tulis = **kad Sahkan / Batal** dulu. **Tiada tool padam.**
- Ahli ke atas sahaja (`data-ahli`, sama macam Aktiviti); backend tetap semak peranan.
- Chat **tak disimpan** - dalam memori page saja. Muat semula = chat baru.

## Halaman `/account/ai` - "Pembantu AI"

- `src/pages/account/ai.astro`, `AccountLayout`, entri sidebar kumpulan **Latihan** (`members: true`, ikon
  sedia ada dalam `lib/icon.ts`). Tiada ikon/warna/butang baru - guna `.panel`, `.btn`, `Alert`, `.input`.
- Susunan:
  1. **Persetujuan** (kali pertama, bila `GET /me/apps/nubi/aiconsent` kosong): apa dihantar (data yang anda
     bincang - profil, pelan, larian, larian kumpulan) ke siapa (Command Code -> pembekal model), tak disimpan
     oleh Nubi, bukan nasihat perubatan. Butang "Setuju" -> `PUT /me/apps/nubi/aiconsent/ya` `{ engine: 1,
     data: {}, progress: [] }`. Pautan tarik balik di bawah chat (`DELETE` yang sama).
  2. **Chat**: senarai mesej (`role="log"`, `aria-live="polite"`), kotak teks (`textarea`, Enter hantar,
     Shift+Enter baris baru, had 2,000 aksara dengan kiraan), butang Hantar.
  3. **Baris kuota**: "12 / 100 bulan ini" dari respons chat (`quota`) atau `GET /me/apps/nubi/usage`.
- Contoh soalan (cip) bila chat kosong: "Minggu ini pelan saya apa?", "Ubah berat saya ke 68 kg",
  "Buat pelan 10K 12 minggu".

## Gelung chat - `src/lib/ai-chat.ts`

```
hantar(teks):
  mesej.push({ role: "user", content: teks })
  ulang (paling banyak 6 pusingan tool setiap soalan):
    r = POST /me/ai/chat { messages: 40 mesej terakhir }
    papar r.text (kalau ada)
    kalau r.toolCalls kosong -> habis
    mesej.push({ role: "assistant", content: r.text, toolCalls: r.toolCalls })
    untuk setiap panggilan: hasil = await jalankanTool(panggilan)   // baca terus; tulis = kad Sahkan
                            mesej.push({ role: "tool", toolCallId, content: JSON hasil (<= 8,000 aksara) })
```

- Setiap pusingan = 1 unit kuota (backend). Had 6 pusingan elak gelung tanpa henti.
- Ralat backend -> mesej Melayu, bukan teks backend: 403 `ai_consent_required` (tunjuk persetujuan semula),
  429 `ai_quota_full` ("Kuota AI bulan ini dah habis"), 429 kadar ("Tunggu sekejap"), 503 / 502 ("AI sibuk,
  cuba lagi"), tiada sambungan (`ConnectionNotice`).

## Tool - `src/lib/ai-tools.ts`

Setiap tool = fungsi nipis yang panggil lib sedia ada. Nama + skema datang dari backend; nama tak dikenali
atau argumen gagal semakan -> hasil `{ "ralat": "..." }` kepada model, tiada apa berjalan.

| Tool | Jenis | Panggil |
|---|---|---|
| `get_profile` | baca | `readProfile()` (`lib/profile.ts`) |
| `list_plans` | baca | `pullCloud()` + `savedPlans()` (`lib/plan-list.ts`) + pelan aktif |
| `get_plan` | baca | `describePlan(key)` + params + minggu siap |
| `list_activities` | baca | `GET /me/apps/nubi/activities?from=` - ringkasan sahaja (tarikh, km, masa, pace, nadi, % lari) |
| `list_events` | baca | `GET /me/apps/nubi/events` (akan datang + RSVP saya) |
| `update_profile` | tulis | `saveProfile({ ...semasa, ...ubah })` |
| `create_plan` | tulis | `savePlan()` baru (bawah) |
| `update_plan` | tulis | `savePlan()` dengan `key` sedia ada (kunci + rekod awan sama) |
| `set_active_plan` | tulis | `PUT /me/apps/nubi/active/plan` |
| `rsvp_event` / `cancel_rsvp` | tulis | `PUT` / `DELETE /me/apps/nubi/events/:id/rsvp` |

**Satu laluan simpan pelan**: logik simpan dalam `Plan5k.astro` / `DistancePlan.astro` (bina kunci ->
`writeList(CREATED_KEY)` -> `writeParams` -> `saveToCloud`) dipindah ke `src/lib/plan-save.ts`
(`savePlan(jenis, params, key?)`), dan **kedua-dua komponen + tool guna fungsi yang sama**. Validasi enjin
(`validateDistanceInput`, peraturan 5K) berjalan dalam `savePlan` - input tak sah = ralat, bukan pelan.
Kuota awan penuh (409 `quota_full`) = ralat kepada model + mesej kepada ahli.

**Data yang dihantar ke model** hanya apa tool pulangkan - bukan seluruh localStorage, tiada e-mel, tiada id
pengguna. `list_activities` tanpa koordinat laluan.

## Kad Sahkan (tool tulis)

- Satu kad setiap perubahan, dibina dari argumen **selepas** semakan: "Tukar berat: 70 → 68 kg", "Cipta pelan
  10K: 12 minggu, 4 hari, mula Isnin 3 Nov", "RSVP: Larian Ahad, Tasik Titiwangsa".
- Butang `Sahkan` / `Batal` (`.btn`); fokus ke `Sahkan`; Esc = Batal.
- Batal -> hasil tool `{ "dibatalkan": true }`. Gagal (409, 400, tiada sambungan) -> hasil `{ "ralat": "..." }`
  dan mesej kepada ahli.
- Lepas berjaya: pautan ke tempat data itu ("Lihat pelan", "Profil > Latihan").

## Keselamatan frontend

- Teks model **dipapar dengan `textContent`**. Kalau perlu format: subset kecil (perenggan, senarai `- `,
  **tebal**) dibina dengan `createElement`, tiada `innerHTML` daripada teks model, tiada pautan dari model.
- Teks pengguna lain dalam data (nama acara, tempat) sampai ke model sebagai data; kad Sahkan tunjuk nilai
  sebenar yang akan ditulis, bukan ayat model.
- Tiada sumber luar baru -> CSP (`scripts/security-headers.ts`) tak berubah.
- `/privacy`: bahagian AI (apa dihantar, ke siapa, tak disimpan, tarik balik). `/terms`: jawapan AI bukan
  nasihat perubatan/jurulatih.

## Semakan

- `scripts/check-ai-tools.ts` (corak `ok()`):
  - setiap tool tulis pulangkan **cadangan** (teks kad + fungsi `jalan`), bukan menulis terus
  - `update_profile` tolak medan/nilai luar `DATA_RULES` (sama julat dengan Profil > Latihan)
  - `create_plan` guna validasi enjin (jarak `__proto__`, minggu luar julat = ralat)
  - nama tool tak dikenali / argumen bukan JSON = ralat, tiada panggilan API
  - `list_activities` tiada koordinat
- `scripts/check-plan-save.ts`: `savePlan` menghasilkan kunci + params sama seperti borang pelan sekarang
  (5K + 10K/21K/42K), kemas kini kekal kunci sama.
- Ujian pelayar (API mock): persetujuan, baca, kad Sahkan/Batal, kuota penuh, 360/768/1280 px, tiada ralat CSP.
- astro-check + `bun run build`.

## Susunan bina

1. `lib/plan-save.ts` + pindah komponen pelan ke situ (tiada perubahan tingkah laku) + `check-plan-save`.
2. Page + persetujuan + chat dengan tool **baca** sahaja.
3. Tool tulis + kad Sahkan.
4. `/privacy`, `/terms`, sidebar, README "Apa ada", TODO.
