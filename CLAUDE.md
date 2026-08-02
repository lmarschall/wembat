# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Wembat is a framework that gives applications passkey/WebAuthn sign-in and derives a client-side
encryption key from the device credential via the WebAuthn **PRF extension**, so app data can be
end-to-end encrypted without the server ever seeing key material. It's an npm workspaces monorepo:

- `workspaces/server` — `@wembat/server`: Express + Prisma/Postgres + Redis backend. Issues and
  validates JWTs, brokers WebAuthn registration/login/link ceremonies, manages `Application`
  records (tenants) for the dashboard.
- `workspaces/client` — `@wembat/client`: the published npm package. Runs all crypto/private-key
  handling inside a dedicated Web Worker, talks to it from the main thread through a typed
  `Bridge` (postMessage RPC in `bridge.ts`).
- `workspaces/dashboard` — Vue 3 admin UI for managing applications/tenants (uses `#api/application/*`
  and `#api/validate/validateAdmin` on the server).
- `workspaces/demo` — Vue 3 example app consuming `@wembat/client` (via `file:../client`), showing
  the integration a real adopter would do.

## Commands

Root (`/`) — repo-wide tooling only:
```
npm run lint          # eslint --fix across workspaces/**/*.ts
npm run format         # prettier --write across workspaces/**/*.ts
npm run docs:dev       # vitepress dev docs
npm audit fix          # keep to semver-range fixes; esbuild/vite/vitepress trio currently has
                        # no non-breaking fix (vitepress@1.6.4 pins a vulnerable nested vite/esbuild)
```

Per-workspace, run from inside `workspaces/<name>`:
```
# server
npm run build          # tsc -> dist/
npm run start           # node dist/src/app.js
npm run test            # vitest run
npx vitest run src/api/webauthn/register.test.ts   # single test file
npx prisma generate     # regenerate dist-adjacent prisma client after schema/deps change
                          # NOTE: prisma/generated is gitignored; if it exists but is stale/
                          # incompatible, `rm -rf prisma/generated` first — generate refuses to
                          # write into a non-empty dir that isn't already a generated client

# client
npm run test:run        # vitest run (non-watch)
npm run build            # tsc && vite build -> dist/ (this is the published package)

# dashboard / demo
npm run build            # vue-tsc --noEmit && vite build
```

Local backend stack (Postgres + Redis + server + dashboard) is started via `docker-compose.yml`;
copy `.env.template` to `.env` first (or run `install.sh`, which also downloads those two files
from `main` — don't assume it reflects uncommitted local changes).

## Architecture notes worth knowing before touching code

**Three separate JWT trust domains**, all ES256, all embedding the server's own public JWK in the
JWT header and checked against `cryptoService.getPublicKeyJwk()` (self-issued/self-verified, no
external IdP for these tokens):
- `Wembat-App-Token` header, verified by `validateApplicationToken` — identifies which
  `Application` (tenant) a request belongs to; required on WebAuthn ceremony start endpoints.
- `Authorization: Bearer` (webauthn session token), verified by `validateWebAuthnToken` — identifies
  a logged-in user/session; required on `device/list`, `webauthn/link`, `webauthn/request-link`.
- Admin token, verified by `validateAdminToken` — gates all `/api/application/*` CRUD (dashboard
  access). Printed to server logs on boot (`initAdmin` in `app.ts`) rather than distributed any
  other way.

The server's own EC keypair (`workspaces/server/keys/{privateKey,publicKey}.pem`, loaded in
`crypto/index.ts`) signs all three token types — there's no per-tenant signing key on the server
side (tenants get their own encryption keypair, see below, but not a JWT signing key).

**E2E encryption flow** (client-side, in `workspaces/client/src/functions/`):
1. `register.ts` / `login.ts` request a WebAuthn challenge with a `prf.eval` extension, run
   `startRegistration`/`startAuthentication` (delegated to the main thread via the `Bridge`, since
   WebAuthn's `navigator.credentials` isn't available inside a Worker), and get back
   `clientExtensionResults.prf.results.first` — the PRF output tied to the device credential.
2. `helper.ts`'s `deriveEncryptionKeyFromPRF` turns that PRF output into an AES key.
3. A separate EC keypair is generated per registration (`deriveEllipticKeypair`) — this is the
   actual app-facing encryption keypair. Its private key is encrypted with the PRF-derived AES key
   before ever leaving the worker, and only the resulting ciphertext (`cipherBlob`, format
   `v{version}|{salt}|{iv}`) is sent to and stored by the server (`Session.cipherBlob` in
   `schema.prisma`). The server stores ciphertext it cannot decrypt; only a device that can
   re-derive the same PRF output can unwrap the private key.
4. `encrypt.ts`/`decrypt.ts` do ECDH (`deriveEncryptionKey`, own private key + peer public key) to
   get an AES-GCM key for actual message payloads — this is the day-to-day E2E encryption API
   surface (`WembatClient.encrypt`/`.decrypt`), independent of the PRF step above.

**Why the worker boundary matters**: all key material (PRF output, derived AES keys, the EC private
key) lives only inside `worker.ts` and the modules it imports; the main-thread `WembatClient` in
`index.ts` never sees raw keys, only worker RPC results. When editing crypto code, keep private key
material from crossing back into `index.ts` / main-thread scope.

**Prisma client is not imported by package name.** Server code imports it via the subpath import
`#prisma` (defined in `workspaces/server/package.json` `imports`, pointing at
`dist/prisma/generated/client.js`), matching `schema.prisma`'s `output = "./generated"`. If you add
a new file importing the Prisma client, use `import { X } from "#prisma"`, not a relative path into
`prisma/generated`.

**CORS is dynamic, not static config**: `app.ts`'s `corsOptionsDelegate` looks up the request's
`Origin` against `redisService.checkForDomainInWhiteList` per-request rather than a fixed allowlist
— domain whitelisting for tenants is a runtime/Redis concern, not an env var.
