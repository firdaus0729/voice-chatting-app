# Engagement Mechanics – Treasure Box, Rankings, Entry Effects

Social engagement features that do **not** modify Phase-3 wallet/gift logic. Economy correctness and APK stability are preserved.

---

## 1. Treasure Box System

- **Progress:** Room-level `treasureProgress` (coins contributed this cycle) and `treasureContributions` (per-user coins).
- **Thresholds:** 12,000 → 50,000 → 150,000 coins (cycle repeats after 150k).
- **Flow:** After a successful gift send from Wallet, the client calls `addTreasureContribution(roomId, userId, transactionId)`. The Cloud Function:
  - Validates the transaction (senderId, source `gift`, not already counted).
  - Adds `coinAmount` to room `treasureProgress` and `treasureContributions[userId]`.
  - Marks the transaction with `treasureRoomId` so it is not counted again.
  - If `progress >=` current threshold: picks a **random lucky winner** (weighted by contribution), credits 500 diamonds via a separate wallet write, resets progress and contributions, advances threshold index.
- **UI:** Global room progress bar (TreasureProgressBar), chest-opening Lottie when a threshold is reached (TreasureChestAnimation), toast for “Lucky winner: …”.

---

## 2. Live Rankings

- **Data:** `room.treasureContributions` (userId → coins this cycle).
- **UI:** Top 3 contributors with Gold / Silver / Bronze styling (medal emoji + border color).
- **Updates:** Real-time via existing `listenToRoom`; rankings derived from `treasureContributions`.

---

## 3. Entry Effects

- **VIP God Mode (8s):** Shown when the current user has `vipLevel >= 1` on room enter. Includes:
  - Dark overlay, golden aura (animated opacity), floating avatar (translateY animation), “VIP God Mode” label, petal-style dots.
  - Auto-dismiss after 8s; cleanup on unmount.
- **Vehicle entry (5s):** Lottie overlay shown after VIP entry finishes (or alone if no VIP). Auto-dismiss and cleanup.

---

## 4. Performance

- **Animations:** Reanimated for progress bar and VIP aura/float; Lottie for chest and vehicle. No heavy JS during animation.
- **Cleanup:** Entry effects use `useEffect` with a single timeout and clear on unmount; no lingering listeners.
- **Low-end:** Minimal extra views; Lottie uses remote URL (cache as needed). Treasure/rankings are derived from existing room listener (no extra Firestore reads).

---

## 5. Testing

- **Treasure:** Send gifts from Wallet (with `activeRoomId` set); confirm progress bar and contributions update; when progress crosses a threshold, chest animation and winner toast appear; balances never go negative (winner payout is a separate CF write).
- **Rankings:** Multiple users contributing; top 3 and medal styling update in real time.
- **Entry:** Enter room as VIP; VIP effect runs ~8s then vehicle ~5s; leave room before finish and confirm no leaks (no errors in console).
- **Stress:** Many rapid gifts in room; progress and rankings should stay consistent; no FPS drop from single listener and lightweight UI.

---

## 6. APK Safety

- No new native dependencies; no changes to wallet Cloud Functions (sendGift, createWallet). New callable: `addTreasureContribution` only.
- Rebuild and verify: `npx expo prebuild` then `npx expo run:android`, or EAS build as before.
