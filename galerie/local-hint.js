"use strict";

// Klassisches Script: Diese Hilfe funktioniert auch dann, wenn file:// die Module blockiert.
if (window.location.protocol === "file:") {
  const message = document.createElement("p");
  message.className = "message";
  message.setAttribute("role", "status");
  message.textContent = "Die Galerie funktioniert nicht über file://. Starte im Projektordner „vorschau-starten.cmd“ und verwende die automatisch geöffnete HTTP-Adresse. Auf GitHub Pages funktioniert sie direkt über /galerie/.";
  document.querySelector("main").prepend(message);
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => event.preventDefault());
    form.querySelectorAll("button[type=submit]").forEach((button) => { button.disabled = true; });
  });
}
