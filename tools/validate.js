#!/usr/bin/env node
'use strict';
/*
 * node tools/validate.js --app <checkout of agent-durbar, built> --tree
 *   Checks every file in the git tree at HEAD against the file-type allow-list (no links, no scripts under worlds/).
 * node tools/validate.js --app <app> --changed <base-sha> <head-sha>
 *   Validates every worlds/<id>/ that changed between the two commits (all packs when something outside worlds/ changed).
 * node tools/validate.js --app <app> <worlds/id folder or .zip> ...
 *   Validates the folders or zips you name (a local check before a pull request).
 * Exit 0 all good, 1 a problem, 2 usage. Names from the PR are only matched and read, never run: no shell, execFileSync with fixed arguments.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require('./lib');

const git = (args) => execFileSync('git', args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
const SHA = /^[0-9a-f]{40}$/;

function treeEntries() {
  return git(['ls-tree', '-r', '-z', 'HEAD']).toString('utf8').split('\0').filter(Boolean).map((l) => {
    const tab = l.indexOf('\t');
    return { mode: l.slice(0, 6), path: l.slice(tab + 1) };
  });
}
function changedPackIds(base, head) {
  const names = git(['diff', '--name-only', '-z', '--no-renames', base, head]).toString('utf8').split('\0').filter(Boolean);
  const all = names.some((n) => !n.startsWith('worlds/'));
  const ids = new Set();
  for (const n of names) { const m = /^worlds\/([^/]+)\//.exec(n); if (m && m[1] !== '_template') ids.add(m[1]); }
  return { all, ids: [...ids] };
}
function allPackIds() {
  if (!fs.existsSync('worlds')) return [];
  return fs.readdirSync('worlds', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== '_template').map((d) => d.name);
}

function main(argv) {
  const args = argv.slice(2);
  const ai = args.indexOf('--app');
  if (ai < 0 || !args[ai + 1]) { console.error('usage: node tools/validate.js --app <app checkout> (--tree | --changed <base> <head> | <folder or zip>...)'); return 2; }
  const appRoot = args[ai + 1];
  const rest = args.filter((_, i) => i !== ai && i !== ai + 1);
  let bad = 0;
  const report = (what, problems) => { if (problems.length) { bad++; console.log('FAIL ' + lib.safe(what)); problems.forEach((p) => console.log('  - ' + p)); } else console.log('ok   ' + lib.safe(what)); };
  if (rest[0] === '--tree') {
    const e = treeEntries();
    report('file-type allow-list (' + e.length + ' files)', lib.treeProblems(e));
    return bad ? 1 : 0;
  }
  const v = lib.loadValidator(appRoot);
  if (rest[0] === '--changed') {
    const [, base, head] = rest;
    if (!SHA.test(base || '') || !SHA.test(head || '')) { console.error('--changed needs two full commit shas'); return 2; }
    const c = changedPackIds(base, head);
    const ids = c.all ? allPackIds() : c.ids;
    for (const id of ids) {
      if (!lib.ID_RE.test(id)) { report('worlds/' + id, ['not a valid world folder name']); continue; }
      const dir = path.join('worlds', id);
      if (!fs.existsSync(dir)) { console.log('gone ' + id + ' (removed in this change)'); continue; }
      report('worlds/' + id, lib.checkPackDir(dir, id, v));
    }
    if (!ids.length) console.log('no world pack changed');
    return bad ? 1 : 0;
  }
  if (!rest.length) { console.error('name a folder or a zip'); return 2; }
  for (const p of rest) {
    let st; try { st = fs.lstatSync(p); } catch { report(p, ['cannot be read']); continue; }
    report(p, st.isDirectory() ? lib.checkPackDir(p, path.basename(path.resolve(p)), v) : lib.checkZipFile(p, v));
  }
  return bad ? 1 : 0;
}
process.exitCode = main(process.argv);
