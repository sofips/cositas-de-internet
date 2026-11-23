// Uso: npm run import-highlights -- "/ruta/al/directorio/kobo"
// Reimportar es seguro: agrega highlights nuevos y conserva `public` y `comment`.
import fs from 'fs';
import path from 'path';
import { BOOKS_DIR, JOURNAL_JSON, Book, parseKoboFile, readBooks, readMeta, buildJournal } from '../src/lecturas.js';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error('Pasame el directorio de highlights: npm run import-highlights -- "/ruta/kobo"');
  process.exit(1);
}

fs.mkdirSync(BOOKS_DIR, { recursive: true });
let added = 0;
// Archivos sin libro identificable (mezcla de textos sueltos).
const IGNORE = new Set(['unknown-title']);

for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
  const book = parseKoboFile(path.join(dir, f));
  if (!book || IGNORE.has(book.slug)) continue;

  const target = path.join(BOOKS_DIR, `${book.slug}.json`);
  const prev: Book | null = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : null;
  const old = new Map((prev?.highlights ?? []).map(h => [h.id, h]));

  book.highlights = book.highlights.map(h => {
    const p = old.get(h.id);
    if (!p) { added++; return h; }
    return { ...h, public: p.public, comment: p.comment };
  });
  // lo que ya curaste y desapareció del export no se pierde
  const ids = new Set(book.highlights.map(h => h.id));
  book.highlights.push(...(prev?.highlights ?? []).filter(h => !ids.has(h.id) && (h.public || h.comment)));

  fs.writeFileSync(target, JSON.stringify(book, null, 2) + '\n');
  console.log(`📖 ${book.title}: ${book.highlights.length} highlights`);
}

// Regenera el journal público (único archivo que se commitea).
const journal = buildJournal(readBooks());
const meta = readMeta();
for (const b of journal) if (!meta[b.slug]) console.warn(`⚠️  Falta metadata de «${b.title}» en lecturas/libros-meta.json`);
fs.writeFileSync(JOURNAL_JSON, JSON.stringify(journal, null, 2) + '\n');
console.log(`\n✨ ${added} nuevos · ${journal.length} libros en el journal`);
