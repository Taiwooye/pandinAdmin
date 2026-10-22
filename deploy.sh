#!/usr/bin/env bash
# Deploy the admin dashboard to the Contabo VPS: sync code, install deps, build, restart PM2.
set -euo pipefail

SERVER="${SERVER:-root@213.199.53.100}"
APP_DIR="/var/www/pandinadmin"
APP_NAME="pandinadmin"

cd "$(dirname "$0")"

echo "==> Syncing files to $SERVER:$APP_DIR"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .claude \
  --exclude .env.local \
  ./ "$SERVER:$APP_DIR/"

echo "==> Installing dependencies, building and restarting"
ssh "$SERVER" "set -e
  cd $APP_DIR
  npm ci --no-audit --no-fund
  npm run build
  pm2 restart $APP_NAME
  pm2 save"

echo "==> Checking site"
for _ in {1..15}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: admin.pandingroup.com" "http://${SERVER#*@}/login" || true)
  if [ "$code" = "200" ]; then
    echo "Site is up (HTTP 200)"
    exit 0
  fi
  sleep 2
done
echo "Site check failed (last HTTP $code). Check logs: ssh $SERVER 'pm2 logs $APP_NAME'" >&2
exit 1
