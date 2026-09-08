#!/usr/bin/env node
/*
 * build-message.js — generate a detailed, meaningful commit message from
 * the currently staged diff.
 *
 * Analyzes diff hunks to detect WHAT was added/changed/removed, extracts
 * component names, function names, infers intent, and writes a Conventional
 * Commit-style subject + body.
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
    const parts = line.split('\t');
    const code = parts[0];
    const file = parts[parts.length - 1];
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
// 3. Read the actual diff content (cap at 40 kB to avoid huge commits)
// ---------------------------------------------------------------------------
const rawDiff = git(['diff', '--cached', '--no-renames', '--unified=3']);
const MAX_DIFF_BYTES = 40 * 1024;
const truncatedDiff =
  Buffer.byteLength(rawDiff, 'utf8') > MAX_DIFF_BYTES
    ? rawDiff.slice(0, MAX_DIFF_BYTES) + '\n... [diff truncated]'
    : rawDiff;
const diffLines = truncatedDiff.split('\n');

// ---------------------------------------------------------------------------
// 4. Diff analysis helpers
// ---------------------------------------------------------------------------

// Extract identifiers from a diff line
function extractIdentifiers(line) {
  const ids = [];
  const content = line.replace(/^[+-]/, '');

  // const/let/var/function/class/interface/type/enum NAME
  const declMatch = content.match(
    /(?:export\s+)?(?:const|let|var|function|class|interface|type|enum|async\s+function)\s+(\w+)/,
  );
  if (declMatch) ids.push(declMatch[1]);

  // Arrow function: const name = (...) =>
  const arrowMatch = content.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/);
  if (arrowMatch) ids.push(arrowMatch[1]);

  // Import: import { A, B } from
  const importMatch = content.match(/import\s+\{([^}]+)\}/);
  if (importMatch) {
    importMatch[1].split(',').forEach((name) => {
      const trimmed = name.trim().split(/\s+as\s+/)[0].trim();
      if (trimmed) ids.push(trimmed);
    });
  }

  // Export default/export const
  const exportMatch = content.match(/export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/);
  if (exportMatch) ids.push(exportMatch[1]);

  return ids;
}

// Detect component usage (PascalCase identifiers that look like React components)
function detectComponents(lines) {
  const components = new Set();
  const pascalCase = /^[A-Z][a-zA-Z0-9]+$/;
  // Known false positives to skip
  const falsePositives = new Set([
    'Error', 'Map', 'Set', 'Array', 'Object', 'Promise', 'JSON', 'Math',
    'Date', 'RegExp', 'String', 'Number', 'Boolean', 'Symbol', 'Buffer',
    'Process', 'Console', 'Module', 'Exports', 'True', 'False', 'Null',
    'Undefined', 'NaN', 'Infinity', 'Type', 'Enum', 'Interface',
  ]);

  lines.forEach((line) => {
    const content = line.replace(/^[+-]/, '');
    // Only look at lines that look like JSX/React patterns
    const isJsxLine = content.includes('<') || content.includes('=>') ||
      content.includes('export') || content.includes('import') ||
      content.includes('return') || content.includes('function') ||
      content.includes('const');
    if (!isJsxLine) return;

    const tokens = content.split(/[\s=<>(){},;:'"\[\]|&!]/).filter(Boolean);
    tokens.forEach((tok) => {
      if (pascalCase.test(tok) && tok.length > 3 && tok.length < 30 && !falsePositives.has(tok)) {
        components.add(tok);
      }
    });
  });
  return [...components].slice(0, 10);
}

// Detect API/route patterns (only from actual code, not comments)
function detectAPIs(lines) {
  const apis = [];
  lines.forEach((line) => {
    const content = line.replace(/^[+-]/, '');
    // Skip comments
    if (content.match(/^\s*(\/\/|#|\/\*|\*|<!--)/)) return;
    if (content.match(/^\s*\*/)) return;  // block comment lines

    // Express routes: app.get('/path', router.get('/path', etc.
    const routeMatch = content.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](\/[^'"`]+)['"`]/);
    if (routeMatch) {
      apis.push(`${routeMatch[1].toUpperCase()} ${routeMatch[2]}`);
    }

    // Socket events: socket.on('event', emit('event'
    const socketMatch = content.match(/(?:socket\.on|emit|io\.emit)\s*\(\s*['"`]([a-z][a-z.]+)['"`]/);
    if (socketMatch) {
      apis.push(`socket:${socketMatch[1]}`);
    }

    // fetch/API calls (real URLs only)
    const fetchMatch = content.match(/fetch\s*\(\s*['"`](https?:\/\/[^'"`]+)['"`]/);
    if (fetchMatch) {
      apis.push(`fetch:${fetchMatch[1]}`);
    }
  });
  return [...new Set(apis)];
}

// Detect database/schema changes
function detectSchemaChanges(lines) {
  const changes = [];
  lines.forEach((line) => {
    const content = line.replace(/^[+-]/, '');
    if (content.match(/new\s+Schema\s*\(/)) changes.push('schema');
    if (content.match(/\.(index|ensureIndex)\s*\(\s*\{/)) changes.push('index');
    if (content.match(/required:\s*true/) && !content.match(/\/\//)) changes.push('required-field');
    if (content.match(/2dsphere/) && !content.match(/\/\//)) changes.push('spatial-index');
    if (content.match(/unique:\s*true/) && !content.match(/\/\//)) changes.push('unique-constraint');
  });
  return [...new Set(changes)];
}

// ---------------------------------------------------------------------------
// 5. Classify the commit type
// ---------------------------------------------------------------------------
function classifyType(status, file, addedLines, removedLines) {
  // New file = feat
  if (status === 'A') return 'feat';

  // Deleted file = feat (with remove prefix)
  if (status === 'D') return 'feat';

  // Config/meta files = chore
  const configPatterns = [
    /package\.json$/, /package-lock\.json$/, /\.lock$/,
    /\.eslintrc/, /\.prettierrc/, /tsconfig/, /next\.config/,
    /render\.yaml/, /\.env/, /\.gitignore/, /Dockerfile/,
    /docker-compose/, /\.github\//, /jest\.config/,
  ];
  if (configPatterns.some((p) => p.test(file))) return 'chore';

  // Documentation
  if (/\.(md|txt|rst)$/.test(file) && !/SKILL\.md/.test(file)) return 'docs';

  // Test files
  if (/test|spec|__test__|__spec__/.test(file)) return 'test';

  // Bug fix patterns: more deletions than additions, fixing error handling
  if (removedLines > addedLines * 2 && removedLines > 10) return 'fix';

  // Default: feat for new content, fix for mostly removals
  return addedLines >= removedLines ? 'feat' : 'fix';
}

// ---------------------------------------------------------------------------
// 6. Determine scope from file paths
// ---------------------------------------------------------------------------
function determineScope(files) {
  const dirMap = {};
  files.forEach((f) => {
    const parts = f.file.split('/');
    let scope = parts[0];

    // Go deeper for src-like structures
    if (['components', 'lib', 'server', 'app', 'src'].includes(parts[0]) && parts.length > 1) {
      scope = parts.slice(0, 2).join('/');
    }

    // Normalize common patterns
    if (scope.startsWith('server/modules/')) {
      scope = scope.replace('server/modules/', 'server:');
    }
    if (scope.startsWith('components/')) {
      scope = scope.replace('components/', 'ui:');
    }
    if (scope.startsWith('lib/api/')) {
      scope = 'api-client';
    }
    if (scope.startsWith('lib/socket/')) {
      scope = 'realtime';
    }
    if (scope.startsWith('app/')) {
      const page = scope.replace('app/', '');
      if (page) scope = `page:${page}`;
    }

    dirMap[scope] = (dirMap[scope] || 0) + 1;
  });

  // Return the most-affected directory
  const sorted = Object.entries(dirMap).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const primary = sorted[0][0];
    // Simplify overly long scopes
    if (primary.length > 30) return primary.split('/').pop();
    return primary;
  }
  return 'core';
}

// ---------------------------------------------------------------------------
// 7. Build subject line
// ---------------------------------------------------------------------------
function buildSubject(type, scope, summary) {
  const prefix = scope ? `${type}(${scope})` : type;
  // Capitalize first letter of summary, ensure it ends without period
  const sub = summary.charAt(0).toUpperCase() + summary.slice(1);
  return `${prefix}: ${sub.replace(/\.$/, '')}`;
}

// ---------------------------------------------------------------------------
// 8. Build body
// ---------------------------------------------------------------------------
function buildBody(files, components, apis, schemaChanges, totalAdd, totalDel) {
  const lines = [];

  // Summary of what changed
  if (files.length <= 6) {
    files.forEach((f) => {
      const symbol = f.status === 'A' ? '+' : f.status === 'D' ? '-' : '~';
      lines.push(`- ${symbol} ${f.file} (+${f.add}, -${f.del})`);
    });
  } else {
    lines.push(`${files.length} files changed:`);
    const grouped = {};
    files.forEach((f) => {
      const dir = f.file.split('/').slice(0, -1).join('/') || '.';
      grouped[dir] = grouped[dir] || [];
      grouped[dir].push(f);
    });
    Object.entries(grouped).forEach(([dir, group]) => {
      group.forEach((f) => {
        const symbol = f.status === 'A' ? '+' : f.status === 'D' ? '-' : '~';
        lines.push(`- ${symbol} ${f.file} (+${f.add}, -${f.del})`);
      });
    });
  }

  // Key components affected
  if (components.length > 0 && components.length <= 15) {
    lines.push('');
    lines.push(`Key components: ${components.slice(0, 10).join(', ')}`);
  }

  // API/socket endpoints affected
  if (apis.length > 0) {
    lines.push('');
    lines.push(`Endpoints: ${apis.join(', ')}`);
  }

  // Schema changes
  if (schemaChanges.length > 0) {
    lines.push('');
    lines.push(`Schema: ${schemaChanges.join(', ')}`);
  }

  // Stats footer
  lines.push('');
  lines.push(
    `Stats: ${files.length} file(s) changed, +${totalAdd} lines, -${totalDel} lines | tick #${tick}`,
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 9. Generate summary from diff content
// ---------------------------------------------------------------------------
function generateSummary(diffLines, files) {
  const parts = [];

  // Group files by status
  const added = files.filter((f) => f.status === 'A');
  const deleted = files.filter((f) => f.status === 'D');
  const modified = files.filter((f) => f.status === 'M' || f.status === 'R');

  // Build a file-description-based summary (most reliable and readable)
  if (added.length > 0) {
    if (added.length === 1) {
      const basename = path.basename(added[0].file, path.extname(added[0].file));
      parts.push(`add ${basename}`);
    } else {
      // Group by directory
      const dirs = {};
      added.forEach((f) => {
        const dir = f.file.split('/').slice(0, -1).join('/') || '.';
        dirs[dir] = dirs[dir] || [];
        dirs[dir].push(path.basename(f.file, path.extname(f.file)));
      });
      const dirEntries = Object.entries(dirs);
      if (dirEntries.length === 1) {
        parts.push(`add ${added.length} files to ${dirEntries[0][0]}`);
      } else {
        parts.push(`add ${added.length} files`);
      }
    }
  }

  if (deleted.length > 0) {
    if (deleted.length === 1) {
      const basename = path.basename(deleted[0].file, path.extname(deleted[0].file));
      parts.push(`remove ${basename}`);
    } else {
      parts.push(`remove ${deleted.length} files`);
    }
  }

  if (modified.length > 0 && added.length === 0 && deleted.length === 0) {
    if (modified.length === 1) {
      const f = modified[0];
      const basename = path.basename(f.file, path.extname(f.file));
      const ext = path.extname(f.file);
      const isConfig = /\.(json|yaml|yml|env|config|lock|toml)$/.test(f.file);
      const isDoc = /\.(md|txt|rst)$/.test(f.file);
      const isTest = /test|spec/.test(f.file);

      if (isConfig) {
        parts.push(`update ${basename}${ext} config`);
      } else if (isDoc) {
        parts.push(`update ${basename} documentation`);
      } else if (isTest) {
        parts.push(`update ${basename} tests`);
      } else {
        parts.push(`update ${basename}`);
      }
    } else {
      // Multiple modifications: describe by directory
      const dirs = {};
      modified.forEach((f) => {
        const dir = f.file.split('/').slice(0, -1).join('/') || '.';
        dirs[dir] = (dirs[dir] || 0) + 1;
      });
      const topDir = Object.entries(dirs).sort((a, b) => b[1] - a[1])[0];
      parts.push(`update ${topDir[0]} (${modified.length} files)`);
    }
  }

  // Mixed changes
  if (added.length > 0 && modified.length > 0) {
    parts.push(`and modify ${modified.length} file(s)`);
  }
  if (deleted.length > 0 && (added.length > 0 || modified.length > 0)) {
    parts.push(`and delete ${deleted.length} file(s)`);
  }

  return parts.join(' ') || 'update project files';
}

// ---------------------------------------------------------------------------
// 10. Assemble the final commit message
// ---------------------------------------------------------------------------
const totalAdd = perFile.reduce((sum, f) => sum + f.add, 0);
const totalDel = perFile.reduce((sum, f) => sum + f.del, 0);

// Collect all diff lines for analysis — only from JS/TS/TSX/JSX files (skip .md, .json, .sh, etc.)
const codeExtensions = new Set(['.js', '.ts', '.tsx', '.jsx', '.py', '.css', '.scss']);
const codeDiffLines = [];
let currentFile = '';
for (const line of diffLines) {
  if (line.startsWith('+++ b/')) {
    const filePath = line.slice(6);
    const ext = path.extname(filePath);
    currentFile = codeExtensions.has(ext) ? filePath : '';
  }
  if (currentFile && (line.startsWith('+') || line.startsWith('-'))) {
    codeDiffLines.push(line);
  }
}

const allAdded = codeDiffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++'));
const allRemoved = codeDiffLines.filter((l) => l.startsWith('-') && !l.startsWith('---'));

const components = detectComponents([...allAdded, ...allRemoved]);
const apis = detectAPIs([...allAdded, ...allRemoved]);
const schemaChanges = detectSchemaChanges([...allAdded, ...allRemoved]);
const scope = determineScope(perFile);
const summary = generateSummary(diffLines, perFile);
const type = classifyType(perFile[0].status, perFile[0].file, totalAdd, totalDel);

const subject = buildSubject(type, scope, summary);
const body = buildBody(perFile, components, apis, schemaChanges, totalAdd, totalDel);

// Output the final message
console.log(`${subject}\n\n${body}`);
