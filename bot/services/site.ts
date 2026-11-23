import axios from 'axios';
import net from 'net';

/** Normaliza lo que mande el usuario a una URL http(s) válida, o null si no sirve. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    if (isPrivateHost(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// El bot descarga la página desde el servidor: no permitir localhost ni redes privadas.
function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (net.isIPv6(host)) return true;
  if (net.isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

/** Clave para comparar duplicados: sin esquema, sin www ni barra final. */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
}

/** Intenta leer el <title> de la página. Devuelve null si falla (el usuario lo escribe a mano). */
export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout: 8000,
      maxContentLength: 500_000,
      maxRedirects: 3,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; cositas-bot)' },
    });
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(res.data));
    const title = m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
    return title ? title.slice(0, 100) : null;
  } catch {
    return null;
  }
}
