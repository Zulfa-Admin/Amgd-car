import imageCompression from "browser-image-compression";

export async function compressImage(file: File, opts?: { maxSizeMB?: number; maxWidthOrHeight?: number }) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: opts?.maxSizeMB ?? 0.7,
      maxWidthOrHeight: opts?.maxWidthOrHeight ?? 1600,
      useWebWorker: true,
      initialQuality: 0.82,
    });
    return new File([compressed], file.name, { type: compressed.type });
  } catch {
    return file;
  }
}
