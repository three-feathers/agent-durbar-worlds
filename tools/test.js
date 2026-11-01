#!/usr/bin/env node
'use strict';
/*
 * node tools/test.js <built app checkout>   (CI: .github/workflows/validate.yml). Fixtures come from the app repository's
 * scripts/fixtures/worlds/gen.ts (one good pack, and its whole hostile set as zips); nothing is committed as binary.
 * Also tests this repo's own checks (ASSETS.md, file-type allow-list, links, size) with hostile folders. No network.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('./lib');

const app = process.argv[2];
if (!app) { console.error('usage: node tools/test.js <built app checkout>'); process.exit(2); }
const gen = require(path.join(path.resolve(app), 'dist-scripts', 'scripts', 'fixtures', 'worlds', 'gen.js'));
const v = lib.loadValidator(app);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worlds-test-'));
let n = 0;

const GOOD_ROW = (f, o = {}) => {
  const r = { File: f, Kind: 'world', 'Tool and version': 'hand drawn, test', Date: '2026-11-01', Maker: 'tester', Prompt: 'test picture, no flag, no logo, no text', Processing: 'none', Licence: 'MIT', Approval: 'approved', Approver: 'vikramgorla', 'Approved on': '2026-11-01', ...o };
  return '| ' + lib.ASSET_COLUMNS.map((c) => r[c]).join(' | ') + ' |';
};
const assetsText = (pics, o = {}, skip) => ['| ' + lib.ASSET_COLUMNS.join(' | ') + ' |', '|' + lib.ASSET_COLUMNS.map(() => '---').join('|') + '|', ...pics.filter((p) => p !== skip).map((p) => GOOD_ROW(p, o))].join('\n') + '\n';
function packDir(name, { mutate, assets = {}, skipRow } = {}) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  const files = gen.goodPack({ defaultSet: 'minimalist' });
  const pics = Object.keys(files).filter((f) => f.endsWith('.webp'));
  for (const f of Object.keys(files)) fs.writeFileSync(path.join(dir, f), files[f]);
  fs.writeFileSync(path.join(dir, 'ASSETS.md'), assetsText(pics, assets, skipRow));
  fs.writeFileSync(path.join(dir, 'card.json'), '{}');
  if (mutate) mutate(dir);
  return dir;
}
const ok = (what, cond) => { n++; assert.ok(cond, what); };

// ---- the good pack (folder) ----
const good = packDir('test-world');
assert.deepStrictEqual(lib.checkPackDir(good, 'test-world', v), [], 'good pack folder passes');
n++;
ok('folder name must equal the id', lib.checkPackDir(good, 'other', v).some((p) => /does not match/.test(p)));

// ---- hostile folders: each must fail, for a stated reason ----
const bad = (what, dir, re, id) => { const p = lib.checkPackDir(dir, id || path.basename(dir), v); ok(what + ': ' + p.join('; '), p.length > 0 && p.some((x) => re.test(x))); };
bad('picture with no ASSETS row', packDir('no-row', { skipRow: 'wall.webp' }), /wall\.webp: no row/);
bad('row without a picture', packDir('ghost-row', { mutate: (d) => fs.appendFileSync(path.join(d, 'ASSETS.md'), GOOD_ROW('ghost.webp') + '\n') }), /ghost\.webp: listed in ASSETS\.md but not/);
bad('approved by the maker', packDir('self-approved', { assets: { Maker: 'vikramgorla' } }), /maker cannot approve/);
bad('maker spelled as the owner\'s first name', packDir('self-name', { assets: { Kind: 'crew', Maker: 'Paco', Approver: 'fjcabello' } }), /maker cannot approve/);
bad('maker spelled with @ and capitals', packDir('self-at', { assets: { Maker: '@VikramGorla' } }), /maker cannot approve/);
bad('maker that is not a login', packDir('maker-text', { assets: { Maker: 'Paco and a robot' } }), /Maker must be/);
{ const pr = lib.checkPackDir(packDir('other-maker', { assets: { Maker: 'someone-else' } }), 'test-world', v); assert.deepStrictEqual(pr, [], 'a different maker passes'); n++; }
bad('crew art approved by Vikram, not Paco', packDir('crew-wrong', { assets: { Kind: 'crew' } }), /fjcabello only/);
bad('approval refused', packDir('refused', { assets: { Approval: 'refused' } }), /approval is refused/);
bad('unknown approval state', packDir('state', { assets: { Approval: 'ok' } }), /Approval must be/);
bad('prompt without the exclusion clause', packDir('prompt', { assets: { Prompt: 'a nice office' } }), /exclusion clause/);
bad('ASSETS.md missing', packDir('no-assets', { mutate: (d) => fs.unlinkSync(path.join(d, 'ASSETS.md')) }), /ASSETS\.md is missing/);
bad('a script in the pack', packDir('script', { mutate: (d) => fs.writeFileSync(path.join(d, 'run.js'), 'process.exit(0)') }), /run\.js: not world\.json/);
bad('an SVG in the pack', packDir('svg', { mutate: (d) => fs.writeFileSync(path.join(d, 'a.svg'), '<svg/>') }), /a\.svg: not world\.json/);
bad('a PNG in the pack', packDir('png', { mutate: (d) => fs.writeFileSync(path.join(d, 'a.png'), gen.png(10, 10)) }), /a\.png: not world\.json/);
bad('an oversize picture', packDir('big', { mutate: (d) => fs.writeFileSync(path.join(d, 'wall.webp'), gen.webpOfSize(600, 200, 170 * 1024)) }), /wall\.webp: larger than/);
bad('a folder inside the pack', packDir('nested', { mutate: (d) => fs.mkdirSync(path.join(d, 'sub')) }), /sub: not a plain file/);
bad('a world.json for another id', good, /does not match/, 'someone-else');
bad('a picture that is not a picture', packDir('fake', { mutate: (d) => fs.writeFileSync(path.join(d, 'wall.webp'), Buffer.from('<script>alert(1)</script>')) }), /pack validator/);
let linked = true;
try { const d = packDir('link', { mutate: (d2) => { fs.unlinkSync(path.join(d2, 'wall.webp')); fs.symlinkSync('/etc/hostname', path.join(d2, 'wall.webp')); } }); bad('a symbolic link', d, /not a plain file/); } catch (e) { linked = false; console.log('skip symlink test: ' + e.code); }
void linked;

// ---- the file-type allow-list over a tree ----
const T = (mode, p) => lib.treeProblems([{ mode, path: p }]).length > 0;
for (const p of ['README.md', 'AGENTS.md', 'LICENSE', 'worlds/README.md', 'worlds/_template/ASSETS.md', 'worlds/spain/world.json', 'worlds/spain/wall.webp', 'worlds/spain/ASSETS.md', 'tools/validate.js', '.github/workflows/validate.yml', '.github/CODEOWNERS', '.github/dependabot.yml', '.github/ISSUE_TEMPLATE/propose-world.yml', '.github/scripts/sync-labels.sh', 'docs/notes.md']) ok('allowed: ' + p, !T('100644', p));
for (const p of ['worlds/spain/run.js', 'worlds/spain/a.svg', 'worlds/spain/a.png', 'worlds/spain/x.html', 'worlds/spain/font.woff2', 'worlds/Spain/world.json', 'worlds/spain/sub/wall.webp', 'worlds/spain/..', 'worlds/../x', 'worlds/spain/wall.webp ', 'worlds/spain/wаll.webp', 'worlds/spain/a;b.webp', 'worlds/spain/$(id).webp', 'worlds/spain/a\nb.webp', 'worlds/stray.json', 'tools/x.sh', 'index.html', 'package.json', 'src/a.js', '.github/workflows/x.js', 'a\\b']) ok('refused: ' + JSON.stringify(p), T('100644', p));
ok('a symlink is refused anywhere', T('120000', 'README.md'));
ok('a submodule is refused', T('160000', 'tools/x.js'));
ok('an executable under worlds/ is refused', T('100755', 'worlds/spain/wall.webp'));

// ---- the app repository's good pack and hostile set, as zips ----
// sets come from the app, not from a list here
ok('set ids are read from the app', v.opts.knownSets.includes('minimalist') && !v.opts.knownSets.includes('theme'));
bad('a world naming a set the app does not have', (() => { const d = packDir('unknown-set'); const m = JSON.parse(fs.readFileSync(path.join(d, 'world.json'), 'utf8')); m.defaultSet = 'retro-pixel'; fs.writeFileSync(path.join(d, 'world.json'), JSON.stringify(m)); return d; })(), /pack validator/);
// the app's fixtures name the set 'office', which is not a character choice in the app: allow it for the zip fixtures only
const vz = { ...v, opts: { ...v.opts, knownSets: [...v.opts.knownSets, 'office'] } };
const gz = path.join(tmp, 'good.zip');
fs.writeFileSync(gz, gen.toStored(gen.goodPack()));
assert.deepStrictEqual(lib.checkZipFile(gz, vz), [], 'the app fixture good.zip passes'); n++;
const hostile = gen.hostileSet();
ok('the hostile set has at least 30 packs', hostile.length >= 30);
for (const h of hostile) {
  const f = path.join(tmp, 'bad-' + h.id + '.zip');
  fs.writeFileSync(f, h.zip);
  ok('hostile zip refused: ' + h.id, lib.checkZipFile(f, vz).length > 0);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(n + ' checks passed');
