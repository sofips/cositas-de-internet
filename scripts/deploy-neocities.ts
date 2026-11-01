import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const API_BASE = 'https://neocities.org/api';
const MAX_BATCH_FILES = 30;
const MAX_BATCH_BYTES = 80 * 1024 * 1024;

const apiKey = process.env.NEOCITIES_API_KEY;

interface RemoteFile {
  path: string;
  is_directory: boolean;
  sha1_hash?: string;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function walkDist(dir: string, base = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDist(fullPath, base));
    } else {
      files.push(path.relative(base, fullPath).split(path.sep).join('/'));
    }
  }

  return files;
}

function sha1(filePath: string): string {
  return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
}

async function listRemoteFiles(): Promise<RemoteFile[]> {
  const res = await fetch(`${API_BASE}/list`, { headers: authHeaders() });
  const data = await res.json();

  if (data.result !== 'success') {
    throw new Error(`No se pudo listar archivos de Neocities: ${data.error_type} - ${data.message}`);
  }

  return data.files;
}

async function uploadBatch(relPaths: string[]): Promise<void> {
  const form = new FormData();

  for (const relPath of relPaths) {
    const buf = fs.readFileSync(path.join(DIST_DIR, relPath));
    form.append(relPath, new Blob([buf]), path.basename(relPath));
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await res.json();

  if (data.result !== 'success') {
    throw new Error(`Error subiendo archivos: ${data.error_type} - ${data.message}`);
  }

  for (const relPath of relPaths) console.log(`   ✓ ${relPath}`);
}

async function uploadFiles(relPaths: string[]): Promise<void> {
  let batch: string[] = [];
  let batchBytes = 0;

  for (const relPath of relPaths) {
    const size = fs.statSync(path.join(DIST_DIR, relPath)).size;

    if (batch.length >= MAX_BATCH_FILES || (batch.length > 0 && batchBytes + size > MAX_BATCH_BYTES)) {
      await uploadBatch(batch);
      batch = [];
      batchBytes = 0;
    }

    batch.push(relPath);
    batchBytes += size;
  }

  if (batch.length > 0) await uploadBatch(batch);
}

async function deleteFiles(relPaths: string[]): Promise<void> {
  if (relPaths.length === 0) return;

  const form = new FormData();
  for (const relPath of relPaths) form.append('filenames[]', relPath);

  const res = await fetch(`${API_BASE}/delete`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await res.json();

  if (data.result !== 'success') {
    throw new Error(`Error borrando archivos: ${data.error_type} - ${data.message}`);
  }

  for (const relPath of relPaths) console.log(`   ✓ ${relPath}`);
}

async function main(): Promise<void> {
  if (!apiKey) {
    console.error('❌ Falta NEOCITIES_API_KEY. Definila en .env o como variable de entorno.');
    process.exit(1);
  }

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ No existe dist/. Corré "npm run build:neocities" antes de sincronizar.');
    process.exit(1);
  }

  console.log('🔍 Comparando dist/ con Neocities...\n');

  const localFiles = walkDist(DIST_DIR);
  const remoteFiles = await listRemoteFiles();
  const remoteByPath = new Map(remoteFiles.filter(f => !f.is_directory).map(f => [f.path, f]));

  const toUpload = localFiles.filter(relPath => {
    const remote = remoteByPath.get(relPath);
    return !remote || remote.sha1_hash !== sha1(path.join(DIST_DIR, relPath));
  });

  const localSet = new Set(localFiles);
  const toDelete = [...remoteByPath.keys()].filter(p => !localSet.has(p));

  console.log(`📝 ${localFiles.length} archivos locales, ${toUpload.length} para subir, ${toDelete.length} para borrar.\n`);

  if (toUpload.length > 0) {
    console.log('⬆️  Subiendo...');
    await uploadFiles(toUpload);
  }

  if (toDelete.length > 0) {
    console.log('🗑️  Borrando archivos obsoletos...');
    await deleteFiles(toDelete);
  }

  console.log('\n✨ Sitio sincronizado con Neocities.');
}

main().catch(err => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
