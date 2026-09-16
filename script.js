"use strict";

const year = String(new Date().getFullYear());
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = year;
});
