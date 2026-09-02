---
name: release
description: "Release gbc-seoko to Cloudflare Workers from main, including build verification, SemVer versioning, tags, and hotfix handling. Use when the user wants to ship, deploy, bump the version, cut a release, or says '릴리즈 하자'."
---

# Release: gbc-seoko

## Production (`main`)

This repository deploys the Cloudflare Worker, D1 binding, and static client together. Treat `main` as the production source and use the Worker deployment command so the API and client are shipped as one unit.

1. Ensure the worktree is clean and `main` is up to date with `origin/main`.
2. Choose the next SemVer version from `package.json` and existing `v*` tags. Show the proposed version before changing it.
3. Update the package version without creating an automatic npm tag: `npm version <version> --no-git-tag-version`.
4. Run `npm ci` when dependencies need installation, then run `npm run build`.
5. Review and commit the version change, then create the annotated tag `v<version>` only after user confirmation.
6. Push `main` and the tag only after user confirmation.
7. Deploy with `npm run deploy` only after explicit deployment confirmation. This builds the client and Worker, then runs `wrangler deploy` using `wrangler.jsonc`.
8. Verify the deployed URL loads the SPA and that the Worker-backed API, search, filters, detail navigation, external links, and visit checks work.

Do not use an `_redirects` SPA fallback; this single-route build uses relative assets and the repository documents that rewrite as invalid for its deployment path.

## Hotfix

1. Branch from the latest `main` as `hotfix/<short-description>`.
2. Implement the smallest safe fix and run `npm run build` plus focused checks.
3. Open a PR back to `main` and complete `$review-gate`.
4. After merge, choose and confirm the next patch version, then follow the production version, tag, push, deployment, and verification steps above.

There is no staging branch or separate back-merge path in this repository.
