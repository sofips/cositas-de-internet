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
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteMetadata {
  title?: string;
  tags?: string[];
  created?: string;
  updated?: string;
}

const NOTES_DIR = path.join(__dirname, '../notes');
const PUBLIC_DIR = path.join(__dirname, '../public');
const BASE_PATH = process.env.BASE_PATH || '';

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
    const isPublic = tags.includes('public');
    
    const stats = fs.statSync(filePath);
    
    // Rewrite internal links to static-safe paths
    const rewritten = rewriteInternalLinks(content);

    return {
      slug,
      title: metadata.title || slug,
      content,
      html: marked(rewritten) as string,
      tags,
      isPublic,
      createdAt: metadata.created ? new Date(metadata.created) : stats.birthtime,
      updatedAt: metadata.updated ? new Date(metadata.updated) : stats.mtime,
    };
  } catch (error) {
    console.error(`Error parsing note ${filePath}:`, error);
    return null;
  }
}

// Convert [[wikilinks]] and relative markdown links to /notes/slug.html
function rewriteInternalLinks(src: string): string {
  let out = src;
  // [[slug]] or [[text|slug]] patterns -> link to notes (URL-encoded)
  out = out.replace(/\[\[\s*([\w\-\/ ]+)\s*\]\]/g, (_m, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    const text = slug.split('/').pop().replace(/-/g, ' ');
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });
  out = out.replace(/\[\[\s*([^\]|]+)\|\s*([\w\-\/ ]+)\s*\]\]/g, (_m, text, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  // [text](slug) where slug is bare (no scheme, no leading /, no #, no extension)
  out = out.replace(/\[([^\]]+)\]\((?!https?:|mailto:|#|\/)([\w\-\/ ]+)\)/g, (_m, text, slug) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  // [text](/notes/slug) -> ensure .html and URL-encode
  out = out.replace(/\[([^\]]+)\]\(\/notes\/([\w\-\/ ]+)(?!\.html)(\))/g, (_m, text, slug, close) => {
    const cleanSlug = encodeURIComponent(slug.trim().replace(/\s+/g, '-'));
    return `[${text}](${BASE_PATH}/notes/${cleanSlug}.html)`;
  });

  return out;
}

export function getAllNotes(includePrivate = false): Note[] {
  ensureDirectories();
  
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
  const notes: Note[] = [];
  
  for (const file of files) {
    const note = parseNote(path.join(NOTES_DIR, file));
    if (note && (includePrivate || note.isPublic)) {
      notes.push(note);
    }
  }
  
  return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
      if (tag !== 'public' && tag !== 'private') {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
  }
  
  return tagCount;
}

export function getNotesByTag(tag: string, includePrivate = false): Note[] {
  return getAllNotes(includePrivate).filter(note => note.tags.includes(tag));
}
