'use strict';
/*
 * Checks for this repository's packs (spec 102 FR-050, FR-170). Plain Node, no dependency, no network, no shell: file names are only
 * matched against patterns and read through fs, never put in a command string. The pack rules themselves (zip, pictures, world.json)
 * come from the app repository's validator (src/shared/worldpack.ts), loaded from a checkout of the app that CI pins by sha.
 */
const fs = require('fs');
const path = require('path');

const MAX_FILE = { webp: 160 * 1024, 'world.json': 64 * 1024, 'card.json': 16 * 1024, 'ASSETS.md': 128 * 1024 };
const MAX_PACK_DIR_BYTES = 4 * 1024 * 1024; // spec 102 FR-042: a project pack over 4 MB fails
const MAX_PACK_DIR_FILES = 42; // 40 kept parts (FR-042) + ASSETS.md + card.json
const MAX_ZIP_FILE = 12 * 1024 * 1024; // FR-081
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,38}$/;
const PACK_FILE_RE = /^(world\.json|card\.json|ASSETS\.md|[a-z0-9][a-z0-9-]{0,40}\.webp)$/;
const OWNERS = { world: ['vikramgorla'], crew: ['fjcabello'] }; // who may approve which kind (AGENTS.md)
// Owners are known by first name in prose; Maker is compared as a login, so names are mapped first (like with like).
const OWNER_LOGIN = { vikram: 'vikramgorla', paco: 'fjcabello', ruben: 'rubenlupi' };
const LOGIN_RE = /^@?[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const asLogin = (v) => { const x = String(v).trim().replace(/^@/, '').toLowerCase(); return OWNER_LOGIN[x] || x; };
const APPROVALS = ['pending', 'approved', 'refused'];
const ASSET_COLUMNS = ['File', 'Kind', 'Tool and version', 'Date', 'Maker', 'Prompt', 'Processing', 'Licence', 'Approval', 'Approver', 'Approved on'];

/** Text that may reach a log: printable ASCII only, short, and never able to start a workflow command. */
function safe(s) { return String(s).replace(/[^\x20-\x7e]/g, '?').replace(/^:+/, '').slice(0, 120); }

// ---- the whole tree: a file-type allow-list. Entries are {mode, path} as `git ls-tree -r -z` gives them. ----
const SEG = /^[A-Za-z0-9._-]{1,64}$/;
const ROOT_FILES = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md', 'LICENSE', '.gitignore']);
function pathProblem(p, mode) {
  if (mode === '120000') return 'a symbolic link';
  if (mode === '160000') return 'a submodule';
  const segs = p.split('/');
  if (!segs.every((s) => SEG.test(s) && s !== '.' && s !== '..' && !/\.$/.test(s))) return 'a file name with a character that is not allowed';
  const [top, id, file] = segs;
  const ext = (segs[segs.length - 1].match(/\.([a-z0-9]+)$/) || [])[1];
  if (segs.length === 1) return ROOT_FILES.has(p) ? '' : 'a file at the top level that is not on the list';
  if (top === 'worlds') {
    if (mode === '100755') return 'an executable file under worlds/';
    if (segs.length === 2) return id === 'README.md' ? '' : 'a file in worlds/ that is not on the list';
    if (segs.length !== 3) return 'a folder inside a world';
    if (id === '_template') return file === 'ASSETS.md' || file === 'card.json' ? '' : 'an unexpected file in the template';
    if (!ID_RE.test(id)) return 'a world folder name that is not a lowercase id';
    return PACK_FILE_RE.test(file) ? '' : 'a file in a world that is not world.json, card.json, ASSETS.md or a .webp picture';
  }
  if (top === 'tools') return segs.length === 2 && (ext === 'js' || ext === 'json') ? '' : 'a file in tools/ that is not .js or .json';
  if (top === 'docs') return segs.length === 2 && ext === 'md' ? '' : 'a file in docs/ that is not .md';
  if (top === '.github') {
    if (segs.length === 2) return ['CODEOWNERS', 'dependabot.yml', 'labels.tsv', 'pull_request_template.md'].includes(id) ? '' : 'a file in .github/ that is not on the list';
    if (id === 'workflows' && segs.length === 3 && ext === 'yml') return '';
    if (id === 'ISSUE_TEMPLATE' && segs.length === 3 && ext === 'yml') return '';
    if (id === 'scripts' && segs.length === 3 && ext === 'sh') return '';
  }
  return 'a file in a folder that is not on the list';
}
function treeProblems(entries) {
  const out = [];
  for (const e of entries) { const w = pathProblem(e.path, e.mode); if (w) out.push(safe(e.path) + ': ' + w); }
  return out;
}

// ---- ASSETS.md ----
function parseAssets(text) {
  const rows = []; let header = null;
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!header) { header = cells; continue; }
    rows.push(cells);
  }
  return { header, rows };
}
/** Problems in one world's ASSETS.md against the pictures in its folder. */
function assetsProblems(text, pictures) {
  const out = [];
  const { header, rows } = parseAssets(text);
  if (!header || header.join('|') !== ASSET_COLUMNS.join('|')) return ['ASSETS.md needs a table with the columns: ' + ASSET_COLUMNS.join(' | ')];
  const seen = new Set();
  for (const r of rows) {
    if (r.length !== ASSET_COLUMNS.length) { out.push('an ASSETS.md row has ' + r.length + ' cells, not ' + ASSET_COLUMNS.length); continue; }
    const o = Object.fromEntries(ASSET_COLUMNS.map((c, i) => [c, r[i]]));
    const f = o.File;
    if (seen.has(f)) out.push(safe(f) + ': listed twice in ASSETS.md');
    seen.add(f);
    if (!pictures.includes(f)) out.push(safe(f) + ': listed in ASSETS.md but not in the folder');
    if (o.Kind !== 'world' && o.Kind !== 'crew') out.push(safe(f) + ': Kind must be world or crew');
    if (!LOGIN_RE.test(o.Maker)) out.push(safe(f) + ': Maker must be the GitHub login of the person responsible');
    for (const c of ['Tool and version', 'Date', 'Maker', 'Prompt', 'Processing', 'Licence']) if (!o[c] || /^(todo|tbd|\?|-)$/i.test(o[c])) out.push(safe(f) + ': ' + c + ' is empty');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.Date)) out.push(safe(f) + ': Date must be YYYY-MM-DD');
    if (!/\bno flag\b/i.test(o.Prompt)) out.push(safe(f) + ': the prompt lacks the exclusion clause (spec 102 FR-010)');
    if (!APPROVALS.includes(o.Approval)) out.push(safe(f) + ': Approval must be one of ' + APPROVALS.join(', '));
    if (o.Approval === 'refused') out.push(safe(f) + ': approval is refused; the picture cannot be merged');
    if (o.Approval === 'approved') {
      const allowed = OWNERS[o.Kind] || [];
      if (!allowed.includes(o.Approver)) out.push(safe(f) + ': a ' + safe(o.Kind) + ' picture is approved by ' + allowed.join(' or ') + ' only');
      if (asLogin(o.Approver) === asLogin(o.Maker)) out.push(safe(f) + ': the maker cannot approve their own picture');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(o['Approved on'])) out.push(safe(f) + ': Approved on must be YYYY-MM-DD');
    }
  }
  for (const p of pictures) if (!seen.has(p)) out.push(safe(p) + ': no row in ASSETS.md');
  return out;
}

