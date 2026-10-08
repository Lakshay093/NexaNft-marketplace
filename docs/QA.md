# Verification and QA

**Made by Lakshay Dhiman**

## Automated checks

`npm run verify` performs TypeScript checks (including seed/tests), ESLint, backend/frontend tests, and compiled server/landing builds. `npm run export -w mobile` compiles Android, iOS, and web bundles. `npm run test:e2e` exercises the real web export against local services.

Backend tests use an isolated PostgreSQL database ending in `_test`. They apply the checked-in migration and cover registration, hashing, safe selectors, duplicates, protected access, refresh rotation/replay, logout, CORS, pagination, filtering/numeric sorting, private/idempotent favorites, real image decoding/storage, creation, foreign uploads, owner authorization, competing transfers, transactional history, profiles, collections, notifications, single-use recovery revocation, repeated session restoration, and credential rate-limit boundaries.

Frontend tests cover session restoration, concurrent refresh, offline retention, rejection cleanup, logout during refresh, token-storage races, pending-button behavior, accessible validation, and retry controls. Component tests use React Native’s web adapter; they are not native renderer/device tests.

Browser workflows cover discovery, search, registration, profile/avatar changes, refresh restoration after navigation/reload, persisted favorites, actual image-picker uploads, acknowledged demo transfers, notifications/read-all, collection cover/creation, creator/collection links, listing publication/editing/collection retention/unlist/relist/removal, activity, My works, settings, logout, landing dialogs, image decoding, and horizontal overflow at 390 and 1440 px. Set `E2E_MAIL_DIR` to the local development outbox to also check password recovery, rejection of the old password, and sign-in with the replacement password. Screenshots are generated under `docs/screenshots` and copied to the landing.

Run browser writes against a disposable seeded database and local storage, never records you want to keep. The suite creates an account and collection and transfers one existing test artwork. When Metro uses port 8081 with a LAN API, run the localhost export server on port 8082 (`MOBILE_PREVIEW_PORT=8082`) and set `E2E_MOBILE_URL=http://localhost:8082` for the browser suite. Compile that export against the disposable localhost API, allow `http://localhost:8082` in that API's `CORS_ORIGINS`, and keep it separate from the live development API. The write-test guard deliberately requires a localhost API.

## Local evidence

The fresh QA follow-up on **8 October 2026** used a separate PostgreSQL 18 database, 24 seeded artworks, independent authentication secrets, local upload storage, and a local recovery-mail outbox. All extended browser workflows completed without runtime JavaScript errors. The disposable database was removed afterward. The user's development database retained its 25 artworks; its API and LAN media requests passed.

Final results: all workspace TypeScript checks, ESLint, **21 backend integration tests and 12 frontend tests (33 total)**, server/shared/landing builds, **20/20 Expo Doctor checks**, and all three platform exports passed. The extended browser suite passed against the completed export, including local password recovery. Dependency review reported **29 affected packages (24 high, 5 moderate, no critical)**; see SECURITY.md for scope and release implications.

Three issues were corrected: native build profiles used an old Wi-Fi address, repeated session restores consumed the credential-attempt rate limit, and detail-screen headers displayed internal route filenames. Headers now use readable screen titles, confirmed by the final export and browser workflow. Both native packages were rebuilt with `http://192.168.0.101:4000/api`; signature/manifest/bundle checks passed for Android and executable/plist/bundle checks passed for the iOS simulator. Credential attempts remain limited to 30 per 15 minutes, with a separate refresh limit. Both rate-limit regression tests passed. See MOBILE.md for the replacement packages and checksums.

The actual Docker image built successfully and ran as UID 1000 against an isolated PostgreSQL 18 container initialized with the checked-in migration SQL. API/database health, registration, safe fields, Linux image processing/WebP storage, listing persistence, and CORS denial passed. These container checks used development settings and local storage. Only the owned QA containers, volumes, network, and private environment files were removed afterward.

The signed standalone APK was installed and launched on a Vivo V2151 running Android 14. Native registration, account restoration after a full process restart, API artwork loading, and search were observed successfully. The user also reported successful manual testing and requested that further phone testing stop. The disposable QA account was signed out, its database removed, and the normal API restored with all 25 original artworks intact. This is partial Android device coverage; it does not complete the entire device release checklist below.

**Cloud follow-up:** The Railway API and both Vercel interfaces are live. Schema migration, database health, allowed/denied browser origins, private bucket authentication, and Brevo authentication/verified sender checks passed. Existing local accounts/artwork were transferred over TLS: 13 users, 4 collections, 31 artwork records including deleted history, 1 favorite, 55 activities, 20 notifications, and 31 registered cloud images. The temporary database proxy was removed. The public API returns 25 active artworks and all 25 gallery images passed actual HTTPS WebP reads. The private media proxy and HTTPS mail integration passed 16 focused tests, type checks, lint, and a Docker build. The finished cloud APK passed signature, manifest, HTTPS endpoint, and author inspection; see MOBILE.md. The updated version-code-3 cloud APK was installed on the Vivo V2151, and its Collect button was observed on a listed artwork. Actual recovery-email delivery and the full native release matrix remain unverified. Further phone testing was not resumed.

**Still unverified:** the remaining native permission/upload/offline/deep-link matrix, physical iOS behavior, production operations, and app-store distribution. The iOS artifact is a Mac simulator build, not an installable iPhone build. The remaining dependency advisories also prevent an unqualified production-readiness claim.

**Browser connection fix:** The initial cloud web export reused a Metro transform with `http://localhost:4001/api`, causing the reported connection error on the Desert Bloom page. A clean export embedded the Railway HTTPS API and was published as Vercel production deployment `dpl_Dfoi7spBvZ7ps2N8k6EPmyqBjgMv`. The reported URL then rendered the artwork details and image in the browser with no console errors. The live JavaScript contains the cloud API and author credit and excludes the old test API. Cloud exports now clear Metro's cache and reject output that lacks the requested API address; Vercel source builds also clear the cache. Script lint and formatting checks passed.

**Collect restoration:** At the user's request, the Railway API and cloud web/internal Android builds enable the existing labeled demo collection flow. Twenty-one backend integration tests passed against a fresh local test database, including concurrent acquisition and atomic activity/notification records; the owned database was removed. Browser verification confirmed Collect and signed-out login navigation. The signed APK passed cloud API/Collect/author/old-LAN checks and was installed as version code 3. No production ownership record was transferred by this verification. Already collected artworks require their owner to relist them before another account can collect.

## Native device release checklist

| Area           | Check on Android and iOS                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Navigation     | Tabs, back stack, artwork/collection/creator links, deep-link recovery       |
| Layout         | Small/large screens, notches, home indicator, keyboard avoidance, large text |
| Authentication | Sign in, background/resume, restart restoration, expiry, logout, recovery    |
| Permissions    | Photo access granted/denied/limited, invalid/oversized images                |
| Networking     | LAN/HTTPS endpoints, offline retry, timeout, revoked session                 |
| Images         | Cached images, failed URL fallback, portrait and landscape uploads           |
| Marketplace    | Create/edit/favorite, unlist/relist/remove, owner/non-owner access           |
| Notifications  | Inbox/read markers, local permission grant/decline, confirmations            |
| Release        | Correct bundle IDs, HTTPS production API, demo transfers disabled, signing   |

Public app-store release should follow these checks and the production runbook, not merely a successful Expo export.
