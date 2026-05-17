import { Note, getAllNotes } from './notes.js';
import { getGalleryImages } from './gallery.js';

const SITE_TITLE = '✧ Cositas de Internet ✧';
const BASE_PATH = process.env.BASE_PATH || '';

// Generate random data for all pages
function getRandomData(): string {
  const notes = getAllNotes();
  const images = getGalleryImages();
  
  const noteLinks = notes.map(n => BASE_PATH + '/notes/' + n.slug + '.html');
  const photoTags = [...new Set(images.flatMap(img => img.tags))];
  const photoLinks = photoTags.map(t => BASE_PATH + '/fotos/' + encodeURIComponent(t) + '.html');
  
  return JSON.stringify([...noteLinks, ...photoLinks, BASE_PATH + '/fotos/']);
}

function estadoDisplay(estado?: string): string {
  if (!estado) return '';
  return `<span class="note-estado"><strong>Estado:</strong> ${estado}</span>`;
}

export function baseLayout(content: string, title = SITE_TITLE): string {
  const randomLinks = getRandomData();
  const ASSET_VERSION = String(Math.floor(Date.now() / 1000));
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=Space+Mono:wght@400;700&family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE_PATH}/styles.css?v=${ASSET_VERSION}">
  <script>
    // Global BASE_PATH for client-side scripts
    window.BASE_PATH = '${BASE_PATH}';
  </script>
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
  
  <!-- Stars ★ -->
  <div class="star star-1">★</div>
  <div class="star star-2">✦</div>
  <div class="star star-3">★</div>
  <div class="star star-4">✦</div>
  <div class="star star-5">★</div>
  <div class="star star-6">✦</div>
  <div class="star star-7">✧</div>
  <div class="star star-8">✧</div>
  
  <nav class="glass-nav">
    <a href="${BASE_PATH}/" class="logo">Cositas de Internet</a>
    <div class="nav-links">
      <a href="${BASE_PATH}/">Inicio</a>
      <a href="${BASE_PATH}/fotos/">Fotos</a>
      <a href="${BASE_PATH}/tags/">Etiquetas</a>
      <button onclick="goRandom()" class="random-btn">🔀</button>
    </div>
  </nav>
  
  <main class="container">
    ${content}
  </main>
  
  <footer class="glass-footer">
    <p>~*~ hecho con ♥ y pixeles ~*~</p>
  </footer>
  
  <!-- Image Modal -->
  <div id="image-modal" class="image-modal">
    <button class="modal-close">✕</button>
    <button class="modal-prev">◀</button>
    <button class="modal-next">▶</button>
    <div class="modal-content">
      <img id="modal-img" src="" alt="">
      <div class="modal-info">
        <p id="modal-description"></p>
        <div id="modal-tags" class="modal-tags"></div>
      </div>
    </div>
  </div>
  
  <script>
    // Image Modal with Navigation
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalDesc = document.getElementById('modal-description');
    const modalTags = document.getElementById('modal-tags');
    const closeBtn = document.querySelector('.modal-close');
    const prevBtn = document.querySelector('.modal-prev');
    const nextBtn = document.querySelector('.modal-next');
    const slides = Array.from(document.querySelectorAll('.carousel-slide, .gallery-item'));
    let currentIndex = 0;
    
    function showImage(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;
      
      const slide = slides[currentIndex];
      const img = slide.querySelector('img');
      const desc = slide.dataset.description || '';
      const tags = slide.dataset.tags || '';
      
      modalImg.src = img.src;
      modalDesc.textContent = desc;
      modalTags.innerHTML = tags.split(',').filter(t => t.trim())
        .map(t => '<a href="' + window.BASE_PATH + '/fotos/' + encodeURIComponent(t.trim()) + '.html" class="tag">' + t.trim() + '</a>').join('');
    }
    
    slides.forEach((slide, idx) => {
      slide.addEventListener('click', () => {
        currentIndex = idx;
        showImage(currentIndex);
        modal.classList.add('active');
      });
    });
    
    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex - 1); });
    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex + 1); });
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') modal.classList.remove('active');
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    });
    
    // Word of the Day
    (function() {
      const termEl = document.getElementById('word-term');
      const defEl = document.getElementById('word-definition');
      const srcEl = document.getElementById('word-source');
      if (!termEl || !defEl) return;
      
      function pickRandom(list) {
        return list[Math.floor(Math.random() * list.length)];
      }
      
      function renderWord(item) {
        termEl.textContent = item.term || 'Palabra';
        defEl.textContent = item.definition || '';
        if (item.source) {
          srcEl.href = item.source;
          srcEl.style.display = '';
        } else {
          srcEl.style.display = 'none';
        }
      }
      
      function loadWord() {
        const basePath = '${BASE_PATH}';
        fetch(basePath + '/definitions.json?v=${ASSET_VERSION}')
          .then(r => r.json())
          .then(arr => {
            if (Array.isArray(arr) && arr.length) {
              renderWord(pickRandom(arr));
              // expose for refresh button
              window.__refreshWord = () => renderWord(pickRandom(arr));
            } else {
              termEl.textContent = 'Sin palabras';
              defEl.textContent = 'Agrega definiciones en /public/definitions.json';
            }
          })
          .catch(() => {
            termEl.textContent = 'Sin conexión';
            defEl.textContent = 'No se pudo cargar el diccionario.';
          });
      }
      loadWord();
    })();
    
    // Random button - uses pre-generated links
    const randomLinks = ${randomLinks};
    function goRandom() {
      if (randomLinks.length > 0) {
        window.location.href = randomLinks[Math.floor(Math.random() * randomLinks.length)];
      }
    }
    
    // External sites for luck button - loaded from JSON
    let externalSitesLoaded = false;
    let externalSites = [];
    const basePath = '${BASE_PATH}';
    
    fetch(basePath + '/external-sites.json?v=${ASSET_VERSION}')
      .then(r => r.json())
      .then(sites => {
        if (Array.isArray(sites) && sites.length) {
          externalSites = sites;
          externalSitesLoaded = true;
        }
      })
      .catch(err => {
        console.warn('No se pudo cargar la lista de sitios externos:', err);
      });
    
    function goExternal() {
      if (!externalSitesLoaded || externalSites.length === 0) {
        alert('⏳ La lista de sitios aún se está cargando. Intentá de nuevo en un momento.');
        return;
      }
      const site = externalSites[Math.floor(Math.random() * externalSites.length)];
      if (site && site.url) {
        window.open(site.url, '_blank', 'noopener,noreferrer');
      }
    }
  </script>

  <!-- Bubble Cursor Effect -->
  <script type="module">
    import { bubbleCursor } from 'https://unpkg.com/cursor-effects@latest/dist/esm.js';
    
    bubbleCursor({
      fillColor: "#f771b4",
      strokeColor: "#e6f1f7",
    });
  </script>
