#!/usr/bin/env node
/*
 * build-message.js — generate a detailed, meaningful commit message from
 * the currently staged diff.
 *
 * Unlike generic "auto-sync" messages, this script:
 *   1. Reads the actual diff hunks to detect WHAT was added/changed/removed
 *   2. Extracts component names, function names, and variable names
 *   3. Infers the human intent (e.g. "add auth guard", "fix DB index")
 *   4. Writes a subject line that describes the work, not just the file
 *
 * Usage:  node build-message.js <repo-dir> <tick>
 * Output: stdout (piped to a temp file for `git commit -F`)
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
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// 1. Collect staged status
// ---------------------------------------------------------------------------
const statusRaw = git(['diff', '--cached', '--name-status']);
const statusByFile = new Map();
statusRaw
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .forEach((line) => {
    const [code, ...rest] = line.split('\t');
    const file = rest[rest.length - 1];
    statusByFile.set(file, code);
  });

// ---------------------------------------------------------------------------
// 2. Per-file stats (numstat)
// ---------------------------------------------------------------------------
const numstatRaw = git(['diff', '--cached', '--numstat', '--no-renames']);
const perFile = numstatRaw
  .split('\n')
  .map((l) => l.trim())
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
  console.log(`chore: auto-commit (tick #${tick})\n\nNo staged diff detected.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 3. Read the actual diff content (max 30 kB to avoid huge commits)
// ---------------------------------------------------------------------------
const rawDiff = git(['diff', '--cached', '--no-renames', '--unified=3']);
const diffLines = rawDiff.split('\n');

// ---------------------------------------------------------------------------
// 4. Diff analysis helpers
// ---------------------------------------------------------------------------

// Extract identifiers from a single diff line (+ or -)
function extractIdentifiers(line) {
  const ids = [];

  // ES6/TS/JS: const/let/var NAME = or export (const|function|class) NAME
  const declMatch = line.match(
    /(?:export\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/,
  );
  if (declMatch) ids.push(declMatch[1]);

  // Arrow / named function: const name = (...) =>
  const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(\([^)]*\)|\w+)\s*=>/);
  if (arrowMatch) ids.push(arrowMatch[1]);

  // Import: import { A, B } from  or  import X from
  const importNames = [...line.matchAll(
    /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g,
  )];
  for (const m of importNames) {
    if (m[1]) ids.push(...m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()));
    if (m[2]) ids.push(m[2]);
  }

  // JSX / TSX component usage: <ComponentName  or </ComponentName
  const jsxMatches = [...line.matchAll(/<\/?([A-Z]\w+)/g)];
  for (const m of jsxMatches) ids.push(m[1]);

  // Mongoose model: mongoose.model('X', ...) or new Schema / new Model
  const mongooseMatch = line.match(/mongoose\.model\(\s*['"](\w+)['"]/);
  if (mongooseMatch) ids.push(mongooseMatch[1]);

  // Express route: router.(get|post|put|delete|patch)('...',
  const routeMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/);
  if (routeMatch) ids.push(`route:${routeMatch[1].toUpperCase()} ${routeMatch[2]}`);

  // Socket event: socket.emit('X', ...)  or  socket.on('X', ...)
  const socketMatch = line.match(/socket\.(emit|on)\s*\(\s*['"`]([^'"`]+)/);
  if (socketMatch) ids.push(`event:${socketMatch[2]}`);

  // console.log / console.error
  if (/console\.(log|error|warn)\s*\(/.test(line)) ids.push('logging');

  // return / throw (control flow changes)
  if (/^\s*\+.*return\b/.test(line)) ids.push('return');
  if (/^\s*\+.*throw\b/.test(line)) ids.push('throw');

  // Remove noise: single-letter vars, generic keywords, and regex internals
  const noise = new Set(['const', 'let', 'var', 'function', 'return', 'throw',
    'logging', 'true', 'false', 'null', 'undefined', 'this', 'new', 'if',
    'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try',
    'catch', 'finally', 'async', 'await', 'export', 'default', 'import',
    'from', 'require', 'module', 'exports', 'typeof', 'instanceof', 'in',
    'of', 'delete', 'void', 'do', 'with', 'super', 'yield', 'static']);
  const filtered = [];
  for (const id of ids) {
    if (id.length <= 2 || noise.has(id)) continue;
    if (/^[A-Z]$/.test(id)) continue;
    if (/^_|__/.test(id)) continue;
    if (/\d+$/.test(id)) continue;
    filtered.push(id);
  }

  return filtered;
}

// Parse the diff into per-file hunks and extract added/removed lines.
function parseDiffHunks(diffText) {
  const hunks = [];
  let currentFile = null;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git')) {
      // "diff --git a/path/to/file b/path/to/file"
      const match = line.match(/ b\/(.+)$/);
      currentFile = match ? match[1] : null;
    }
    if (currentFile) {
      if (!hunks.find((h) => h.file === currentFile)) {
        hunks.push({ file: currentFile, added: [], removed: [] });
      }
      const hunk = hunks.find((h) => h.file === currentFile);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        hunk.added.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        hunk.removed.push(line.slice(1));
      }
    }
  }
  return hunks;
}

const hunks = parseDiffHunks(rawDiff);

// For each file, collect all new identifiers (added lines) and removed identifiers.
const fileAnalysis = hunks.map((h) => {
  const newIds = new Set();
  const removedIds = new Set();
  for (const line of h.added) {
    for (const id of extractIdentifiers(line)) newIds.add(id);
  }
  for (const line of h.removed) {
    for (const id of extractIdentifiers(line)) removedIds.add(id);
  }
  return {
    file: h.file,
    newIds: [...newIds],
    removedIds: [...removedIds],
    addedCount: h.added.length,
    removedCount: h.removed.length,
  };
});

// ---------------------------------------------------------------------------
// 5. Classify file status
// ---------------------------------------------------------------------------
function fileVerb(file) {
  const code = statusByFile.get(file) || 'M';
  switch (code.charAt(0)) {
    case 'A': return 'added';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default:  return 'modified';
  }
}

// ---------------------------------------------------------------------------
// 6. Infer type + scope (Conventional Commits style)
// ---------------------------------------------------------------------------
function inferType(file) {
  const f = file.toLowerCase();
  if (f.includes('/test-') || f.endsWith('.test.js') || f.endsWith('.spec.js'))
    return 'test';
  if (f.startsWith('server/modules/') || f.startsWith('server/')) return 'feat';
  if (f.startsWith('app/') || f.startsWith('components/') || f.startsWith('lib/'))
    return 'feat';
  if (f.startsWith('routing-engine/')) return 'feat';
  if (f.startsWith('docs/')) return 'docs';
  if (f.endsWith('.md')) return 'docs';
  if (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')) return 'chore';
  if (f.endsWith('.css') || f.endsWith('.scss')) return 'style';
  if (f.endsWith('.html')) return 'feat';
  if (f.endsWith('.py')) return 'feat';
  return 'chore';
}

function inferScope(file) {
  const parts = file.split('/');
  if (parts.length === 1) return 'root';
  if (parts[0] === 'server' && parts.length >= 3 && parts[1] === 'modules') {
    return parts[2];
  }
  if (parts[0] === '.agents' && parts[1] === 'skills' && parts[2]) return parts[2];
  if (parts[0] === 'components' && parts.length >= 3) return parts[1]; // components/auth/LoginForm.tsx → auth
  return parts[0];
}

function dominantScope(files) {
  const counts = new Map();
  for (const f of files) {
    const s = inferScope(f);
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best = 'root';
  let bestN = -1;
  for (const [s, n] of counts) if (n > bestN) { best = s; bestN = n; }
  return best;
}

// ---------------------------------------------------------------------------
// 7. Detect what was done (the "verb phrase" for the subject line)
// ---------------------------------------------------------------------------

function detectWorkSummary(analysis) {
  // Aggregate all new and removed identifiers across every file.
  const allNew = new Set();
  const allRemoved = new Set();
  for (const fa of analysis) {
    for (const id of fa.newIds) allNew.add(id);
    for (const id of fa.removedIds) allRemoved.add(id);
  }

  const newCount = analysis.reduce((s, f) => s + f.addedCount, 0);
  const removedCount = analysis.reduce((s, f) => s + f.removedCount, 0);
  const total = newCount + removedCount;

  // --- Pattern 1: New files only (all status A) ----------------------------
  const allAdded = analysis.every((f) => (statusByFile.get(f.file) || 'M').startsWith('A'));
  if (allAdded) {
    // Detect what was added
    const components = [...allNew].filter((id) => /^[A-Z]/.test(id));
    const funcs = [...allNew].filter((id) => /^[a-z]/.test(id));
    if (components.length === 1 && funcs.length <= 3) {
      return `add ${components[0]} component`;
    }
    if (components.length > 1) {
      return `add ${components.length} new components`;
    }
    if (funcs.length === 1) {
      return `add ${funcs[0]} function`;
    }
    if (funcs.length > 1) {
      return `add ${funcs.slice(0, 3).join(', ')} and ${funcs.length - 3} more`;
    }
    return `add new ${inferScope(analysis[0].file)} files`;
  }

  // --- Pattern 2: Deleted files only (all status D) -------------------------
  const allDeleted = analysis.every((f) => (statusByFile.get(f.file) || 'M').startsWith('D'));
  if (allDeleted) {
    const names = analysis.map((f) => path.basename(f.file, path.extname(f.file)));
    if (names.length === 1) return `remove ${names[0]}`;
    return `remove ${names.length} files (${names.slice(0, 3).join(', ')})`;
  }

  // --- Pattern 3: Pure additions (no deletions) -----------------------------
  if (removedCount === 0) {
    const components = [...allNew].filter((id) => /^[A-Z]/.test(id));
    const funcs = [...allNew].filter((id) => /^[a-z]/.test(id) && id.length > 2);

    if (components.length === 1) return `add ${components[0]} component`;
    if (components.length > 1) return `add ${components.length} new ${inferScope(analysis[0].file)} components`;
    if (funcs.length === 1) return `add ${funcs[0]} to ${inferScope(analysis[0].file)}`;
    if (funcs.length > 1) return `add ${funcs.slice(0, 3).join(', ')} to ${inferScope(analysis[0].file)}`;
    return `add new ${inferScope(analysis[0].file)} code`;
  }

  // --- Pattern 4: Pure deletions (no additions) -----------------------------
  if (newCount === 0) {
    const names = [...allRemoved].slice(0, 3);
    if (names.length === 1) return `remove ${names[0]}`;
    return `remove ${names.join(', ')} and ${allRemoved.size - names.length} more`;
  }

  // --- Pattern 5: Mixed — detect the dominant change ------------------------
  // If more additions than removals, it's likely "add X" with some cleanup.
  // If more removals, it's likely "remove/refactor X" with some additions.
  if (newCount > removedCount * 2) {
    const components = [...allNew].filter((id) => /^[A-Z]/.test(id));
    const funcs = [...allNew].filter((id) => /^[a-z]/.test(id) && id.length > 2);
    if (components.length >= 1) return `add ${components.slice(0, 3).join(', ')} components`;
    if (funcs.length >= 1) return `add ${funcs.slice(0, 3).join(', ')} to ${inferScope(analysis[0].file)}`;
    return `update ${inferScope(analysis[0].file)} with new code`;
  }

  if (removedCount > newCount * 2) {
    const names = [...allRemoved].filter((id) => id.length > 2).slice(0, 3);
    if (names.length === 1) return `remove ${names[0]}`;
    if (names.length > 1) return `remove ${names.join(', ')} from ${inferScope(analysis[0].file)}`;
    return `clean up ${inferScope(analysis[0].file)}`;
  }

  // --- Fallback: balanced change --------------------------------------------
  const topNames = [...allNew].slice(0, 2);
  if (topNames.length === 1) return `update ${topNames[0]} in ${inferScope(analysis[0].file)}`;
  if (topNames.length > 1) return `update ${topNames.join(', ')} in ${inferScope(analysis[0].file)}`;
  return `update ${inferScope(analysis[0].file)} module`;
}

// ---------------------------------------------------------------------------
// 8. Build the per-file description line (richer than before)
// ---------------------------------------------------------------------------
function describeFile(fa) {
  const code = statusByFile.get(fa.file) || 'M';
  const verb = fileVerb(fa.file);
  const shortPath = fa.file;

  if (verb === 'added') return `- \`${shortPath}\`: new file`;
  if (verb === 'deleted') return `- \`${shortPath}\`: removed`;
  if (verb === 'renamed') return `- \`${shortPath}\`: renamed`;

  // Modified: describe what changed using identifiers
  const newNames = fa.newIds.filter((id) => !['return', 'throw', 'logging'].includes(id));
  const remNames = fa.removedIds.filter((id) => !['return', 'throw', 'logging'].includes(id));
  const parts = [];
  if (newNames.length > 0) {
    const display = newNames.slice(0, 4).join(', ');
    const extra = newNames.length > 4 ? ` +${newNames.length - 4}` : '';
    parts.push(`add ${display}${extra}`);
  }
  if (remNames.length > 0) {
    const display = remNames.slice(0, 4).join(', ');
    const extra = remNames.length > 4 ? ` +${remNames.length - 4}` : '';
    parts.push(`remove ${display}${extra}`);
  }

  if (parts.length === 0) {
    // Generic fallback for modified files with no extractable identifiers
    return `- \`${shortPath}\`: updated`;
  }
  return `- \`${shortPath}\`: ${parts.join('; ')}`;
}

// ---------------------------------------------------------------------------
// 9. Subsystem buckets
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 10. Compose the final message
// ---------------------------------------------------------------------------
const files = perFile.map((f) => f.file);
const totalAdd = perFile.reduce((s, f) => s + f.add, 0);
const totalDel = perFile.reduce((s, f) => s + f.del, 0);

const type = inferType(files[0]);
const scope = dominantScope(files);
const workSummary = detectWorkSummary(fileAnalysis);

const subject = `${type}(${scope}): ${workSummary}`;

const lines = [];
lines.push(subject);
lines.push('');
lines.push(...fileAnalysis.map(describeFile));
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
