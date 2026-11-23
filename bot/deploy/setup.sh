#!/usr/bin/env bash
# Instala y levanta el bot en una VM Ubuntu/Debian nueva (probado pensando en Oracle Cloud Free Tier).
# Uso:  sudo bash setup.sh
# Es idempotente: se puede volver a correr para actualizar el código.
set -euo pipefail

REPO_URL="https://github.com/sofips/cositas-de-internet.git"
BASE=/opt/cositas-bot
APP=$BASE/app
CONF=$BASE/config
SVC_USER=botdefs

if [ "$(id -u)" -ne 0 ]; then
  echo "Corré este script con sudo." >&2
  exit 1
fi

echo "==> Paquetes base"
apt-get update -y
apt-get install -y curl ca-certificates gnupg git

# Las VM de 1 GB de RAM pueden quedarse sin memoria en 'npm ci': agregar swap si no hay.
if [ "$(swapon --show --noheadings | wc -l)" -eq 0 ]; then
  echo "==> Creando swap de 1 GB"
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "==> Instalando Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Usuario y carpetas"
id "$SVC_USER" >/dev/null 2>&1 || adduser --system --group --home "$BASE" "$SVC_USER"
mkdir -p "$BASE" "$CONF"

echo "==> Código"
if [ -d "$APP/.git" ]; then
  # Como root, git rechaza una carpeta que es de otro usuario ("dubious ownership"): hacerlo como $SVC_USER.
  chown -R "$SVC_USER:$SVC_USER" "$BASE"
  sudo -u "$SVC_USER" git -C "$APP" pull --ff-only
else
  git clone "$REPO_URL" "$APP"
  chown -R "$SVC_USER:$SVC_USER" "$BASE"
fi

echo "==> Dependencias (incluye tsx, que está en devDependencies)"
sudo -u "$SVC_USER" bash -c "cd '$APP' && npm ci --no-audit --no-fund"

if [ ! -f "$CONF/bot.env" ]; then
  cp "$APP/bot/.env.example" "$CONF/bot.env"
  chown "$SVC_USER:$SVC_USER" "$CONF/bot.env"
  echo
  echo "⚠️  Falta completar $CONF/bot.env con tus tokens:"
  echo "    sudo nano $CONF/bot.env"
fi
chmod 600 "$CONF/bot.env"

echo "==> Servicio systemd"
cp "$APP/bot/deploy/cositas-bot.service" /etc/systemd/system/cositas-bot.service
systemctl daemon-reload
systemctl enable cositas-bot

if grep -q -E 'tu_token_aqui|tu_id_aqui' "$CONF/bot.env"; then
  echo
  echo "El bot NO se inició porque bot.env todavía tiene los valores de ejemplo."
  echo "Completalo y después corré:  sudo systemctl restart cositas-bot"
else
  systemctl restart cositas-bot
  sleep 3
  systemctl --no-pager status cositas-bot || true
fi

echo
echo "Logs en vivo:  journalctl -u cositas-bot -f"
