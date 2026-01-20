import * as fs from 'fs';
import * as path from 'path';

export interface GalleryImage {
  file: string;
  description: string;
  tags: string[];
}

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const GALLERY_JSON = path.join(IMAGES_DIR, 'gallery.json');

export function getGalleryImages(): GalleryImage[] {
  // Get all image files from the directory
  const imageFiles = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
  
  // Load existing metadata from gallery.json
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
  
  // Build gallery array - auto-adds new images with defaults
  const gallery: GalleryImage[] = imageFiles.map(file => ({
    file,
    description: metadata[file]?.description || '',
    tags: metadata[file]?.tags || []
  }));
  
  // Sort by filename descending (most recent first)
  gallery.sort((a, b) => b.file.localeCompare(a.file));
  
  // Auto-update gallery.json with any new images
  const currentJson = JSON.stringify(gallery, null, 2);
  const existingJson = fs.existsSync(GALLERY_JSON) 
    ? fs.readFileSync(GALLERY_JSON, 'utf-8') 
    : '';
  
  if (currentJson !== existingJson) {
    fs.writeFileSync(GALLERY_JSON, currentJson);
    console.log('📸 Updated gallery.json with new images!');
  }
  
  return gallery;
}
