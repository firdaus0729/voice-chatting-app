# Voice Room – Agora RTC Setup & APK Build

This app uses **Agora RTC** for real-time voice. Firestore holds room/seat/mute state; Agora handles audio only.

---

## 1. Required keys

### Agora

1. Go to [Agora Console](https://console.agora.io/) and create a project.
2. Copy the **App ID**.
3. Set it for the app:
   - **Option A (recommended):** Create `.env` in the project root:
     ```bash
     EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
     ```
   - **Option B:** In `src/utils/config.ts`, set:
     ```ts
     agoraAppId: 'your_agora_app_id_here',
     ```
4. For production, use [token authentication](https://docs.agora.io/en/video-calling/develop/authentication-workflow). This MVP uses an empty token (testing only).

### Firebase

- Configure `src/services/firebase.ts` with your Firebase project (Auth + Firestore).
- Firestore holds: `users`, `rooms`, `wallet`, `seats`. Room doc can include `voiceMembers: { [userId]: agoraUid }` for volume mapping.

---

## 2. Permissions (Android)

Already set in `app.json`:

- `INTERNET`
- `RECORD_AUDIO`
- `MODIFY_AUDIO_SETTINGS`
- `BLUETOOTH`
- `ACCESS_NETWORK_STATE`
- `VIBRATE`

No extra steps needed for permissions.

---

## 3. SDK setup summary

| Responsibility | Where |
|----------------|--------|
| Room metadata, seat ownership, mute state | Firestore (`rooms`, `seats`) |
| Audio send/receive, volume indication | Agora RTC (audio only) |
| Connection state (Connecting / Reconnecting / Connected) | Agora + UI |

- **Only seated users** can publish mic (take seat → publish, leave seat → stop publish).
- **Muted users** do not send audio (Firestore `state: 'muted'` → `muteLocalAudioStream(true)`).
- **Host** can lock seats and mute others via Firestore; client mutes when it sees its seat as muted.

---

## 4. Running the app

**Expo Go is not supported** (Agora uses native modules). Use a **development build** or **EAS Build**.

### Development build (local)

```bash
# Install dependencies
npm install

# Generate native projects (required for Agora)
npx expo prebuild

# Run on Android
npx expo run:android
```

### EAS Build (APK)

```bash
# Install EAS CLI and log in (once)
npm install -g eas-cli
eas login

# Link/create EAS project (once)
eas init

# Build APK (preview profile = internal APK)
eas build -p android --profile preview
```

- APK is in the EAS dashboard when the build finishes.
- `eas.json` is set with `buildType: "apk"` for the `preview` profile.

---

## 5. Testing checklist

- **Join/leave room:** Open room → join Agora channel; leave screen → leave channel.
- **Take/leave seat:** Tap empty seat → take mic (publish); tap own seat → leave (stop publish).
- **Mute/unmute:** Toggle Mute → Firestore and RTC mute state stay in sync; toasts for “Mic on” / “Mic off”.
- **Background/foreground:** Send app to background → channel left; bring back → rejoin (reconnecting/connected states).
- **Connection states:** Header shows “Connecting…”, “Reconnecting…”, or “Connected” as appropriate.
- **Volume indicator:** Green ring around avatar reflects real RTC volume (smooth animation).
- **Host:** Lock random seat, Unlock all; locked seats show “LOCK” and cannot be taken.
- **No crashes:** Clean console; no red errors; graceful behavior when Firestore or Agora is unavailable.

---

## 6. What is mocked

- **Phone auth:** Mock (no real OTP).
- **Wallet / gifts:** Mock (no real payments).
- **Agora token:** Empty string (testing only; use token server for production).

---

## 7. Next steps for production

- Add Agora token server and use token in `joinChannel`.
- Enforce Firestore security rules (e.g. only room host can lock seats, only self can update own mute).
- Add network/reconnect handling (Agora already reports connection state; you can add retry/backoff).
- Test on low-end Android devices for performance and stability.
