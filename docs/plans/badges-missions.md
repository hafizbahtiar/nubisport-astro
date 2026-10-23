# Lencana dan misi Nubi

Tarikh: 2026-10-22
Status: v1 dibina (migration 039), belum deploy.

## Skop

- Dashboard `/account`: ringkasan aktiviti 8 minggu + lencana/misi.
- `/account/badges`: katalog penuh dan misi.
- Hanya ahli ke atas (`nubi/ahli`, `nubi/admin`, owner). Free 403.
- Tiada leaderboard, ranking, notifikasi atau kongsi awam.
- Lencana disimpan; misi dikira semula.

## Sumber data

| Sumber | Digunakan untuk |
|---|---|
| `nubi_activities` | 5K/10K, streak 4 minggu, 50 km sebulan, misi mingguan/bulanan |
| `nubi_rsvps.attended_at` | 10 larian kumpulan (kehadiran sebenar, bukan RSVP) |
| `app_items` kind `plan` | Lencana pelan siap (proof pelan dari browser) |

Hanya `run` dan `walk` dikira untuk lencana/misi. Hike/ride kekal di halaman Aktiviti.

## Katalog v1

| ID | Syarat |
|---|---|
| `first_5k` | Satu aktiviti run/walk >= 5,000 m |
| `first_10k` | Satu aktiviti run >= 10,000 m |
| `four_week_streak` | Run/walk dalam 4 minggu Malaysia berturut-turut |
| `ten_attended` | 10 kehadiran sebenar |
| `monthly_50k` | 50 km run/walk dalam satu bulan Malaysia |
| `plan_finished` | Semua sesi satu pelan awan siap |

Misi semasa:

- `weekly_3_runs`: 3 aktiviti run/walk minggu ini.
- `monthly_50k`: 50 km run/walk bulan ini.

Minggu = Isnin-Ahad, waktu Malaysia. Bulan = kalendar Malaysia.

## Storan

`nubi_badges` (migration 039):

```sql
user_id, badge_id, earned_at
PRIMARY KEY (user_id, badge_id)
```

- `INSERT OR IGNORE`, jadi awarding idempotent.
- Lencana kekal selepas aktiviti dipadam.
- Padam akaun = cascade.
- Tiada `seen_at`; penanda "Baru" guna `newlyEarned` dari POST evaluate.

## API

- `GET /me/apps/nubi/badges` - state + misi.
- `POST /me/apps/nubi/badges/evaluate` - award dari sumber server; body `{ plan?: { key, done, total } }`.
- `Cache-Control: no-store`; member gate; owner lulus.
- Plan proof disemak terhadap `app_items` milik user dan `progress.length === done`; `total` datang dari enjin pelan browser (bukan bukti kriptografi). Ini lencana motivasi, bukan keselamatan.

## UI

- Dashboard: panel "Aktiviti 8 minggu" (KPI, bar jarak mingguan, 3 aktiviti terbaru) dan "Lencana & misi" (3 lencana terbaru + 2 misi).
- `/account/badges`: grid 6 lencana, status dapat/belum, tarikh, misi.
- Sidebar "Latihan" -> Lencana (`members: true`).
- Guna `.panel`, `.stat`, `.beban`, `.lencana`, token warna sedia ada; tiada chart library.

## Semakan

- Backend: `bun scripts/verify-nubi-badges.ts`.
- Frontend: `bun scripts/check-activity-summary.ts`, `bun scripts/check-badges.ts`.
- Manual: free 403, badge kekal selepas aktiviti dipadam, plan proof cross-user ditolak, misi betul pada sempadan minggu/bulan Malaysia.

## Keputusan yang menggantikan plan lama

`IDEA.md` dan TODO backend lama menyebut "tiada jadual baru" untuk lencana. Owner memilih jadual D1 baru; `nubi_badges` menggantikan cadangan `app_items` kind `lencana`.
