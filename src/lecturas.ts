import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Highlight {
  id: string;          // timestamp "Created" de Kobo (estable entre reimportaciones)
  text: string;
  section?: string;
  comment?: string;    // tu comentario; sin comentario es una cita a secas
  public: boolean;     // por defecto todo es privado
}

export interface Book {
  slug: string;
  title: string;
  author: string;
  highlights: Highlight[];
}

export interface BookMeta {
  title: string;
  originalTitle?: string;
  subtitle?: string;
  author: string;
  publisher?: string;
  year?: number;
  language?: string;   // solo si no está en español
  description: string;
  note?: string;
  cover?: string;
}

export interface JournalEntry {
  id: string;
  date: string;        // ISO
  text: string;
  section?: string;
  comment?: string;
}

export interface JournalBook extends BookMeta {
  slug: string;
  entries: JournalEntry[];  // en orden de lectura
}

const ROOT = process.cwd();
// Todo lo importado (incluye lo privado) vive acá y está en .gitignore.
export const BOOKS_DIR = path.join(ROOT, 'lecturas', 'libros');
// Solo lo público. Es lo único que se commitea y lo que lee el build.
export const JOURNAL_JSON = path.join(ROOT, 'lecturas', 'journal.json');
// Metadata pública de cada libro (título en español, editorial, descripción, portada).
export const META_JSON = path.join(ROOT, 'lecturas', 'libros-meta.json');

export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanSection(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (/OEBPS|\.x?html?$/i.test(s)) return undefined;
  if (/^\d+\s+notes?:?$/i.test(s)) return undefined;
  if (/^(portada|cubierta|créditos|creditos)$/i.test(s)) return undefined;
  return s;
}

export function parseKoboFile(filePath: string): Book | null {
  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
  const idx = content.indexOf('## Highlights');
  if (idx === -1) return null;

  const highlights: Highlight[] = [];
  let section: string | undefined;
  let buf: string[] = [];

  for (const line of content.slice(idx + '## Highlights'.length).split('\n')) {
    const created = line.match(/^\*Created:\s*(.+?)\*\s*$/);
    if (created) {
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) highlights.push({ id: created[1], text, section, public: false });
      buf = [];
    } else if (/^##\s/.test(line)) {
      section = cleanSection(line.replace(/^##\s+/, ''));
    } else if (line.trim()) {
      buf.push(line.trim());
    }
  }
  if (!highlights.length) return null;

  const title = String(data.title || path.basename(filePath, '.md'));
  return { slug: slugify(title.split(':')[0]), title, author: String(data.author || ''), highlights };
}

export function readBooks(): Book[] {
  if (!fs.existsSync(BOOKS_DIR)) return [];
  return fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, f), 'utf-8')) as Book);
}

export function readMeta(): Record<string, BookMeta> {
  return fs.existsSync(META_JSON) ? JSON.parse(fs.readFileSync(META_JSON, 'utf-8')) : {};
}

export function buildJournal(books: Book[]): JournalBook[] {
  const meta = readMeta();
  return books
    .filter(b => b.highlights.some(h => h.public))
    .map(b => ({
      slug: b.slug,
      ...(meta[b.slug] ?? { title: b.title, author: b.author, description: '' }),
      entries: b.highlights.filter(h => h.public).map(h => ({
        id: h.id, date: h.id, text: h.text, section: h.section, comment: h.comment?.trim() || undefined,
      })),
    }))
    // el libro con la lectura más reciente primero
    .sort((a, b) => Math.max(...b.entries.map(e => +new Date(e.date))) - Math.max(...a.entries.map(e => +new Date(e.date))));
}

export function getJournal(): JournalBook[] {
  if (!fs.existsSync(JOURNAL_JSON)) return [];
  return JSON.parse(fs.readFileSync(JOURNAL_JSON, 'utf-8')) as JournalBook[];
}
