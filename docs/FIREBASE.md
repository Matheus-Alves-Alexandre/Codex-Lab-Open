# Bring your own Firebase

Firebase is optional. With no `.env.local` settings, the app provides catalog browsing and reading without contacting Firebase Auth or Firestore. Account features remain disabled. This repository includes generic rules, a data blueprint, and local emulator settings; it does not include a maintainer project, user database, or account export.

## Create your project

Create a Firebase project, register a web app, and obtain its configuration from Project settings. Follow the [official web setup guide](https://firebase.google.com/docs/web/setup).

Enable Google under Authentication → Sign-in method. Add your development and deployment hosts to Authorized domains; check that `localhost` is included for local sign-in. Follow the [Google sign-in guide](https://firebase.google.com/docs/auth/web/google-signin).

Create a Cloud Firestore database. Use `(default)` unless you intentionally need a named database. Do not enable public writes as a substitute for deploying the included rules.

## Generate local settings

```sh
npm run setup:firebase
```

The wizard asks for your web app fields and writes `.env.local` in the current checkout. It does not create cloud resources, log into Firebase, deploy rules, or upload configuration. Existing `.env.local` files are never overwritten.

Alternatively, copy `.env.example` to `.env.local` and enter your own values:

| Firebase web setting | Local variable |
| --- | --- |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| Firestore database ID | `VITE_FIREBASE_DATABASE_ID`, defaults to `(default)` |

Leave `VITE_FIREBASE_EMULATORS=false` for your cloud project. A non-demo project requires all four web configuration fields; incomplete settings produce a setup error. The `demo-` prefix is reserved for local/demo mode.

These are browser-visible settings, not server credentials. Never paste a service-account JSON, private key, Admin SDK credential, or Google Cloud access token into these fields. Restart the dev server after changes; rebuild for production. In hosting, set the variables before the build instead of committing `.env.local`.

## Deploy your rules

For the default database, authenticate the CLI with your account and explicitly select your project:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your own project ID. These commands are instructions for the person setting up their installation; the setup wizard never runs them.

For a named database, the easiest manual path is to open that specific database's Rules tab in the Firebase console and publish the contents of `firestore.rules`. Ensure `VITE_FIREBASE_DATABASE_ID` matches it. The committed `firebase.json` targets the default database; it is not a named-database deployment template.

## Data model

The app creates these documents through the Firebase client SDK as users interact with it. No seed of the maintainer's data is required.

| Collection/document | Purpose and fields |
| --- | --- |
| `users/{uid}` | Private profile: `displayName`, `createdAt`, optional `photoURL`, `nickname`, `bio` |
| `users/{uid}/library/{mangaId}` | Private entry: `userId`, `mangaId`, `status`, `isFavorite`, `savedAt`, `updatedAt`; optional title, cover filename and last-read chapter ID |
| `reviews/{uid}_{mangaId}` | Public review: author/manga IDs, integer rating 1–5, text, server timestamps, optional display metadata |

Library status is `reading`, `completed`, `plan_to_read`, or `dropped`. Reviews are publicly readable; profiles and libraries are owner-only. Use `serverTimestamp()` for the timestamps required by the rules. The descriptive `firebase-blueprint.json` is a reference, not an automatically enforced schema; `firestore.rules` enforces the access and validation contracts.

## Local emulators

Install Java 21, then:

```sh
npm run emulators
```

In `.env.local`, use:

```dotenv
VITE_FIREBASE_PROJECT_ID=demo-codex-lab
VITE_FIREBASE_EMULATORS=true
```

Remove cloud web settings for this mode or use the demo placeholders from the tests. Restart the app. Auth is at `127.0.0.1:9099`; Firestore is at `127.0.0.1:8080`. Emulators use disposable local data. The rules suite starts and stops its own Firestore emulator with `npm run test:rules`.

## Files that stay local

`.env*` (except `.env.example`), `.firebaserc`, `firebase.local.json`, legacy `firebase-applet-config.json`, service-account files, and common private-key files are ignored. Always inspect the staged diff before publishing, including newly named credential files. This checkout starts with a fresh history containing only the cleaned source. The old remote repository and any previously deployed credentials are separate and were not modified. See [the clean-history report](SECRET-AUDIT.md).
