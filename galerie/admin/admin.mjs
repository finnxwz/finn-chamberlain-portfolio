import { formatBytes, MAX_BATCH_FILES, suggestedRepository, validatePhoto } from "../common.mjs";
import { githubClient, connectRepository, uploadPhotos } from "./github.mjs";

const form = document.querySelector("#connect-form");
const repositoryInput = document.querySelector("#repository");
const tokenInput = document.querySelector("#github-token");
const connectStatus = document.querySelector("#connect-status");
const uploader = document.querySelector("#uploader");
const input = document.querySelector("#photo-files");
const zone = document.querySelector("#upload-zone");
const fileList = document.querySelector("#file-list");
const selectionStatus = document.querySelector("#selection-status");
const uploadStatus = document.querySelector("#upload-status");
const uploadButton = document.querySelector("#upload-button");
const clearButton = document.querySelector("#clear-selection");
const disconnectButton = document.querySelector("#disconnect");
const progress = document.querySelector("#upload-progress");
const resultLinks = document.querySelector("#result-links");
const commitLink = document.querySelector("#commit-link");
let client;
let branch;
let selectedFiles = [];
let busy = false;
let selectionVersion = 0;

repositoryInput.value = window.GALLERY_CONFIG?.repository || suggestedRepository(window.location);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  connectStatus.textContent = "Verbindung wird geprüft …";
  const token = tokenInput.value.trim();
  tokenInput.value = "";
  try {
    if (!token) throw new Error("Bitte deinen GitHub-Token eingeben.");
    const nextClient = githubClient(token, repositoryInput.value);
    const connection = await connectRepository(nextClient, window.GALLERY_CONFIG?.branch || "");
    client = nextClient;
    branch = connection.branch;
    document.querySelector("#connected-repo").textContent = `${connection.fullName} · ${branch}`;
    document.querySelector("#workflow-link").href = `https://github.com/${client.repo.fullName}/actions`;
    form.hidden = true;
    uploader.hidden = false;
    connectStatus.textContent = "";
    input.focus();
  } catch (error) {
    connectStatus.textContent = error.message;
    tokenInput.focus();
  } finally { button.disabled = false; }
});

function clearSelection() {
  selectionVersion++;
  selectedFiles = [];
  input.value = "";
  fileList.replaceChildren();
  selectionStatus.textContent = "";
  uploadButton.disabled = true;
  clearButton.disabled = true;
}

async function selectFiles(files) {
  if (busy) return;
  clearSelection();
  const version = selectionVersion;
  resultLinks.hidden = true;
  uploadStatus.textContent = "";
  progress.hidden = true;
  try {
    if (!files.length) return;
    if (files.length > MAX_BATCH_FILES) throw new Error("Bitte höchstens 100 Fotos pro Upload auswählen.");
    selectionStatus.textContent = "Dateien werden geprüft …";
    for (const file of files) await validatePhoto(file);
    if (version !== selectionVersion) return;
    selectedFiles = Array.from(files);
    const fragment = document.createDocumentFragment();
    selectedFiles.forEach((file) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const size = document.createElement("span");
      name.textContent = file.name;
      size.textContent = formatBytes(file.size);
      item.append(name, size);
      fragment.append(item);
    });
    fileList.append(fragment);
    selectionStatus.textContent = `${files.length} Fotos · ${formatBytes(selectedFiles.reduce((sum, file) => sum + file.size, 0))}`;
    uploadButton.disabled = false;
    clearButton.disabled = false;
  } catch (error) {
    if (version === selectionVersion) selectionStatus.textContent = error.message;
  }
}

input.addEventListener("change", () => selectFiles(Array.from(input.files)));
clearButton.addEventListener("click", clearSelection);
zone.addEventListener("dragover", (event) => { event.preventDefault(); if (!busy) zone.classList.add("is-dragging"); });
zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"));
zone.addEventListener("drop", (event) => {
  event.preventDefault();
  zone.classList.remove("is-dragging");
  if (!busy) selectFiles(Array.from(event.dataTransfer.files));
});

uploadButton.addEventListener("click", async () => {
  if (busy || !client || !selectedFiles.length) return;
  busy = true;
  uploadButton.disabled = true;
  clearButton.disabled = true;
  disconnectButton.disabled = true;
  input.disabled = true;
  progress.hidden = false;
  progress.max = selectedFiles.length + 1;
  progress.value = 0;
  resultLinks.hidden = true;
  commitLink.hidden = true;
  try {
    const result = await uploadPhotos(client, branch, selectedFiles, (state) => {
      progress.value = state.completed;
      uploadStatus.textContent = state.phase === "upload" ? `Foto ${state.completed + 1} von ${state.total}: ${state.name}` : "Upload abgeschlossen. Veröffentlichung wird angestoßen …";
    });
    progress.value = progress.max;
    clearSelection();
    uploadStatus.textContent = `${result.count} Fotos an GitHub übergeben. Sobald der Pages-Workflow erfolgreich abgeschlossen ist, sind die Fotos und der neue ZIP-Download in der Galerie verfügbar.`;
    commitLink.href = result.commitURL;
    commitLink.hidden = false;
    resultLinks.hidden = false;
  } catch (error) {
    uploadStatus.textContent = error.message;
    resultLinks.hidden = false;
    if (error.commitURL) { commitLink.href = error.commitURL; commitLink.hidden = false; }
  } finally {
    busy = false;
    input.disabled = false;
    disconnectButton.disabled = false;
    uploadButton.disabled = !selectedFiles.length;
    clearButton.disabled = !selectedFiles.length;
  }
});

disconnectButton.addEventListener("click", () => {
  if (busy) return;
  client = undefined;
  branch = undefined;
  tokenInput.value = "";
  clearSelection();
  uploadStatus.textContent = "";
  resultLinks.hidden = true;
  progress.hidden = true;
  uploader.hidden = true;
  form.hidden = false;
  tokenInput.focus();
});
window.addEventListener("beforeunload", (event) => { if (busy) { event.preventDefault(); event.returnValue = ""; } });
