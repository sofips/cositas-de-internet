import axios from 'axios';

export interface DictionaryResult {
  term: string;
  definition: string;
  source: string | null;
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[:;,\-–—]+\s*/, '')
    .trim();
}

function replaceUsefulTemplates(text: string): string {
  return text.replace(/\{\{([^{}]+)\}\}/g, (_match, inner) => {
    const parts = String(inner)
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return '';
    }

    const name = parts[0].toLowerCase();
    const args = parts.slice(1);

    const passthroughTemplates = new Set([
      'plm',
      'csem',
      'l',
      't',
      'uso',
      'ámbito',
      'ambito',
      'sinónimo',
      'sinonimo',
      'hiperónimo',
      'hiperonimo',
    ]);

    if (passthroughTemplates.has(name)) {
      return args[0] || '';
    }

    return '';
  });
}

function cleanWikiText(text: string): string {
  return normalizeText(
    replaceUsefulTemplates(
      text
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/'''+/g, '')
        .replace(/''/g, '')
    )
  );
}

function extractDefinitionFromWikitext(wikitext: string): string | null {
  const lines = wikitext.split(/\r?\n/);

  const spanishSectionHeaderRegex = /^==\s*\{\{lengua\|es\}\}\s*==$/i;
  const definitionLineRegex = /^;\s*\d+\s*:?\s*(.*)$/;

  let inSpanishSection = false;
  let fallbackDefinition: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (spanishSectionHeaderRegex.test(line)) {
      inSpanishSection = true;
      continue;
    }

    if (!inSpanishSection) {
      continue;
    }

    const sectionHeaderMatch = line.match(/^===+\s*.*\s*===+$/);
    if (sectionHeaderMatch && !/^===\s*\{\{sustantivo|^===\s*\{\{adjetivo|^===\s*\{\{verbo|^===\s*\{\{adverbio|^===\s*\{\{interjección|^===\s*\{\{interjeccion/i.test(line)) {
      continue;
    }

    const definitionMatch = line.match(definitionLineRegex);
    if (!definitionMatch) {
      continue;
    }

    const cleaned = cleanWikiText(definitionMatch[1]);
    if (!cleaned) {
      continue;
    }

    if (!fallbackDefinition) {
      fallbackDefinition = cleaned;
    }

    return cleaned;
  }

  return fallbackDefinition;
}

async function fetchWiktionaryWikitext(term: string): Promise<string | null> {
  const url = `https://es.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1`;

  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'cositas-bot/1.0',
    },
  });

  const pages = response.data?.query?.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    return null;
  }

  const page = pages[0];
  if (!page || page.missing) {
    return null;
  }

  const revision = page.revisions?.[0];
  const content =
    revision?.slots?.main?.content ??
    revision?.content ??
    '';

  return typeof content === 'string' && content.trim() ? content : null;
}

export async function searchDefinition(term: string): Promise<DictionaryResult | null> {
  try {
    const wikitext = await fetchWiktionaryWikitext(term);
    if (!wikitext) {
      return null;
    }

    const definition = extractDefinitionFromWikitext(wikitext);
    if (!definition) {
      return null;
    }

    return {
      term,
      definition,
      source: `https://es.wiktionary.org/wiki/${encodeURIComponent(term)}`,
    };
  } catch (error: any) {
    console.error('searchDefinition error:', error?.message || error);
    return null;
  }
}
