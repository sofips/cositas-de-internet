import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ENV = path.join('/opt/cositas-bot/config', 'bot.env');
const LOCAL_ENV = path.join(__dirname, '.env');

const envPath = process.env.BOT_ENV_PATH || (fs.existsSync(DEFAULT_ENV) ? DEFAULT_ENV : LOCAL_ENV);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    adminId: Number(process.env.TELEGRAM_ADMIN_ID || 0),
  },
  github: {
    token: process.env.GITHUB_TOKEN || '',
    user: process.env.GITHUB_USER || '',
    email: process.env.GITHUB_EMAIL || '',
    repo: process.env.GITHUB_REPO || 'cositas-de-internet',
  },
  git: {
    authorName: process.env.GIT_AUTHOR_NAME || 'Bot Definiciones',
    authorEmail: process.env.GIT_AUTHOR_EMAIL || 'bot@definition.local',
  },
  paths: {
    projectRoot: process.env.PROJECT_ROOT || path.resolve(__dirname, '..'),
    definitionsPath: process.env.PROJECT_ROOT
      ? path.join(process.env.PROJECT_ROOT, 'public', 'definitions.json')
      : path.join(path.resolve(__dirname, '..'), 'public', 'definitions.json'),
  },
};

if (!config.telegram.token || !config.telegram.adminId) {
  console.warn('TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_ID no configurados (solo para desarrollo).');
}