// ---- one pack folder ----
function readPackDir(dir) {
  const problems = []; const files = [];
  let total = 0;
  const names = fs.readdirSync(dir);
  if (names.length > MAX_PACK_DIR_FILES) problems.push('the folder has more than ' + MAX_PACK_DIR_FILES + ' files');
  for (const name of names.slice(0, MAX_PACK_DIR_FILES + 1)) {
    const full = path.join(dir, name);
    const st = fs.lstatSync(full);
    if (!st.isFile()) { problems.push(safe(name) + ': not a plain file (link or folder)'); continue; }
    if (!PACK_FILE_RE.test(name)) { problems.push(safe(name) + ': not world.json, card.json, ASSETS.md or a .webp picture'); continue; }
    const cap = name.endsWith('.webp') ? MAX_FILE.webp : MAX_FILE[name];
    if (st.size > cap) { problems.push(safe(name) + ': larger than ' + cap + ' bytes'); continue; }
    total += st.size;
    files.push({ name, data: fs.readFileSync(full) });
  }
  if (total > MAX_PACK_DIR_BYTES) problems.push('the folder is larger than 4 MB');
  return { problems, files };
}

function loadValidator(appRoot) {
  const app = path.resolve(appRoot);
  const wp = require(path.join(app, 'dist-scripts', 'src', 'shared', 'worldpack.js'));
  const theme = require(path.join(app, 'src', 'renderer', 'theme.js'));
  // Set ids come from the pinned app, not from a list kept here: CHARACTER_CHOICES (src/shared/characters.ts) minus 'theme'.
  // The app has no registry of downloadable or planned sets at that sha, so a world whose defaultSet is not in that list fails until the app has it.
  const ch = require(path.join(app, 'dist-scripts', 'src', 'shared', 'characters.js'));
  const knownSets = ch.CHARACTER_CHOICES.filter((c) => c !== 'theme');
  if (!knownSets.length) throw new Error('no character sets found in the app');
  const opts = { clean: theme._tokens(), knownSets, requireHashes: false };
  return { wp, opts };
}

/** Everything wrong with worlds/<id>/ at `dir`; [] when it passes. */
function checkPackDir(dir, expectedId, v) {
  const { problems, files } = readPackDir(dir);
  if (problems.length) return problems;
  const pics = files.filter((f) => f.name.endsWith('.webp')).map((f) => f.name);
  const assets = files.find((f) => f.name === 'ASSETS.md');
  const out = [];
  if (!assets) out.push('ASSETS.md is missing');
  else out.push(...assetsProblems(assets.data.toString('utf8'), pics));
  const r = v.wp.validateWorldFiles(files.filter((f) => f.name === 'world.json' || f.name.endsWith('.webp')), v.opts);
  if (!r.ok) out.push('pack validator: ' + safe(r.reason));
  else if (r.manifest.id !== expectedId) out.push('world.json id does not match the folder name');
  return out;
}

/** A zip file (a contributor's local check, and the hostile fixtures in tools/test.js). */
function checkZipFile(file, v) {
  const st = fs.lstatSync(file);
  if (!st.isFile()) return ['not a plain file'];
  if (st.size > MAX_ZIP_FILE) return ['larger than 12 MB'];
  const r = v.wp.validateWorldZip(fs.readFileSync(file), v.opts);
  return r.ok ? [] : ['pack validator: ' + safe(r.reason)];
}

module.exports = { asLogin, safe, pathProblem, treeProblems, parseAssets, assetsProblems, readPackDir, loadValidator, checkPackDir, checkZipFile, ID_RE, ASSET_COLUMNS };
