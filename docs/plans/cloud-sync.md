# Pelan: langganan Simpan Awan (Nubi Sport)

Status: **peringkat percuma siap** (2026-10-18) - langganan belum. Had awan ikut peranan (1 / 5 / 10, 2026-10-22) di bawah.

## Yang dah dibina (peringkat percuma)

- Backend: jadual generik `app_items` (migration 029 hono-workers), `GET/PUT/DELETE
  /me/apps/nubi/plan[/:kunci]`, had dari `QUOTA` (`services/app-items.ts`), `?replace=` tukar atomik.
  Bukan `nubi_plans`: app/jenis lain = satu entri `QUOTA`, bukan jadual baru.
- Frontend: `lib/cloud-sync.ts` (senarai, simpan, keluarkan, segerak tanda siap dikumpul 1.5 s,
  tertunda bila luar talian, `ENGINE_VERSION`), lencana Awan / Peranti ini, meter slot + mod "Ganti"
  di Dashboard, butang di halaman pelan. Pelayar kekal salinan kerja.
- **Untuk langganan nanti**: hanya `quotaFor` di backend berubah (baca hak langganan). Route, jadual,
  `limit` dalam respons dan UI frontend kekal. Turun had = item sedia ada kekal, cuma kunci baru ditolak.
- Belum: MAF (`maf:terakhir`) ke awan - `QUOTA.nubi.settings` bila perlu.

## Had awan ikut peranan (owner, 2026-10-22) - dibina

| Siapa | Peranan (`user_app_roles`, app `nubi`) | Pelan di awan (`QUOTA.nubi.plan`) |
|---|---|---|
| Akaun percuma (bukan ahli) | tiada | **1** |
| Ahli | `ahli` | **5** |
| Admin | `admin` (+ owner / admin global - *panggilan saya*: owner tak patut lebih rendah dari admin app) | **10** |

`profil`, `consent`, `active` kekal 1 untuk semua. Pelayar (tanpa akaun) kekal had 3 (`GUEST_PLAN_LIMIT`) -
tak disentuh.

**Backend (hono-workers)**
- `quotaFor(app, kind)` jadi `quotaFor(app, kind, userId)` yang baca peranan app sekali
  (`appRolesOf`, `services/app-roles.ts`) - satu bacaan D1, hanya pada `GET` senarai dan `PUT` kunci baru.
  Bentuk: `QUOTA.nubi.plan = { free: 1, ahli: 5, admin: 10 }`; kind lain kekal nombor. Ini juga titik yang
  sama untuk langganan nanti (hak langganan = satu lagi baris dalam pemetaan).
- Route, jadual, `limit` dalam respons dan `409 quota_full` tak berubah. Tiada migration.
- **Data sedia ada tak dipadam**: akaun percuma yang kini ada 2-3 pelan simpan semuanya (baca, kemas kini,
  padam, tanda siap). Hanya kunci baru ditolak sampai bawah had - peraturan sedia ada "turun had".
  Ahli yang ditarik peranan = sama.
- `?replace=` ditolak (409, tiada yang dipadam) bila akaun masih lebih had selepas tukar - sebelum ini DELETE
  berlaku dulu dan INSERT gagal, jadi satu pelan hilang.
- Semakan: `scripts/verify-app-items.ts` - percuma 1 (kunci ke-2 = 409), ahli 5, admin 10, owner 10,
  akaun lebih had (3 pelan, had 1) masih boleh kemas kini + padam, `?replace=` masih berfungsi.

**Frontend (Nubi)**
- Meter slot di Dashboard baca `limit` dari respons; `items > limit` = nota "lebih had ... keluarkan N", tiada
  mod tukar (tak akan muat).
- Salin teks yang menyebut "3 pelan" ikut peranan: `Plan5k.astro` (2 tempat), `account/pricing.astro`
  (komen + senarai Percuma "1 pelan di awan", tier Ahli "5 pelan"), `description` halaman Harga, README.
- Mesej `quota_full` untuk bukan ahli: sebut ahli dapat 5 (tanpa butang bayar - ahli dilantik owner).

**Soalan terbuka "pengguna percuma dapat segerak terhad?"** = dijawab: ya, 1 pelan.

## Masalah

