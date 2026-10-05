"use strict";

const header = document.querySelector(".site-header");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastScroll = window.scrollY;
let navigating = false;
let lightbox = null;
let lightboxPhotos = [];
let lightboxIndex = 0;
let lightboxOpener = null;
let inertElements = [];
let photoMetadata = new Map(Object.entries(window.FINN_PHOTO_METADATA || {}));
let photoMetadataLoaded = photoMetadata.size > 0;
const photoMetadataUrl = new URL("foto-daten.csv", document.currentScript.src);

function parsePhotoMetadata(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (!quoted && character === ";") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      rows.push([...row, cell]);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else cell += character;
  }
  if (quoted) throw new Error("Nicht geschlossenes Anführungszeichen in foto-daten.csv");
  rows.push([...row, cell]);
  const columns = rows.shift().map(value => value.trim());
  if (!["Dateiname", "Model", "Location"].every(name => columns.includes(name))) {
    throw new Error("Die Foto-Daten benötigen Dateiname, Model und Location.");
  }
  const metadata = new Map();
  for (const values of rows) {
    const value = name => (values[columns.indexOf(name)] || "").trim();
    const filename = value("Dateiname");
    if (filename) metadata.set(filename, { model: value("Model"), location: value("Location") });
  }
  return metadata;
}

