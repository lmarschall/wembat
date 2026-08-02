# Release Checklist

Wembat is a unified-version monorepo: `server`, `client`, `dashboard`, and `demo` all carry the
same version number, tagged as `v{semver}` on `main`. There is no automated version-bump or
publish pipeline — most of this is manual. Work through this list in order for every release.

## 1. Pre-flight / code state

- [ ] `main` is up to date, working tree clean (`git status`)
- [ ] Decide the new version number; confirm it doesn't collide with an existing tag
      (`git tag --list`)

## 2. Version bump

- [ ] Bump `"version"` in `workspaces/server/package.json`, `workspaces/client/package.json`,
      `workspaces/dashboard/package.json`, and `workspaces/demo/package.json` to match

## 3. Lint / format

- [ ] `npm run lint` (root) — eslint --fix across all workspaces
- [ ] `npm run format` (root) — prettier --write across all workspaces

## 4. Tests

- [ ] `workspaces/server`: `npm run test` (`vitest run`, full suite)
- [ ] `workspaces/client`: `npm run test:run` (the **full** suite — CI's `npm run test` only runs
      the scoped `./src/functions/*.test.ts`, so don't rely on CI alone here)

## 5. Builds

- [ ] `workspaces/server`: `npm run build` (tsc → `dist/`)
- [ ] `workspaces/client`: `npm run build` (tsc && vite build → `dist/`: umd + mjs + `.d.ts`)
- [ ] `workspaces/dashboard`: `npm run build` (vue-tsc --noEmit && vite build)
- [ ] `workspaces/demo`: `npm run build` (vue-tsc --noEmit && vite build; confirm it still builds
      against the just-built local `@wembat/client`, since demo consumes it via `file:../client`)

## 6. Database / Prisma (server)

- [ ] Check `workspaces/server/prisma/schema.prisma` for uncommitted schema drift
- [ ] If the schema changed, generate a migration (don't hand-edit `prisma/generated/`)
- [ ] Confirm `entrypoint.sh`'s `npx prisma migrate deploy` path still applies cleanly (this is
      what runs in production containers, not `migrate dev`)

## 7. Docker / publish

- [ ] `publish.yml` only fires on a GitHub Release and only builds/pushes `:latest`-tagged images
      for **server** and **dashboard** to `ghcr.io/lmarschall/wembat-*` — it does **not**
      version-tag images and does **not** publish `demo` or `@wembat/client`
- [ ] After creating the GitHub Release (tag `v{version}`), verify the `publish.yml` run succeeds
      and images land in GHCR
- [ ] Manually `npm publish` from `workspaces/client` (`@wembat/client`,
      `publishConfig.access: public`, `files: ["dist"]`) — run `npm run build` immediately before;
      don't rely on the `prepublish` script firing automatically (modern npm doesn't honor it)

## 8. Environment / config sanity

- [ ] Root `.env.template` keys (e.g. `DATABASE_POSTGRES_USER`, `API_SERVER_URL`) don't match the
      key names actual `.env` files use (e.g. `DATABASE_USER`, `SERVER_HOST`) — confirm this
      drift hasn't caused a setup issue before shipping, or fix the template as part of the release

## 9. Tag & release

- [ ] `git tag v{version}` and push the tag
- [ ] Create the GitHub Release from that tag (this triggers `publish.yml`)

## 10. Post-release

- [ ] Verify `npm view @wembat/client version` shows the new version
- [ ] Verify GHCR images (`ghcr.io/lmarschall/wembat-server`, `ghcr.io/lmarschall/wembat-dashboard`)
      pulled at `:latest` match the new build
- [ ] Smoke-test `docker-compose up` locally against the new images if feasible
