import { formatBytes, passwordMatches, photoURL, photoFormat, summarizePhotos } from "./common.mjs";

const base = new URL("./", import.meta.url);
const settings = window.GALLERY_CONFIG;
const sessionKey = `finn-gallery:${base.pathname}`;
const gate = document.querySelector("#gate");
const collection = document.querySelector("#collection");
const passwordForm = document.querySelector("#password-form");
const passwordInput = document.querySelector("#gallery-password");
const loginStatus = document.querySelector("#login-status");
const status = document.querySelector("#gallery-status");
const grid = document.querySelector("#photo-grid");
const count = document.querySelector("#photo-count");
const archive = document.querySelector("#download-all");
const refresh = document.querySelector("#refresh-gallery");
const empty = document.querySelector("#empty-gallery");
const totalSize = document.querySelector("#total-size");
const archiveSize = document.querySelector("#archive-size");
const formats = document.querySelector("#photo-formats");
const sizeRange = document.querySelector("#file-size-range");
const updated = document.querySelector("#gallery-updated");
const downloadHelp = document.querySelector("#download-help");
const viewer = document.querySelector("#photo-viewer");
const viewerImage = document.querySelector("#viewer-image");
const sidebar = document.querySelector(".gallery-sidebar");
const sidebarDrawer = document.querySelector("#gallery-drawer");
const openSidebar = document.querySelector("#open-sidebar");
const closeSidebar = document.querySelector("#close-sidebar");
const narrowScreen = matchMedia("(max-width: 760px)");
let photos = [];
let currentPhoto = 0;
let activeRequest;

function updateScrollLock() {
  document.documentElement.classList.toggle("gallery-modal-open", sidebarDrawer.open || viewer.open);
}

function placeSidebar() {
  if (narrowScreen.matches) {
    sidebarDrawer.append(sidebar);
    closeSidebar.hidden = false;
  } else {
    if (sidebarDrawer.open) sidebarDrawer.close();
    collection.prepend(sidebar);
    closeSidebar.hidden = true;
  }
  updateScrollLock();
}

placeSidebar();
narrowScreen.addEventListener("change", placeSidebar);
openSidebar.addEventListener("click", () => {
  if (collection.hidden || !narrowScreen.matches) return;
  sidebarDrawer.showModal();
  updateScrollLock();
  closeSidebar.focus();
});
closeSidebar.addEventListener("click", () => sidebarDrawer.close());
sidebarDrawer.addEventListener("close", updateScrollLock);
sidebarDrawer.addEventListener("click", (event) => {
  const bounds = sidebarDrawer.getBoundingClientRect();
  if (event.target === sidebarDrawer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) sidebarDrawer.close();
});

function rememberAccess(enabled) {
  try {
    if (enabled) sessionStorage.setItem(sessionKey, String(Date.now() + 8 * 60 * 60 * 1000));
    else sessionStorage.removeItem(sessionKey);
  } catch { /* Die Galerie funktioniert auch ohne Browserspeicher. */ }
}

