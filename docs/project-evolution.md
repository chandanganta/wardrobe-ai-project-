# Wardrobe AI — Project Evolution

This repository presents the project as two distinct iterations. Each version has its own folder so the original work and the later interface upgrade are easy to distinguish.

## Version 1 — Original implementation

Location: [`original-version/`](../original-version/)

The original HTML, CSS and JavaScript frontend and Node.js backend are grouped here, with their own `package.json`, lockfile and `.gitignore`. This folder preserves the first implementation as a standalone project.

## Version 2 — Upgraded frontend

Location: [`upgraded-version/`](../upgraded-version/)

The newer React + Vite interface has its own configuration and dependencies. Its full `src/` source tree, components, styles and assets still need to be added before it can be built or run.

## Repository layout

- `original-version/` — first implementation
- `upgraded-version/` — separate React + Vite frontend iteration
- `docs/` — project evolution notes
- `README.md` — repository-level overview

## Why the versions are separated

- Preserve the original implementation and its history.
- Keep dependencies and tooling independent.
- Make the progression between iterations clear to reviewers.
- Avoid mixing frontend implementations or backend files.

## Current deployment note

The existing `main` branch has not been changed. It still contains the original root-level files, so the current deployment setup remains untouched. This branch is a proposed reorganized layout for review; moving the original files into a subfolder may require updating the hosting provider's base/publish directory before this branch is merged or deployed.

## Attribution

Credit contributors accurately as the upgraded implementation is integrated. Do not imply that one person authored work contributed by someone else.
