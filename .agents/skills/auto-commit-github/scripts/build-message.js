#!/usr/bin/env node
/*
 * build-message.js — generate a detailed, human-readable commit message from
 * the currently staged diff in a git repository.
 *
 * Usage:
 *   node build-message.js <repo-dir> <tick>
 *
 * Output goes to stdout (the caller pipes it to a temp file and uses
 * `git commit -F <file>`).
 *
 * The message has the shape:
 *
 *   <type>(<scope>): <short summary>
 *
 *   - <file1>: <what changed>
 *   - <file2>: <what changed>
 *   ...
 *
 *   Affected areas:
 *     - <subsystem>: <file-count> file(s)
 *
 *   Stats: +<insertions> / -<deletions> across <files> file(s)
 *
 *   Auto-commit @ <ISO timestamp> | tick #<N>
 */

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoDir = path.resolve(process.argv[2] || process.cwd());
const tick = String(process.argv[3] || '0');

if (!fs.existsSync(path.join(repoDir, '.git'))) {
  console.error(`build-message.js: ${repoDir} is not a git repo`);
  process.exit(1);
}

const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: repoDir, encoding: 'utf8' });
  } catch (err) {
    return '';
  }
};

// ---------- 1. Status (added / modified / deleted / renamed) ------------------
const statusRaw = git(['diff', '--cached', '--name-status']);
const statusByFile = new Map();
statusRaw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .forEach((line) => {
    const [code, ...rest] = line.split('\t');
    const file = rest[rest.length - 1];
    statusByFile.set(file, code);
  });

// ---------- 2. Per-file stats from `git diff --cached --numstat` --------------
const numstatRaw = git(['diff', '--cached', '--numstat', '--no-renames']);
const perFile = numstatRaw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [add, del, file] = line.split('\t');
    return {
      file,
      add: add === '-' ? 0 : Number(add),
      del: del === '-' ? 0 : Number(del),
      status: statusByFile.get(file) || 'M',
    };
  });

if (perFile.length === 0) {
  // Nothing staged; the wrapper script should not have called us. Emit a
  // minimal message so `git commit` still produces something.
  console.log(`chore: auto-commit (tick #${tick})`);
  console.log('');
  console.log('No staged diff detected.');
  process.exit(0);
}

// ---------- 3. Aggregate stats ------------------------------------------------
const totalAdd = perFile.reduce((s, f) => s + f.add, 0);
const totalDel = perFile.reduce((s, f) => s + f.del, 0);

// ---------- 4. Infer type + scope from changed paths --------------------------
// Conventional Commits-ish mapping for the GeoAgent project.
function inferType(file) {
  const f = file.toLowerCase();
  if (f.includes('/test-') || f.endsWith('.test.js') || f.endsWith('.spec.js'))
    return 'test';
  if (f.startsWith('server/modules/') || f.startsWith('server/')) return 'feat(server)';
  if (f.startsWith('app/') || f.startsWith('components/') || f.startsWith('lib/'))
    return 'feat(frontend)';
  if (f.startsWith('routing-engine/')) return 'feat(routing)';
  if (f.startsWith('docs/')) return 'docs';
  if (f.endsWith('.md')) return 'docs';
  if (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')) return 'chore(config)';
  if (f.endsWith('.css') || f.endsWith('.scss')) return 'style';
  if (f.endsWith('.html')) return 'feat(ui)';
  if (f.endsWith('.py')) return 'feat(routing)';
  if (f.endsWith('.ts') || f.endsWith('.tsx')) return 'feat(frontend)';
  if (f.endsWith('.js') || f.endsWith('.jsx')) return 'feat(server)';
  return 'chore';
}

// Scope = top-level folder for the most-touched file.
function inferScope(file) {
  const parts = file.split('/');
  if (parts.length === 1) return 'root';
  if (parts[0] === 'server' && parts.length >= 3 && parts[1] === 'modules') {
    return parts[2]; // e.g. server/modules/auth -> scope = auth
  }
  if (parts[0] === '.agents' && parts[1] === 'skills' && parts[2]) {
    return parts[2]; // .agents/skills/<name> -> scope = <name>
  }
  return parts[0]; // app, components, lib, routing-engine, docs, ...
}

// Bucket files by subsystem (top-level folder or server/module).
function bucketBySubsystem(fileList) {
  const buckets = new Map();
  for (const f of fileList) {
    const parts = f.split('/');
    let key = parts[0];
    if (key === 'server' && parts[1] === 'modules' && parts[2]) {
      key = `server/${parts[2]}`;
    } else if (key === '.agents' && parts[1] === 'skills' && parts[2]) {
      key = `.agents/${parts[2]}`;
    }
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return buckets;
}

// Dominant type = most-used type across files.
function dominantType(fileList) {
  const counts = new Map();
  for (const f of fileList) {
    const t = inferType(f);
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = 'chore';
  let bestN = -1;
  for (const [t, n] of counts) if (n > bestN) { best = t; bestN = n; }
  return best;
}

// ---------- 5. Build the human-friendly per-file summary ----------------------
function describeFile(f) {
  const code = statusByFile.get(f.file) || 'M';
  const verb = {
    A: 'added',
    M: 'modified',
    D: 'deleted',
    R: 'renamed',
    C: 'copied',
    T: 'type-changed',
  }[code.charAt(0)] || 'modified';

  const lower = f.file.toLowerCase();
  let kind = 'updated';
  if (verb === 'added') kind = 'new file';
  else if (verb === 'deleted') kind = 'removed';
  else if (/config|\.env|\.json|\.ya?ml/.test(lower)) kind = 'config tweak';
  else if (/readme|\.md$|docs\//.test(lower)) kind = 'doc update';
  else if (/test/.test(lower)) kind = 'test update';
  else if (/\.(ts|tsx|js|jsx)$/.test(lower)) kind = 'code change';
  else if (/\.(py)$/.test(lower)) kind = 'python change';
  else if (/\.(css|scss)$/.test(lower)) kind = 'style update';
  else if (/\.(html)$/.test(lower)) kind = 'markup change';

  return `- \`${f.file}\`: ${kind}`;
}

// Pick the "most important" file for the short summary: largest diff first,
// ties broken by file name length (proxy for "descriptive").
function pickHeadline(files) {
  const sorted = [...files].sort((a, b) => {
    const diff = (b.add + b.del) - (a.add + a.del);
    if (diff !== 0) return diff;
    return b.file.length - a.file.length;
  });
  return sorted[0].file;
}

function shortSummary(headline) {
  const base = headline.split('/').pop();
  return `auto-sync changes (top file: ${base})`;
}

// ---------- 6. Compose --------------------------------------------------------
const files = perFile.map((f) => f.file);
const type = dominantType(files);
const scope = inferScope(pickHeadline(perFile));
const typeWithScope = type.includes('(') ? type : `${type}(${scope})`;
const headline = shortSummary(pickHeadline(perFile));

const lines = [];
lines.push(`${typeWithScope}: ${headline}`);
lines.push('');
lines.push(...perFile.map(describeFile));
lines.push('');
lines.push('Affected areas:');
for (const [area, count] of [...bucketBySubsystem(files)].sort()) {
  lines.push(`  - ${area}: ${count} file(s)`);
}
lines.push('');
lines.push(
  `Stats: +${totalAdd} / -${totalDel} across ${perFile.length} file(s)`,
);
lines.push('');
lines.push(`Auto-commit @ ${new Date().toISOString()} | tick #${tick}`);

console.log(lines.join('\n'));