# Test Credentials - SiagaSekitar (MongoDB)

## Admin (SSO)
- Email: `admin@sso.local`
- Password: `Admin12345!`

## Users (dummy)
- Bupati Magetan — `bupatimagetan@userbupati.com` / `bupatimagetan`
- Kepala Dinas Kebudayaan dan Pariwisata Provinsi Jawa Timur — `kepala.dinas.pariwisata.jatim@userpariwisata.com` / `pariwisatajatim`
- Kepala Dinas Pendidikan Provinsi Jawa Timur — `kepala.dinas.pendidikan.jatim@userpendidikan.com` / `pendidikanjatim`

## Notes
- DATABASE: **MongoDB** (migrated from PostgreSQL). MONGO_URL + DB_NAME in /app/.env.
- DB access layer: Prisma-compatible shim at /app/lib/prisma.js (backed by MongoDB driver).
- Reseed / reset data: `cd /app && node scripts/mongo_seed.js` (empties all data except admin SSO, re-adds 8 categories + 3 dummy users).
- Admin reset-password sets a user's password to default `12345678`.
