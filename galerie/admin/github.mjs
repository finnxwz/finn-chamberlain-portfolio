import { MAX_BATCH_FILES, parseRepository, uploadPath, validatePhoto } from "../common.mjs";

export function githubClient(token, repository, fetcher = fetch) {
  const repo = parseRepository(repository);
  const root = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
  const request = async (path = "", { method = "GET", body } = {}) => {
    let response;
    try {
      response = await fetcher(`${root}${path}`, {
        method,
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store"
      });
    } catch {
      throw new Error("GitHub ist nicht erreichbar. Bitte prüfe deine Internetverbindung.");
    }
    if (!response.ok) {
      const messages = {
        401: "Der GitHub-Token ist ungültig oder abgelaufen.",
        403: "GitHub verweigert den Zugriff. Prüfe Token-Freigabe, Contents-Schreibrechte, Branchschutz und API-Limit.",
        404: "Repository oder Branch nicht gefunden. Prüfe den Namen und ob der Token für dieses Repository freigegeben ist.",
        409: "Das Repository wurde gleichzeitig geändert oder ist noch leer. Prüfe den Branch und starte den Upload erneut.",
        422: "GitHub konnte die Änderung nicht übernehmen. Möglicherweise wurde der Branch inzwischen geändert oder ist geschützt."
      };
      const error = new Error(messages[response.status] || `GitHub-Anfrage fehlgeschlagen (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
  return { repo, request };
}

export async function connectRepository(client, configuredBranch = "") {
  const repository = await client.request();
  if (repository.archived) throw new Error("Das Repository ist archiviert und kann nicht geändert werden.");
  if (!repository.permissions?.push) throw new Error("Du hast keine Schreibrechte für dieses Repository.");
  const branch = configuredBranch || repository.default_branch;
  if (branch !== repository.default_branch) throw new Error("Bitte den Standardbranch verwenden. Nur dieser wird als Webseite veröffentlicht.");
  await client.request(`/git/ref/heads/${encodeURIComponent(branch)}`);
  return { branch, fullName: repository.full_name };
}

export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += 32768) parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
  return btoa(parts.join(""));
}

export async function uploadPhotos(client, branch, files, onProgress = () => {}, uuid = () => crypto.randomUUID()) {
  if (!files.length || files.length > MAX_BATCH_FILES) throw new Error("Bitte zwischen 1 und 100 Fotos auswählen.");
  // Erst alle Dateien prüfen, bevor die erste Datei zu GitHub übertragen wird.
  for (const file of files) await validatePhoto(file);
  const entries = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress({ phase: "upload", completed: index, total: files.length, name: file.name });
    const blob = await client.request("/git/blobs", { method: "POST", body: { content: toBase64(await file.arrayBuffer()), encoding: "base64" } });
    entries.push({ path: uploadPath(file.name, uuid()), mode: "100644", type: "blob", sha: blob.sha });
  }
  onProgress({ phase: "publish", completed: files.length, total: files.length });
  // Den aktuellen Stand erst nach der Übertragung lesen, damit parallele Änderungen erhalten bleiben.
  const head = await client.request(`/git/ref/heads/${encodeURIComponent(branch)}`);
  const parent = await client.request(`/git/commits/${head.object.sha}`);
  const tree = await client.request("/git/trees", { method: "POST", body: { base_tree: parent.tree.sha, tree: entries } });
  const commit = await client.request("/git/commits", { method: "POST", body: { message: `Add ${files.length} gallery photo${files.length === 1 ? "" : "s"}`, tree: tree.sha, parents: [head.object.sha] } });
  const commitURL = `https://github.com/${client.repo.fullName}/commit/${commit.sha}`;
  try {
    // Niemals force-push: Gleichzeitige Änderungen dürfen nicht überschrieben werden.
    await client.request(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: { sha: commit.sha, force: false } });
  } catch (error) {
    error.commitURL = commitURL;
    error.message += " Die Fotos wurden übertragen, die Veröffentlichung ist aber nicht bestätigt. Prüfe den Standardbranch und die Actions vor einem erneuten Versuch.";
    throw error;
  }
  return { commitURL, count: files.length };
}
