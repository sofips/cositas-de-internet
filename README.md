# Cositas de Internet 🌿

Este es el código de mi [jardín digital personal](https://sofips.github.io/cositas-de-internet/notes/00bienvenida.html).

Para saber más sobre jardines digitales:
[Qué son los jardínes digitales?](https://sofips.github.io/cositas-de-internet/notes/jardines.html)

Disclaimer: Todo este código es altamente experimental.

## ✨ Qué hace?

- 📝 **Notas de Markdown a HTML** - Escribo las notas en markdown y después se genera automáticamente un HTML asociado

- 🔒 **Notas Públicas/Privadas** - La visibilidad de las notas se gestiona con tags en el markdown

- 🏷️ **Sistema de Etiquetas** - Las notas están organizadas con etiquetas temáticas

- 📸 **Galería de Fotos** - Carrusel horizontal con navegación con teclado y filtros por tags

- 📚 **Palabra del Día** - Widget con definiciones desde JSON

- 🎲 **Voy a Tener Suerte** - Botón de sitio web aleatorio desde lista personalizable

- 🔀 **Navegación Aleatoria** - Para explorar notas y fotos al azar

- 🚀 **Generación de Sitio Estático** - Se despliega en GitHub Pages o cualquier host

## 🚀 Inicio Rápido

### Instalar Dependencias

```bash
npm install
```

### Servidor de Desarrollo

```bash
npm run dev
```

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

Estoy trabajando en un bot de telegram para agregarlas desde ahí. Se puede leer más [acá](https://sofips.github.io/cositas-de-internet/notes/bot-de-telegram-para-aprender-nuevas-palabras.html).

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


Para **publicar** (`npm run build`), el generador lee todas las notas públicas, crea una página HTML por cada una, organiza las etiquetas, arma la galería con las fotos, y guarda todo en la carpeta `dist/`. El resultado es un sitio completamente estático (sin servidor) que podés subir a cualquier hosting. Como la hosteo en GitHub, el workflow automatiza genera y publica automáticamente cada vez que hago push.



#### GitHub Pages

1. Habilita GitHub Pages en Settings → Pages
2. Selecciona la rama `gh-pages` (creada automáticamente por el workflow)
3. El sitio se despliega automáticamente con cada push a main

