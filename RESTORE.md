# Restore: dbs-demo

AI Building Intelligence demo — React + MobX + Ant Design SPA served by Nginx (port 8029),
with a FastAPI auth backend (internal port 8000).

## Prerequisites

```bash
# Create shared Docker network (once per host)
docker network create aihvac-net 2>/dev/null || true

# Auth database directory
mkdir -p data
```

## Restore from Gitea

```bash
git clone http://10.0.10.24:30008/ak101/dbs-demo.git
cd dbs-demo

docker compose up -d --build
```

The admin user is created automatically on first start (check backend logs for initial credentials).

## Restore with existing auth data

```bash
cp /path/to/backup/users.db data/users.db
docker compose up -d --build
```

## Verify

```bash
# Open http://<HOST_IP>:8029 in browser — landing page with 3 tiles
# Log in with admin credentials to access VRV / Lighting / BTU pages
```

## Notes

- Binds to `0.0.0.0:8029` — accessible on all interfaces (LAN + Tailscale)
- All equipment data is simulated in MobX stores — no real BMS connection
- Uses Ant Design (intentional — DBS platform integration target); do not replace with Tremor
- The `dbs-internal` Docker network is created automatically by compose
