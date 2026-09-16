import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { formatBytes, summarizePhotos, passwordMatches, parseRepository, photoURL, suggestedRepository, uploadPath, validatePhoto } from "../galerie/common.mjs";
import { connectRepository, githubClient, toBase64, uploadPhotos } from "../galerie/admin/github.mjs";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");
const photo = (name = "Porträt.png") => new File([png], name, { type: "image/png" });
const uuid = "12345678-1234-4234-8234-123456789abc";

test("customer sidebar totals actual bytes and merges JPEG/JPG formats", () => {
  const summary = summarizePhotos([
    { name: "Portrait.jpeg", size: 1048576 },
    { name: "Detail.JPG", size: 2048 },
    { name: "Bild.webp", size: 4096 }
  ]);
  assert.deepEqual(summary, { count: 3, totalBytes: 1054720, minBytes: 2048, maxBytes: 1048576, formats: ["JPG", "WEBP"] });
  assert.equal(formatBytes(summary.minBytes), "2 KB");
  assert.equal(formatBytes(summary.maxBytes), "1 MB");
});

test("empty gallery has zero bytes and missing sizes do not become misleading metadata", () => {
  assert.deepEqual(summarizePhotos([]), { count: 0, totalBytes: 0, minBytes: 0, maxBytes: 0, formats: [] });
  assert.equal(formatBytes(0), "0 KB");
  assert.equal(formatBytes(undefined), "—");
  assert.throws(() => summarizePhotos([{ name: "missing.jpg" }]));
  assert.throws(() => summarizePhotos([{ name: "negative.jpg", size: -1 }]));
});

test("gallery accepts a configured password and rejects other input", async () => {
  const password = "example-password-for-tests";
  const hash = createHash("sha256").update(password).digest("hex");
  assert.equal(await passwordMatches(password, hash), true);
  assert.equal(await passwordMatches("wrong", hash), false);
});

test("repository parsing and custom-domain defaults", () => {
  assert.equal(parseRepository("https://github.com/finn/portfolio.git").fullName, "finn/portfolio");
  assert.throws(() => parseRepository("https://example.com/finn/portfolio"));
  assert.throws(() => parseRepository("finn/../../other"));
  assert.equal(suggestedRepository(new URL("https://finn.github.io/site/galerie/admin/")), "finn/site");
  assert.equal(suggestedRepository(new URL("https://finn.github.io/galerie/admin/")), "finn/finn.github.io");
  assert.equal(suggestedRepository(new URL("https://example.com/galerie/admin/")), "");
});

test("photo paths work on a project subpath and reject traversal", () => {
  const base = new URL("https://finn.github.io/portfolio/galerie/");
  assert.equal(photoURL("fotos/Blick%20%26%20N%C3%A4he.png", base).pathname, "/portfolio/galerie/fotos/Blick%20%26%20N%C3%A4he.png");
  for (const path of ["https://other.test/a.jpg", "../secret", "fotos/../a.jpg", "fotos/%2e%2e/a.jpg", "fotos/a\\..\\a.jpg"]) assert.throws(() => photoURL(path, base));
});

test("upload validation checks bytes, size and extension", async () => {
  await validatePhoto(photo());
  await assert.rejects(validatePhoto(new File(["text"], "fake.jpg")));
  await assert.rejects(validatePhoto(new File([png], "fake.jpg")));
  await assert.rejects(validatePhoto(new File([], "empty.png")));
  await assert.rejects(validatePhoto({ name: "large.png", size: 21 * 1024 * 1024 }));
  assert.equal(uploadPath("Blick & Nähe.png", uuid), `galerie/fotos/${uuid}__Blick---Nahe.png`);
  assert.throws(() => uploadPath("file.png", "../escape"));
  const bytes = Uint8Array.from({ length: 100000 }, (_, i) => i % 256);
  assert.equal(toBase64(bytes.buffer), Buffer.from(bytes).toString("base64"));
});

test("GitHub client sends credentials only to fixed GitHub API origin", async () => {
  let captured;
  const api = githubClient("test-token", "finn/portfolio", async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  await api.request("/git/blobs", { method: "POST", body: { content: "abc" } });
  assert.equal(captured.url, "https://api.github.com/repos/finn/portfolio/git/blobs");
  assert.equal(captured.options.headers.Authorization, "Bearer test-token");
  assert.equal(captured.url.includes("test-token"), false);
});

test("connection refuses read-only repositories and non-default deployment branch", async () => {
  await assert.rejects(connectRepository({ request: async () => ({ permissions: { push: false } }) }), /Schreibrechte/);
  await assert.rejects(connectRepository({ request: async () => ({ permissions: { push: true }, default_branch: "main" }) }, "draft"), /Standardbranch/);
});

function fakeClient(failAt = "") {
  const calls = [];
  return {
    repo: { fullName: "finn/portfolio" }, calls,
    async request(path, options = {}) {
      calls.push({ path, ...options });
      if (path === failAt) throw new Error("Simulated failure");
      if (path === "/git/blobs") return { sha: `blob-${calls.length}` };
      if (path === "/git/ref/heads/main") return { object: { sha: "current-head" } };
      if (path === "/git/commits/current-head") return { tree: { sha: "existing-tree" } };
      if (path === "/git/trees") return { sha: "new-tree" };
      if (path === "/git/commits") return { sha: "new-commit" };
      if (path === "/git/refs/heads/main") return {};
      throw new Error(`Unexpected path: ${path}`);
    }
  };
}

test("batch upload preserves existing tree and publishes all photos in one non-force commit", async () => {
  const client = fakeClient();
  let sequence = 0;
  const result = await uploadPhotos(client, "main", [photo(), photo("second.png")], () => {}, () => `${++sequence}2345678-1234-4234-8234-123456789abc`);
  const tree = client.calls.find((call) => call.path === "/git/trees");
  assert.equal(tree.body.base_tree, "existing-tree");
  assert.equal(tree.body.tree.length, 2);
  assert.equal(new Set(tree.body.tree.map((entry) => entry.path)).size, 2);
  assert.ok(tree.body.tree.every((entry) => entry.path.startsWith("galerie/fotos/")));
  assert.deepEqual(client.calls.find((call) => call.path === "/git/commits").body.parents, ["current-head"]);
  assert.deepEqual(client.calls.at(-1).body, { sha: "new-commit", force: false });
  assert.equal(result.commitURL, "https://github.com/finn/portfolio/commit/new-commit");
});

test("invalid batch or failed blob never publishes a partial gallery", async () => {
  const client = fakeClient();
  await assert.rejects(uploadPhotos(client, "main", [photo(), new File(["bad"], "bad.jpg")]));
  assert.equal(client.calls.length, 0);
  const failing = fakeClient("/git/blobs");
  await assert.rejects(uploadPhotos(failing, "main", [photo()], () => {}, () => uuid));
  assert.equal(failing.calls.some((call) => call.path.includes("/git/refs/")), false);
});

test("branch race never force-pushes and exposes commit for verification", async () => {
  const client = fakeClient("/git/refs/heads/main");
  await assert.rejects(uploadPhotos(client, "main", [photo()], () => {}, () => uuid), (error) => {
    assert.equal(error.commitURL, "https://github.com/finn/portfolio/commit/new-commit");
    assert.match(error.message, /nicht bestätigt/);
    return true;
  });
  assert.equal(client.calls.at(-1).body.force, false);
});
