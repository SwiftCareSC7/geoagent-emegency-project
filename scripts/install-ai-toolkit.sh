#!/usr/bin/env bash
# SwiftCare AI toolkit check — developer machine only.
# Idempotent: safe to run more than once. Detects existing tools, never
# reinstalls working tools, never touches secrets or production config.
set -euo pipefail

have() { command -v "$1" >/dev/null 2>&1; }
fail=0

echo "== SwiftCare AI toolkit check =="

have node || { echo "FAIL: node not found (install Node 18+ first)"; exit 1; }
echo "node: $(node --version)"

for t in is-website-vulnerable specify ruflo; do
  if have "$t"; then echo "$t: ok ($($t --version 2>/dev/null | head -1))";
  else echo "FAIL: $t not installed"; fail=1; fi
done
have strix && echo "strix: ok" || echo "strix: BLOCKED (official installer hangs; needs interactive setup)"

for s in .agents/skills/ponytail/SKILL.md .claude/skills/ponytail/SKILL.md \
         .agents/skills/vibesec/SKILL.md .claude/skills/vibesec/SKILL.md \
         .agents/skills/i-have-adhd/SKILL.md .claude/skills/i-have-adhd/SKILL.md \
         .agents/skills/impeccable/SKILL.md .claude/skills/impeccable/SKILL.md; do
  [ -f "$s" ] && echo "skill: ok ($s)" || { echo "FAIL: missing $s"; fail=1; }
done

[ "$fail" = 0 ] && echo "All required tools + skills present. Done." || { echo "Check FAILED (see above)"; exit 1; }
