import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { getAllNotes, getNoteBySlug, getAllTags, getNotesByTag, ensureDirectories } from './notes.js';
import { homeTemplate, noteTemplate, tagsTemplate, tagNotesTemplate, notFoundTemplate, galleryTemplate } from './templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
ensureDirectories();

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Home page
app.get('/', (req, res) => {
  const notes = getAllNotes();
  res.send(homeTemplate(notes));
});

// Photo gallery
app.get('/fotos', (req, res) => {
  const tag = req.query.tag as string | undefined;
  res.send(galleryTemplate(tag));
});

// Photo gallery - static file style URLs (for compatibility)
app.get('/fotos/index.html', (req, res) => {
  res.send(galleryTemplate());
});

app.get('/fotos/:tag.html', (req, res) => {
  const tag = decodeURIComponent(req.params.tag);
  res.send(galleryTemplate(tag));
});

// Individual note
app.get('/notes/:slug', (req, res) => {
  // Remove .html extension if present
  const slug = req.params.slug.replace(/\.html$/, '');
  const note = getNoteBySlug(slug);
  
  if (!note) {
    res.status(404).send(notFoundTemplate());
    return;
  }
  
  res.send(noteTemplate(note));
});

// Tags index
app.get('/tags', (req, res) => {
  const tags = getAllTags();
  res.send(tagsTemplate(tags));
});

// Notes by tag
app.get('/tags/:tag', (req, res) => {
  const tag = req.params.tag;
  const notes = getNotesByTag(tag);
  res.send(tagNotesTemplate(tag, notes));
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(notFoundTemplate());
});

// Watch for file changes in development
const notesDir = path.join(__dirname, '../notes');
const watcher = chokidar.watch(notesDir, {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher.on('change', (filePath) => {
  console.log(`📝 Note updated: ${path.basename(filePath)}`);
});

watcher.on('add', (filePath) => {
  console.log(`🌱 New note: ${path.basename(filePath)}`);
});

watcher.on('unlink', (filePath) => {
  console.log(`🗑️  Note deleted: ${path.basename(filePath)}`);
});

app.listen(PORT, () => {
  console.log(`
  🌿 Digital Garden is growing!
  
  📍 Local: http://localhost:${PORT}
  
  📁 Notes directory: ${notesDir}
  
  💡 Tips:
     • Add 'public' tag to make notes visible
     • Use 'npm run new-note' to create a note
     • Edit notes in the /notes folder
  
  🔄 Watching for changes...
  `);
});
