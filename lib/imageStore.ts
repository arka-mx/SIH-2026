/**
 * Image storage
 * =============
 * Uploaded incident photos must survive in production. Serverless/edge hosts
 * (Vercel, etc.) give you an ephemeral, read-only filesystem — writing to
 * `public/uploads` works in `next dev` and silently loses files in prod.
 *
 * So: if Cloudinary is configured, photos go there and we store the returned
 * https URL. Otherwise we fall back to the local `public/uploads` folder, which
 * is fine for local development and self-hosted deployments with a real disk.
 *
 * Env (any one of):
 *   CLOUDINARY_URL = cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   — or —
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   CLOUDINARY_FOLDER   (optional, defaults to "sih/incidents")
 */

import { createHash } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

function cloudinaryConfig(): CloudinaryConfig | null {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  let apiKey = process.env.CLOUDINARY_API_KEY || "";
  let apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  const url = process.env.CLOUDINARY_URL;
  if (url && (!cloudName || !apiKey || !apiSecret)) {
    // cloudinary://<api_key>:<api_secret>@<cloud_name>
    const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) {
      apiKey = apiKey || m[1];
      apiSecret = apiSecret || m[2];
      cloudName = cloudName || m[3];
    }
  }

  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_FOLDER || "sih/incidents",
  };
}

export function imageStoreProvider(): "cloudinary" | "local" {
  return cloudinaryConfig() ? "cloudinary" : "local";
}

export interface StoredImage {
  /** URL to reference the image from anywhere (absolute for Cloudinary, `/uploads/..` for local). */
  url: string;
  provider: "cloudinary" | "local";
}

/**
 * Persist an uploaded image and return a URL. Never throws — on any failure it
 * falls back to the local disk, and if that also fails it returns `null` so the
 * report still goes through without a photo.
 */
export async function storeImage(
  bytes: Buffer,
  originalName: string,
  mimeType: string
): Promise<StoredImage | null> {
  const cfg = cloudinaryConfig();
  if (cfg) {
    try {
      const url = await uploadToCloudinary(bytes, mimeType, cfg);
      if (url) return { url, provider: "cloudinary" };
    } catch (err) {
      console.warn("[imageStore] Cloudinary upload failed, falling back to disk:", (err as Error).message);
    }
  }
  return storeLocally(bytes, originalName);
}

async function uploadToCloudinary(
  bytes: Buffer,
  mimeType: string,
  cfg: CloudinaryConfig
): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature = sha1( sorted "key=value" of signed params + api_secret )
  const signedParams: Record<string, string> = {
    folder: cfg.folder,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(signedParams)
    .sort()
    .map((k) => `${k}=${signedParams[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + cfg.apiSecret).digest("hex");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: mimeType || "image/jpeg" }),
    "upload"
  );
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", cfg.folder);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text().catch(() => res.statusText)}`);
  }
  const data = await res.json();
  return (data.secure_url as string) || (data.url as string) || null;
}

async function storeLocally(
  bytes: Buffer,
  originalName: string
): Promise<StoredImage | null> {
  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_") || "photo.jpg";
    const filename = `photo-${Date.now()}-${safeName}`;
    await writeFile(path.join(dir, filename), bytes);
    return { url: `/uploads/${filename}`, provider: "local" };
  } catch (err) {
    console.warn("[imageStore] local write failed:", (err as Error).message);
    return null;
  }
}
