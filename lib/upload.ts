"use client";

/**
 * Resizes + compresses an image in the browser (WebP, max edge `maxSize`)
 * and uploads it straight to Supabase Storage with the user's session.
 * Storage RLS decides who may write where.
 */
export async function compressImage(file: File, maxSize = 2000, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
  if (!blob) throw new Error("Could not process this image.");
  return blob;
}

export async function uploadImage(
  file: File,
  bucket: "product-images" | "cms-images",
  folder: string,
  opts: { userScoped?: boolean; maxSize?: number } = {},
): Promise<string> {
  // Loaded on demand so the Supabase SDK never weighs down storefront pages.
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const blob = await compressImage(file, opts.maxSize ?? 2000);
  let prefix = folder;
  if (opts.userScoped) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Please sign in to upload photos.");
    prefix = `${folder}/${data.user.id}`;
  }
  const ext = blob.type === "image/svg+xml" ? "svg" : "webp";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
