# Wardrobe AI — Project Evolution

This repository keeps two iterations of Wardrobe AI separate so the original implementation remains available while the newer interface is developed.

## Version 1 — Original implementation

The original project remains at the repository root. It uses a vanilla HTML, CSS and JavaScript frontend with a Node.js backend.

## Version 2 — Upgraded frontend

The newer React + Vite interface is being kept in `upgraded-version/`. It is a separate frontend iteration with its own package configuration. Its source tree and assets still need to be added before it can be built or deployed.

## Why the versions are separated

- Preserve the original implementation and its existing history.
- Keep the upgraded frontend's dependencies and tooling independent.
- Make the progression between iterations easy to understand.
- Avoid accidentally replacing the original backend or current deployment setup.

## Current limitation

The upgraded files currently available include the HTML entry point and project configuration, but not the required `src/` directory, components, styles or assets. The upgraded version is therefore a scaffold only, not a verified working build.

## Attribution

Document contributors accurately in the repository as the work is integrated. Do not imply that one person authored work contributed by someone else.
