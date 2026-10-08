# Implementation and verification record

**Made by Lakshay Dhiman**

The project was implemented incrementally. Compilation/import checks were performed at phase boundaries; regression tests grew alongside functionality. Environment validation and ignored local templates were checked throughout. Final verification was performed on 8 October 2026 (Asia/Calcutta).

| Phase | Implementation and principal files                                                                                                               | Verification / commands                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1     | Root package/configs, workspace package/TypeScript configs, shared `packages/contracts/src/index.ts`, environment templates                      | All four workspace type checks passed. `npm ci`; `npm run typecheck`                                            |
| 2     | `server/prisma/schema.prisma`, SQL migration and migration lock                                                                                  | Prisma validate/generate and real PostgreSQL migrate deploy passed. `npm run db:generate`; `npm run db:migrate` |
| 3     | Server app/bootstrap/config; auth routes/controller/service; mail service; auth/error middleware; selectors/validators; integration config/tests | 7 auth/security integration tests passed. `npm test -w server`; `npm run dev:server`                            |
| 4     | Mobile app config/assets, root/tab/auth layouts, design tokens, `components/ui.tsx`, initial routes                                              | Mobile TypeScript/import checks passed. `npm run dev:mobile`                                                    |
| 5     | Auth form/screens, secure session/API services, auth store/gate, onboarding/reset routes, session tests                                          | Auth compilation and 5 initial session tests passed. `npm test -w mobile`                                       |
| 6     | Marketplace service/controller/routes, feed hooks/grid, cards, home/explore, seed                                                                | Server/mobile compilation; 9 backend tests; 4 creators/4 collections/24 artworks persisted. `npm run db:seed`   |
| 7     | Artwork detail, collections, collection/creator detail routes                                                                                    | Server/mobile TypeScript checks; API-backed navigation/detail content verified later in browser workflows       |
| 8     | Search store/debounce, search bar, filter modal, ExploreScreen/search route                                                                      | Compilation and database search/price-sort test passed; 10 backend tests. `npm test -w server`                  |
| 9     | Favorite service/controller/member routing, FavoriteButton, favorites tab                                                                        | Compilation and persisted/private/idempotent favorite test passed; 11 backend tests                             |
| 10    | Storage/listing services/controllers, uploads/member routes, upload client, ListingForm/actions/edit route                                       | Compilation and 15 backend tests, including real images, ownership and competing transfers                      |
| 11    | Member service/controller, profile/edit/my-works/create-collection/activity/notification/settings routes and local-alert service                 | Compilation and 19 backend tests, including password recovery revocation                                        |
| 12    | Landing App, CSS, entry/config/environment declaration                                                                                           | Landing production build and TypeScript passed. `npm run dev:landing`; `npm run build -w landing`               |
| 13    | Component tests, browser-smoke workflow/preview scripts, security upgrades, safe logging, compiled shared package                                | Frontend behavior tests and full browser workflows passed; Android/iOS/web exports succeeded                    |
| 14    | SkeletonLoader, race-safe session storage, account-aware cache, responsive feed/card refinements, collection-preserving edits                    | Full final type/lint/tests/build plus refreshed platform/browser checks; commands below                         |
| 15    | EAS, production env template, Docker/Compose, Render, Vercel/Netlify, GitHub CI                                                                  | Configuration syntax/build validation; cloud/signing/Docker execution limits documented                         |
| 16    | README, ARCHITECTURE, API/deployment/security/QA/implementation guides and actual screenshots                                                    | Documentation command/link consistency, final source/secret review, project guide generation                    |

## Final verification commands

```sh
npm run verify
npm run export -w mobile
npm run test:e2e
npm audit --omit=dev
```

The later cloud follow-up records completed Railway/Vercel hosting and the Android cloud APK. App-store deployment remains pending. Native package verification is recorded in [MOBILE.md](MOBILE.md). See QA.md for device-dependent checks and SECURITY.md for remaining toolchain advisories.

## Expo follow-up

The existing mobile app was linked to `@lakshaydhimans-team/nexanft-marketplace`, project `78458ae6-9eb7-4b49-b6d6-9093e14bdb7f`. Foreground launch scripts were added, and development builds were configured for the Wi-Fi API. Loopback image URLs are resolved to that API host on devices, with three regression tests. The complete verification now passes 21 backend tests and 12 frontend tests. All platform JavaScript exports and all 20 Expo Doctor checks passed.

