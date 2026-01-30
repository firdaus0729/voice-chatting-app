# Production Launch Checklist

## 1. Payments (Razorpay)

- **Server**: Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Cloud Functions config or env.
  - `firebase functions:config:set razorpay.key_id="..." razorpay.key_secret="..."`
  - Or use Secret Manager / env in Firebase.
- **Client**: Set `EXPO_PUBLIC_RAZORPAY_KEY_ID` for checkout (optional; server returns key in `createRechargeOrder`).
- **Flow**: Create order (server) → Razorpay Checkout (client) → Verify signature (server) → Credit coins, update VIP, agency commission. Replay prevented by marking order `completed` in a transaction.
- **Build**: `react-native-razorpay` requires a native build (e.g. `eas build`); payments will not work in Expo Go.

## 2. VIP System

- **Tracking**: Cumulative recharge INR stored in `wallet.cumulativeRechargeInr`; updated only in `verifyRechargePayment`.
- **Tiers**: 0–5 by INR thresholds (0, 500, 2000, 5000, 10000, 25000). Level written to `wallet.vipLevel` and `users.vipLevel`.
- **Visual**: `VIPBadge` in Wallet and on seat avatar for current user; colors per level.

## 3. Withdrawal System

- **Min**: ₹100 (200 diamonds at 0.5 INR/diamond). Rate and min are in Cloud Functions.
- **Cooldown**: 24 hours between requests (server-validated).
- **Flow**: User requests withdrawal (diamonds deducted, request created) → Admin approves/rejects in Admin panel. Payout execution (UPI/bank) is manual or separate integration.

## 4. Admin Panel

- **Access**: Open Admin screen → enter password → `verifyAdminPassword` sets custom claim `admin: true` → refresh ID token. All admin callables check `context.auth.token.admin === true`.
- **Config**: Set `ADMIN_PASSWORD` in Cloud Functions config or env.
- **Features**: User inspector (fetch by ID), withdrawal list (approve/reject), gift/shop list, weekly contest reward distribution.

## 5. Weekly Contest

- **Tracking**: `tickHostMinute(roomId, userId)` called every 60s from Voice Room when current user is room host. Server validates `room.hostUserId === userId` and increments `hostActivity/{userId}_{weekKey}.minutes`.
- **Week key**: ISO week (e.g. `2025-W05`). New week = new doc; no reset job needed.
- **Rewards**: Admin calls `distributeContestRewards(weekKey?)` to credit top 10 hosts (500, 300, 200, 100, 100, 50… diamonds). Requires composite index on `hostActivity` (weekKey, minutes desc).

## 6. Security Review

- **Firestore**: Client cannot write to `wallet`, `transactions`, `rechargeOrders`, `withdrawalRequests`, `agency`, `agencyCodes`, `commissionHistory`, `hostActivity`. All balance and status changes are Cloud Functions only.
- **Callables**: Payment verification uses HMAC-SHA256 of `paymentId|orderId`; replay blocked by single-use order status in a transaction.
- **Admin**: Only callables that check `requireAdmin(context)` can read/write sensitive data; password is server-only.

## 7. APK Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

- Ensure `app.json` / `eas.json` have correct `version` and `android.package`. For Razorpay, native build is required (no Expo Go).

## 8. Play Store Readiness

- **Content rating**: Complete questionnaire (in-app purchases, user-generated content if any).
- **Privacy policy**: Required; mention Razorpay, Firebase, data stored (phone, display name, wallet, agency).
- **Data safety**: Declare data collected and whether it is shared; Razorpay and Firebase are third parties.
- **Target SDK**: Meet current Play target SDK (e.g. 34); Expo/EAS handle this when configured.
- **Signing**: Use EAS to produce AAB signed with upload key; store keystore securely.
