# Kunjus — Kas Kunjungan Industri

Vanilla HTML + Supabase + Vercel Serverless (`/api`).

## Struktur

```
├── index.html / forgot-password.html / reset-password.html
├── src/
│   ├── main.js              # orkestrator: login, tab, events
│   ├── pages/               # logika per halaman
│   │   ├── dashboard.js
│   │   ├── siswa.js
│   │   ├── bayar.js
│   │   ├── riwayat.js
│   │   └── laporan.js
│   ├── services/            # akses data + state
│   │   ├── auth.js
│   │   ├── db.js
│   │   └── store.js
│   └── lib/                 # client + UI murni
│       ├── supabase-client.js (anon key, aman public)
│       ├── ui.js
│       └── export.js
├── api/
│   ├── _lib/supabase.js     # service_role, server only
│   ├── forgot-password.js
│   └── reset-password.js
├── server.js                # dev lokal saja
└── vercel.json
```

## Env

Lihat `.env.example`. Set di Vercel: Settings → Environment Variables
(`Production`), lalu Redeploy.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`
  → server only, jangan taruh di frontend.
- `SUPABASE_ANON_KEY` → hanya di `src/lib/supabase-client.js`.
- `APP_URL` → `https://kunjus.vercel.app` di production.

## Dev lokal

```sh
npm i
node server.js
# http://localhost:3000
```
