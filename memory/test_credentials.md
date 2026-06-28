# Test Credentials - SiagaSekitar

## Admin (SSO)
- Email: `admin@sso.local`
- Password: `Admin12345!`

## User
- Email: `user1@test.com`
- Password: `User12345!`
- Email: `user2@test.com`
- Password: `User12345!`

## Notes
- Database: PostgreSQL + PostGIS (managed by supervisor as program `postgresql`)
- DB: `siagasekitar`, user `postgres`/`postgres`, port 5432
- Reseed: `cd /app && node prisma/seed.js`
