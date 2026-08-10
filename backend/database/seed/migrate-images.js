import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from '../client.js';
import { getCloudinary } from '../../cloudinary/client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '..', '..', '..', 'images');

const CLOUDINARY_FOLDER = 'unsorted/products';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.bmp', '.jfif', '.pjpeg', '.pjp'];

// Repeatedly strip known image extensions so "nakada.jpg.jpeg" -> "nakada".
function coreName(filename) {
  let name = filename;
  let previous;
  do {
    previous = name;
    const lower = name.toLowerCase();
    for (const ext of IMAGE_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        name = name.slice(0, -ext.length);
        break;
      }
    }
  } while (name !== previous);
  return name;
}

// Folded key for matching: lowercase alphanumerics joined by "_".
function fold(value) {
  return coreName(String(value ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// A product is already migrated when its image_url points at Cloudinary.
function isCloudinaryUrl(value) {
  return /cloudinary\.com/.test(String(value ?? '').toLowerCase());
}

function buildImageIndex(filenames) {
  const byName = new Map();
  const byFold = new Map();
  for (const name of [...filenames].sort()) {
    const full = path.join(IMAGES_DIR, name);
    byName.set(name.toLowerCase(), full);
    const key = fold(name);
    if (key && !byFold.has(key)) byFold.set(key, full);
  }
  return { byName, byFold };
}

// Map a product image_url to an existing file in /images, or undefined.
function resolveImageFile(imageUrl, index) {
  const raw = String(imageUrl ?? '').trim();
  if (!raw) return undefined;

  const basename = path.basename(raw);
  if (!basename) return undefined;

  if (index.byName.has(basename.toLowerCase())) {
    return index.byName.get(basename.toLowerCase());
  }

  const key = fold(basename);
  if (key && index.byFold.has(key)) return index.byFold.get(key);

  return undefined;
}

// Cloudinary public id fragment derived from the file name, e.g. "shirt 1.jpg" -> "shirt_1".
function sanitizePublicId(filename) {
  return coreName(filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[migrate-images] Supabase is not configured — set SUPABASE_URL and a service-role key in .env');
    process.exit(1);
  }

  const cloudinary = getCloudinary();
  if (!cloudinary) {
    console.error('[migrate-images] Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env');
    process.exit(1);
  }

  const imagesFolderExists = fs.existsSync(IMAGES_DIR);
  const files = imagesFolderExists
    ? await fs.promises.readdir(IMAGES_DIR, { withFileTypes: true })
    : [];
  const index = buildImageIndex(
    files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(jpe?g|png|webp|gif|avif|svg|bmp)$/i.test(name)),
  );

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .order('id', { ascending: true });

  if (error) {
    console.error('[migrate-images] failed to read products:', error.message);
    process.exit(1);
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const total = products?.length ?? 0;

  for (let i = 0; i < total; i += 1) {
    const product = products[i];
    console.log(`Uploading ${i + 1}/${total}...`);

    if (isCloudinaryUrl(product.image_url)) {
      console.log('  Skipped: already has a Cloudinary URL');
      skipped += 1;
      continue;
    }

    const filePath = resolveImageFile(product.image_url, index);
    if (!filePath) {
      console.error(`  Missing image: no file in ${IMAGES_DIR} for "${product.name}" (${product.image_url || 'no image_url'})`);
      failed += 1;
      continue;
    }

    const fileBase = path.basename(filePath);
    const publicId = sanitizePublicId(fileBase) || `product-${product.id}`;

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        overwrite: true,
      });

      const secureUrl = result?.secure_url ?? result?.url;
      if (!secureUrl) throw new Error('Cloudinary upload returned no URL');

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: secureUrl })
        .eq('id', product.id);

      if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`);

      console.log(`Uploaded: ${fileBase}`);
      console.log('Updated Supabase');
      uploaded += 1;
    } catch (err) {
      console.error(`  Failed: ${err?.message || err}`);
      failed += 1;
    }
  }

  console.log('Migration completed.');
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((err) => {
  console.error('[migrate-images] failed:', err?.message || err);
  process.exit(1);
});