# Cositas de Internet 🌿

Un jardín digital personal con estética retro pixel/Frutiger Aero. Toma notas en Markdown, comparte fotos, aprende palabras nuevas y descubre sitios web curiosos.

## ✨ Características

- 🎨 **Diseño Retro Pixel** - Glass morphism, gradientes, burbujas flotantes, estrellas y peces
- 📝 **Notas en Markdown** - Escribe en formato Markdown simple con enlaces entre notas
- 🔒 **Notas Públicas/Privadas** - Controla visibilidad con tags
- 🏷️ **Sistema de Etiquetas** - Organiza y navega notas por tema
- 📸 **Galería de Fotos** - Carrusel horizontal con modal, navegación con teclado y filtros por tags
- 📚 **Palabra del Día** - Widget con definiciones desde JSON
- 🎲 **Voy a Tener Suerte** - Botón de sitio web aleatorio desde lista personalizable
- 🔀 **Navegación Aleatoria** - Explora notas y fotos al azar
- 🚀 **Generación de Sitio Estático** - Despliega en GitHub Pages, Neocities o cualquier host

## 🚀 Inicio Rápido

### Instalar Dependencias

```bash
npm install
```

### Servidor de Desarrollo

```bash
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000) para ver tu jardín.

### Crear una Nueva Nota

```bash
npm run new-note
```

O crea manualmente un archivo `.md` en la carpeta `notes/`.

### Compilar para Producción

```bash
npm run build
```

Los archivos estáticos se generan en la carpeta `dist/`.

## 📝 Formato de Notas

Las notas usan frontmatter YAML para metadatos:

```markdown
---
title: Título de Mi Nota
tags: [public, tema1, tema2]
created: 2026-01-13
updated: 2026-01-13
---

# Título de Mi Nota

Tu contenido aquí en Markdown...
```

### Enlaces Entre Notas

Soporta varios formatos:
- `[[slug]]` - Wikilink simple
- `[[texto personalizado|slug]]` - Wikilink con texto
- `[texto](slug)` - Link Markdown relativo
- `[texto](/notes/slug)` - Link Markdown absoluto

Todos se convierten automáticamente a `/notes/slug.html` para compatibilidad estática.

## 🔐 Visibilidad

- Con tag `public` → La nota aparece en el sitio
- Sin tag `public` → La nota permanece privada (solo local)

## 📸 Galería de Fotos

1. Agrega imágenes a `public/images/`
2. Edita `public/images/gallery.json` para agregar descripciones y tags:

```json
[
  {
    "file": "mi-foto.jpg",
    "description": "Descripción de la foto",
    "tags": ["viaje", "amigos", "foto"]
  }
]
```

3. Las fotos se ordenan automáticamente por nombre (más reciente primero)
4. Clic en una foto abre modal con navegación

## 📚 Palabra del Día

Edita `public/definitions.json` para agregar palabras:

```json
[
  {
    "term": "Término",
    "definition": "Definición breve",
    "source": "https://fuente.com" 
  }
]
```

## 🎲 Voy a Tener Suerte

Edita `public/external-sites.json` para personalizar sitios aleatorios:

```json
[
  {
    "url": "https://ejemplo.com",
    "title": "Nombre del Sitio",
    "description": "Breve descripción"
  }
]
```

## 📁 Estructura del Proyecto

```
├── notes/              # Tus notas en Markdown
│   ├── bienvenida.md
│   ├── aleatorio.md   # Lista de sitios aleatorios
│   └── ...
├── public/            
│   ├── styles.css     # Estilos del sitio
│   ├── definitions.json
│   ├── external-sites.json
│   └── images/
│       ├── gallery.json
│       └── *.jpg/png
├── src/
│   ├── server.ts      # Servidor de desarrollo
│   ├── build.ts       # Generador de sitio estático
│   ├── notes.ts       # Lógica de parsing de notas
│   ├── templates.ts   # Templates HTML
│   ├── gallery.ts     # Gestión de galería
│   └── new-note.ts    # CLI para crear notas
├── dist/              # Sitio compilado
└── package.json
```

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime
- **TypeScript** - Lenguaje tipado
- **Express** - Servidor de desarrollo
- **tsx** - Ejecutor de TypeScript

### Procesamiento de Contenido
- **marked** - Parser de Markdown a HTML
- **gray-matter** - Parser de frontmatter YAML
- **chokidar** - File watcher para hot reload

### Frontend
- **HTML5/CSS3** - Estructura y estilos
- **Vanilla JavaScript** - Interactividad (modal, random, fetch)
- Sin frameworks - Todo generado estáticamente

### Build & Deploy
- Generación de sitio estático a `/dist`
- Compatible con GitHub Pages, Neocities, Netlify, Vercel
- GitHub Actions workflow incluido

### ¿Cómo funciona?

En **desarrollo** (`npm run dev`), Express sirve el sitio localmente y detecta cuando guardás cambios en tus notas. Cuando editás un `.md`, el sistema lee el frontmatter (título, tags, fechas), convierte el Markdown a HTML, y muestra los cambios automáticamente en el navegador.

Para **publicar** (`npm run build`), el generador lee todas tus notas públicas, crea una página HTML por cada una, organiza las etiquetas, arma la galería con las fotos, y guarda todo en la carpeta `dist/`. El resultado es un sitio completamente estático (sin servidor) que podés subir a GitHub Pages, Neocities o cualquier hosting. Si usás GitHub, el workflow automatiza esto: cada vez que hacés push, se genera y publica automáticamente.

## 🎨 Personalización

### Colores

Edita `public/styles.css` y modifica las variables CSS:

```css
:root {
  --primary-bg: #0a0e27;
  --fuchsia: #ff00ff;
  --cyan-bright: #00ffff;
  --purple: #9d00ff;
  /* ... más variables */
}
```

### Título del Sitio

Modifica la constante `SITE_TITLE` en `src/templates.ts`.

### Animaciones de Fondo

Ajusta `.bubble`, `.fish`, `.star` en `styles.css` para cambiar cantidad o velocidad.

## 🚀 Deploy

El comando `npm run build` genera un sitio estático en `dist/`. Despliega en:

### GitHub Pages

1. Habilita GitHub Pages en Settings → Pages
2. Selecciona la rama `gh-pages` (creada automáticamente por el workflow)
3. El sitio se despliega automáticamente con cada push a main

### Neocities

1. Compila: `npm run build`
2. Sube el contenido de `dist/` a Neocities

### Otros Hosts

Compatible con Netlify, Vercel, Cloudflare Pages y cualquier hosting estático.

## 📋 Cache Busting

El sitio usa cache-busting automático basado en timestamp para CSS y JSON, asegurando que los usuarios vean siempre la versión más reciente.

## 🎯 Características Avanzadas

- **Modal de fotos** con navegación por teclado (flechas, Escape)
- **Responsive design** con colapso de sidebar en móviles
- **Links entre notas** con reescritura automática para compatibilidad estática
- **Scroll horizontal** en carrusel de fotos con scrollbar personalizada
- **Fetch dinámico** de definiciones y sitios externos desde JSON

## 📝 Notas

- Los archivos en `dist/` se generan automáticamente - no los edites manualmente
- `gallery.json` se actualiza automáticamente al detectar nuevas imágenes
- El random button incluye tanto notas como categorías de fotos

## 📄 Licencia

MIT
