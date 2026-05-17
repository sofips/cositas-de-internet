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
