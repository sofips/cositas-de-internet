import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const today = new Date().toISOString().split('T')[0];
const stagedFiles = process.argv.slice(2);

if (stagedFiles.length === 0) process.exit(0);

const repoRoot = process.cwd();

const STAGES = ['🌱 semilla', '🌿 brote', '🪴 plantita', '🌳 árbol'];

function suggestEstado(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words < 150) return STAGES[0];
  if (words < 350) return STAGES[1];
  if (words < 700) return STAGES[2];
  return STAGES[3];
}

for (const relPath of stagedFiles) {
  const absPath = path.resolve(repoRoot, relPath);

  if (!fs.existsSync(absPath)) continue;

  let content = fs.readFileSync(absPath, 'utf-8');

  if (!content.startsWith('---')) {
    console.log(`[update-note-dates] skipping ${relPath}: no frontmatter`);
    continue;
  }

  const frontmatterEnd = content.indexOf('\n---', 3);
  if (frontmatterEnd === -1) {
    console.log(`[update-note-dates] skipping ${relPath}: malformed frontmatter`);
    continue;
  }

  let modified = false;

  // Inject `created` if missing
  if (!/^created:/m.test(content.slice(0, frontmatterEnd))) {
    content = content.replace(/^---\n/, `---\ncreated: ${today}\n`);
    modified = true;
  }

  // Update or inject `updated`
  const updatedRegex = /^(updated:\s*)(.+)$/m;
  if (updatedRegex.test(content)) {
    const next = content.replace(updatedRegex, `$1${today}`);
    if (next !== content) { content = next; modified = true; }
  } else {
    content = content.replace(/^(created:.+)$/m, `$1\nupdated: ${today}`);
    modified = true;
  }

  // Auto-advance `estado` based on word count (never retreat)
  const body = content.slice(frontmatterEnd + 4); // skip closing ---\n
  const suggested = suggestEstado(body);
  const suggestedIdx = STAGES.indexOf(suggested);

  const estadoMatch = content.match(/^estado:\s*["']?(.+?)["']?\s*$/m);
  const currentEstado = estadoMatch ? estadoMatch[1].trim() : null;
  const currentIdx = currentEstado ? STAGES.indexOf(currentEstado) : -1;

  if (!currentEstado) {
    content = content.replace(/^(updated:.+)$/m, `$1\nestado: "${suggested}"`);
    modified = true;
  } else if (currentIdx >= 0 && suggestedIdx > currentIdx) {
    content = content.replace(/^estado:.*$/m, `estado: "${suggested}"`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(absPath, content, 'utf-8');
    execSync(`git add "${relPath}"`, { cwd: repoRoot });
    console.log(`[update-note-dates] updated ${relPath}`);
  }
}
