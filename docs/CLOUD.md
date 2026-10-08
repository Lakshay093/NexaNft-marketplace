# Cloud hosting and installing NexaNFT

**Made by Lakshay Dhiman**

The installed mobile app contains its own interface. Railway hosts the API and PostgreSQL; Vercel hosts the landing page and optional browser app. Cloud image storage keeps uploads available across API deployments. Expo/EAS builds the native application packages.

## Setup progress on 8 October 2026

- [Railway NexaNFT project](https://railway.com/project/ceb53127-d3c7-4586-ac88-62aedd2bf32b): PostgreSQL 18 is running with a persistent volume. The `nexanft-api` service is created and has its private database reference, generated authentication secret, production mode, the labeled Collect demo action enabled at the user's request, `/health` check, and automatic pre-deploy migration command configured.
- A private Railway bucket named `nexanft-images` was created in Singapore. Its S3 credentials are configured privately in the API service, and a read-only bucket access check passed. `STORAGE_DELIVERY=proxy` lets the API serve registered artwork through `/media` without exposing bucket credentials.
- The API is live at `https://nexanft-api-production.up.railway.app/api`. Deployment `e2259d81-e2ea-4232-9b58-bfd43d6276c0` is successful, its automatic schema migration completed, and `/health` confirms the database connection. Both final Vercel browser origins are allowed; an unlisted origin returns 403.
- The browser app is published at [nexanft-web.vercel.app](https://nexanft-web.vercel.app), and the landing at [nexanft-landing.vercel.app](https://nexanft-landing.vercel.app). Both production deployments are Ready. Browser deployment `dpl_HhWoN9LibjZNVTzPT7YEZgRiCiPC` uses the HTTPS Railway API and restores the labeled Collect action, verified in the browser.
- Brevo authentication and the configured sender's verified status are confirmed. Provider credentials are stored privately in Railway. Actual delivery of a password-recovery message remains to be checked from the app.
- At the user's request, existing local data was copied: 13 accounts, 4 collections, 31 artwork records including history/deletions, 1 favorite, 55 activities, and 20 notifications. Thirty-one images are in the private cloud bucket, with registered asset rows and HTTPS URLs. The original local records/files remain intact. Active sessions and reset tokens were excluded; sign in with your existing password. The transfer used a verified TLS database connection, and its temporary TCP proxy was removed afterward.
- Android cloud build [1052840f-245e-4c40-b035-2cdf08e32ad4](https://expo.dev/accounts/lakshaydhimans-team/projects/nexanft-marketplace/builds/1052840f-245e-4c40-b035-2cdf08e32ad4) finished. The [cloud APK](https://expo.dev/artifacts/eas/3-eZzqta-CTpF87StnJGT8oeo-uackhRLrLtzGdojsg.apk) passed signature, manifest, and embedded-bundle inspection: version code 3, existing certificate, HTTPS API, cleartext disabled, author credit, and Collect enabled. It was installed on the Vivo V2151, and the Collect button was observed on a cloud artwork page.

Keep provider credentials out of chat and Git. Storage and Brevo credentials, `MAIL_PROVIDER=brevo`, the verified `MAIL_FROM_EMAIL`, and `MAIL_FROM_NAME=NexaNFT` are configured. Because the initial email API key was shared in chat, create a replacement privately in Brevo, update Railway's `BREVO_API_KEY`, redeploy the API, and revoke the old key. Section 3 explains provider setup.

For direct CLI hosting without GitHub, `npm run cloud:prepare-sites -- --api=https://YOUR_API_DOMAIN/api` exports the web app with demo transfers disabled into a fresh ignored `cloud-output` directory. Add `--web=https://YOUR_WEB_DOMAIN` to also compile the landing, and optionally `--android=https://YOUR_CLOUD_APK_URL` and `--github=https://YOUR_REPOSITORY_URL`. `cloud-output/latest.json` records the generated directories. Link each generated directory to its Vercel project and publish using Vercel CLI. These directories contain built static files and SPA rewrites; they contain no server environment or database credentials. The current landing's Android button opens the verified cloud APK for direct installation.

## 1. Source repository

The source repository is [Lakshay093/NexaNft-marketplace](https://github.com/Lakshay093/NexaNft-marketplace). The existing ignore files exclude private environment files, local databases/uploads, editor settings, build packages, dependencies, and signing files. Keep credentials in provider dashboards. Do not upload `server/.env`, `server/.data`, `.test-artifacts`, or `releases`. Railway and Vercel are currently deployed through their CLIs; publishing the source does not configure automatic deployments from GitHub.

## 2. Create the database and API on Railway

1. Create a Railway project and add PostgreSQL 17 or newer.
2. Add a service from the GitHub repository. Keep the service root at the repository root because the API depends on the shared workspace. Railway detects the root `Dockerfile`; its existing command starts the compiled API.
3. Set the API service's `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`, adjusting the service name if your database is named differently.
4. Configure the production variables from `server/.env.production.example` in Railway. This app requires a random `JWT_SECRET`, exact HTTPS browser origins in `CORS_ORIGINS`, S3-compatible storage credentials/media URL, and a configured mail provider. Set `NODE_ENV=production` and `ENABLE_DEMO_TRANSFERS=false`. Let Railway supply `PORT`; the server listens on `0.0.0.0`.
5. Set the API service's pre-deploy command to `npm run db:migrate -w @nexanft/server`. The Docker runtime now includes Prisma's migration CLI and the checked-in schema/migrations, so Railway can apply migrations over the private database network before admitting new API traffic. Set a pre-deploy timeout appropriate for your migrations, such as 300 seconds for this initial schema. Do not seed or reset a production database. For a separate local migration, enable the database TCP proxy and use its private `DATABASE_PUBLIC_URL` value in your local environment:

   ```powershell
   $env:DATABASE_URL = 'YOUR_RAILWAY_DATABASE_PUBLIC_URL'
   npm run db:migrate -w @nexanft/server
   Remove-Item Env:DATABASE_URL
   ```

   Keep the API service on the internal `DATABASE_URL`. Never commit either connection string. A failed pre-deploy migration must stop the deployment.

6. Deploy the API, select Settings → Networking → Generate Domain, and set the healthcheck path to `/health`. Check `https://YOUR_API_DOMAIN/health`; the client API address is `https://YOUR_API_DOMAIN/api`.

For a new installation, the schema migration starts with an empty database. It does not copy local records or files. This project's later data transfer is recorded above; do not repeat it against a populated database or run the development seed in production.

Railway instructions: [Express deployment](https://docs.railway.com/guides/express), [PostgreSQL and external connections](https://docs.railway.com/databases/postgresql), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command).

## 3. Configure image storage and email

The current setup uses a private [Railway storage bucket](https://docs.railway.com/storage-buckets). Set `STORAGE_DELIVERY=proxy` and `STORAGE_PUBLIC_URL=https://YOUR_API_DOMAIN/media`; the API only reads keys registered in its asset table. It returns WebP images with immutable caching. Bucket credentials remain server-only. Railway's S3 endpoint and region come from its bucket credentials. Alternatively, use S3/R2 with `STORAGE_DELIVERY=public` and a working public CDN/read domain; R2 also needs its account endpoint and region `auto`.

Railway permits SMTP on Pro and above; Free, Trial, and Hobby need an [HTTPS email API](https://docs.railway.com/networking/outbound-networking). The app supports Brevo through `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, and `MAIL_FROM_NAME`. Production startup rejects missing provider credentials; it never silently writes recovery messages to a local outbox.

With only a personal Gmail address:

1. Create a [Brevo account](https://app.brevo.com) and finish its account checks.
2. Go to Settings → Senders, Domains, IPs → Senders. Add your Gmail address with the name NexaNFT and complete its inbox verification.
3. Go to Settings → SMTP & API → API Keys and create a key named NexaNFT. Use an API key, not an SMTP key.
4. In the Railway NexaNFT project → nexanft-api → Variables, paste the key into `BREVO_API_KEY` and the verified Gmail address into `MAIL_FROM_EMAIL`. Do not paste the key into chat or source files.

Brevo may replace a personal Gmail sender with its own compliant sending address; this is a [temporary sender arrangement](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders). A domain you control and authenticate is the longer-term option. Keep `RESET_URL=nexanft://reset-password` for native recovery. SMTP remains available on hosts that permit it by setting `MAIL_PROVIDER=smtp` and the existing SMTP variables.

## 4. Publish the website on Vercel

Import the same repository as a Vercel project with root directory `landing`. Include source files outside that directory because the workspace build copies the repository README and uses the shared package. The existing `landing/vercel.json` sets:

- Build command: `npm run build -w @nexanft/landing`
- Output directory: `dist`
- `VITE_API_URL=https://YOUR_API_DOMAIN/api`
- `VITE_ANDROID_URL`: a verified APK testing download or a published Play Store URL

For the website's Open marketplace button, deploy the Expo browser app as a second Vercel project rooted at `mobile`, including source files outside that directory. Its `vercel.json` selects framework Other, runs `npm run export:web -w @nexanft/mobile`, outputs `dist`, and rewrites `/(.*)` to `/index.html`. Set `EXPO_PUBLIC_API_URL=https://YOUR_API_DOMAIN/api` and `EXPO_PUBLIC_ENABLE_DEMO_TRANSFERS=false` in that project. Set the landing's `VITE_DEMO_URL` to this second project's HTTPS address.

Add both final Vercel origins to the API's `CORS_ORIGINS`. Redeploy clients after changing build-time variables. See [Vercel monorepos](https://vercel.com/docs/monorepos) and [Vite configuration](https://vercel.com/docs/frameworks/frontend/vite).

Cloud exports clear Metro's bundler cache and verify that the generated JavaScript contains the configured HTTPS API URL before publishing. This prevents a previous local test API address from being reused in the cloud website. Add `--demo-transfers=true` to restore the labeled Collect action for this demo marketplace; the default remains disabled. The matching Railway variable is `ENABLE_DEMO_TRANSFERS=true`. Collect assigns the platform ownership record after explicit acknowledgment, with no payment or blockchain transaction. It applies to listed artworks owned by another account; an already collected artwork must be relisted by its owner first.

## 5. Build an Android app that uses the cloud API

Set `EXPO_PUBLIC_API_URL=https://YOUR_API_DOMAIN/api`, including `/api`, in the EAS project's **production** environment. Use the dedicated `cloud` profile, which inherits production settings, requires HTTPS, explicitly enables the labeled Collect demo, and outputs an installable internal APK. The existing preview profile remains configured for local development. Then run:

```powershell
cd mobile
npx eas-cli@latest build --platform android --profile cloud
```

Open the resulting APK link on your Android phone. Download and open it, approve installation from that browser when Android asks, and launch NexaNFT from its own icon. Expo Go and Metro are not required for this standalone APK. After the cloud API is connected, the marketplace can be used away from your Wi-Fi with the development computer turned off.

The earlier development APK embeds `http://192.168.0.101:4000/api`. The new cloud APK uses Railway HTTPS and can update the existing app because EAS retained the same signing key. After installing it, the marketplace can connect over mobile data with the development computer off. See MOBILE.md for download and package details.

For Play Store distribution, use the existing `production` profile (AAB), configure its production HTTPS API variable, and submit through your Google Play developer account. For an installable iPhone build through EAS, Apple signing access is required; the existing iOS artifact is for Mac simulators. See [Expo APK installation](https://docs.expo.dev/build-reference/apk/) and [iOS internal distribution](https://docs.expo.dev/build/internal-distribution/).

## Verification

PostgreSQL, the API, and both Vercel client interfaces are deployed. The Docker image builds successfully with the storage proxy and HTTPS mail integration. Sixteen focused tests passed for stream delivery, HEAD requests, object-key restrictions, mail acceptance/rejection, and safe provider errors; server type/lint checks passed. Railway bucket authentication and 31 migration uploads completed. The public API returns 25 active artworks, and all 25 gallery images passed HTTPS WebP reads. Brevo authentication/verified sender checks passed. Recovery-email delivery and installed-device use of the new cloud APK remain unverified.

The earlier Android and iOS simulator builds completed and passed artifact inspection. The Android APK was installed on a Vivo V2151 running Android 14, with registration, API artwork loading, search, and restart restoration observed; the user reported successful manual checks and requested that further phone testing stop. Earlier Docker checks covered local startup, PostgreSQL, registration, image upload, listing persistence, and CORS with disposable services and local storage. The user can verify the cloud APK over mobile data after API deployment. See QA.md and SECURITY.md for remaining release checks.
