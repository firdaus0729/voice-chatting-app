# Firebase Service Layer

- **`index.ts`** — App init, Auth, Firestore. Uses `FIREBASE_CONFIG` from `config/env`.
- **`auth.ts`** — Google Sign-In (via ID token), sign out, `onAuthStateChanged`.
- **`firestore.ts`** — User document CRUD, `createUserProfile`, `getUserDoc`, `updateUserProfile`.
- **`phone.ts`** — Phone OTP abstraction. Web: Firebase Phone + RecaptchaVerifier. RN: use backend → `signInWithCustomToken`.

## Firestore collections

| Collection | Document ID | Description |
|------------|-------------|-------------|
| `users` | `uid` | User profile, economy, VIP, agency, inventory, couple. See `types/firestore.ts`. |

## Env

Set `EXPO_PUBLIC_FIREBASE_*` in `.env` or EAS Secrets. See `.env.example`.
