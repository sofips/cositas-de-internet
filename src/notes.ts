import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Note {
  slug: string;
  title: string;
  content: string;
  html: string;
  tags: string[];
  estado?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteMetadata {
  title?: string;
  tags?: string[];
  created?: string;
  updated?: string;
  estado?: string;
}

const NOTES_DIR = path.join(__dirname, '../notes');
const PUBLIC_DIR = path.join(__dirname, '../public');
const BASE_PATH = process.env.BASE_PATH || '';

export const PUBLIC_TAG = 'public';
export const PRIVATE_TAG = 'private';

export function ensureDirectories(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
}

export function parseNote(filePath: string): Note | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const metadata = data as NoteMetadata;
    
    const slug = path.basename(filePath, '.md');
    const tags = metadata.tags || [];
    const isPublic = tags.includes(PUBLIC_TAG);
    
    const stats = fs.statSync(filePath);
    
    // Rewrite internal links to static-safe paths
    const rewritten = rewriteInternalLinks(content);

    return {
      slug,
      title: metadata.title || slug,
      content,
      html: marked(rewritten.replace(/^\*\*Estado:\*\*\s*.+\n?/m, '')) as string,
      tags,
      estado: metadata.estado,
      isPublic,
      createdAt: metadata.created ? new Date(metadata.created) : stats.birthtime,
      updatedAt: metadata.updated ? new Date(metadata.updated) : stats.mtime,
    };
  } catch (error) {
    console.error(`Error parsing note ${filePath}:`, error);
    return null;
  }
}

// Matches a note slug: letters (incl. tildes/ñ/any Unicode letter), digits, underscore, hyphen,
// slash and space. Needs the `u` flag to make \p{L}/\p{N} Unicode-aware — plain \w is ASCII-only
// and used to silently fail to match slugs with accents (e.g. "canción"), leaving the wikilink
// as literal, unrewritten text. Current note filenames avoid accents so this hasn't bitten yet,
// but there's no reason the link syntax itself should require that.
const SLUG_CHARS = '[\\p{L}\\p{N}_\\-\\/ ]+';

// Convert [[wikilinks]] and relative markdown links to /notes/slug.html
function rewriteInternalLinks(src: string): string {
  let out = src;
  // [[slug]] or [[text|slug]] patterns -> link to notes (URL-encoded)
  out = out.replace(new RegExp(`\\[\\[\\s*(${SLUG_CHARS})\\s*\\]\\]`, 'gu'), (_m, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    const text = slug.split('/').pop().replace(/-/g, ' ');
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });
  out = out.replace(new RegExp(`\\[\\[\\s*([^\\]|]+)\\|\\s*(${SLUG_CHARS})\\s*\\]\\]`, 'gu'), (_m, text, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  // [text](slug) where slug is bare (no scheme, no leading /, no #, no extension)
  out = out.replace(new RegExp(`\\[([^\\]]+)\\]\\((?!https?:|mailto:|#|\\/)(${SLUG_CHARS})\\)`, 'gu'), (_m, text, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  // [text](/notes/slug) -> ensure .html and URL-encode
  out = out.replace(new RegExp(`\\[([^\\]]+)\\]\\(\\/notes\\/(${SLUG_CHARS})(?!\\.html)(\\))`, 'gu'), (_m, text, slug, _close) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  return out;
}

// getAllNotes() re-reads and re-parses (including full Markdown rendering) every note on disk.
// baseLayout() in templates.ts calls it once per generated page just to build the random-links
// list, so without a cache a build with N notes redoes that work N+ times. The cache is keyed by
// includePrivate since that flag changes the result set; invalidateNotesCache() lets the dev
// server (server.ts) drop it when a file actually changes.
const notesCache = new Map<boolean, Note[]>();

export function invalidateNotesCache(): void {
  notesCache.clear();
}

export function getAllNotes(includePrivate = false): Note[] {
  const cached = notesCache.get(includePrivate);
  if (cached) return cached;

  ensureDirectories();

  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
  const notes: Note[] = [];

  for (const file of files) {
    const note = parseNote(path.join(NOTES_DIR, file));
    if (note && (includePrivate || note.isPublic)) {
      notes.push(note);
    }
  }

  notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  notesCache.set(includePrivate, notes);
  return notes;
}

export function getNoteBySlug(slug: string, includePrivate = false): Note | null {
  const filePath = path.join(NOTES_DIR, `${slug}.md`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const note = parseNote(filePath);
  
  if (note && (includePrivate || note.isPublic)) {
    return note;
  }
  
  return null;
}

export function getAllTags(includePrivate = false): Map<string, number> {
  const notes = getAllNotes(includePrivate);
  const tagCount = new Map<string, number>();
  
  for (const note of notes) {
    for (const tag of note.tags) {
      if (tag !== PUBLIC_TAG && tag !== PRIVATE_TAG) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
  }
  
  return tagCount;
}

export function getNotesByTag(tag: string, includePrivate = false): Note[] {
  return getAllNotes(includePrivate).filter(note => note.tags.includes(tag));
}
