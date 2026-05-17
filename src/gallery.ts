import fs from 'fs';
import path from 'path';

export interface GalleryImage {
  file: string;
  description: string;
  tags: string[];
}

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const GALLERY_JSON = path.join(IMAGES_DIR, 'gallery.json');

export function getGalleryImages(): GalleryImage[] {
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
