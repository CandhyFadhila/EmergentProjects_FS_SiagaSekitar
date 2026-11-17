# Siaga Sekitar V4 — VPS / GHCR deployment

Only the `Development-v4` branch builds and publishes app and migration images automatically. Pull requests build but do not publish.

Images published per successful push:
- `ghcr.io/candhyfadhila/emergentprojects_fs_siagasekitar:v4-<commit-sha>`
- `ghcr.io/candhyfadhila/emergentprojects_fs_siagasekitar:v4-migrate-<commit-sha>`

Deploy manually using the exact commit SHA from GitHub Actions. Do not build on the VPS.

1. Confirm PostgreSQL/PostGIS is healthy and back up data. Never run `docker compose down -v`.
2. Preserve the existing /opt/siagasekitar project directory and its `postgres_data` volume. Copy the Compose and Caddyfile templates into /opt/siagasekitar, backing up any existing files.
3. Preserve `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in the server's `.env`. Add `APP_IMAGE` and `MIGRATE_IMAGE` set to immutable commit tags.
4. Create permission-600 `app.env` only on VPS, with `DATABASE_URL=postgresql://USER:PASSWORD@db:5432/DB?schema=public`, `NEXTAUTH_URL=https://siagasekitar.tech`, and a strong random `NEXTAUTH_SECRET`. URL-encode any reserved characters in password.
5. `sudo docker compose config --quiet` then `sudo docker compose up -d db`.
6. `sudo docker compose --profile maintenance pull app migrate`, then `sudo docker compose --profile maintenance run --rm migrate`. Never execute the example seed in production; it includes sample passwords.
7. Configure domain DNS A record to VPS and allow UFW TCP ports 80 and 443. `sudo docker compose up -d app caddy`.
8. Check `sudo docker compose ps`, logs, and `curl -fsS https://siagasekitar.tech/api/health`.

For updates, push to Development-v4, wait for successful CI, back up and review migrations, select the new commit tag in both image variables, run migration, and run `sudo docker compose pull app && sudo docker compose up -d --no-deps app`. Keep the previous image tag for rollback. Rollback does not undo DB migrations. Review CORS/frame headers, auth, inputs, and production account creation before public launch.
