#!/usr/bin/env bash
# Siaga Sekitar V4: safely deploy the latest successful GitHub Actions build.
set -Eeuo pipefail
umask 077

PROJECT_DIR="/opt/siagasekitar"
IMAGE="ghcr.io/candhyfadhila/emergentprojects_fs_siagasekitar"
MODE="${1:-deploy}"

if [[ "$MODE" != "deploy" && "$MODE" != "--check" ]]; then
  echo "Usage: siaga-update [--check]" >&2
  exit 2
fi
if [[ "$EUID" -eq 0 ]]; then
  echo "Run as adminsiaga without sudo; the script uses sudo for Docker." >&2
  exit 2
fi
for name in python3 sudo docker curl; do
  command -v "$name" >/dev/null || { echo "Missing dependency: $name" >&2; exit 2; }
done
cd "$PROJECT_DIR"
[[ -f .env && -f app.env && -f compose.yaml ]] || {
  echo "Missing production .env, app.env, or compose.yaml." >&2
  exit 2
}

echo "Checking Development-v4 and its GitHub Actions build..."
LATEST_SHA="$(python3 - <<'PY'
import json, sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

base = "https://api.github.com/repos/CandhyFadhila/EmergentProjects_FS_SiagaSekitar"
def github(path):
    request = Request(base + path, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "siaga-update/1.0",
    })
    with urlopen(request, timeout=20) as response:
        return json.load(response)
try:
    sha = github("/branches/Development-v4")["commit"]["sha"]
    runs = github("/actions/runs?branch=Development-v4&per_page=20")["workflow_runs"]
    matches = [
        r for r in runs
        if r.get("head_sha") == sha
        and r.get("event") == "push"
        and r.get("name") == "Build V4 Docker images"
    ]
    if not matches:
        sys.exit("No matching GitHub Actions build for the latest Development-v4 commit.")
    run = matches[0]
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        sys.exit("Latest CI is not successful yet. VPS was not changed.")
    print(sha)
except (HTTPError, URLError, KeyError, ValueError) as exc:
    sys.exit(f"Unable to check GitHub Actions: {exc}")
PY
)"
CURRENT_TAG="$(python3 - <<'PY'
from pathlib import Path
lines = [
    line.split("=", 1)[1].strip()
    for line in Path(".env").read_text().splitlines()
    if line.startswith("APP_IMAGE=")
]
if len(lines) != 1:
    raise SystemExit("Expected exactly one APP_IMAGE= entry in .env.")
print(lines[0].split(":")[-1])
PY
)"
echo "Currently deployed: $CURRENT_TAG"
echo "Newest successful build: ${LATEST_SHA:0:12}"
if [[ "$CURRENT_TAG" == "v4-$LATEST_SHA" ]]; then
  echo "Already up to date. Nothing to do."
  exit 0
fi
if [[ "$MODE" == "--check" ]]; then
  echo "Update available. Run: siaga-update"
  exit 0
fi

sudo -v
sudo docker compose config --quiet

BACKUP=".env.before-update-$(date -u +%Y%m%dT%H%M%SZ)"
cp -p .env "$BACKUP"
ROLLBACK_NEEDED=0
APP_RECREATED=0

on_error() {
  local code=$?
  trap - ERR
  echo "Update failed (exit $code)." >&2
  if (( ROLLBACK_NEEDED )); then
    echo "Restoring previous image configuration..." >&2
    cp -p "$BACKUP" .env
    if (( APP_RECREATED )); then
      sudo docker compose up -d --no-deps app || true
    fi
  fi
  echo "See logs: sudo docker compose logs --tail=100 app" >&2
  exit "$code"
}
trap on_error ERR

echo "Pulling app and migration images from GHCR..."
sudo docker pull "$IMAGE:v4-$LATEST_SHA"
sudo docker pull "$IMAGE:v4-migrate-$LATEST_SHA"

ROLLBACK_NEEDED=1
python3 - "$LATEST_SHA" <<'PY'
from pathlib import Path
import os, sys, tempfile

sha = sys.argv[1]
image = "ghcr.io/candhyfadhila/emergentprojects_fs_siagasekitar"
replacements = {
    "APP_IMAGE": f"{image}:v4-{sha}",
    "MIGRATE_IMAGE": f"{image}:v4-migrate-{sha}",
}
path = Path(".env")
lines = path.read_text().splitlines()
for key, value in replacements.items():
    positions = [i for i, line in enumerate(lines) if line.startswith(key + "=")]
    if len(positions) != 1:
        raise SystemExit(f"Expected exactly one {key}= in .env.")
    lines[positions[0]] = f"{key}={value}"
fd, tmp = tempfile.mkstemp(prefix=".env.tmp.", dir=".")
try:
    with os.fdopen(fd, "w") as output:
        output.write("\n".join(lines) + "\n")
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)
PY

sudo docker compose config --quiet

echo "Checking Prisma migrations (will NOT apply migrations)..."
if ! sudo docker compose --profile maintenance run --rm --no-deps migrate ./node_modules/.bin/prisma migrate status; then
  echo "Pending/failed migrations need a separate reviewed database deployment." >&2
  false
fi

echo "Recreating the app only; database and Caddy remain running..."
APP_RECREATED=1
sudo docker compose up -d --no-deps app

echo "Checking internal app and public HTTPS health..."
HEALTHY=0
for attempt in {1..12}; do
  if sudo docker compose exec -T app node -e \
    "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1 \
    && curl --fail --silent --show-error --max-time 10 https://siagasekitar.tech/api/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 5
done
if (( ! HEALTHY )); then
  echo "App or HTTPS health check failed." >&2
  false
fi

trap - ERR
ROLLBACK_NEEDED=0
echo "SUCCESS: deployed ${LATEST_SHA:0:12}"
echo "Previous .env saved in: $BACKUP"
sudo docker compose ps
