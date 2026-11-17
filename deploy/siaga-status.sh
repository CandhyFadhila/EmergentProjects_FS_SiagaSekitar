#!/usr/bin/env bash
# Read-only VPS health report for Siaga Sekitar.
set -uo pipefail

PROJECT_DIR="/opt/siagasekitar"
HEALTH_URL="https://siagasekitar.tech/api/health"
WARNINGS=0

if [[ ! -f "$PROJECT_DIR/compose.yaml" ]]; then
  echo "ERROR: $PROJECT_DIR/compose.yaml not found." >&2
  exit 2
fi
for tool in docker curl free df awk; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: Missing command: $tool" >&2
    exit 2
  fi
done
cd "$PROJECT_DIR" || exit 2

echo "========================================"
echo " SIAGA SEKITAR — VPS STATUS"
echo "========================================"
echo "Server time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "Load average: $(awk '{print $1", "$2", "$3}' /proc/loadavg)"
echo "CPU cores: $(nproc)"
echo
echo "=== MEMORY ==="
free -h | head -n 3
available_mb="$(free -m | awk '/^Mem:/ {print $7}')"
if [[ "$available_mb" =~ ^[0-9]+$ ]] && (( available_mb < 512 )); then
  echo "WARNING: Available RAM is below 512 MiB."
  ((WARNINGS+=1))
fi
echo
echo "=== DISK ==="
df -h /
disk_used="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [[ "$disk_used" =~ ^[0-9]+$ ]] && (( disk_used >= 80 )); then
  echo "WARNING: Root disk usage is at or above 80%."
  ((WARNINGS+=1))
fi
echo

# Docker status needs sudo, but no root shell or secret file is printed.
if ! sudo -v; then
  echo "ERROR: sudo authentication failed." >&2
  exit 2
fi
if ! sudo docker compose config --quiet; then
  echo "ERROR: Docker Compose configuration invalid." >&2
  exit 2
fi

echo "=== DOCKER SERVICES ==="
container_ids=()
for service in app db caddy; do
  cid="$(sudo docker compose ps --all --quiet "$service" 2>/dev/null)"
  if [[ -z "$cid" ]]; then
    printf '%-8s : NOT FOUND\n' "$service"
    ((WARNINGS+=1))
    continue
  fi

  running="$(sudo docker inspect --format '{{.State.Status}}' "$cid" 2>/dev/null)"
  health="$(sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}}' "$cid" 2>/dev/null)"
  printf '%-8s : %s (%s)\n' "$service" "$running" "$health"

  if [[ "$running" != "running" || "$health" == "unhealthy" ]]; then
    ((WARNINGS+=1))
  fi
  if [[ "$running" == "running" ]]; then
    container_ids+=("$cid")
  fi
  if [[ "$service" == "app" ]]; then
    image="$(sudo docker inspect --format '{{.Config.Image}}' "$cid" 2>/dev/null)"
    printf '  App image: %s\n' "${image##*:}"
  fi
done
echo
echo "=== CONTAINER RESOURCE USAGE ==="
if (( ${#container_ids[@]} > 0 )); then
  sudo docker stats --no-stream \
    --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' "${container_ids[@]}"
else
  echo "No running Siaga Sekitar containers."
fi
echo

echo "=== PUBLIC HTTPS ==="
response="$(curl --fail --silent --show-error --connect-timeout 4 --max-time 10 "$HEALTH_URL" 2>/dev/null)"
if [[ "$response" == *'"status":"ok"'* ]]; then
  echo "$HEALTH_URL : OK"
else
  echo "$HEALTH_URL : FAILED"
  ((WARNINGS+=1))
fi
echo

echo "=== BACKUP ==="
timer="$(systemctl is-active siaga-backup.timer 2>/dev/null || true)"
echo "Timer: $timer"
if [[ "$timer" != "active" ]]; then
  ((WARNINGS+=1))
fi
echo "Next schedule:"
systemctl list-timers --all --no-pager --no-legend siaga-backup.timer 2>/dev/null || true
last_backup="$(sudo find /var/backups/siagasekitar -maxdepth 1 -type f -name '*.dump' \
  -printf '%T@ %f %s\n' 2>/dev/null | sort -rn | head -n 1)"
if [[ -n "$last_backup" ]]; then
  printf 'Latest file: %s (%s bytes)\n' \
    "$(awk '{print $2}' <<<"$last_backup")" \
    "$(awk '{print $3}' <<<"$last_backup")"
else
  echo "WARNING: No local PostgreSQL backup found."
  ((WARNINGS+=1))
fi
echo
if (( WARNINGS == 0 )); then
  echo "RESULT: No warnings detected."
else
  echo "RESULT: $WARNINGS warning(s). Review details above."
fi
exit "$(( WARNINGS > 0 ))"
