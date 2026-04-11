import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllNotes, getAllTags, getNotesByTag, ensureDirectories } from './notes.js';
import { homeTemplate, noteTemplate, tagsTemplate, tagNotesTemplate, galleryTemplate, notFoundTemplate } from './templates.js';
import { getGalleryImages } from './gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../dist');
const PUBLIC_DIR = path.join(__dirname, '../public');

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build(): void {
  console.log('🔨 Building Digital Garden...\n');

  // Ensure directories exist
  ensureDirectories();

  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Copy static files
  console.log('📦 Copying static files...');
  copyDirectory(PUBLIC_DIR, OUTPUT_DIR);

  // Get all public notes
  const notes = getAllNotes();
  console.log(`📝 Found ${notes.length} public notes`);

  // Generate home page
  console.log('🏠 Generating home page...');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), homeTemplate(notes));

  // Generate individual note pages
  console.log('📄 Generating note pages...');
  const notesDir = path.join(OUTPUT_DIR, 'notes');
  fs.mkdirSync(notesDir, { recursive: true });

  for (const note of notes) {
    const noteHtml = noteTemplate(note);
    fs.writeFileSync(path.join(notesDir, `${note.slug}.html`), noteHtml);
    console.log(`   ✓ ${note.title}`);
  }

  // Generate tags pages
  console.log('🏷️  Generating tag pages...');
  const tagsDir = path.join(OUTPUT_DIR, 'tags');
  fs.mkdirSync(tagsDir, { recursive: true });

  const tags = getAllTags();
  fs.writeFileSync(path.join(tagsDir, 'index.html'), tagsTemplate(tags));

  for (const [tag] of tags) {
    const tagNotes = getNotesByTag(tag);
    const tagHtml = tagNotesTemplate(tag, tagNotes);
    fs.writeFileSync(path.join(tagsDir, `${tag}.html`), tagHtml);
    console.log(`   ✓ ${tag} (${tagNotes.length} notes)`);
  }

  // Generate gallery pages
  console.log('📸 Generating gallery pages...');
  const fotosDir = path.join(OUTPUT_DIR, 'fotos');
  fs.mkdirSync(fotosDir, { recursive: true });
  
  // Main gallery page
  fs.writeFileSync(path.join(fotosDir, 'index.html'), galleryTemplate());
  
  // Gallery filtered by tag
  const images = getGalleryImages();
  const imageTags = [...new Set(images.flatMap(img => img.tags))];
  for (const tag of imageTags) {
    fs.writeFileSync(path.join(fotosDir, `${encodeURIComponent(tag)}.html`), galleryTemplate(tag));
    console.log(`   ✓ ${tag}`);
  }

  // Generate 404 page
  fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), notFoundTemplate());

  console.log('\n✨ Build complete!');
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log('\n💡 Para subir a GitHub Pages:');
  console.log('   1. git add .');
  console.log('   2. git commit -m "Build site"');
  console.log('   3. git push');
}

build();
