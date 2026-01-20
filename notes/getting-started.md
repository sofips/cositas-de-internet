---
title: Getting Started with Notes
tags: [tutorial, tips]
created: 2026-01-13
updated: 2026-01-13
---

# Getting Started with Notes 📝

Learn how to create and manage notes in your digital garden.

## Creating Notes

### Using the CLI

Run the command to create a new note:

```bash
npm run new-note
```

You'll be prompted for:
1. **Title** - The name of your note
2. **Public/Private** - Whether to make it immediately visible

### Manual Creation

Create a new `.md` file in the `notes/` folder with this structure:

```markdown
---
title: Your Note Title
tags: [public, topic1, topic2]
created: 2026-01-13
updated: 2026-01-13
---

# Your Note Title

Your content here...
```

## Visibility System

Notes use a simple tag-based visibility system:

| Tag | Effect |
|-----|--------|
| `public` | Note is visible on the site |
| *(no public tag)* | Note is private (local only) |

### Making a Note Public

Add `public` to the tags array:

```yaml
tags: [public, my-topic]
```

### Keeping Notes Private

Simply omit the `public` tag:

```yaml
tags: [draft, personal]
```

Private notes stay in your `notes/` folder but won't appear on the built site.

## Best Practices

1. **Use descriptive tags** - Makes navigation easier
2. **Update the `updated` date** - Keep track of changes
3. **Link between notes** - Use relative links: `[My Note](/notes/my-note)`
4. **Start messy** - Perfect is the enemy of good. Plant seeds! 🌱

## Supported Markdown

- **Bold** and *italic* text
- [Links](https://example.com)
- `inline code` and code blocks
- Lists (ordered and unordered)
- Blockquotes
- Images
- Tables
- And more!
