# Deployment runbook

**Made by Lakshay Dhiman**

Railway PostgreSQL, the API, private image storage, and both Vercel client interfaces are live. Existing local accounts/artwork were copied over TLS at the user's request, with sessions excluded and the temporary database proxy removed. Brevo authentication and sender verification passed; actual recovery-message delivery remains to be checked. The Android HTTPS cloud APK finished and passed package inspection. See [CLOUD.md](CLOUD.md) and [MOBILE.md](MOBILE.md) for links and records. App-store release and installable iPhone signing remain pending.

## PostgreSQL

For a step-by-step Railway/Vercel setup and phone installation, see [CLOUD.md](CLOUD.md).

1. Provision PostgreSQL 17+ with encrypted connections and backups. Enable `pg_trgm` using a migration-capable role.
2. Set `DATABASE_URL` privately in your hosting environment. Keep runtime and migration privileges appropriately scoped.
3. Run `npm run db:migrate` with the direct/migration connection before deploying new API traffic. Do not use `prisma db push` or `migrate reset` against production.
4. Verify tables, constraints, indexes, and the health endpoint. The demo seed is for local development; production starts with actual user-created data.
5. Test a backup restore in a separate database before launch. A source rollback does not automatically reverse a migration; prefer forward-compatible migrations and corrective follow-up migrations.

## S3-compatible image storage

Provision S3-compatible storage. For a public CDN/read domain, use `STORAGE_DELIVERY=public`. For a private Railway bucket, use `STORAGE_DELIVERY=proxy` with `STORAGE_PUBLIC_URL=https://YOUR_API_DOMAIN/media`. The proxy only serves structured keys registered in the asset table and requires GetObject in addition to PutObject/DeleteObject access. Client applications receive no credentials. Configure region/bucket/access key/secret/media URL; set `STORAGE_ENDPOINT` for Railway, R2, or another compatible service.

The storage adapter writes `image/webp` with immutable one-year caching and random keys. Provision the bucket before startup; the API does not create infrastructure. Verify an actual upload and CDN read from both device platforms. Configure retention/garbage collection for unreferenced uploads after a suitable grace period; pending local upload records are not automatically pruned.

## Email and recovery links

Use `MAIL_PROVIDER=brevo` with a Brevo API key and verified `MAIL_FROM_EMAIL` for HTTPS delivery. Railway Free/Trial/Hobby blocks SMTP. On a host that permits SMTP, `MAIL_PROVIDER=smtp` supports the existing authenticated SMTP variables. Set `RESET_URL=nexanft://reset-password` for the app’s scheme or an associated HTTPS app link once configured. Production validation requires the selected provider's credentials. Local SMTP-mode development without a host writes `.eml` messages to the ignored outbox. See CLOUD.md for personal Gmail verification and Brevo's temporary sender replacement; authenticate a domain you control for long-term delivery.

## Render

Use the root `render.yaml` blueprint with your PostgreSQL and storage/mail settings. Its starter plan is a configuration choice; deployment can incur charges. Build installs server/shared workspaces, compiles contracts via postinstall, generates Prisma Client, and compiles the API. Pre-deploy applies migrations. Start uses the compiled server and `/health` probes PostgreSQL.

Set production origins exactly, a random secret, `TRUST_PROXY=1` only when Render is the single trusted hop, and `ENABLE_DEMO_TRANSFERS=false`. If using another proxy topology, adjust the trusted hop count; do not blindly trust arbitrary forwarding headers. Add storage endpoint/path-style overrides for your provider if necessary.

## Container

```sh
docker build -t nexanft-api .
docker run --env-file YOUR_PRIVATE_PRODUCTION_ENV -p 4000:4000 nexanft-api
```

The runtime uses Node 22, OpenSSL, and an unprivileged user. It includes the pinned Prisma CLI and `server/prisma` schema/migrations for a separate pre-deploy migration command: `npm run db:migrate -w @nexanft/server`. Run that before starting new API traffic, rather than during the image build. Secrets are injected at runtime and excluded from the build context. The Docker image passed local execution checks against disposable PostgreSQL. The Railway deployment built successfully, applied the packaged schema in pre-deploy, and passed live database health checks.

## Landing on Vercel or Netlify

For Vercel, import the repository and select root directory `landing`. Use its `vercel.json`; output directory is `dist`. Netlify uses root `netlify.toml`, builds the landing workspace, and publishes `landing/dist`. Configure `VITE_API_URL` and `VITE_DEMO_URL` to actual HTTPS deployments; set release/GitHub URLs only once they exist. These values are public build-time configuration.

The build copies the root README as a downloadable project guide. App screenshots are committed under `landing/public/screenshots`; regenerate them with browser tests after major UI changes. Google Fonts are used on the landing; self-host the fonts for deployments that require no third-party font request.

## Expo web demo

Export `mobile/` with the production HTTPS API setting and deploy `mobile/dist` to a separate static host with an SPA fallback. Keep the landing's demo URL aligned with it. The optional demo uses per-tab sessionStorage, so do not market it as native SecureStore. Production demo transfers should remain disabled unless you intentionally run a labeled sandbox. At the user's request, this cloud demo marketplace enables `ENABLE_DEMO_TRANSFERS=true`, its web export uses `--demo-transfers=true`, and its internal Android `cloud` profile overrides `EXPO_PUBLIC_ENABLE_DEMO_TRANSFERS=true`. The Collect action retains its explicit acknowledgment that no payment or blockchain transfer occurs. The store `production` profile still defaults to disabled.

## Android and iOS

Choose final bundle IDs first. In `mobile`, log into EAS, initialize the project, and set `EAS_PROJECT_ID` in your build environment. Configure EAS `preview` and `production` environment variables. Public API URLs must point to reachable HTTPS services; never put secrets in EXPO_PUBLIC variables.

Build profiles: development = local APK and iOS simulator, preview = local internal APK/ad-hoc iOS, cloud = HTTPS internal Android APK using the production EAS environment, production = Android AAB/store-signed iOS with version increments. The finished HTTPS cloud APK and earlier local-network Android/iOS simulator packages were inspected; see MOBILE.md. The landing's Android button links the cloud APK for direct installation. App-store submission has not been performed; add store release URLs after publication.

## Production smoke checks

- Readiness, exact CORS origins, error redaction, rate-limit behavior behind the trusted proxy.
- Registration/login/refresh/logout/recovery, duplicate accounts, concurrent refresh/replay rejection.
- Upload valid/invalid images, verify CDN reads, create listing, owner/non-owner mutations.
- Search/sort/pagination, favorites privacy, profile updates, notification ownership.
- For a store production release, confirm transfers are disabled. For the explicitly enabled cloud demo, verify authenticated collection acknowledgment, listed/non-owner restrictions, a single winner for concurrent collection, and atomic activity/notification records.
- Check native keyboard/safe areas, offline handling, permissions, secure restoration, deep-link recovery, device confirmations.
- Resolve/reassess dependency advisories, verify backups/restore, connection-pool limits, alerting, and storage retention.

Scale beyond one API instance only after adopting a shared rate-limit store and a deliberate PostgreSQL connection budget. Wire structured request-ID logs to your monitoring service with sensitive-field scrubbing.
