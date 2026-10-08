# NexaNFT architecture and engineering decisions

**Made by Lakshay Dhiman**

## Product boundaries

NexaNFT is a centralized platform for artwork listing, discovery, favorites, and conventional ownership records. “NFT” describes the marketplace product domain, not an implemented token protocol. ETH labels do not imply payment capability. Demo transfers require explicit acknowledgement and are disabled in production configuration. The application does not fabricate wallet balances, receipts, or on-chain provenance.

## React Native, Expo, and React DOM

React Native provides native Android/iOS primitives while sharing components, business logic, TypeScript types, and navigation. React DOM targets browser elements; the landing uses React DOM because native device APIs and navigation are unnecessary there. Expo supplies managed builds, routing, image selection, image caching, secure storage, splash handling, and notifications, reducing platform-specific setup. Expo SDK 55 ties React Native 0.83 and React 19.2 together; native dependency versions follow Expo’s compatibility map.

The web export is useful for demos and automated interaction checks. It does not validate native keyboard behavior, photo permissions, OS keychain behavior, or device signing. Those have separate release checks.

## Component architecture and navigation

Expo Router owns file-based routes. Five bottom tabs support primary discovery and account tasks; stacks handle artwork, collections, creators, profile editing, recovery, and settings. Shared cards and controls contain presentation and navigation, while feature components own forms and workflows. An auth gate provides a sign-in path, but the API remains the enforcement boundary.

Colors and spacing live in design tokens. Responsive artwork grids derive their column width from the viewport. Large feeds use FlatList, pagination, and memoized artwork cards. ScrollView is reserved for bounded forms/detail content. Cached images, decoding fallbacks, loading skeletons, retry controls, and empty states make failure visible without crashing.

## State ownership

Zustand stores only local auth/user state and search controls. TanStack Query owns server records, paginated feeds, collections, favorites, activity, and notifications in separate query namespaces. Form inputs use React Hook Form. Preferences/onboarding use AsyncStorage. SecureStore owns native refresh-token persistence.

Access tokens and refresh coordination live in an independent SessionManager rather than a giant context. Query cache is cleared when the account changes or signs out, preventing private favorites and notifications from appearing under a different account. Refreshes for the same account retain caches. Mutations invalidate the related query domains.

## Authentication and refresh strategy

Passwords are bcrypt-hashed at cost 12. Validation enforces complexity, length, confirmation, and bcrypt’s byte limit. Email/username uniqueness is enforced in PostgreSQL, making registration safe under concurrent attempts.

Access JWTs last 15 minutes and verify algorithm, issuer, and audience. Their claims include the account ID, refresh-family ID, and account token version. Opaque random refresh tokens last at most 30 days; only SHA-256 hashes are stored in the database. Rotation does not extend a family indefinitely.

Refresh token consumption uses a conditional transactional update. Reusing an already consumed token revokes the entire family, including its latest token. Each protected request verifies an active family and current token version, so logout and recovery revoke existing access JWTs immediately. This adds indexed database reads in exchange for immediate server-side revocation.

The client coalesces simultaneous 401 refresh requests, retries a failed API request once, and serializes storage updates. Generation checks discard results belonging to a session that has been signed out or replaced. Offline restoration retains a refresh token for retry; server rejection removes it. Lost rotation responses require a fresh login, which is an intentional security tradeoff.

The native token uses device-only SecureStore accessibility. The web preview uses per-tab sessionStorage and is a different security boundary; a future first-class browser account product should consider HttpOnly cookies, CSRF controls, and stricter web session policy.

## REST and validation boundaries

Routes apply middleware and select controllers. Controllers validate and delegate. Services handle transactional behavior and persistence through Prisma. Explicit selectors define public/current-user payloads. Shared Zod contracts prevent drift between mobile forms and API inputs; server-only schemas handle opaque token formats and route IDs.

Responses consistently use success/data/message and optional pagination. Errors include status, stable code, optional field errors, and a request ID. Stack traces, password hashes, tokens, and database details never appear in public errors. Query construction is parameterized through Prisma; React renders user text rather than HTML. Validated upload records prevent clients from supplying arbitrary image URLs or ownership IDs.

## PostgreSQL relationships and constraints

Users create and own artwork through separate foreign keys. Collections contain artwork and belong to a creator. Favorite’s composite key enforces a many-to-many relationship without duplicates. Activities and notifications preserve related records. Refresh families and resets have expiration/revocation timestamps. Assets record uploader, purpose, storage key, public URL, MIME type, and encoded size.

Prices use Decimal(14,6) and are serialized as strings. The API never calculates real payments. Favorite counts are derived from database relations, avoiding counter drift. Listing removal is a soft delete: history is retained while marketplace queries exclude removed records.

