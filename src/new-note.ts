import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTES_DIR = path.join(__dirname, '../notes');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function createNote(title: string, isPublic: boolean): void {
  // Ensure notes directory exists
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }

  const slug = slugify(title);
  const filePath = path.join(NOTES_DIR, `${slug}.md`);
  const date = new Date().toISOString().split('T')[0];
  const tags = isPublic ? ['public'] : [];

  const content = `---
title: ${title}
tags: [${tags.join(', ')}]
created: ${date}
updated: ${date}
---

# ${title}

Start writing your note here...
`;

  if (fs.existsSync(filePath)) {
    console.log(`\n⚠️  A note with the slug "${slug}" already exists!`);
    console.log(`   Edit: notes/${slug}.md`);
    return;
  }

  fs.writeFileSync(filePath, content);

  console.log(`\n🌱 New note created!`);
  console.log(`   📁 File: notes/${slug}.md`);
  console.log(`   ${isPublic ? '🔓 Public' : '🔒 Private'}`);
  console.log(`\n💡 Tip: Add 'public' to tags to make it visible`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n🌿 Create a new note\n');

rl.question('📝 Title: ', (title) => {
  if (!title.trim()) {
    console.log('❌ Title is required');
    rl.close();
    return;
  }

  rl.question('🔓 Make it public? (y/N): ', (answer) => {
    const isPublic = answer.toLowerCase() === 'y';
    createNote(title.trim(), isPublic);
    rl.close();
  });
});