</body>
</html>`;
}

export function homeTemplate(notes: Note[]): string {
  const noteCards = notes.map(note => `
    <article class="note-card glass-card">
      <a href="${BASE_PATH}/notes/${note.slug}.html">
        <h2>${note.title}</h2>
        <div class="note-meta">
          <span class="date">Creado: ${note.createdAt.toLocaleDateString()}</span>
          <span class="date">Actualizado: ${note.updatedAt.toLocaleDateString()}</span>
          ${estadoDisplay(note.estado)}
        </div>
        <div class="tags">
          ${note.tags.filter(t => t !== 'public').map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <p class="preview">${note.content.replace(/^\*\*Estado:\*\*\s*.+\n?/m, '').slice(0, 150).replace(/[#*_`]/g, '')}...</p>
      </a>
    </article>
  `).join('');

  const content = `
    <section class="hero glass-card">
      <div class="hero-badge">[ bienvenidx.exe ]</div>
      <h1>Cositas de Internet</h1>
      <p>~*~ Jardín Digital de @sofitaps ~*~</p>
      <div class="hero-pixels">
        <span>♦</span><span>◆</span><span>✦</span><span>◇</span><span>♦</span>
      </div>
    </section>

    <!-- Notes Section -->
    <h2 class="section-title notes-title"><span class="pixel-arrow">▸</span> Notas <span class="blink">_</span></h2>
    <section class="notes-grid">
      ${noteCards || '<p class="empty-state">No hay notas todavía... ¡hora de plantar semillas!</p>'}
    </section>
    
    <!-- Media Row: Gallery + Sidebar -->
    <section class="media-row">
      <div class="carousel-section glass-card">
        <h2 class="section-title"><span class="pixel-arrow">▸</span> Fotos <span class="blink">_</span></h2>
        <div class="carousel">
          <div class="carousel-track-container">
            <div class="carousel-track">
              ${getGalleryImages().map(img => `
              <div class="carousel-slide" data-description="${img.description}" data-tags="${img.tags.join(', ')}">
                <img src="${BASE_PATH}/images/${img.file}" alt="${img.description || img.file}">
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="sidebar-cards">
        <aside class="definition-card glass-card">
          <div class="definition-badge">[ PALABRA DEL DÍA ]</div>
          <h3 id="word-term">Cargando...</h3>
          <p id="word-definition" class="definition-text">Esperando una palabra bonita.</p>
          <a id="word-source" class="definition-source" href="#" target="_blank" rel="noopener" style="display:none">fuente ↗</a>
          <button class="definition-refresh" onclick="window.__refreshWord && window.__refreshWord()">Otra ✨</button>
        </aside>
        
        <aside class="definition-card glass-card">
          <div class="definition-badge">[ VOY A TENER SUERTE ]</div>
          <button class="definition-refresh" onclick="goExternal()">sitio web al azar ✨</button>
          <a class="definition-source" href="${BASE_PATH}/notes/aleatorio.html">ver lista completa ↗</a>
        </aside>
      </div>
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
          <span class="date">Actualizado: ${note.updatedAt.toLocaleDateString('es-ES')}</span>
          <span class="date">Creado: ${note.createdAt.toLocaleDateString('es-ES')}</span>
        </div>
        <div class="tags">
          ${note.tags.filter(t => t !== 'public').map(tag => `<a href="${BASE_PATH}/tags/${tag}.html" class="tag">${tag}</a>`).join('')}
        </div>
        ${estadoDisplay(note.estado)}
      </header>
      <div class="note-content">
        ${note.html}
      </div>
      <footer class="note-footer">
        <a href="${BASE_PATH}/" class="back-link">← Volver al principio</a>
      </footer>
    </article>
  `;

  return baseLayout(content, `${note.title} | Cositas de Internet`);
}

export function tagsTemplate(tags: Map<string, number>): string {
  const tagItems = Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `
      <a href="${BASE_PATH}/tags/${tag}.html" class="tag-item glass-card">
        <span class="tag-name">${tag}</span>
        <span class="tag-count">${count}</span>
      </a>
    `).join('');

  const content = `
    <section class="tags-page">
      <h1>Todas las Etiquetas</h1>
      <div class="tags-grid">
        ${tagItems || '<p class="empty-state">¡No hay etiquetas todavía... sigue explorando!</p>'}
      </div>
    </section>
  `;

  return baseLayout(content, 'Etiquetas | Cositas de Internet');
}

export function tagNotesTemplate(tag: string, notes: Note[]): string {
  const noteCards = notes.map(note => `
    <article class="note-card glass-card">
      <a href="${BASE_PATH}/notes/${note.slug}.html">
        <h2>${note.title}</h2>
        <div class="note-meta">
          <span class="date">Creado: ${note.createdAt.toLocaleDateString()}</span>
          <span class="date">Actualizado: ${note.updatedAt.toLocaleDateString()}</span>
          ${estadoDisplay(note.estado)}
        </div>
        <p class="preview">${note.content.replace(/^\*\*Estado:\*\*\s*.+\n?/m, '').slice(0, 150).replace(/[#*_`]/g, '')}...</p>
      </a>
    </article>
  `).join('');

  const content = `
    <section class="tag-notes-page">
      <h1>Etiqueta: ${tag}</h1>
      <a href="${BASE_PATH}/tags/" class="back-link">← Todas las etiquetas</a>
      <div class="notes-grid">
        ${noteCards || '<p class="empty-state">¡No hay notas con esta etiqueta todavía!</p>'}
      </div>
    </section>
  `;

  return baseLayout(content, `${tag} | Cositas de Internet`);
}

export function notFoundTemplate(): string {
  const content = `
    <section class="not-found glass-card">
      <h1>404</h1>
      <p>// Error: Recurso no encontrado en la base de datos</p>
      <a href="${BASE_PATH}/" class="back-link">← Volver al inicio</a>
    </section>
  `;

  return baseLayout(content, '404 | Cositas de Internet');
}

export function galleryTemplate(filterTag?: string): string {
  const images = getGalleryImages();
  const filteredImages = filterTag 
    ? images.filter(img => img.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
    : images;
  
  // Get all unique tags from gallery
  const allTags = [...new Set(images.flatMap(img => img.tags))].sort();
  
  const tagFilters = allTags.map(tag => `
    <a href="${BASE_PATH}/fotos/${encodeURIComponent(tag)}.html" class="tag ${filterTag === tag ? 'active' : ''}">${tag}</a>
  `).join('');
  
  const galleryItems = filteredImages.map(img => `
    <div class="gallery-item" data-description="${img.description}" data-tags="${img.tags.join(', ')}">
      <img src="${BASE_PATH}/images/${img.file}" alt="${img.description || img.file}" loading="lazy">
    </div>
  `).join('');

  const content = `
    <section class="gallery-page">
      <h1><span class="pixel-arrow">▸</span> Fotos ${filterTag ? `<span class="filter-tag">/ ${filterTag}</span>` : ''}</h1>
      <div class="gallery-filters">
        <a href="${BASE_PATH}/fotos/" class="tag ${!filterTag ? 'active' : ''}">Todas</a>
        ${tagFilters}
      </div>
      <div class="gallery-grid">
        ${galleryItems || '<p class="empty-state">¡No hay fotos todavía!</p>'}
      </div>
      <a href="${BASE_PATH}/" class="back-link">← Volver al inicio</a>
    </section>
  `;

  return baseLayout(content, `Fotos${filterTag ? ` - ${filterTag}` : ''} | Cositas de Internet`);
}
