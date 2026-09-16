export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_BATCH_FILES = 100;

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

export function photoFormat(name) {
  const extension = String(name).split(".").pop().toUpperCase();
  return extension === "JPEG" ? "JPG" : extension;
}

export function summarizePhotos(photos) {
  const sizes = photos.map((photo) => photo.size);
  if (sizes.some((size) => !Number.isFinite(size) || size < 0)) throw new Error("Dateigrößen im Galerieverzeichnis fehlen oder sind ungültig.");
  return {
    count: photos.length,
    totalBytes: sizes.reduce((sum, size) => sum + size, 0),
    minBytes: sizes.length ? Math.min(...sizes) : 0,
    maxBytes: sizes.length ? Math.max(...sizes) : 0,
    formats: [...new Set(photos.map((photo) => photoFormat(photo.name)))].sort()
  };
}

export async function passwordMatches(password, expectedHash) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hash === expectedHash;
}

export function photoURL(path, base) {
  if (typeof path !== "string" || !path.startsWith("fotos/")) throw new Error("Ungültiger Bildpfad.");
  const decoded = decodeURIComponent(path);
  if (decoded.includes("\\") || decoded.split("/").some((part) => part === ".." || part === ".")) throw new Error("Ungültiger Bildpfad.");
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(new URL("fotos/", base).pathname)) throw new Error("Ungültiger Bildpfad.");
  return url;
}

export function parseRepository(value) {
  const cleaned = value.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\/$/, "").replace(/\.git$/, "");
  const match = /^([a-z\d](?:[a-z\d-]{0,38}))\/([a-z\d_.-]+)$/i.exec(cleaned);
  if (!match || match[2] === "." || match[2] === "..") throw new Error("Bitte das Repository als benutzername/repository oder als GitHub-Link eingeben.");
  return { owner: match[1], name: match[2], fullName: `${match[1]}/${match[2]}` };
}

export function suggestedRepository(location) {
  if (!location.hostname.endsWith(".github.io")) return "";
  const owner = location.hostname.slice(0, -".github.io".length);
  const first = location.pathname.split("/").filter(Boolean)[0];
  return `${owner}/${first && first !== "galerie" ? first : `${owner}.github.io`}`;
}

export async function validatePhoto(file) {
  if (!file.size) throw new Error(`${file.name}: Die Datei ist leer.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: Maximal 20 MB pro Foto.`);
  const extension = file.name.split(".").pop().toLowerCase();
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!((jpeg && ["jpg", "jpeg"].includes(extension)) || (png && extension === "png") || (webp && extension === "webp"))) {
    throw new Error(`${file.name}: Bitte eine JPG-, PNG- oder WebP-Bilddatei verwenden.`);
  }
}

export function uploadPath(fileName, uniqueId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uniqueId)) throw new Error("Ungültige Upload-ID.");
  const safeName = fileName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[.-]+/, "").slice(-120);
  if (!safeName || !/\.(jpe?g|png|webp)$/i.test(safeName)) throw new Error("Ungültiger Dateiname.");
  return `galerie/fotos/${uniqueId}__${safeName}`;
}
