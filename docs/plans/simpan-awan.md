# Pelan: langganan Simpan Awan (Nubi Sport)

Status: **peringkat percuma siap** (2026-10-18) - langganan belum. Akaun percuma: 3 slot awan.

## Yang sudah dibina (peringkat percuma)

- Backend: jadual generik `app_items` (migration 029 hono-workers), `GET/PUT/DELETE
  /me/apps/nubi/plan[/:kunci]`, had dari `QUOTA` (`services/app-items.ts`), `?replace=` tukar atomik.
  Bukan `nubi_plans`: app/jenis lain = satu entri `QUOTA`, bukan jadual baru.
- Frontend: `lib/awan.ts` (senarai, simpan, keluarkan, segerak tanda siap dikumpul 1.5 s,
  tertunda bila luar talian, `VERSI_ENJIN`), lencana Awan / Peranti ini, meter slot + mod "Ganti"
  di dashboard, butang di page pelan. Pelayar kekal salinan kerja.
- **Untuk langganan nanti**: hanya `quotaFor` di backend berubah (baca hak langganan). Route, jadual,
  `limit` dalam respons dan UI frontend kekal. Turun had = item sedia ada kekal, cuma kunci baru ditolak.
- Belum: MAF (`maf:terakhir`) ke awan - `QUOTA.nubi.settings` bila perlu.

## Masalah

Pelan 5K, tanda siap dan had MAF kini disimpan dalam `localStorage` (`lib/pelan-tersimpan.ts`,
`maf:terakhir`). Ia hilang bila data pelayar dikosongkan, dalam mod peribadi, dan tak ikut pengguna ke
peranti lain. Dashboard dan pelan memaparkan penafian (`NOTA_AWAN` dalam `src/data/site.ts`).

## Peringkat

| Peringkat | Storan | Harga |
| --- | --- | --- |
| Awam (tanpa akaun) | pelayar, had 3 pelan | percuma |
| Akaun percuma | pelayar tanpa had + **3 pelan di awan** | percuma |
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

1. `lib/pelan-tersimpan.ts` jadi satu-satunya pintu storan: bila `entitlements` ada `nubi.cloud`,
   tulis ke localStorage **dan** hantar ke API (cuba semula senyap bila luar talian); bila tiada,
   localStorage sahaja seperti sekarang.
2. Kali pertama melanggan: muat naik semua pelan tempatan (gabung ikut kunci, `siap` = kesatuan set).
3. Dashboard: lencana "Disegerak" / "Pelayar ini sahaja", dan butang "Langgan Simpan Awan" ganti
   `NOTA_AWAN`.
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
- Patutkah pengguna percuma dapat segerak terhad (contoh 1 pelan)?

## Susunan kerja

1. Backend jadual + endpoint pelan (di belakang hak, owner sahaja dulu) dan segerak di frontend.
2. Uji segerak dua peranti tanpa bayaran (hak diberi manual).
3. Pembekal bayaran + webhook + halaman langganan.
4. Terma / privasi, kemudian buka kepada umum.
