// Very lightweight local image storage for dev/demo purposes.
// In production, replace with uploads to S3/IPFS and save URLs into metadata.

export function savePropertyImages(propertyId: bigint, files: File[]) {
  try {
    const key = mediaKey(propertyId);
    // Only store first 4 as data URLs to limit localStorage size
    const toRead = files.slice(0, 4);
    Promise.all(toRead.map(readAsDataURL)).then((urls) => {
      const payload = { images: urls };
      localStorage.setItem(key, JSON.stringify(payload));
    });
  } catch {}
}

export function getPropertyImages(propertyId: bigint): string[] {
  try {
    const raw = localStorage.getItem(mediaKey(propertyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.images) ? parsed.images : [];
  } catch {
    return [];
  }
}

function mediaKey(propertyId: bigint) {
  return `brickstack_images_${propertyId.toString()}`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