Both EAS cloud builds finished. The downloaded iOS simulator package passed identifier/platform, architecture, executable, bundle, API, and author-credit inspection. Android's signed APK passed signature, identifier/version, SDK, non-debuggable manifest, native-library, DEX, API, and author-credit inspection. MOBILE.md records the artifacts and checksums. Initial Android device checks were later completed as recorded below; physical iOS QA remains outstanding.

## QA follow-up on 8 October

The native packages' embedded API address was corrected from the former Wi-Fi address to `192.168.0.101`; replacement Android and iOS simulator builds finished and passed inspection. Android retained the same signing certificate. Repeated session restores were also found to consume the sign-in rate limit. Auth routing now applies separate credential and refresh limits with independent limiter instances per app, and two new integration tests cover restoration and retained credential protection.

After the fix, `npm run verify` passed all type/lint checks, 33 tests, and builds. A final screenshot review also replaced raw route names in navigation headers with readable titles. Mobile type/lint checks, all three platform exports, and the full browser workflow passed again after that change. The expanded workflow used a separate disposable PostgreSQL database and local mail/storage, covering avatar uploads, collection creation and retained association on edit, demo transfers, notification read markers, activity, My works, settings, and full password recovery. The original development database retained its 25 artworks.

The Docker image built and passed real Linux runtime checks against a separate PostgreSQL 18 container, including non-root execution, health, registration, upload conversion/storage, listing persistence, and denied CORS origins. Temporary QA services and databases were cleaned up. Live cloud storage/mail, hosting, full device release coverage, and app-store release remain unverified; the monorepo audit still reports 24 high and 5 moderate affected packages. See QA.md and SECURITY.md for the exact limits.

The standalone APK was installed on the connected Vivo V2151 running Android 14. Registration, API artwork loading, search, and account restoration after a full process restart passed observed device checks. The user reported successful manual testing and requested that further phone testing stop. Only the disposable QA account/database was cleaned up; the normal API and its 25 artworks were restored.

## Cloud hosting preparation on 8 October

Railway and Vercel CLI sessions were refreshed. A NexaNFT Railway project, PostgreSQL 18 service with a persistent volume, and `nexanft-api` service were created. The API's private database reference, random authentication secret, production mode, disabled demo transfers, health check, and automatic pre-deploy migration command were configured. Two Vercel projects were created for the web app and landing. The allocated API domain is recorded in CLOUD.md; it is not serving the application yet.

The Docker runtime now includes the pinned Prisma CLI and checked-in migration schema. The updated image built successfully, and the packaged migration command loaded the CLI/schema. Cloud database schema application will occur in pre-deploy. A separate EAS `cloud` profile creates an internal APK with production HTTPS settings and disabled demo transfers; config validation and mobile type/lint checks passed. The production EAS API variable was set to the allocated HTTPS endpoint. A static web bundle was exported against that endpoint and linked to the Vercel web project, and a script prepares isolated Vercel upload directories without server secrets. Provider storage/mail settings and final browser origins remain required before API/client publishing and the cloud APK build.

### Later cloud progress

A private Railway image bucket was created in Singapore and its credentials were configured privately. The API supports registered-image streaming from this bucket and Brevo HTTPS recovery email. Sixteen focused tests, server type/lint checks, and the Docker build passed. Both Vercel clients were published with exact browser origins configured. Brevo authentication and sender verification passed. API deployment `8bd12f45-aadc-43f4-8dff-8612101d0d6a` succeeded with automatic schema migration; database health and CORS checks passed.

At the user's request, existing accounts/artwork were copied over a verified TLS PostgreSQL connection without changing the local copy. Counts matched: 13 users, 4 collections, 31 NFT records including deletions/history, 1 favorite, 55 activities, and 20 notifications. Thirty-one registered images were uploaded with HTTPS URLs; 25 active artworks and all gallery images were confirmed through the live API. Sessions/reset tokens were excluded. The temporary database TCP proxy was removed. The attempted Windows CLI SSH connection was stopped without running a remote command.

Android cloud build `4a2812b1-6821-49ba-8f8c-05086cae328d` finished with HTTPS, demo transfers disabled, version code 2, cleartext traffic disabled, and the existing signing key. Its downloaded artifact passed signature, manifest, endpoint, and author-credit inspection. The landing now links the cloud APK. Actual recovery-email delivery and use of the cloud APK on a phone remain unverified; device testing was not resumed. See CLOUD.md and MOBILE.md for links and status.

## Files

The principal source locations above are intentionally grouped by phase; `git status --short` and `git ls-files` provide the complete repository manifest once committed. Generated `node_modules`, `.env`, `.data`, `dist`, and test artifacts are excluded. Screenshots, lockfile, schemas/migrations, runtime/configuration, and documentation are included for reproducibility.
