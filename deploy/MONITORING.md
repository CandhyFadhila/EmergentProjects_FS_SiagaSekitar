# Siaga Sekitar — Lightweight Server Monitoring

The `siaga-status` command reports VPS CPU load, RAM, disk, Docker service status, public HTTPS, and backup health. It now warns if a daily backup is over 36 hours old or empty.

## Install on the VPS

Install `deploy/siaga-status.sh` to `/usr/local/bin/siaga-status` with mode `755`; put `deploy/siaga-monitor.service` and `deploy/siaga-monitor.timer` into `/etc/systemd/system/` with mode `644`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now siaga-monitor.timer
sudo systemctl start siaga-monitor.service
systemctl list-timers siaga-monitor.timer --all
sudo journalctl -u siaga-monitor.service -n 80 --no-pager
```

The service checks every ten minutes and stores results in systemd journal. A warning makes the health-check command exit with code 1; inspect the journal to see what failed. The service never modifies the database, deletes backups, or restarts containers. It does **not** send Telegram, email, or phone notifications.

```bash
siaga-status
sudo systemctl show siaga-monitor.service -p Result
sudo journalctl -u siaga-monitor.service --since '2 hours ago' --no-pager
```