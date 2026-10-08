# NexaNFT mobile setup and builds

**Made by Lakshay Dhiman**

## Expo connection

App root: `mobile/`. The full marketplace app is linked to the existing Expo project, rather than a new starter application.

- Account/project: `@lakshaydhimans-team/nexanft-marketplace`
- Public project ID: `78458ae6-9eb7-4b49-b6d6-9093e14bdb7f`
- Android application ID and iOS bundle ID: `com.nexanft.marketplace`
- Expo SDK: 55

The Expo/EAS project is configured with mobile launch scripts and cloud build profiles. Expo/EAS account credentials remain in the CLI's private account storage, never in project source.

## Start on Windows

From the repository root:

```powershell
pwsh -NoProfile -File mobile/script/build_and_run.ps1
```

The launcher keeps Metro in the foreground, selects Node 22/24 (including the bundled runtime when available), and uses the Wi-Fi address for the local API. Override it with `-ApiUrl http://YOUR_LAN_IP:4000/api` and optionally `-Port 8081`.

Keep the API running on port 4000 and the phone on the same Wi-Fi. Scan the terminal's QR in a compatible Expo Go client. The current development URL is `exp://192.168.0.101:8081`. This address can change when the computer changes networks.

For macOS/Linux with supported Node installed, run `cd mobile && bash script/build_and_run.sh`. On Windows, the PowerShell launcher accepts `-NodePath PATH_TO_NODE_EXE` or `NEXANFT_NODE_PATH` when Node.js 22 or 24 is not on your PATH.

## Native builds requested on 8 October 2026

