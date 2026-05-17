import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const today = new Date().toISOString().split('T')[0];
const stagedFiles = process.argv.slice(2);

if (stagedFiles.length === 0) process.exit(0);

const repoRoot = process.cwd();

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

  if (modified) {
    fs.writeFileSync(absPath, content, 'utf-8');
    execSync(`git add "${relPath}"`, { cwd: repoRoot });
    console.log(`[update-note-dates] updated ${relPath}`);
  }
}
