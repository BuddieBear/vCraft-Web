const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
export const imageFilename = new RegExp(`^${uuid}\\.webp$`);
const publicImage = new RegExp(`^/uploads/(${uuid}\\.webp)$`);
const privateImage = new RegExp(`^/api/media/batches/(${uuid})/(legacy/)?(${uuid}\\.webp)$`);

export const publicImageFilename = path => publicImage.exec(path)?.[1];
export function batchImageParts(path) {
  const match = privateImage.exec(path);
  return match && { batchId: match[1], legacy: Boolean(match[2]), filename: match[3] };
}

export function batchImagePath(batchId, filename, legacy = false) {
  return `/api/media/batches/${batchId}/${legacy ? "legacy/" : ""}${filename}`;
}