The [Android cloud build](https://expo.dev/accounts/lakshaydhimans-team/projects/nexanft-marketplace/builds/1052840f-245e-4c40-b035-2cdf08e32ad4) finished using the `cloud` profile, version code 3, the existing signing key, HTTPS Railway API, and the restored labeled Collect demo action. Railway is live with your copied accounts and artwork.

[Download the cloud Android APK](https://expo.dev/artifacts/eas/3-eZzqta-CTpF87StnJGT8oeo-uackhRLrLtzGdojsg.apk). Sign in with your existing account. This standalone build works without Expo Go, Metro, the development computer, or home Wi-Fi. Version code 3 was installed as an update on the Vivo V2151 on 8 October 2026. NexaNFT's own MainActivity launched, and a listed artwork displayed the restored Collect button without a connection error. The full native release test matrix was not resumed.

The cloud APK is saved as `releases/NexaNFT-Android-Collect.apk` (85,062,264 bytes), SHA-256 `5e6a3d1cdd9799207348c9caedc540571a1331ac0ba266d26b34356e3dbd7986`. Signature verification passed with the existing certificate `be5967508a61d2645ccbcf035814896f634289895cb5f2620d3c6c5b304ecea2`. Inspection confirmed `com.nexanft.marketplace`, version 1.0.0/code 3, SDK 24 minimum/36 target, cleartext disabled, the HTTPS Railway API, the Collect action, and “Made by Lakshay Dhiman”; the former LAN API is absent.

The table and downloads below describe the earlier local-network packages.

| Target                 | Profile       | Build                                                                                                                                   | Status                     |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Android standalone APK | `development` | [Android build](https://expo.dev/accounts/lakshaydhimans-team/projects/nexanft-marketplace/builds/2b2c9bc5-d24d-48e0-9165-82580eff3e54) | Finished; package verified |
| iOS Simulator          | `development` | [iOS build](https://expo.dev/accounts/lakshaydhimans-team/projects/nexanft-marketplace/builds/dd701466-a24e-4a92-a93b-d161a23f1456)     | Finished; package verified |

The Android signing keystore is managed privately by EAS. The iOS target is a simulator build, without Apple account signing; it requires a Mac with Xcode's simulator to run and cannot be installed on an iPhone.

[Download the Android APK](https://expo.dev/artifacts/eas/jhOxFxGuwUPZk-V6FNdg2951wwhuOU7RXX8LYUF791E.apk) on an Android phone, open it, and allow installation from that browser when Android requests it. USB debugging is not needed for this manual installation. The installed NexaNFT app works without Expo Go or Metro. Its API still needs to run on the configured Wi-Fi server until a cloud API build replaces this development build.

The APK is also saved as `releases/NexaNFT-Android.apk` (85,062,304 bytes). SHA-256: `00a51789f3a49b4850a36c9368bde49b33c8f81b9b83ce380fb2e13d2bc175a6`. Android's `apksigner` verified the APK Signature Scheme v2 signature and the same signing certificate as the earlier build, allowing a signed update. Manifest inspection confirmed version 1.0.0/code 1, `com.nexanft.marketplace`, minimum SDK 24, target SDK 36, and `debuggable=false`. The archive contains compiled DEX code, native libraries for arm64-v8a/armeabi-v7a/x86/x86_64, and the embedded JavaScript with the current development API, readable screen titles, and author credit.

The [iOS archive](https://expo.dev/artifacts/eas/8PJnuIH54O39Ad7t7DHie_j0DwDM97eFA5yOX8xXvsk.tar.gz) is saved locally as `releases/NexaNFT-ios-simulator.tar.gz` (18,142,066 bytes). Its SHA-256 is `a6086db2d657389c803ea0623bbcb4510adee62ed76edfe188bacb642812ad4e`. Package inspection confirmed the native Mach-O executable for both x86_64 and arm64 Macs, embedded JavaScript, version 1.0.0/build 1, `com.nexanft.marketplace`, the iPhoneSimulator target (iOS 15.1 minimum), the current development API, and the author credit. To run on a Mac, extract the archive and use:

```sh
xcrun simctl bootstatus booted -b
xcrun simctl install booted NexaNFT.app
xcrun simctl launch booted com.nexanft.marketplace
```

Start an iOS simulator in Xcode before these commands and keep the API reachable from that Mac.

Development/preview profiles embed `http://192.168.0.101:4000/api` and allow local HTTP for testing. Change the profile's public API URL and rebuild when the server address changes. Production requires an HTTPS API, disables demo transfers, and restricts transport to HTTPS. Live backend, storage, and email services must be deployed separately for use away from this development network.

The earlier native packages embedded `192.168.0.105`. During the QA follow-up on 8 October, the address had changed to `192.168.0.101`; both profiles were corrected. A final visual review also replaced route filenames in screen headers with readable titles. Both packages were rebuilt and verified after these changes; the links above point to the final packages. Metro's launcher also uses the current address automatically. Package installation alone does not update an embedded API address.

Follow [CLOUD.md](CLOUD.md) for Railway/Vercel hosting and rebuilding the APK against the cloud API.

## Rebuild

```sh
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init --id 78458ae6-9eb7-4b49-b6d6-9093e14bdb7f
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile development
```

App Store/iPhone distribution requires Apple signing access; production submission is a separate release step. See DEPLOYMENT.md and QA.md for the release checklist.

## Source and validation

The EAS upload archive was inspected: private `.env` files, PostgreSQL/upload data, signing files, `node_modules`, local toolchains, and generated native folders were excluded. Shared contracts and the Prisma schema required by the monorepo installation were present. Builds use continuous native generation from the checked-in Expo configuration.

TypeScript, lint, 33 automated tests (21 backend and 12 frontend), server/shared/landing builds, all 20 Expo Doctor checks, and Android/iOS/web JavaScript exports passed. The signed standalone Android APK was then installed and launched on the connected Vivo V2151 (Android 14). Registration, API artwork loading, search, and secure account restoration after restarting the app were observed. The user reported successful manual testing and requested no further phone testing. See QA.md for the limits of device coverage.

The separate `cloud` profile extends `production` and produces an internal Android APK using the production EAS environment. It explicitly enables `EXPO_PUBLIC_ENABLE_DEMO_TRANSFERS=true` for this labeled demo marketplace at the user's request. Set `EXPO_PUBLIC_API_URL` to the Railway HTTPS API and run `npx eas-cli@latest build --platform android --profile cloud`. The store production profile remains disabled by default.
