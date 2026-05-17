---
title: Lista de sitios aleatorios
tags: [public, meta, estado-arbol]
estado: "🌳 árbol"
created: 2026-01-19
updated: 2026-05-17
---

# Lista de sitios aleatorios

**Estado:** 🌳 árbol

Esta lista reúne algunos de los sitios web externos que se abren al azar cuando hacés clic en el botón "voy a tener suerte".

## Sitios web

<div id="external-sites-list">Cargando...</div>

*Todos los enlaces se abren en una nueva pestaña.*

<script>
  // Load and display external sites list
  const basePath = window.BASE_PATH || '';
  fetch(basePath + '/external-sites.json')
    .then(r => r.json())
    .then(sites => {
      const listEl = document.getElementById('external-sites-list');
      if (Array.isArray(sites) && sites.length) {
        listEl.innerHTML = '<ul>' + sites.map(site => 
          `<li><a href="${site.url}" target="_blank" rel="noopener"><strong>${site.title}</strong> - ${site.description}</a></li>`
        ).join('') + '</ul>';
      } else {
        listEl.innerHTML = '<p>No hay sitios disponibles.</p>';
      }
    })
    .catch(() => {
      document.getElementById('external-sites-list').innerHTML = '<p>Error al cargar la lista.</p>';
    });
</script>
