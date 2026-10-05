"use strict";

(() => {
  const photos = 'img:not([src$=".svg"])';
  const regions = ".portfolio-photo, .brand-portrait, .brand-landscape-stack figure, .about-figure, .lightbox-picture, .photo-open, .viewer-stage";
  const protect = (image) => { image.draggable = false; };
  const protectTree = (root) => {
    if (root instanceof Element && root.matches(photos)) protect(root);
    root.querySelectorAll?.(photos).forEach(protect);
  };
  const overPhoto = (target) => target instanceof Element && Boolean(target.closest(photos) || target.closest(regions)?.querySelector(photos));
  document.addEventListener("contextmenu", (event) => {
    if (overPhoto(event.target)) event.preventDefault();
  });
  document.addEventListener("dragstart", (event) => {
    if (overPhoto(event.target)) event.preventDefault();
  });
  protectTree(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) mutation.addedNodes.forEach(protectTree);
  }).observe(document.body, { childList: true, subtree: true });
})();
