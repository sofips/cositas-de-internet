import { Note } from './notes.js';

const SITE_TITLE = '✧ Digital Garden';

export function baseLayout(content: string, title = SITE_TITLE): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <!-- Frutiger Aero Background Elements -->
  <div class="aero-bg"></div>
  
  <!-- Floating Bubbles -->
  <div class="bubble bubble-1"></div>
  <div class="bubble bubble-2"></div>
  <div class="bubble bubble-3"></div>
  <div class="bubble bubble-4"></div>
  <div class="bubble bubble-5"></div>
  <div class="bubble bubble-6"></div>
  <div class="bubble bubble-7"></div>
  <div class="bubble bubble-8"></div>
  
  <!-- Sparkles ✧ -->
  <div class="sparkle sparkle-1"></div>
  <div class="sparkle sparkle-2"></div>
  <div class="sparkle sparkle-3"></div>
  <div class="sparkle sparkle-4"></div>
  <div class="sparkle sparkle-5"></div>
  <div class="sparkle sparkle-6"></div>
  <div class="sparkle sparkle-7"></div>
  <div class="sparkle sparkle-8"></div>
  
  <!-- Swimming Fish -->
  <div class="fish fish-1">🐠</div>
  <div class="fish fish-2">🐟</div>
  <div class="fish fish-3">🐡</div>
  
  <nav class="glass-nav">
    <a href="/" class="logo">Garden</a>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/tags">Tags</a>
    </div>
  </nav>
  
  <main class="container">
    ${content}
  </main>
  
  <footer class="glass-footer">
    <p>Growing ideas in the digital waters</p>
  </footer>
</body>
</html>`;
}

export function homeTemplate(notes: Note[]): string {
  const noteCards = notes.map(note => `
    <article class="note-card glass-card">
      <a href="/notes/${note.slug}">
        <h2>${note.title}</h2>
        <div class="note-meta">
          <span class="date">${note.updatedAt.toLocaleDateString()}</span>
        </div>
        <div class="tags">
          ${note.tags.filter(t => t !== 'public').map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <p class="preview">${note.content.slice(0, 150).replace(/[#*_`]/g, '')}...</p>
      </a>
    </article>
  `).join('');

  const content = `
    <section class="hero glass-card">
      <h1>Digital Garden</h1>
      <p>A peaceful space where ideas bloom and grow beneath the surface</p>
    </section>
    
    <section class="notes-grid">
      ${noteCards || '<p class="empty-state">No notes yet... time to plant some seeds!</p>'}
    </section>
  `;

  return baseLayout(content);
}

export function noteTemplate(note: Note): string {
  const content = `
    <article class="note-full glass-card">
      <header class="note-header">
        <h1>${note.title}</h1>
        <div class="note-meta">
          <span class="date">Updated: ${note.updatedAt.toLocaleDateString()}</span>
          <span class="date">Created: ${note.createdAt.toLocaleDateString()}</span>
        </div>
        <div class="tags">
          ${note.tags.filter(t => t !== 'public').map(tag => `<a href="/tags/${tag}" class="tag">${tag}</a>`).join('')}
        </div>
      </header>
      <div class="note-content">
        ${note.html}
      </div>
      <footer class="note-footer">
        <a href="/" class="back-link">← Back to garden</a>
      </footer>
    </article>
  `;

  return baseLayout(content, `${note.title} | Digital Garden`);
}

export function tagsTemplate(tags: Map<string, number>): string {
  const tagItems = Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `
      <a href="/tags/${tag}" class="tag-item glass-card">
        <span class="tag-name">${tag}</span>
        <span class="tag-count">${count}</span>
      </a>
    `).join('');

  const content = `
    <section class="tags-page">
      <h1>All Tags</h1>
      <div class="tags-grid">
        ${tagItems || '<p class="empty-state">No tags yet... keep exploring!</p>'}
      </div>
    </section>
  `;

  return baseLayout(content, 'Tags | Digital Garden');
}

export function tagNotesTemplate(tag: string, notes: Note[]): string {
  const noteCards = notes.map(note => `
    <article class="note-card glass-card">
      <a href="/notes/${note.slug}">
        <h2>${note.title}</h2>
        <div class="note-meta">
          <span class="date">${note.updatedAt.toLocaleDateString()}</span>
        </div>
        <p class="preview">${note.content.slice(0, 150).replace(/[#*_`]/g, '')}...</p>
      </a>
    </article>
  `).join('');

  const content = `
    <section class="tag-notes-page">
      <h1>Tag: ${tag}</h1>
      <a href="/tags" class="back-link">← All tags</a>
      <div class="notes-grid">
        ${noteCards || '<p class="empty-state">No notes with this tag yet!</p>'}
      </div>
    </section>
  `;

  return baseLayout(content, `${tag} | Digital Garden`);
}

export function notFoundTemplate(): string {
  const content = `
    <section class="not-found glass-card">
      <h1>404</h1>
      <p>// Error: Resource not found in database</p>
      <a href="/" class="back-link">← Return home</a>
    </section>
  `;

  return baseLayout(content, '404 | Digital Garden');
}

import { getGalleryImages } from './gallery.js';

export function galleryTemplate(tag?: string): string {
  let images = getGalleryImages();
  if (tag) {
    images = images.filter(img => img.tags.includes(tag));
  }

  const tagList = Array.from(new Set(getGalleryImages().flatMap(i => i.tags))).sort();

  const content = `
    <section class="gallery-page">
      <h1>Photo Gallery${tag ? ` - ${tag}` : ''}</h1>
      <div class="tags-nav">
        <a href="/fotos" class="tag ${!tag ? 'active' : ''}">All</a>
        ${tagList.map(t => `<a href="/fotos/${t}.html" class="tag ${t === tag ? 'active' : ''}">${t}</a>`).join('')}
      </div>
      <div class="gallery-grid">
        ${images.map(img => `
          <div class="gallery-item glass-card">
            <img src="/images/${img.file}" alt="${img.description}">
            <p>${img.description}</p>
            <div class="tags">
              ${img.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>
        `).join('')}
        ${images.length === 0 ? '<p class="empty-state">No photos yet!</p>' : ''}
      </div>
    </section>
  `;

  return baseLayout(content, `Gallery${tag ? ` - ${tag}` : ''} | Digital Garden`);
}
