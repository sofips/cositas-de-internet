import axios from 'axios';
import { config } from '../config.js';

export interface Definition {
  term: string;
  definition: string;
  source?: string | null;
}

const OWNER = config.github.user;
const REPO = config.github.repo;
const PATH = 'public/definitions.json';
const API = 'https://api.github.com';

const HEADERS = {
  Authorization: `Bearer ${config.github.token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'cositas-bot',
};

export async function getDefinitionsFromGitHub(): Promise<{ definitions: Definition[]; sha: string }> {
  const url = `${API}/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const res = await axios.get(url, { headers: HEADERS });
  const data = res.data;
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  const definitions: Definition[] = JSON.parse(content || '[]');
  return { definitions, sha: data.sha };
}

export async function addDefinitionViaGitHubAPI(newDef: Definition): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { definitions: defs, sha } = await getDefinitionsFromGitHub();

    if (defs.some(d => d.term.toLowerCase() === newDef.term.toLowerCase())) {
      return { ok: false, reason: 'exists' };
    }

    defs.push(newDef);
    const newContent = Buffer.from(JSON.stringify(defs, null, 2) + '\n', 'utf8').toString('base64');

    const url = `${API}/repos/${OWNER}/${REPO}/contents/${PATH}`;
    await axios.put(url, {
      message: `🤖 Bot: agregar palabra '${newDef.term}'`,
      content: newContent,
      sha,
      committer: { name: config.git.authorName, email: config.git.authorEmail },
    }, { headers: HEADERS });

    return { ok: true };
  } catch (err: any) {
    console.error('Git API error:', err?.response?.data || err.message || err);
    return { ok: false, reason: 'error' };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

/** Crea una nota (sin tag `public`) con estado semilla. Si `visible`, aparece en el widget/grilla del sitio. */
export async function addSeedViaGitHubAPI(idea: string, visible = false): Promise<{ ok: boolean; slug?: string; reason?: string }> {
  try {
    const firstLine = idea.split('\n')[0].trim();
    const words = firstLine.split(/\s+/).slice(0, 8).join(' ');
    const title = words.length < firstLine.length ? `${words}…` : words;
    const base = slugify(words) || `semilla-${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];

    const content = `---
title: "${title.replace(/"/g, '\\"')}"
tags: [semilla]
estado: "🌱 semilla"
${visible ? 'visible: true\n' : ''}created: ${date}
updated: ${date}
---

# ${title}

**Estado:** 🌱 semilla

${idea}
`;

    // Evitar pisar una nota existente: probar base, base-2, base-3...
    for (let i = 1; i <= 20; i++) {
      const slug = i === 1 ? base : `${base}-${i}`;
      const url = `${API}/repos/${OWNER}/${REPO}/contents/notes/${slug}.md`;
      try {
        await axios.put(url, {
          message: `🌱 Bot: nueva semilla '${title}'`,
          content: Buffer.from(content, 'utf8').toString('base64'),
          committer: { name: config.git.authorName, email: config.git.authorEmail },
        }, { headers: HEADERS });
        return { ok: true, slug };
      } catch (err: any) {
        // 422 = el archivo ya existe (falta sha) -> probar otro slug
        if (err?.response?.status === 422) continue;
        throw err;
      }
    }
    return { ok: false, reason: 'exists' };
  } catch (err: any) {
    console.error('Git API error (seed):', err?.response?.data || err.message || err);
    return { ok: false, reason: 'error' };
  }
}

const IMAGES_PATH = 'public/images';
const GALLERY_JSON_PATH = `${IMAGES_PATH}/gallery.json`;

/**
 * Sube una foto a public/images/ y registra su descripción y tags en gallery.json.
 * Son dos commits: primero la imagen, después el JSON.
 * Si la imagen se sube pero el JSON falla, devuelve reason 'metadata' (la foto igual queda en la galería, sin descripción).
 */
export async function addPhotoViaGitHubAPI(
  image: Buffer,
  ext: string,
  description: string,
  tags: string[]
): Promise<{ ok: boolean; file?: string; reason?: string }> {
  const base = slugify(description).replace(/-/g, '_') || `foto_${Date.now()}`;
  let file: string | undefined;

  try {
    for (let i = 1; i <= 20; i++) {
      const candidate = `${base}${i === 1 ? '' : `_${i}`}.${ext}`;
      try {
        await axios.put(`${API}/repos/${OWNER}/${REPO}/contents/${IMAGES_PATH}/${candidate}`, {
          message: `📸 Bot: nueva foto '${candidate}'`,
          content: image.toString('base64'),
          committer: { name: config.git.authorName, email: config.git.authorEmail },
        }, { headers: HEADERS });
        file = candidate;
        break;
      } catch (err: any) {
        if (err?.response?.status === 422) continue; // ya existe -> otro nombre
        throw err;
      }
    }
    if (!file) return { ok: false, reason: 'exists' };
  } catch (err: any) {
    console.error('Git API error (photo upload):', err?.response?.data || err.message || err);
    return { ok: false, reason: 'error' };
  }

  try {
    const url = `${API}/repos/${OWNER}/${REPO}/contents/${GALLERY_JSON_PATH}`;
    const res = await axios.get(url, { headers: HEADERS });
    const list: { file: string; description: string; tags: string[] }[] =
      JSON.parse(Buffer.from(res.data.content, 'base64').toString('utf8') || '[]');

    list.push({ file, description, tags });

    await axios.put(url, {
      message: `📸 Bot: metadata de '${file}'`,
      content: Buffer.from(JSON.stringify(list, null, 2), 'utf8').toString('base64'),
      sha: res.data.sha,
      committer: { name: config.git.authorName, email: config.git.authorEmail },
    }, { headers: HEADERS });

    return { ok: true, file };
  } catch (err: any) {
    console.error('Git API error (gallery.json):', err?.response?.data || err.message || err);
    return { ok: false, file, reason: 'metadata' };
  }
}

const SITES_PATH = 'public/external-sites.json';

export interface Site {
  url: string;
  title: string;
  description: string;
}

export async function getSitesFromGitHub(): Promise<{ sites: Site[]; sha: string }> {
  const res = await axios.get(`${API}/repos/${OWNER}/${REPO}/contents/${SITES_PATH}`, { headers: HEADERS });
  const sites: Site[] = JSON.parse(Buffer.from(res.data.content, 'base64').toString('utf8') || '[]');
  return { sites, sha: res.data.sha };
}

/** Agrega un sitio a la lista de "Voy a tener suerte". `isDuplicate` decide si ya estaba. */
export async function addSiteViaGitHubAPI(
  site: Site,
  isDuplicate: (existing: Site) => boolean
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { sites, sha } = await getSitesFromGitHub();
    if (sites.some(isDuplicate)) return { ok: false, reason: 'exists' };

    sites.push(site);
    await axios.put(`${API}/repos/${OWNER}/${REPO}/contents/${SITES_PATH}`, {
      message: `🎲 Bot: agregar sitio '${site.title}'`,
      content: Buffer.from(JSON.stringify(sites, null, 2) + '\n', 'utf8').toString('base64'),
      sha,
      committer: { name: config.git.authorName, email: config.git.authorEmail },
    }, { headers: HEADERS });
    return { ok: true };
  } catch (err: any) {
    console.error('Git API error (site):', err?.response?.data || err.message || err);
    return { ok: false, reason: 'error' };
  }
}