SQL constraints enforce price/category/currency/views. Foreign-key indexes support relation lookup; composite indexes support common ownership/status/filter/sort queries. Trigram GIN indexes support case-insensitive substring search over names and creators. Popular sorting counts indexed favorite relations; high-volume deployment could materialize ranking data later.

## Listing concurrency and ownership

Creation assigns creator and owner from the authenticated account, never client input. Mutation services recheck ownership and use conditional updates, closing the gap between a read and a competing transfer. A demo acquisition checks the previous owner and LISTED status in its update condition. Only one concurrent buyer can succeed.

Ownership assignment, SOLD status, transfer activity, and both account notifications share a database transaction. Original creator identity is retained. New owners may edit, relist, unlist, or remove their records. Keeping an existing original collection does not require ownership of that collection; moving to a new collection requires the caller to own it.

## Search, filtering, pagination, and caching

Search applies name, creator username/full name, collection name, and category predicates in SQL. Category/status filters and precise price comparisons are ANDed with search and visibility/ownership boundaries. Price sorting happens over Decimal values, not strings. Every order has an ID tie-breaker.

Search is debounced by 350 ms; request cancellation prevents obsolete fetches from updating the current query. Pages contain at most 50 items. The mobile app uses 20-item pages with infinite scrolling, a 30-second freshness window, one query retry, and no automatic mutation retry. Current bounded offset pagination is straightforward to explain; a larger catalog should migrate to cursor-based pagination.

## Image pipeline and cloud storage

Image Picker selects an image. The client validates size, sends multipart bytes, and displays progress. The API checks MIME type, decodes with Sharp, checks the real image format and pixel/page limits, applies orientation, resizes without upscaling, strips metadata, and encodes WebP. SVG and animated/malformed uploads are rejected.

Storage keys are generated from a trusted account UUID, upload purpose, and random UUID. The development adapter writes real files; production uses an S3-compatible PutObject with immutable cache headers. Asset records belong to the uploader and a purpose. Listing/profile/collection services validate these records before using URLs. If the database asset write fails, storage deletion is attempted. Unused uploads need a future retention/cleanup job; the production release guide discusses this operational responsibility.

## Error handling, logging, and monitoring

The API handles 400, 401, 403, 404, 409, 429, and generic 500 responses centrally. Logs include request IDs, paths without query strings, authentication failures without credentials, and important listing events. Unexpected errors log a safe error type; their detailed Prisma messages are not serialized because those may contain query inputs.

The mobile layer distinguishes timeout, connectivity, server messages, validation, and session expiration. Loading/retry/empty states are visible on feeds. Failed images fall back to a labeled placeholder. SMTP recovery is real in production; development mail is saved in an ignored outbox. Sentry or another monitoring service can integrate at the existing middleware/request-ID boundary without putting secret data into events.

## Android and iOS differences

API localhost points to the emulator/simulator/device itself, so Android emulator and physical-device networking need different development URLs. Photo-library permissions and keyboard avoidance differ by platform. SecureStore uses platform keychain/keystore mechanisms. iOS local simulator use requires macOS; EAS cloud compilation can be requested from Windows. Google Play receives an AAB; preview Android builds use APKs. iOS store builds require Apple signing and account provisioning.

Notifications are persisted in the API and shown in-app. Optional device confirmations are local notifications after a successful demo acquisition. No remote push infrastructure or token registration is claimed.

## Deployment and operations

Render runs a compiled API with a readiness endpoint and migration pre-deploy command. PostgreSQL is a managed service with TLS/backups. S3/CDN handles images. Vercel/Netlify handles the landing; Expo EAS handles native builds. Environment validation prevents unsafe production defaults, and no storage write credentials enter client bundles.

The API currently uses per-process rate limiting, suitable for a single replica. Scaling requires a shared rate-limit store, connection-pool budgeting, and distributed observability. Container execution uses an unprivileged user. Native signing, actual cloud connection checks, backup restoration, and production dependency review are release steps, not artifacts that can be replaced by a local compile.

## Testing strategy and practical limits

Integration tests apply the actual migration to isolated PostgreSQL and test auth, private routes, validation, persistence, authorization, numeric search, duplicate favorites, real image decoding/storage, race-safe transfers, notifications, and recovery revocation. Component tests verify user behavior through the React Native web adapter. Pure SessionManager tests exercise concurrency and offline behavior. Browser workflows run the real exported app against the API, including artwork upload and owner actions.

Compilation includes production source, scripts, seed code, and tests. Expo exports compile the Android, iOS, and web bundles. Local browser checks complement, but do not replace, native-device testing. Remaining dependency advisories and account-dependent release verification are documented explicitly in docs/SECURITY.md and docs/QA.md.