async function loadPhotoMetadata() {
  if (photoMetadataUrl.protocol === "file:") {
    photoMetadataLoaded = true;
    return;
  }
  try {
    const response = await fetch(photoMetadataUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error("Foto-Daten konnten nicht geladen werden.");
    photoMetadata = parsePhotoMetadata(await response.text());
  } catch {
    // Missing metadata must not prevent viewing or navigating photos.
  } finally {
    photoMetadataLoaded = true;
    if (lightbox && !lightbox.hidden) updateLightboxMetadata();
  }
}

function updateLightboxMetadata() {
  const source = lightboxPhotos[lightboxIndex];
  const filename = decodeURIComponent(new URL(source.src).pathname.split("/").pop());
  const metadata = photoMetadata.get(filename);
  const fallback = photoMetadataLoaded ? "Platzhalter" : "…";
  lightbox.querySelector("[data-lightbox-model]").textContent = metadata?.model || source.dataset.model || fallback;
  lightbox.querySelector("[data-lightbox-location]").textContent = metadata?.location || source.dataset.location || fallback;
}

loadPhotoMetadata();

function initializePage() {
  document.body.classList.toggle("is-contact", Boolean(document.querySelector(".contact-page")));
  document.querySelectorAll(".portfolio-photo img").forEach((image, index) => {
    if (image.parentElement.matches("button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.photoOpen = String(index);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", image.alt ? `Foto öffnen: ${image.alt}` : `Foto ${index + 1} öffnen`);
    image.replaceWith(button);
    button.append(image);
  });
}

function createLightbox() {
  if (lightbox) return;
  lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.tabIndex = -1;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-labelledby", "lightbox-title");
  lightbox.innerHTML = `
    <h2 id="lightbox-title" class="visually-hidden">Fotoansicht</h2>
    <button class="lightbox-control lightbox-close" type="button" aria-label="Lightbox schließen">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>
    </button>
    <div class="lightbox-content">
      <div class="lightbox-stage">
        <button class="lightbox-control lightbox-previous" type="button" aria-label="Vorheriges Bild"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8"/></svg></button>
        <div class="lightbox-picture"><img class="lightbox-image" alt=""></div>
        <button class="lightbox-control lightbox-next" type="button" aria-label="Nächstes Bild"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg></button>
      </div>
      <div class="lightbox-caption"><p><span class="lightbox-label">Model:</span> <span data-lightbox-model>Platzhalter</span></p><p><span class="lightbox-label">Location:</span> <span data-lightbox-location>Platzhalter</span></p></div>
      <p class="visually-hidden" data-lightbox-status aria-live="polite"></p>
    </div>`;
  document.body.append(lightbox);
  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-previous").addEventListener("click", () => showLightboxPhoto(lightboxIndex - 1));
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => showLightboxPhoto(lightboxIndex + 1));
  lightbox.addEventListener("click", (event) => {
    if (event.target.matches(".lightbox, .lightbox-content, .lightbox-stage, .lightbox-picture")) closeLightbox();
  });
}

function showLightboxPhoto(index) {
  lightboxIndex = (index + lightboxPhotos.length) % lightboxPhotos.length;
  const source = lightboxPhotos[lightboxIndex];
  const image = lightbox.querySelector(".lightbox-image");
  image.src = source.currentSrc || source.src;
  image.alt = source.alt || lightboxPhotos.find(photo => photo.src === source.src && photo.alt)?.alt || `Portfolio-Foto ${lightboxIndex + 1}`;
  updateLightboxMetadata();
  lightbox.querySelector("[data-lightbox-status]").textContent = `Bild ${lightboxIndex + 1} von ${lightboxPhotos.length}`;
}

function openLightbox(photos, index, opener) {
  if (!photos.length || navigating) return;
  createLightbox();
  lightboxPhotos = photos;
  lightboxOpener = opener;
  header.classList.remove("is-hidden");
  document.body.classList.add("lightbox-open");
  inertElements = [...document.querySelectorAll("main, .site-footer, .skip-link")].map(element => ({ element, inert: element.inert }));
  inertElements.forEach(({ element }) => { element.inert = true; });
  lightbox.hidden = false;
  showLightboxPhoto(index);
  lightbox.focus({ preventScroll: true });
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  inertElements.forEach(({ element, inert }) => { element.inert = inert; });
  inertElements = [];
  if (lightboxOpener?.isConnected) lightboxOpener.focus({ preventScroll: true });
  lightboxPhotos = [];
  lastScroll = window.scrollY;
}

document.addEventListener("keydown", (event) => {
  if (!lightbox || lightbox.hidden) return;
  if (["Escape", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "Escape") closeLightbox();
    else showLightboxPhoto(lightboxIndex + (event.key === "ArrowLeft" ? -1 : 1));
  } else if (event.key === "Tab") {
    // The header remains usable; the dimmed page and footer are inert.
    const controls = [...header.querySelectorAll("a[href]"), ...lightbox.querySelectorAll("button")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

window.addEventListener("scroll", () => {
  const current = Math.max(0, window.scrollY);
  if (document.body.classList.contains("lightbox-open") || document.body.classList.contains("is-contact")) {
    header.classList.remove("is-hidden");
    lastScroll = current;
    return;
  }
  if (current < lastScroll || current <= header.offsetHeight) {
    header.classList.remove("is-hidden");
  } else if (current > lastScroll) {
    header.classList.add("is-hidden");
  }
  lastScroll = current;
}, { passive: true });

function updateNavigation(url) {
  document.querySelectorAll(".site-header nav a, .site-footer nav a").forEach((link) => {
    const target = new URL(link.href);
    const active = target.pathname === url.pathname &&
      (!target.hash || target.hash === url.hash);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function scrollToDestination(url, position) {
  header.classList.remove("is-hidden");
  if (position) window.scrollTo(position.x, position.y);
  else if (url.hash) {
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  } else window.scrollTo(0, 0);
  lastScroll = window.scrollY;
}

async function navigate(url, { pop = false, position = null } = {}) {
  if (navigating) return;
  closeLightbox();
  navigating = true;
  const main = document.querySelector("main");
  try {
    const response = await fetch(url.href);
    if (!response.ok) throw new Error("Page unavailable");
    const next = new DOMParser().parseFromString(await response.text(), "text/html");
    const nextMain = next.querySelector("main");
    if (!nextMain) throw new Error("Missing page content");
    main.classList.remove("is-entering");
    main.classList.add("is-leaving");
    updateNavigation(url);
    if (!reducedMotion.matches) await new Promise((resolve) => setTimeout(resolve, 270));
    if (!pop) {
      history.replaceState({ x: window.scrollX, y: window.scrollY }, "");
      history.pushState(null, "", url.href);
    }
    main.replaceWith(nextMain);
    initializePage();
    document.title = next.title;
    const description = document.querySelector('meta[name="description"]');
    const nextDescription = next.querySelector('meta[name="description"]');
    if (description) description.remove();
    if (nextDescription) document.head.append(nextDescription);
    scrollToDestination(url, position);
    nextMain.classList.add("is-entering");
    nextMain.setAttribute("tabindex", "-1");
    nextMain.focus({ preventScroll: true });
    nextMain.addEventListener("animationend", () => nextMain.classList.remove("is-entering"), { once: true });
  } catch {
    window.location.assign(url.href);
  } finally {
    navigating = false;
  }
}

document.addEventListener("click", (event) => {
  const photoButton = event.target.closest("[data-photo-open]");
  if (photoButton) {
    openLightbox([...document.querySelectorAll(".portfolio-photo img")], Number(photoButton.dataset.photoOpen), photoButton);
    return;
  }
  const moreButton = event.target.closest("[data-brand-more]");
  if (moreButton) {
    const section = moreButton.closest(".brand-section");
    const photos = [...section.querySelectorAll(".brand-composition img, .brand-extra-images img")];
    openLightbox(photos, section.querySelectorAll(".brand-composition img").length, moreButton);
    return;
  }
  const link = event.target.closest("a[href]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || !url.pathname.endsWith(".html") || location.protocol === "file:") return;
  const samePage = url.pathname === location.pathname && url.search === location.search;
  event.preventDefault();
  if (navigating) return;
  closeLightbox();
  if (samePage) {
    if (url.href !== location.href) {
      history.replaceState({ x: window.scrollX, y: window.scrollY }, "");
      history.pushState(null, "", url.href);
    }
    updateNavigation(url);
    scrollToDestination(url);
  } else navigate(url);
});

if (location.protocol !== "file:") {
  history.scrollRestoration = "manual";
  window.addEventListener("popstate", (event) => {
    navigate(new URL(location.href), { pop: true, position: event.state });
  });
}
updateNavigation(new URL(location.href));
initializePage();
const initialMain = document.querySelector("main");
initialMain.classList.add("is-entering");
initialMain.addEventListener("animationend", () => initialMain.classList.remove("is-entering"), { once: true });
