# Verified security contracts

`tests/rules/firestore.test.ts` runs the actual rules against the emulator with anonymous, Alice, and Bob contexts.

- Profiles: owner-only create/read/update; global enumeration and deletion are blocked.
- Profile fields: `displayName`, `createdAt`, `photoURL`, `nickname`, `bio`. Name up to 100 characters, nickname up to 50, bio up to 2000, photo URL up to 2048.
- Profile creation time uses the server timestamp and remains immutable.
- Libraries: owner-only reads/queries/writes; user and manga IDs must match the path; status and favorite fields have defined types/values.
- Library creation uses server timestamps; updates require server `updatedAt`. `savedAt` remains editable for compatibility.
- Reviews: publicly readable; authenticated creation at `{uid}_{mangaId}`; owner-only update/delete.
- Reviews require an integer rating from 1 to 5, text up to 5000 characters, known fields, immutable identity and creation time.
- Unknown collections are denied by default.

`proxy.test.ts` verifies the image policy and limits; `catalog-proxy.test.ts` verifies fixed-origin read-only forwarding; `server.test.ts` verifies integration with Express. Catalog-only mode makes no Auth/Firestore requests, covered by browser tests.

These rules do not enforce email verification, request rate limits, unique nicknames, editorial content moderation, or abuse detection. Not all optional library/review strings have extra size limits. Client-editable localStorage achievements are not trusted proof of reading.
