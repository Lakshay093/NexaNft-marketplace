# Security boundaries and release notes

**Made by Lakshay Dhiman**

## Implemented controls

- bcrypt cost 12, strength/length checks and UTF-8 byte limit; no plaintext-password persistence.
- Restricted JWT algorithm/issuer/audience, short-lived access, random opaque refresh tokens stored only as SHA-256 hashes.
- Transactional rotation/replay-family revocation; token-version/family checks enforce immediate logout/recovery revocation.
- Single-use expiring password recovery, generic account-existence response, native SecureStore, in-memory access tokens.
- Strict schemas, parameterized database access, safe public selectors, protected private feeds, ownership and purpose checks.
- Atomic transfer/update conditions, composite unique favorites, foreign keys, decimal prices, constraints/indexes.
- Upload size/pixel/type/page limits, actual decoding, orientation, resize, metadata removal, WebP output, randomized keys.
- Helmet, configured CORS, per-IP API/auth/upload limits, restricted trusted-proxy count, validated production environment.
- Credential/recovery attempts share a 30-per-15-minute limit; refreshes have a separate 60-per-minute limit. Session inspection and logout retain the general API limit, so restoring sessions does not consume sign-in attempts.
- Secret files/build artifacts ignored, sensitive request fields/query strings excluded from logs, generic public 500 responses.

## Dependency review

The implementation upgraded Sharp to 0.35.5, Nodemailer to 10.0.16, Prisma to 6.19.3, and Vitest to 5.0.3, and patched shell-quote, decode-uri-component, effect, and uuid. The final full and production-dependency audits reported no critical advisories. Remaining advisories in the Expo/React Native/Prisma tooling graph must be reviewed before release; npm suggested incompatible SDK downgrades/major changes for some packages, so those were not blindly applied.

The last monorepo dependency audit reported **29 affected packages: 24 high, 5 moderate, 0 critical**, including with `--omit=dev`. This count includes transitive impact chains, not 29 independent vulnerabilities. The audit is a release consideration, not a passing security certification.

Several advisory roots have no available patch in the pinned compatible tooling line (including braces, node-forge, and sprintf-js at review time). They largely concern tooling inputs such as glob patterns, formatting precision, and certificate handling. That is not a claim of zero risk. Restrict untrusted repository/build/config inputs, rerun `npm audit`, and upgrade the SDK/tooling with platform/export/browser regression checks when a compatible fix is available. The production HTTP image/mail dependencies were updated rather than accepting their older vulnerable versions.

Prisma's configuration tooling also retains its pinned deepmerge-ts 7.1.5 dependency and associated high advisory. A patched major version exists, but the attempted transitive upgrade conflicted with npm's Prisma peer resolution. The unused override was removed; this dependency remains an explicit release review item rather than being hidden behind an ineffective override.

Use `npm audit --omit=dev` to inspect the monorepo graph; mobile dependencies also include native/build tooling. The result is broader than the API’s pruned runtime dependency graph. Record any release acceptance with actual reachability analysis and owner approval; no audit result should be hidden or replaced with an invented “all clear.”

## Operational limits

The default rate-limit store is process-local. Multiple replicas need a shared store. Local upload files are development-only; production requires cloud storage. Unused upload retention/cleanup, restore-tested backups, SMTP deliverability, monitoring/alerting, and native release QA are operator responsibilities described in DEPLOYMENT.md.

Favorites and notifications are private, public profile responses exclude email, and upload keys contain account UUIDs rather than email/usernames. User-authored text is displayed as text, not HTML. The product does not yet provide account deletion, email verification, moderation, or real payment/blockchain compliance features; evaluate those needs before opening a public consumer marketplace.

## Reporting

Do not include credentials, JWTs, refresh/reset links, password hashes, or private profile data in bug reports. Include a request ID, endpoint, expected behavior, and a redacted reproduction. Configure a real private security contact before publishing the repository; no fictitious contact is supplied here.