async function loadGallery() {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  refresh.disabled = true;
  status.textContent = "Bilder werden geladen …";
  try {
    const response = await fetch(new URL("manifest.json", base), { cache: "no-store", signal: request.signal });
    if (!response.ok) throw new Error("Die Galerie ist noch nicht veröffentlicht oder gerade nicht erreichbar.");
    const manifest = await response.json();
    if (manifest.version !== 1 || !Array.isArray(manifest.photos)) throw new Error("Das Galerieverzeichnis ist ungültig.");
    const nextPhotos = manifest.photos.map((photo) => {
      const url = photoURL(photo.path, base);
      if (photo.version) url.searchParams.set("v", photo.version);
      return { name: String(photo.name), url: url.href, size: photo.size };
    });
    const summary = summarizePhotos(nextPhotos);
    if (collection.hidden) return;
    if (viewer.open) viewer.close();
    photos = nextPhotos;
    grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    photos.forEach((photo, index) => {
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "photo-open";
      button.setAttribute("aria-label", `${photo.name} vergrößern`);
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.name;
      image.loading = index < 3 ? "eager" : "lazy";
      image.decoding = "async";
      button.append(image);
      button.addEventListener("click", () => showPhoto(index));
      const caption = document.createElement("figcaption");
      const fileName = document.createElement("span");
      fileName.className = "photo-filename";
      fileName.textContent = photo.name;
      const fileSize = document.createElement("span");
      fileSize.className = "photo-filesize";
      fileSize.textContent = formatBytes(photo.size);
      caption.append(fileName, fileSize);
      figure.append(button, caption);
      fragment.append(figure);
    });
    grid.append(fragment);
    count.textContent = `${photos.length} ${photos.length === 1 ? "Foto" : "Fotos"}`;
    totalSize.textContent = formatBytes(summary.totalBytes);
    formats.textContent = summary.formats.join(" / ") || "—";
    sizeRange.textContent = !photos.length ? "—" : summary.minBytes === summary.maxBytes ? formatBytes(summary.minBytes) : `${formatBytes(summary.minBytes)} – ${formatBytes(summary.maxBytes)}`;
    const updateDate = manifest.updatedAt ? new Date(manifest.updatedAt) : null;
    if (updateDate && !Number.isNaN(updateDate.getTime())) {
      updated.dateTime = updateDate.toISOString();
      updated.textContent = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(updateDate);
    } else { updated.removeAttribute("datetime"); updated.textContent = "—"; }
    empty.hidden = photos.length > 0;
    archive.hidden = !photos.length || manifest.archive?.path !== "alle-fotos.zip" || !Number.isFinite(manifest.archive?.size) || manifest.archive.size <= 0;
    archiveSize.textContent = archive.hidden ? "—" : formatBytes(manifest.archive.size);
    downloadHelp.hidden = archive.hidden;
    if (!archive.hidden) {
      const zipURL = new URL("alle-fotos.zip", base);
      zipURL.searchParams.set("v", manifest.updatedAt || "1");
      archive.href = zipURL.href;
      archive.querySelector(".button-note").textContent = `ZIP · ${formatBytes(manifest.archive.size)}`;
    } else archive.removeAttribute("href");
    status.textContent = "";
  } catch (error) {
    if (error.name !== "AbortError") {
      status.textContent = `${error.message} Bitte versuche es mit „Aktualisieren“ erneut.`;
      if (!photos.length) count.textContent = "Galerie nicht verfügbar";
    }
  } finally {
    if (activeRequest === request) refresh.disabled = false;
  }
}

function unlock() {
  gate.hidden = true;
  collection.hidden = false;
  rememberAccess(true);
  loadGallery();
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = passwordForm.querySelector("button");
  button.disabled = true;
  loginStatus.textContent = "";
  try {
    if (await passwordMatches(passwordInput.value, settings?.passwordSha256)) {
      passwordInput.value = "";
      passwordInput.removeAttribute("aria-invalid");
      unlock();
      (narrowScreen.matches ? openSidebar : refresh).focus();
    } else {
      loginStatus.textContent = "Das Passwort stimmt nicht. Bitte versuche es erneut.";
      passwordInput.setAttribute("aria-invalid", "true");
      passwordInput.select();
    }
  } catch {
    loginStatus.textContent = "Bitte öffne die Galerie über die veröffentlichte HTTPS-Webadresse.";
  } finally { button.disabled = false; }
});

document.querySelector("#lock-gallery").addEventListener("click", () => {
  activeRequest?.abort();
  rememberAccess(false);
  viewer.close();
  sidebarDrawer.close();
  collection.hidden = true;
  gate.hidden = false;
  grid.replaceChildren();
  photos = [];
  archive.removeAttribute("href");
  archive.hidden = true;
  downloadHelp.hidden = true;
  passwordInput.focus();
});
refresh.addEventListener("click", loadGallery);

function showPhoto(index) {
  if (!photos.length) return;
  currentPhoto = (index + photos.length) % photos.length;
  const photo = photos[currentPhoto];
  viewerImage.src = photo.url;
  viewerImage.alt = photo.name;
  document.querySelector("#viewer-counter").textContent = `${currentPhoto + 1} / ${photos.length}`;
  document.querySelector("#viewer-meta").textContent = `${photo.name} · ${photoFormat(photo.name)} · ${formatBytes(photo.size)}`;
  const link = document.querySelector("#download-photo");
  link.href = photo.url;
  link.download = photo.name;
  document.querySelector("#previous-photo").disabled = photos.length < 2;
  document.querySelector("#next-photo").disabled = photos.length < 2;
  if (!viewer.open) viewer.showModal();
  updateScrollLock();
}

document.querySelector("#previous-photo").addEventListener("click", () => showPhoto(currentPhoto - 1));
document.querySelector("#next-photo").addEventListener("click", () => showPhoto(currentPhoto + 1));
document.querySelector("#close-viewer").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener("close", () => { viewerImage.removeAttribute("src"); updateScrollLock(); });
viewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(currentPhoto + (event.key === "ArrowLeft" ? -1 : 1));
  }
});

try { if (Number(sessionStorage.getItem(sessionKey)) > Date.now()) unlock(); } catch { /* Anmeldung bleibt sichtbar. */ }
