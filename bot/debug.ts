import axios from 'axios';

const term = process.argv[2] || 'sapo';

function snippet(text: string, maxLength = 2500): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...<truncated>` : text;
}

(async () => {
  try {
    const url = `https://es.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1`;

    console.log('URL:', url);

    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'cositas-bot/1.0',
      },
    });

    const pages = response.data?.query?.pages;
    console.log('pages meta:', JSON.stringify(pages?.map((page: any) => ({
      title: page.title,
      missing: page.missing,
      pageid: page.pageid,
    })), null, 2));

    if (!Array.isArray(pages) || pages.length === 0) {
      console.log('No pages returned');
      process.exit(1);
    }

    const page = pages[0];
    const revision = page?.revisions?.[0];
    const content =
      revision?.slots?.main?.content ??
      revision?.content ??
      '';

    console.log('--- RAW WIKITEXT START ---');
    console.log(snippet(String(content)));
    console.log('--- RAW WIKITEXT END ---');

    const lines = String(content).split(/\r?\n/);
    const spanishMatches = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) =>
        /^(=+)\s*(español|espanol|idioma español|lengua española|lengua|es)\s*\1\s*$/i.test(line.trim()) ||
        /\{\{\s*lengua\|es\s*\}\}/i.test(line) ||
        /\{\{\s*es\s*\}\}/i.test(line)
      );

    console.log('Spanish header matches:', JSON.stringify(spanishMatches, null, 2));

    const definitions = lines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter(({ line }) => /^#\s+/.test(line));

    console.log('First definitions:', JSON.stringify(definitions.slice(0, 20), null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('DEBUG ERROR:', error?.response?.data || error?.message || error);
    process.exit(1);
  }
})();