Pelan 5K, tanda siap dan had MAF kini disimpan dalam `localStorage` (`lib/saved-plans.ts`,
`maf:terakhir`). Ia hilang bila data pelayar dikosongkan, dalam mod peribadi, dan tak ikut pengguna ke
peranti lain. Dashboard dan pelan memaparkan penafian (`CLOUD_NOTE` dalam `src/data/site.ts`).

## Peringkat

| Peringkat | Storan | Harga |
| --- | --- | --- |
| Awam (tanpa akaun) | pelayar, had 3 pelan | percuma |
| Akaun percuma | pelayar tanpa had + **1 pelan di awan** (ahli 5, admin 10) | percuma |
| **Langganan Simpan Awan** | D1 (backend), segerak antara peranti | bulanan / tahunan - harga belum ditetapkan |

Prinsip: ciri latihan kekal percuma. Langganan hanya membayar storan dan segerak, jadi pengguna
percuma tak rugi apa-apa yang mereka ada hari ini.

## Backend (hono-workers) - repo berasingan, owner yang migrate remote

1. Migrasi `0xx_nubi_cloud.sql`:
   - `nubi_plans (id, user_id FK, kunci TEXT, params JSON, siap JSON, created_at, updated_at,
     UNIQUE(user_id, kunci))`. `kunci` sama dengan kunci localStorage (`pelan-5k:<bulan>-<tahap>-<masa>-<hari>`).
   - `nubi_settings (user_id PK, maf JSON, updated_at)`.
   - `subscriptions (id, user_id, app, status, provider, provider_ref, current_period_end, updated_at)`:
     `status` = `active | past_due | cancelled | expired`.
2. Hak (entitlement): `/me` pulangkan `entitlements: ["nubi.cloud"]` bila langganan aktif
   (`current_period_end > now`). Owner dan `apps.nubi = admin` boleh diberi percuma (kawal di backend).
3. Endpoint (semua `jwtAuth` + semak hak `nubi.cloud`; tiada hak = 402):
   - `GET /me/nubi/plans`, `PUT /me/nubi/plans/:kunci` (params + siap, last-write-wins ikut `updated_at`),
     `DELETE /me/nubi/plans/:kunci`, `GET/PUT /me/nubi/settings`.
   - Had saiz: ~50 pelan seorang, badan JSON kecil (validator zod strict).
4. Bayaran: `POST /me/nubi/checkout` (buat sesi bayaran, pulang URL), `POST /webhooks/<provider>`
   (sahkan tandatangan, kemas kini `subscriptions`, idempotent ikut id event), `POST /me/nubi/portal`
   (urus / batal).
5. Audit: perubahan langganan masuk `audit_logs`.

## Frontend (repo ini)

1. `lib/saved-plans.ts` jadi satu-satunya pintu storan: bila `entitlements` ada `nubi.cloud`,
   tulis ke localStorage **dan** hantar ke API (cuba semula senyap bila luar talian); bila tiada,
   localStorage saja seperti sekarang.
2. Kali pertama melanggan: muat naik semua pelan tempatan (gabung ikut kunci, `siap` = kesatuan set).
3. Dashboard: lencana "Disegerak" / "Pelayar ini saja", dan butang "Langgan Simpan Awan" ganti
   `CLOUD_NOTE`.
4. Halaman `/account/langganan`: status, tarikh pembaharuan, urus/batal (portal pembekal).
5. Tamat langganan: data awan kekal baca-sahaja 90 hari, kemudian dipadam (beritahu melalui e-mel).

## Pembekal bayaran - perlu keputusan owner

Calon untuk Malaysia: Stripe (kad + FPX, ada langganan berulang dan portal pelanggan), Billplz,
ToyyibPay, CHIP. Semak sendiri sokongan langganan berulang, yuran dan syarat pendaftaran perniagaan
sebelum memilih - jangan ikut ringkasan blog.

## Soalan terbuka

- Harga dan tempoh percubaan.
- Perlukah SSM / akaun perniagaan untuk pembekal yang dipilih?
- Dasar privasi dan terma: kemas kini sebelum mengambil bayaran (data latihan disimpan di pelayan).

## Susunan kerja

1. Backend jadual + endpoint pelan (di belakang hak, owner saja dulu) dan segerak di frontend.
2. Uji segerak dua peranti tanpa bayaran (hak diberi manual).
3. Pembekal bayaran + webhook + halaman langganan.
4. Terma / privasi, kemudian buka kepada umum.
