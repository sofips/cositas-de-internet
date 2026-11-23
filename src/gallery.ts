import fs from 'fs';
import path from 'path';

export interface GalleryImage {
  file: string;
  description: string;
  tags: string[];
}

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const GALLERY_JSON = path.join(IMAGES_DIR, 'gallery.json');

// Like getAllNotes() in notes.ts, this hits the filesystem (readdirSync + gallery.json parse) and
// is called once per generated page from templates.ts' baseLayout(). Cache it and let
// invalidateGalleryCache() clear it when images/gallery.json actually change.
let galleryCache: GalleryImage[] | null = null;

export function invalidateGalleryCache(): void {
  galleryCache = null;
}

export function getGalleryImages(): GalleryImage[] {
  if (galleryCache) return galleryCache;

  const imageFiles = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

  let metadata: Record<string, { description: string; tags: string[] }> = {};

  if (fs.existsSync(GALLERY_JSON)) {
    try {
      const json: GalleryImage[] = JSON.parse(fs.readFileSync(GALLERY_JSON, 'utf-8'));
      json.forEach(img => {
        metadata[img.file] = { description: img.description, tags: img.tags };
      });
    } catch (e) {
      console.error('Error reading gallery.json:', e);
    }
  }

  const gallery: GalleryImage[] = imageFiles.map(file => ({
    file,
    description: metadata[file]?.description || '',
    tags: metadata[file]?.tags || [],
  }));

  gallery.sort((a, b) => b.file.localeCompare(a.file));
  galleryCache = gallery;
  return gallery;
}

export function syncGalleryJson(): GalleryImage[] {
  const gallery = getGalleryImages();
  const newJson = JSON.stringify(gallery, null, 2);
  const existing = fs.existsSync(GALLERY_JSON) ? fs.readFileSync(GALLERY_JSON, 'utf-8') : '';

  if (newJson !== existing) {
    fs.writeFileSync(GALLERY_JSON, newJson);
    console.log('📸 Updated gallery.json with new images!');
  }

  return gallery;
}
