# Commit Conventions for the Auto-Commit Skill

This document explains how `scripts/build-message.js` infers the **type**, **scope**, and **per-file description** for each auto-commit. It is loaded by reference only when the user asks how messages are generated or wants to tweak them.

## Conventional Commit types used

| Type             | When it appears                                                  | Example path                |
|------------------|------------------------------------------------------------------|-----------------------------|
| `feat(server)`   | Anything under `server/modules/<area>/` or `server/config/...`   | `server/modules/auth/auth.controller.js` |
| `feat(frontend)` | Anything under `app/`, `components/`, `lib/`, root `.tsx/.ts`    | `app/login/page.tsx`        |
| `feat(routing)`  | Anything under `routing-engine/` (`.py`, `.html`)                | `routing-engine/routes_engine.py` |
| `feat(ui)`       | `.html` files at the root or in any non-routing folder           | `map_visualizer.html`       |
| `feat`           | Any other source code change                                     | `bin/deploy.sh`             |
| `test`           | Any file with `test` in its name                                 | `server/test-part8.js`      |
| `docs`           | `docs/**` and any `.md` file                                     | `docs/openapi.yaml`? no, see config |
| `chore(config)`  | `.json`, `.yaml`, `.yml`                                         | `package.json`              |
| `style`          | `.css`, `.scss`                                                  | `app/globals.css`           |
| `chore`          | Anything else (default fallback)                                 | `LICENSE`                   |

## Scope inference

`scope` is the first segment of the path that uniquely identifies the subsystem:

- `server/modules/auth/foo.js` → scope `auth`
- `server/modules/deviation/bar.js` → scope `deviation`
- `app/login/page.tsx` → scope `app`
- `components/dashboard/map-placeholder.tsx` → scope `components`
- `routing-engine/geo_utils.py` → scope `routing-engine`

The dominant scope is the scope attached to the **largest changed file** in the commit, by diff size.

## Per-file description

For each changed file we emit a one-line bullet of the form:

```
- `<path>`: <kind>
```

`<kind>` is one of:

- `new file` — status `A`
- `removed` — status `D`
- `renamed` — status `R`
- `code change` — `.js`, `.jsx`, `.ts`, `.tsx`
- `python change` — `.py`
- `style update` — `.css`, `.scss`
- `markup change` — `.html`
- `config tweak` — `.json`, `.yaml`, `.yml`, files matching `config|.env`
- `doc update` — `.md`, anything under `docs/`
- `test update` — filename contains `test`
- `updated` — anything else

## Subsystem bucket

We also group files by **affected area** for the bottom summary block. The bucket key is:

- `server/<module>` for `server/modules/<module>/...`
- the top-level folder otherwise (e.g. `app`, `components`, `routing-engine`, `docs`)

The output looks like:

```
Affected areas:
  - server/auth: 2 file(s)
  - app: 1 file(s)
```

## Why these choices?

- The GeoAgent project has very clean top-level folders (`app/`, `server/`, `routing-engine/`, `docs/`), so scope is unambiguous.
- The skill never invents substantive prose. It does not guess at "what the change does" beyond classifying it by file type and status. This keeps the message honest and machine-parseable.
- If you need a **semantic** description (e.g. "add login validation to auth controller"), write the commit yourself and let the skill only push it.

## Recommended `.gitignore` additions before turning on the daemon

Add these lines to `.gitignore` to avoid committing secrets and noisy files:

```gitignore
# secrets — never auto-commit
.env
.env.*
server/.env
*.pem
*.key

# editor / OS noise
.DS_Store
.idea/
.vscode/
*.swp
node_modules/
.next/
dist/
build/
__pycache__/
*.pyc
```

The skill does **not** modify `.gitignore` itself; you must do it once before starting the daemon.